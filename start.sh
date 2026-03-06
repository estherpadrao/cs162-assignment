#!/usr/bin/env bash
# start.sh — install dependencies and start both servers
set -e

echo "=== Installing Python dependencies ==="
cd "$(dirname "$0")/backend"
pip install -r ../requirements.txt

echo "=== Starting Flask backend on http://localhost:5000 ==="
python run.py &
FLASK_PID=$!

echo "=== Installing Node dependencies ==="
cd ../frontend
npm install

echo "=== Starting React frontend on http://localhost:3000 ==="
npm start &
REACT_PID=$!

echo ""
echo "Both servers are running."
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop."

# Wait for either process to exit
wait $FLASK_PID $REACT_PID
