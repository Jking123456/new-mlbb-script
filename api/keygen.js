import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    // Get data from body (POST) or query (GET)
    const data = req.method === 'POST' ? req.body : req.query;
    const { key, size } = data;
    const hwid = data.hwid || data.deviceId;

    // 1. VALIDATION
    if (!key || !hwid || !size) {
      return res.status(400).json({ error: "MISSING_PARAMS" });
    }

    const EXPECTED_SIZE = "66292"; 
    if (String(size) !== EXPECTED_SIZE) {
      return res.status(403).json({ error: "SIZE_MISMATCH" });
    }

    // 2. REDIS CHECK
    let keyData = await redis.get(key);
    if (!keyData) return res.status(403).json({ error: "INVALID_KEY" });

    if (typeof keyData === 'string') {
      try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).json({ error: "DB_PARSE_ERR" }); }
    }

    // 3. HWID LOCK
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      if (currentDevices >= (parseInt(keyData.limit) || 1)) {
        return res.status(403).json({ error: "HWID_LIMIT" });
      }
      await redis.sadd(`hwids:${key}`, hwid);
    }

    // 4. CONTENT FETCHING
    const scriptName = keyData.isPremium ? "kupalka.lua" : "main2.lua";
    const githubUrl = `https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/${scriptName}`;
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) return res.status(403).json({ error: "GITHUB_ERR" });

    const scriptContent = await githubResponse.text();

    // If request is from the website (JSON), send masked payload. 
    // If from executor (Plain Text), send raw script.
    if (req.headers['accept']?.includes('application/json') || req.method === 'POST') {
      const masked = btoa(scriptContent).split('').reverse().join('');
      return res.status(200).json({ success: true, payload: masked });
    }

    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptContent);

  } catch (error) {
    return res.status(500).json({ error: "SERVER_CRASH" });
  }
}
