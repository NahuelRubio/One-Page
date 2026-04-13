#!/usr/bin/env bash
PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$DIR"

# Abre el navegador tras un breve retraso para que el servidor arranque
(sleep 1 && open "http://localhost:$PORT") &

echo "Servidor en http://localhost:$PORT"
echo "Pulsa Ctrl+C para detener."
echo ""

if command -v python3 &>/dev/null; then
  python3 -m http.server $PORT
elif command -v npx &>/dev/null; then
  npx serve "$DIR" -l $PORT
else
  echo "Error: necesitas Python 3 o Node.js instalado."
  exit 1
fi
