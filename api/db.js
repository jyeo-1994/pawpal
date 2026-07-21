export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set in Vercel environment variables.' });
  }

  // Strip any path the user may have included (e.g. /rest/v1 or trailing slash)
  // We always want just https://xxxx.supabase.co
  const BASE = SUPABASE_URL.replace(/\/+$/, '').replace(/\/rest.*$/, '').replace(/\/graphql.*$/, '');
  const API  = `${BASE}/rest/v1`;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    if (req.method === 'GET') {
      const { k } = req.query;
      const r = await fetch(`${API}/app_data?key=eq.${encodeURIComponent(k)}&select=value`, { headers });
      const data = await r.json();
      return res.json({ value: data[0]?.value ?? null });
    }

    if (req.method === 'POST') {
      const { k, value } = req.body;
      const r = await fetch(`${API}/app_data`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: k, value, updated_at: new Date().toISOString() })
      });
      if (!r.ok) {
        const errText = await r.text();
        // Return the exact Supabase error so the client can show it
        return res.status(500).json({ error: `Supabase ${r.status}: ${errText}` });
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Function error: ' + err.message });
  }
}
