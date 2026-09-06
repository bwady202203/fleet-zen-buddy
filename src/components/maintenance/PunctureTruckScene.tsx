import { Canvas, ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useState } from "react";
import { tireLabel } from "./TireChangeDialog";

export interface PunctureTirePosition {
  id: string;
  label: string;
  shortLabel: string;
  position: [number, number, number];
}

export const PUNCTURE_TIRE_POSITIONS: PunctureTirePosition[] = [
  { id: "F1R", label: "الأمامي يمين", shortLabel: "أ ي", position: [-1.55, 0.52, -4.25] },
  { id: "F1L", label: "الأمامي يسار", shortLabel: "أ س", position: [1.55, 0.52, -4.25] },
  { id: "R1RO", label: "الخلفي 1 يمين خارجي", shortLabel: "1 ي خ", position: [-2.22, 0.52, 0.65] },
  { id: "R1RI", label: "الخلفي 1 يمين داخلي", shortLabel: "1 ي د", position: [-1.72, 0.52, 0.65] },
  { id: "R1LI", label: "الخلفي 1 يسار داخلي", shortLabel: "1 س د", position: [1.72, 0.52, 0.65] },
  { id: "R1LO", label: "الخلفي 1 يسار خارجي", shortLabel: "1 س خ", position: [2.22, 0.52, 0.65] },
  { id: "R2RO", label: "الخلفي 2 يمين خارجي", shortLabel: "2 ي خ", position: [-2.22, 0.52, 2.35] },
  { id: "R2RI", label: "الخلفي 2 يمين داخلي", shortLabel: "2 ي د", position: [-1.72, 0.52, 2.35] },
  { id: "R2LI", label: "الخلفي 2 يسار داخلي", shortLabel: "2 س د", position: [1.72, 0.52, 2.35] },
  { id: "R2LO", label: "الخلفي 2 يسار خارجي", shortLabel: "2 س خ", position: [2.22, 0.52, 2.35] },
  { id: "R3RO", label: "الخلفي 3 يمين خارجي", shortLabel: "3 ي خ", position: [-2.22, 0.52, 4.05] },
  { id: "R3RI", label: "الخلفي 3 يمين داخلي", shortLabel: "3 ي د", position: [-1.72, 0.52, 4.05] },
  { id: "R3LI", label: "الخلفي 3 يسار داخلي", shortLabel: "3 س د", position: [1.72, 0.52, 4.05] },
  { id: "R3LO", label: "الخلفي 3 يسار خارجي", shortLabel: "3 س خ", position: [2.22, 0.52, 4.05] },
];

export const punctureTireLabel = (id: string) =>
  PUNCTURE_TIRE_POSITIONS.find((tire) => tire.id === id)?.label || tireLabel(id);

interface SceneColors {
  body: string;
  bodyDark: string;
  glass: string;
  tire: string;
  rim: string;
  selected: string;
  floor: string;
}

const DEFAULT_COLORS: SceneColors = {
  body: "hsl(217 91% 60%)",
  bodyDark: "hsl(217 75% 40%)",
  glass: "hsl(199 70% 78%)",
  tire: "hsl(220 15% 16%)",
  rim: "hsl(214 18% 72%)",
  selected: "hsl(142 76% 42%)",
  floor: "hsl(210 32% 94%)",
};

const readSceneColors = (): SceneColors => {
  if (typeof document === "undefined") return DEFAULT_COLORS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value ? `hsl(${value.split(/\s+/).join(", ")})` : fallback;
  };
  return {
    body: read("--truck-body", DEFAULT_COLORS.body),
    bodyDark: read("--truck-body-dark", DEFAULT_COLORS.bodyDark),
    glass: read("--truck-glass", DEFAULT_COLORS.glass),
    tire: read("--truck-tire", DEFAULT_COLORS.tire),
    rim: read("--truck-rim", DEFAULT_COLORS.rim),
    selected: read("--truck-selected", DEFAULT_COLORS.selected),
    floor: read("--truck-floor", DEFAULT_COLORS.floor),
  };
};

interface TireProps {
  tire: PunctureTirePosition;
  selected: boolean;
  colors: SceneColors;
  onToggle: (id: string) => void;
}

