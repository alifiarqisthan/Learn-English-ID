import { Router } from "express";
import { attemptInput } from "@app/shared";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const attemptsRouter = Router();

attemptsRouter.use(requireAuth);

attemptsRouter.post("/", async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = attemptInput.parse(req.body);

    const attempt = await prisma.attempt.create({
      data: { ...input, userId },
    });

    await prisma.moduleProgress.upsert({
      where: { userId_slug: { userId, slug: input.moduleSlug } },
      create: { userId, slug: input.moduleSlug, attempts: 1 },
      update: { attempts: { increment: 1 } },
    });

    res.status(201).json(attempt);
  } catch (err) {
    next(err);
  }
});

attemptsRouter.get("/:slug", async (req, res, next) => {
  try {
    const attempts = await prisma.attempt.findMany({
      where: { userId: req.userId, moduleSlug: req.params.slug },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(attempts);
  } catch (err) {
    next(err);
  }
});
