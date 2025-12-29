#!/bin/bash
set -e

echo "Starting PlsCheckin Application..."

if [ ! -f "model.pkl" ]; then
    echo "Model not found! Training model first..."
    export PYTHONPATH=$PYTHONPATH:.
    python3 -m src.train
else
    echo " Model found."
fi

echo "Starting FastAPI Backend"
nohup fastapi dev main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   (Backend PID: $BACKEND_PID - Logs being written to 'backend.log')"

if [ -d "frontend" ]; then
    echo "Starting React Frontend on Port 3000..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing Frontend Dependencies..."
        npm install
    fi
    npm start
else
    echo "Error: 'frontend' directory not found."
    kill $BACKEND_PID
    exit 1
fi

trap "kill $BACKEND_PID" EXIT