async function checkActuals() {
  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Preview:', text.slice(0, 200));
    const data = JSON.parse(text);
    console.log('Keys in object 0:', Object.keys(data[0]));
    console.log('Keys in object 10:', Object.keys(data[10]));
  } catch (err) {
    console.error('Error:', err.message);
  }
}
checkActuals();
