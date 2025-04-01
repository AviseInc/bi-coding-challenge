import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import logger from "./logger";
import config from "../config";


const loggingOptions = (
  config.logDbQueries ? [ "query", "info", "warn", "error" ] : [ "error", "info", "warn" ]
).map((level) => ({level: level, emit: "event"}));

// eslint-disable-next-line n/no-process-env
const connectionString = process.env.DATABASE_URL;

if (! connectionString) {
  throw new Error("Unable to read DATABASE_URL from environment variables.");
}

const pool = new Pool({connectionString});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient<Prisma.PrismaClientOptions, "query" | "info" | "warn" | "error">({
  log: loggingOptions as Prisma.LogDefinition[],
  adapter,
});

prisma.$on("query", (e) => logger.debug(`${e.query} ${e.params}`));
prisma.$on("warn", (e) => logger.warn(e.message));
prisma.$on("info", (e) => logger.info(e.message));
prisma.$on("error", (e) => logger.error(e.message));

export const SAFE_PRISMA_IN_LIMIT = 1000;

export const PRISMA_TRANSACTION_TIMEOUT = 120000;

export default prisma;
