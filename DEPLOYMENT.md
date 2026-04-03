# Deployment Guide (Render - Backend + Frontend)

This project can be hosted fully on Render using the root `render.yaml`.

## Prerequisites

- GitHub repository connected to Render
- MongoDB Atlas connection string
- Strong JWT secret (32+ characters)

## 1) Deploy from Blueprint

1. Open Render Dashboard
2. Click **New** → **Blueprint**
3. Connect this repository and select branch `main`
4. Render detects `render.yaml` and creates:
   - `smart-attendance-backend` (Web Service)
   - `smart-attendance-frontend` (Static Site)

## 2) Set Backend Environment Variables

Set these on `smart-attendance-backend`:

- `MONGODB_URI` = your MongoDB Atlas URI
- `JWT_SECRET` = strong random secret (32+ chars)
- `ADMIN_PASSWORD` = strong admin password
- `CORS_ORIGIN` = frontend URL (example: `https://smart-attendance-frontend.onrender.com`)

Optional:

- `ADMIN_EMAIL` (default: `admin@smartattendance.com`)
- SMTP/Firebase OTP values if you need external OTP delivery

## 3) Set Frontend Environment Variable

Set this on `smart-attendance-frontend`:

- `REACT_APP_API_URL` = `https://<your-backend-service>.onrender.com/api`

Example:

`REACT_APP_API_URL=https://smart-attendance-backend.onrender.com/api`

## 4) Redeploy Both Services

After setting env vars:

1. Redeploy `smart-attendance-backend`
2. Redeploy `smart-attendance-frontend`

## 5) Verify Deployment

- Backend health: `https://<backend>.onrender.com/api/health`
- Open frontend URL and test:
  - Student registration
  - Login with wrong password (should show clear reason)
  - Login with correct password

## 6) Post-Deploy Notes

- If login/register fails with network message, check `REACT_APP_API_URL`.
- If API works but browser blocks requests, fix `CORS_ORIGIN`.
- If backend fails to boot, check `MONGODB_URI` and Atlas IP/network access.
