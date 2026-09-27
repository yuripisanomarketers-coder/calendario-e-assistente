/**
 * Modalità demo (DEMO=1): niente login e dati di esempio in memoria, per
 * provare l'interfaccia in locale prima di collegare Google e Slack.
 * Le modifiche fatte dall'assistente valgono finché il server resta acceso.
 */
import type { CalendarEvent, EmailFull, EmailSummary, EventInput } from "./google";
import type { SlackChannel, SlackMessage } from "./slack";

function at(dayOffset: number, hour: number, minute = 0): Date {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(hour, minute, 0, 0);
  monday.setDate(monday.getDate() + dayOffset);
  return monday;
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function timed(
  id: string,
  summary: string,
  day: number,
  [h, m]: [number, number],
  [h2, m2]: [number, number],
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    summary,
    start: { dateTime: at(day, h, m).toISOString() },
    end: { dateTime: at(day, h2, m2).toISOString() },
    ...extra,
  };
}

function seedEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  // Due settimane: quella corrente e la successiva.
  for (const week of [0, 7]) {
    const w = String(week);
    events.push(
      timed(`su-${w}-0`, "Stand-up team", week, [9, 30], [10, 0], { colorId: "9" }),
      timed(`su-${w}-2`, "Stand-up team", week + 2, [9, 30], [10, 0], { colorId: "9" }),
      timed(`su-${w}-4`, "Stand-up team", week + 4, [9, 30], [10, 0], { colorId: "9" }),
      timed(`gym-${w}-1`, "Palestra", week + 1, [8, 0], [9, 0], { colorId: "2" }),
      timed(`gym-${w}-5`, "Palestra", week + 5, [10, 0], [11, 0], { colorId: "2" }),
    );
  }
  events.push(
    timed("rossi", "Meeting cliente Rossi S.r.l.", 0, [11, 0], [12, 0], {
      location: "Milano, Via Dante 12",
      description: "Presentazione proposta campagna Q4.",
      attendees: [{ email: "mario.rossi@rossisrl.it" }],
    }),
    timed("pranzo", "Pranzo con Luca", 0, [13, 0], [14, 0], { colorId: "2" }),
    timed("meta", "Revisione campagna Meta Ads", 1, [10, 0], [11, 30], { colorId: "3" }),
    timed("fornitore", "Call fornitore", 1, [10, 30], [11, 0], { colorId: "6", hangoutLink: "https://meet.google.com" }),
    timed("seo", "Workshop SEO", 2, [14, 0], [17, 0], { colorId: "5", location: "Online" }),
    timed("mkt", "Call con il team marketing", 3, [15, 0], [16, 0]),
    timed("dentista", "Dentista", 3, [18, 0], [19, 0], { colorId: "4" }),
    timed("q", "Presentazione trimestrale", 4, [11, 0], [12, 30], { colorId: "11" }),
    timed("aperitivo", "Aperitivo", 4, [19, 0], [21, 0], { colorId: "8" }),
    timed("verdi", "Call Giulia Verdi – sito web", 8, [10, 0], [10, 30]),
    timed("cena", "Cena di compleanno Sara", 10, [20, 30], [23, 0], { colorId: "8" }),
    {
      id: "report",
      summary: "Scadenza report mensile",
      colorId: "4",
      start: { date: localDate(at(2, 12)) },
      end: { date: localDate(at(3, 12)) },
    },
    {
      id: "lago",
      summary: "Weekend al lago",
      colorId: "7",
      start: { date: localDate(at(5, 12)) },
      end: { date: localDate(at(7, 12)) },
    },
  );
  return events;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const EMAILS: EmailFull[] = [
  {
    id: "e1",
    threadId: "e1",
    from: "Marco Bianchi <marco.bianchi@example.com>",
    to: "yuri@example.com",
    subject: "Proposta di collaborazione Q4",
    date: hoursAgo(2),
    snippet: "Ciao Yuri, come anticipato al telefono ti invio la proposta…",
    unread: true,
    messageId: "<e1@example.com>",
    body: "Ciao Yuri,\n\ncome anticipato al telefono ti invio la proposta di collaborazione per il Q4: gestione completa delle campagne social con budget mensile di 5.000 €.\n\nSe ti va ne parliamo giovedì.\n\nMarco",
  },
  {
    id: "e2",
    threadId: "e2",
    from: "Google Ads <ads-noreply@google.com>",
    to: "yuri@example.com",
    subject: "Il rendimento della tua campagna",
    date: hoursAgo(6),
    snippet: "Le conversioni sono aumentate del 18% questa settimana",
    unread: true,
    messageId: "<e2@google.com>",
    body: "Le conversioni della campagna 'Autunno 2026' sono aumentate del 18% rispetto alla settimana precedente. Costo per conversione: 4,20 €.",
  },
  {
    id: "e3",
    threadId: "e3",
    from: "Giulia Verdi <giulia.verdi@example.com>",
    to: "yuri@example.com",
    subject: "Re: preventivo sito web",
    date: hoursAgo(20),
    snippet: "Perfetto, possiamo sentirci domani mattina per chiudere?",
    unread: true,
    messageId: "<e3@example.com>",
    body: "Ciao Yuri,\n\nil preventivo va bene. Possiamo sentirci domani mattina per chiudere i dettagli?\n\nGiulia",
  },
];

