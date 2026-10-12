// Shared SVG world map with Pointer-Events gestures (mouse, pen, touch).
// One finger pans, two fingers pinch-zoom, double-tap zooms, wheel zooms at the cursor.
import { h, MAP_W, MAP_H, prefersReducedMotion } from "./util.js";
import { t } from "./i18n.js";
import { clampView, fitView, zoomAt, centerOn, zoomOf, minScale, nearestSmall, MAX_ZOOM } from "./map-math.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const TAP_PX = { mouse: 4, touch: 8, pen: 6 };
const TAP_MS = 350;
const SMALL_SCREEN_PX = 22;
const DOT_BELOW_PX = 12;   // a country drawn smaller than this on screen also gets a dot
const DOT_MIN_ZOOM = 2.5;  // dots appear once the map is zoomed in a little
const DOT_RADIUS_PX = 6;
const FORGIVE_PX = 16;
const NEAR_SMALL_PX = 10;
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * @param {HTMLElement} container
 * @param {{shapes:{i:string|null,d:string}[], countries:any[], label:(iso:string)=>string, tooltip?:boolean,
 *          onSelect?:(iso:string, pointerType:string)=>void, onView?:(info:{zoom:number,atMin:boolean,atMax:boolean})=>void,
 *          ariaLabel?:string}} opts
 */
