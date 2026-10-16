async function testForexFactory() {
  const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await res.json();
    console.log('Sample event keys:', Object.keys(data[0] || {}));
    
    // Find an event with forecast or previous
    const withForecast = data.filter(e => e.forecast || e.previous || e.actual);
    console.log('Events with forecast/previous/actual:', withForecast.length);
    console.log('Sample with forecast:', JSON.stringify(withForecast.slice(0, 5), null, 2));

    // Check events for Oct 16 or Oct 15
    const oct16 = data.filter(e => e.date && e.date.includes('2026-10-16'));
    console.log('Oct 16 events count:', oct16.length);
    console.log('Sample Oct 16 events:', JSON.stringify(oct16.slice(0, 5), null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
testForexFactory();
