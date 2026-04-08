export default function handler(req, res) {
    const { key } = req.query;

    if (!key) {
        return res.status(400).send("<h1>Error: No key provided</h1>");
    }

    // This returns a clean HTML page for the user to copy their key
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PRINZVAN | Claim Key</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <style>
            body { background-color: #0b0f1a; color: #f8fafc; font-family: 'Inter', sans-serif; }
            .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
            .key-box { background: rgba(59, 130, 246, 0.1); border: 1px dashed #3b82f6; }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-6">
        <div class="w-full max-w-md">
            <div class="glass rounded-[32px] p-8 text-center shadow-2xl">
                <div class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fa-solid fa-check-double text-2xl text-green-500"></i>
                </div>
                <h1 class="text-2xl font-bold mb-2">Key Generated!</h1>
                <p class="text-slate-400 text-sm mb-8">Copy your key below and paste it into the script.</p>

                <div class="key-box p-4 rounded-2xl mb-6 cursor-pointer hover:bg-blue-500/20 transition-all" onclick="copyKey()">
                    <span id="keyText" class="text-xl font-mono text-white tracking-widest">${key}</span>
                </div>

                <p class="text-xs text-slate-500 mb-6">
                    <i class="fa-solid fa-clock mr-1"></i> Valid for 24 Hours after first activation.
                </p>

                <button onclick="copyKey()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all">
                    COPY KEY
                </button>
            </div>
        </div>

        <script>
            function copyKey() {
                const text = document.getElementById('keyText').innerText;
                navigator.clipboard.writeText(text);
                alert("Key copied to clipboard!");
            }
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
}