const CHANNELS: SlackChannel[] = [
  { id: "C1", name: "marketing", type: "canale" },
  { id: "C2", name: "generale", type: "canale" },
  { id: "C3", name: "clienti", type: "canale" },
  { id: "D1", name: "@Sara", type: "dm" },
];

const SLACK: Record<string, SlackMessage[]> = {
  C1: [{ ts: "1", date: hoursAgo(1), user: "Sara", channel: "marketing", text: "@Yuri hai visto i nuovi creativi? Servirebbe un tuo ok entro oggi" }],
  C2: [{ ts: "2", date: hoursAgo(3), user: "Luca", channel: "generale", text: "Domani pranzo confermato alle 13" }],
  C3: [{ ts: "3", date: hoursAgo(5), user: "Andrea", channel: "clienti", text: "Il cliente Rossi chiede di anticipare la call alle 10:30" }],
  D1: [{ ts: "4", date: hoursAgo(8), user: "Sara", text: "Ci sei per un caffè dopo lo stand-up?" }],
};

/* Stato in memoria (sopravvive ai ricaricamenti in sviluppo). */
const store = globalThis as unknown as { __demoEvents?: CalendarEvent[] };
const events = () => (store.__demoEvents ??= seedEvents());

function applyInput(event: CalendarEvent, input: EventInput): CalendarEvent {
  const time = (v: string) => (input.allDay ? { date: v.slice(0, 10) } : { dateTime: new Date(v).toISOString() });
  return {
    ...event,
    ...(input.summary !== undefined && { summary: input.summary }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.start && { start: time(input.start) }),
    ...(input.end && { end: time(input.end) }),
    ...(input.attendees && { attendees: input.attendees.map((email) => ({ email })) }),
  };
}

const bounds = (e: CalendarEvent) => ({
  start: new Date(e.start.dateTime ?? `${e.start.date}T00:00:00`).getTime(),
  end: new Date(e.end.dateTime ?? `${e.end.date}T00:00:00`).getTime(),
});

export const demo = {
  listEvents({ timeMin, timeMax, query }: { timeMin: string; timeMax: string; query?: string }) {
    const min = Date.parse(timeMin);
    const max = Date.parse(timeMax);
    return events()
      .filter((e) => {
        const b = bounds(e);
        return b.start < max && b.end > min;
      })
      .filter((e) => !query || e.summary?.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => bounds(a).start - bounds(b).start);
  },
  createEvent(input: EventInput) {
    const event = applyInput({ id: crypto.randomUUID(), start: {}, end: {} }, input);
    events().push(event);
    return event;
  },
  updateEvent(id: string, input: EventInput) {
    const list = events();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Evento non trovato");
    list[index] = applyInput(list[index], input);
    return list[index];
  },
  deleteEvent(id: string) {
    store.__demoEvents = events().filter((e) => e.id !== id);
  },
  searchEmails(query: string, max: number): EmailSummary[] {
    const words = query
      .split(/\s+/)
      .filter((w) => w && !w.includes(":"))
      .map((w) => w.toLowerCase());
    return EMAILS.filter((e) =>
      words.every((w) => `${e.from} ${e.subject} ${e.body}`.toLowerCase().includes(w)),
    )
      .slice(0, max)
      .map((e) => ({
        id: e.id,
        threadId: e.threadId,
        from: e.from,
        to: e.to,
        subject: e.subject,
        date: e.date,
        snippet: e.snippet,
        unread: e.unread,
      }));
  },
  readEmail(id: string) {
    const email = EMAILS.find((e) => e.id === id);
    if (!email) throw new Error("Email non trovata");
    return email;
  },
  sendEmail() {
    return { id: "demo", threadId: "demo" };
  },
  listChannels: () => CHANNELS,
  channelHistory: (channel: string) => SLACK[channel] ?? [],
  searchMessages: (query: string) =>
    Object.values(SLACK)
      .flat()
      .filter((m) => m.text.toLowerCase().includes(query.toLowerCase())),
  postMessage: (channel: string) => ({ ts: String(Date.now() / 1000), channel }),
  recentMessages: (limit: number) =>
    Object.values(SLACK)
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit),
};
