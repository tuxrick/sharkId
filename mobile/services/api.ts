import * as ImageManipulator from "expo-image-manipulator";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: "alta" | "media" | "baja";
  description: string;
}

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  if (!result.base64) throw new Error("Failed to encode image as base64");
  return result.base64;
}

export async function identify(imageUri: string): Promise<IdentifyResult> {
  const base64 = await compressImage(imageUri);

  const response = await fetch(`${API_URL}/identify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json() as Promise<IdentifyResult>;
}
