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

const PDF_PATH = path.join(__dirname, "../data/sharks.pdf");
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

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found at ${PDF_PATH}`);
    console.error("Place sharks.pdf in backend/data/ and try again.");
    process.exit(1);
  }

  console.log("Reading PDF...");
  const buffer = fs.readFileSync(PDF_PATH);
  const data = await pdf(buffer);
  const rawText = data.text;
  console.log(`Extracted ${rawText.length} characters from PDF`);

  const chunks = chunkText(rawText);
  console.log(`Split into ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\rEmbedding and inserting chunk ${i + 1}/${chunks.length}...`);
    const embedding = await embedChunk(chunks[i]);
    await insertChunk(chunks[i], embedding);
  }

  console.log(`\nIngestion complete. ${chunks.length} chunks inserted into Supabase.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
