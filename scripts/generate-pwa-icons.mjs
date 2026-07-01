import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public/icons");
const svg = readFileSync(join(iconsDir, "icon.svg"));

const exports = [
  { name: "icon-32.png", size: 32 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "instagram-profile.png", size: 1080 },
];

for (const { name, size } of exports) {
  const out = join(iconsDir, name);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`Wrote ${name} (${size}x${size})`);
}
