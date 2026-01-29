# VPS Deployment Guide - CORS Configuration

## Overview

This guide explains how to properly configure CORS for your SmartBill application when deploying to a VPS.

## Backend Configuration

### 1. Update Backend `.env` File

On your VPS, edit `backend/.env` and set the following:

```env
# Database
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/billing_db

# JWT Secret (keep secure!)
JWT_SECRET_KEY=your_secret_key_here

# Project
PROJECT_NAME=SmartBill
ENV=production

# CORS Origins (comma-separated list of allowed origins)
# Include ALL domains/subdomains that will access your API
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://my.yourdomain.com

# Backend URL (used for QR codes and external links)
BACKEND_URL=https://yourdomain.com
```

**Important Notes:**

- Replace `yourdomain.com` with your actual domain
- Include both `www` and non-`www` versions if applicable
- Use `https://` for production (ensure SSL is configured)
- Do NOT include `http://localhost` origins in production for security

### 2. Backend CORS Logic (Already Fixed)

The backend now properly reads CORS origins from the `.env` file:

- If `CORS_ORIGINS` is set in `.env`, it uses those origins
- If not set, it falls back to localhost for development

## Frontend Configuration

### 1. Update Frontend `.env` File

On your VPS, create/edit `frontend/.env`:

```env
# Production API URL
VITE_API_URL=https://yourdomain.com

# Token expiry (optional)
ACCESS_TOKEN_EXPIRE_MINUTES=10
```

**Important Notes:**

- Replace `https://yourdomain.com` with your actual backend URL
- This URL is baked into the build, so you need to rebuild after changing it
- For local development, use `http://localhost:8000`

### 2. Frontend Fallback Logic

The frontend (`src/api/axios.js`) has smart fallback logic:

1. **First priority**: Uses `VITE_API_URL` from `.env` if set
2. **Tauri app**: Falls back to `http://localhost:8000`
3. **Web browser**: Falls back to `${window.location.protocol}//${window.location.hostname}:8000`

## Deployment Steps

### Option A: Using Environment Variables (Recommended)

1. **On VPS**, set environment variables before building:

   ```bash
   cd /var/www/smartBILL/frontend

   # Create/update .env file
   echo "VITE_API_URL=https://yourdomain.com" > .env

   # Build with environment variables
   npm run build
   ```

2. **Update backend** `.env`:

   ```bash
   cd /var/www/smartBILL/backend

   # Edit .env file
   nano .env
   # Update CORS_ORIGINS and BACKEND_URL

   # Restart backend service
   sudo systemctl restart smartbill-backend
   ```

### Option B: Using Build-time Configuration

If you want different builds for different environments:

1. **Create environment-specific files**:

   ```bash
   # frontend/.env.production
   VITE_API_URL=https://yourdomain.com

   # frontend/.env.development
   VITE_API_URL=http://localhost:8000
   ```

2. **Build for production**:
   ```bash
   npm run build -- --mode production
   ```

## Verification

### 1. Check Backend CORS Configuration

```bash
# On VPS, check backend logs
sudo journalctl -u smartbill-backend -f

# You should see the CORS origins being loaded
```

### 2. Check Frontend API URL

Open browser console on your deployed site and look for:

```
🚀 [AXIOS] Using API_URL: https://yourdomain.com
```

### 3. Test CORS

Open your deployed frontend in a browser and check:

1. Open Developer Tools → Network tab
2. Make a request (e.g., login)
3. Check response headers for:
   - `Access-Control-Allow-Origin: https://yourdomain.com`
   - `Access-Control-Allow-Credentials: true`

## Common Issues

### Issue 1: CORS Error After Deployment

**Symptom**: Browser console shows CORS policy error

**Solution**:

1. Verify `CORS_ORIGINS` in backend `.env` includes your frontend domain
2. Restart backend service: `sudo systemctl restart smartbill-backend`
3. Clear browser cache and hard reload (Ctrl+Shift+R)

### Issue 2: API Requests Going to Wrong URL

**Symptom**: Network tab shows requests to `localhost` or wrong domain

**Solution**:

1. Verify `VITE_API_URL` in frontend `.env`
2. Rebuild frontend: `npm run build`
3. Clear browser cache

### Issue 3: Mixed Content (HTTP/HTTPS)

**Symptom**: HTTPS site trying to access HTTP API

**Solution**:

1. Ensure both frontend and backend use HTTPS
2. Configure SSL certificates (Let's Encrypt recommended)
3. Update all URLs to use `https://`

## Security Best Practices

1. **Never use `CORS_ORIGINS=*` in production** - Always specify exact domains
2. **Use HTTPS** - Never use HTTP in production
3. **Keep JWT_SECRET_KEY secure** - Use a strong, random key
4. **Limit CORS origins** - Only include domains you control
5. **Regular updates** - Keep dependencies updated

## Example Production Configuration

### Backend `.env` (Production)

```env
DATABASE_URL=postgresql+psycopg2://postgres:SecurePassword123@localhost:5432/billing_db
JWT_SECRET_KEY=e8b16733a1b80f810391af646e72018d4a0b15ebb186f246cae8be819f5fde16
PROJECT_NAME=SmartBill
ENV=production
CORS_ORIGINS=https://smartbill.example.com,https://www.smartbill.example.com
BACKEND_URL=https://smartbill.example.com
```

### Frontend `.env` (Production)

```env
VITE_API_URL=https://smartbill.example.com
ACCESS_TOKEN_EXPIRE_MINUTES=10
```

## Quick Reference

| Environment        | Backend CORS_ORIGINS                                | Frontend VITE_API_URL        |
| ------------------ | --------------------------------------------------- | ---------------------------- |
| Local Dev          | `http://localhost:5173,http://localhost:5174`       | `http://localhost:8000`      |
| VPS Production     | `https://yourdomain.com,https://www.yourdomain.com` | `https://yourdomain.com`     |
| VPS with Subdomain | `https://app.yourdomain.com`                        | `https://app.yourdomain.com` |

---

**Last Updated**: 2026-01-29
