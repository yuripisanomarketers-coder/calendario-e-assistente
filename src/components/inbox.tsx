import { env } from "@/lib/env";
import { searchEmails, type EmailSummary } from "@/lib/google";
import { Panel, PanelLink, PanelMessage } from "./panel";

const senderName = (from: string) => from.replace(/<.*>/, "").replace(/"/g, "").trim() || from;

export async function Inbox() {
  let emails: EmailSummary[];
  try {
    emails = await searchEmails("in:inbox is:unread", 6);
  } catch (error) {
    console.error(error);
    return (
      <Panel title="Email">
        <PanelMessage>Impossibile caricare Gmail.</PanelMessage>
      </Panel>
    );
  }

  return (
    <Panel title="Email non lette" action={<PanelLink href="https://mail.google.com" />}>
      {emails.length === 0 ? (
        <PanelMessage>Nessuna email non letta.</PanelMessage>
      ) : (
        <ul className="divide-y divide-separator">
          {emails.map((email) => (
            <li key={email.id}>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                target="_blank"
                rel="noreferrer"
                className="block py-2 text-xs hover:opacity-70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-system-blue" />
                    <span className="truncate">{senderName(email.from)}</span>
                  </span>
                  <span className="shrink-0 text-label-tertiary">
                    {new Date(email.date).toLocaleDateString("it-IT", {
                      timeZone: env.timeZone,
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="truncate pl-3.5">{email.subject || "(senza oggetto)"}</div>
                <div className="truncate pl-3.5 text-label-secondary">{email.snippet}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
