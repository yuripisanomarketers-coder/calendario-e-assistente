import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Agenda } from "@/components/agenda";
import { Chat } from "@/components/chat";
import { Inbox } from "@/components/inbox";
import { PanelSkeleton } from "@/components/panel";
import { SlackFeed } from "@/components/slack-feed";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Ciao{session.name ? `, ${session.name.split(" ")[0]}` : ""} 👋
        </h1>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="text-sm text-muted hover:text-foreground">
            Esci
          </button>
        </form>
      </header>

      <main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <Suspense fallback={<PanelSkeleton title="Agenda" />}>
            <Agenda />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Email" />}>
            <Inbox />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Slack" />}>
            <SlackFeed />
          </Suspense>
        </div>
        <Chat />
      </main>
    </div>
  );
}
