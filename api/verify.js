import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid, size } = req.query;

    // 1. Check for missing parameters
    if (!key || !hwid || !size) {
      return res.status(400).send("MISSING_PARAMS");
    }

    // 2. LOADER INTEGRITY CHECK
    const EXPECTED_SIZE = "11481"; 
    if (String(size) !== EXPECTED_SIZE) {
      console.log(`Size Mismatch: Got ${size}, Expected ${EXPECTED_SIZE}`);
      return res.status(403).send("LOADER_TAMPERED");
    }

    // 3. KEY DATA RETRIEVAL & PARSING
    let keyData = await redis.get(key);
    if (!keyData) {
      return res.status(403).send("INVALID_OR_EXPIRED");
    }

    // FIX: Convert String from Redis into a usable JSON Object
    if (typeof keyData === 'string') {
      try {
        keyData = JSON.parse(keyData);
      } catch (e) {
        console.error("JSON Parsing Error:", e);
        return res.status(500).send("DB_FORMAT_ERROR");
      }
    }

    // 4. ACTIVATION LOGIC
    if (keyData.activated === false || keyData.activated === undefined) {
      keyData.activated = true;
      const duration = parseInt(keyData.duration) || 86400;
      
      // Update the key in Redis to be activated with its TTL
      await redis.set(key, keyData, { ex: duration });
      // Sync HWID list expiration
      await redis.expire(`hwids:${key}`, duration);
    }

    // 5. HWID MANAGEMENT
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      const limit = parseInt(keyData.limit) || 1;

      if (currentDevices >= limit) {
        return res.status(403).send("DEVICE_LIMIT_REACHED");
      }
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // 6. SCRIPT SELECTION
    let scriptFileName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
    let statusMessage = keyData.isPremium ? "Premium Version" : "Free Version";

    // 7. FETCH FROM GITHUB
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptFileName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) {
      console.error(`Github Error: ${githubResponse.status}`);
      // If GitHub fails, we send a specific error to debug
      return res.status(500).send("GITHUB_FETCH_FAILED");
    }

    const scriptContent = await githubResponse.text();

    // 8. FINAL RESPONSE
    res.setHeader('X-Script-Status', statusMessage);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
}
  
