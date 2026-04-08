import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;

  // Anti-Proxy / Anti-Canary Check
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
    // If key is 'PRZ-FREE-ABC', Canary sees 'Q0JBLUVFUkYtWlJQ'
    const masked = Buffer.from(key).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
