import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PanelSkeleton({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-border/60" />
        ))}
      </div>
    </Panel>
  );
}

export function PanelMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
