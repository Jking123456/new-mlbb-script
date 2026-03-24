export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { user, pass } = req.body;

  // Environment Variables from Vercel
  const MASTER_USER = process.env.ADMIN_USER;
  const MASTER_PASS = process.env.ADMIN_PASS;
  const MASTER_SECRET = process.env.ADMIN_SECRET;

  if (user === MASTER_USER && pass === MASTER_PASS) {
    // We send the secret back so the HTML can use it for /api/manage requests
    return res.status(200).json({ 
      success: true, 
      secret: MASTER_SECRET 
    });
  } else {
    return res.status(401).json({ success: false, message: "Invalid Credentials" });
  }
}
