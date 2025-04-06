import express from "express";
import http from "http";
import config from "./config";
import logger from "./libraries/logger";
import prisma from "./libraries/prisma";

const app = express();
const server = http.createServer(app);

// Set server timeout
server.timeout = config.serverTimeoutMs;

// Graceful shutdown function
const shutdown = async () => {
  logger.info("Shutting down server...");

  // Close HTTP server
  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Disconnect Prisma client
  try {
    await prisma.$disconnect();

    logger.info("Prisma client disconnected");
  } catch (error) {
    logger.error("Error disconnecting from database", { error });
  }
};

// Handle process termination signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start the server
server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});

export { app };
