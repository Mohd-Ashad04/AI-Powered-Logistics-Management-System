# AI-Powered Logistics Management System — Deployment Guide

## Architecture

```
Public Frontend (React + Vite static build)
    ↓ HTTPS
Public Backend API (Node.js + Express)
    ↓
MongoDB Atlas (Cloud Database)
    +
OpenRouteService API (Location/Routing)
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with a cluster
- OpenRouteService API key (free at openrouteservice.org)
- A deployment platform for Node.js (Render, Railway, Heroku, etc.)
- A static hosting platform for React (Vercel, Netlify, Render, etc.)

## Environment Variables

### Backend

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (platform usually provides this) | Yes |
| `NODE_ENV` | `production` for deployment | Yes |
| `SECRET_KEY` | JWT secret — must be a strong random string in production | Yes |
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `OPENROUTESERVICE_API_KEY` | OpenRouteService API key | Yes |
| `FRONTEND_URL` | Public frontend origin(s), comma-separated | Yes |
| `GEMINI_API_KEY` | Google Gemini API key (optional, fallback mode available) | No |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional) | No |
| `STRIPE_PUBLISH_KEY` | Stripe publishable key (optional) | No |
| `TEST_DATABASE_URI` | Test database URI (development/CI only) | No |

### Frontend

| Variable | Description | Required |
|---|---|---|
| `VITE_API_BASE_URL` | Full URL to backend API, e.g. `https://your-backend.onrender.com/api` | Yes (production) |

> **NEVER** place `OPENROUTESERVICE_API_KEY`, `SECRET_KEY`, `MONGO_URI`, or any backend secret in frontend environment variables.

## Backend Deployment

1. Push backend code to your Git repository.
2. Create a new Web Service on your deployment platform.
3. Set the root directory to `backend/`.
4. **Build command:** `npm install`
5. **Start command:** `npm start`
6. Set all required environment variables listed above.
7. Ensure MongoDB Atlas allows connections from your deployment platform's IP range (or use `0.0.0.0/0` for development).

## Frontend Deployment

1. Push frontend code to your Git repository.
2. Create a new Static Site on your hosting platform.
3. Set the root directory to `frontend/`.
4. **Build command:** `npm install && npm run build`
5. **Publish directory:** `dist`
6. Set `VITE_API_BASE_URL` to your deployed backend URL + `/api` (e.g., `https://your-backend.onrender.com/api`).
7. Configure SPA fallback: redirect all routes to `index.html` (required for React Router).

## CORS Configuration

Set `FRONTEND_URL` in backend environment to your deployed frontend origin:

```
FRONTEND_URL=https://your-frontend.vercel.app
```

Multiple origins (comma-separated):

```
FRONTEND_URL=https://your-frontend.vercel.app,https://custom-domain.com
```

## MongoDB Atlas Setup

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with read/write access.
3. Add your deployment platform's IP to the Network Access whitelist.
4. Copy the connection string and set it as `MONGO_URI`.

## OpenRouteService Setup

1. Register at [openrouteservice.org](https://openrouteservice.org).
2. Generate an API key (free tier: 2000 requests/day).
3. Set it as `OPENROUTESERVICE_API_KEY` in backend environment only.

## Health Check

After deployment, verify the backend is running:

```
GET https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "AI Logistics System is running",
  "timestamp": "2026-08-19T12:00:00.000Z"
}
```

## Demo Accounts

### Customer
Register a new account through the public registration form.

### Delivery Agent
```
Email: agent@example.com
Password: password123
```
> Agent accounts are provisioned by the organization. The demo agent is created by the database seeder.

## Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Then fill in your values
npm run dev           # Starts on port 3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # Starts on port 5173, proxies /api to localhost:3000
```

### Seed Demo Data
```bash
cd backend
npm run seed
```

### Run Tests
```bash
cd backend
npm test
```

## Production Verification

After deploying both frontend and backend:

1. Open the frontend URL in a browser.
2. Register a new customer account.
3. Log in and verify the dashboard loads.
4. Create a new shipment (test the location autocomplete and pricing).
5. Verify the shipment appears in the Shipments list.
6. Open shipment details and verify data displays correctly.
7. Test the Tracking page.
8. Log out and log in as the demo delivery agent.
9. Verify agent dashboard and assignments load.
10. Hit the health check endpoint.

## Troubleshooting

| Issue | Solution |
|---|---|
| CORS errors | Verify `FRONTEND_URL` matches the exact origin of your frontend (including protocol) |
| MongoDB connection timeout | Check Atlas Network Access whitelist — add `0.0.0.0/0` if unsure |
| 401 on all requests | Verify `SECRET_KEY` is the same value used when tokens were issued |
| ORS returning 403 | Verify `OPENROUTESERVICE_API_KEY` is valid and not rate-limited |
| Frontend shows blank page | Ensure SPA fallback is configured (all routes → index.html) |
| `SECRET_KEY must be set in production` | Set `SECRET_KEY` env var to a strong random string |
