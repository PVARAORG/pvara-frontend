# Environment Variables for Frontend Deployment

## Required Environment Variables

### API Configuration
```
REACT_APP_API_URL=https://your-backend-url.vercel.app/api
```

## Setup Instructions for Vercel

1. Deploy backend first and get the URL
2. Go to frontend project settings in Vercel
3. Navigate to "Environment Variables"
4. Add `REACT_APP_API_URL` with your backend Vercel URL
5. Redeploy the frontend

## Note

If `REACT_APP_API_URL` is not set, the app will:
- Use `/api` in production (proxied through Vercel rewrites)
- Use `http://localhost:3001/api` in development

For best results, set the backend URL explicitly.
