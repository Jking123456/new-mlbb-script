// api/decrypt.js
export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Use POST');

    const { admin_secret } = req.body;

    // These must match your Vercel Environment Variables
    const MASTER_ADMIN_SECRET = process.env.LUA_SECRET; 
    const MASTER_XOR_KEY = process.env.LUA_XOR_KEY;

    if (!admin_secret || admin_secret !== MASTER_ADMIN_SECRET) {
        return res.status(403).json({ error: "Access Denied: Invalid Admin Secret" });
    }

    // Send the keys back to your Lua Tool
    return res.status(200).json({
        status: "authenticated",
        xor_key: MASTER_XOR_KEY || "PRINZ_GUARD_99"
    });
}
