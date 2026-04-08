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
    // 1. Get the temp token data (which has the deviceId from keygen)
    const tempData = await redis.get(`temp_${token}`);
    if (!tempData || !tempData.deviceId) {
        return res.status(403).json({ error: "Invalid Session or Token Expired" });
    }

    const { deviceId } = tempData;

    // 2. Generate the FINAL PRZ Key
    const finalKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Save the key with activated: false
    await redis.set(finalKey, { 
        activated: false, 
        duration: 86400,
        isPremium: true,
        deviceId: deviceId 
    });

    // 3. SET THE PERMANENT DEVICE LOCK
    // This links this Phone ID to this specific Key Name
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
