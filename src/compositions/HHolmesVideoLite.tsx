import { Composition, AbsoluteFill, useVideoConfig, useCurrentFrame } from "remotion";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Html, Environment } from "@react-three/drei";
import { useRemotionTiming, useInterpolate } from "@/hooks/useRemotion";

export function HHolmesVideoLite() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const { progress, time } = useRemotionTiming();

  // ===== CAMERA ANIMATIONS (Simplified) =====
  const cameraZ = useInterpolate(
    [
      { frame: 0, value: 25 },
      { frame: 90, value: 12 },
      { frame: 450, value: 6 },
      { frame: 1500, value: 4 },
      { frame: 2400, value: 5 },
      { frame: 3000, value: 7 },
      { frame: 3600, value: 25 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraY = useInterpolate(
    [
      { frame: 0, value: 6 },
      { frame: 90, value: 3 },
      { frame: 450, value: 2.5 },
      { frame: 1500, value: 1.6 },
      { frame: 2400, value: 1.6 },
      { frame: 3000, value: 3 },
      { frame: 3600, value: 8 }
    ],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraX = useInterpolate(
    [
      { frame: 0, value: 0 },
      { frame: 450, value: -2 },
      { frame: 1500, value: -2 },
      { frame: 2400, value: 0 },
      { frame: 3000, value: 1.5 },
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
    [{ frame: 0, value: 0 }, { frame: durationInFrames, value: Math.PI * 0.08 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const corridorDepth = useInterpolate(
    [{ frame: 450, value: 0 }, { frame: 1500, value: -25 }],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase booleans
  const isExterior = frame < 450;
  const isInterior = frame >= 450 && frame < 2400;
  const isGasChamber = frame >= 1800 && frame < 2300;
  const isCourtroom = frame >= 2400 && frame < 3000;
  const isLegacy = frame >= 3000;

  // Gas chamber glow (simplified)
  const gasGlow = isGasChamber ? Math.sin(frame * 0.3) * 0.5 + 0.5 : 0;

  // Flicker for gaslights
  const flicker = Math.sin(frame * 0.08) * 0.15 + 0.85;

  // Tone mapping exposure
  const exposure = isGasChamber ? 0.5 : 1;

  // ===== PRE-COMPUTED MATRICES (memory efficient) =====
  // Only 3 towers
  const towerMatrices = new Float32Array([
    ...new THREE.Matrix4().makeTranslation(-11, 15, 0).elements,
    ...new THREE.Matrix4().makeTranslation(11, 15, 0).elements,
    ...new THREE.Matrix4().makeTranslation(0, 17, 0).elements,
  ]);

  const roofMatrices = new Float32Array([
    ...new THREE.Matrix4().makeTranslation(-11, 27, 0).elements,
    ...new THREE.Matrix4().makeTranslation(11, 27, 0).elements,
    ...new THREE.Matrix4().makeTranslation(0, 31, 0).elements,
  ]);

  // 20 pipes instead of 40
  const pipeMatrices = new Float32Array(
    Array.from({ length: 20 }).flatMap((_, i) =>
      [...new THREE.Matrix4().makeTranslation(i * 2.5 - 24, 5.5, 0).elements]
    ).flat()
  );

  // 6 doors instead of 10
  const doorMatrices = new Float32Array(
    Array.from({ length: 6 }).flatMap((_, i) =>
      [...new THREE.Matrix4().makeTranslation(i * 8 - 20, 0.9, -2.9).elements]
    ).flat()
  );

  const wallMatrices = new Float32Array([
    ...new THREE.Matrix4().makeTranslation(0, 1.4, -4).makeRotationY(0).elements,
    ...new THREE.Matrix4().makeTranslation(0, 1.4, 4).makeRotationY(Math.PI).elements,
    ...new THREE.Matrix4().makeTranslation(-5, 1.4, 0).makeRotationY(Math.PI / 2).elements,
    ...new THREE.Matrix4().makeTranslation(5, 1.4, 0).makeRotationY(-Math.PI / 2).elements,
  ]);

  // 6 jury instead of 12
  const juryMatrices = new Float32Array(
    Array.from({ length: 6 }).flatMap((_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return [...new THREE.Matrix4().makeTranslation(col * 1.5 - 1.5, 0.8, row === 0 ? -1.5 : 1.5).elements];
    }).flat()
  );

  // 8 spectators instead of 20
  const spectatorMatrices = new Float32Array(
    Array.from({ length: 8 }).flatMap((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const r = 6 + Math.random() * 2;
      return [...new THREE.Matrix4().makeTranslation(Math.cos(angle) * r, 0.5, 4 + Math.sin(angle) * r).elements];
    }).flat()
  );

  // 6 chicago buildings instead of 12
  const chicagoMatrices = new Float32Array(
    Array.from({ length: 6 }).flatMap((_, i) =>
      [...new THREE.Matrix4().makeTranslation(i * 5 - 15, 2 + Math.random() * 6, -20).elements]
    ).flat()
  );

  // Pre-create colors to avoid new THREE.Color() per frame
  const gasEmissiveColor = new THREE.Color(0.6, 0.08, 0.03);
  const blackColor = new THREE.Color(0, 0, 0);
  const floorColorNormal = new THREE.Color("#080303");
  const floorColorGlow = new THREE.Color("#2a0505");

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
          antialias: false, // Disable AA for memory
          logarithmicDepthBuffer: true
        }}
        style={{ width, height }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(1); // Force 1x pixel ratio for memory
          gl.shadowMap.enabled = false;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = exposure;
        }}
      >
        {/* ===== ENVIRONMENT ===== */}
        <Environment preset="night" background={false} ground={false} />

        {/* ===== PHASE 1-2: CASTLE EXTERIOR ===== */}
        {isExterior && (
          <group rotation={[0, castleRotation, 0]}>
            {/* Main building */}
            <mesh position={[0, 5, 0]}>
              <boxGeometry args={[16, 22, 14]} />
              <meshStandardMaterial color="#15100a" roughness={0.95} metalness={0.02} />
            </mesh>

            {/* Three towers - instanced */}
            <instancedMesh args={[null, null, 3]}>
              <cylinderGeometry args={[3, 2.5, 20, 6]} />
              <meshStandardMaterial color="#15100a" roughness={0.95} />
              <bufferAttribute attach="instanceMatrix" array={towerMatrices} itemSize={16} />
            </instancedMesh>

            {/* Tower roofs */}
            <instancedMesh args={[null, null, 3]}>
              <coneGeometry args={[3.5, 6, 6]} />
              <meshStandardMaterial color="#251508" roughness={0.9} />
              <bufferAttribute attach="instanceMatrix" array={roofMatrices} itemSize={16} />
            </instancedMesh>

            {/* Glowing windows - 8 instead of 16 */}
            <group>
              {Array.from({ length: 8 }).map((_, i) => (
                <mesh
                  key={`w-${i}`}
                  position={[
                    (i % 4 - 1.5) * 5,
                    Math.floor(i / 4) * 6 + 2,
                    7.5
                  ]}
                >
                  <planeGeometry args={[1.5, 2]} />
                  <meshBasicMaterial
                    color="#ffaa33"
                    transparent
                    opacity={0.6 * flicker + Math.sin(frame * 0.04 + i * 0.7) * 0.15}
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

        {/* ===== PHASE 3-4: INTERIOR CORRIDOR (Lite) ===== */}
        {isInterior && (
          <group position={[corridorDepth, 0, 0]}>
            {/* Floor */}
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[60, 6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} metalness={0.01} />
            </mesh>

            {/* Ceiling pipes - instanced (20 instead of 40) */}
            <instancedMesh args={[null, null, 20]}>
              <cylinderGeometry args={[0.15, 0.15, 6, 6]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.75} metalness={0.5} />
              <bufferAttribute attach="instanceMatrix" array={pipeMatrices} itemSize={16} />
            </instancedMesh>

            {/* Gaslight fixtures - NO point lights (memory heavy), use emissive mesh only */}
            <group>
              {Array.from({ length: 8 }).map((_, i) => (
                <mesh
                  key={`gl-${i}`}
                  position={[i * 7.5 - 26, 4.7, 0]}
                >
                  <sphereGeometry args={[0.3, 8, 8]} />
                  <meshBasicMaterial
                    color="#ffaa33"
                    transparent
                    opacity={0.6 * flicker}
                  />
                </mesh>
              ))}
            </group>

            {/* Corridor walls */}
            <mesh position={[-3.2, 1.7, 0]}>
              <planeGeometry args={[60, 6.6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} side={THREE.BackSide} />
            </mesh>
            <mesh position={[3.2, 1.7, 0]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[60, 6.6]} />
              <meshStandardMaterial color="#100a05" roughness={0.98} />
            </mesh>

            {/* Secret doors - 6 instead of 10 */}
            <instancedMesh args={[null, null, 6]}>
              <boxGeometry args={[2.2, 5, 0.15]} />
              <meshStandardMaterial color="#1a0f05" roughness={0.95} metalness={0.05} />
              <bufferAttribute attach="instanceMatrix" array={doorMatrices} itemSize={16} />
            </instancedMesh>

            {/* Gas Chamber Room */}
            {frame >= 1500 && (
              <group position={[30, 0, 0]}>
                {/* Room floor with glow */}
                <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[8, 6]} />
                  <meshStandardMaterial
                    color={gasGlow > 0 ? floorColorGlow : floorColorNormal}
                    roughness={0.95}
                    emissive={gasGlow > 0 ? gasEmissiveColor : blackColor}
                    emissiveIntensity={gasGlow * 0.3}
                  />
                </mesh>

                {/* Four walls */}
                <instancedMesh args={[null, null, 4]}>
                  <planeGeometry args={[8, 6]} />
                  <meshStandardMaterial color="#080303" roughness={0.98} />
                  <bufferAttribute attach="instanceMatrix" array={wallMatrices} itemSize={16} />
                </instancedMesh>

                {/* Gas inlet */}
                <mesh position={[0, -0.5, 0]}>
                  <cylinderGeometry args={[0.35, 0.15, 2.5, 6]} />
                  <meshStandardMaterial color="#5a3000" roughness={0.6} metalness={0.8} />
                </mesh>

                {/* NO gas particles - skip for memory */}
                {/* Furnace */}
                <mesh position={[-3.5, -0.5, 0]}>
                  <boxGeometry args={[3, 3, 4]} />
                  <meshStandardMaterial color="#100505" roughness={0.95} metalness={0.1} />
                </mesh>
                <mesh position={[-3.5, 1.5, 2]}>
                  <planeGeometry args={[1.5, 1]} />
                  <meshBasicMaterial
                    color="#ff3300"
                    transparent
                    opacity={0.8 + Math.sin(frame * 0.3) * 0.2}
                  />
                </mesh>
              </group>
            )}

            <fog attach="fog" args={["#030100", 3, 30]} />
          </group>
        )}

        {/* ===== PHASE 5: COURTROOM (Lite) ===== */}
        {isCourtroom && (
          <group>
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[18, 14]} />
              <meshStandardMaterial color="#120d08" roughness={0.9} />
            </mesh>

            {/* Judge bench */}
            <mesh position={[0, 0.5, -5]}>
              <boxGeometry args={[6, 1.5, 2.5]} />
              <meshStandardMaterial color="#1a0d05" roughness={0.85} />
            </mesh>

            {/* Holmes in dock */}
            <group position={[-3, 0.8, 1.5]}>
              <mesh>
                <cylinderGeometry args={[0.3, 0.25, 1.6, 6]} />
                <meshStandardMaterial color="#080301" />
              </mesh>
              <mesh position={[0, 1.1, 0]}>
                <sphereGeometry args={[0.28, 8, 8]} />
                <meshStandardMaterial color="#080301" />
              </mesh>
            </group>

            {/* Jury - 6 instead of 12 */}
            <instancedMesh args={[null, null, 6]}>
              <cylinderGeometry args={[0.22, 0.18, 1.1, 6]} />
              <meshStandardMaterial color="#100804" />
              <bufferAttribute attach="instanceMatrix" array={juryMatrices} itemSize={16} />
            </instancedMesh>

            {/* Spectators - 8 instead of 20 */}
            <instancedMesh args={[null, null, 8]}>
              <boxGeometry args={[0.4, 1, 0.4]} />
              <meshStandardMaterial color="#0c0804" />
              <bufferAttribute attach="instanceMatrix" array={spectatorMatrices} itemSize={16} />
            </instancedMesh>

            <fog attach="fog" args={["#080604", 6, 25]} />
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
              <bufferAttribute attach="instanceMatrix" array={towerMatrices} itemSize={16} />
            </instancedMesh>

            {/* Chicago skyline - 6 instead of 12 */}
            <instancedMesh args={[null, null, 6]}>
              <boxGeometry args={[3, 1, 3]} />
              <meshStandardMaterial color="#080a12" roughness={0.9} />
              <bufferAttribute attach="instanceMatrix" array={chicagoMatrices} itemSize={16} />
            </instancedMesh>

            <fog attach="fog" args={["#020203", 15, 60]} />
          </group>
        )}

        {/* ===== LIGHTING (Minimal) ===== */}
        <directionalLight
          position={[8, 15, 8]}
          intensity={isExterior ? 0.25 : isInterior ? 0.08 : isCourtroom ? 0.8 : 0.2}
          color={isInterior ? "#ffaa33" : isCourtroom ? "#ffeedd" : "#444a55"}
        />
        <ambientLight intensity={isExterior ? 0.1 : isInterior ? 0.05 : isCourtroom ? 0.3 : 0.1} color="#ffaa33" />

        {/* ===== TEXT OVERLAYS - NARRATION (Same as full) ===== */}
        {/* PHASE 1: HOOK (0-90) */}
        {frame < 90 && (
          <>
            <Html
              position={[0, 5.5, 0]}
              style={{
                color: '#fff', fontSize: '52px', fontWeight: '800',
                textShadow: '0 0 40px #ff3300, 0 0 80px #ff3300',
                pointerEvents: 'none', fontFamily: 'Georgia, serif',
                textAlign: 'center', lineHeight: 1.15,
              }} center
            >
              L'ARCHITETTO<br />DELL'ORRORE
            </Html>
            <Html
              position={[0, -3.5, 0]}
              style={{
                color: '#ffaa33', fontSize: '26px', letterSpacing: '0.05em',
                textShadow: '0 0 20px #ff6600', pointerEvents: 'none',
                fontFamily: 'Georgia, serif', textAlign: 'center',
              }} center
            >
              H.H. Holmes · Chicago 1893
            </Html>
          </>
        )}

        {/* PHASE 2: SETUP (90-450) */}
        {frame >= 90 && frame < 450 && (
          <>
            <Html position={[0, 6.5, 0]} style={{color:'#fff',fontSize:'36px',fontWeight:'600',textShadow:'0 0 20px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'850px',lineHeight:1.3}} center>
              {frame < 220 ? "Herman Webster Mudgett arriva a Chicago" : "Si fa chiamare Dr. Henry Howard Holmes"}
            </Html>
            <Html position={[0, -5, 0]} style={{color:'#bbb',fontSize:'20px',textShadow:'0 0 10px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'900px',lineHeight:1.5}} center>
              {frame < 220 ? "L'Esposizione Universale 1893 porta 27 milioni di visitatori.\nHolmes compra un lotto in Englewood per $10.000." : "Costruisce un 'hotel' di 3 piani, 100+ stanze.\nPassaggi segreti. Pareti fisse. Camere a gas. Forni crematori."}
            </Html>
            <Html position={[0, -8, 0]} style={{color:'#ff8844',fontSize:'15px',fontWeight:'500',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center'}} center>
              "Costruii l'edificio per i miei scopi personali."
            </Html>
          </>
        )}

        {/* PHASE 3: THE CASTLE (450-1500) */}
        {frame >= 450 && frame < 1500 && (
          <>
            <Html position={[0, 6.5, 0]} style={{color:'#fff',fontSize:'34px',fontWeight:'700',textShadow:'0 0 20px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',letterSpacing:'0.03em'}} center>
              IL CASTELLO DELL'OMICIDIO
            </Html>
            <Html position={[0, -4.5, 0]} style={{color:'#ddd',fontSize:'19px',textShadow:'0 0 10px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'950px',lineHeight:1.6}} center>
              {frame < 750 ? "Porte che si aprono solo dall'esterno.\nScale che portano nel vuoto. Cuscini insonorizzati sotto i tappeti." : frame < 1050 ? "Il 2° piano: 35 stanze per ospiti.\nNessuna finestra verso l'esterno. Solo lucernari sigillati." : "Il seminterrato: tavoli per dissezione. Vasche d'acido.\nForni per cremare i corpi.\nHolmes vende gli scheletri alle facoltà di medicina: $200 l'uno."}
            </Html>
            <Html position={[0, -8.5, 0]} style={{color:'#ff6633',fontSize:'17px',fontWeight:'600',textShadow:'0 0 15px #ff3300',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center'}} center>
              Vittime confermate: 27  ·  Stimate: fino a 200
            </Html>
          </>
        )}

        {/* PHASE 4: GAS CHAMBER (1500-2400) */}
        {frame >= 1500 && frame < 2400 && (
          <>
            <Html position={[0, 6, 0]} style={{color:'#ff3300',fontSize:'40px',fontWeight:'800',textShadow:'0 0 40px #ff3300',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',opacity: frame < 1800 ? (frame - 1500) / 300 : 1}} center>
              CAMERA A GAS
            </Html>
            <Html position={[0, -4, 0]} style={{color:'#fff',fontSize:'21px',textShadow:'0 0 15px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'950px',lineHeight:1.5}} center>
              {frame < 1800 ? "Una stanza ermetica. Tubature del gas mascherate da illuminazione a gas." : "Holmes osserva attraverso lo spioncino.\nL'asfissiazione dura 15-20 minuti.\nPoi i corpi scendono nello scivolo verso il forno crematorio."}
            </Html>
            <Html position={[0, -7.5, 0]} style={{color:'#ffaa33',fontSize:'17px',fontStyle:'italic',fontWeight:'500',textShadow:'0 0 15px #ff6600',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',opacity: frame > 1800 ? 1 : 0}} center>
              "Il metodo più pulito. Nessun sangue. Nessun rumore."
            </Html>
          </>
        )}

        {/* PHASE 5: TRIAL (2400-3000) */}
        {frame >= 2400 && frame < 3000 && (
          <>
            <Html position={[0, 6.5, 0]} style={{color:'#fff',fontSize:'36px',fontWeight:'700',textShadow:'0 0 20px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center'}} center>
              LA CADUTA
            </Html>
            <Html position={[0, -4, 0]} style={{color:'#ddd',fontSize:'20px',textShadow:'0 0 10px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'950px',lineHeight:1.5}} center>
              {frame < 2700 ? "Arrestato per frode assicurativa, non per omicidio.\nIncendia il castello per incassare $60.000." : "Confessa 27 omicidi. Ne rivendica 130.\n'Sono nato col diavolo dentro di me.'"}
            </Html>
            <Html position={[0, -7.5, 0]} style={{color:'#ff3300',fontSize:'18px',fontWeight:'600',textShadow:'0 0 15px #ff3300',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center'}} center>
              Impiccato il 7 maggio 1896. Rifiuta l'autopsia.\nIl suo cranio è ancora conservato al Mütter Museum.
            </Html>
          </>
        )}

        {/* PHASE 6: LEGACY (3000-3600) */}
        {frame >= 3000 && (
          <>
            <Html position={[0, 5, 0]} style={{color:'#fff',fontSize:'32px',fontWeight:'500',textShadow:'0 0 20px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',lineHeight:1.2,opacity: Math.min(1, (frame - 3000) / 400)}} center>
              L'ORIGINE DELL'HORROR MODERNO
            </Html>
            <Html position={[0, -2.5, 0]} style={{color:'#aaa',fontSize:'20px',textShadow:'0 0 10px #000',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',maxWidth:'950px',lineHeight:1.6,opacity: Math.min(1, (frame - 3000) / 400)}} center>
              "Il Diavolo nella Città Bianca" — Erik Larson\nIspirò: Psycho, American Horror Story, The Alienist\nPrimo "serial killer" mediatico della storia USA
            </Html>
            <Html position={[0, -6.5, 0]} style={{color:'#ffaa33',fontSize:'17px',fontStyle:'italic',textShadow:'0 0 10px #ff6600',pointerEvents:'none',fontFamily:'Georgia, serif',textAlign:'center',opacity: Math.min(1, (frame - 3200) / 400)}} center>
              Il castello fu demolito nel 1938.\nOggi c'è un ufficio postale. Nessuna targa.
            </Html>
          </>
        )}

        {/* TIMECODE */}
        <Html position={[0, -9, 0]} style={{color:'#333',fontSize:'14px',fontFamily:'monospace',pointerEvents:'none',textAlign:'center'}} center>
          {Math.floor(frame / 30)}s / 120s  ·  H.H. Holmes: America's First Serial Killer
        </Html>

      </Canvas>
    </AbsoluteFill>
  );
}

export const HHolmesVideoLiteComposition: React.FC = () => {
  return (
    <Composition
      id="hholmes-video-lite"
      component={HHolmesVideoLite}
      durationInFrames={3600}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};

export const HHolmesVideoLitePreview: React.FC = () => {
  return (
    <Composition
      id="hholmes-preview-lite"
      component={HHolmesVideoLite}
      durationInFrames={3600}
      fps={30}
      width={480}
      height={854}
    />
  );
};