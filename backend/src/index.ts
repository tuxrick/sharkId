import "dotenv/config";
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

  const result = await identify(body.image);
  return c.json(result);
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`SharkID backend running on port ${port}`);
});
