# 📁 Terabox Video Downloader API by Telegram: @UNCODNPT — Cloudflare Worker

A lightweight Cloudflare Worker that extracts direct download links from Terabox (formerly Dubox) shared URLs and serves them via a proxy endpoint for seamless playback or download.

**Made By Jayes | Telegram: [@UNCODNPT](https://t.me/UNCODNPT)** 🚀

---

## 🚀 Features

- Extract file info (name, size, thumbnail, direct link) from Terabox share links.
- Proxy the actual download through your own domain (bypasses CORS and cookie restrictions).
- Supports **range requests** → enables video seeking and partial downloads.
- Fully CORS-enabled for frontend integration.
- Built with security & performance in mind.

---

## 🛠️ Setup Guide

### 1. **Get Your Terabox Cookie**

1. Log in to https://www.terabox.com in your browser.
2. Open DevTools (`F12`) → **Application** → **Cookies** → `https://www.terabox.com`.
3. Copy the full **Cookie** string (contains `NDUS=` etc.).

---

### 2. **Deploy to Cloudflare Workers**

#### Option A: Using Wrangler (Recommended)

```bash
npm install -g wrangler
git clone https://github.com/YOUR_USERNAME/Terabox-loader-API-Jayes
cd Terabox-loader-API-Jayes
npm install
wrangler secret put TERABOX_COOKIE
wrangler deploy


---

Option B: Cloudflare Dashboard

1. Cloudflare Dashboard → Workers


2. Create New Worker


3. Paste src/worker.js


4. Settings → Environment Variables → Secrets


5. Add:

Name: TERABOX_COOKIE

Value: Your Terabox cookie





---

📡 API Endpoints

🔗 POST / — Get File Info

{
  "link": "https://terabox.com/s/your-share-link"
}

{
  "file_name": "example.mp4",
  "file_size": "1.25 GB",
  "size_bytes": 1342177280,
  "thumbnail": "https://.../thumb.jpg",
  "download_link": "https://.../file.mp4?auth=...",
  "proxy_url": "https://your-worker.workers.dev/proxy?url=...&file_name=example.mp4"
}


---

🌐 GET /proxy — Stream / Download

GET /proxy?url=https://.../file.mp4&file_name=my_video.mp4

Supports range requests.


---

🛡️ Security Notes

Terabox cookie = full account access.

Treat it like a password.

Never expose raw download links.

Always use /proxy.



---

🧪 Example Usage

<video controls src="https://your-worker.workers.dev/proxy?url=ENCODED_DLINK&file_name=video.mp4"></video>

const res = await fetch('https://your-worker.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ link: 'https://terabox.com/s/abc123' })
});
const data = await res.json();
console.log(data.proxy_url);


---

❓ Troubleshooting

Issue	Fix

Invalid link	Ensure link is public
Token error	Update cookie
Video not seeking	Player must support range
403 error	Update User-Agent



---

✨ Developed by Jayes
📢 Telegram Channel: https://t.me/UNCODNPT
