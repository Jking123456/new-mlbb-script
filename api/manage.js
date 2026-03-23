import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const allKeys = await redis.keys('PRZ-*');
    const keyData = await Promise.all(allKeys.map(async (k) => {
      const data = await redis.get(k);
      const hwids = await redis.smembers(`hwids:${k}`); // Get all registered devices
      return {
        key: k,
        expiry: await redis.ttl(k),
        limit: data.limit || 1,
        used: hwids.length
      };
    }));
    return res.status(200).json({ keys: keyData });
  }

  if (req.method === 'POST') {
    const { duration, limit } = req.body;
    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const seconds = parseInt(duration) * 86400;
    
    // Store the limit inside the key's data
    await redis.set(newKey, { limit: parseInt(limit) || 1 }, { ex: seconds });
    return res.status(200).json({ key: newKey });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    await redis.del(`hwids:${key}`); // Delete the list of devices
    return res.status(200).json({ success: true });
  }
}
