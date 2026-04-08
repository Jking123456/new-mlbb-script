import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  try {
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400; // 1 Day

    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: false,
        duration: durationSeconds,
        activated: false 
    });

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const target_url = `https://new-mlbb-script.vercel.app/api/claim?key=${freeKey}`;
    const shrinkUrl = `https://shrinkme.io/st?api=${api_token}&url=${encodeURIComponent(target_url)}`;

    return res.status(200).json({ success: true, shortlink: shrinkUrl });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate link" });
  }
}
