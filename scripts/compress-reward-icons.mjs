import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_COLOR_TYPE_RGBA = 6;
const DEFAULT_TARGET_SIZE = 256;
const DEFAULT_ICON_DIR = "public/gamification/rewards/icons";

const CRC_TABLE = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let c = n;

  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }

  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);

  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);

  return chunk;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

export function readRgbaPng(filePath) {
  const buffer = readFileSync(filePath);

  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${filePath} is not a PNG file`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const interlaceMethod = buffer.readUInt8(28);
  const idatChunks = [];

  if (bitDepth !== 8 || colorType !== PNG_COLOR_TYPE_RGBA || interlaceMethod !== 0) {
    throw new Error(`${filePath} must be an 8-bit non-interlaced RGBA PNG`);
  }

  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;

    for (let columnByte = 0; columnByte < rowLength; columnByte += 1) {
      const raw = inflated[inputOffset + columnByte];
      const left =
        columnByte >= bytesPerPixel ? pixels[row * rowLength + columnByte - bytesPerPixel] : 0;
      const up = row > 0 ? pixels[(row - 1) * rowLength + columnByte] : 0;
      const upLeft =
        row > 0 && columnByte >= bytesPerPixel
          ? pixels[(row - 1) * rowLength + columnByte - bytesPerPixel]
          : 0;

      let value;

      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new Error(`${filePath} uses unsupported PNG filter type ${filterType}`);
      }

      pixels[row * rowLength + columnByte] = value & 0xff;
    }

    inputOffset += rowLength;
  }

  return { width, height, pixels };
}

export function writeRgbaPng(filePath, image) {
  const { width, height, pixels } = image;
  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;

  if (pixels.length !== width * height * bytesPerPixel) {
    throw new Error("RGBA pixel buffer length does not match width and height");
  }

  const raw = Buffer.alloc(height * (rowLength + 1));

  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (rowLength + 1);
    raw[rawOffset] = 0;
    pixels.copy(raw, rawOffset + 1, row * rowLength, (row + 1) * rowLength);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(PNG_COLOR_TYPE_RGBA, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  writeFileSync(
    filePath,
    Buffer.concat([
      PNG_SIGNATURE,
      createChunk("IHDR", ihdr),
      createChunk("IDAT", deflateSync(raw, { level: 9 })),
      createChunk("IEND"),
    ]),
  );
}

export function resizeRgbaNearestNeighbor(sourcePixels, sourceWidth, sourceHeight, targetSize) {
  const pixels = Buffer.alloc(targetSize * targetSize * 4);

  for (let y = 0; y < targetSize; y += 1) {
    const sourceY = Math.floor((y * sourceHeight) / targetSize);

    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = Math.floor((x * sourceWidth) / targetSize);
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4;
      const targetOffset = (y * targetSize + x) * 4;

      sourcePixels.copy(pixels, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }

  return { width: targetSize, height: targetSize, pixels };
}

export function compressPngFile(filePath, options = {}) {
  const targetSize = options.targetSize ?? DEFAULT_TARGET_SIZE;
  const dryRun = options.dryRun ?? false;
  const before = {
    width: 0,
    height: 0,
    sizeBytes: statSync(filePath).size,
  };
  const source = readRgbaPng(filePath);

  before.width = source.width;
  before.height = source.height;

  const resized =
    source.width === targetSize && source.height === targetSize
      ? source
      : resizeRgbaNearestNeighbor(source.pixels, source.width, source.height, targetSize);

  if (!dryRun) {
    writeRgbaPng(filePath, resized);
  }

  const changed = source.width !== targetSize || source.height !== targetSize;
  const afterSizeBytes = dryRun ? before.sizeBytes : statSync(filePath).size;

  return {
    filePath,
    changed,
    before,
    after: {
      width: resized.width,
      height: resized.height,
      sizeBytes: afterSizeBytes,
    },
  };
}

export function parseArgs(args) {
  const options = {
    dir: DEFAULT_ICON_DIR,
    targetSize: DEFAULT_TARGET_SIZE,
    dryRun: false,
    check: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dir") {
      options.dir = args[index + 1];
      index += 1;
    } else if (arg === "--target-size") {
      options.targetSize = Number(args[index + 1]);
      index += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--check") {
      options.check = true;
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.targetSize) || options.targetSize <= 0) {
    throw new Error("--target-size must be a positive integer");
  }

  return options;
}

export function resolvePngFiles(dir) {
  const absoluteDir = resolve(dir);

  if (!existsSync(absoluteDir)) {
    throw new Error(`Icon directory does not exist: ${dir}`);
  }

  return readdirSync(absoluteDir)
    .filter((fileName) => fileName.endsWith(".png"))
    .sort()
    .map((fileName) => join(absoluteDir, fileName));
}

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

export function runCli(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const files = resolvePngFiles(options.dir);
  const results = files.map((filePath) => compressPngFile(filePath, options));
  const changedResults = results.filter((result) => result.changed);

  for (const result of results) {
    const status = result.changed ? (options.dryRun ? "would resize" : "resized") : "ok";
    const sizeChange = `${formatBytes(result.before.sizeBytes)} -> ${formatBytes(
      result.after.sizeBytes,
    )}`;

    console.log(
      `${status.padEnd(12)} ${basename(result.filePath)} ${result.before.width}x${
        result.before.height
      } -> ${result.after.width}x${result.after.height} ${sizeChange}`,
    );
  }

  if (options.check && changedResults.length > 0) {
    console.error(
      `${changedResults.length} reward icon(s) need compression. Run npm run compress:reward-icons.`,
    );
    process.exitCode = 1;
  }

  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  runCli();
}
