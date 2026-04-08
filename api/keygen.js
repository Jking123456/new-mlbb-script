import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  try {
    // 1. Generate a 1-Day Free Key
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400; // 1 Day

    // 2. Store in Redis (Pending activation)
    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: false,
        duration: durationSeconds,
        activated: false 
    });

    // 3. Create the ShrinkMe.io Shortlink
    // The "alias" can be the key itself so you know which one was generated
    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const target_url = `https://new-mlbb-script.vercel.app/api/claim?key=${freeKey}`; // Page where they get the key
    const shrinkUrl = `https://shrinkme.io/st?api=${api_token}&url=${encodeURIComponent(target_url)}`;

    return res.status(200).json({ success: true, shortlink: shrinkUrl });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate link" });
  }
}

