import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DEVICE_WIDTH, previewViewport, STAGE_PADDING } from '../frontend/src/lib/previewViewport.ts';

describe('previewViewport', () => {
  test('desktop keeps a real 1280px logical viewport and scales to fit a narrow 3-pane stage', () => {
    const vp = previewViewport('desktop', { width: 668, height: 780 }, true);
    assert.equal(vp.stagePadding, STAGE_PADDING);
    assert.equal(vp.logicalWidth, DEVICE_WIDTH.desktop);
    assert.equal(vp.scale, 620 / 1280);
    assert.equal(vp.logicalWidth * vp.scale, 620);
    assert.equal(vp.logicalHeight * vp.scale, 732);
  });

  test('desktop expands at 1:1 when the stage is wider than 1280px', () => {
    const vp = previewViewport('desktop', { width: 1600, height: 900 }, true);
    assert.equal(vp.logicalWidth, 1552);
    assert.equal(vp.scale, 1);
    assert.equal(vp.logicalHeight, 852);
  });

  test('tablet and mobile keep their fixed device widths', () => {
    const tablet = previewViewport('tablet', { width: 668, height: 780 }, true);
    assert.equal(tablet.logicalWidth, 834);
    assert.equal(tablet.scale, 620 / 834);

    const mobile = previewViewport('mobile', { width: 668, height: 780 }, true);
    assert.equal(mobile.logicalWidth, 390);
    assert.equal(mobile.scale, 1);
  });

  test('narrow editor uses compact padding and still scales desktop down cleanly', () => {
    const vp = previewViewport('desktop', { width: 390, height: 700 }, false);
    assert.equal(vp.stagePadding, 8);
    assert.equal(vp.logicalWidth, 1280);
    assert.equal(vp.scale, 374 / 1280);
  });
});
