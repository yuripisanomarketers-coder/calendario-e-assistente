import { env } from "@/lib/env";
import { isSlackConfigured, recentMessagesFromOthers, type SlackMessage } from "@/lib/slack";
import { Panel, PanelMessage } from "./panel";

export async function SlackFeed() {
  if (!isSlackConfigured()) {
    return (
      <Panel title="Slack">
        <PanelMessage>
          Slack non è ancora collegato. Imposta <code>SLACK_USER_TOKEN</code> (vedi README).
        </PanelMessage>
      </Panel>
    );
  }

  let messages: SlackMessage[];
  try {
    messages = await recentMessagesFromOthers();
  } catch (error) {
    console.error(error);
    return (
      <Panel title="Slack">
        <PanelMessage>Impossibile caricare Slack.</PanelMessage>
      </Panel>
    );
  }

  return (
    <Panel title="Slack · ultimi 2 giorni">
      {messages.length === 0 ? (
        <PanelMessage>Nessun messaggio recente.</PanelMessage>
      ) : (
        <ul className="divide-y divide-border">
          {messages.map((message) => (
            <li key={`${message.channel}-${message.ts}`}>
              <a
                href={message.permalink}
                target="_blank"
                rel="noreferrer"
                className="block py-2 text-sm hover:opacity-80"
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">
                    {message.user}
                    {message.channel && (
                      <span className="font-normal text-muted"> · #{message.channel}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(message.date).toLocaleTimeString("it-IT", {
                      timeZone: env.timeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="line-clamp-2 text-muted">{message.text}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
