import { SafeProcessEnv } from "./types";

export function awsConfig(safeEnv: SafeProcessEnv) {
  return {
    s3Endpoint: safeEnv.AWS_S3_ENDPOINT,
  };
}
