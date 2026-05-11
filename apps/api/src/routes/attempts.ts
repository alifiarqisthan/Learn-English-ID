import { Router } from "express";
import { attemptInput } from "@app/shared";
import { prisma } from "../db.js";

export const attemptsRouter = Router();

attemptsRouter.post("/", async (req, res, next) => {
  try {
    const input = attemptInput.parse(req.body);
    const attempt = await prisma.attempt.create({ data: input });

    await prisma.moduleProgress.upsert({
      where: { slug: input.moduleSlug },
      create: { slug: input.moduleSlug, attempts: 1 },
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
      where: { moduleSlug: req.params.slug },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(attempts);
  } catch (err) {
    next(err);
  }
});
