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

type Confidence = "alta" | "media" | "baja";

interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: Confidence;
  description: string;
}

async function describeSharkImage(base64Image: string): Promise<string> {
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
  return content.text;
}

async function getEmbedding(text: string): Promise<number[]> {
  const { openai } = getClients();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function searchKnowledge(embedding: number[]): Promise<string> {
  const { supabase } = getClients();
  const { data, error } = await supabase.rpc("match_shark_knowledge", {
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) throw new Error(`Supabase search error: ${error.message}`);
  if (!data || data.length === 0) return "No matching knowledge found.";

  return (data as Array<{ content: string }>)
    .map((row) => row.content)
    .join("\n\n---\n\n");
}

async function identifyWithContext(
  description: string,
  context: string
): Promise<IdentifyResult> {
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
  return parsed;
}

export async function identify(base64Image: string): Promise<IdentifyResult> {
  const description = await describeSharkImage(base64Image);
  const embedding = await getEmbedding(description);
  const context = await searchKnowledge(embedding);
  return identifyWithContext(description, context);
}
