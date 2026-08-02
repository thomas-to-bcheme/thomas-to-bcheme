#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
lsof -ti:7860 | xargs kill -9 2>/dev/null
python app.py
