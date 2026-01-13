// utils/multipart.ts
export function unwrapMultipartBody(body: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  if (!body) return out;
  for (const [k, v] of Object.entries(body)) {
    // Campos do fastify-multipart geralmente vêm como { value, encoding, mimetype, ... }
    if (v && typeof v === "object" && "value" in v) {
      out[k] = v.value;
    } else {
      out[k] = v;
    }
  }
  return out;
}
