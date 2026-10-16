const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/(?:NEXT_PUBLIC_)?FINNHUB_API_KEY=([^\r\n]+)/);
const key = match ? match[1].replace(/["']/g, '').trim() : '';

async function testFinnhub() {
  const url = `https://finnhub.io/api/v1/calendar/economic?token=${key}`;
  console.log('Testing url with key length:', key.length);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    const data = await res.text();
    console.log('Response preview:', data.slice(0, 500));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testFinnhub();
