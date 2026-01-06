# 📁 Terabox Video Downloader API — Cloudflare Worker

Telegram Channel: **@UNCODNPT**

A lightweight Cloudflare Worker that extracts direct download links from Terabox (formerly Dubox) shared URLs and serves them via a proxy endpoint for seamless streaming or downloading.

**Developed By: Jayes**

---

## 🚀 Features

- Extract file info (name, size, thumbnail, direct download link)
- Proxy downloads via your own Worker domain
- Supports **Range Requests** (video seeking supported)
- CORS enabled (usable with frontend / Telegram bots)
- Cookie rotation support (anti-limit)

---

## 🛠️ Setup Guide

### 1️⃣ Get Terabox Cookie

1. Login to https://www.terabox.com  
2. Open DevTools (`F12`)
3. Application → Cookies → `https://www.terabox.com`
4. Copy full cookie string (must contain `ndus=`)

---

### 2️⃣ Deploy on Cloudflare Workers (Wrangler)


npm install -g wrangler
git clone https://github.com/YOUR_USERNAME/Terabox-loader-API-Jayes
cd Terabox-loader-API-Jayes
npm install
wrangler deploy

If using single cookie, set secret:

wrangler secret put TERABOX_COOKIE


---

📡 API Usage

🔹 POST / — Get File Info

{
  "link": "https://terabox.com/s/xxxx"
}

Response

{
  "file_name": "video.mp4",
  "file_size": "1.20 GB",
  "size_bytes": 1288490188,
  "thumbnail": "https://...",
  "download_link": "https://...",
  "proxy_url": "https://your-worker.workers.dev/proxy?url=..."
}


---

🔹 GET /proxy — Stream / Download

/proxy?url=ENCODED_DLINK&file_name=video.mp4

✔ Supports video streaming
✔ Download managers supported


---

🧪 Example Frontend Usage

<video controls src="https://your-worker.workers.dev/proxy?url=ENCODED_DLINK&file_name=video.mp4"></video>

fetch("https://your-worker.workers.dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ link: "https://terabox.com/s/xxxx" })
})
.then(r => r.json())
.then(d => console.log(d.proxy_url));


---

🛡️ Security Notes

Never expose raw Terabox cookies

Treat cookie like a password

Always use /proxy endpoint

Cookie expiry = regenerate cookie



---

❓ Common Errors

Error	Fix

Invalid link	Link must be public
Token error	Cookie expired
403 error	Rotate cookie
Video not seeking	Player must support range



---

📜 License

MIT License
© 2025 Jayes — Telegram: @UNCODNPT
