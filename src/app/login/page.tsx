const ERRORS: Record<string, string> = {
  "non-autorizzato": "Questo account Google non è autorizzato ad accedere.",
  annullato: "Accesso annullato.",
  stato: "Sessione di accesso scaduta, riprova.",
  refresh: "Google non ha concesso l'accesso permanente. Riprova.",
  google: "Errore durante l'accesso con Google. Riprova.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Calendario e Assistente</h1>
        <p className="mt-2 text-sm text-muted">Area privata. Accedi con il tuo account Google.</p>
        {message && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {message}
          </p>
        )}
        <a
          href="/api/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Accedi con Google
        </a>
      </div>
    </main>
  );
}
