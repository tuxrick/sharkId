import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

type Confidence = "alta" | "media" | "baja";

interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: Confidence;
  description: string;
}

async function describeSharkImage(base64Image: string): Promise<string> {
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
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function searchKnowledge(embedding: number[]): Promise<string> {
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
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a marine biologist specializing in shark identification.

VISUAL DESCRIPTION OF THE SHARK:
${description}

RELEVANT KNOWLEDGE FROM IDENTIFICATION GUIDE:
${context}

Based on the visual description and the knowledge above, identify this shark. Respond ONLY with valid JSON in this exact format:
{
  "species": "scientific name",
  "common_name": "common name in English",
  "confidence": "alta" | "media" | "baja",
  "description": "2-3 sentence explanation of key identifying features that led to this conclusion"
}

Use "baja" confidence if the image description lacks clear identifying features or if multiple species could match. Do not include any text outside the JSON.`,
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
