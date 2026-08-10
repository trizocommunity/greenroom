import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Generates the full PWA icon set from a single master image.
// Drop a 1024x1024 PNG at public/icons/icon-master.png to use real brand
// assets; otherwise a branded placeholder ("G" on red) is rendered.

const publicDir = path.join(process.cwd(), "public");
const iconsDir = path.join(publicDir, "icons");
const masterPath = path.join(iconsDir, "icon-master.png");

const BRAND_RED = { r: 215, g: 38, b: 38, alpha: 1 };

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" rx="224" fill="#d72626"/>
  <text x="512" y="700" font-family="Arial, Helvetica, sans-serif" font-size="560" font-weight="700" fill="#ffffff" text-anchor="middle">G</text>
</svg>`;

async function main() {
  mkdirSync(iconsDir, { recursive: true });

  const hasMaster = existsSync(masterPath);
  const source = hasMaster
    ? readFileSync(masterPath)
    : Buffer.from(PLACEHOLDER_SVG);

  if (!hasMaster) {
    console.log(
      "No public/icons/icon-master.png found — generating a branded placeholder icon.",
    );
    console.log(
      "Drop a 1024x1024 PNG at public/icons/icon-master.png and re-run to use your own logo.",
    );
  }

  const square = await sharp(source)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toBuffer();

  await sharp(square)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, "icon-192.png"));

  await sharp(square).png().toFile(path.join(iconsDir, "icon-512.png"));

  // Maskable icons need a safe zone: icon content centered at ~61% of the
  // canvas with a solid background fill.
  const iconForMaskable = await sharp(square)
    .resize(312, 312)
    .png()
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BRAND_RED },
  })
    .composite([{ input: iconForMaskable, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, "maskable-512.png"));

  // Apple touch icons must be opaque (no transparency).
  const iconForApple = await sharp(square)
    .resize(140, 140)
    .png()
    .toBuffer();

  await sharp({
    create: { width: 180, height: 180, channels: 4, background: BRAND_RED },
  })
    .composite([{ input: iconForApple, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));

  console.log("Done. Icons written to public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
