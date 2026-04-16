import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send("Method Not Allowed");

  try {
    // 1. Fetch the joke from the new API
    const response = await fetch('https://urangkapolka.vercel.app/api/joke');
    const data = await response.json();
    
    // 2. Extract only the "joke" string (directly from the object root)
    const newJoke = data.joke;

    // 3. Save the new joke to Redis for the Lua script
    if (newJoke) {
        await redis.set('global_script_notif', newJoke);
    }
    
    // 4. Return the joke as plain text
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(newJoke);

  } catch (error) {
    console.error(error);
    
    // Fallback: Get the last successful message from Redis
    const fallback = await redis.get('global_script_notif');
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(fallback || "Server Error: Could not fetch joke.");
  }
}
