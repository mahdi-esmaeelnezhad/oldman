import { registerSchema } from "@/features/auth/schemas";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";
import { normalizeEmail } from "@/server/users/normalize-email";
import { serializePublicUser, toPublicUser } from "@/server/users/public-user";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readJson(request, registerSchema);
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
      await createSession(user.id);
      return json({ user: serializePublicUser(toPublicUser(user)) }, 201);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "EMAIL_IN_USE", "An account with that email already exists.");
      }

      throw error;
    }
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