const Tire = ({ tire, selected, colors, onToggle }: TireProps) => {
  const [hovered, setHovered] = useState(false);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onToggle(tire.id);
  };

  return (
    <group position={tire.position}>
      <mesh
        rotation-z={Math.PI / 2}
        scale={hovered || selected ? 1.12 : 1}
        castShadow
        onClick={handleClick}
        onPointerEnter={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <cylinderGeometry args={[0.47, 0.47, 0.42, 24]} />
        <meshStandardMaterial
          color={selected ? colors.selected : colors.tire}
          emissive={selected ? colors.selected : colors.tire}
          emissiveIntensity={selected ? 0.34 : hovered ? 0.08 : 0}
          roughness={0.72}
        />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position={[tire.position[0] < 0 ? -0.225 : 0.225, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 20]} />
        <meshStandardMaterial color={colors.rim} metalness={0.75} roughness={0.22} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.43, 0]}>
          <ringGeometry args={[0.5, 0.64, 28]} />
          <meshBasicMaterial color={colors.selected} transparent opacity={0.82} />
        </mesh>
      )}
    </group>
  );
};

interface TruckModelProps {
  selectedTires: string[];
  onToggle: (id: string) => void;
  colors: SceneColors;
}

const TruckModel = ({ selectedTires, onToggle, colors }: TruckModelProps) => (
  <group rotation-y={Math.PI} position={[0, 0, 0.2]}>
    <RoundedBox args={[3.15, 0.72, 6.7]} radius={0.18} smoothness={4} position={[0, 0.96, 1.55]} castShadow>
      <meshStandardMaterial color={colors.bodyDark} metalness={0.4} roughness={0.38} />
    </RoundedBox>
    <RoundedBox args={[3.28, 1.36, 2.4]} radius={0.32} smoothness={5} position={[0, 1.42, -3.2]} castShadow>
      <meshStandardMaterial color={colors.body} metalness={0.36} roughness={0.3} />
    </RoundedBox>
    <RoundedBox args={[2.76, 0.55, 1.22]} radius={0.2} smoothness={4} position={[0, 2.06, -3.42]} castShadow>
      <meshStandardMaterial color={colors.body} metalness={0.34} roughness={0.3} />
    </RoundedBox>
    <RoundedBox args={[2.62, 0.09, 0.82]} radius={0.08} smoothness={3} position={[0, 2.37, -3.57]}>
      <meshPhysicalMaterial color={colors.glass} metalness={0.15} roughness={0.12} clearcoat={0.75} />
    </RoundedBox>
    <RoundedBox args={[2.72, 0.12, 5.8]} radius={0.1} smoothness={3} position={[0, 1.39, 1.65]} castShadow>
      <meshStandardMaterial color={colors.rim} metalness={0.72} roughness={0.25} />
    </RoundedBox>
    <mesh position={[0, 0.58, -4.55]} castShadow>
      <boxGeometry args={[3.48, 0.24, 0.24]} />
      <meshStandardMaterial color={colors.rim} metalness={0.82} roughness={0.18} />
    </mesh>
    {[-4.25, 0.65, 2.35, 4.05].map((z) => (
      <mesh key={z} rotation-z={Math.PI / 2} position={[0, 0.52, z]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 3.85, 16]} />
        <meshStandardMaterial color={colors.rim} metalness={0.8} roughness={0.24} />
      </mesh>
    ))}
    {PUNCTURE_TIRE_POSITIONS.map((tire) => (
      <Tire
        key={tire.id}
        tire={tire}
        selected={selectedTires.includes(tire.id)}
        colors={colors}
        onToggle={onToggle}
      />
    ))}
  </group>
);

interface Props {
  selectedTires: string[];
  onToggle: (id: string) => void;
}

export const PunctureTruckScene = ({ selectedTires, onToggle }: Props) => {
  const [colors, setColors] = useState(DEFAULT_COLORS);

  useEffect(() => {
    setColors(readSceneColors());
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <div className="h-[440px] w-full overflow-hidden rounded-lg border bg-muted/30 sm:h-[520px]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        orthographic
        camera={{ position: [0, 19, 4.5], zoom: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.5, 0);
          gl.toneMappingExposure = 0.72;
        }}
      >
        <ambientLight intensity={0.48} />
        <hemisphereLight args={[colors.glass, colors.floor, 0.54]} />
        <directionalLight
          position={[7, 13, -7]}
          intensity={1.45}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <TruckModel selectedTires={selectedTires} onToggle={onToggle} colors={colors} />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[13, 15]} />
          <meshStandardMaterial color={colors.floor} roughness={0.92} />
        </mesh>
        <ContactShadows position={[0, 0.035, 0]} opacity={0.34} scale={13} blur={2.4} far={6} />
        <Environment resolution={64}>
          <Lightformer intensity={0.8} position={[0, 7, -5]} scale={[9, 3, 1]} />
          <Lightformer intensity={0.5} position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
};