import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid } = req.query;
    if (!key || !hwid) return res.status(400).send("MISSING_PARAMS");

    const keyData = await redis.get(key);
    if (!keyData) return res.status(403).send("INVALID_OR_EXPIRED");

    // --- ACTIVATION LOGIC (Start Timer on First Use) ---
    // If the key has not been activated yet, start the countdown now
    if (keyData.activated === false) {
      keyData.activated = true;
      const duration = keyData.duration || 86400; // Default to 24h if missing
      
      // Update Redis: Set the key with the expiry (TTL) for the first time
      await redis.set(key, keyData, { ex: duration });
      
      // Also ensure the HWID list expires at the same time as the key
      await redis.expire(`hwids:${key}`, duration);
    }

    // --- HWID MANAGEMENT ---
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      if (currentDevices >= (keyData.limit || 1)) {
        return res.status(403).send("DEVICE_LIMIT_REACHED");
      }
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // --- DYNAMIC SCRIPT SELECTION ---
    let scriptFileName = "main2.lua"; 
    let statusMessage = "Free Version Loaded";

    if (keyData.isPremium === true) {
      scriptFileName = "kupalka.lua"; 
      statusMessage = "Premium Version Loaded";
    }

    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptFileName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) {
      return res.status(500).send("FAILED_TO_FETCH_SCRIPT");
    }

    const scriptContent = await githubResponse.text();

    res.setHeader('X-Script-Status', statusMessage);
    res.setHeader('Content-Type', 'text/plain');
    
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
}
