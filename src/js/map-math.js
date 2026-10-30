// Pure view maths for the map (unit-tested in tests/map-math.test.js).
import { MAP_W, MAP_H, clamp } from "./util.js";

export const MAX_ZOOM = 60;

/** Smallest scale (px per map unit) = whole world fits the container. */
export const minScale = (W, H) => Math.min(W / MAP_W, H / MAP_H);

/**
 * Keep the world rectangle inside the visible area.
 * view = {s, x, y}; x,y = map coordinates under the container's top-left corner.
 * ins = {top,right,bottom,left} are px covered by overlays (e.g. the bottom sheet).
 */
export function clampView(view, W, H, ins = {}) {
  const T = ins.top || 0, R = ins.right || 0, B = ins.bottom || 0, L = ins.left || 0;
  const s = clamp(view.s, minScale(W, H), minScale(W, H) * MAX_ZOOM);
  const axis = (v, size, lo, hi, total) => {
    const min = -lo / s, max = total - hi / s;
    return min > max ? (min + max) / 2 : clamp(v, min, max);
  };
  // Horizontally the world wraps around (v3.3): x is not limited, only normalised so that the centre of the visible
  // area stays in [0, MAP_W). The map draws three copies of the world, so the shift is invisible.
  const half = (W - L - R) / 2 / s;
  const cx = wrapX(view.x + (L / s) + half);
  return { s, x: cx - half - L / s, y: axis(view.y, H, T, H - B, MAP_H) };
}

/** Bring a map x coordinate into [0, MAP_W). */
export const wrapX = (x) => ((x % MAP_W) + MAP_W) % MAP_W;
/** The copy of x (x + k * MAP_W) that is closest to `ref`. */
export const nearX = (x, ref) => x + MAP_W * Math.round((ref - x) / MAP_W);

/** Scale so that `bounds` ([x0,y0,x1,y1]) fits the visible area, centred in it. */
export function fitView(bounds, W, H, ins = {}, { pad = 0.12, maxZoom = MAX_ZOOM } = {}) {
  const T = ins.top || 0, R = ins.right || 0, B = ins.bottom || 0, L = ins.left || 0;
  const vw = Math.max(40, W - L - R), vh = Math.max(40, H - T - B);
  const bw = Math.max(0.5, bounds[2] - bounds[0]), bh = Math.max(0.5, bounds[3] - bounds[1]);
  const min = minScale(W, H);
  const s = clamp(Math.min(vw / (bw * (1 + pad * 2)), vh / (bh * (1 + pad * 2))), min, min * maxZoom);
  const cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
  return clampView({ s, x: cx - (L + vw / 2) / s, y: cy - (T + vh / 2) / s }, W, H, ins);
}

/** Zoom by `factor` keeping the map point under (px,py) fixed. */
export function zoomAt(view, factor, px, py, W, H, ins = {}) {
  const s = clamp(view.s * factor, minScale(W, H), minScale(W, H) * MAX_ZOOM);
  const mx = view.x + px / view.s, my = view.y + py / view.s;
  return clampView({ s, x: mx - px / s, y: my - py / s }, W, H, ins);
}

/** Centre map point (mx,my) in the visible area at the current scale. */
export function centerOn(view, mx, my, W, H, ins = {}) {
  const T = ins.top || 0, R = ins.right || 0, B = ins.bottom || 0, L = ins.left || 0;
  const vw = W - L - R, vh = H - T - B;
  return clampView({ s: view.s, x: mx - (L + vw / 2) / view.s, y: my - (T + vh / 2) / view.s }, W, H, ins);
}

export const zoomOf = (view, W, H) => view.s / minScale(W, H);

/** Distance in screen px from a point to a country marker, ignoring its own half-size. */
export function nearestSmall(list, mx, my, s, maxPx, wrap = 0) {
  let best = null, bd = Infinity;
  for (const c of list) {
    const cx = wrap ? nearX(c.cx, mx) : c.cx; // with wrap, use the copy of the country nearest to the tap
    const d = Math.max(0, Math.hypot(cx - mx, c.cy - my) * s - (c.r * s));
    if (d < bd) { bd = d; best = c; }
  }
  return best && bd <= maxPx ? { item: best, dist: bd } : null;
}
