import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  FogExp2,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  TorusGeometry,
  TorusKnotGeometry,
  WebGLRenderer,
} from 'three';
import { useDarkMode, useEntity } from '../../hass/hooks';
import { useTheme } from '../../hass/theme';
import type { HassEntity } from '../../hass/types';
import { entityDisplayName, num, power } from '../../format';

const CANVAS_HEIGHT = 236;

function intensityFromEntity(entity: HassEntity | undefined): number {
  if (!entity) return 0.35;
  const v = Number.parseFloat(entity.state);
  if (Number.isNaN(v) || v < 0) return 0.15;

  const dc = entity.attributes.device_class as string | undefined;
  if (dc === 'power') return Math.min(1, Math.max(0.06, v / 4500));
  const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
  if (unit === 'w' || unit === 'kw') {
    const watts = unit === 'kw' ? v * 1000 : v;
    return Math.min(1, Math.max(0.06, watts / 4500));
  }
  return Math.min(1, Math.max(0.1, v / 100));
}

function formatReading(entity: HassEntity | undefined): string {
  if (!entity) return 'Demo-Modus';
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

/**
 * WebGL energy reactor (Three.js) — torus knot + particle field, driven by power sensor.
 */
export function EnergyScene3D({ entityId }: { entityId: string }) {
  const entity = useEntity(entityId);
  const dark = useDarkMode();
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState>({ intensity: 0.35, dark: false, primary: '#4f7cff' });

  const intensity = useMemo(() => intensityFromEntity(entity), [entity]);
  const label = entityDisplayName(entity, entityId);

  useEffect(() => {
    stateRef.current = { intensity, dark, primary: theme.primary };
  }, [intensity, dark, theme.primary]);

  useEffect(() => {
    console.log('[Debug EnergyScene3D]:', { entityId, state: entity?.state, intensity });
  }, [entityId, entity?.state, intensity]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 1);
    const isDark = stateRef.current.dark;
    const scene = new Scene();
    scene.fog = new FogExp2(isDark ? 0x060a12 : 0xe4e9f5, 0.038);

    const camera = new PerspectiveCamera(42, width / CANVAS_HEIGHT, 0.1, 80);
    camera.position.set(0, 0.35, 4.6);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, CANVAS_HEIGHT);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(isDark ? 0x060a12 : 0xe4e9f5, isDark ? 1 : 0);
    container.appendChild(renderer.domElement);

    const knotGeo = new TorusKnotGeometry(0.52, 0.15, 160, 28);
    const knotMat = new MeshStandardMaterial({
      color: 0x4f7cff,
      emissive: 0x1a3388,
      emissiveIntensity: 0.9,
      metalness: 0.88,
      roughness: 0.22,
    });
    const knot = new Mesh(knotGeo, knotMat);
    scene.add(knot);

    const coreGeo = new IcosahedronGeometry(0.26, 2);
    const coreMat = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x88bbff,
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.08,
    });
    const core = new Mesh(coreGeo, coreMat);
    scene.add(core);

    const ringGeo = new TorusGeometry(1.05, 0.014, 10, 96);
    const ringMat = new MeshBasicMaterial({
      color: 0x6ea8fe,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    const ring2 = ring.clone();
    ring2.scale.setScalar(1.18);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 5;
    scene.add(ring2);

    const particleCount = 640;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.1 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particlesGeo = new BufferGeometry();
    particlesGeo.setAttribute('position', new BufferAttribute(positions, 3));
    const particlesMat = new PointsMaterial({
      size: 0.028,
      color: 0x6ea8fe,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const particles = new Points(particlesGeo, particlesMat);
    scene.add(particles);

    scene.add(new AmbientLight(0x334466, 0.45));
    const keyLight = new PointLight(0x6ea8fe, 2.2, 14);
    keyLight.position.set(2.5, 1.8, 3.5);
    const rimLight = new PointLight(0xff9955, 0.7, 12);
    rimLight.position.set(-2.2, -0.5, 2.5);
    scene.add(keyLight, rimLight);

    const clock = new Clock();
    let raf = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const { intensity: i, dark: isDark, primary: primaryCss } = stateRef.current;
      const speed = 0.45 + i * 1.8;

      knot.rotation.x = elapsed * 0.22 * speed;
      knot.rotation.y = elapsed * 0.38 * speed;
      core.rotation.x = elapsed * 0.55 * speed;
      core.rotation.y = elapsed * 0.72 * speed;
      ring.rotation.z = elapsed * 0.28 * speed;
      ring2.rotation.y = elapsed * -0.2 * speed;
      particles.rotation.y = elapsed * 0.06 * speed;

      const accent = new Color(primaryCss);
      const hot = accent.clone().lerp(new Color(0xff6622), i * 0.65);
      knotMat.color.copy(hot);
      knotMat.emissive.copy(hot).multiplyScalar(0.35);
      knotMat.emissiveIntensity = 0.55 + i * 1.4;
      coreMat.emissive.copy(accent);
      coreMat.emissiveIntensity = 0.9 + i * 2.2;
      keyLight.intensity = 1.4 + i * 3.5;
      keyLight.color.copy(hot);
      rimLight.intensity = 0.35 + i * 1.1;
      particlesMat.color.copy(accent);
      ringMat.color.copy(accent);

      const bg = isDark ? 0x060a12 : 0xe4e9f5;
      scene.fog!.color.setHex(bg);
      renderer.setClearColor(bg, isDark ? 1 : 0);

      camera.position.x = Math.sin(elapsed * 0.18) * 0.35;
      camera.position.y = 0.35 + Math.sin(elapsed * 0.14) * 0.12;
      camera.lookAt(0, 0, 0);

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

    console.log('[Debug EnergyScene3D]: WebGL scene initialized');

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.remove();
      knotGeo.dispose();
      knotMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ring2.geometry.dispose();
      (ring2.material as MeshBasicMaterial).dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, [entityId]);

  const style = { '--es3d-accent': theme.primary } as CSSProperties;

  return (
    <div className="rd-energy3d" style={style}>
      <div ref={containerRef} className="rd-energy3d__canvas" />
      <div className="rd-energy3d__footer">
        <strong>{formatReading(entity)}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
