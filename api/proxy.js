export default async function handler(req, res) {
    const { path } = req.query;
    
    // Enable CORS for frontend communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (!path) {
        return res.status(400).json({ error: 'No path provided' });
    }
    
    try {
        // Clean the path to prevent double slashes
        const cleanPath = path.replace(/^\/+/, '');
        // Use a basic string to avoid url.parse() deprecation warnings in older Node runtimes
        const targetUrl = `https://draft.premierleague.com/api/${cleanPath}`;
        
        // Fetching with a realistic User-Agent is CRITICAL to bypass FPL's Cloudflare bot protection
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        });
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        // Pass Cloudflare 403 blocks clearly to the frontend
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `FPL API Error: ${response.status} ${response.statusText}`, 
                status: response.status
            });
        }
        
        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Vercel Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to fetch from FPL API', details: error.message });
    }
}