import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  // 1. SECURITY HEADERS CHECK
  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Direct Access Forbidden" });
  }

  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Identification failed" });

  const deviceLockKey = `device_lock:${deviceId}`;

  try {
    // 2. CHECK 24-HOUR LOCK
    const existingKeyName = await redis.get(deviceLockKey);
    
    if (existingKeyName) {
        // If the lock exists in Redis, they are blocked regardless of activation status
        return res.status(403).json({ 
            error: "LOCKED", 
            message: "One key per device every 24 hours.",
            pendingKey: existingKeyName 
        });
    }

    // 3. GENERATE TEMPORARY SESSION
    const tempToken = "TMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Store deviceId in temp token for verify-claim to use
    await redis.set(`temp_${tempToken}`, { deviceId }, { ex: 600 }); 

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://${allowedHost}/keygen.html?token=${tempToken}`;
    
    // Official ShrinkMe API
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    if (shortlink && shortlink.startsWith('http')) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({ success: true, shortlink: shortlink.trim() });
    } else {
        throw new Error("Shortener Error");
    }

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
