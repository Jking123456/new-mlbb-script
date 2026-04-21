import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  
  // --- 1. WEBSITE GENERATOR LOGIC (POST) ---
  // This handles the request from keygen.html
  if (req.method === 'POST') {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ error: "Missing Device Fingerprint" });

      // Check if this device already has an active key
      const existingKey = await redis.get(`device_lock:${deviceId}`);
      if (existingKey) {
        return res.status(403).json({ 
          error: "Existing key found for this device!",
          pendingKey: existingKey 
        });
      }

      // Create a temporary session for the shortlink
      const tempToken = Math.random().toString(36).substring(2, 12);
      // Store temporary session for 10 minutes (600 seconds)
      await redis.set(`temp_${tempToken}`, { deviceId }, { ex: 600 });

      // Destination URL after shortlink is finished
      const destination = `https://new-mlbb-script.vercel.app/keygen.html?token=${tempToken}`;
      
      // Replace YOUR_API_KEY with your actual Carapedi/Shortlink API key
      const shortlink = `https://carapedi.id/api?api=YOUR_API_KEY&url=${encodeURIComponent(destination)}`;

      return res.status(200).json({ shortlink });

    } catch (error) {
      console.error("POST Error:", error);
      return res.status(500).json({ error: "Generator System Error" });
    }
  }

  // --- 2. SCRIPT ACCESS LOGIC (GET) ---
  // This handles the request from Game Guardian / Client
  if (req.method === 'GET') {
    try {
      const { key, hwid, size } = req.query;

      if (!key || !hwid) return res.status(400).send("ERR_MISSING_PARAMS");

      // Optional: Anti-Tamper Size Check
      const EXPECTED_SIZE = "66292"; 
      if (size && String(size) !== EXPECTED_SIZE) {
        return res.status(403).send("ERR_SIZE_MISMATCH");
      }

      // Fetch key data from Redis
      let keyData = await redis.get(key);
      if (!keyData) return res.status(403).send("ERR_KEY_NOT_FOUND");

      // Convert to object if stored as string
      if (typeof keyData === 'string') {
        try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).send("ERR_JSON_PARSE"); }
      }

      // HWID Registration & Lock
      const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
      if (!isRegistered) {
        const currentDevices = await redis.scard(`hwids:${key}`);
        const limit = parseInt(keyData.limit) || 1;

        if (currentDevices >= limit) {
          return res.status(403).send("ERR_HWID_LIMIT");
        }
        await redis.sadd(`hwids:${key}`, hwid);
      }

      // THE EXPIRATION FIX:
      // If 'activated' is false, this is the user's first time using the key.
      // We start the actual countdown in the database now.
      if (keyData.activated === false) {
        const duration = parseInt(keyData.duration) || 86400; // Default 24h
        
        keyData.activated = true;
        keyData.activatedAt = Date.now();
        
        // Save the updated "Activated" status
        await redis.set(key, JSON.stringify(keyData));
        
        // Tell Redis to delete the key and its HWID list when time is up
        await redis.expire(key, duration);
        await redis.expire(`hwids:${key}`, duration);
      }

      // Fetch the script content from GitHub
      const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
      const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
      
      const githubResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      if (!githubResponse.ok) return res.status(403).send("ERR_GITHUB_FETCH");

      const scriptContent = await githubResponse.text();
      
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(scriptContent);

    } catch (error) {
      console.error("GET Error:", error);
      return res.status(500).send("ERR_SERVER_CRASH");
    }
  }
  
  // If method is neither POST nor GET
  return res.status(405).send("Method Not Allowed");
    }
      
