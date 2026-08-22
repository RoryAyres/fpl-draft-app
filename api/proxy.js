export default async function handler(req, res) {
    const { path } = req.query;
    
    if (!path) {
        return res.status(400).json({ error: 'No path provided' });
    }
    
    try {
        // Using WHATWG URL API to resolve Node.js url.parse() deprecation warnings
        const targetUrl = new URL(`https://draft.premierleague.com/api/${path}`);
        
        // Fetching with a User-Agent is CRITICAL to bypass FPL's Cloudflare bot protection
        const response = await fetch(targetUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        
        // Enable CORS for your frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        // Handle FPL API errors safely
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`FPL API Error (${response.status}):`, errorText);
            return res.status(response.status).json({ 
                error: 'FPL API Error', 
                status: response.status,
                details: errorText 
            });
        }
        
        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Vercel Proxy Error:', error);
        res.status(500).json({ error: 'Failed to fetch from FPL API', details: error.message });
    }
}