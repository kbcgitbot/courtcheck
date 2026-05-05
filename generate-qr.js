const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = 'https://courtchek.com/nearby';
const outputDir = path.join(__dirname, 'public');

// Generate PNG QR code
QRCode.toFile(path.join(outputDir, 'courtchek-qr.png'), url, {
  width: 1024,
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' }
}, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('QR code PNG saved to public/courtchek-qr.png');
});

// Generate SVG QR code (better for print)
QRCode.toString(url, { type: 'svg', margin: 2 }, (err, svg) => {
  if (err) { console.error(err); process.exit(1); }
  fs.writeFileSync(path.join(outputDir, 'courtchek-qr.svg'), svg);
  console.log('QR code SVG saved to public/courtchek-qr.svg');
});

// Generate a printable HTML flyer
const flyer = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CourtChek QR Flyer</title>
  <style>
    @page { size: letter; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #fff;
    }
    .flyer {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    .flyer h1 {
      font-size: 2.5rem;
      color: #2e7d32;
      margin-bottom: 0.5rem;
    }
    .flyer .tagline {
      font-size: 1.2rem;
      color: #555;
      margin-bottom: 2rem;
    }
    .flyer .qr-frame {
      border: 4px solid #2e7d32;
      border-radius: 16px;
      padding: 1.5rem;
      display: inline-block;
      margin-bottom: 1.5rem;
    }
    .flyer .qr-frame img {
      width: 280px;
      height: 280px;
    }
    .flyer .instructions {
      font-size: 1.3rem;
      color: #333;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .flyer .subtext {
      font-size: 1rem;
      color: #777;
      line-height: 1.5;
    }
    .flyer .url {
      font-size: 0.9rem;
      color: #2e7d32;
      margin-top: 1.5rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="flyer">
    <h1>CourtChek</h1>
    <p class="tagline">Crowdsourced Tennis Court Conditions</p>
    <div class="qr-frame">
      <img src="courtchek-qr.png" alt="Scan to report court conditions">
    </div>
    <p class="instructions">Scan to report court conditions</p>
    <p class="subtext">
      Help fellow players! Scan this QR code to instantly<br>
      update the condition of this court — wet, dry, or busy.
    </p>
    <p class="url">courtchek.com</p>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'qr-flyer.html'), flyer);
console.log('Printable flyer saved to public/qr-flyer.html');
