import { Router } from "express";
import { config } from "../config.js";
import { loadAllModules, loadModule, toSummary } from "../content/loader.js";

export const modulesRouter = Router();

modulesRouter.get("/", async (_req, res, next) => {
  try {
    const modules = await loadAllModules(config.contentDir);
    res.json(modules.map(toSummary));
  } catch (err) {
    next(err);
  }
});

modulesRouter.get("/:slug", async (req, res, next) => {
  try {
    const mod = await loadModule(config.contentDir, req.params.slug);
    res.json(mod);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Module not found" });
      return;
    }
    next(err);
  }
});
