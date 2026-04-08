import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  // Security: Referer Check
  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Unauthorized Request Source" });
  }

  // Get User IP for Locking
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const ipLockKey = `ip_lock:${ip}`;

  try {
    // 1. Check for an existing unactivated key linked to this IP
    const pendingKeyName = await redis.get(ipLockKey);
    if (pendingKeyName) {
        const keyData = await redis.get(pendingKeyName);
        if (keyData && keyData.activated === false) {
            return res.status(403).json({ 
                error: "LOCKED", 
                pendingKey: pendingKeyName 
            });
        }
    }

    // 2. No lock found? Generate new key
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400; // 24 Hours

    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: true,
        duration: durationSeconds,
        activated: false 
    });

    // Link IP to this key
    await redis.set(ipLockKey, freeKey);

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://${allowedHost}/keygen.html?key=${freeKey}`;
    
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    if (shortlink && shortlink.startsWith('http')) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({ success: true, shortlink: shortlink.trim() });
    } else {
        throw new Error("API Fail");
    }

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}