export function createMapView(container, opts) {
  container.classList.add("map-stage");
  const svg = svgEl("svg", { class: "map-svg", viewBox: `0 0 ${MAP_W} ${MAP_H}`, "aria-hidden": "true", focusable: "false" });
  const land = svgEl("g", { class: "map-land" });
  const dotLayer = svgEl("g", { class: "map-dots" });
  const markerLayer = svgEl("g", { class: "map-markers" });
  svg.append(land, dotLayer, markerLayer);
  const paths = new Map(); // iso -> <path>
  const dots = new Map();  // iso -> <circle> (screen-sized badge for tiny countries)
  for (const s of opts.shapes) {
    const p = svgEl("path", { d: s.d, class: "map-shape" });
    if (s.i) { p.dataset.iso = s.i; paths.set(s.i, p); } else p.classList.add("is-extra");
    land.append(p);
  }
  const tip = h("div", { class: "map-tip", hidden: true, role: "presentation" });
  const controls = h("div", { class: "map-controls" });
  container.setAttribute("tabindex", "0");
  container.setAttribute("role", "group");
  container.setAttribute("aria-roledescription", "map");
  container.append(svg, tip, controls);

  // country geometry for forgiving taps / markers
  const info = new Map();
  const smalls = [];
  for (const c of opts.countries) {
    if (!c.centroid) continue;
    const bw = c.bbox ? c.bbox[2] - c.bbox[0] : 0, bh = c.bbox ? c.bbox[3] - c.bbox[1] : 0;
    const rec = { iso: c.iso3, cx: c.centroid[0], cy: c.centroid[1], bw, bh, r: Math.max(bw, bh) / 2, hasShape: !!c.hasShape, bbox: c.bbox };
    info.set(c.iso3, rec);
  }

  const dotCandidates = [];
  for (const r of info.values()) {
    if (r.hasShape && Math.max(r.bw, r.bh) > 14) continue; // can never be tiny enough
    const d = svgEl("circle", { cx: r.cx, cy: r.cy, r: 1, class: "map-dot is-hidden" });
    d.dataset.iso = r.iso;
    dots.set(r.iso, d); dotLayer.append(d); dotCandidates.push(r);
  }
  const el = (iso) => [paths.get(iso), dots.get(iso)].filter(Boolean);
  let lastDotScale = 0;

  let W = 0, H = 0;
  let view = { s: 1, x: 0, y: 0 };
  let ins = { top: 0, right: 0, bottom: 0, left: 0 };
  let userMoved = false;
  let lastFit = null; // bounds used for the current default framing
  let anim = null, raf = 0;
  const marks = new Map();
  let continentSet = new Set();
  let tapPrev = null, lastSmallScale = 0;

  const refreshSmalls = () => {
    smalls.length = 0;
    for (const r of info.values()) if (!r.hasShape || (r.bw * view.s < SMALL_SCREEN_PX && r.bh * view.s < SMALL_SCREEN_PX)) smalls.push(r);
    lastSmallScale = view.s;
  };

  function measure() {
    W = container.clientWidth; H = container.clientHeight;
    return W > 0 && H > 0;
  }

  function apply() {
    raf = 0;
    if (!W) return;
    view = clampView(view, W, H, ins);
    svg.setAttribute("viewBox", `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${(W / view.s).toFixed(2)} ${(H / view.s).toFixed(2)}`);
    updateMarkers();
    updateDots();
    const z = zoomOf(view, W, H);
    opts.onView?.({ zoom: z, atMin: z <= 1.001, atMax: z >= MAX_ZOOM - 0.001 });
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };

  /** Tiny countries get a badge of constant screen size so every country can be seen and tapped. */
  function updateDots() {
    if (view.s === lastDotScale) return;
    lastDotScale = view.s;
    const zoomOk = zoomOf(view, W, H) >= DOT_MIN_ZOOM;
    const rad = DOT_RADIUS_PX / view.s;
    for (const r of dotCandidates) {
      const on = zoomOk && (!r.hasShape || (r.bw * view.s < DOT_BELOW_PX && r.bh * view.s < DOT_BELOW_PX));
      const d = dots.get(r.iso);
      d.classList.toggle("is-hidden", !on);
      if (on) d.setAttribute("r", rad.toFixed(3));
    }
  }

  function updateMarkers() {
    markerLayer.replaceChildren();
    refreshSmalls();
    for (const [iso, kind] of marks) {
      const r = info.get(iso);
      if (!r || !smalls.includes(r)) continue;
      const rad = 12 / view.s;
      const g = svgEl("g", { class: `marker marker-${kind}`, transform: `translate(${r.cx} ${r.cy})` });
      g.append(svgEl("circle", { r: rad * 0.35, class: "marker-dot" }), svgEl("circle", { r: rad, class: "marker-ring", "stroke-width": 2.5 / view.s }));
      markerLayer.append(g);
    }
  }

  // ---------- animation ----------
  let animTarget = null;
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.id); anim = null; } }
  function goTo(target, animate = true) {
    stopAnim();
    target = clampView(target, W, H, ins);
    if (!animate || prefersReducedMotion() || !W) { view = target; apply(); return; }
    const from = { ...view };
    animTarget = target;
    const cx0 = from.x + W / 2 / from.s, cy0 = from.y + H / 2 / from.s;
    const cx1 = target.x + W / 2 / target.s, cy1 = target.y + H / 2 / target.s;
    const t0 = performance.now(), dur = 450;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = ease(p);
      const s = from.s * Math.pow(target.s / from.s, e);
      const cx = cx0 + (cx1 - cx0) * e, cy = cy0 + (cy1 - cy0) * e;
      view = { s, x: cx - W / 2 / s, y: cy - H / 2 / s };
      apply();
      if (p < 1) anim.id = requestAnimationFrame(step); else { anim = null; animTarget = null; }
    };
    anim = { id: requestAnimationFrame(step) };
  }

  /** Zoom buttons and slider anchor on the selected country when it is on screen, else on the centre. */
  function zoomAnchor(v) {
    const cx = ins.left + (W - ins.left - ins.right) / 2, cy = ins.top + (H - ins.top - ins.bottom) / 2;
    for (const [iso, kind] of marks) {
      if (kind !== "selected" && kind !== "pending") continue;
      const r = info.get(iso); if (!r) continue;
      const px = (r.cx - v.x) * v.s, py = (r.cy - v.y) * v.s;
      if (px > ins.left && px < W - ins.right && py > ins.top && py < H - ins.bottom) return [px, py];
    }
    return [cx, cy];
  }

  // ---------- public view operations ----------
  const api = {
    el: container, controls,
    paths,
    fitBounds(bounds, { animate = true, pad = 0.12, maxZoom = MAX_ZOOM, isDefault = true } = {}) {
      if (!measure()) return;
      if (isDefault) { lastFit = { bounds, pad, maxZoom }; userMoved = false; }
      goTo(fitView(bounds, W, H, ins, { pad, maxZoom }), animate);
    },
    fitCountry(iso, o = {}) {
      const r = info.get(iso); if (!r) return;
      const b = r.bbox || [r.cx - 1, r.cy - 1, r.cx + 1, r.cy + 1];
      const tiny = !r.hasShape || Math.max(r.bw, r.bh) < 6;
      api.fitBounds(b, { pad: 0.5, maxZoom: tiny ? MAX_ZOOM : 12, isDefault: false, ...o });
    },
    centerOn(iso, { animate = true } = {}) {
      const r = info.get(iso); if (!r || !measure()) return;
      goTo(centerOn(view, r.cx, r.cy, W, H, ins), animate);
    },
    reset(animate = true) {
      if (lastFit) api.fitBounds(lastFit.bounds, { ...lastFit, animate });
      else if (measure()) { userMoved = false; goTo(fitView([0, 0, MAP_W, MAP_H], W, H, ins, { pad: 0 }), animate); }
    },
    zoomBy(f, { animate = true } = {}) {
      if (!measure()) return;
      userMoved = true;
      const base = anim && animTarget ? animTarget : view; // rapid clicks keep compounding
      const [px, py] = zoomAnchor(base);
      goTo(zoomAt(base, f, px, py, W, H, ins), animate);
    },
    setZoom(z, { animate = false } = {}) { // z in [1, MAX_ZOOM] (slider)
      if (!measure()) return;
      userMoved = true;
      const [px, py] = zoomAnchor(view);
      goTo(zoomAt(view, (z * minScale(W, H)) / view.s, px, py, W, H, ins), animate);
    },
    setInsets(next) { ins = { top: 0, right: 0, bottom: 0, left: 0, ...next }; if (W) schedule(); },
    resize() {
      const cx = W ? view.x + (ins.left + (W - ins.left - ins.right) / 2) / view.s : MAP_W / 2;
      const cy = H ? view.y + (ins.top + (H - ins.top - ins.bottom) / 2) / view.s : MAP_H / 2;
      const first = !W;
      if (!measure()) return;
      if (first || (!userMoved && lastFit)) {
        if (lastFit) { view = fitView(lastFit.bounds, W, H, ins, lastFit); }
        else view = fitView([0, 0, MAP_W, MAP_H], W, H, ins, { pad: 0 });
      } else view = centerOn({ s: Math.max(view.s, minScale(W, H)) }, cx, cy, W, H, ins);
      apply();
    },
    /** Pan only if the country is near the edge of the visible area. */
    reveal(iso) {
      const r = info.get(iso); if (!r || !measure()) return;
      const px = (r.cx - view.x) * view.s, py = (r.cy - view.y) * view.s;
      const vw = W - ins.left - ins.right, vh = H - ins.top - ins.bottom;
      const mx = vw * 0.15, my = vh * 0.15;
      const inside = px > ins.left + mx && px < W - ins.right - mx && py > ins.top + my && py < H - ins.bottom - my;
      if (!inside) api.centerOn(iso);
    },
    setTooltip(on) { opts.tooltip = on; if (!on) tip.hidden = true; },
    hasUserMoved: () => userMoved,
    getView: () => ({ ...view, W, H }),
    // ----- state classes -----
    setContinent(isos) {
      for (const iso of continentSet) el(iso).forEach((n) => n.classList.remove("is-continent"));
      continentSet = new Set(isos);
      for (const iso of continentSet) el(iso).forEach((n) => n.classList.add("is-continent"));
    },
    setMark(iso, kind) { // kind: selected | correct | wrong | pending
      if (kind === "selected" || kind === "pending") for (const [k, v] of marks) if (v === kind) { marks.delete(k); el(k).forEach((n) => n.classList.remove(`is-${kind}`)); }
      marks.set(iso, kind);
      const p = paths.get(iso), d = dots.get(iso);
      if (p) { p.classList.add(`is-${kind}`); land.append(p); }
      if (d) { d.classList.add(`is-${kind}`); dotLayer.append(d); }
      updateMarkers();
    },
    clearMarks() {
      for (const [iso, kind] of marks) el(iso).forEach((n) => n.classList.remove(`is-${kind}`));
      marks.clear(); updateMarkers();
    },
    label: opts.label,
    destroy() { ro.disconnect(); stopAnim(); },
  };

  // ---------- buttons ----------
  const btn = (cls, key, svgPath, fn) => {
    const b = h("button", { type: "button", class: `map-btn ${cls}`, "data-i18n-aria-label": key, "data-i18n-title": key, "aria-label": t(key), title: t(key), onclick: fn });
    b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${svgPath}</svg>`;
    return b;
  };
  const zin = btn("map-zoom-in", "map.zoom.in", '<path d="M12 5v14M5 12h14"/>', () => api.zoomBy(1.7));
  const zout = btn("map-zoom-out", "map.zoom.out", '<path d="M5 12h14"/>', () => api.zoomBy(1 / 1.7));
  const zreset = btn("map-reset", "map.reset", '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', () => api.reset());
  const slider = h("input", { type: "range", class: "map-slider", min: 0, max: 100, step: 1, value: 0, "data-i18n-aria-label": "map.zoom", "aria-label": t("map.zoom") });
  slider.addEventListener("input", () => api.setZoom(Math.pow(MAX_ZOOM, slider.value / 100)));
  controls.append(zin, zout, zreset, slider);
  const baseOnView = opts.onView;
  opts.onView = (i) => {
    zin.disabled = i.atMax; zout.disabled = i.atMin;
    slider.value = String(Math.round((Math.log(i.zoom) / Math.log(MAX_ZOOM)) * 100));
    slider.setAttribute("aria-valuetext", `${i.zoom.toFixed(1)}×`);
    baseOnView?.(i);
  };

  // ---------- pointer gestures ----------
  const pointers = new Map();
  let pan = null;      // {lastX,lastY}
  let pinch = null;    // {d0,s0,mx,my}
  let tapOk = false, tapT0 = 0, tapStart = null, moving = false;
  const rectOf = () => container.getBoundingClientRect();
  const setMoving = (v) => { if (moving !== v) { moving = v; container.classList.toggle("is-moving", v); } };

  container.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(".map-controls")) return;
    if (!measure()) return;
    stopAnim();
    try { container.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    tip.hidden = true;
    if (pointers.size === 1) {
      tapOk = true; tapT0 = performance.now(); tapStart = { x: e.clientX, y: e.clientY, type: e.pointerType };
      pan = { lastX: e.clientX, lastY: e.clientY, started: false };
    } else if (pointers.size === 2) {
      tapOk = false; pan = null;
      const [a, b] = [...pointers.values()];
      const r = rectOf();
      const midX = (a.x + b.x) / 2 - r.left, midY = (a.y + b.y) / 2 - r.top;
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: view.s, mx: view.x + midX / view.s, my: view.y + midY / view.s };
    }
  });

  container.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) { hover(e); return; }
    p.x = e.clientX; p.y = e.clientY;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const r = rectOf();
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2 - r.left, midY = (a.y + b.y) / 2 - r.top;
      const s = pinch.s0 * (d / pinch.d0);
      view = { s, x: pinch.mx - midX / s, y: pinch.my - midY / s };
      userMoved = true; setMoving(true); schedule();
    } else if (pan && pointers.size === 1) {
      const slop = TAP_PX[p.type] ?? 8;
      if (!pan.started) {
        if (Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) <= slop) return;
        pan.started = true; tapOk = false;
        pan.lastX = e.clientX; pan.lastY = e.clientY; // drop the slop so the map does not jump
        return;
      }
      view = { s: view.s, x: view.x - (e.clientX - pan.lastX) / view.s, y: view.y - (e.clientY - pan.lastY) / view.s };
      pan.lastX = e.clientX; pan.lastY = e.clientY;
      userMoved = true; setMoving(true); schedule();
    }
  });

  const endPointer = (e, cancelled) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    try { container.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pointers.size === 0) {
      setMoving(false);
      const wasTap = tapOk && !cancelled && performance.now() - tapT0 <= TAP_MS;
      pan = null; pinch = null; tapOk = false;
      if (wasTap) handleTap(e.clientX, e.clientY, p.type);
    } else if (pointers.size === 1) {
      pinch = null; tapOk = false;
      const [q] = [...pointers.values()];
      pan = { lastX: q.x, lastY: q.y, started: true }; // continue as a pan with the remaining finger
    }
  };
  container.addEventListener("pointerup", (e) => endPointer(e, false));
  container.addEventListener("pointercancel", (e) => endPointer(e, true));
  container.addEventListener("lostpointercapture", (e) => { if (pointers.has(e.pointerId)) endPointer(e, true); });

  function handleTap(cx, cy, type) {
    const now = performance.now();
    const r = rectOf();
    const px = cx - r.left, py = cy - r.top;
    if (type !== "mouse" && tapPrev && now - tapPrev.t < 300 && Math.hypot(px - tapPrev.x, py - tapPrev.y) < 30) {
      tapPrev = null; userMoved = true;
      goTo(zoomAt(view, 2, px, py, W, H, ins));
      return;
    }
    tapPrev = { t: now, x: px, y: py };
    const hit = document.elementFromPoint(cx, cy)?.closest?.("[data-iso]")?.dataset.iso;
    const mx = view.x + px / view.s, my = view.y + py / view.s;
    refreshSmalls();
    // a tiny neighbour wins only when the tap landed on a larger shape (or on open sea)
    const hitIsSmall = !!hit && smalls.some((r) => r.iso === hit);
    const near = hitIsSmall ? null : nearestSmall(smalls, mx, my, view.s, hit ? NEAR_SMALL_PX : FORGIVE_PX);
    const iso = near ? near.item.iso : hit;
    if (iso) opts.onSelect?.(iso, type);
  }

  function hover(e) {
    if (opts.tooltip === false || e.pointerType !== "mouse" || moving) return;
    const iso = e.target.closest?.("[data-iso]")?.dataset.iso;
    if (!iso) { tip.hidden = true; return; }
    const r = rectOf();
    tip.textContent = opts.label(iso);
    tip.hidden = false;
    tip.style.left = `${Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 4)}px`;
    tip.style.top = `${Math.max(4, e.clientY - r.top - 34)}px`;
  }
  container.addEventListener("pointerleave", () => { tip.hidden = true; });

  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!measure()) return;
    stopAnim();
    const r = rectOf();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    userMoved = true;
    view = zoomAt(view, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX - r.left, e.clientY - r.top, W, H, ins);
    schedule();
  }, { passive: false });

  container.addEventListener("keydown", (e) => {
    if (e.target !== container) return;
    const step = 0.15;
    const mv = (dx, dy) => { userMoved = true; view = { ...view, x: view.x + (dx * W) / view.s, y: view.y + (dy * H) / view.s }; schedule(); e.preventDefault(); };
    switch (e.key) {
      case "ArrowLeft": mv(-step, 0); break;
      case "ArrowRight": mv(step, 0); break;
      case "ArrowUp": mv(0, -step); break;
      case "ArrowDown": mv(0, step); break;
      case "+": case "=": api.zoomBy(1.5); e.preventDefault(); break;
      case "-": case "_": api.zoomBy(1 / 1.5); e.preventDefault(); break;
      case "0": api.reset(); e.preventDefault(); break;
    }
  });

  const ro = new ResizeObserver(() => api.resize());
  ro.observe(container);
  return api;
}
