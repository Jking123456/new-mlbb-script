import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send("Method Not Allowed");

  try {
    const notification = await redis.get('global_script_notif');
    
    // Set content type to plain text and return just the message string
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(notification || "No active notifications.");
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send("Server Error");
  }
}
