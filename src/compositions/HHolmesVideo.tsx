import { Composition, AbsoluteFill, useVideoConfig } from "remotion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html, Environment } from "@react-three/drei";
import { useRemotionTiming, useInterpolate } from "@/hooks/useRemotion";

export function HHolmesVideo({ width, height }: { width: number; height: number }) {
  const { frame, fps, durationInFrames } = useVideoConfig();
  const { progress, time } = useRemotionTiming();

  // ===== CAMERA ANIMATIONS (Simplified) =====
  const cameraZ = useInterpolate(
    [
      { frame: 0, value: 25 },
      { frame: 90, value: 10 },
      { frame: 450, value: 5 },
      { frame: 1500, value: 3 },
      { frame: 2400, value: 4 },
      { frame: 3000, value: 6 },
      { frame: 3600, value: 25 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraY = useInterpolate(
    [
      { frame: 0, value: 6 },
      { frame: 90, value: 2.5 },
      { frame: 450, value: 2.5 },
      { frame: 1500, value: 1.6 },
      { frame: 2400, value: 1.6 },
      { frame: 3000, value: 2.5 },
      { frame: 3600, value: 8 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraX = useInterpolate(
    [
      { frame: 0, value: 0 },
      { frame: 450, value: -3 },
      { frame: 1500, value: -3 },
      { frame: 2400, value: 0 },
      { frame: 3000, value: 2 },
      { frame: 3600, value: 0 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraFov = useInterpolate(
    [
      { frame: 0, value: 40 },
      { frame: 450, value: 55 },
      { frame: 3600, value: 40 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ===== SCENE STATE =====
  const castleRotation = useInterpolate(
    [{ frame: 0, value: 0 }, { frame: durationInFrames, value: Math.PI * 0.1 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const corridorDepth = useInterpolate(
    [{ frame: 450, value: 0 }, { frame: 1500, value: -30 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase booleans
  const isExterior = frame < 450;
  const isInterior = frame >= 450 && frame < 2400;
  const isGasChamber = frame >= 1800 && frame < 2300;
  const isCourtroom = frame >= 2400 && frame < 3000;
  const isLegacy = frame >= 3000;

  // Gas chamber glow
  const gasGlow = isGasChamber ? Math.sin(frame * 0.4) * 0.5 + 0.5 : 0;

  // Flicker for gaslights
  const flicker = Math.sin(frame * 0.08) * 0.15 + 0.85;

  // Tone mapping exposure
  const exposure = isGasChamber ? 0.5 : 1;

  return (
    <AbsoluteFill style={{ background: "#020203" }}>
      <Canvas
        camera={{
          position: [cameraX, cameraY, cameraZ],
          fov: cameraFov,
          near: 0.1,
          far: 300
        }}
        gl={{
          preserveDrawingBuffer: true,
          alpha: true,
          antialias: true,
          logarithmicDepthBuffer: true
        }}
        style={{ width, height }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.shadowMap.enabled = false; // DISABLE SHADOWS FOR SPEED
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = exposure;
        }}
      >
        {/* ===== ENVIRONMENT (No ground, night preset) ===== */}
        <Environment preset="night" background={false} ground={false} />

        {/* ===== PHASE 1-2: CASTLE EXTERIOR (Optimized) ===== */}
        {isExterior && (
          <group rotation={[0, castleRotation, 0]}>
            {/* Main building - single mesh */}
            <mesh position={[0, 5, 0]}>
              <boxGeometry args={[16, 22, 14]} />
              <meshStandardMaterial color="#15100a" roughness={0.95} metalness={0.02} />
            </mesh>

            {/* Three towers - instanced for performance */}
            <instancedMesh args={[null, null, 3]}>
              <cylinderGeometry args={[3, 2.5, 20, 6]} />
              <meshStandardMaterial color="#15100a" roughness={0.95} />
              <arrayAttribute name="instanceMatrix" data={[
                new THREE.Matrix4().makeTranslation(-11, 15, 0).elements,
                new THREE.Matrix4().makeTranslation(11, 15, 0).elements,
                new THREE.Matrix4().makeTranslation(0, 17, 0).elements,
              ]} />
            </instancedMesh>

            {/* Tower roofs */}
            <instancedMesh args={[null, null, 3]}>
              <coneGeometry args={[3.5, 6, 6]} />
              <meshStandardMaterial color="#251508" roughness={0.9} />
              <arrayAttribute name="instanceMatrix" data={[
                new THREE.Matrix4().makeTranslation(-11, 27, 0).elements,
                new THREE.Matrix4().makeTranslation(11, 27, 0).elements,
                new THREE.Matrix4().makeTranslation(0, 31, 0).elements,
              ]} />
            </instancedMesh>

            {/* Glowing windows - single plane with shader-like approach */}
            <group>
              {Array.from({ length: 16 }).map((_, i) => (
                <mesh
                  key={`w-${i}`}
                  position={[
                    (i % 4 - 1.5) * 5,
                    Math.floor(i / 4) * 5 + 1.5,
                    7.5
                  ]}
                >
                  <planeGeometry args={[1.2, 1.8]} />
                  <meshBasicMaterial
                    color="#ffaa33"
                    transparent
                    opacity={0.6 * flicker + Math.sin(frame * 0.05 + i * 0.7) * 0.15}
                  />
                </mesh>
              ))}
            </group>

            {/* Entrance */}
            <mesh position={[0, 1.2, 7.6]}>
              <planeGeometry args={[3.5, 5.5]} />
              <meshStandardMaterial color="#080402" roughness={0.95} />
            </mesh>

            <fog attach="fog" args={["#030201", 8, 50]} />
          </group>
        )}

        {/* ===== PHASE 3-4: INTERIOR CORRIDOR (Optimized) ===== */}
        {isInterior && (
          <group position={[corridorDepth, 0, 0]}>
            {/* Floor - single large plane */}
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[80, 6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} metalness={0.01} />
            </mesh>

            {/* Ceiling with gas pipes - instanced */}
            <instancedMesh args={[null, null, 40]}>
              <cylinderGeometry args={[0.12, 0.12, 6, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.75} metalness={0.5} />
              <arrayAttribute name="instanceMatrix" data={
                Array.from({ length: 40 }).flatMap((_, i) =>
                  new THREE.Matrix4().makeTranslation(i * 2 - 39, 5.5, 0).elements
                )
              } />
            </instancedMesh>

            {/* Gaslight fixtures - instanced points with point lights */}
            <group>
              {Array.from({ length: 10 }).map((_, i) => (
                <group key={`gl-${i}`} position={[i * 8 - 36, 4.7, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.25, 8, 8]} />
                    <meshBasicMaterial
                      color="#ffaa33"
                      transparent
                      opacity={0.5 * flicker}
                    />
                  </mesh>
                  <pointLight color="#ffaa33" intensity={0.4 * flicker} distance={5} decay={2} />
                </group>
              ))}
            </group>

            {/* Corridor walls - two planes */}
            <mesh position={[-3.2, 1.7, 0]}>
              <planeGeometry args={[80, 6.6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} side={THREE.BackSide} />
            </mesh>
            <mesh position={[3.2, 1.7, 0]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[80, 6.6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} />
            </mesh>

            {/* Secret doors - instanced */}
            <instancedMesh args={[null, null, 10]}>
              <boxGeometry args={[2.2, 5, 0.15]} />
              <meshStandardMaterial color="#1a0f05" roughness={0.95} metalness={0.05} />
              <arrayAttribute name="instanceMatrix" data={
                Array.from({ length: 10 }).flatMap((_, i) =>
                  new THREE.Matrix4().makeTranslation(i * 8 - 36, 0.9, -2.9).elements
                )
              } />
            </instancedMesh>

            {/* Gas Chamber Room (revealed in pivot) */}
            {frame >= 1500 && (
              <group position={[35, 0, 0]}>
                {/* Room floor with glow */}
                <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[10, 8]} />
                  <meshStandardMaterial
                    color={gasGlow > 0 ? "#2a0505" : "#080303"}
                    roughness={0.95}
                    emissive={gasGlow > 0 ? new THREE.Color(0.6, 0.08, 0.03) : new THREE.Color(0, 0, 0)}
                    emissiveIntensity={gasGlow * 0.4}
                  />
                </mesh>

                {/* Four walls */}
                <instancedMesh args={[null, null, 4]}>
                  <planeGeometry args={[10, 6]} />
                  <meshStandardMaterial color="#080303" roughness={0.98} />
                  <arrayAttribute name="instanceMatrix" data={[
                    new THREE.Matrix4().makeTranslation(0, 1.4, -4).rotateY(0).elements,
                    new THREE.Matrix4().makeTranslation(0, 1.4, 4).rotateY(Math.PI).elements,
                    new THREE.Matrix4().makeTranslation(-5, 1.4, 0).rotateY(Math.PI / 2).elements,
                    new THREE.Matrix4().makeTranslation(5, 1.4, 0).rotateY(-Math.PI / 2).elements,
                  ]} />
                </instancedMesh>

                {/* Gas inlet */}
                <mesh position={[0, -0.5, 0]}>
                  <cylinderGeometry args={[0.35, 0.15, 2.5, 6]} />
                  <meshStandardMaterial color="#5a3000" roughness={0.6} metalness={0.8} />
                </mesh>

                {/* Gas particles - simple points */}
                {gasGlow > 0.3 && (
                  <Points>
                    <bufferGeometry>
                      <bufferAttribute
                        name="position"
                        count={50}
                        array={new Float32Array(150)}
                        itemSize={3}
                        usage={THREE.DynamicDrawUsage}
                      />
                    </bufferGeometry>
                    <pointsMaterial color="#ff5500" size={0.15} transparent opacity={0.4} sizeAttenuation />
                  </Points>
                )}

                {/* Furnace */}
                <mesh position={[-4, -0.5, 0]} castShadow={false}>
                  <boxGeometry args={[3.5, 3.5, 4.5]} />
                  <meshStandardMaterial color="#100505" roughness={0.95} metalness={0.1} />
                </mesh>
                <mesh position={[-4, 1.8, 2.5]}>
                  <planeGeometry args={[1.8, 1.2]} />
                  <meshBasicMaterial
                    color="#ff3300"
                    transparent
                    opacity={0.8 + Math.sin(frame * 0.4) * 0.2}
                  />
                </mesh>
              </group>
            )}

            <fog attach="fog" args={["#030100", 3, 35]} />
          </group>
        )}

        {/* ===== PHASE 5: COURTROOM (Simple) ===== */}
        {isCourtroom && (
          <group>
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[25, 18]} />
              <meshStandardMaterial color="#120d08" roughness={0.9} />
            </mesh>

            {/* Judge bench */}
            <mesh position={[0, 0.5, -6]}>
              <boxGeometry args={[7, 1.5, 3]} />
              <meshStandardMaterial color="#1a0d05" roughness={0.85} />
            </mesh>

            {/* Holmes in dock */}
            <group position={[-4, 0.8, 2]}>
              <mesh>
                <cylinderGeometry args={[0.3, 0.25, 1.6, 8]} />
                <meshStandardMaterial color="#080301" />
              </mesh>
              <mesh position={[0, 1.1, 0]}>
                <sphereGeometry args={[0.28, 10, 10]} />
                <meshStandardMaterial color="#080301" />
              </mesh>
            </group>

            {/* Jury - instanced */}
            <instancedMesh args={[null, null, 12]}>
              <cylinderGeometry args={[0.22, 0.18, 1.1, 8]} />
              <meshStandardMaterial color="#100804" />
              <arrayAttribute name="instanceMatrix" data={
                Array.from({ length: 12 }).flatMap((_, i) => {
                  const row = Math.floor(i / 6);
                  const col = i % 6;
                  return new THREE.Matrix4().makeTranslation(col * 1.1 - 2.7, 0.8, row === 0 ? -2.5 : 2.5).elements;
                })
              } />
            </instancedMesh>

            {/* Spectators - simple boxes */}
            <instancedMesh args={[null, null, 20]}>
              <boxGeometry args={[0.4, 1, 0.4]} />
              <meshStandardMaterial color="#0c0804" />
              <arrayAttribute name="instanceMatrix" data={
                Array.from({ length: 20 }).flatMap((_, i) => {
                  const angle = (i / 20) * Math.PI * 2;
                  const r = 8 + Math.random() * 3;
                  return new THREE.Matrix4().makeTranslation(Math.cos(angle) * r, 0.5, 6 + Math.sin(angle) * r).elements;
                })
              } />
            </instancedMesh>

            <fog attach="fog" args={["#080604", 6, 35]} />
          </group>
        )}

        {/* ===== PHASE 6: LEGACY PULLBACK ===== */}
        {isLegacy && (
          <group rotation={[0, castleRotation * 1.5, 0]}>
            {/* Castle silhouette */}
            <mesh position={[0, 5, 0]}>
              <boxGeometry args={[16, 22, 14]} />
              <meshStandardMaterial color="#100a05" roughness={0.95} />
            </mesh>
            <instancedMesh args={[null, null, 3]}>
              <cylinderGeometry args={[3, 2.5, 20, 6]} />
              <meshStandardMaterial color="#100a05" />
              <arrayAttribute name="instanceMatrix" data={[
                new THREE.Matrix4().makeTranslation(-11, 15, 0).elements,
                new THREE.Matrix4().makeTranslation(11, 15, 0).elements,
                new THREE.Matrix4().makeTranslation(0, 17, 0).elements,
              ]} />
            </instancedMesh>

            {/* Chicago skyline emerging - instanced boxes */}
            <instancedMesh args={[null, null, 12]}>
              <boxGeometry args={[2.5, 1, 2.5]} />
              <meshStandardMaterial color="#080a12" roughness={0.9} />
              <arrayAttribute name="instanceMatrix" data={
                Array.from({ length: 12 }).flatMap((_, i) => {
                  return new THREE.Matrix4().makeTranslation(
                    i * 4 - 24,
                    2 + Math.random() * 8,
                    -25
                  ).elements;
                })
              } />
            </instancedMesh>

            <fog attach="fog" args={["#020203", 15, 80]} />
          </group>
        )}

        {/* ===== LIGHTING (Minimal, fast) ===== */}
        <directionalLight
          position={[8, 15, 8]}
          intensity={isExterior ? 0.25 : isInterior ? 0.08 : isCourtroom ? 0.8 : 0.2}
          color={isInterior ? "#ffaa33" : isCourtroom ? "#ffeedd" : "#444a55"}
        />

        <ambientLight intensity={isExterior ? 0.1 : isInterior ? 0.05 : isCourtroom ? 0.3 : 0.1} color="#ffaa33" />

        {isGasChamber && (
          <pointLight
            position={[35, 1, 0]}
            color="#ff3300"
            intensity={gasGlow * 1.5}
            distance={12}
            decay={2}
          />
        )}

        {/* ===== TEXT OVERLAYS - NARRATION ===== */}

        {/* PHASE 1: HOOK (0-90) */}
        {frame < 90 && (
          <>
            <Html
              position={[0, 5.5, 0]}
              style={{
                color: '#fff',
                fontSize: '56px',
                fontWeight: '800',
                textShadow: '0 0 40px #ff3300, 0 0 80px #ff3300',
                pointerEvents: 'none',
                fontFamily: 'Georgia, "Times New Roman", serif',
                textAlign: 'center',
                lineHeight: 1.15,
              }}
              center
            >
              L'ARCHITETTO
              <br />DELL'ORRORE
            </Html>

            <Html
              position={[0, -3.5, 0]}
              style={{
                color: '#ffaa33',
                fontSize: '28px',
                letterSpacing: '0.05em',
                textShadow: '0 0 20px #ff6600',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}
              center
            >
              H.H. Holmes · Chicago 1893
            </Html>
          </>
        )}

        {/* PHASE 2: SETUP (90-450) */}
        {frame >= 90 && frame < 450 && (
          <>
            <Html
              position={[0, 6.5, 0]}
              style={{
                color: '#fff',
                fontSize: '38px',
                fontWeight: '600',
                textShadow: '0 0 20px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '850px',
                lineHeight: 1.3,
              }}
              center
            >
              {frame < 220
                ? "Herman Webster Mudgett arriva a Chicago"
                : "Si fa chiamare Dr. Henry Howard Holmes"
              }
            </Html>

            <Html
              position={[0, -5, 0]}
              style={{
                color: '#bbb',
                fontSize: '22px',
                textShadow: '0 0 10px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '900px',
                lineHeight: 1.5,
              }}
              center
            >
              {frame < 220
                ? "L'Esposizione Universale 1893 porta 27 milioni di visitatori.\nHolmes compra un lotto in Englewood per $10.000."
                : "Costruisce un 'hotel' di 3 piani, 100+ stanze.\nPassaggi segreti. Pareti fisse. Camere a gas. Forni crematori."
              }
            </Html>

            <Html
              position={[0, -8, 0]}
              style={{
                color: '#ff8844',
                fontSize: '16px',
                fontWeight: '500',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}
              center
            >
              "Costruii l'edificio per i miei scopi personali."
            </Html>
          </>
        )}

        {/* PHASE 3: DEVELOPMENT - THE CASTLE (450-1500) */}
        {frame >= 450 && frame < 1500 && (
          <>
            <Html
              position={[0, 6.5, 0]}
              style={{
                color: '#fff',
                fontSize: '36px',
                fontWeight: '700',
                textShadow: '0 0 20px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                letterSpacing: '0.03em',
              }}
              center
            >
              IL CASTELLO DELL'OMICIDIO
            </Html>

            <Html
              position={[0, -4.5, 0]}
              style={{
                color: '#ddd',
                fontSize: '21px',
                textShadow: '0 0 10px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '950px',
                lineHeight: 1.6,
              }}
              center
            >
              {frame < 750
                ? "Porte che si aprono solo dall'esterno.\nScale che portano nel vuoto. Cuscini insonorizzati sotto i tappeti."
                : frame < 1050
                ? "Il 2° piano: 35 stanze per ospiti.\nNessuna finestra verso l'esterno. Solo lucernari sigillati."
                : "Il seminterrato: tavoli per dissezione. Vasche d'acido.\nForni per cremare i corpi.\nHolmes vende gli scheletri alle facoltà di medicina: $200 l'uno."
              }
            </Html>

            <Html
              position={[0, -8.5, 0]}
              style={{
                color: '#ff6633',
                fontSize: '18px',
                fontWeight: '600',
                textShadow: '0 0 15px #ff3300',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}
              center
            >
              Vittime confermate: 27  ·  Stimate: fino a 200
            </Html>
          </>
        )}

        {/* PHASE 4: PIVOT - GAS CHAMBER (1500-2400) */}
        {frame >= 1500 && frame < 2400 && (
          <>
            <Html
              position={[0, 6, 0]}
              style={{
                color: '#ff3300',
                fontSize: '44px',
                fontWeight: '800',
                textShadow: '0 0 40px #ff3300, 0 0 80px #ff3300',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                opacity: frame < 1800 ? (frame - 1500) / 300 : 1,
              }}
              center
            >
              CAMERA A GAS
            </Html>

            <Html
              position={[0, -4, 0]}
              style={{
                color: '#fff',
                fontSize: '23px',
                textShadow: '0 0 15px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '950px',
                lineHeight: 1.5,
              }}
              center
            >
              {frame < 1800
                ? "Una stanza ermetica. Tubature del gas mascherate da illuminazione a gas."
                : "Holmes osserva attraverso lo spioncino.\nL'asfissiazione dura 15-20 minuti.\nPoi i corpi scendono nello scivolo verso il forno crematorio."
              }
            </Html>

            <Html
              position={[0, -7.5, 0]}
              style={{
                color: '#ffaa33',
                fontSize: '18px',
                fontStyle: 'italic',
                fontWeight: '500',
                textShadow: '0 0 15px #ff6600',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                opacity: frame > 1800 ? 1 : 0,
              }}
              center
            >
              "Il metodo più pulito. Nessun sangue. Nessun rumore."
            </Html>
          </>
        )}

        {/* PHASE 5: PAYOFF - ARREST & TRIAL (2400-3000) */}
        {frame >= 2400 && frame < 3000 && (
          <>
            <Html
              position={[0, 6.5, 0]}
              style={{
                color: '#fff',
                fontSize: '38px',
                fontWeight: '700',
                textShadow: '0 0 20px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}
              center
            >
              LA CADUTA
            </Html>

            <Html
              position={[0, -4, 0]}
              style={{
                color: '#ddd',
                fontSize: '22px',
                textShadow: '0 0 10px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '950px',
                lineHeight: 1.5,
              }}
              center
            >
              {frame < 2700
                ? "Arrestato per frode assicurativa, non per omicidio.\nIncendia il castello per incassare $60.000."
                : "Confessa 27 omicidi. Ne rivendica 130.\n'Sono nato col diavolo dentro di me.'"
              }
            </Html>

            <Html
              position={[0, -7.5, 0]}
              style={{
                color: '#ff3300',
                fontSize: '20px',
                fontWeight: '600',
                textShadow: '0 0 15px #ff3300',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
              }}
              center
            >
              Impiccato il 7 maggio 1896. Rifiuta l'autopsia.\nIl suo cranio è ancora conservato al Mütter Museum.
            </Html>
          </>
        )}

        {/* PHASE 6: LEGACY (3000-3600) */}
        {frame >= 3000 && (
          <>
            <Html
              position={[0, 5, 0]}
              style={{
                color: '#fff',
                fontSize: '34px',
                fontWeight: '500',
                textShadow: '0 0 20px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                lineHeight: 1.2,
                opacity: Math.min(1, (frame - 3000) / 400),
              }}
              center
            >
              L'ORIGINE DELL'HORROR MODERNO
            </Html>

            <Html
              position={[0, -2.5, 0]}
              style={{
                color: '#aaa',
                fontSize: '22px',
                textShadow: '0 0 10px #000',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                maxWidth: '950px',
                lineHeight: 1.6,
                opacity: Math.min(1, (frame - 3000) / 400),
              }}
              center
            >
              "Il Diavolo nella Città Bianca" — Erik Larson\nIspirò: Psycho, American Horror Story, The Alienist\nPrimo "serial killer" mediatico della storia USA
            </Html>

            <Html
              position={[0, -6.5, 0]}
              style={{
                color: '#ffaa33',
                fontSize: '18px',
                fontStyle: 'italic',
                textShadow: '0 0 10px #ff6600',
                pointerEvents: 'none',
                fontFamily: 'Georgia, serif',
                textAlign: 'center',
                opacity: Math.min(1, (frame - 3200) / 400),
              }}
              center
            >
              Il castello fu demolito nel 1938.\nOggi c'è un ufficio postale. Nessuna targa.
            </Html>
          </>
        )}

        {/* TIMECODE */}
        <Html
          position={[0, -9, 0]}
          style={{
            color: '#333',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
          center
        >
          {Math.floor(frame / 30)}s / 120s  ·  H.H. Holmes: America's First Serial Killer
        </Html>

      </Canvas>
    </AbsoluteFill>
  );
}

export const HHolmesVideoComposition: React.FC = () => {
  return (
    <Composition
      id="hholmes-video"
      component={HHolmesVideo}
      durationInFrames={3600}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ width: 1080, height: 1920 }}
    />
  );
};

export const HHolmesVideoPreview: React.FC = () => {
  return (
    <Composition
      id="hholmes-preview"
      component={HHolmesVideo}
      durationInFrames={3600}
      fps={30}
      width={480}
      height={854}
      defaultProps={{ width: 480, height: 854 }}
    />
  );
};