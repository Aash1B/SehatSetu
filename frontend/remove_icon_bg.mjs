import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const icons = [
  'Lab Tests Nearby',
  'Specialist Referral',
  'Emergency Care',
];

const publicDir = './public/';

for (const name of icons) {
  const inputPath = `${publicDir}${name}.png`;
  const outputPath = `${publicDir}${name}-nobg.png`;

  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const output = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels + 0];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];

    // Detect near-white / very light background pixels
    // The rounded square bg is a light lavender-white (#EEF0F8 range)
    const isNearWhite = r > 220 && g > 220 && b > 225;

    if (isNearWhite) {
      output[i * channels + 3] = 0; // make transparent
    }
  }

  await sharp(output, {
    raw: { width, height, channels },
  })
    .png()
    .toFile(outputPath);

  console.log(`✅ Saved: ${outputPath}`);
}
