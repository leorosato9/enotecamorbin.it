import fetch from 'node-fetch';

export async function getTotalCost(startDate, endDate) {
  const startTime = Math.floor(new Date(startDate).getTime() / 1000);
  const endTime   = Math.floor(new Date(endDate)  .getTime() / 1000);

  const url = new URL('https://api.openai.com/v1/organization/costs');
  url.searchParams.set('start_time',   startTime);
  url.searchParams.set('end_time',     endTime);
  url.searchParams.set('bucket_width', '1d');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`Costs API HTTP ${res.status}: ${await res.text()}`);
    }
    const buckets = await res.json();
    const total = buckets.reduce((sum, b) => {
      const daily = (b.results || []).reduce((s, r) => s + (r.amount?.value || 0), 0);
      return sum + daily;
    }, 0);
    return total;
  } catch (err) {
    console.error('[openaiUsage] errore fetch costi:', err);
    return 0;
  }
}
