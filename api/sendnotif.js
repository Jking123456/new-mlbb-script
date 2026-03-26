import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send("Method Not Allowed");

  try {
    // 1. Fetch the new insult from the external API
    const response = await fetch('https://urangkapolka.vercel.app/api/insult');
    const data = await response.json();
    
    // 2. Extract only the "insult" string
    const newInsult = data.result.insult;

    // 3. Save the new insult to Redis so the Lua script can read it
    await redis.set('global_script_notif', newInsult);
    
    // 4. Return the new insult as plain text for verification
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(newInsult);
  } catch (error) {
    console.error(error);
    
    // Fallback: If the insult API is down, try to get the last known message from Redis
    const fallback = await redis.get('global_script_notif');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(fallback || "Server Error: Could not fetch insult.");
  }
}
