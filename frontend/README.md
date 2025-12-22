# BookTrack – Full Project Setup & Run Guide

This guide explains how to **run the complete BookTrack project from scratch** on a local machine. The project is a **full-stack application** consisting of:

* **Frontend**: React + CRACO + Tailwind CSS
* **Backend**: FastAPI (Python)
* **Database**: MongoDB

---

## 1. Prerequisites

Ensure the following are installed on your system:

### General

* **Git**
* **Node.js** (v18 or later recommended)
* **Yarn** (`npm install -g yarn`)
* **Python** (v3.10+ recommended)

### Database

* **MongoDB Community Server**
* **MongoDB Compass** (for viewing data)

Verify installations:

```bash
node -v
npm -v
yarn -v
python --version
```

---

## 2. Project Structure

```
my_project/
├── backend/        # FastAPI backend
├── frontend/       # React frontend
└── README.md
```

---

## 3. Backend Setup (FastAPI)

### Step 1: Navigate to backend folder

```bash
cd backend
```

### Step 2: Create & activate virtual environment (recommended)

```bash
python -m venv venv
venv\Scripts\activate   # Windows
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ If `emergentintegrations` causes issues, it can be safely commented out or removed.

### Step 4: Environment variables

Create a `.env` file in `backend/` (if not already present):

```env
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=booktrack_db
JWT_SECRET=your_secret_key
```

### Step 5: Start the backend server

```bash
uvicorn server:app --reload
```

Backend will run at:

```
http://127.0.0.1:8000
```

Swagger API docs:

```
http://127.0.0.1:8000/docs
```

---

## 4. Database Setup (MongoDB)

1. Ensure **MongoDB service is running**
2. Open **MongoDB Compass**
3. Connect using:

```
mongodb://localhost:27017
```

4. Database `booktrack_db` and collections (`users`, `services`, `bookings`) will be created automatically

---

## 5. Frontend Setup (React)

### Step 1: Navigate to frontend folder

```bash
cd frontend
```

### Step 2: Install dependencies using Yarn

```bash
yarn install
```

> ⚠️ Warnings about peer dependencies are expected and safe.

### Step 3: Environment variables

Create or update `.env` in `frontend/`:

```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8000
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

> ⚠️ Ensure **no Emergent preview URLs** are present.

### Step 4: Remove Emergent watermark (already done)

The Emergent badge was removed from:

```
frontend/public/index.html
```

### Step 5: Start the frontend

```bash
yarn start
```

Frontend will run at:

```
http://localhost:3000
```

---

## 6. Running the Full Project (Quick Order)

1. Start **MongoDB service**
2. Start **Backend**

```bash
cd backend
uvicorn server:app --reload
```

3. Start **Frontend**

```bash
cd frontend
yarn start
```

---

## 7. Testing the Application

### API Testing

* Open Swagger UI: `http://127.0.0.1:8000/docs`
* Test `/auth/register` and `/auth/login`

### UI Testing

* Register/Login from the frontend UI
* Create services (provider)
* Book services (user)

### Database Verification

* Open MongoDB Compass
* Check collections:

  * `users`
  * `services`
  * `bookings`

---

## 8. Common Issues & Fixes

### CRACO not found

```bash
yarn add @craco/craco --dev
```

### Dependency conflicts

Use **Yarn only** (do not mix npm and yarn).

### Changes not reflecting

Restart frontend and hard refresh browser:

```
Ctrl + Shift + R
```

---

## 9. Tech Stack Summary

* **Frontend**: React, CRACO, Tailwind CSS
* **Backend**: FastAPI, JWT Authentication
* **Database**: MongoDB
* **API Docs**: Swagger UI

---

## 10. Project Status

✅ Full stack running successfully
✅ Authentication working
✅ Database integration verified
✅ Clean UI (no watermark)

---

### Author

BookTrack – Service Booking Platform

---

✨ Project is fully functional and demo-ready.
