import sharp from 'sharp';
import crypto from 'crypto';
import { APIError } from './apiUtils.js';

/**
 * High-performance Server-Side Image Optimizer
 * 1. Resizes longest side to max 1024px (preserving aspect ratio)
 * 2. Compresses JPEG quality to 82%
 * 3. Strips EXIF metadata
 * 4. Generates SHA-256 content hash for in-memory caching
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
    if (headerMime) mimeType = headerMime.toLowerCase();
    inputBuffer = Buffer.from(parts[1], 'base64');
  } else {
    inputBuffer = Buffer.from(dataUrl, 'base64');
  }

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new APIError('Uploaded image payload is empty.', 400, 'ImageOptimizer', 'EMPTY_IMAGE');
  }

  // Phase 7: Strict Allowed MIME Type Check
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

  // Perform Sharp optimization
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
  const compressionRatioPct = (100 - (compressedSizeBytes / originalSizeBytes) * 100).toFixed(1);
  const optimizationTimeMs = Date.now() - startTime;
  const optimizedBase64 = optimizedBuffer.toString('base64');
  const optimizedDataUrl = `data:image/jpeg;base64,${optimizedBase64}`;

  return {
    imageHash,
    dataUrl: optimizedDataUrl,
    base64Data: optimizedBase64,
    mimeType: 'image/jpeg',
    originalSizeKb: parseFloat((originalSizeBytes / 1024).toFixed(1)),
    compressedSizeKb: parseFloat((compressedSizeBytes / 1024).toFixed(1)),
    compressionRatioPct: parseFloat(compressionRatioPct),
    optimizationTimeMs
  };
}
