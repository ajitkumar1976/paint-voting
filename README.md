# Little Artists — Children's Art Competition Voting

A self-hosted web app for running a children's painting competition with anonymous audience voting, admin controls, QR code access, and a staged winner reveal.

## Features

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Entry links |
| Admin | `/admin` | Upload paintings, QR code, open/freeze voting, reset |
| Vote | `/vote` | Anonymous grid, checkboxes, zoom preview, max 3 picks |
| Display | `/display` | Top 3 winners revealed 3rd → 2nd → 1st (10s each) |

- Painter names hidden during voting
- One vote per performer, exactly 3 paintings per voter
- SQLite + file storage (handles 100+ concurrent voters)
- QR code for mobile access on the same WiFi network

---

## Quick start (local)

```bash
npm install
cp .env.example .env    # edit ADMIN_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default admin password: `admin123`.

---

## WiFi / LAN deployment (recommended for events)

Run the app on a laptop connected to your event WiFi so phones on the same network can scan the QR code and vote.

### Option A — Node.js (simplest)

```bash
npm install
cp .env.example .env
npm run build
npm run start:lan
```

1. Find your laptop's WiFi IP (Windows: `ipconfig`, look for **IPv4 Address**, e.g. `192.168.1.42`)
2. On the **same WiFi**, open `http://192.168.1.42:3000/admin`
3. Log in, upload paintings, open voting
4. The QR code in admin uses your IP automatically when you access admin via that IP
5. Audience scans QR → votes on `/vote`

> **Important:** Open the admin panel using your **WiFi IP** (not `localhost`) before sharing the QR code, so the QR points to an address phones can reach.

### Option B — Docker

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cp .env.example .env    # set ADMIN_PASSWORD
docker compose up --build -d
```

Same WiFi steps as above. Data persists in a Docker volume (`paint-voting-data`).

```bash
docker compose down          # stop
docker compose up -d         # start again
docker compose logs -f       # view logs
```

### Windows firewall

If phones cannot connect, allow inbound TCP port **3000** in Windows Defender Firewall for private networks.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Little Artists voting platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Paint-Voting.git
git push -u origin main
```

**Do not commit** `.env` — it is gitignored. Set `ADMIN_PASSWORD` on each machine or in Docker Compose.

### What gets committed

| Included | Excluded (gitignored) |
|----------|----------------------|
| Source code | `node_modules/`, `.next/` |
| `Dockerfile`, `docker-compose.yml` | `.env` |
| `.env.example` | `data/*.db`, `data/uploads/*` |

---

## Cloud hosting notes

This app needs **persistent disk** (SQLite database + uploaded images). It is **not** suitable for serverless platforms without a volume (e.g. Vercel).

Good options:

- **Your own laptop on WiFi** (see above) — easiest for a one-day event
- **Docker on a VPS** (DigitalOcean, Hetzner, etc.) with the included `docker-compose.yml`
- **Railway / Render / Fly.io** — deploy the Dockerfile and attach a persistent volume mounted at `/app/data`

### Render

1. Connect the GitHub repo `ajitkumar1976/paint-voting`
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start` (do not use a hardcoded port — Render sets `PORT`)
4. Add env var `ADMIN_PASSWORD` in the Render dashboard
5. Attach a **persistent disk** mounted at `/opt/render/project/src/data` (included in `render.yaml`)

Or use the included `render.yaml` blueprint when creating the service.

---

## Admin workflow

1. Log in at `/admin`
2. Upload paintings (image + painter name)
3. Click **Open Voting**
4. Share QR code or `/vote` link
5. Click **Freeze Voting** when done
6. Open `/display` on a projector for the winner reveal
7. Click **Reset** to clear everything for a new round

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | Yes | Password for `/admin` (default: `admin123`) |

---

## Tech stack

- Next.js 15 (App Router)
- SQLite via `better-sqlite3` (WAL mode)
- Uploads in `data/uploads/` served at `/uploads/[filename]`
- QR codes via `qrcode`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development (localhost only) |
| `npm run dev:lan` | Development on all interfaces (WiFi) |
| `npm run build` | Production build |
| `npm run start` | Production (binds to `PORT`, default 3000) |
| `npm run start:lan` | Same as `start` — listens on all interfaces for WiFi/LAN |
| `npm run docker:up` | Build & run with Docker Compose |
| `npm run docker:down` | Stop Docker containers |
