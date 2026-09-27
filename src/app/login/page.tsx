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
    <main className="flex flex-1 items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold tracking-tight">Calendario e Assistente</h1>
        <p className="mt-2 text-sm text-label-secondary">Area privata. Accedi con il tuo account Google.</p>
        {message && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-system-red">
            {message}
          </p>
        )}
        <a
          href="/api/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-system-blue px-4 py-2.5 text-[15px] font-medium text-white transition hover:brightness-110"
        >
          Accedi con Google
        </a>
      </div>
    </main>
  );
}
