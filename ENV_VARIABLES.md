# Environment Variables for Frontend Deployment

## Required Environment Variables

### API Configuration
```
REACT_APP_API_URL=https://backend.pvara.team
```

Use the backend origin only; do not include a trailing `/api` suffix (the app appends `/api` to requests where needed).

## Setup Instructions for Vercel

1. Deploy backend first and get the URL
2. Go to frontend project settings in Vercel
3. Navigate to "Environment Variables"
4. Add `REACT_APP_API_URL` with `https://backend.pvara.team` (or your backend origin)
5. Redeploy the frontend

## Note

If `REACT_APP_API_URL` is not set, the app defaults to `https://backend.pvara.team` and builds API paths under `/api` as needed.

For best results, set the backend URL explicitly.
