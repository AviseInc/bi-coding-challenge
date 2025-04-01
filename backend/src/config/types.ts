import { LoggerOptions } from "winston";

export interface AwsConfig {
  s3Endpoint?: string;
}

export interface ApplicationConfig {
  aws: AwsConfig;
  gptModelVersion?: string;
  openAiApiKey?: string;
  logDbQueries: boolean;
  nodeEnv: "development" | "production" | "test";
  port: number;
  serverTimeoutMs: number;
}

export type SafeProcessEnv = {
  AWS_S3_ENDPOINT?: string;
  SERVER_TIMEOUT_MS: number;
  DATABASE_URL: string;
  LOG_LEVEL: LoggerOptions["level"];
  LOG_DB_QUERIES: boolean;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  OPENAI_API_KEY?: string;
  GPT_MODEL_VERSION?: string;
};
