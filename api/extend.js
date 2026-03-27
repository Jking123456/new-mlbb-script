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

  if (req.method === 'POST') {
    const { key, days } = req.body;
    if (!key || !days) return res.status(400).send("MISSING_DATA");

    const data = await redis.get(key);
    if (!data) return res.status(404).send("KEY_NOT_FOUND");

    const additionalSeconds = parseInt(days) * 86400;
    const currentTtl = await redis.ttl(key);

    if (currentTtl > 0) {
      // Key is already ACTIVE: Add time to current remaining TTL
      const newTtl = currentTtl + additionalSeconds;
      await redis.set(key, data, { ex: newTtl });
      // Sync HWID expiry
      await redis.expire(`hwids:${key}`, newTtl);
    } else {
      // Key is PENDING: Add to the stored duration
      data.duration = (data.duration || 0) + additionalSeconds;
      await redis.set(key, data);
    }

    return res.status(200).json({ success: true, message: `Extended by ${days} days` });
  }
  
  return res.status(405).send("Method Not Allowed");
        }

