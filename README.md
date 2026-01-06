# 📁 Terabox Video Downloader API — Cloudflare Worker

Telegram Channel: **@UNCODNPT**  

A lightweight Cloudflare Worker that extracts direct download links from Terabox (formerly Dubox) shared URLs and serves them via a proxy endpoint for seamless streaming or downloading.

**Developed By:** Jayes

---

## 🚀 Features

- Extract file info: name, size, thumbnail, direct download link  
- Proxy downloads via your own Worker domain  
- Supports **Range Requests** (video seeking supported)  
- CORS enabled (usable with frontend / Telegram bots)  
- Cookie rotation support for stability and anti-limit

---

## 🛠️ Setup / Installation

### 1️⃣ Get Terabox Cookie

1. Log in to [Terabox](https://www.terabox.com)  
2. Open DevTools (`F12`) → Application → Cookies → `https://www.terabox.com`  
3. Copy the full cookie string (must contain `ndus=`)

---

### 2️⃣ Deploy on Cloudflare Workers (Wrangler)

```
npm install -g wrangler
git clone https://github.com/uncodnpt/Terabox-loader-API-Jayes
cd Terabox-loader-API-Jayes
npm install
wrangler deploy
```
Optional: If using a single cookie instead of rotation:

wrangler secret put TERABOX_COOKIE


---

📡 API Usage

🔹 POST / — Get File Info

Request:

{
  "link": "https://terabox.com/s/xxxx"
}

Response:

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

✔ Supports streaming in <video> tags
✔ Works with download managers


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

❓ Troubleshooting / Common Errors

Invalid link: Make sure the Terabox link is public

Token extraction failed: Cookie may be expired — get a new cookie

403 Forbidden: Try rotating the cookie

Video not seeking: Ensure the player supports range requests



---

📜 License

MIT License
© 2025 Jayes — Telegram: @UNCODNPT


---

📬 Contact / Support

For updates, support, and announcements, join our Telegram channel: @UNCODNPT

Enjoy using the API!
