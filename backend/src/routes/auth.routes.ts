import { Router } from "express";
import { loginSchema, registerSchema } from "@launchpad/shared";
import { Role } from "@prisma/client";
import { asyncHandler, HttpError } from "../lib/http.js";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { userPublicSelect } from "./mappers.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing) {
      throw new HttpError(409, "A user with this email already exists.");
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: Role.MEMBER
      },
      select: userPublicSelect
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ user, token });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    const token = signToken({ sub: user.id, role: user.role });

    res.json({ user: publicUser, token });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
