import test from "node:test";
import assert from "node:assert/strict";
import { clampView, fitView, zoomAt, zoomOf, minScale, centerOn, nearestSmall, wrapX, nearX, MAX_ZOOM } from "../src/js/map-math.js";

const W = 360, H = 500;
test("minScale fits the whole world", () => assert.equal(minScale(W, H), 360 / 960));
test("clampView keeps zoom within 1x..MAX_ZOOM", () => {
  assert.ok(Math.abs(zoomOf(clampView({ s: 0.0001, x: 0, y: 0 }, W, H), W, H) - 1) < 1e-9);
  assert.ok(Math.abs(zoomOf(clampView({ s: 999, x: 0, y: 0 }, W, H), W, H) - MAX_ZOOM) < 1e-9);
});
test("clampView limits the vertical range but wraps horizontally", () => {
  const v = clampView({ s: minScale(W, H) * 4, x: -500, y: 900 }, W, H);
  assert.ok(v.y >= 0 && v.y <= 480 - H / v.s + 1e-9);
  const cx = v.x + W / 2 / v.s;
  assert.ok(cx >= 0 && cx < 960); // centre of the view is normalised into one world width
});
test("wrapping horizontally shows the same place: x and x + 960 give the same view", () => {
  const a = clampView({ s: minScale(W, H) * 4, x: 100, y: 50 }, W, H);
  const b = clampView({ s: minScale(W, H) * 4, x: 100 + 960 * 3, y: 50 }, W, H);
  const c = clampView({ s: minScale(W, H) * 4, x: 100 - 960, y: 50 }, W, H);
  assert.ok(Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.x - c.x) < 1e-6);
});
test("panning right past the east edge continues onto the west edge", () => {
  const s = minScale(W, H) * 4;
  const v = clampView({ s, x: 960 - W / s / 2 + 50, y: 100 }, W, H); // centre is 50 units past the east edge
  assert.ok(Math.abs(v.x + W / 2 / s - 50) < 1e-6);
});
test("wrapX and nearX", () => {
  assert.equal(wrapX(-10), 950); assert.equal(wrapX(970), 10); assert.equal(wrapX(480), 480);
  assert.equal(nearX(53, 1000), 1013); // Cook Islands seen from the east of Fiji
  assert.equal(nearX(900, 50), -60);
});
test("fitView can frame bounds that cross the east edge (Oceania with the Cook Islands)", () => {
  const v = fitView([760, 200, 1013, 300], 1000, 500); // x1 > 960
  const cx = v.x + 500 / v.s;
  assert.ok(Math.abs(cx - 886.5) < 1e-6); // centre of [760, 1013], normalised into [0, 960)
  assert.ok((1013 - 760) * v.s <= 1000); // the whole span fits on screen
});
test("bottom inset lets the map's bottom edge sit above the sheet", () => {
  const ins = { bottom: 100 };
  const v = clampView({ s: minScale(W, 600) * 4, x: 0, y: 9999 }, W, 600, ins);
  assert.ok(Math.abs((480 - v.y) * v.s - 500) < 1e-6); // map bottom at px 500 = H - 100
});
test("fitView centres bounds in the visible area", () => {
  const v = fitView([400, 100, 500, 200], W, H, { bottom: 100 });
  const cx = v.x + (W / 2) / v.s, cy = v.y + ((H - 100) / 2) / v.s;
  assert.ok(Math.abs(cx - 450) < 1e-6 && Math.abs(cy - 150) < 1e-6);
});
test("zoomAt keeps the anchored point fixed", () => {
  const v0 = fitView([300, 100, 600, 300], W, H);
  const px = 120, py = 200;
  const before = [v0.x + px / v0.s, v0.y + py / v0.s];
  const v1 = zoomAt(v0, 1.5, px, py, W, H);
  assert.ok(Math.abs(v1.x + px / v1.s - before[0]) < 1e-6 && Math.abs(v1.y + py / v1.s - before[1]) < 1e-6);
});
test("centerOn puts the point in the middle", () => {
  const v = centerOn({ s: minScale(W, H) * 6 }, 480, 240, W, H);
  assert.ok(Math.abs(v.x + W / 2 / v.s - 480) < 1e-6);
});
test("nearestSmall picks the closest marker within range", () => {
  const list = [{ iso: "A", cx: 100, cy: 100, r: 0 }, { iso: "B", cx: 110, cy: 100, r: 0 }];
  assert.equal(nearestSmall(list, 108, 100, 2, 16).item.iso, "B");
  assert.equal(nearestSmall(list, 300, 300, 2, 16), null);
});
test("nearestSmall wraps: a tap near the west edge finds a small country just east of the seam", () => {
  const list = [{ iso: "COK", cx: 953, cy: 300, r: 0 }];
  assert.equal(nearestSmall(list, -2, 300, 4, 20, 960).item.iso, "COK");
  assert.equal(nearestSmall(list, -2, 300, 4, 20), null);
});
