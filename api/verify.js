import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  try {
    const { key, hwid } = req.query;
    if (!key || !hwid) return res.status(400).send("MISSING_PARAMS");

    const keyData = await redis.get(key);
    if (!keyData) return res.status(403).send("INVALID_OR_EXPIRED");

    // --- PREMIUM CHECK ---
    // If isPremium is false, block access
    if (keyData.isPremium === false) {
      return res.status(402).send("you're still not a premium user");
    }

    const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
    
    if (!isRegistered) {
      const currentDevices = await redis.scard(`hwids:${key}`);
      if (currentDevices >= (keyData.limit || 1)) {
        return res.status(403).send("DEVICE_LIMIT_REACHED");
      }
      await redis.sadd(`hwids:${key}`, hwid);
    }

    const githubUrl = "https://raw.githubusercontent.com/Jking123456/mlbb-maphack-drone/main/main.lua";
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    if (!githubResponse.ok) return res.status(500).send("FAILED_TO_FETCH_SCRIPT");

    const scriptContent = await githubResponse.text();
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
}
