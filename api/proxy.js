export default async function handler(req, res) {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'No path provided' });

    try {
        const fetchUrl = `https://draft.premierleague.com/api/${path}`;
        const response = await fetch(fetchUrl);
        
        // This is the magic that unblocks the browser:
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from FPL API' });
    }
}