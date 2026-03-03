import { config } from "dotenv";
import { fileRoutes } from "./app/files";
import { PrismaClient } from "@prisma/client";
import pino from "pino";
import createApi from "./app";
import express from "express";
import path, { join } from "path";
import { createServer } from "http";

// Load environment variables
config();
const Config = {
  port: Number(process.env.PORT) || 8080,
  api: {
    cors_origin: process.env.CORS_ORIGIN?.split(",") || [],
    limit: process.env.API_LIMIT || "50mb",
    jwt: process.env.JWT_SECRET
      ? {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
      : undefined,
  }
}

// Create logger instance
const logger = pino({
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  level: process.env.LOG_LEVEL || 'info',
  timestamp: true,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

const run = async () => {
  // Initialize Prisma client
  const prisma = new PrismaClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).prisma = prisma;
  const router = express();
  const server = createServer(router);

  // create api endpoint
  const api = createApi(Config);
  router.use("/api", api.express());

  // Add request logging middleware
  router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }, 'HTTP Request');
    });
    next();
  });

  // server public folder as static
  router.use("/", express.static(join(__dirname, "../public")));

  server.listen(Config.port, () => {
    logger.info(`Server is running on http://localhost:${Config.port}`);
  });
};

run();




