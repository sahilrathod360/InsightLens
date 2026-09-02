import sharp from 'sharp';
import crypto from 'crypto';
import { APIError } from './apiUtils.js';

/**
 * High-performance Server-Side Image Optimizer
 * 1. Validates JPEG, PNG, WebP (normalizing jpg/jpeg)
 * 2. Resizes longest side to max 1024px (preserving aspect ratio)
 * 3. Compresses JPEG quality to 82%
 * 4. Strips EXIF metadata
 * 5. If compressed > original, keeps original buffer
 * 6. Generates SHA-256 content hash for in-memory caching
 */
export async function optimizeImage(dataUrl) {
  const startTime = Date.now();
  
  if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.trim().length === 0) {
    throw new APIError('Empty or invalid image data provided.', 400, 'ImageOptimizer', 'INVALID_IMAGE');
  }

  let inputBuffer;
  let mimeType = 'image/jpeg';

  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(',');
    if (parts.length < 2 || !parts[1]) {
      throw new APIError('Malformed dataUrl string format.', 400, 'ImageOptimizer', 'MALFORMED_DATAURL');
    }
    const headerMime = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
    if (headerMime) mimeType = headerMime.toLowerCase().trim();
    inputBuffer = Buffer.from(parts[1], 'base64');
  } else {
    inputBuffer = Buffer.from(dataUrl, 'base64');
  }

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new APIError('Uploaded image payload is empty.', 400, 'ImageOptimizer', 'EMPTY_IMAGE');
  }

  // Normalize image/jpg -> image/jpeg
  if (mimeType === 'image/jpg') {
    mimeType = 'image/jpeg';
  }

  // Strict Allowed MIME Type Check (JPEG, PNG, WebP)
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new APIError(`Unsupported file format (${mimeType}). Only JPEG, PNG, and WebP images are allowed.`, 400, 'ImageOptimizer', 'UNSUPPORTED_FORMAT');
  }

  // Verify image integrity using Sharp metadata
  let metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err) {
    throw new APIError('Uploaded file is corrupted or not a valid image.', 400, 'ImageOptimizer', 'CORRUPT_IMAGE');
  }

  if (!metadata || !metadata.format || !['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
    throw new APIError('Invalid or corrupted image format. Only JPEG, PNG, and WebP are supported.', 400, 'ImageOptimizer', 'INVALID_FORMAT');
  }

  const originalSizeBytes = inputBuffer.length;
  const imageHash = crypto.createHash('sha256').update(inputBuffer).digest('hex');

  // Perform Sharp optimization (Max 1024px, JPEG quality 82%)
  const optimizedBuffer = await sharp(inputBuffer)
    .resize({
      width: 1024,
      height: 1024,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 82,
      mozjpeg: true
    })
    .toBuffer();

  const compressedSizeBytes = optimizedBuffer.length;
  const optimizationTimeMs = Date.now() - startTime;

  let finalBase64;
  let finalDataUrl;
  let finalMime = 'image/jpeg';
  let keptOriginal = false;

  // Rule: If compressed image is larger than original, keep original
  if (compressedSizeBytes >= originalSizeBytes && originalSizeBytes > 0) {
    keptOriginal = true;
    finalMime = mimeType;
    finalBase64 = inputBuffer.toString('base64');
    finalDataUrl = `data:${finalMime};base64,${finalBase64}`;
    console.log(`[ImageOptimizer] Original is smaller than re-compressed (${originalSizeBytes} <= ${compressedSizeBytes} bytes). Keeping original image.`);
  } else {
    finalBase64 = optimizedBuffer.toString('base64');
    finalDataUrl = `data:image/jpeg;base64,${finalBase64}`;
  }

  const finalSizeBytes = keptOriginal ? originalSizeBytes : compressedSizeBytes;
  const compressionRatioPct = (100 - (finalSizeBytes / originalSizeBytes) * 100).toFixed(1);

  return {
    imageHash,
    dataUrl: finalDataUrl,
    base64Data: finalBase64,
    mimeType: finalMime,
    originalSizeKb: parseFloat((originalSizeBytes / 1024).toFixed(1)),
    compressedSizeKb: parseFloat((finalSizeBytes / 1024).toFixed(1)),
    compressionRatioPct: parseFloat(compressionRatioPct),
    optimizationTimeMs
  };
}
