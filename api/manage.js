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
      const ttl = await redis.ttl(k);
      
      return {
        key: k,
        // If ttl is -1, it hasn't started yet, so show the pending duration
        expiry: ttl > 0 ? ttl : data?.duration || 0,
        limit: data?.limit || 1,
        isPremium: data?.isPremium ?? false,
        used: hwids.length,
        status: ttl > 0 ? "Active" : "Pending"
      };
    }));
    return res.status(200).json({ keys: keyData });
  }

  if (req.method === 'POST') {
    const { action, duration, limit, message } = req.body;

    if (action === 'broadcast') {
        await redis.set('global_script_notif', message);
        return res.status(200).json({ success: true });
    }

    const newKey = "PRZ-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const durationSeconds = parseInt(duration) * 86400;
    
    // REMOVED '{ ex: seconds }' so the key never expires until used
    await redis.set(newKey, { 
        limit: parseInt(limit) || 1, 
        isPremium: false,
        duration: durationSeconds, // Store the time for later use
        activated: false 
    });
    
    return res.status(200).json({ key: newKey });
  }

  if (req.method === 'PATCH') {
    const { key } = req.body;
    const data = await redis.get(key);
    if (!data) return res.status(404).send("NOT_FOUND");
    
    const ttl = await redis.ttl(key);
    data.isPremium = !data.isPremium;
    
    // If it's already active, keep the current TTL, else keep it permanent
    if (ttl > 0) {
        await redis.set(key, data, { ex: ttl });
    } else {
        await redis.set(key, data);
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    await redis.del(key);
    await redis.del(`hwids:${key}`);
    return res.status(200).json({ success: true });
  }
}
