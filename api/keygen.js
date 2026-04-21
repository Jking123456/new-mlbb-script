import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    // Support both POST (body) and GET (query)
    const data = req.method === 'POST' ? req.body : req.query;
    const { key, size } = data;
    
    // Map deviceId from frontend to hwid used in backend logic
    const hwid = data.hwid || data.deviceId;

    // 1. VALIDATION
    if (!key || !hwid || !size) {
      return res.status(400).json({ error: "MISSING_PARAMETERS", required: "key, hwid/deviceId, size" });
    }

    const EXPECTED_SIZE = "66292"; 
    if (String(size) !== EXPECTED_SIZE) {
      return res.status(403).json({ error: "SIZE_MISMATCH" });
    }

    // 2. REDIS KEY CHECK
    let keyData = await redis.get(key);
    if (!keyData) return res.status(403).json({ error: "INVALID_KEY" });

    if (typeof keyData === 'string') {
      try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).json({ error: "DATABASE_PARSE_ERROR" }); }
    }

    // 3. HWID LOCKING
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      if (currentDevices >= (parseInt(keyData.limit) || 1)) {
        return res.status(403).json({ error: "DEVICE_LIMIT_REACHED" });
      }
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // 4. CONTENT DELIVERY
    // If this is just a 'check', return success. If it's a script request, return the code.
    const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) return res.status(403).json({ error: "GITHUB_FETCH_FAILED" });

    const scriptContent = await githubResponse.text();
    
    // Return as JSON if the requester is the web generator, or plain text for the executor
    if (req.headers['accept']?.includes('application/json')) {
        return res.status(200).json({ success: true, payload: btoa(scriptContent).split('').reverse().join('') });
    }

    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
      }
      
