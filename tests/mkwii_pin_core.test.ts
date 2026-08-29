import assert from 'node:assert/strict';
import { raycastCollisionOBJ } from '../src/MarioKartWii/mkwii_pin_core.js';

const fixture = [
  'v 0 5 0', 'v 10 5 0', 'v 0 5 10',       // injected KMP/debug triangle: must be ignored
  'v 0 0 0', 'v 10 0 0', 'v 0 0 10',
  'g kmp_area_border', 'f 1 2 3',
  'g road_00_F0000', 'f 4 5 6',
].join('\n');

const hit = raycastCollisionOBJ(fixture, [2, 10, 2], [0, -1, 0]);
assert.deepEqual(hit, [2, 0, 2]);
console.log('MKWii filtered KCL raycast: PASS');
