import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { token } = req.query;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Security Headers
  const referer = req.headers['referer'];
  if (!referer || !referer.includes("new-mlbb-script.vercel.app")) {
    return res.status(403).json({ error: "Direct access forbidden" });
  }

  if (!token) return res.status(400).json({ error: "Missing Token" });

  try {
    // 1. Verify the Temp Token
    const tempData = await redis.get(`temp_${token}`);
    if (!tempData) {
      return res.status(403).json({ error: "Contact the Admin to retrieve your unused key!" });
    }

    // 2. Generate the REAL License Key
    const finalKey = "PRZ-FREE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Save final key data
    await redis.set(finalKey, { 
        activated: false, 
        duration: 86400,
        isPremium: true 
    });

    // LOCK THE IP to this new key
    await redis.set(`ip_lock:${ip}`, finalKey);
    
    // 3. Destroy the temp token so it can't be used twice
    await redis.del(`temp_${token}`);

    // Obfuscate for UI safety (Reverse + Base64)
    const masked = Buffer.from(finalKey).toString('base64').split('').reverse().join('');

    return res.status(200).json({ 
        success: true, 
        payload: masked 
    });

  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
      }
      
