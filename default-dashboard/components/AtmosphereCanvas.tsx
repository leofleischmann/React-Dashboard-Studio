import { useEffect, useRef } from 'react';

/**
 * Cinematic, fully hand-rolled <canvas> sky for the Home hero — NOT part of @ha/ui.
 * Everything you see is driven by live data: sun elevation paints the sky gradient
 * and moves the sun/moon disc, the weather condition swaps the particle system
 * (stars · rain · snow · fog · drifting cloud-haze) and the home's power draw makes
 * the whole scene breathe faster. Pointer movement parallaxes three depth layers.
 *
 * Pure Canvas 2D + requestAnimationFrame. This is the "wait, this is Home Assistant?"
 * piece — pure dashboard code, no card config anywhere.
 */

export type AtmoMode = 'clear' | 'rain' | 'snow' | 'fog' | 'clouds';

export interface AtmosphereInputs {
  /** Hour of day as a float (0..24) — drives the sky palette. */
  hour: number;
  /** Sun elevation in degrees (HA `sun.sun`), if available. */
  elevation?: number;
  /** Daylight progress 0..1 (sunrise→sunset) for the sun disc, if available. */
  dayProgress?: number;
  /** Weather particle system. */
  mode: AtmoMode;
  /** Normalised power draw 0..1 — scene "breathes" faster the more the home pulls. */
  energy: number;
  /** Theme accent (hex or rgb()) — tints the aurora ribbons. */
  accent: string;
  /** Pause heavy motion (respects prefers-reduced-motion / mobile). */
  calm?: boolean;
}

type RGB = [number, number, number];
interface P { x: number; y: number; z: number; r: number; a: number; ph: number; sp: number; }

const KEYS: ReadonlyArray<{ h: number; top: RGB; bot: RGB }> = [
  { h: 0, top: [10, 12, 30], bot: [26, 28, 60] },
  { h: 5, top: [22, 26, 70], bot: [54, 52, 104] },
  { h: 6.8, top: [58, 86, 168], bot: [247, 168, 116] },
  { h: 12, top: [60, 134, 230], bot: [168, 208, 244] },
  { h: 17.4, top: [54, 100, 184], bot: [250, 172, 110] },
  { h: 19.6, top: [42, 44, 100], bot: [214, 96, 84] },
  { h: 21, top: [16, 18, 44], bot: [32, 34, 68] },
  { h: 24, top: [10, 12, 30], bot: [26, 28, 60] },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function skyAt(hour: number): { top: RGB; bot: RGB } {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (h >= a.h && h <= b.h) {
      const t = (h - a.h) / (b.h - a.h || 1);
      return { top: mixRGB(a.top, b.top, t), bot: mixRGB(a.bot, b.bot, t) };
    }
  }
  return { top: KEYS[0].top, bot: KEYS[0].bot };
}

function parseColor(c: string, fallback: RGB): RGB {
  const s = (c || '').trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].every((n) => Number.isFinite(n))) return [r, g, b];
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(',').map((v) => parseFloat(v));
    if (p.length >= 3 && p.slice(0, 3).every((n) => Number.isFinite(n))) return [p[0], p[1], p[2]];
  }
  return fallback;
}

/** 0 = full daylight, 1 = deep night — from sun elevation, else the clock. */
function nightFactor(hour: number, elevation?: number): number {
  if (typeof elevation === 'number') return clamp01((6 - elevation) / 16);
  const h = ((hour % 24) + 24) % 24;
  if (h >= 8 && h <= 17) return 0;
  if (h >= 22 || h <= 4) return 1;
  if (h > 17) return clamp01((h - 17) / 5);
  return clamp01((8 - h) / 4);
}

