export type View = "day" | "week" | "month";

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** Settimana che inizia di lunedì. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Le 6 settimane (42 giorni) mostrate nella griglia di un mese. */
export const monthGrid = (d: Date) => {
  const first = startOfWeek(startOfMonth(d));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
};

export function visibleRange(view: View, anchor: Date): { start: Date; end: Date; days: Date[] } {
  if (view === "day") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1), days: [start] };
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7), days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
  }
  const days = monthGrid(anchor);
  return { start: days[0], end: addDays(days[41], 1), days };
}

export function shift(view: View, anchor: Date, direction: 1 | -1): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addDays(anchor, 7 * direction);
  return addMonths(anchor, direction);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function title(view: View, anchor: Date): string {
  if (view === "day") {
    return cap(anchor.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return cap(start.toLocaleDateString("it-IT", { month: "long", year: "numeric" }));
    }
    const m = (d: Date) => d.toLocaleDateString("it-IT", { month: "short" });
    return `${cap(m(start))} – ${m(end)} ${end.getFullYear()}`;
  }
  return cap(anchor.toLocaleDateString("it-IT", { month: "long", year: "numeric" }));
}

export const WEEKDAYS_SHORT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

export const formatTime = (d: Date) =>
  d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
