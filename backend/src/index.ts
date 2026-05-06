import { config } from "dotenv";
config({ override: true });
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { identify } from "./identify.js";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/identify", async (c) => {
  const body = await c.req.json<{ image?: string }>();

  if (!body.image) {
    return c.json({ error: "Missing image field" }, 400);
  }

  try {
    const result = await identify(body.image);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Identify error:", message);
    return c.json({ error: message }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`SharkID backend running on port ${port}`);
});
