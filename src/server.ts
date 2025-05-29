import "@/settings/env";

import path from "path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import autoload from "@fastify/autoload";
import compress from "@fastify/compress";
import { clerkPlugin } from "@clerk/fastify";
import fastifyStatic from "@fastify/static";

import { PORT } from "@/settings/env";
import { allowedOrigins } from "./settings";

const app = Fastify({
  logger: {
    level: "error",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  disableRequestLogging: true,
  connectionTimeout: 30000,
  keepAliveTimeout: 30000,
  maxParamLength: 100,
  bodyLimit: 1048576, // 1MB
  onProtoPoisoning: "remove",
  onConstructorPoisoning: "remove",
});

// Clerk Plugin
app.register(clerkPlugin);

// Compressão de respostas
app.register(compress, {
  encodings: ["gzip", "deflate"],
});

// Configuração do CORS mais restritiva
app.register(cors, {
  origin: "*",
  // origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  // credentials: true,
  maxAge: 86400, // 24 horas
});

// Adiciona headers de segurança com helmet
app.register(helmet, {
  global: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  hidePoweredBy: true,
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
});

// Configura o serviço de arquivos estáticos para o diretório public/images
app.register(fastifyStatic, {
  root: path.join(__dirname, "public", "images"),
  prefix: "/public/images/", // O prefixo da URL para acessar as imagens
  decorateReply: false, // Para evitar conflitos com outras decorações de resposta
});

// Carrega rotas automaticamente da pasta routes
app.register(autoload, {
  dir: path.join(__dirname, "routes"),
  dirNameRoutePrefix: true,
  options: { prefix: "/" },
});

// Middleware global para validação básica
app.addHook("preHandler", async (request, reply) => {
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    if (!request.headers["content-type"]?.includes("application/json")) {
      return reply.code(415).send({
        error: "Unsupported Media Type",
        message: "Content-Type deve ser application/json",
      });
    }
  }
});

// Tratamento global de erros
app.setErrorHandler((error, _, reply) => {
  app.log.error(error);

  const message =
    process.env.NODE_ENV === "production"
      ? "Erro interno do servidor"
      : error.message;

  reply.code(error.statusCode || 500).send({
    error: error.name || "InternalServerError",
    message,
    statusCode: error.statusCode || 500,
  });
});

// Graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
});

app.listen(
  {
    port: PORT || 3333,
    host: "0.0.0.0",
    backlog: 511,
  },
  (err) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    console.log(`🚀 Server running on port ${PORT}`);
  }
);
