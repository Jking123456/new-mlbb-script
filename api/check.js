import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') return res.status(405).send("Method Not Allowed");

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "Key is required" });

  try {
    const data = await redis.get(key);
    if (!data) {
      return res.status(404).json({ error: "Invalid Key" });
    }

    const ttl = await redis.ttl(key);
    
    // Return only the necessary info for the script
    return res.status(200).json({
      key: key,
      expiry: ttl,
      isPremium: data.isPremium || false
    });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}

