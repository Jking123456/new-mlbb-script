import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const authHeader = req.headers['x-admin-secret'];
  const SECRET = process.env.ADMIN_SECRET;

  if (!authHeader || authHeader !== SECRET) {
    return res.status(401).json({ error: "Access Denied" });
  }

  if (req.method === 'GET') {
    const allKeys = await redis.keys('PRZ-*');
    const keyData = await Promise.all(allKeys.map(async (k) => {
      const data = await redis.get(k);
      const hwids = await redis.smembers(`hwids:${k}`);
      return {
        key: k,
        expiry: await redis.ttl(k),
        limit: data?.limit || 1,
        isPremium: data?.isPremium ?? false,
        used: hwids.length
      };
    }));
    return res.status(200).json({ keys: keyData });
  }

  if (req.method === 'POST') {
    const { duration, limit } = req.body;
    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const seconds = parseInt(duration) * 86400;
    
    await redis.set(newKey, { limit: parseInt(limit) || 1, isPremium: false }, { ex: seconds });
    return res.status(200).json({ key: newKey });
  }

  if (req.method === 'PATCH') {
    const { key } = req.body;
    const data = await redis.get(key);
    if (!data) return res.status(404).send("NOT_FOUND");
    
    const ttl = await redis.ttl(key);
    data.isPremium = !data.isPremium;
    await redis.set(key, data, { ex: ttl });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    await redis.del(`hwids:${key}`);
    return res.status(200).json({ success: true });
  }
}
