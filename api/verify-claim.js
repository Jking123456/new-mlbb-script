import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { token } = req.query;

  // Security Referer Check
  const referer = req.headers['referer'];
  if (!referer || !referer.includes("new-mlbb-script.vercel.app")) {
    return res.status(403).json({ error: "Direct access forbidden" });
  }

  if (!token) return res.status(400).json({ error: "Missing Token" });

  try {
    // 1. Get the temp token data
    const tempData = await redis.get(`temp_${token}`);
    if (!tempData || !tempData.deviceId) {
        return res.status(403).json({ error: "Contact the Admin to retrieve your Key" });
    }

    const { deviceId } = tempData;

    // 2. Generate the FINAL PRZ Key
    const finalKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // UPDATED DATA STRUCTURE
    const keyData = { 
        activated: false,       // The 'keygen.js' will flip this to true on first use
        duration: 86400,        // 24 hours in seconds
        limit: 1,               // Device limit
        isPremium: true,        // Premium script access
        deviceId: deviceId,     // Locked to this generator session
        remaining: "1d 0h",     // Default display for your dashboard
        createdAt: Date.now()   // Tracking when the key was created
    };

    // Save the key data to Redis
    await redis.set(finalKey, JSON.stringify(keyData));

    // 3. SET THE PERMANENT DEVICE LOCK
    await redis.set(`device_lock:${deviceId}`, finalKey);
    
    // 4. Cleanup: Remove the temporary session token
    await redis.del(`temp_${token}`);

    // Mask the key (Reverse + Base64) for frontend delivery
    const masked = Buffer.from(finalKey).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server Error" });
  }
}
