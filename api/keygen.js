import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid, size } = req.query;

    if (!key || !hwid || !size) return res.status(400).send("ERR_MISSING_PARAMS");

    // 1. ANTI-TAMPER: FILE SIZE CHECK
    const EXPECTED_SIZE = "66292"; 
    if (String(size) !== EXPECTED_SIZE) {
      return res.status(403).send("ERR_SIZE_MISMATCH_" + size);
    }

    // 2. RETRIEVE LICENSE FROM REDIS
    let keyData = await redis.get(key);
    if (!keyData) return res.status(403).send("ERR_KEY_NOT_FOUND");

    // Ensure data is an object
    if (typeof keyData === 'string') {
      try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).send("ERR_JSON_PARSE"); }
    }

    // 3. HWID LOCKING SYSTEM
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      const limit = parseInt(keyData.limit) || 1;

      if (currentDevices >= limit) {
        return res.status(403).send("ERR_HWID_LIMIT");
      }
      // Add the new device to the allowed list for this key
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // 4. THE FIX: ACTIVATE TIMER ON FIRST USE
    // This part triggers the countdown in your Dashboard
    if (keyData.activated === false) {
      const duration = parseInt(keyData.duration) || 86400; // default to 24h
      
      keyData.activated = true;
      keyData.activatedAt = Date.now();
      // We update 'remaining' to 'Active' so the dashboard knows it's running
      keyData.remaining = "Calculating..."; 

      // Save the 'Activated' status
      await redis.set(key, JSON.stringify(keyData));
      
      // SET ACTUAL DATABASE EXPIRATION (This makes it count down)
      await redis.expire(key, duration);
      await redis.expire(`hwids:${key}`, duration);
    }

    // 5. FETCH SCRIPT FROM GITHUB
    const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) return res.status(403).send("ERR_GITHUB_FETCH_FAILED");

    const scriptContent = await githubResponse.text();
    
    // Return the Lua script to Game Guardian
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(error);
    return res.status(500).send("ERR_SERVER_CRASH");
  }
}
