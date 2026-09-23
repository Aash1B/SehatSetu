const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generatePwaIcons() {
  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const svgPath = path.join(publicDir, 'logo.svg');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG logo not found at ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating SehatSetu PWA icons from logo.svg...');

  // 1. Generate 512x512 standard icon (transparent background, 80% fit)
  const iconSize512 = 512;
  const logoSize512 = Math.round(iconSize512 * 0.85); // 435px
  const resizedLogo512 = await sharp(svgBuffer)
    .resize(logoSize512, logoSize512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: iconSize512,
      height: iconSize512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo512, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 2. Generate 192x192 standard icon (transparent background)
  const iconSize192 = 192;
  const logoSize192 = Math.round(iconSize192 * 0.85); // 163px
  const resizedLogo192 = await sharp(svgBuffer)
    .resize(logoSize192, logoSize192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: iconSize192,
      height: iconSize192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo192, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 3. Generate Apple Touch Icon (180x180, white background for iOS home screen)
  const iconSize180 = 180;
  const logoSize180 = Math.round(iconSize180 * 0.75); // 135px with safe margin
  const resizedLogo180 = await sharp(svgBuffer)
    .resize(logoSize180, logoSize180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: iconSize180,
      height: iconSize180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo180, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 4. Generate Maskable Icons (solid white background, 65% logo size for safe zone)
  const maskableLogo512 = await sharp(svgBuffer)
    .resize(Math.round(512 * 0.65), Math.round(512 * 0.65), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: maskableLogo512, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log('Created maskable-icon-512x512.png');

  const maskableLogo192 = await sharp(svgBuffer)
    .resize(Math.round(192 * 0.65), Math.round(192 * 0.65), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: maskableLogo192, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'maskable-icon-192x192.png'));
  console.log('Created maskable-icon-192x192.png');

  // 5. Generate favicon.ico (64x64 PNG converted to ico or saved as favicon)
  const favicon64 = await sharp(svgBuffer)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Created favicon.ico');

  console.log('All SehatSetu PWA icons generated successfully!');
}

generatePwaIcons().catch((err) => {
  console.error('Failed generating PWA icons:', err);
  process.exit(1);
});
