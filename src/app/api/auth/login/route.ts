import { loginSchema } from "@/features/auth/schemas";
import { prisma } from "@/lib/prisma";
import { verifyPasswordOrDummy } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { AppError, errorResponse, json } from "@/server/http/api-error";
import { readJson } from "@/server/http/read-json";
import { normalizeEmail } from "@/server/users/normalize-email";
import { serializePublicUser, toPublicUser } from "@/server/users/public-user";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readJson(request, loginSchema);
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPasswordOrDummy(input.password, user?.passwordHash ?? null);
    if (!user || !valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    await createSession(user.id);
    return json({ user: serializePublicUser(toPublicUser(user)) });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
