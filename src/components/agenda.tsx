import { env } from "@/lib/env";
import { listEvents, type CalendarEvent } from "@/lib/google";
import { Panel, PanelMessage } from "./panel";

function dayKey(event: CalendarEvent) {
  const value = event.start.dateTime ?? event.start.date ?? "";
  return new Date(event.start.date ? `${value}T12:00:00` : value).toLocaleDateString("it-IT", {
    timeZone: env.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(event: CalendarEvent) {
  if (!event.start.dateTime) return "Tutto il giorno";
  const fmt = (v: string) =>
    new Date(v).toLocaleTimeString("it-IT", {
      timeZone: env.timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(event.start.dateTime)} – ${fmt(event.end.dateTime ?? event.start.dateTime)}`;
}

export async function Agenda() {
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 86_400_000);

  let events: CalendarEvent[];
  try {
    events = await listEvents({ timeMin: now.toISOString(), timeMax: inAWeek.toISOString() });
  } catch (error) {
    console.error(error);
    return (
      <Panel title="Agenda">
        <PanelMessage>Impossibile caricare il calendario.</PanelMessage>
      </Panel>
    );
  }

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(event);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }

  return (
    <Panel
      title="Agenda · prossimi 7 giorni"
      action={
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Apri
        </a>
      }
    >
      {events.length === 0 ? (
        <PanelMessage>Nessun impegno nei prossimi 7 giorni.</PanelMessage>
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="mb-1.5 text-xs font-medium capitalize text-muted">{day}</h3>
              <ul className="space-y-1.5">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-3 rounded-lg border-l-2 border-accent bg-background px-3 py-2 text-sm hover:opacity-80"
                    >
                      <span className="w-28 shrink-0 font-mono text-xs leading-5 text-muted">
                        {timeLabel(event)}
                      </span>
                      <span className="min-w-0 truncate">{event.summary ?? "(senza titolo)"}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
