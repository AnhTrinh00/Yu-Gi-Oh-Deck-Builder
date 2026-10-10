
import "dotenv/config";

import { createApp } from "./app.js";

import {
  GeminiComboProvider,
} from "./services/llmService.js";

const PORT = Number(process.env.PORT ?? 3000);

const apiKey = process.env.GEMINI_API_KEY;
const model =
  process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing from server/.env"
  );
}

if (
  !Number.isSafeInteger(PORT) ||
  PORT < 1 ||
  PORT > 65535
) {
  throw new Error("Invalid PORT.");
}

const provider = new GeminiComboProvider(
  apiKey,
  model
);

const app = createApp(provider);

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Server running at http://localhost:${PORT}`
  );

  console.log(`AI model: ${model}`);
});
