/* eslint-disable no-console */
import logger from "../libraries/logger";
import { ApplicationConfig, SafeProcessEnv } from "./types";
import { validateEnvironment } from "./environmentValidator";
import { awsConfig } from "./aws";

// Validate `process.env` using Joi
const safeEnv: SafeProcessEnv = validateEnvironment();

// Create the actual config object used by the application
const config: ApplicationConfig = {
  aws: awsConfig(safeEnv),
  gptModelVersion: safeEnv.GPT_MODEL_VERSION,
  openAiApiKey: safeEnv.OPENAI_API_KEY,
  logDbQueries: safeEnv.LOG_DB_QUERIES,
  nodeEnv: safeEnv.NODE_ENV,
  port: safeEnv.PORT,
  serverTimeoutMs: safeEnv.SERVER_TIMEOUT_MS,
};

logger.debug("[Config] Successfully loaded configuration.");
export default config;
