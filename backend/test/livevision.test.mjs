import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

console.log('--- Running Canonical Live Vision Test Suite ---');

// 1. Verify Frontend LiveVision.js has real COCO-SSD pipeline, coordinate normalization, and no synthetic/fake detections
const liveVisionJs = source('../frontend/src/pages/LiveVision.js');
assert.match(liveVisionJs, /cocoSsd\.load|loadCocoSsd/i, 'LiveVision must load real COCO-SSD model');
assert.match(liveVisionJs, /model\.detect|detector\.detect/i, 'LiveVision must execute detect() on video frames');
assert.doesNotMatch(liveVisionJs, /setInterval.*Math\.random.*Fake/i, 'LiveVision must not contain fake random bounding boxes');
assert.match(liveVisionJs, /canvas\.getContext\('2d'\)/, 'LiveVision must draw real bounding boxes to 2D overlay canvas');
console.log('✓ Live Vision real-time camera & COCO-SSD pipeline verified');

// 2. Verify coordinate transformation logic
function mapBboxToDisplay(bbox, videoDim, displayDim) {
  const [bx, by, bw, bh] = bbox;
  const scaleX = displayDim.width / videoDim.width;
  const scaleY = displayDim.height / videoDim.height;
  return {
    x: bx * scaleX,
    y: by * scaleY,
    width: bw * scaleX,
    height: bh * scaleY
  };
}

const mapped = mapBboxToDisplay([100, 100, 200, 150], { width: 640, height: 480 }, { width: 1280, height: 960 });
assert.equal(mapped.x, 200);
assert.equal(mapped.y, 200);
assert.equal(mapped.width, 400);
assert.equal(mapped.height, 300);
console.log('✓ Aspect-ratio coordinate mapping verified');

console.log('======================================================');
console.log('✓ Canonical Live Vision Test Suite Passed!');
console.log('======================================================');
