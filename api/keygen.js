import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const data = req.method === 'POST' ? req.body : req.query;
    const { key, size } = data;
    const hwid = data.hwid || data.deviceId;

    if (!key || !hwid || !size) return res.status(400).json({ error: "MISSING_PARAMS" });

    // Match your LUA script size
    if (String(size) !== "66292") return res.status(403).json({ error: "SIZE_MISMATCH" });

    // Look for PRZ-FREE in your Redis
    let keyData = await redis.get(key);
    
    if (!keyData) {
        console.log(`Key not found: ${key}`);
        return res.status(403).json({ error: "INVALID_KEY" });
    }

    // Auto-parse if Redis returns a string instead of an object
    if (typeof keyData === 'string') {
        try { keyData = JSON.parse(keyData); } catch (e) { /* ignore */ }
    }

    // HWID Check
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      const limit = keyData.limit || 100;
      if (currentDevices >= limit) return res.status(403).json({ error: "HWID_LIMIT" });
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // Since this is the initial generator call, we return a success payload
    // or a shortlink if you have that logic integrated.
    return res.status(200).json({ 
        success: true, 
        shortlink: "https://your-shortlink-service.com/verify", // Replace with your link logic
        payload: "AUTHORIZED" 
    });

  } catch (error) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}
