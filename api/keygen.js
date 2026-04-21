import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Your specific ShrinkMe Token applied here
const SHRINKME_API_KEY = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd"; 

export default async function handler(req, res) {
  
  // --- PART 1: WEBSITE LOGIC (Handle POST from keygen.html) ---
  if (req.method === 'POST') {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ error: "MISSING_ID" });

      // Check Redis for active session to prevent spam
      const activeKey = await redis.get(`active_key:${deviceId}`);
      if (activeKey) {
        return res.status(403).json({ pendingKey: activeKey, error: "ALREADY_HAS_KEY" });
      }

      // Generate the URL that the user returns to after the ads
      const host = req.headers.host;
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const destinationUrl = `${protocol}://${host}/keygen.html?token=${deviceId}`;
      
      // Construct the final ShrinkMe API link
      const shortlink = `https://shrinkme.io/st?api=${SHRINKME_API_KEY}&url=${encodeURIComponent(destinationUrl)}`;

      return res.status(200).json({ success: true, shortlink: shortlink });
    } catch (e) {
      return res.status(500).json({ error: "WEBSITE_API_CRASH" });
    }
  }

  // --- PART 2: SCRIPT DOWNLOADER (Handle GET from Game/Injector) ---
  try {
    const { key, hwid, size } = req.query;

    if (!key || !hwid || !size) return res.status(400).send("ERR_MISSING_PARAMS");

    // 1. SIZE CHECK
    const EXPECTED_SIZE = "66292"; 
    if (String(size) !== EXPECTED_SIZE) {
      return res.status(403).send("ERR_SIZE_MISMATCH_" + size);
    }

    // 2. REDIS CHECK
    let keyData = await redis.get(key);
    if (!keyData) return res.status(403).send("ERR_KEY_NOT_FOUND");

    if (typeof keyData === 'string') {
      try { keyData = JSON.parse(keyData); } catch (e) { return res.status(500).send("ERR_JSON_PARSE"); }
    }

    // 3. HWID LOCK
    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      if (currentDevices >= (parseInt(keyData.limit) || 1)) {
        return res.status(403).send("ERR_HWID_LIMIT");
      }
      await redis.sadd(`hwids:${key}`, hwid);
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
    return res.status(500).send("ERR_SERVER_CRASH");
  }
    }
