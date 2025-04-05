import { SafeProcessEnv, PostgresConfig } from "./types";

export function postgresConfig(safeEnv: SafeProcessEnv): PostgresConfig {
  return {
    host: safeEnv.POSTGRES_HOST,
    port: safeEnv.POSTGRES_PORT,
    database: safeEnv.POSTGRES_DB,
    user: safeEnv.POSTGRES_USER,
    password: safeEnv.POSTGRES_PASSWORD,
  };
}
