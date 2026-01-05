let COOKIES = [];
let COOKIES_LAST_FETCH = 0;
const COOKIE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

/* =======================
   COOKIE HANDLING
======================= */

async function fetchCookiesFromURL() {
  try {
    const now = Date.now();
    if (now - COOKIES_LAST_FETCH < COOKIE_CACHE_TTL && COOKIES.length) return;

    const response = await fetch("https://tera.backend.live/cookies-list", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const cookieList = await response.json();
    COOKIES = cookieList
      .filter(c => typeof c === "string")
      .map(c => c.trim())
      .filter(c => c.toLowerCase().startsWith("ndus="));

    COOKIES_LAST_FETCH = now;
  } catch (err) {
    console.error("Failed to fetch cookies:", err.message);
  }
}

async function getWorkingCookie() {
  if (!COOKIES.length) await fetchCookiesFromURL();
  return COOKIES[Math.floor(Math.random() * COOKIES.length)] || null;
}

/* =======================
   HEADERS
======================= */

const HEADERS_BASE = {
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "DNT": "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

const DL_HEADERS_BASE = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Referer": "https://www.terabox.com/",
  "Connection": "keep-alive",
};

/* =======================
   HELPERS
======================= */

function getSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} bytes`;
}

function safeFileName(name = "download") {
  return name.replace(/[^\w.\-() ]+/g, "_");
}

function findBetween(str, start, end) {
  const s = str.indexOf(start);
  if (s === -1) return "";
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return "";
  return str.slice(s + start.length, e);
}

/* =======================
   FILE INFO
======================= */

async function getFileInfo(link, request) {
  if (!link) return { error: "Link cannot be empty." };

  let lastError = "Unknown error";

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const cookie = await getWorkingCookie();
      if (!cookie) throw new Error("No cookies available");

      const headers = { ...HEADERS_BASE, Cookie: cookie };

      let response = await fetch(link, { headers, redirect: "follow" });
      if (!response.ok) {
        lastError = `Initial fetch failed (${response.status})`;
        continue;
      }

      const finalUrl = response.url;
      const url = new URL(finalUrl);
      const surl = url.searchParams.get("surl");
      if (!surl) {
        lastError = "Invalid Terabox link";
        continue;
      }

      const text = await response.text();

      const jsToken = findBetween(text, 'fn%28%22', '%22%29');
      const logid = findBetween(text, 'dp-logid=', '&');
      const bdstoken = findBetween(text, 'bdstoken":"', '"');

      if (!jsToken || !logid || !bdstoken) {
        lastError = "Token extraction failed";
        continue;
      }

      const params = new URLSearchParams({
        app_id: "250528",
        web: "1",
        channel: "dubox",
        clienttype: "0",
        jsToken,
        "dp-logid": logid,
        page: "1",
        num: "20",
        by: "name",
        order: "asc",
        site_referer: finalUrl,
        shorturl: surl,
        root: "1,",
      });

      response = await fetch(
        `https://www.terabox.com/share/list?${params.toString()}`,
        { headers }
      );

      const data = await response.json();
      if (!data?.list?.length || data.errno) {
        lastError = data?.errmsg || "File list empty";
        continue;
      }

      const f = data.list[0];
      const fileName = safeFileName(f.server_filename);

      return {
        file_name: fileName,
        download_link: f.dlink,
        thumbnail: f.thumbs?.url3 || "",
        file_size: getSize(f.size),
        size_bytes: Number(f.size || 0),
        proxy_url: `https://${new URL(request.url).host}/proxy?url=${encodeURIComponent(
          f.dlink
        )}&file_name=${encodeURIComponent(fileName)}`,
      };
    } catch (e) {
      lastError = e.message;
    }
  }

  return { error: lastError || "All cookies failed" };
}

/* =======================
   PROXY
======================= */

async function proxyDownload(url, fileName, request) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const cookie = await getWorkingCookie();
      if (!cookie) continue;

      const headers = new Headers({
        ...DL_HEADERS_BASE,
        Cookie: cookie,
      });

      const range = request.headers.get("Range");
      if (range) headers.set("Range", range);

      const res = await fetch(url, { headers, redirect: "follow" });

      if (res.ok || res.status === 206) {
        const h = new Headers({
          "Content-Type":
            res.headers.get("Content-Type") || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            safeFileName(fileName)
          )}"`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        });

        ["Content-Range", "Content-Length"].forEach(k => {
          if (res.headers.has(k)) h.set(k, res.headers.get(k));
        });

        return new Response(res.body, { status: res.status, headers: h });
      }
    } catch {}
  }

  return new Response(JSON.stringify({ error: "Proxy failed" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

/* =======================
   CORS + FETCH
======================= */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Range",
  "Access-Control-Expose-Headers":
    "Content-Length,Content-Range,Content-Disposition",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method === "POST" && url.pathname === "/") {
      try {
        const { link } = await request.json();
        const data = await getFileInfo(link, request);
        return new Response(JSON.stringify(data), {
          status: data.error ? 400 : 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }
    }

    if (request.method === "GET" && url.pathname === "/proxy") {
      const durl = url.searchParams.get("url");
      const name = url.searchParams.get("file_name") || "download";
      if (!durl) {
        return new Response(JSON.stringify({ error: "No URL provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      const res = await proxyDownload(durl, name, request);
      Object.entries(CORS_HEADERS).forEach(([k, v]) =>
        res.headers.set(k, v)
      );
      return res;
    }

    return new Response(JSON.stringify({ error: "Not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  },
};
