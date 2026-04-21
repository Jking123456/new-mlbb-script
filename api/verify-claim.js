import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { token } = req.query;

  // 1. Security Check: Prevent direct URL calls
  const referer = req.headers['referer'];
  // Added a check to allow Vercel's internal preview URLs or your main domain
  if (!referer || (!referer.includes("vercel.app") && !referer.includes("yourdomain.com"))) {
    return res.status(403).json({ error: "Direct access forbidden" });
  }

  if (!token) return res.status(400).json({ error: "Missing Token" });

  try {
    // 2. Retrieve temporary session data
    // This was created when the user clicked 'Initialize'
    const tempData = await redis.get(`temp_${token}`);
    
    if (!tempData) {
        return res.status(403).json({ error: "Session expired or invalid. Please restart the process." });
    }

    // Ensure we have a device identifier to lock to
    const deviceId = tempData.deviceId || tempData.hwid;
    if (!deviceId) {
        return res.status(403).json({ error: "Device identification lost." });
    }

    // 3. Generate the FINAL PRZ Key
    // Creates a unique key like: PRZ-FREE-A1B2C3
    const finalKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 4. Save the key to Redis with 24h expiry
    // We set 'limit: 1' to ensure it only works for this specific device
    await redis.set(finalKey, JSON.stringify({ 
        activated: true, 
        limit: 1,
        isPremium: false,
        deviceId: deviceId,
        createdAt: new Date().toISOString()
    }), { ex: 86400 }); // Expires in 24 hours (86400 seconds)

    // 5. Set Device Lock
    // This allows keygen.html to "remember" the key if the user refreshes
    await redis.set(`hwids:${finalKey}`, deviceId);
    
    // 6. Cleanup
    await redis.del(`temp_${token}`);

    // 7. Mask the key for delivery
    // (Base64 -> Reverse) to match the 'demask' function in your HTML
    const masked = btoa(finalKey).split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
