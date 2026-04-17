import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid, size } = req.query;

    // 1. BASIC VALIDATION
    if (!key || !hwid || !size) {
        return res.status(400).send("MISSING_PARAMS");
    }

    // 2. LOADER INTEGRITY CHECK
    // Replace '12345' with the exact byte size of your obfuscated .lua file
    const EXPECTED_SIZE = "11675"; 
    if (size !== EXPECTED_SIZE) {
        console.warn(`Tamper Detected: Received size ${size} instead of ${EXPECTED_SIZE}`);
        return res.status(403).send("LOADER_TAMPERED");
    }

    // 3. KEY DATA RETRIEVAL
    const keyData = await redis.get(key);
    if (!keyData) {
        return res.status(403).send("INVALID_OR_EXPIRED");
    }

    // 4. ACTIVATION & EXPIRY LOGIC
    // If key hasn't been used yet, set the countdown based on its duration
    if (keyData.activated === false) {
      keyData.activated = true;
      const duration = keyData.duration || 86400; // Default: 24h
      
      // Update key in Redis with an actual Expiration (TTL)
      await redis.set(key, keyData, { ex: duration });
      
      // Sync HWID list expiration with the key expiration
      await redis.expire(`hwids:${key}`, duration);
    }

    // 5. HWID / DEVICE LIMIT MANAGEMENT
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      const deviceLimit = keyData.limit || 1;

      if (currentDevices >= deviceLimit) {
        return res.status(403).send("DEVICE_LIMIT_REACHED");
      }
      // Register this new device to the key
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // 6. DYNAMIC SCRIPT SELECTION
    let scriptFileName = "main2.lua"; // Default free script
    let statusMessage = "Free Version Loaded";

    if (keyData.isPremium === true) {
      scriptFileName = "kupalka.lua"; // Premium script
      statusMessage = "Premium Version Loaded";
    }

    // 7. FETCH SCRIPT FROM PRIVATE GITHUB
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptFileName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) {
      return res.status(500).send("FAILED_TO_FETCH_PAYLOAD");
    }

    const scriptContent = await githubResponse.text();

    // 8. FINAL RESPONSE
    res.setHeader('X-Script-Status', statusMessage);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error("Critical Error:", error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
    }
