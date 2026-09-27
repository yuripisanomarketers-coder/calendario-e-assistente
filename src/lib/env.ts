function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`);
  }
  return value;
}

export const env = {
  /** Modalità demo: niente login e dati di esempio (vedi src/lib/demo.ts). */
  get demo() {
    return process.env.DEMO === "1";
  },
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get allowedEmail() {
    return required("ALLOWED_EMAIL").trim().toLowerCase();
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get slackUserToken(): string | undefined {
    return process.env.SLACK_USER_TOKEN || undefined;
  },
  get timeZone() {
    return process.env.TIME_ZONE ?? "Europe/Rome";
  },
};
