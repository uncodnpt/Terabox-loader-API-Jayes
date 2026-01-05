let COOKIES = [];
let COOKIES_LAST_FETCH = 0;
const COOKIE_CACHE_TTL = 5 * 60 * 1000;
const MAX_RETRIES = 3;

/* ================= COOKIE ================= */

async function fetchCookiesFromURL() {
  const now = Date.now();
  if (COOKIES.length && now - COOKIES_LAST_FETCH < COOKIE_CACHE_TTL) return;

  try {
    const res = await fetch("https://tera.backend.live/cookies-list", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();
    COOKIES = list
      .filter(c => typeof c === "string")
      .map(c => c.trim())
      .filter(c => c.toLowerCase().startsWith("ndus="));
    COOKIES_LAST_FETCH = now;
  } catch {}
}

async function getCookie() {
  if (!COOKIES.length) await fetchCookiesFromURL();
  return COOKIES[Math.floor(Math.random() * COOKIES.length)] || null;
}

/* ================= HEADERS ================= */

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

/* ================= HELPERS ================= */

function getSize(b) {
  const n = Number(b) || 0;
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} bytes`;
}

function safeName(n = "download") {
  return n.replace(/[^\w.\-() ]+/g, "_");
}

function findBetween(str, a, b) {
  const s = str.indexOf(a);
  if (s === -1) return "";
  const e = str.indexOf(b, s + a.length);
  if (e === -1) return "";
  return str.slice(s + a.length, e);
}

/* ================= FILE INFO ================= */

async function getFileInfo(link, request) {
  if (!link) return { error: "Link cannot be empty" };
  let lastErr = "Failed";

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const cookie = await getCookie();
      if (!cookie) continue;

      const headers = { ...HEADERS_BASE, Cookie: cookie };
      let res = await fetch(link, { headers, redirect: "follow" });
      if (!res.ok) {
        lastErr = `Init ${res.status}`;
        continue;
      }

      const finalUrl = res.url;
      const u = new URL(finalUrl);
      const surl = u.searchParams.get("surl");
      if (!surl) {
        lastErr = "Invalid link";
        continue;
      }

      const html = await res.text();
      const jsToken = findBetween(html, 'fn%28%22', '%22%29');
      const logid = findBetween(html, 'dp-logid=', '&');
      const bdstoken = findBetween(html, 'bdstoken":"', '"');

      if (!jsToken || !logid || !bdstoken) {
        lastErr = "Token error";
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

      res = await fetch(
        `https://www.terabox.com/share/list?${params.toString()}`,
        { headers }
      );
      const data = await res.json();
      if (!data?.list?.length || data.errno) {
        lastErr = data?.errmsg || "List error";
        continue;
      }

      const f = data.list[0];
      const name = safeName(f.server_filename);

      return {
        file_name: name,
        download_link: f.dlink,
        thumbnail: f.thumbs?.url3 || "",
        file_size: getSize(f.size),
        size_bytes: Number(f.size || 0),
        proxy_url: `https://${new URL(request.url).host}/proxy?url=${encodeURIComponent(
          f.dlink
        )}&file_name=${encodeURIComponent(name)}`,
      };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { error: lastErr };
}

/* ================= PROXY ================= */

async function proxyDownload(url, name, request) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const cookie = await getCookie();
      if (!cookie) continue;

      const headers = new Headers({
        ...DL_HEADERS_BASE,
        Cookie: cookie,
      });

      const range = request.headers.get("Range");
      if (range) headers.set("Range", range);

      const res = await fetch(url, { headers, redirect: "follow" });
      if (!res.ok && res.status !== 206) continue;

      const h = new Headers({
        "Content-Type":
          res.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          safeName(name)
        )}"`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      });

      ["Content-Range", "Content-Length"].forEach(k => {
        if (res.headers.has(k)) h.set(k, res.headers.get(k));
      });

      return new Response(res.body, { status: res.status, headers: h });
    } catch {}
  }

  return new Response(JSON.stringify({ error: "Proxy failed" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}

/* ================= FETCH ================= */

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
      const { link } = await request.json().catch(() => ({}));
      const data = await getFileInfo(link, request);
      return new Response(JSON.stringify(data), {
        status: data.error ? 400 : 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    if (request.method === "GET" && url.pathname === "/proxy") {
      const durl = url.searchParams.get("url");
      const name = url.searchParams.get("file_name") || "download";
      if (!durl) {
        return new Response(JSON.stringify({ error: "No URL" }), {
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
