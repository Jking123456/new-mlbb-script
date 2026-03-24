export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { user, pass } = req.body;

  // These come from your Vercel Project Settings > Environment Variables
  const MASTER_USER = process.env.ADMIN_USER;
  const MASTER_PASS = process.env.ADMIN_PASS;

  if (user === MASTER_USER && pass === MASTER_PASS) {
    return res.status(200).json({ 
      success: true, 
      token: "SECURE_SESSION_" + Date.now() // You can use this to gate /api/manage later
    });
  } else {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

