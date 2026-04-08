import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;

  // 1. SECURE REFERER CHECK
  // Only allow requests that originate from your specific frontend
  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";

  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Direct Access Forbidden" });
  }

  // 2. SEC-FETCH CHECK (Modern Browser Security)
  // Ensures the request is a 'cross-site' fetch initiated by your JS
  if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') {
    return res.status(403).json({ error: "Unauthorized Request Origin" });
  }

  // 3. Anti-Proxy / Anti-Canary Check
  const via = req.headers['via'];
  const proxy = req.headers['proxy-connection'] || req.headers['x-forwarded-proto'] === 'http';
  if (via || proxy) {
    return res.status(403).json({ error: "Proxy Detected" });
  }

  if (!key) return res.status(400).json({ error: "Missing key" });

  try {
    const data = await redis.get(key);

    if (!data || data.activated === true) {
      return res.status(403).json({ error: "Bypass Detected" });
    }

    // OBFUSCATION: Reverse + Base64
    const masked = Buffer.from(key).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
