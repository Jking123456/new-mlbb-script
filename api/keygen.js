import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // --- 1. HANDLE WEBSITE REQUEST (POST) ---
  // This is what fixes the "Security Error" on your keygen.html
  if (req.method === 'POST') {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ error: "MISSING_DEVICE_ID" });

      // Check if this device already has a key locked to it
      const existingKey = await redis.get(`device_lock:${deviceId}`);
      
      if (existingKey) {
        return res.status(403).json({ 
            error: "Key already exists for this device.",
            pendingKey: existingKey 
        });
      }

      // Generate a temporary session token for the shortlink
      const tempToken = Math.random().toString(36).substring(2, 15);
      await redis.set(`temp_${tempToken}`, { deviceId }, { ex: 600 }); // 10 min expiry

      // Your Shortlink Logic (Replace with your actual provider URL)
      const destination = `https://new-mlbb-script.vercel.app/keygen.html?token=${tempToken}`;
      const shortlink = `https://carapedi.id/api?api=YOUR_API_KEY&url=${encodeURIComponent(destination)}`;

      return res.status(200).json({ shortlink });
    } catch (error) {
      return res.status(500).json({ error: "GENERATOR_CRASH" });
    }
  }

  // --- 2. HANDLE SCRIPT REQUEST (GET) ---
  // This is what the Game Guardian script calls
  if (req.method === 'GET') {
    try {
      const { key, hwid, size } = req.query;

      if (!key || !hwid || !size) return res.status(400).send("ERR_MISSING_PARAMS");

      // Anti-Tamper Size Check
      const EXPECTED_SIZE = "66292"; 
      if (String(size) !== EXPECTED_SIZE) {
        return res.status(403).send("ERR_SIZE_MISMATCH_" + size);
      }

      let keyData = await redis.get(key);
      if (!keyData) return res.status(403).send("ERR_KEY_NOT_FOUND");

      if (typeof keyData === 'string') {
        try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).send("ERR_JSON_PARSE"); }
      }

      // HWID Lock Logic
      const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
      if (!isRegistered) {
        const currentDevices = await redis.scard(`hwids:${key}`);
        if (currentDevices >= (parseInt(keyData.limit) || 1)) {
          return res.status(403).send("ERR_HWID_LIMIT");
        }
        await redis.sadd(`hwids:${key}`, hwid);
      }

      // EXPIRATION FIX: Start timer on first use
      if (keyData.activated === false) {
        const duration = parseInt(keyData.duration) || 86400;
        keyData.activated = true;
        keyData.activatedAt = Date.now();
        
        await redis.set(key, JSON.stringify(keyData));
        await redis.expire(key, duration);
        await redis.expire(`hwids:${key}`, duration);
      }

      // Fetch Script from Github
      const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
      const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
      
      const githubResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      if (!githubResponse.ok) return res.status(403).send("ERR_GITHUB_AUTH");

      const scriptContent = await githubResponse.text();
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(scriptContent);

    } catch (error) {
      return res.status(500).send("ERR_SERVER_CRASH");
    }
  }
}
