/* eslint-disable n/no-process-env, @typescript-eslint/restrict-template-expressions */
// The logger is used in config loading, so it is allowed to access process.env to avoid a cyclical dependency
import winston from "winston";
import chalk from "chalk";

// 'verbose' is the longest level name
const padAmount = "verbose".length;

const colorWinstonWithChalk = winston.format.printf((params) => {
  const { level, message, ...rest } = params;
  const levelPadded = level.padStart(padAmount);

  let finalMessage = `${levelPadded}: ${message}`;

  // account for the ':' and the space after the label
  const innerPadAmount = padAmount + 2;

  if (!!rest && typeof rest === "object" && Object.keys(rest).length > 0) {
    finalMessage += "\n";
    finalMessage += chalk.dim(" ".repeat(innerPadAmount) + "Additional data:");
    finalMessage += "\n";

    finalMessage += JSON.stringify(rest, null, 2)
      .split("\n")
      .map((l) => " ".repeat(innerPadAmount) + l)
      .join("\n");

    finalMessage += "\n";
  }

  switch (level) {
    case "error":
      finalMessage = chalk.red(finalMessage);
      break;
    case "warn":
      finalMessage = chalk.yellow(finalMessage);
      break;
    case "info":
      finalMessage = chalk.blue(finalMessage);
      break;
    case "http":
      finalMessage = chalk.italic(finalMessage);
      break;
    case "verbose":
      finalMessage = chalk.cyan(finalMessage);
      break;
    case "debug":
      finalMessage = chalk.dim(finalMessage);
      break;
    case "silly":
      finalMessage = chalk.magenta(finalMessage);
      break;
    default:
      break;
  }

  return finalMessage;
});

// when the NODE_ENV is production, we want to log in JSON format
// otherwise we can log in a terminal friendly format
const logFormat =
  process.env.NODE_ENV === "production"
    ? winston.format.json()
    : winston.format.combine(winston.format.simple(), colorWinstonWithChalk);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: process.env.AVISE_FACET
    ? {
        facet: process.env.AVISE_FACET,
      }
    : undefined,
  format: logFormat,
  transports: [new winston.transports.Console({})],
  silent: process.env.NODE_ENV === "test" && process.env.SUPPRESS_TEST_LOGS === "true",
});

export default logger;
