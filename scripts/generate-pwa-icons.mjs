import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public/icons");

const exports = [
  { source: "icon.svg", name: "icon-192.png", size: 192 },
  { source: "icon.svg", name: "icon-512.png", size: 512 },
  { source: "icon.svg", name: "apple-touch-icon.png", size: 180 },
  {
    source: "instagram-profile.svg",
    name: "instagram-profile.png",
    size: 1080,
  },
];

for (const { source, name, size } of exports) {
  const svg = readFileSync(join(iconsDir, source));
  const out = join(iconsDir, name);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`Wrote ${name} (${size}x${size}) from ${source}`);
}
