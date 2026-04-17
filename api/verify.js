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
    const EXPECTED_SIZE = "11506"; 
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
