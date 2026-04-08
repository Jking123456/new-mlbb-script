import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  try {
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400; // 24 Hours

    // Store in Redis as 'Pending'
    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: false,
        duration: durationSeconds,
        activated: false 
    });

    return res.status(200).json({ success: true, key: freeKey });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate key" });
  }
}
