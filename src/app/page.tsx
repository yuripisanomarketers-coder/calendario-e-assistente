import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarApp } from "@/components/calendar/calendar-app";
import { Chat } from "@/components/chat";
import { Inbox } from "@/components/inbox";
import { PanelSkeleton } from "@/components/panel";
import { SlackFeed } from "@/components/slack-feed";
import { getSession } from "@/lib/session";

export default async function Home() {
  if (!(await getSession())) redirect("/login");

  return (
    <CalendarApp
      sidebar={
        <>
          <Suspense fallback={<PanelSkeleton title="Email" />}>
            <Inbox />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Slack" />}>
            <SlackFeed />
          </Suspense>
        </>
      }
      chat={<Chat />}
    />
  );
}
