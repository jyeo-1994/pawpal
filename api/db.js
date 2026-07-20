export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in your Vercel environment variables.' });
  }

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    if (req.method === 'GET') {
      const { k } = req.query;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(k)}&select=value`,
        { headers: sbHeaders }
      );
      const data = await response.json();
      return res.json({ value: data[0]?.value ?? null });
    }

    if (req.method === 'POST') {
      const { k, value } = req.body;
      const response = await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: k, value, updated_at: new Date().toISOString() })
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: errText });
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Database error: ' + error.message });
  }
}
