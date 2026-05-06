import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import pdf from "pdf-parse";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DATA_DIR = path.join(__dirname, "../data");
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + CHUNK_SIZE;
    chunks.push(text.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
  }

  return chunks.filter((c) => c.length > 50);
}

async function embedChunk(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function insertChunk(content: string, embedding: number[]): Promise<void> {
  const { error } = await supabase
    .from("shark_knowledge")
    .insert({ content, embedding });

  if (error) throw new Error(`Insert error: ${error.message}`);
}

async function ingestPdf(filePath: string): Promise<number> {
  console.log(`\nReading ${path.basename(filePath)}...`);
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  console.log(`  Extracted ${data.text.length} characters`);

  const chunks = chunkText(data.text);
  console.log(`  Split into ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r  Embedding and inserting chunk ${i + 1}/${chunks.length}...`);
    const embedding = await embedChunk(chunks[i]);
    await insertChunk(chunks[i], embedding);
  }
  process.stdout.write("\n");

  return chunks.length;
}

async function main() {
  const pdfs = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(DATA_DIR, f));

  if (pdfs.length === 0) {
    console.error(`No PDFs found in ${DATA_DIR}`);
    console.error("Place your PDF files in backend/data/ and try again.");
    process.exit(1);
  }

  console.log(`Found ${pdfs.length} PDF(s): ${pdfs.map((p) => path.basename(p)).join(", ")}`);

  let totalChunks = 0;
  for (const filePath of pdfs) {
    totalChunks += await ingestPdf(filePath);
  }

  console.log(`\nIngestion complete. ${totalChunks} total chunks inserted into Supabase.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
