import { Router } from "express";
import { PASS_THRESHOLD } from "@app/shared";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/", async (req, res, next) => {
  try {
    const all = await prisma.moduleProgress.findMany({
      where: { userId: req.userId },
      select: { slug: true, completedAt: true, lastScore: true },
    });
    res.json(all);
  } catch (err) {
    next(err);
  }
});

progressRouter.post("/:slug/complete", async (req, res, next) => {
  try {
    const userId = req.userId!;
    const slug = req.params.slug;
    const score = Math.max(0, Math.min(100, Number(req.body?.score ?? 0)));
    const passed = score >= PASS_THRESHOLD;

    const existing = await prisma.moduleProgress.findUnique({
      where: { userId_slug: { userId, slug } },
    });

    const completedAt = passed ? new Date() : (existing?.completedAt ?? null);

    const updated = await prisma.moduleProgress.upsert({
      where: { userId_slug: { userId, slug } },
      create: { userId, slug, completedAt, lastScore: score },
      update: { completedAt, lastScore: score },
    });

    res.json({ ...updated, passed, threshold: PASS_THRESHOLD });
  } catch (err) {
    next(err);
  }
});
