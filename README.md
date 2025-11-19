# CodeCarbon Playground

Full-stack playground that lets you run Python snippets and observe real-time energy usage, emissions, and execution metrics powered by [CodeCarbon](https://mlco2.github.io/codecarbon/).

## Project Structure

- `backend/` – FastAPI server with a `/run` endpoint that executes Python code in a sandboxed subprocess while CodeCarbon tracks emissions.
- `frontend/` – React + TypeScript UI with a Monaco editor, Tailwind styling, and emission visualizations.
- `docker-compose.yml` – Spins up both services together.

## Requirements

- Node.js 18+ for the frontend.
- Python 3.11+ for the backend.
- Docker + Docker Compose (optional, for containerized runs).

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env  # if you want different values
uvicorn app.main:app --reload
```

The API exposes:
- `POST /run` – Accepts `{ "code": "print('hi')" }` and returns emissions, energy metrics, stdout/stderr, and tracker metadata.
- `GET /healthz` – Simple health probe.

Environment variables (set in `backend/.env`):
- `EXECUTION_TIMEOUT` – Seconds before terminating user code (default `10`).
- `ALLOWED_ORIGINS` – Comma-separated origins for CORS (default `http://localhost:5173`).
- `CODECARBON_COUNTRY` – ISO-2 code for tracker location override (default `IND`).

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env  # optional override
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` to match the backend origin (defaults to `http://localhost:8000`).

## Docker & Compose

To run both services:

```bash
docker compose up --build
```

- Backend exposed on `http://localhost:8000`.
- Frontend served on `http://localhost:5173`.

## Features

- Monaco editor with Python syntax highlighting.
- Run button triggers backend execution and displays a responsive loading indicator.
- Metric cards show energy consumed (kWh), CO₂ emitted (g), duration, CPU/GPU energy, and grid intensity when available.
- Output console streams stdout/stderr.
- Handles syntax/runtime errors, backend failures, and execution timeouts gracefully.

## Notes on Execution Safety

- User code runs inside a temporary directory with a sanitized environment and Python's isolated mode (`python -I`).
- Execution is time-limited (default 10 seconds). Timeouts return an informative error message.
- For stronger isolation, run the backend container inside hardened infrastructure or integrate with container sandboxes (Firecracker, gVisor, etc.).
