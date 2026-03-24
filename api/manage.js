import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const authHeader = req.headers['x-admin-secret'];
  const SECRET = process.env.ADMIN_SECRET;

  // Security Check: Only the Admin Panel can access these functions
  if (!authHeader || authHeader !== SECRET) {
    return res.status(401).json({ error: "Access Denied" });
  }

  // GET: Fetch all active keys for the table
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

  // POST: Handle Key Generation OR Global Broadcasts
  if (req.method === 'POST') {
    const { action, duration, limit, message } = req.body;

    // Logic for sending a Global Notification to the Script
    if (action === 'broadcast') {
        await redis.set('global_script_notif', message);
        return res.status(200).json({ success: true });
    }

    // Default Logic: Generate a New License Key
    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const seconds = parseInt(duration) * 86400;
    
    await redis.set(newKey, { limit: parseInt(limit) || 1, isPremium: false }, { ex: seconds });
    return res.status(200).json({ key: newKey });
  }

  // PATCH: Toggle Premium Status
  if (req.method === 'PATCH') {
    const { key } = req.body;
    const data = await redis.get(key);
    if (!data) return res.status(404).send("NOT_FOUND");
    
    const ttl = await redis.ttl(key);
    data.isPremium = !data.isPremium;
    await redis.set(key, data, { ex: ttl });
    return res.status(200).json({ success: true });
  }

  // DELETE: Remove a key and its HWID data
  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    await redis.del(`hwids:${key}`);
    return res.status(200).json({ success: true });
  }
}
  
