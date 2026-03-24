import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send("Method Not Allowed");

  try {
    const notification = await redis.get('global_script_notif');
    return res.status(200).json({ 
      message: notification || "" // Returns empty if no message is set
    });
  } catch (error) {
    return res.status(500).json({ message: "" });
  }
}
