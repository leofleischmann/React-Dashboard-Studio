import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import {
  Clock,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { useDarkMode, useEntity } from '../../hass/hooks';
import { useTheme } from '../../hass/theme';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, power, stateNumber } from '../../format';
import './EnergyScene3D.css';

const CANVAS_HEIGHT = 220;

export type OrbCurve = 'linear' | 'sqrt';

/** Map a numeric reading to orb intensity 0…1 (with a small floor for visibility). */
export function mapToIntensity(
  value: number | undefined,
  min: number,
  max: number,
  curve: OrbCurve = 'sqrt',
): number {
  if (value === undefined || Number.isNaN(value)) return 0.1;
  const span = max - min;
  if (span <= 0) return 0.1;
  const t = Math.min(1, Math.max(0, (value - min) / span));
  const curved = curve === 'sqrt' ? Math.sqrt(t) : t;
  return Math.max(0.06, curved);
}

function intensityFromEntity(
  entity: HassEntity | undefined,
  min: number,
  max: number,
  curve: OrbCurve,
): number {
  return mapToIntensity(stateNumber(entity), min, max, curve);
}

export function intensityLevelLabel(intensity: number): string {
  if (intensity < 0.22) return 'Niedrig';
  if (intensity < 0.48) return 'Mittel';
  if (intensity < 0.72) return 'Hoch';
  return 'Sehr hoch';
}

/**
 * Heuristic min/max for gallery demos — always set explicit min/max in your dashboard code.
 */
export function suggestOrbRange(entity?: HassEntity): { min: number; max: number } {
  if (!entity) return { min: 0, max: 100 };

  const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
  const dc = entity.attributes.device_class as string | undefined;

  if (dc === 'power' || unit === 'w' || unit === 'kw') {
    return { min: 0, max: 4500 };
  }
  if (unit === '%') {
    return { min: 0, max: 100 };
  }

  const attrMin = entity.attributes.min;
  const attrMax = entity.attributes.max;
  if (typeof attrMin === 'number' && typeof attrMax === 'number' && attrMax > attrMin) {
    return { min: attrMin, max: attrMax };
  }

  const v = stateNumber(entity);
  if (v !== undefined) {
    const ceiling = Math.max(100, Math.abs(v) * 1.5);
    return { min: 0, max: ceiling };
  }

  return { min: 0, max: 100 };
}

export type EnergyScene3DProps = {
  entityId: string;
  /** Lower bound of the value range mapped to the orb (default 0). */
  min?: number;
  /** Upper bound of the value range mapped to the orb (default 100). */
  max?: number;
  /** `sqrt` eases mid-range; `linear` is a straight mapping. */
  curve?: OrbCurve;
  /** Show intensity tier under the reading (default true). */
  showLevel?: boolean;
};

function formatReading(entity: HassEntity | undefined): string {
  if (!entity) return '—';
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v)) return entity.state;
  if (entity.attributes.device_class === 'power') return power(v);
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  return unit ? `${num(v, 1)} ${unit}` : num(v, 1);
}

type SceneState = {
  intensity: number;
  dark: boolean;
  primary: string;
};

function wireOrb(
  radius: number,
  detail: number,
  color: number,
  opacity: number,
): { mesh: LineSegments; geo: IcosahedronGeometry; edges: EdgesGeometry; mat: LineBasicMaterial } {
  const geo = new IcosahedronGeometry(radius, detail);
  const edges = new EdgesGeometry(geo, 12);
  const mat = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new LineSegments(edges, mat);
  return { mesh, geo, edges, mat };
}

/**
 * Calm wireframe orb — any numeric entity state mapped to 0…1 via min/max.
 */
