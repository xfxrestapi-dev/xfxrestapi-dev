# Premium API Platform — GitHub + Cloudflare Workers + Pages

`worker/` is the API gateway and Durable Object WebSocket. `pages/` is the premium landing page. The Worker is configured to serve the Pages assets too, so one Worker can host the full stack; Pages can also host `pages/` separately.

## Endpoints
GET /api/v1/health
POST /api/v1/auth/login
POST /api/v1/alight-motion/send
POST /api/v1/alight-motion/verif
POST /api/v1/photoenhancer2
POST /api/v1/nftoken-gen
GET /ws

## Real upstream configuration
Set these as Cloudflare Worker secrets:
ALIGHT_MOTION_SEND_URL
ALIGHT_MOTION_VERIFY_URL
PHOTOENHANCER2_URL
NFTOKEN_GEN_URL
ALIGHT_MOTION_API_KEY
PHOTOENHANCER2_API_KEY
NFTOKEN_GEN_API_KEY

If a URL is missing, the endpoint returns 503 rather than a fake response. The Alight Motion routes are transparent authorized-provider adapters; they do not bypass OTP, licensing, subscriptions, or account security.

## Termux → GitHub
pkg update -y
pkg install git nodejs-lts -y
cd premium-cloudflare-platform
git init
git branch -M main
git add .
git commit -m "Initial premium API platform"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main

## Deploy Worker
cd worker
npm install
npx wrangler login
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ALIGHT_MOTION_SEND_URL
npx wrangler secret put ALIGHT_MOTION_VERIFY_URL
npx wrangler secret put PHOTOENHANCER2_URL
npx wrangler secret put NFTOKEN_GEN_URL
npx wrangler secret put ALIGHT_MOTION_API_KEY
npx wrangler secret put PHOTOENHANCER2_API_KEY
npx wrangler secret put NFTOKEN_GEN_API_KEY
npx wrangler deploy

## GitHub automatic deploy
Cloudflare Dashboard → Workers & Pages → Create application → Get started next to Import a repository → connect GitHub → select repository → set root directory to `worker`. Workers Builds deploys on pushes to the selected production branch.

## Separate Pages deployment
Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import existing Git repository. Build command: `exit 0`. Build output directory: `pages`.

## Python
Cloudflare also supports Python Workers (open beta). This repo uses JavaScript for the main gateway because it directly supports the static assets and Durable Object WebSocket. A Python adapter can be deployed separately when a provider actually requires Python-specific libraries.
