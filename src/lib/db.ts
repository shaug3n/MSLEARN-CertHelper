import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { isPostgresDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function postgresPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!isPostgresDatabaseUrl(connectionString)) {
    throw new Error("DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  }

  return new Pool({ connectionString });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(postgresPool()),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
