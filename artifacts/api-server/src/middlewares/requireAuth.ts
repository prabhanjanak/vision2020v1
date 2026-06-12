import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthUser {
  id: number;
  userType: string;
  participantId?: number;
  assignedTrack?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(allowedTypes?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const user = payload as unknown as AuthUser;
    if (allowedTypes && !allowedTypes.includes(user.userType)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.user = user;
    next();
  };
}
