import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;
const DUMMY_PASSWORD_HASH = "$2b$12$Gj62tx4Iddj8oCKJ.gXIT.dGLSnW1uFpMAYLjoRAMw5ZyP0emvTbO";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function verifyPasswordOrDummy(password: string, passwordHash: string | null): Promise<boolean> {
  const hash = passwordHash ?? DUMMY_PASSWORD_HASH;
  const matches = await verifyPassword(password, hash);
  return passwordHash !== null && matches;
}
