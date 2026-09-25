import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasMetrics } from '../src/layout.js';

test('native installation keeps the exact 1920 × 1080 canvas', () => {
  assert.deepEqual(canvasMetrics(1920,1080),{scale:1,width:1920,height:1080});
});
test('Mac and desktop aspect ratios fill the viewport without cropping the base design', () => {
  for(const [width,height] of [[1440,900],[1512,982],[2048,1029],[1363,936],[2560,1440],[1280,720]]){
    const c=canvasMetrics(width,height);
    assert.ok(c.width>=1920-1e-8 && c.height>=1080-1e-8);
    assert.ok(Math.abs(c.width*c.scale-width)<1e-8);
    assert.ok(Math.abs(c.height*c.scale-height)<1e-8);
    assert.ok(Math.abs(c.width-1920)<1e-8 || Math.abs(c.height-1080)<1e-8);
  }
});
