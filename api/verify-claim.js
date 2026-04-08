import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { token } = req.query;

  // 1. SECURITY HEADERS CHECK
  const referer = req.headers['referer'];
  const allowedHost = "new-mlbb-script.vercel.app";
  if (!referer || !referer.includes(allowedHost)) {
    return res.status(403).json({ error: "Direct Access Forbidden" });
  }

  if (!token) return res.status(400).json({ error: "Missing Token" });

  try {
    // 2. VALIDATE TEMP SESSION
    const tempData = await redis.get(`temp_${token}`);
    if (!tempData || !tempData.deviceId) {
        return res.status(403).json({ error: "Session Expired or Invalid" });
    }

    const { deviceId } = tempData;
    const finalKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 3. SAVE LICENSE KEY (Expires in 24h)
    await redis.set(finalKey, { 
        activated: false, 
        duration: 86400,
        deviceId: deviceId 
    }, { ex: 86400 });

    // 4. SET THE 24-HOUR DEVICE LOCK
    // The device cannot generate another key until this record expires (86400s)
    await redis.set(`device_lock:${deviceId}`, finalKey, { ex: 86400 });
    
    // 5. CLEANUP
    await redis.del(`temp_${token}`);

    // Mask for delivery (Reverse + Base64)
    const masked = Buffer.from(finalKey).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}

