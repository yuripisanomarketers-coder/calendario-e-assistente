import { env } from "@/lib/env";
import { searchEmails, type EmailSummary } from "@/lib/google";
import { Panel, PanelMessage } from "./panel";

const senderName = (from: string) => from.replace(/<.*>/, "").replace(/"/g, "").trim() || from;

export async function Inbox() {
  let emails: EmailSummary[];
  try {
    emails = await searchEmails("in:inbox is:unread", 8);
  } catch (error) {
    console.error(error);
    return (
      <Panel title="Email">
        <PanelMessage>Impossibile caricare Gmail.</PanelMessage>
      </Panel>
    );
  }

  return (
    <Panel
      title="Email non lette"
      action={
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Apri
        </a>
      }
    >
      {emails.length === 0 ? (
        <PanelMessage>Nessuna email non letta. 🎉</PanelMessage>
      ) : (
        <ul className="divide-y divide-border">
          {emails.map((email) => (
            <li key={email.id}>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                target="_blank"
                rel="noreferrer"
                className="block py-2 text-sm hover:opacity-80"
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">{senderName(email.from)}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(email.date).toLocaleDateString("it-IT", {
                      timeZone: env.timeZone,
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="truncate">{email.subject || "(senza oggetto)"}</div>
                <div className="truncate text-xs text-muted">{email.snippet}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
