import pino from "pino";

const pretty = process.env.LOG_PRETTY !== "0";

export const logger = pino(
  pretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : undefined
);
