import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  try {
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400;

    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: false,
        duration: durationSeconds,
        activated: false 
    });

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://new-mlbb-script.vercel.app/keygen.html?key=${freeKey}`;
    
    // Calling the ShrinkMe API as shown in your documentation
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    if (shortlink && shortlink.startsWith('http')) {
        return res.status(200).json({ success: true, shortlink: shortlink.trim() });
    } else {
        throw new Error("Invalid API response");
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate shortlink" });
  }
}
