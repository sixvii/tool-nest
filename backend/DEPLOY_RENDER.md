# Deploying to Render (Free Tier Friendly)

The async stack runs in **one** Docker container (FastAPI + Celery worker + Celery beat) so the API and worker share `/tmp` for file processing and downloads. Redis (Render Key Value) handles the task queue.

---

## Method 1: Render Blueprint (Easiest & Recommended)

A `render.yaml` file is placed in the project root.

1. Push your repository to **GitHub**.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render automatically parses `render.yaml` and provisions:
   - **`tool-nest-redis`** (Key Value - Free Plan)
   - **`tool-nest-backend`** (Web Service - Free Plan, Docker)
   - Automatically connects Redis credentials via `fromService`!
5. Click **Apply**.
6. When deployment finishes, copy your Web Service URL:
   `https://tool-nest-backend.onrender.com`

---

## Method 2: Manual Setup in Render Dashboard

If you prefer setting up services manually:

### Step 1: Create Free Redis (Key Value)
1. In Render Dashboard, click **New +** → **Key Value**.
2. Name: `tool-nest-redis`
3. Plan: **Free** (Valkey / Redis compatible).
4. Click **Create Key Value**.
5. Once created, copy the **Internal Connection URL** (e.g., `redis://tool-nest-redis:6379`).

### Step 2: Create Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Select your GitHub repository.
3. Configure the following:
   - **Name**: `tool-nest-backend`
   - **Region**: Same region as your Key Value instance (e.g. Frankfurt or Ohio)
   - **Root Directory**: `backend`
   - **Environment / Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: **Free**
   - **Health Check Path**: `/health`

4. Add **Environment Variables**:
   | Key | Value | Notes |
   |-----|-------|-------|
   | `ENV` | `production` | Production mode |
   | `CELERY_BROKER_URL` | `<Your Redis Internal Connection URL>` | From Step 1 |
   | `CELERY_RESULT_BACKEND` | `<Your Redis Internal Connection URL>` | From Step 1 |
   | `ALLOWED_ORIGINS` | `*` (or your Vercel URL `https://your-frontend.vercel.app`) | Allowed CORS origins |
   | `U2NET_HOME` | `/home/appuser/.cache/u2net` | AI background removal models |
   | `GUNICORN_WORKERS` | `1` | Critical for 512MB RAM free tier |
   | `CELERY_CONCURRENCY` | `1` | Critical for 512MB RAM free tier |
   | `CELERY_MAX_MEMORY_PER_CHILD_KB` | `150000` | Recycles worker at ~150MB |

5. Click **Deploy Web Service**.

---

## Key Notes for Free Tier

- **Memory Optimization**: The free tier provides 512MB RAM. Running `GUNICORN_WORKERS=1` and `CELERY_CONCURRENCY=1` ensures the API and worker stay well within 512MB.
- **Spin-Down & Cold Starts**: Free Render web services spin down after 15 minutes of inactivity. The first request after idling takes ~50 seconds to wake up the service.
- **Healthcheck**: Render polls `/health` for container liveness. `/ready` checks if Redis + Celery worker are active.
