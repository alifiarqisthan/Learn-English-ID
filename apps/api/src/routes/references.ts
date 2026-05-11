import { Router } from "express";
import { config } from "../config.js";
import {
  loadAllReferences,
  loadReference,
  toReferenceSummary,
} from "../content/references.js";

export const referencesRouter = Router();

referencesRouter.get("/", async (_req, res, next) => {
  try {
    const refs = await loadAllReferences(config.referenceDir);
    res.json(refs.map(toReferenceSummary));
  } catch (err) {
    next(err);
  }
});

referencesRouter.get("/:slug", async (req, res, next) => {
  try {
    const ref = await loadReference(config.referenceDir, req.params.slug);
    res.json(ref);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Reference not found" });
      return;
    }
    next(err);
  }
});
