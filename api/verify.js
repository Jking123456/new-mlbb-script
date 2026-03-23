import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key, hwid } = req.query;
  if (!key || !hwid) return res.status(400).send("MISSING_PARAMS");

  const keyData = await redis.get(key);
  if (!keyData) return res.status(403).send("INVALID_OR_EXPIRED");

  // Check if this device is already registered for this key
  const isRegistered = await redis.sismember(`hwids:${key}`, hwid);
  
  if (!isRegistered) {
    const currentDevices = await redis.scard(`hwids:${key}`);
    if (currentDevices >= keyData.limit) {
      return res.status(403).send("DEVICE_LIMIT_REACHED");
    }
    // Register the new device
    await redis.sadd(`hwids:${key}`, hwid);
  }

  // SUCCESS
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('-- YOUR_LUA_CODE_HERE');
}
