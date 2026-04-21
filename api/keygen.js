import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid, size } = req.query;

    if (!key || !hwid || !size) return res.status(400).send("ERR_MISSING_PARAMS");

    // 1. SIZE CHECK
    const EXPECTED_SIZE = "66292"; 
    if (String(size) !== EXPECTED_SIZE) {
      return res.status(403).send("ERR_SIZE_MISMATCH_" + size);
    }

    // 2. REDIS CHECK
    let keyData;
    try {
        keyData = await redis.get(key);
    } catch (e) {
        return res.status(500).send("ERR_REDIS_CONNECTION");
    }

    if (!keyData) return res.status(403).send("ERR_KEY_NOT_FOUND");

    // Auto-parse if string
    if (typeof keyData === 'string') {
      try { 
        keyData = JSON.parse(keyData); 
      } catch (e) { 
        return res.status(500).send("ERR_JSON_PARSE"); 
      }
    }

    // 3. HWID LOCK & ACTIVATION LOGIC
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      const deviceLimit = parseInt(keyData.limit) || 1;

      if (currentDevices >= deviceLimit) {
        return res.status(403).send("ERR_HWID_LIMIT");
      }
      
      // Register the new HWID
      await redis.sadd(`hwids:${key}`, hwid);

      // --- NEW: START EXPIRATION CLOCK ON FIRST USE ---
      // If the key hasn't been marked as activated yet
      if (!keyData.activated) {
        keyData.activated = true;
        keyData.activatedAt = Date.now();
        
        // Default duration to 1 day (86400s) if not specified in your generator
        const durationSeconds = parseInt(keyData.duration) || 86400;

        // Save the 'activated' status back to Redis
        await redis.set(key, JSON.stringify(keyData));

        // Set the actual Redis TTL (Time To Live)
        // This makes the key automatically delete itself after the duration
        await redis.expire(key, durationSeconds);
        await redis.expire(`hwids:${key}`, durationSeconds);
      }
    }

    // 4. GITHUB FETCH
    const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) {
      return res.status(403).send("ERR_GITHUB_AUTH_" + githubResponse.status);
    }

    const scriptContent = await githubResponse.text();
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(error);
    return res.status(500).send("ERR_SERVER_CRASH");
  }
}
