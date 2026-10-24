export function dateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function isOverdue(status: string, dueDate: Date | string, today = new Date()): boolean {
  return status === "PENDING" && dateOnly(dueDate) < dateOnly(today);
}
