import type Redis from "ioredis";
import { getRedis } from "../../../lib/redis";

export type AiMemoryRole = "user" | "assistant";
export type AiMemoryMsg = { role: AiMemoryRole; content: string };

export class AiMemoryService {
  private getClient(): Redis {
    const client = getRedis();
    if (!client) throw new Error("Redis não configurado (REDIS_URL ausente).");
    return client;
  }

  private key(userId: number) {
    return `ai:chat:${userId}`;
  }

  private routeKey(userId: number) {
    return `ai:chat:${userId}:route`;
  }

  async getLast(userId: number, limitItems = 10): Promise<AiMemoryMsg[]> {
    const redis = this.getClient();
    const raw = await redis.lrange(this.key(userId), -limitItems, -1);

    return raw
      .map((s) => {
        try {
          return JSON.parse(s) as AiMemoryMsg;
        } catch {
          return null;
        }
      })
      .filter((x): x is AiMemoryMsg => !!x);
  }

  async append(
    userId: number,
    msg: AiMemoryMsg,
    keepLastItems = 10,
    ttlSeconds = 60 * 60 * 24 * 3 // 3 dias
  ) {
    const redis = this.getClient();
    const k = this.key(userId);

    await redis
      .multi()
      .rpush(k, JSON.stringify(msg))
      .ltrim(k, -keepLastItems, -1)
      .expire(k, ttlSeconds)
      .exec();
  }

  async getLastRoute(userId: number): Promise<string | null> {
    const redis = this.getClient();
    return redis.get(this.routeKey(userId));
  }

  async setLastRoute(
    userId: number,
    route: string,
    ttlSeconds = 60 * 60 * 24 * 3
  ) {
    const redis = this.getClient();
    await redis.set(this.routeKey(userId), route, "EX", ttlSeconds);
  }

  async clear(userId: number) {
    const redis = this.getClient();
    await redis.del(this.key(userId));
    await redis.del(this.routeKey(userId));
  }
}
