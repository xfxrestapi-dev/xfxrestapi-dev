# XTZY REST API — Cloudflare Worker + Static UI

## Struktur
```text
xtzy-rest-api/
├── public/
│   └── index.html
├── worker.js
├── wrangler.json
├── package.json
└── README.md
```

## Endpoint
Base URL setelah deploy:
- `POST /v1/alight-motion/send`
- `GET /v1/alight-motion/verify?magicLink=...`

### Send
```bash
curl -X POST "https://api.xtzy.dev/v1/alight-motion/send" \
  -H "Content-Type: application/json" \
  -H "x-apikey: YOUR_API_KEY" \
  -d '{"email":"user@gmail.com"}'
```

### Verify
```bash
curl -G "https://api.xtzy.dev/v1/alight-motion/verify" \
  -H "x-apikey: YOUR_API_KEY" \
  --data-urlencode "magicLink=https://example.com/verify?token=..."
```

## Konfigurasi upstream
Worker ini adalah gateway/proxy. Isi `ALIGHT_MOTION_API_BASE` dengan API upstream yang benar-benar menyediakan endpoint Alight Motion tersebut. Jangan menaruh secret upstream di HTML.

Jika upstream membutuhkan key, buat secret:
```bash
npx wrangler secret put UPSTREAM_API_KEY
```

Lalu deploy:
```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Custom domain
Tambahkan `api.xtzy.dev` sebagai Custom Domain pada Worker di Cloudflare Dashboard. Untuk frontend, Worker Static Assets sudah menyajikan `public/index.html` dari Worker yang sama.

Cloudflare saat ini merekomendasikan Workers Static Assets untuk aplikasi baru yang menggabungkan frontend statis dan API.
