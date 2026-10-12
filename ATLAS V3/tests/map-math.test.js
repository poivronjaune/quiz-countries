import test from "node:test";
import assert from "node:assert/strict";
import { clampView, fitView, zoomAt, zoomOf, minScale, centerOn, nearestSmall, MAX_ZOOM } from "../src/js/map-math.js";

const W = 360, H = 500;
test("minScale fits the whole world", () => assert.equal(minScale(W, H), 360 / 960));
test("clampView keeps zoom within 1x..MAX_ZOOM", () => {
  assert.ok(Math.abs(zoomOf(clampView({ s: 0.0001, x: 0, y: 0 }, W, H), W, H) - 1) < 1e-9);
  assert.ok(Math.abs(zoomOf(clampView({ s: 999, x: 0, y: 0 }, W, H), W, H) - MAX_ZOOM) < 1e-9);
});
test("clampView does not leave the world when zoomed in", () => {
  const v = clampView({ s: minScale(W, H) * 4, x: -500, y: 900 }, W, H);
  assert.ok(v.x >= 0 && v.x <= 960 - W / v.s + 1e-9);
  assert.ok(v.y >= 0 && v.y <= 480 - H / v.s + 1e-9);
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
