import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;

  // 🛡️ ANTI-CANARY / PROXY CHECK
  const isProxy = req.headers['via'] || req.headers['proxy-connection'] || req.headers['x-forwarded-proto'] === 'http';
  if (isProxy) {
    return res.status(403).json({ error: "Proxy/Canary Detected" });
  }

  if (!key) return res.status(400).json({ error: "Access Denied" });

  try {
    const data = await redis.get(key);

    // Bypass check: Key must exist and not be activated yet
    if (!data || data.activated === true) {
      return res.status(403).json({ error: "Invalid or Expired Link" });
    }

    // 🎭 MASKING THE KEY
    // We reverse the Base64 string so Canary users see scrambled nonsense
    const mask = Buffer.from(key).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: mask 
    });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
