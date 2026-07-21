export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase credentials not configured.' });
  }

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal'
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
      const now = new Date().toISOString();

      // Try PATCH first (update existing row)
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(k)}`,
        {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify({ value, updated_at: now })
        }
      );

      if (patchRes.ok) {
        // Check if any row was actually updated by trying to read it
        // PATCH returns 204 whether it found rows or not, so we INSERT if count was 0
        const countRes = await fetch(
          `${SUPABASE_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(k)}&select=key`,
          { headers: { ...sbHeaders, 'Prefer': 'count=exact' } }
        );
        const countData = await countRes.json();

        if (!countData || countData.length === 0) {
          // No existing row — INSERT
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({ key: k, value, updated_at: now })
          });
          if (!insertRes.ok) {
            const errText = await insertRes.text();
            return res.status(500).json({ error: 'Insert failed: ' + errText });
          }
        }
        return res.json({ success: true });
      }

      // PATCH failed — try POST with upsert as last resort
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: k, value, updated_at: now })
      });

      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        return res.status(500).json({ error: 'Upsert failed: ' + errText });
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Database error: ' + error.message });
  }
}
