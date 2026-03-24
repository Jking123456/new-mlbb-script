import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // 🔒 SECURITY CHECK: Compare header with Vercel Env Variable
  const authHeader = req.headers['x-admin-secret'];
  const SECRET = process.env.ADMIN_SECRET;

  if (!authHeader || authHeader !== SECRET) {
    return res.status(401).json({ error: "Access Denied: Invalid Secret" });
  }

  if (req.method === 'GET') {
    const allKeys = await redis.keys('PRZ-*');
    const keyData = await Promise.all(allKeys.map(async (k) => {
      const data = await redis.get(k);
      const hwids = await redis.smembers(`hwids:${k}`);
      return {
        key: k,
        expiry: await redis.ttl(k),
        limit: (data && data.limit) ? data.limit : 1,
        used: hwids.length
      };
    }));
    return res.status(200).json({ keys: keyData });
  }

  if (req.method === 'POST') {
    const { duration, limit } = req.body;
    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const seconds = parseInt(duration) * 86400;
    
    await redis.set(newKey, { limit: parseInt(limit) || 1 }, { ex: seconds });
    return res.status(200).json({ key: newKey });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    await redis.del(`hwids:${key}`);
    return res.status(200).json({ success: true });
  }
}
