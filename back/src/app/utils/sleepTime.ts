// src/utils/sleepTime.ts
export const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function computeDurationHours(startTime: string, endTime: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const s = toMin(startTime);
  const e = toMin(endTime);
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60; // atravessou a meia-noite
  return diff / 60;
}

export function toDateOnly(d: string): Date {
  // interpreta "YYYY-MM-DD" como data local
  return new Date(d);
}
