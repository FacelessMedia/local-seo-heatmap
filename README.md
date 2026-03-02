# LocalGrid — Local SEO Geo-Grid Heatmap Tool

Track your Google Maps rankings across your entire service area with precision geo-grid heatmaps. Built for agencies and local businesses.

**Equivalent to**: BrightLocal Local Rank Tracker, SEMrush Map Tracker, GoHighLevel Local SEO Heatmaps, GeckoGrid, VitalMap

---

## Features

- **Geo-Grid Heatmaps**: 5×5, 7×7, 9×9, or 13×13 grid scans with configurable spacing
- **Color-Coded Rankings**: Green (Top 3), Yellow (Page 1), Red (Page 2), Gray (Not Found)
- **Point Detail View**: Click any grid point to see top-ranking businesses at that location
- **Dashboard Stats**: Average rank, visibility %, map pack coverage
- **Scan History**: Track ranking changes over time
- **Image Export**: Export heatmaps as PNG for client reports
- **Demo Mode**: Works without API keys using simulated data
- **Real Mode**: Connects to DataForSEO for actual Google Maps SERP data

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui + Lucide icons
- **Maps**: Google Maps JavaScript API (optional, CSS grid fallback)
- **Rank Data**: DataForSEO Google Maps SERP API
- **Hosting**: Vercel
- **Storage**: Vercel Postgres (Neon) + Vercel KV (Upstash) + Vercel Blob
- **Auth**: NextAuth.js with Google OAuth

---

## Quick Start (Local Development)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/local-seo-heatmap.git
cd local-seo-heatmap

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys (or leave blank for demo mode)

# 4. Run dev server
npm run dev
```

Open http://localhost:3000 — the app works in **demo mode** without any API keys.

---

## API Keys Setup

### 1. DataForSEO (Required for real rank data)
This is the engine that checks Google Maps rankings at specific GPS coordinates.

1. Register at https://app.dataforseo.com/register (you get $1 free credit)
2. Deposit minimum $50 (pay-as-you-go, no subscription)
3. Copy your login and password to `.env.local`:
   ```
   DATAFORSEO_LOGIN=your_email@example.com
   DATAFORSEO_PASSWORD=your_password
   ```
4. **Cost**: ~$0.002 per grid point. A 7×7 scan (49 points) costs ~$0.10

### 2. Google Maps API Key (Required for interactive map display)
1. Go to https://console.cloud.google.com
2. Create a project (or use existing)
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Geocoding API**
4. Create an API key under Credentials
5. Restrict the key to your domain(s)
6. Add to `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```
7. **Cost**: Google gives $200/month free credit. Maps loads cost ~$7/1000.

> **Note**: Without a Google Maps API key, the app uses a beautiful CSS-based grid display instead.

### 3. Google Business Profile API (Required for GBP management features)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application type)
3. Set redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Apply for GBP API access: https://docs.google.com/forms/d/1XTQc-QEjsE7YrgstyJxbFDnwmhUhBFFvpNJBw3VzuuE/viewform
5. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   ```
6. **Cost**: Free (the API itself has no charge)
7. **Approval time**: 1-4 weeks

### 4. OpenAI API (Optional — for AI review replies)
1. Get key from https://platform.openai.com/api-keys
2. Add to `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```

---

## Deploy to Vercel + GitHub

### Step 1: Push to GitHub
```bash
cd local-seo-heatmap
git init
git add .
git commit -m "Initial commit: LocalGrid heatmap tool"
git remote add origin https://github.com/YOUR_USERNAME/local-seo-heatmap.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel auto-detects Next.js — click **Deploy**
4. After deploy, go to **Settings → Environment Variables** and add all your API keys

### Step 3: Add Vercel Storage
1. In your Vercel dashboard, go to **Storage**
2. Add **Neon Postgres** (from Marketplace) — this auto-injects `POSTGRES_URL`
3. Add **Upstash Redis** (from Marketplace) — this auto-injects `KV_REST_API_URL` + `KV_REST_API_TOKEN`
4. Add **Vercel Blob** — this auto-injects `BLOB_READ_WRITE_TOKEN`

### Step 4: Set Up Cron Jobs (for scheduled scans)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scan",
      "schedule": "0 6 * * 1"
    }
  ]
}
```
This runs weekly scans every Monday at 6 AM UTC.

---

## Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| DataForSEO | ~$0.10 per 7×7 scan | Pay-as-you-go, $50 min deposit |
| Google Maps API | ~$7/1000 map loads | $200/month free credit |
| Vercel Pro | $20/month | Hosting + serverless functions |
| Vercel Postgres (Neon) | Free tier available | 0.5 GB storage free |
| Vercel KV (Upstash) | Free tier available | 10,000 requests/day free |
| **Total (10 clients)** | **~$35-40/month** | Serving 10 clients with weekly scans |

### Revenue Model
- Charge $49-99/client/month for rank tracking
- 10 clients at $79/month = **$790/month** on ~$40 costs

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── projects/route.ts    # CRUD for business projects
│   │   └── scans/
│   │       ├── route.ts         # Create scans, run grid checks
│   │       └── [id]/route.ts    # Get scan results
│   ├── layout.tsx
│   ├── page.tsx                 # Main app (project list + dashboard)
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── heatmap-grid.tsx         # Core heatmap display (Maps + CSS fallback)
│   ├── scan-control.tsx         # Keyword + grid config panel
│   ├── scan-history.tsx         # Past scan list
│   ├── project-setup.tsx        # Add business form
│   ├── dashboard-stats.tsx      # Stats cards (avg rank, visibility, etc.)
│   ├── point-detail.tsx         # Click a grid point → see competitors
│   └── export-button.tsx        # Export heatmap as PNG
└── lib/
    ├── grid.ts                  # Grid coordinate generation + rank coloring
    ├── dataforseo.ts            # DataForSEO API client + rank detection
    ├── store.ts                 # In-memory store (demo) → swap to Postgres
    ├── types.ts                 # TypeScript interfaces
    └── utils.ts                 # Tailwind merge utility
```

---

## Roadmap

- [x] Phase 1: Geo-grid heatmap MVP with demo mode
- [ ] Phase 2: Vercel Postgres integration (persistent storage)
- [ ] Phase 3: Google Business Profile management (reviews, posts)
- [ ] Phase 4: White-label reports + PDF export
- [ ] Phase 5: Multi-tenant agency dashboard
- [ ] Phase 6: Scheduled scans via Vercel Cron
- [ ] Phase 7: Competitor comparison overlay
