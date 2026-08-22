export default async function handler(req, res) {
    // 1. Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    console.log(`[PROXY] Incoming request: ${req.url}`);

    // 2. HEALTH CHECK: Use this to test if the proxy is reachable at all
    if (req.query.ping === 'true') {
        console.log('[PROXY] Health check successful!');
        return res.status(200).json({ message: 'Proxy is alive and well on Vercel!' });
    }

    const { path } = req.query;
    if (!path) {
        console.log('[PROXY] Error: No path provided');
        return res.status(400).json({ error: 'No path provided' });
    }

    try {
        const cleanPath = path.replace(/^\/+/, '');
        
        // Route 'fixtures' to Classic FPL API, everything else to Draft API
        const targetUrl = cleanPath.startsWith('fixtures') 
            ? `https://fantasy.premierleague.com/api/${cleanPath}`
            : `https://draft.premierleague.com/api/${cleanPath}`;
            
        console.log(`[PROXY] Attempting to fetch from FPL: ${targetUrl}`);
        
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-GB,en;q=0.9',
            }
        });
        
        console.log(`[PROXY] FPL Responded with Status: ${response.status} ${response.statusText}`);
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PROXY] FPL Error Body: ${errorText.substring(0, 200)}...`);
            return res.status(response.status).json({ 
                error: `FPL API Blocked or Failed: ${response.status}`, 
                details: errorText.substring(0, 100)
            });
        }
        
        const data = await response.json();
        console.log(`[PROXY] Successfully retrieved data for ${path}`);
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('[PROXY] Internal Server Error:', error);
        return res.status(500).json({ error: 'Proxy crashed', details: error.message });
    }
}