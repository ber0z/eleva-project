import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config';


const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Evita múltiplas instâncias em dev com ts-node-dev
declare global {
  var __prisma__: PrismaClient | undefined
}
export const prisma =
  global.__prisma__ ??
  new PrismaClient({ adapter: new PrismaPg(pool) })

if (process.env.NODE_ENV !== 'production') global.__prisma__ = prisma
