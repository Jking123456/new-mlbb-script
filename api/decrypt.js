// api/decrypt.js
export default function handler(req, res) {
    const data = req.method === 'POST' ? req.body : req.query;
    const { admin_secret } = data;

    const MASTER_SECRET = process.env.LUA_SECRET; // "kupal"
    const AES_KEY = process.env.LUA_XOR_KEY;     // "prinzvan"

    if (!admin_secret || admin_secret !== MASTER_SECRET) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    return res.status(200).json({
        status: "authenticated",
        aes_key: AES_KEY || "0123456789ABCDEF0123456789ABCDEF" // AES likes 32 chars
    });
}
