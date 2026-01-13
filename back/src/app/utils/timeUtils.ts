


export function todayUTC() {
  const d = new Date()
  return {
    yyyy: d.getUTCFullYear(),
    mm: String(d.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(d.getUTCDate()).padStart(2, '0'),
  }
}

