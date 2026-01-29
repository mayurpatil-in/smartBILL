---
description: How to update the application on the VPS
---

How to update the application on the VPS

1.  **Connect to your VPS**

    ```bash
    ssh <user>@<your_vps_ip>
    ```

2.  **Navigate to the project folder**

    ```bash
    cd <your_project_folder>
    # Example: cd /var/www/smartBILL
    ```

3.  **Pull the latest code**

    ```bash
    git pull origin main
    ```

4.  **Verify Environment Configuration**

    ```bash
    # Check backend .env for correct CORS_ORIGINS and BACKEND_URL
    cat backend/.env | grep CORS_ORIGINS
    cat backend/.env | grep BACKEND_URL

    # Check frontend .env for correct VITE_API_URL
    cat frontend/.env | grep VITE_API_URL

    # If needed, edit the files:
    # nano backend/.env
    # nano frontend/.env
    ```

5.  **Update Backend**

    ```bash
    cd backend

    # 1. Install new dependencies (if any)
    source .venv/bin/activate
    pip install -r requirements.txt
    # OR if using uv:
    # uv sync

    # 2. Apply Database Migrations (CRITICAL)
    alembic upgrade head

    # 3. Restart Backend Service (Systemd)
    sudo systemctl restart smartbill-backend
    ```

6.  **Update Frontend**

    ```bash
    cd ../frontend

    # 1. Install new dependencies
    npm install

    # 2. Build for production (uses VITE_API_URL from .env)
    npm run build

    # 3. (Optional) Restart Frontend Service if using PM2/Node
    # If served via Nginx static files, just the build is enough.
    # If using a Node server:
    # pm2 restart smartbill-frontend
    ```

7.  **Verify**
    - Check if the site is loading.
    - Check backend logs if needed: `sudo journalctl -u smartbill-backend -f`
    - Open browser console and verify API URL: Should show `🚀 [AXIOS] Using API_URL: https://yourdomain.com`
    - Test a login or API request to verify CORS is working
