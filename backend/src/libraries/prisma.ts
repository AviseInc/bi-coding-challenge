import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import logger from "./logger";
import config from "../config";


const loggingOptions = (
  config.logDbQueries ? [ "query", "info", "warn", "error" ] : [ "error", "info", "warn" ]
).map((level) => ({level: level, emit: "event"}));

// Use the postgres config from the application config
const { host, port, database, user, password } = config.postgres;

const pool = new Pool({
  host,
  port,
  database,
  user,
  password
});

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
