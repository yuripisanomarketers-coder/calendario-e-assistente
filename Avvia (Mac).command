#!/bin/bash
# Doppio clic per avviare l'app in locale su Mac.
cd "$(dirname "$0")" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js non è installato. Scaricalo da https://nodejs.org (versione LTS), poi riprova."
  open "https://nodejs.org"
  read -r -p "Premi Invio per chiudere..."
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "DEMO=1" > .env.local
fi

if [ ! -d node_modules ]; then
  echo "Primo avvio: installo i componenti (qualche minuto)..."
  npm install || { read -r -p "Installazione non riuscita. Premi Invio per chiudere..."; exit 1; }
fi

echo "Avvio l'app su http://localhost:3000 (chiudi questa finestra per fermarla)"
(sleep 6 && open "http://localhost:3000") &
npm run dev
