#!/bin/bash
set -e

echo "Starting PlsCheckin Application..."

if [ -d "backend" ]; then
    echo "Entering backend directory..."
    cd backend
    
    if [ ! -f "model.pkl" ]; then
        echo "Model not found! Training model first..."
        export PYTHONPATH=$PYTHONPATH:.
        python3 -m backend.train
    else
        echo " Model found."
    fi

    echo "Starting FastAPI Backend"
    nohup fastapi dev main.py > backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   (Backend PID: $BACKEND_PID - Logs being written to 'backend/backend.log')"
    
    cd ..
else
    echo "Error: 'backend' directory not found."
    exit 1
fi

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