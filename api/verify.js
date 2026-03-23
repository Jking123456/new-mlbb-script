import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key, hwid } = req.query;
  
  // 1. Check if key exists
  const keyStatus = await redis.get(key);
  if (!keyStatus) return res.status(403).send("INVALID_OR_EXPIRED");

  // 2. Check for HWID binding
  const boundHWID = await redis.get(`hwid:${key}`);

  if (!boundHWID) {
    // First time using the key? Bind it to this HWID forever.
    await redis.set(`hwid:${key}`, hwid);
  } else if (boundHWID !== hwid) {
    // Key is bound to a DIFFERENT device
    return res.status(403).send("WRONG_DEVICE");
  }

  // 3. SUCCESS - Send Script
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('-- YOUR_LUA_CODE_HERE');
}
