/** `datetime('now')` stores UTC as "YYYY-MM-DD HH:MM:SS", with no zone marker. */
export function parseSqliteDate(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

const formatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(date: Date): string {
  return formatter.format(date);
}