export function EnergyScene3D({
  entityId,
  min = 0,
  max = 100,
  curve = 'sqrt',
  showLevel = true,
}: EnergyScene3DProps) {
  const entity = useEntity(entityId);
  const dark = useDarkMode();
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState>({ intensity: 0.2, dark: false, primary: '#4f7cff' });
  const smoothIntensityRef = useRef(0.2);

  const intensity = useMemo(
    () => intensityFromEntity(entity, min, max, curve),
    [entity, min, max, curve],
  );
  const label = entityDisplayName(entity, entityId);
  const level = intensityLevelLabel(intensity);
  const rawValue = stateNumber(entity);

  useEffect(() => {
    stateRef.current = { intensity, dark, primary: theme.primary };
  }, [intensity, dark, theme.primary]);

  useEffect(() => {
    console.log('[Debug EnergyScene3D]:', {
      entityId,
      raw: rawValue,
      min,
      max,
      curve,
      intensity: intensity.toFixed(2),
      level,
    });
  }, [entityId, rawValue, min, max, curve, intensity, level]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = Math.max(container.clientWidth, 1);
    const scene = new Scene();

    const camera = new PerspectiveCamera(40, width / CANVAS_HEIGHT, 0.1, 20);
    camera.position.set(0, 0.05, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, CANVAS_HEIGHT);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const accent = new Color(stateRef.current.primary);
    const outer = wireOrb(0.7, 2, accent.getHex(), 0.72);
    const inner = wireOrb(0.38, 1, accent.getHex(), 0.38);

    const orbGroup = new Group();
    orbGroup.add(outer.mesh, inner.mesh);
    scene.add(orbGroup);

    const clock = new Clock();
    let raf = 0;
    let disposed = false;
    const tint = new Color();
    const warm = new Color(0xe8a060);
    smoothIntensityRef.current = stateRef.current.intensity;

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      smoothIntensityRef.current +=
        (stateRef.current.intensity - smoothIntensityRef.current) * 0.035;
      const i = smoothIntensityRef.current;
      const { primary } = stateRef.current;

      tint.set(primary).lerp(warm, i * 0.45);

      const baseScale = 0.94 + i * 0.14;

      if (reducedMotion) {
        orbGroup.scale.setScalar(baseScale);
        outer.mat.color.copy(tint);
        outer.mat.opacity = 0.5 + i * 0.4;
        inner.mat.color.copy(tint);
        inner.mat.opacity = 0.22 + i * 0.25;
      } else {
        const breatheHz = 0.28 + i * 0.38;
        const breathe = Math.sin(elapsed * breatheHz * Math.PI * 2);
        const scale = baseScale + breathe * (0.012 + i * 0.028);

        orbGroup.scale.setScalar(scale);
        orbGroup.rotation.y = elapsed * 0.07;
        inner.mesh.rotation.y = -elapsed * 0.11;
        inner.mesh.rotation.x = elapsed * 0.05;

        outer.mat.color.copy(tint);
        outer.mat.opacity = 0.48 + i * 0.38 + breathe * 0.05;
        inner.mat.color.copy(tint);
        inner.mat.opacity = 0.2 + i * 0.22 + breathe * 0.04;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = Math.max(container.clientWidth, 1);
      camera.aspect = w / CANVAS_HEIGHT;
      camera.updateProjectionMatrix();
      renderer.setSize(w, CANVAS_HEIGHT);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    console.log('[Debug EnergyScene3D]: wireframe orb initialized', { reducedMotion, min, max });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.remove();
      for (const layer of [outer, inner]) {
        layer.geo.dispose();
        layer.edges.dispose();
        layer.mat.dispose();
      }
      renderer.dispose();
    };
  }, [entityId, min, max]);

  const style = {
    '--es3d-accent': theme.primary,
    '--es3d-pulse': String(0.2 + intensity * 0.5),
  } as CSSProperties;

  return (
    <div className={`rd-energy3d${dark ? ' rd-energy3d--dark' : ''}`} style={style}>
      <div
        ref={containerRef}
        className="rd-energy3d__canvas"
        aria-hidden
        title={showLevel ? `${formatReading(entity)} — ${level}` : formatReading(entity)}
      />
      <div className="rd-energy3d__footer">
        <strong>{formatReading(entity)}</strong>
        {showLevel && <span className="rd-energy3d__load">{level}</span>}
        <small>{label}</small>
      </div>
    </div>
  );
}
