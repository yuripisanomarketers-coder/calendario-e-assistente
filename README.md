# Calendario e Assistente

App web personale (accesso riservato a una sola email) che riunisce:

- **Google Calendar**: agenda dei prossimi 7 giorni
- **Gmail**: email non lette
- **Slack**: messaggi recenti
- **Assistente AI (Claude)**: legge e gestisce calendario, email e Slack su richiesta. Prima di inviare
  messaggi o creare/modificare/eliminare eventi mostra cosa farà e aspetta la tua conferma.

Stack: Next.js 16 (App Router), Tailwind CSS 4, Anthropic SDK. Nessun database: la sessione
(con i token Google) è salvata in un cookie cifrato.

## Prova veloce (modalità demo)

Per vedere l'app senza login e senza collegare nessun account:

- **Mac**: doppio clic su `Avvia (Mac).command`
- **Windows**: doppio clic su `Avvia (Windows).bat`

Serve [Node.js](https://nodejs.org) (versione LTS). Al primo avvio viene creato `.env.local` con
`DEMO=1` e si apre http://localhost:3000 con calendario, email e Slack di esempio. Per far
rispondere l'assistente aggiungi `ANTHROPIC_API_KEY=...` in `.env.local` e riavvia.

## Configurazione

Copia `.env.example` in `.env.local` e compila i valori.

### 1. Google (login + Calendar + Gmail)

1. Vai su [Google Cloud Console](https://console.cloud.google.com/) e crea un progetto.
2. **API e servizi → Libreria**: abilita **Google Calendar API** e **Gmail API**.
3. **API e servizi → Schermata consenso OAuth**: tipo "Esterno", aggiungi la tua email come
   utente di test.
   - Finché l'app è in modalità "Test", Google fa scadere l'accesso ogni 7 giorni (dovrai
     rifare il login). Per evitarlo, clicca **Pubblica app**: per uso personale non serve la
     verifica; al login vedrai un avviso "app non verificata" che puoi superare con
     *Avanzate → Continua*.
4. **API e servizi → Credenziali → Crea credenziali → ID client OAuth** (tipo "Applicazione web"):
   - URI di reindirizzamento autorizzati: `http://localhost:3000/api/auth/callback` e, quando
     l'app è online, `https://TUO-DOMINIO/api/auth/callback`.
5. Copia Client ID e Client secret in `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
6. Imposta `ALLOWED_EMAIL` con la tua email Google: qualsiasi altro account viene rifiutato.
7. Genera `SESSION_SECRET` con `openssl rand -base64 32`.

### 2. Assistente AI

Crea una chiave su [console.anthropic.com](https://console.anthropic.com/) e mettila in
`ANTHROPIC_API_KEY`. Il modello usato è `claude-opus-5` (vedi `src/lib/assistant.ts`).

### 3. Slack (facoltativo)

1. Vai su [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**,
   scegli il tuo workspace.
2. **OAuth & Permissions → User Token Scopes**, aggiungi:
   `channels:read`, `channels:history`, `groups:read`, `groups:history`, `im:read`, `im:history`,
   `mpim:read`, `mpim:history`, `search:read`, `users:read`, `chat:write`.
3. **Install to Workspace**, poi copia lo **User OAuth Token** (`xoxp-...`) in `SLACK_USER_TOKEN`.

I messaggi inviati dall'assistente partono a tuo nome.

## Avvio in locale

```bash
npm install
npm run dev
```

Apri http://localhost:3000.

## Pubblicazione online (Vercel)

1. Importa la repository su [vercel.com](https://vercel.com/new).
2. In **Settings → Environment Variables** inserisci le stesse variabili di `.env.local`, con
   `APP_URL=https://TUO-DOMINIO.vercel.app`.
3. Aggiungi `https://TUO-DOMINIO.vercel.app/api/auth/callback` agli URI di reindirizzamento su Google.

Le risposte dell'assistente possono richiedere qualche decina di secondi; la rotta
`/api/chat` è configurata con `maxDuration = 300`.

## Struttura

```
src/
  proxy.ts               # blocca tutte le pagine senza sessione valida
  app/
    page.tsx             # dashboard (agenda, email, Slack, chat)
    login/page.tsx
    api/auth/*           # login/callback/logout Google OAuth
    api/chat/route.ts    # assistente AI
  components/            # riquadri della dashboard e chat
  lib/
    session.ts           # cookie di sessione cifrato
    google.ts            # OAuth, Calendar, Gmail
    slack.ts             # Slack Web API
    assistant.ts         # Claude + strumenti
```
