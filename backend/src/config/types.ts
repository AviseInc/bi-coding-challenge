import { LoggerOptions } from "winston";

export interface AwsConfig {
  s3Endpoint?: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ApplicationConfig {
  aws: AwsConfig;
  postgres: PostgresConfig;
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
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  LOG_LEVEL: LoggerOptions["level"];
  LOG_DB_QUERIES: boolean;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  OPENAI_API_KEY?: string;
  GPT_MODEL_VERSION?: string;
};
