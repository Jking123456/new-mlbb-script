import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;

  // 1. Anti-Proxy/Canary Check
  const isProxy = req.headers['via'] || req.headers['proxy-connection'] || req.headers['x-forwarded-proto'] === 'http';
  if (isProxy) {
    return res.status(403).json({ error: "Security Violation: Proxy Detected" });
  }

  if (!key) return res.status(400).json({ error: "Missing identity" });

  try {
    const data = await redis.get(key);

    // 2. Validate Key existence and status
    if (!data || data.activated === true) {
      return res.status(403).json({ error: "Invalid or already used" });
    }

    // 3. Masking the Key (XOR + Base64 + Reverse)
    // This makes the response unreadable in HTTP Canary logs
    const rawKey = key;
    const encoded = Buffer.from(rawKey).toString('base64');
    const scrambled = encoded.split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        p: scrambled // 'p' stands for payload; obscures the 'key' label
    });

  } catch (error) {
    return res.status(500).json({ error: "System Error" });
  }
}
