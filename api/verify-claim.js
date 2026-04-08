import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: "Missing key" });
  }

  try {
    const data = await redis.get(key);

    // If key doesn't exist, it's a fake/bypass attempt
    if (!data) {
      return res.status(403).json({ error: "Invalid License Key" });
    }

    // If key is already activated, it shouldn't be revealed again via keygen
    if (data.activated === true) {
      return res.status(403).json({ error: "Key already in use" });
    }

    // Success: The key is valid and pending activation
    return res.status(200).json({ 
        success: true, 
        key: key 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

