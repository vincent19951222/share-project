import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const appBuildManifestPath = ".next/app-build-manifest.json";
const mainTabPages = [
  "/(board)/page",
  "/(board)/board/page",
  "/(board)/drink/page",
  "/(board)/calendar/page",
  "/(board)/report/page",
  "/(board)/dashboard/status/page",
  "/(board)/dashboard/store/page",
  "/(board)/dashboard/quest/page",
  "/(board)/dashboard/backpack/page",
  "/(board)/dashboard/cards/page",
];

const watchedAssets = [
  "public/assets/home-scenes/supply/draw-pool/draw-pool-machine.png",
  "public/assets/home-scenes/supply/draw-pool/draw-pool-machine.webp",
  "public/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
];

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function fileSize(filePath) {
  return existsSync(filePath) ? statSync(filePath).size : 0;
}

function walkFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

if (!existsSync(appBuildManifestPath)) {
  console.error("Missing .next/app-build-manifest.json. Run npm run build first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(appBuildManifestPath, "utf8"));

console.log("# Main Tab Performance Measurement");
console.log("");
console.log(`Generated at: ${new Date().toISOString()}`);
console.log("");
console.log("## Main Tab App Chunks");

for (const page of mainTabPages) {
  const chunks = manifest.pages?.[page] ?? [];
  const totalBytes = chunks.reduce((total, chunk) => total + fileSize(path.join(".next", chunk)), 0);
  console.log(`- ${page}: ${formatBytes(totalBytes)}`);
  for (const chunk of chunks) {
    console.log(`  - ${chunk}: ${formatBytes(fileSize(path.join(".next", chunk)))}`);
  }
}

console.log("");
console.log("## Watched Assets");

for (const asset of watchedAssets) {
  const size = fileSize(asset);
  console.log(`- ${asset}: ${size > 0 ? formatBytes(size) : "missing"}`);
}

const supplyAssetBytes = walkFiles("public/assets/home-scenes/supply").reduce(
  (total, filePath) => total + fileSize(filePath),
  0,
);

console.log("");
console.log(`Supply home-scene asset total: ${formatBytes(supplyAssetBytes)}`);
