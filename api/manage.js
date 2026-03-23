import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const keys = await redis.keys('*');
    const keyData = await Promise.all(keys.map(async (k) => ({
      key: k,
      expiry: await redis.ttl(k)
    })));
    return res.status(200).json({ keys: keyData });
  }

  if (req.method === 'POST') {
    const { duration } = req.body;
    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const seconds = parseInt(duration) * 86400; // Days to seconds
    await redis.set(newKey, "ACTIVE", { ex: seconds });
    return res.status(200).json({ key: newKey });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    return res.status(200).json({ success: true });
  }
}

