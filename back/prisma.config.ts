// prisma.config.ts (na RAIZ do projeto)
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const SHADOW = process.env.SHADOW_DATABASE_URL // use .env direto, sem env.optional

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: env('DATABASE_URL'),
    ...(SHADOW ? { shadowDatabaseUrl: SHADOW } : {}),
  },
})