export function AtmosphereCanvas({ inputs }: { inputs: AtmosphereInputs }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inRef = useRef(inputs);
  inRef.current = inputs;
  const ptr = useRef({ tx: 0, ty: 0, x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let stars: P[] = [];
    let rain: P[] = [];
    let snow: P[] = [];
    let fog: P[] = [];
    let bokeh: P[] = [];

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    function build() {
      const area = W * H;
      const nStars = Math.min(150, Math.round(area / 9000));
      const nRain = Math.min(220, Math.round(area / 5200));
      const nSnow = Math.min(120, Math.round(area / 9000));
      const nFog = Math.min(16, Math.round(area / 60000) + 6);
      const nBokeh = Math.min(26, Math.round(area / 42000) + 8);
      stars = Array.from({ length: nStars }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.92), z: rnd(0.2, 1), r: rnd(0.4, 1.7), a: rnd(0.3, 1), ph: rnd(0, 6.28), sp: rnd(0.6, 2.4) }));
      rain = Array.from({ length: nRain }, () => ({ x: rnd(0, W), y: rnd(0, H), z: rnd(0.45, 1), r: rnd(7, 17), a: rnd(0.18, 0.5), ph: 0, sp: rnd(620, 1180) }));
      snow = Array.from({ length: nSnow }, () => ({ x: rnd(0, W), y: rnd(0, H), z: rnd(0.35, 1), r: rnd(1.2, 3.6), a: rnd(0.45, 0.95), ph: rnd(0, 6.28), sp: rnd(26, 70) }));
      fog = Array.from({ length: nFog }, () => ({ x: rnd(0, W), y: rnd(H * 0.25, H), z: rnd(0.3, 1), r: rnd(120, 320), a: rnd(0.05, 0.14), ph: rnd(0, 6.28), sp: rnd(6, 20) }));
      bokeh = Array.from({ length: nBokeh }, () => ({ x: rnd(0, W), y: rnd(0, H), z: rnd(0.4, 1), r: rnd(10, 46), a: rnd(0.04, 0.13), ph: rnd(0, 6.28), sp: rnd(8, 22) }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      ptr.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      ptr.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    function onLeave() {
      ptr.current.tx = 0;
      ptr.current.ty = 0;
    }
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = performance.now();

    function draw(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const inp = inRef.current;
      const slow = inp.calm || reduce;

      ptr.current.x += (ptr.current.tx - ptr.current.x) * 0.06;
      ptr.current.y += (ptr.current.ty - ptr.current.y) * 0.06;
      const px = ptr.current.x;
      const py = ptr.current.y;

      const t = now / 1000;
      const energy = clamp01(inp.energy);
      const speed = slow ? 0.35 : 0.7 + energy * 1.1;
      const night = nightFactor(inp.hour, inp.elevation);
      const sky = skyAt(inp.hour);
      const accent = parseColor(inp.accent, [120, 150, 255]);

      // ── Sky ───────────────────────────────────────────────
      const g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgba(sky.top, 1));
      g.addColorStop(0.62, rgba(mixRGB(sky.top, sky.bot, 0.6), 1));
      g.addColorStop(1, rgba(sky.bot, 1));
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);

      // ── Far nebula blobs (parallax 0.16) ──────────────────
      ctx!.globalCompositeOperation = 'lighter';
      const neb: RGB[] = [accent, mixRGB(accent, [255, 120, 180], 0.5), mixRGB(accent, [80, 220, 220], 0.5)];
      for (let i = 0; i < 3; i++) {
        const nx = (0.24 + 0.3 * i + 0.04 * Math.sin(t * 0.05 + i)) * W + px * 26;
        const ny = (0.3 + 0.16 * Math.sin(t * 0.045 + i * 2)) * H + py * 18;
        const rr = (0.4 + 0.12 * i) * Math.min(W, H);
        const rg = ctx!.createRadialGradient(nx, ny, 0, nx, ny, rr);
        rg.addColorStop(0, rgba(neb[i], 0.16 + 0.08 * (1 - night)));
        rg.addColorStop(1, rgba(neb[i], 0));
        ctx!.fillStyle = rg;
        ctx!.fillRect(0, 0, W, H);
      }

      // ── Aurora ribbons (stronger at night/dusk) ───────────
      const auroraA = 0.04 + night * 0.16;
      if (auroraA > 0.02) {
        for (let b = 0; b < 3; b++) {
          ctx!.beginPath();
          const baseY = H * (0.2 + b * 0.16);
          const amp = H * (0.06 + b * 0.02);
          for (let x = -20; x <= W + 20; x += 16) {
            const y =
              baseY +
              Math.sin(x * 0.006 + t * (0.25 + b * 0.12) + b) * amp +
              Math.sin(x * 0.013 - t * 0.4) * amp * 0.4 +
              py * 14;
            if (x === -20) ctx!.moveTo(x, y);
            else ctx!.lineTo(x, y);
          }
          ctx!.strokeStyle = rgba(mixRGB(accent, [180, 255, 220], 0.35), auroraA);
          ctx!.lineWidth = 26 + b * 14;
          ctx!.stroke();
        }
      }

      // ── Sun / Moon disc ───────────────────────────────────
      const prog = typeof inp.dayProgress === 'number' ? clamp01(inp.dayProgress) : clamp01((inp.hour - 6.5) / 13.5);
      const discX = mix(0.12, 0.88, prog) * W - px * 14;
      const sunUp = night < 0.55;
      const discY = (sunUp ? mix(0.74, 0.2, Math.sin(Math.PI * prog)) : 0.26 + 0.05 * Math.sin(t * 0.1)) * H - py * 10;
      const discR = sunUp ? 30 : 22;
      const discCol: RGB = sunUp ? mixRGB([255, 236, 168], [255, 168, 96], night) : [226, 232, 255];
      const halo = ctx!.createRadialGradient(discX, discY, 0, discX, discY, discR * 6);
      halo.addColorStop(0, rgba(discCol, sunUp ? 0.5 : 0.32));
      halo.addColorStop(1, rgba(discCol, 0));
      ctx!.fillStyle = halo;
      ctx!.fillRect(0, 0, W, H);
      ctx!.beginPath();
      ctx!.arc(discX, discY, discR, 0, 6.2832);
      ctx!.fillStyle = rgba(discCol, sunUp ? 0.95 : 0.85);
      ctx!.fill();
      if (!sunUp) {
        ctx!.beginPath();
        ctx!.arc(discX + discR * 0.42, discY - discR * 0.28, discR * 0.92, 0, 6.2832);
        ctx!.globalCompositeOperation = 'destination-out';
        ctx!.fill();
        ctx!.globalCompositeOperation = 'lighter';
      }

      // ── Ambient stars / day motes (always present) ────────
      const starVis = inp.mode === 'fog' || inp.mode === 'clouds' ? 0.4 : 1;
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(t * s.sp + s.ph);
        const dayMote = 1 - night;
        const alpha = s.a * tw * (night * 0.95 + dayMote * 0.18) * starVis;
        if (alpha < 0.02) continue;
        const sx = s.x + px * 8 * s.z;
        const sy = s.y + py * 6 * s.z;
        const col: RGB = night > 0.5 ? [228, 234, 255] : mixRGB([255, 240, 210], accent, 0.3);
        ctx!.beginPath();
        ctx!.arc(sx, sy, s.r * (0.7 + tw * 0.5), 0, 6.2832);
        ctx!.fillStyle = rgba(col, alpha);
        ctx!.fill();
        if (!slow) {
          s.x += (0.15 + s.z * 0.3) * dt * 8;
          if (s.x > W + 4) s.x = -4;
        }
      }

      // ── Weather layer ─────────────────────────────────────
      if (inp.mode === 'rain') {
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.lineCap = 'round';
        for (const d of rain) {
          const len = d.r * (0.7 + d.z);
          const vx = 2.4 * d.z;
          const sx = d.x + px * 10 * d.z;
          ctx!.beginPath();
          ctx!.moveTo(sx, d.y);
          ctx!.lineTo(sx - vx, d.y + len);
          ctx!.strokeStyle = rgba([196, 214, 245], d.a * (0.5 + 0.5 * d.z));
          ctx!.lineWidth = 0.8 + d.z * 0.9;
          ctx!.stroke();
          d.y += d.sp * d.z * dt * speed;
          d.x -= vx * dt * 30 * speed;
          if (d.y > H + len) { d.y = -len; d.x = rnd(0, W); }
          if (d.x < -10) d.x = W + 10;
        }
        ctx!.globalCompositeOperation = 'lighter';
      } else if (inp.mode === 'snow') {
        for (const s of snow) {
          s.ph += dt * 0.7;
          const sx = s.x + Math.sin(s.ph) * 14 * s.z + px * 12 * s.z;
          ctx!.beginPath();
          ctx!.arc(sx, s.y, s.r * s.z, 0, 6.2832);
          ctx!.fillStyle = rgba([244, 248, 255], s.a * (0.4 + 0.6 * s.z));
          ctx!.fill();
          s.y += s.sp * s.z * dt * speed;
          if (s.y > H + 6) { s.y = -6; s.x = rnd(0, W); }
        }
      }

      if (inp.mode === 'fog' || inp.mode === 'clouds') {
        for (const f of fog) {
          const fx = f.x + px * 30 * f.z;
          const fg = ctx!.createRadialGradient(fx, f.y, 0, fx, f.y, f.r * f.z);
          const fogCol = inp.mode === 'clouds' ? mixRGB(sky.bot, [240, 240, 250], 0.5) : [222, 226, 236];
          fg.addColorStop(0, rgba(fogCol as RGB, f.a * 1.4));
          fg.addColorStop(1, rgba(fogCol as RGB, 0));
          ctx!.fillStyle = fg;
          ctx!.fillRect(fx - f.r, f.y - f.r, f.r * 2, f.r * 2);
          f.x += f.sp * dt * speed * 0.6;
          if (f.x - f.r > W) f.x = -f.r;
        }
      }

      // ── Near bokeh (parallax 0.6, energy-lit) ─────────────
      for (const b of bokeh) {
        b.ph += dt * 0.4;
        const bx = b.x + px * 60 * b.z + Math.sin(b.ph) * 8;
        const by = b.y + py * 46 * b.z;
        const a = b.a * (0.5 + 0.6 * (0.5 + 0.5 * Math.sin(b.ph * 1.7))) * (0.6 + energy * 0.8);
        const bg = ctx!.createRadialGradient(bx, by, 0, bx, by, b.r * b.z);
        bg.addColorStop(0, rgba(mixRGB(accent, [255, 255, 255], 0.4), a));
        bg.addColorStop(1, rgba(accent, 0));
        ctx!.fillStyle = bg;
        ctx!.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2);
        b.y -= (4 + b.z * 10) * dt * speed;
        if (b.y < -b.r) { b.y = H + b.r; b.x = rnd(0, W); }
      }

      // ── Energy pulse + vignette ───────────────────────────
      ctx!.globalCompositeOperation = 'source-over';
      const pulse = 0.5 + 0.5 * Math.sin(t * (1.4 + energy * 3));
      const vig = ctx!.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.2, W / 2, H * 0.55, Math.max(W, H) * 0.75);
      vig.addColorStop(0, rgba(mixRGB(accent, [0, 0, 0], 0.7), 0));
      vig.addColorStop(1, `rgba(0,0,0,${0.18 + night * 0.22 + energy * pulse * 0.06})`);
      ctx!.fillStyle = vig;
      ctx!.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="rd-atmo" aria-hidden />;
}
