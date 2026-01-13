// src/app/lib/redis.ts
import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!_redis) {
    _redis = new Redis(url, { maxRetriesPerRequest: 2 });
    _redis.on("connect", () => console.log("[redis] connected"));
    _redis.on("error", (e) => console.error("[redis] error:", e.message));
  }
  return _redis;
}

// Se preferir importar direto:
export const redis = getRedis(); // Redis | null
 