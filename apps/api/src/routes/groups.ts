import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { exercise as exerciseSchema } from "@app/shared";
import { config } from "../config.js";
import {
  loadAllGroups,
  loadGroup,
  loadGroupTestExercises,
} from "../content/groups.js";

const masterTestSchema = z.object({ exercises: z.array(exerciseSchema) });

export const groupsRouter = Router();

groupsRouter.get("/", async (_req, res, next) => {
  try {
    const groups = await loadAllGroups(config.groupDir, config.contentDir);
    res.json(groups);
  } catch (err) {
    next(err);
  }
});

// Literal routes before param routes to avoid capture
groupsRouter.get("/master/test", async (_req, res, next) => {
  try {
    const testPath = path.join(config.groupDir, "master.test.json");
    const raw = await fs.readFile(testPath, "utf-8");
    const parsed = masterTestSchema.parse(JSON.parse(raw));
    res.json({ slug: "master", title: "Final Master Test", exercises: parsed.exercises });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Master test not found" });
      return;
    }
    next(err);
  }
});

groupsRouter.get("/:slug", async (req, res, next) => {
  try {
    const group = await loadGroup(
      config.groupDir,
      config.contentDir,
      req.params.slug,
    );
    res.json(group);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    next(err);
  }
});

groupsRouter.get("/:slug/test", async (req, res, next) => {
  try {
    const test = await loadGroupTestExercises(
      config.groupDir,
      req.params.slug,
    );
    if (!test) {
      res.status(404).json({ error: "Group test not yet authored" });
      return;
    }
    res.json(test);
  } catch (err) {
    next(err);
  }
});
