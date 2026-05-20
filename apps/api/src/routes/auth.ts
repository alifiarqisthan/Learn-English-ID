import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

// POST /auth/login — create account if name is new, or verify PIN if existing.
authRouter.post("/login", async (req, res, next) => {
  try {
    const { name, pin } = loginSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { name } });

    if (!existing) {
      // New user — register
      const user = await prisma.user.create({ data: { name, pin } });
      res.status(201).json({ id: user.id, name: user.name, created: true });
      return;
    }

    // Existing user — verify PIN
    if (existing.pin !== pin) {
      res.status(401).json({ error: "Incorrect PIN" });
      return;
    }

    res.json({ id: existing.id, name: existing.name, created: false });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me — verify the current userId is valid.
// Cache briefly (30s) on client — user identity rarely changes mid-session.
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(user);
  } catch (err) {
    next(err);
  }
});
