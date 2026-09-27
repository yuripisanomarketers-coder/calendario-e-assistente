import type { CalendarEvent } from "@/lib/google";
import { addDays, startOfDay } from "./dates";

export interface TimedEvent {
  event: CalendarEvent;
  start: Date;
  end: Date;
  allDay: boolean;
}

export function normalize(event: CalendarEvent): TimedEvent {
  if (event.start.date) {
    const [y, m, d] = event.start.date.split("-").map(Number);
    const [ey, em, ed] = (event.end.date ?? event.start.date).split("-").map(Number);
    return { event, start: new Date(y, m - 1, d), end: new Date(ey, em - 1, ed), allDay: true };
  }
  const start = new Date(event.start.dateTime ?? "");
  const end = new Date(event.end.dateTime ?? event.start.dateTime ?? "");
  return { event, start, end, allDay: false };
}

export const occursOn = (e: TimedEvent, day: Date) => {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return e.start < dayEnd && (e.end > dayStart || (+e.end === +e.start && e.start >= dayStart));
};

/** Colori stile Apple, scelti in base al colore dell'evento su Google. */
const PALETTE = [
  "#007AFF", // blu
  "#34C759", // verde
  "#AF52DE", // viola
  "#FF3B30", // rosso
  "#FF9500", // arancione
  "#FFCC00", // giallo
  "#5AC8FA", // azzurro
  "#FF2D55", // rosa
  "#5856D6", // indaco
  "#A2845E", // marrone
  "#30B0C7", // turchese
  "#8E8E93", // grigio
];

export const colorOf = (event: CalendarEvent) =>
  PALETTE[event.colorId ? (Number(event.colorId) - 1) % PALETTE.length + 1 : 0] ?? PALETTE[0];

export interface PositionedEvent extends TimedEvent {
  top: number; // minuti dall'inizio della giornata
  height: number; // minuti
  column: number;
  columns: number;
}

/** Dispone gli eventi di una giornata in colonne quando si sovrappongono. */
export function layoutDay(events: TimedEvent[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day).getTime();
  const items = events
    .filter((e) => !e.allDay && occursOn(e, day))
    .map((e) => {
      const top = Math.max(0, (e.start.getTime() - dayStart) / 60000);
      const bottom = Math.min(24 * 60, (e.end.getTime() - dayStart) / 60000);
      return { ...e, top, height: Math.max(bottom - top, 20), column: 0, columns: 1 };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);

  let group: typeof items = [];
  let groupEnd = -1;
  const flush = () => {
    const cols: number[] = [];
    for (const item of group) {
      let c = cols.findIndex((end) => end <= item.top);
      if (c === -1) c = cols.length;
      cols[c] = item.top + item.height;
      item.column = c;
    }
    for (const item of group) item.columns = cols.length;
    group = [];
  };
  for (const item of items) {
    if (item.top >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.top + item.height);
  }
  flush();
  return items;
}
