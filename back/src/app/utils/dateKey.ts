const TZ = "America/Recife";

// yyyy-mm-dd em Recife (para chave Redis)
export function recifeDayStr(d = new Date(), tz = TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "YYYY-MM-DD"
}

// retorna um Date em UTC representando o dia local de Recife (00:00Z)
export function todayDateOnlyUTC(tz = TZ, d = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "YYYY-MM-DD"
  return new Date(`${fmt}T00:00:00.000Z`);
}
