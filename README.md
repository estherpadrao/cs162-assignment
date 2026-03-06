# Hierarchical Todo App

A full-stack todo application built with **Flask** (backend) and **React** (frontend).

## Features
- Multiple user accounts (registration / login / logout)
- Each user sees only their own data
- Multiple named lists per user, reorderable with ↑↓ buttons
- Items with title, description, due date
- Three kanban columns per list: **To Do → Doing → Done** (done items hidden)
- Nested sub-tasks (arbitrary depth) rendered inside parent cards
- Collapse / expand a task to hide/show its sub-tasks
- Move a top-level task to a different list via the Edit modal
- All data persisted in a local SQLite database via SQLAlchemy

## Project Structure

```
cs162-assignment/
├── backend/
│   ├── app/
│   │   ├── __init__.py      # Flask app factory
│   │   ├── models.py        # SQLAlchemy models: User, TodoList, Item
│   │   └── api/
│   │       ├── __init__.py  # Blueprint
│   │       ├── auth.py      # POST /api/tokens, DELETE /api/tokens, POST /api/register
│   │       ├── users.py     # GET /api/me
│   │       ├── lists.py     # CRUD + reorder for lists
│   │       └── items.py     # CRUD + move for items
│   ├── config.py
│   └── run.py               # entry point — creates DB tables then starts Flask
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── ApiClient.js     # fetch wrapper (token auth, per Miguel's tutorial pattern)
│   │   ├── UserContext.js   # React context: { user, setUser, api }
│   │   ├── App.js           # BrowserRouter + routes
│   │   ├── pages/
│   │   │   ├── HomePage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── ProfilePage.js
│   │   │   └── ListsPage.js
│   │   └── components/
│   │       ├── Header.js
│   │       ├── ListBlock.js     # kanban list card
│   │       ├── ItemCard.js      # recursive item card
│   │       ├── AddItemForm.js   # collapsible add-task form
│   │       └── EditItemModal.js # edit task modal
│   └── package.json
├── requirements.txt
└── start.sh
```

## Quick Start

### Option A — one script
```bash
bash start.sh
```
Then open http://localhost:3000.

### Option B — manual

**Backend**
```bash
cd backend
pip install -r ../requirements.txt
python run.py          # http://localhost:5000
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm start              # http://localhost:3000
```

The React dev-server proxies all `/api/*` requests to `http://localhost:5000` via the `"proxy"` field in `package.json`.

## Authentication

Follows the token-based pattern from [Miguel Grinberg's React Mega-Tutorial](https://blog.miguelgrinberg.com/post/the-react-mega-tutorial-chapter-8-authentication):
- `POST /api/tokens` → returns `{ token, user }`; token stored in `localStorage`
- Every subsequent request carries `Authorization: Bearer <token>`
- `DELETE /api/tokens` → revokes token (logout)

## Database

SQLite file at `backend/todo.db` (created automatically on first run).
