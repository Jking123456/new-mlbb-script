import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // 1. METHOD & ORIGIN SECURITY
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";

  // Blocks direct URL access and external site triggers
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Unauthorized Request Source" });
  }

  // Anti-Proxy / Canary Check
  if (req.headers['via'] || req.headers['proxy-connection']) {
    return res.status(403).json({ error: "Connection Security Violation" });
  }

  try {
    const freeKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const durationSeconds = 86400; // 24 Hours

    // Store in Redis
    await redis.set(freeKey, { 
        limit: 1, 
        isPremium: false,
        duration: durationSeconds,
        activated: false 
    });

    const api_token = "1de83a40a7f0f1ec1c3a7bce28d9b9af26e399fd";
    const destination = `https://${allowedHost}/keygen.html?key=${freeKey}`;
    
    // Official ShrinkMe API Call
    const apiUrl = `https://shrinkme.io/api?api=${api_token}&url=${encodeURIComponent(destination)}&format=text`;
    
    const response = await fetch(apiUrl);
    const shortlink = await response.text();

    if (shortlink && shortlink.startsWith('http')) {
        // Prevent browser caching of the response
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json({ 
            success: true, 
            shortlink: shortlink.trim() 
        });
    } else {
        throw new Error("Invalid API response");
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate shortlink" });
  }
        }
