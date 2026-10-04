import "dotenv/config";
import { defineConfig } from "prisma/config";

// Placeholder is only for `prisma generate` / install (no DB connection).
// Runtime and migrate still use the real DATABASE_URL from the environment.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
