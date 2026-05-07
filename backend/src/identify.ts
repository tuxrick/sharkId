import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

function getClients() {
  return {
    anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    supabase: createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    ),
  };
}

function log(step: string, detail?: string) {
  const time = new Date().toISOString().slice(11, 23);
  const msg = detail ? `[${time}] ${step}\n          ${detail}` : `[${time}] ${step}`;
  console.log(msg);
}

type Confidence = "alta" | "media" | "baja";

interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: Confidence;
  description: string;
}

async function describeSharkImage(base64Image: string): Promise<string> {
  log("🔍 [1/4] Vision  →  describiendo imagen con Claude...");
  const { anthropic } = getClients();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Describe this shark in detail for identification purposes. Include: body shape, fin shape and position, coloration patterns, snout shape, gill slits count if visible, approximate size if determinable, and any distinctive markings. Be specific and technical.",
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  log("   Vision  ✓", content.text.slice(0, 120) + "…");
  return content.text;
}

async function getEmbedding(text: string): Promise<number[]> {
  log("🧮 [2/4] Embedding  →  generando vector con OpenAI...");
  const { openai } = getClients();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  const vec = response.data[0].embedding;
  log(`   Embedding  ✓  (${vec.length} dimensiones)`);
  return vec;
}

async function searchKnowledge(embedding: number[]): Promise<string> {
  log("📚 [3/4] RAG  →  buscando en Supabase pgvector...");
  const { supabase } = getClients();
  const { data, error } = await supabase.rpc("match_shark_knowledge", {
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) throw new Error(`Supabase search error: ${error.message}`);
  if (!data || data.length === 0) {
    log("   RAG  ⚠  sin resultados");
    return "No matching knowledge found.";
  }

  const chunks = data as Array<{ content: string; similarity?: number }>;
  log(`   RAG  ✓  ${chunks.length} chunks recuperados`);
  chunks.forEach((c, i) => {
    const sim = c.similarity != null ? ` (sim: ${c.similarity.toFixed(3)})` : "";
    log(`          chunk ${i + 1}${sim}: ${c.content.slice(0, 80)}…`);
  });

  return chunks.map((row) => row.content).join("\n\n---\n\n");
}

async function identifyWithContext(
  description: string,
  context: string
): Promise<IdentifyResult> {
  log("🦈 [4/4] Identificación  →  llamando a Claude con contexto RAG...");
  const { anthropic } = getClients();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Eres un biólogo marino especializado en identificación de tiburones.

DESCRIPCIÓN VISUAL DEL TIBURÓN:
${description}

CONOCIMIENTO RELEVANTE DE LA GUÍA DE IDENTIFICACIÓN:
${context}

Con base en la descripción visual y el conocimiento anterior, identifica este tiburón. Responde ÚNICAMENTE con JSON válido en este formato exacto:
{
  "species": "nombre científico",
  "common_name": "nombre común en español",
  "confidence": "alta" | "media" | "baja",
  "description": "explicación en español de 2-3 oraciones sobre las características clave que llevaron a esta conclusión"
}

Usa confianza "baja" si la descripción carece de características claras o si varias especies podrían coincidir. No incluyas ningún texto fuera del JSON.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const parsed = JSON.parse(content.text) as IdentifyResult;
  log(`   Identificación  ✓`, `${parsed.common_name} (${parsed.species}) — confianza: ${parsed.confidence}`);
  return parsed;
}

export async function identify(base64Image: string): Promise<IdentifyResult> {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("🚀 Nueva identificación recibida");
  const t0 = Date.now();

  const description = await describeSharkImage(base64Image);
  const embedding = await getEmbedding(description);
  const context = await searchKnowledge(embedding);
  const result = await identifyWithContext(description, context);

  log(`✅ Completado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return result;
}
