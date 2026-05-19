import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export const vocabChallengeRouter = Router();

let cache: unknown = null;

async function loadData(): Promise<unknown> {
  if (cache) return cache;
  const raw = await fs.readFile(
    path.join(path.dirname(config.contentDir), "vocab-challenge.json"),
    "utf-8",
  );
  cache = JSON.parse(raw);
  return cache;
}

// GET /vocab-challenge — full 30-day data
vocabChallengeRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await loadData());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Vocab challenge data not found" });
      return;
    }
    next(err);
  }
});
