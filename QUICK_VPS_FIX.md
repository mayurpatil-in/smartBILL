# Quick VPS CORS Fix

## What Changed

✅ Fixed backend to properly read CORS origins from `.env` instead of using hardcoded localhost

## What You Need to Do on VPS

### 1. Update Backend `.env`

```bash
ssh user@your_vps_ip
cd /var/www/smartBILL/backend
nano .env
```

Update these lines (replace with your actual domain):

```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
BACKEND_URL=https://yourdomain.com
```

### 2. Update Frontend `.env`

```bash
cd /var/www/smartBILL/frontend
nano .env
```

Set this (replace with your actual domain):

```env
VITE_API_URL=https://yourdomain.com
```

### 3. Deploy the Changes

```bash
# Pull latest code (includes the CORS fix)
cd /var/www/smartBILL
git pull origin main

# Update backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart smartbill-backend

# Rebuild frontend (important - bakes in VITE_API_URL)
cd ../frontend
npm install
npm run build
```

### 4. Verify

Open your site in browser and check console for:

```
🚀 [AXIOS] Using API_URL: https://yourdomain.com
```

Try logging in - CORS errors should be gone! ✨

## Example Configuration

If your domain is `themayur.com` and you access it via `https://my.themayur.com`:

**Backend `.env`:**

```env
CORS_ORIGINS=https://themayur.com,https://my.themayur.com,https://www.themayur.com
BACKEND_URL=https://my.themayur.com
```

**Frontend `.env`:**

```env
VITE_API_URL=https://my.themayur.com
```

## Troubleshooting

**Still getting CORS errors?**

1. Check backend logs: `sudo journalctl -u smartbill-backend -f`
2. Verify you restarted backend after changing `.env`
3. Verify you rebuilt frontend after changing `.env`
4. Clear browser cache (Ctrl+Shift+R)

**API requests going to wrong URL?**

1. Check browser console for the API_URL log
2. Verify `VITE_API_URL` in frontend `.env`
3. Rebuild frontend: `npm run build`
