import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export default async function handler(req, res) {
  // 1. Ensure the request is a POST (matching your keygen.html)
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { deviceId } = req.body;

    // Validation: Check if deviceId was sent
    if (!deviceId) {
      return res.status(400).json({ success: false, error: "MISSING_DEVICE_ID" });
    }

    // 2. Security Check: See if this device already has a pending key/session
    // This prevents users from spamming key generation
    const existingSession = await redis.get(`session:${deviceId}`);
    
    if (existingSession) {
      // If you want to return an existing key instead of a new link
      return res.status(403).json({ 
        success: false, 
        pendingKey: existingSession,
        error: "EXISTING_KEY_FOUND" 
      });
    }

    /**
     * 3. Logic for Shortlink Generation
     * Replace the 'dest' URL with your actual verification claim endpoint.
     * The 'shortlink' should point to your monetization service (like AdLinkFly, LootLabs, etc.)
     */
    const destinationUrl = `https://${req.headers.host}/keygen.html?token=${deviceId}`;
    
    // Example: Replace this with your actual shortener API call if needed
    // For now, we return a mock shortlink or the direct destination for testing
    const generatedShortlink = `https://your-shortener-service.com/st?api=YOUR_API_KEY&url=${encodeURIComponent(destinationUrl)}`;

    // 4. (Optional) Save a temporary state in Redis to track the attempt
    await redis.set(`attempt:${deviceId}`, "pending", { ex: 3600 }); // Expires in 1 hour

    // 5. Success Response
    return res.status(200).json({
      success: true,
      shortlink: generatedShortlink // This is what the frontend button needs
    });

  } catch (error) {
    console.error("API Error:", error);
    // This triggers the "Security Error. Please turn off your DNS" in your HTML catch block
    return res.status(500).json({ success: false, error: "ERR_SERVER_CRASH" });
  }
}
