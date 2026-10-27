#!/bin/bash
# Double-click to start Miror: it installs what it needs the first time, starts the AI server
# and opens the app in your browser. Keep this window open while you use Miror; closing it stops it.
cd "$(dirname "$0")" || exit 1

# A double-clicked script may not see Node installed through nvm, so load it if it's there.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

pause() { read -r -n 1 -s -p "Press any key to close this window."; echo; }

if ! command -v node >/dev/null 2>&1; then
  echo "Miror needs Node.js. Install it from https://nodejs.org, then double-click this file again."
  pause; exit 1
fi

if curl -s -m 2 http://localhost:8787/api/health >/dev/null 2>&1; then
  echo "Miror is already running. Opening it…"
  open http://localhost:8787
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "First start: installing Miror's parts (about a minute)…"
  npm install || { pause; exit 1; }
fi

if [ ! -f .env ]; then
  echo "Note: no .env file, so the AI is off (sample maps still work)."
  echo "To turn it on, copy .env.example to .env and put your API key in it."
fi

# Open the browser once the server answers.
( for _ in $(seq 1 40); do
    curl -s -m 1 http://localhost:8787/api/health >/dev/null 2>&1 && { open http://localhost:8787; exit 0; }
    sleep 0.25
  done ) &

npm start
pause
