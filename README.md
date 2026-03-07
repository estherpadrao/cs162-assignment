# Hierarchical Todo App

A full-stack todo app with a **Flask** REST API backend and a **React** frontend. Users can manage multiple lists of tasks, organize them in kanban columns (To Do / Doing / Done), and nest sub-tasks to arbitrary depth. All data is persisted per-user in a local SQLite database.

## System Design

```
Browser (React, port 3000)
        │  /api/* requests (proxied)
        ▼
Flask REST API (port 5001)
        │  SQLAlchemy ORM
        ▼
SQLite (backend/todo.db)

── Test Pipeline ──────────────────────────────────
pytest (34 tests, 3 modules)
        │  conftest.py — app factory + fixtures
        │    ├── client        (Flask test client)
        │    ├── registered_user + auth_headers
        │    └── user_list
        ├── test_auth.py   → POST/DELETE /api/tokens, /api/register
        ├── test_lists.py  → CRUD + reorder + user isolation
        └── test_items.py  → create / nest / update / move / cascade delete
        │  in-memory SQLite (no files written)
        ▼
each test gets a fresh, isolated DB (create_all → yield → drop_all)
```

- **Frontend** — React SPA with React Router. Shares auth state via `UserContext`. API calls go through `ApiClient.js`, which attaches a Bearer token to every request.
- **Backend** — Flask with four API modules: `auth`, `users`, `lists`, `items`. Token-based authentication; each token is stored per-user in the database.
- **Database** — SQLite, three tables: `user`, `todo_list`, `item`. Items self-reference for sub-tasks.

## Quick Start

### Option A — one script
```bash
bash start.sh
```

### Option B — manual (two terminals)

**Terminal 1 — backend**
```bash
cd backend
pip3 install -r ../requirements.txt
python3 app.py          # http://localhost:5001
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
npm start               # http://localhost:3000
```

Then open http://localhost:3000.

> `package.json` proxies all `/api/*` requests to `http://localhost:5001`, so the frontend and backend talk to each other automatically.

## Project Structure

```
cs162-assignment/
├── backend/
│   ├── app.py           # entry point — creates DB tables, starts Flask on :5001
│   ├── config.py        # SECRET_KEY, DB URI
│   └── app/
│       ├── __init__.py  # Flask app factory, CORS, blueprint registration
│       ├── models.py    # User, TodoList, Item (self-referencing for sub-tasks)
│       └── api/
│           ├── auth.py  # POST/DELETE /api/tokens, POST /api/register
│           ├── users.py # GET /api/me
│           ├── lists.py # CRUD + reorder for lists
│           └── items.py # CRUD + move for items
├── frontend/
│   ├── src/
│   │   ├── ApiClient.js     # fetch wrapper with token auth
│   │   ├── UserContext.js   # React context: { user, setUser, api }
│   │   ├── App.js           # routes
│   │   ├── pages/           # HomePage, LoginPage, RegisterPage, ProfilePage, ListsPage
│   │   └── components/      # Header, ListBlock, ItemCard, AddItemForm, EditItemModal
│   └── package.json
├── requirements.txt
└── start.sh
```

## Running the Tests

```bash
cd backend
python -m pytest tests/ -v
```

Uses an **in-memory SQLite database** — no setup required, no files written. Each test gets a fresh, isolated database.

**34 tests across 3 modules:**

| File | What it tests |
|---|---|
| `tests/test_auth.py` | Registration (success, duplicate email, missing fields), login (correct/wrong credentials), token revocation |
| `tests/test_lists.py` | Creating lists, rank ordering, renaming, deleting (with cascade to items), user isolation (403 on other user's list), reordering |
| `tests/test_items.py` | Top-level and nested sub-item creation, column/title/description updates, invalid column rejection, cascade delete when parent removed, nested serialization, rank-swap moves |

**Expected output:**
```
34 passed in ~9s
```

## API Overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/register` | Create account |
| POST | `/api/tokens` | Login → returns token |
| DELETE | `/api/tokens` | Logout |
| GET | `/api/me` | Current user info |
| GET/POST | `/api/lists` | List all lists / create list |
| PUT/DELETE | `/api/lists/<id>` | Rename / delete list |
| POST | `/api/lists/<id>/move` | Reorder list |
| GET | `/api/lists/<id>/items` | Items (with nested sub-tasks) |
| POST | `/api/items` | Create item or sub-item |
| PUT/DELETE | `/api/items/<id>` | Edit / delete item |
| POST | `/api/items/<id>/move` | Move item up/down within column |
