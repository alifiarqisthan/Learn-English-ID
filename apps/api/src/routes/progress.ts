import { Router } from "express";
import { PASS_THRESHOLD } from "@app/shared";
import { prisma } from "../db.js";

export const progressRouter = Router();

progressRouter.get("/", async (_req, res, next) => {
  try {
    const all = await prisma.moduleProgress.findMany();
    res.json(all);
  } catch (err) {
    next(err);
  }
});

progressRouter.post("/:slug/complete", async (req, res, next) => {
  try {
    const score = Math.max(0, Math.min(100, Number(req.body?.score ?? 0)));
    const passed = score >= PASS_THRESHOLD;

    // Always record the latest score. Only set completedAt when passed,
    // and never clear an earlier completedAt on a later failed attempt.
    const existing = await prisma.moduleProgress.findUnique({
      where: { slug: req.params.slug },
    });

    const completedAt = passed
      ? new Date()
      : (existing?.completedAt ?? null);

    const updated = await prisma.moduleProgress.upsert({
      where: { slug: req.params.slug },
      create: {
        slug: req.params.slug,
        completedAt,
        lastScore: score,
      },
      update: { completedAt, lastScore: score },
    });

    res.json({ ...updated, passed, threshold: PASS_THRESHOLD });
  } catch (err) {
    next(err);
  }
});
