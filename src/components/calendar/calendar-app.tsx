"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalendarEvent } from "@/lib/google";
import {
  WEEKDAYS_SHORT,
  addDays,
  formatTime,
  monthGrid,
  sameDay,
  shift,
  startOfDay,
  title,
  visibleRange,
  type View,
} from "./dates";
import { colorOf, layoutDay, normalize, occursOn, type TimedEvent } from "./events";

const HOUR_HEIGHT = 48; // px per ora
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
];

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function CalendarApp({ sidebar, chat }: { sidebar: ReactNode; chat: ReactNode }) {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<TimedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TimedEvent | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const now = useNow();

  const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
      });
      const res = await fetch(`/api/events?${params}`);
      const data = (await res.json()) as { events?: CalendarEvent[]; error?: string };
      if (!res.ok || !data.events) throw new Error(data.error ?? "Errore");
      setEvents(data.events.map(normalize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- caricamento dati al cambio intervallo
    void load();
  }, [load]);

  const goToday = () => setAnchor(startOfDay(new Date()));

  return (
    <div className="flex h-dvh flex-col bg-white">
      {/* Barra superiore */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-separator px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={goToday} className="btn-secondary">
            Oggi
          </button>
          <button
            type="button"
            aria-label="Precedente"
            onClick={() => setAnchor((a) => shift(view, a, -1))}
            className="btn-icon"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Successivo"
            onClick={() => setAnchor((a) => shift(view, a, 1))}
            className="btn-icon"
          >
            <Chevron dir="right" />
          </button>
        </div>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {title(view, anchor)}
          {loading && <span className="ml-2 text-sm font-normal text-label-secondary">…</span>}
        </h1>
        <div className="segmented" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className={chatOpen ? "btn-primary" : "btn-secondary"}
        >
          Assistente
        </button>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn-plain">
            Esci
          </button>
        </form>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Barra laterale */}
        <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-separator bg-sidebar px-3 py-4 md:flex">
          <MiniCalendar
            anchor={anchor}
            now={now}
            onSelect={(d) => {
              setAnchor(d);
              if (view === "month") setView("day");
            }}
          />
          {sidebar}
        </aside>

        {/* Calendario */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {error && (
            <div className="border-b border-separator bg-red-50 px-4 py-2 text-sm text-system-red">
              {error}.{" "}
              <button type="button" onClick={() => void load()} className="font-medium underline">
                Riprova
              </button>
            </div>
          )}
          {view === "month" ? (
            <MonthView
              days={range.days}
              anchor={anchor}
              now={now}
              events={events}
              onSelect={setSelected}
              onDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
            />
          ) : (
            <TimeGrid days={range.days} now={now} events={events} onSelect={setSelected} />
          )}
          {selected && <EventDetails item={selected} onClose={() => setSelected(null)} />}
        </main>

        {/* Assistente */}
        {chatOpen && (
          <aside className="fixed inset-0 z-30 flex flex-col bg-white lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:border-l lg:border-separator">
            <div className="flex justify-end px-3 pt-2 lg:hidden">
              <button type="button" onClick={() => setChatOpen(false)} className="btn-plain">
                Chiudi
              </button>
            </div>
            <div className="min-h-0 flex-1">{chat}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

function MiniCalendar({
  anchor,
  now,
  onSelect,
}: {
  anchor: Date;
  now: Date;
  onSelect: (d: Date) => void;
}) {
  const [month, setMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [lastAnchor, setLastAnchor] = useState(anchor);
  if (+lastAnchor !== +anchor) {
    setLastAnchor(anchor);
    setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  }
  const days = monthGrid(month);
  const label = month.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold capitalize">{label}</span>
        <div className="flex">
          <button
            type="button"
            aria-label="Mese precedente"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="btn-icon h-6 w-6 text-system-red"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Mese successivo"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="btn-icon h-6 w-6 text-system-red"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px]">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="pb-1 font-medium uppercase text-label-tertiary">
            {d.charAt(0)}
          </div>
        ))}
        {days.map((d) => {
          const isToday = sameDay(d, now);
          const isSelected = sameDay(d, anchor);
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              className={[
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition",
                isToday
                  ? "bg-system-red font-semibold text-white"
                  : isSelected
                    ? "bg-black/10 font-semibold"
                    : "hover:bg-black/5",
                !inMonth && !isToday ? "text-label-tertiary" : "",
              ].join(" ")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DayHeader({ day, now, compact }: { day: Date; now: Date; compact?: boolean }) {
  const isToday = sameDay(day, now);
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      <span className={`text-xs ${isToday ? "text-system-red" : "text-label-secondary"}`}>
        {WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}
      </span>
      <span
        className={[
          "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-base",
          isToday ? "bg-system-red font-semibold text-white" : "font-medium",
          compact ? "text-sm" : "",
        ].join(" ")}
      >
        {day.getDate()}
      </span>
    </div>
  );
}

function TimeGrid({
  days,
  now,
  events,
  onSelect,
}: {
  days: Date[];
  now: Date;
  events: TimedEvent[];
  onSelect: (e: TimedEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // All'apertura mostra dalle 7:00 circa.
    scrollRef.current?.scrollTo({ top: HOUR_HEIGHT * 7 });
  }, []);

  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;
  const allDay = days.map((d) => events.filter((e) => e.allDay && occursOn(e, d)));
  const hasAllDay = allDay.some((list) => list.length > 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid border-b border-separator" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <DayHeader key={d.toISOString()} day={d} now={now} />
        ))}
        {hasAllDay && (
          <>
            <div className="py-1 pr-2 text-right text-[10px] text-label-tertiary">tutto il giorno</div>
            {allDay.map((list, i) => (
              <div key={i} className="space-y-0.5 border-l border-separator px-0.5 py-1">
                {list.map((e) => (
                  <button
                    key={e.event.id}
                    type="button"
                    onClick={() => onSelect(e)}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-white"
                    style={{ backgroundColor: colorOf(e.event) }}
                  >
                    {e.event.summary ?? "(senza titolo)"}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: cols, height: HOUR_HEIGHT * 24 }}>
          {/* Etichette ore */}
          <div className="relative">
            {Array.from({ length: 23 }, (_, h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-label-tertiary"
                style={{ top: (h + 1) * HOUR_HEIGHT }}
              >
                {String(h + 1).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {days.map((day) => {
            const positioned = layoutDay(events, day);
            const isToday = sameDay(day, now);
            return (
              <div key={day.toISOString()} className="relative border-l border-separator">
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-separator"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}
                {positioned.map((e) => {
                  const color = colorOf(e.event);
                  const short = e.height < 40;
                  return (
                    <button
                      key={e.event.id}
                      type="button"
                      onClick={() => onSelect(e)}
                      className="absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs transition hover:brightness-95"
                      style={{
                        top: (e.top / 60) * HOUR_HEIGHT + 1,
                        height: (e.height / 60) * HOUR_HEIGHT - 2,
                        left: `calc(${(e.column / e.columns) * 100}% + 2px)`,
                        width: `calc(${100 / e.columns}% - 4px)`,
                        borderColor: color,
                        backgroundColor: `${color}26`,
                        color: "#1d1d1f",
                      }}
                    >
                      <span
                        className="block truncate font-semibold"
                        style={{ color: `color-mix(in srgb, ${color} 65%, black)` }}
                      >
                        {e.event.summary ?? "(senza titolo)"}
                      </span>
                      {!short && (
                        <span className="block truncate text-[11px] text-label-secondary">
                          {formatTime(e.start)}
                          {e.event.location ? ` · ${e.event.location}` : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
                {isToday && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-system-red" />
                    <span className="h-[1.5px] flex-1 bg-system-red" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  days,
  anchor,
  now,
  events,
  onSelect,
  onDay,
}: {
  days: Date[];
  anchor: Date;
  now: Date;
  events: TimedEvent[];
  onSelect: (e: TimedEvent) => void;
  onDay: (d: Date) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-separator">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-right pr-2 text-xs text-label-secondary">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((day, i) => {
          const list = events
            .filter((e) => occursOn(e, day))
            .sort((a, b) => Number(b.allDay) - Number(a.allDay) || +a.start - +b.start);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = sameDay(day, now);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-0 overflow-hidden border-separator p-1 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""}`}
            >
              <button
                type="button"
                onClick={() => onDay(day)}
                className={[
                  "ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                  isToday ? "bg-system-red font-semibold text-white" : inMonth ? "" : "text-label-tertiary",
                ].join(" ")}
              >
                {day.getDate()}
              </button>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((e) => (
                  <button
                    key={e.event.id}
                    type="button"
                    onClick={() => onSelect(e)}
                    className="flex w-full items-center gap-1 truncate rounded px-1 text-left text-[11px] hover:bg-black/5"
                    style={e.allDay ? { backgroundColor: colorOf(e.event), color: "white" } : undefined}
                  >
                    {!e.allDay && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorOf(e.event) }}
                      />
                    )}
                    <span className="truncate">{e.event.summary ?? "(senza titolo)"}</span>
                    {!e.allDay && (
                      <span className="ml-auto shrink-0 text-label-tertiary">{formatTime(e.start)}</span>
                    )}
                  </button>
                ))}
                {list.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onDay(day)}
                    className="px-1 text-[11px] text-label-secondary"
                  >
                    altri {list.length - 3}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EventDetails({ item, onClose }: { item: TimedEvent; onClose: () => void }) {
  const { event, start, end, allDay } = item;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = start.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const lastDay = addDays(end, -1);
  const timeLabel = allDay
    ? sameDay(start, lastDay)
      ? "Tutto il giorno"
      : `Fino a ${lastDay.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
    : `${formatTime(start)} – ${formatTime(end)}`;

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/10 p-4 pt-20" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white/95 p-5 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorOf(event) }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight">{event.summary ?? "(senza titolo)"}</h2>
            <p className="mt-1 text-sm capitalize text-label-secondary">{dateLabel}</p>
            <p className="text-sm text-label-secondary">{timeLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="btn-icon h-7 w-7 text-label-tertiary">
            ✕
          </button>
        </div>
        {event.location && <p className="mt-4 text-sm">📍 {event.location}</p>}
        {event.hangoutLink && (
          <a href={event.hangoutLink} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-system-blue">
            Partecipa con Google Meet
          </a>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <p className="mt-3 text-sm text-label-secondary">
            {event.attendees.length} invitati: {event.attendees.map((a) => a.email).join(", ")}
          </p>
        )}
        {event.description && (
          <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-label-secondary">{event.description}</p>
        )}
        {event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-5 inline-flex w-full justify-center"
          >
            Apri in Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
