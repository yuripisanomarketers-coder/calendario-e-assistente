import type { ReactNode } from "react";

/** Sezione della barra laterale, stile elenco Apple. */
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
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-label-secondary">{title}</h2>
        {action}
      </div>
      <div className="rounded-xl bg-white px-3 py-1 shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">{children}</div>
    </section>
  );
}

export function PanelSkeleton({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <div className="space-y-2 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-md bg-fill" />
        ))}
      </div>
    </Panel>
  );
}

export function PanelMessage({ children }: { children: ReactNode }) {
  return <p className="py-2 text-xs text-label-secondary">{children}</p>;
}

export function PanelLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-[11px] text-system-blue hover:opacity-70">
      Apri
    </a>
  );
}
