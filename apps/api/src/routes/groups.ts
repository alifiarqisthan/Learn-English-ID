import { Router } from "express";
import { config } from "../config.js";
import {
  loadAllGroups,
  loadGroup,
  loadGroupTestExercises,
} from "../content/groups.js";

export const groupsRouter = Router();

groupsRouter.get("/", async (_req, res, next) => {
  try {
    const groups = await loadAllGroups(config.groupDir, config.contentDir);
    res.json(groups);
  } catch (err) {
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
