set shell := ["powershell.exe", "-c"]

default:
    @just --list

# ============================================================================
# BACKEND COMMANDS (FastAPI)
# ============================================================================

backend-install:
    @echo "Installing backend dependencies..."
    @powershell -Command "uv sync"

backend-dev:
    @echo "Starting backend development server..."
    uv run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8001

backend-test:
    @echo "Running backend tests..."
    @powershell -Command "$env:PYTHONPATH='.'; uv run pytest src/backend/"

# ============================================================================
# FRONTEND COMMANDS (Next.js)
# ============================================================================

frontend-install:
    @echo "Installing frontend dependencies..."
    cd src/frontend; npm install

frontend-dev:
    @echo "Starting frontend development server..."
    cd src/frontend; npm run dev

frontend-build:
    @echo "Building frontend..."
    cd src/frontend; npm run build

# ============================================================================
# INSTALLATION & SETUP
# ============================================================================

install:
    @echo "Installing all dependencies..."
    @echo "1. Installing Python backend dependencies..."
    @powershell -Command "uv sync"
    @echo ""
    @echo "2. Installing root (hooks) dependencies..."
    npm install
    @echo ""
    @echo "3. Installing frontend dependencies..."
    cd src/frontend; npm install
    @echo ""
    @echo "4. Pulling task-extractor model from Ollama..."
    ollama pull lamphat03102004/task-extractor01
    @echo ""
    @echo "All dependencies installed!"

# ============================================================================
# DEVELOPMENT HELPERS
# ============================================================================

format:
    @echo "Formatting backend code..."
    uv run black src/backend
    uv run isort src/backend
    @echo "Formatting frontend code..."
    npm run format
    @echo "All code formatted!"

lint:
    @echo "Linting backend..."
    uv run flake8 src/backend
    @echo "Linting frontend..."
    cd src/frontend; npm run lint
    @echo "Linting complete!"
