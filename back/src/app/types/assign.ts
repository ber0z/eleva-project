// utils/assign.ts (opcional)
export function assignIfDefined<T>(
  target: Partial<T>,
  src: Partial<T>,
  keys: readonly (keyof T)[]
) {
  for (const k of keys) {
    const v = src[k];
    if (typeof v !== "undefined") {
      target[k] = v as T[typeof k];
    }
  }
}
