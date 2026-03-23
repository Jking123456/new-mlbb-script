import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  const { key } = req.query;
  const status = await redis.get(key);

  if (status === "ACTIVE") {
    // SECURITY: Fetch your real script from a private source or paste here
    const scriptCode = `
      gg.toast("✅ VIP ACCESS GRANTED")
      print("Loading Prinzvan Ultimate...")
      -- PASTE YOUR MAIN.LUA CONTENT BELOW --
    `;
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(scriptCode);
  }
  
  return res.status(403).send("INVALID_OR_EXPIRED");
}
