import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public/icons/icon.svg");
const svg = readFileSync(svgPath);

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  const out = join(root, "public/icons", name);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`Wrote ${name} (${size}x${size})`);
}
