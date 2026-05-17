import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";

// Attach userId to every request from the X-User-Id header.
// Routes that need auth call requireAuth() to reject unauthenticated requests.

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function resolveUser(req: Request, _res: Response, next: NextFunction) {
  const userId = req.headers["x-user-id"];
  if (typeof userId === "string" && userId.length > 0) {
    req.userId = userId;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized — send X-User-Id header" });
    return;
  }
  next();
}
