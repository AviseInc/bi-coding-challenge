/* eslint-disable no-console */
import logger from "../libraries/logger";
import { ApplicationConfig, SafeProcessEnv } from "./types";
import { validateEnvironment } from "./environmentValidator";
import { awsConfig } from "./aws";
import { postgresConfig } from "./postgres";

// Validate `process.env` using Joi
const safeEnv: SafeProcessEnv = validateEnvironment();

// Create the actual config object used by the application
const config: ApplicationConfig = {
  aws: awsConfig(safeEnv),
  postgres: postgresConfig(safeEnv),
  logDbQueries: safeEnv.LOG_DB_QUERIES,
  nodeEnv: safeEnv.NODE_ENV,
  port: safeEnv.PORT,
  serverTimeoutMs: safeEnv.SERVER_TIMEOUT_MS,
};

logger.debug("[Config] Successfully loaded configuration.");
export default config;
