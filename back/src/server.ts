import Fastify from 'fastify';
import { registerRoutes } from "./app/routes/index";
import cors from "@fastify/cors";
import { redis } from "./app/lib/redis"; // <-- singleton
// import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
// import { r2 } from './app/lib/cloudflare'; 
// import {z} from 'zod'
// import { randomUUID } from 'crypto';

import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import cookie from "@fastify/cookie";


async function buildServer() {
  /* 1) Cria UMA instância do Fastify */
  const fastify = Fastify({ logger: true });

  /* 2) Plugin multipart            */
  fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    attachFieldsToBody: true,
  });

  /* 3) CORS                        */
  await fastify.register(cors, {
    origin: ["http://localhost:1988", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [], // se precisar ler headers no client
  }); 


  /* 5) Rate-limit (opcional Redis) */
  // const redis = new Redis({ host: 'localhost', port: 6379 });
  await fastify.register(rateLimit, {
    global: false,
    redis,           // remova esta linha se quiser store em memória
    max: 5,
    timeWindow: '10m',
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || "dev-cookie-secret",
  });

  /* 5) Rotas da aplicação          */
  fastify.register(registerRoutes, { prefix: '/api' });

  return fastify;
}

/* ------------------ bootstrap ------------------ */
buildServer()
  .then((app) => app.listen({ port: 3000, host: '0.0.0.0' })) //mudar host para '127.0.0.1' localmente
  .then((addr) => console.log(`🚀 Servidor rodando em ${addr}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });