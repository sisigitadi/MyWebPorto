import sharp from "sharp";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const srcImagePath = path.join(rootDir, "images", "logo sigitadi.jpg");

async function generateBrandingAssets() {
  if (!fs.existsSync(srcImagePath)) {
    throw new Error(`Source image not found at ${srcImagePath}`);
  }

  console.log("Reading source image:", srcImagePath);
  const metadata = await sharp(srcImagePath).metadata();
  console.log(`Source dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  const iconsDir = path.join(rootDir, "public", "icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. icon-192.png
  await sharp(srcImagePath)
    .resize(192, 192, { fit: "cover" })
    .ensureAlpha()
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-192.png"));
  console.log("Generated: public/icons/icon-192.png");

  // 2. icon-512.png
  await sharp(srcImagePath)
    .resize(512, 512, { fit: "cover" })
    .ensureAlpha()
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-512.png"));
  console.log("Generated: public/icons/icon-512.png");

  // 3. icon-maskable-512.png
  // Maskable icons benefit from padding (80% scale with safe zone)
  const innerBuffer = await sharp(srcImagePath)
    .resize(410, 410, { fit: "cover" })
    .ensureAlpha()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 10, g: 15, b: 30, alpha: 1 },
    },
  })
    .composite([{ input: innerBuffer, gravity: "center" }])
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));
  console.log("Generated: public/icons/icon-maskable-512.png");

  // 4. apple-touch-icon.png (180x180)
  await sharp(srcImagePath)
    .resize(180, 180, { fit: "cover" })
    .ensureAlpha()
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("Generated: public/icons/apple-touch-icon.png");

  // 5. public/sa-shield-logo.png & public/logo.png
  await sharp(srcImagePath)
    .resize(512, 512, { fit: "cover" })
    .ensureAlpha()
    .png({ quality: 95 })
    .toFile(path.join(rootDir, "public", "sa-shield-logo.png"));
  await sharp(srcImagePath)
    .resize(512, 512, { fit: "cover" })
    .ensureAlpha()
    .png({ quality: 95 })
    .toFile(path.join(rootDir, "public", "logo.png"));
  console.log("Generated: public/sa-shield-logo.png & public/logo.png");

  // 6. Favicon 16x16, 32x32, 48x48 RGBA PNG for ICO
  const png16Buffer = await sharp(srcImagePath)
    .resize(16, 16, { fit: "cover" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const png32Buffer = await sharp(srcImagePath)
    .resize(32, 32, { fit: "cover" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const png48Buffer = await sharp(srcImagePath)
    .resize(48, 48, { fit: "cover" })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Helper to build a multi-resolution ICO file from PNG buffers
  function createIco(images) {
    const numImages = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // 1 = ICO type
    header.writeUInt16LE(numImages, 4); // Number of images

    let offset = 6 + numImages * 16;
    const directoryEntries = [];
    const imageBuffers = [];

    for (const img of images) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
      entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
      entry.writeUInt32LE(offset, 12); // Offset to image data

      directoryEntries.push(entry);
      imageBuffers.push(img.buffer);
      offset += img.buffer.length;
    }

    return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
  }

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16Buffer },
    { width: 32, height: 32, buffer: png32Buffer },
    { width: 48, height: 48, buffer: png48Buffer },
  ]);

  fs.writeFileSync(path.join(rootDir, "public", "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(rootDir, "src", "app", "favicon.ico"), icoBuffer);
  console.log("Generated: public/favicon.ico & src/app/favicon.ico (RGBA Color Type 6)");
}

generateBrandingAssets().catch((err) => {
  console.error("Error generating branding assets:", err);
  process.exit(1);
});
