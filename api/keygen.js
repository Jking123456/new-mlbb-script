import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: "Device identification failed" });

  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Unauthorized Source" });
  }

  const deviceLockKey = `device_lock:${deviceId}`;

  try {
    // 1. Check if this DEVICE ID is already tied to a key
    const existingKeyName = await redis.get(deviceLockKey);
    
    if (existingKeyName) {
        const keyData = await redis.get(existingKeyName);
        // If the key exists and hasn't been used in-game yet, LOCK them
        if (keyData && keyData.activated === false) {
            return res.status(403).json({ 
                error: "LOCKED", 
                pendingKey: existingKeyName 
            });
        }
    }

    // 2. Create Temporary Token (valid for 10 mins)
    const tempToken = "TMP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Store deviceId in the temp token so verify-claim knows who to lock
    await redis.set(`temp_${tempToken}`, { deviceId }, { ex: 600 }); 

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://${allowedHost}/keygen.html?token=${tempToken}`;
    
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    if (shortlink && shortlink.startsWith('http')) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({ success: true, shortlink: shortlink.trim() });
    } else {
        throw new Error("API Failure");
    }

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
