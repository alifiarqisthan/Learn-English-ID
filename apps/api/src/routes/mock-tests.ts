import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export const mockTestsRouter = Router();

const mockTestDir = config.mockTestDir;

// Cache
const cache = new Map<string, unknown>();

async function loadPackage(id: string): Promise<unknown> {
  if (cache.has(id)) return cache.get(id);
  const raw = await fs.readFile(path.join(mockTestDir, `${id}.json`), "utf-8");
  const data = JSON.parse(raw);
  cache.set(id, data);
  return data;
}

// GET /mock-tests — list available packages (metadata only)
mockTestsRouter.get("/", async (_req, res, next) => {
  try {
    const entries = await fs.readdir(mockTestDir);
    const packages = await Promise.all(
      entries
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const id = f.replace(".json", "");
          const data = await loadPackage(id) as Record<string, unknown>;
          return { id: data.id, title: data.title, format: data.format ?? null };
        })
    );
    res.json(packages.sort((a, b) => String(a.id).localeCompare(String(b.id))));
  } catch (err) {
    next(err);
  }
});

// GET /mock-tests/:id — full package
mockTestsRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await loadPackage(req.params.id);
    res.json(data);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Package not found" });
      return;
    }
    next(err);
  }
});
