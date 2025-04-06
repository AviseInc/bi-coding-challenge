/* eslint-disable n/no-process-env */
import chalk from "chalk";
import Joi from "../libraries/joi";
import logger from "../libraries/logger";
import { SafeProcessEnv } from "./types";

// All facets need these, including avise-api-migrate
const coreValidator = Joi.object<SafeProcessEnv>({
  // Database
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().port().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),

  // Logging
  LOG_LEVEL: Joi.string().valid("debug", "info", "warn", "error").default("info"),
  LOG_DB_QUERIES: Joi.boolean().default(false),

  // Node
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
});

// Async facets need these
const workflowValidator = coreValidator.append({});

// Only the REST API service needs these
const mainValidator = workflowValidator.append({
  // Server
  PORT: Joi.number().positive().max(65535).default(3000),
  SERVER_TIMEOUT_MS: Joi.number().min(0).integer().default(0),

  // AWS, ID and key are loaded automatically by the client via ENV vars
  AWS_S3_ENDPOINT: Joi.string().optional().uri(),
});

// Use Joi to validate the environment variables and return an intermediate type.
// We try to fail-fast whenever possible,
export function validateEnvironment(): SafeProcessEnv {
  logger.debug("[Config] Validating environment variables.");

  // Running Locally
  const result = mainValidator.validate(process.env, { stripUnknown: true, convert: true });

  if (result.error) {
    logger.warn(
      chalk.yellow(
        "[Config] Invalid local configuration. This may not be a problem, so see below for potential issues.",
      ),
    );

    const errorMessageLines = result.error.message.split(". ");

    for (const line of errorMessageLines) {
      logger.warn(chalk.yellow(`  - ${line}.`));
    }

    // return the value as-is and let the developer fix the issue
    return result.value as unknown as SafeProcessEnv;
  } else {
    return result.value;
  }
}
