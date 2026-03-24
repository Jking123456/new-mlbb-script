// api/decrypt.js
export default function handler(req, res) {
    // Determine if data is coming from POST (body) or GET (query)
    const data = req.method === 'POST' ? req.body : req.query;
    
    // This matches the variable name in your Lua script
    const { admin_secret } = data;

    // These match your Vercel Environment Variables exactly
    const MASTER_SECRET = process.env.LUA_SECRET; // "kupal"
    const MASTER_XOR_KEY = process.env.LUA_XOR_KEY; // "prinzvan"

    // Security Check
    if (!admin_secret || admin_secret !== MASTER_SECRET) {
        return res.status(403).json({ 
            error: "Unauthorized",
            status: "Access Denied" 
        });
    }

    // Success: Send the XOR key back to the tool
    return res.status(200).json({
        status: "authenticated",
        xor_key: MASTER_XOR_KEY || "PRINZ_GUARD_99"
    });
}
