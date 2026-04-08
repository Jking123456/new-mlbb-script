import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { deviceId } = req.body; // Unique Fingerprint ID from Frontend
  if (!deviceId) return res.status(400).json({ error: "Device identification failed" });

  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Double-lock: IP and Device ID
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const deviceLockKey = `device_lock:${deviceId}`;

  try {
    // 1. Check for an existing unactivated key on this DEVICE
    const pendingKey = await redis.get(deviceLockKey);
    if (pendingKey) {
        const keyData = await redis.get(pendingKey);
        if (keyData && !keyData.activated) {
            return res.status(403).json({ error: "LOCKED", pendingKey });
        }
    }

    // 2. Create Temp Token
    const tempToken = "TMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Store temp token with deviceId info so only that device can claim it
    await redis.set(`temp_${tempToken}`, { deviceId, ip }, { ex: 600 }); 

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://${allowedHost}/keygen.html?token=${tempToken}`;
    
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ success: true, shortlink: shortlink.trim() });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
