import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import * as THREE from 'three'

// ─── Simplex noise and shader injection strings ───────────────────────────────

const SNOISE_VERT = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=1./(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))+1e-6);
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

const VERT_DEFORM = `
float angle = uTwist * position.y;
float c = cos(angle); float s = sin(angle);
float px = transformed.x, pz = transformed.z;
transformed.x = px * c - pz * s;
transformed.z = px * s + pz * c;
transformed.y *= uStretch;
transformed += normal * snoise(position * uNoiseFreq + vec3(uTime * 0.3, 0.0, 0.0)) * uNoiseAmp;
`

const VORONOI_FRAG = `
vec2 uv = vUv * uPatternScale;
vec2 id = floor(uv);
vec2 gv = fract(uv) - 0.5;
float md1 = 8.0;
float md2 = 8.0;
for (int j = -1; j <= 1; j++) {
  for (int i = -1; i <= 1; i++) {
    vec2 off = vec2(float(i), float(j));
    vec2 n = id + off;
    vec2 p = n + fract(sin(dot(n, vec2(127.1, 311.7))) * 43758.5453);
    vec2 d = gv - off - (p - n);
    float dist = length(d);
    if (dist < md1) { md2 = md1; md1 = dist; }
    else if (dist < md2) { md2 = dist; }
  }
}
float edge = smoothstep(0.0, 0.08, md2 - md1);
gl_FragColor.rgb *= (1.0 - edge * uPatternMix);
`

// ─── 3D Model with parametric shader ──────────────────────────────────────────

function Model({
  modelPath,
  autoRotate,
  floatAmplitude = 0.08,
  uniformsRef,
}) {
  const { scene } = useGLTF(modelPath)
  const { scene: threeScene } = useThree()
  const groupRef = useRef()
  const clock = useRef(0)

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    scene.position.sub(center)

    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      scene.scale.setScalar(2.5 / maxDim)
    }

    const envMap = threeScene?.environment ?? null
    const u = uniformsRef.current

    scene.traverse((child) => {
      if (child.isMesh) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xb0c8d4),
          transmission: 0.94,
          thickness: 0.2,
          roughness: 0.8,
          metalness: 0.2,
          ior: 1.45,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          envMapIntensity: 0.8,
          attenuationColor: new THREE.Color(0x9dd5d0),
          attenuationDistance: 0.55,
        })
        mat.envMap = envMap
        child.material = mat
        child.castShadow = true
        child.receiveShadow = true

        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTwist = u.uTwist
          shader.uniforms.uStretch = u.uStretch
          shader.uniforms.uNoiseAmp = u.uNoiseAmp
          shader.uniforms.uNoiseFreq = u.uNoiseFreq
          shader.uniforms.uPatternScale = u.uPatternScale
          shader.uniforms.uPatternMix = u.uPatternMix
          shader.uniforms.uTime = u.uTime

          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            '#include <common>\n' +
            ' uniform float uTwist;\n uniform float uStretch;\n uniform float uNoiseAmp;\n uniform float uNoiseFreq;\n uniform float uPatternScale;\n uniform float uPatternMix;\n uniform float uTime;\n' +
            SNOISE_VERT
          )
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\n' + VERT_DEFORM
          )

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            '#include <common>\n uniform float uPatternScale;\n uniform float uPatternMix;\n'
          )
          if (shader.fragmentShader.includes('vUv')) {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              '#include <dithering_fragment>\n' + VORONOI_FRAG
            )
          }
        }
      }
    })
  }, [scene, threeScene, uniformsRef])

  useFrame((_, delta) => {
    if (!groupRef.current || !uniformsRef.current) return
    const u = uniformsRef.current
    u.uTime.value += delta
    u.uTwist.value = 0
    u.uStretch.value = 1
    u.uNoiseAmp.value = 0
    u.uNoiseFreq.value = 3
    u.uPatternMix.value = 0
    u.uPatternScale.value = 1

    clock.current += delta
    groupRef.current.position.y = Math.sin(clock.current * 0.6) * floatAmplitude
    if (autoRotate) groupRef.current.rotation.y += delta * 0.4
    groupRef.current.rotation.z = Math.sin(clock.current * 0.3) * 0.015
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

// ─── Fallback while loading ───────────────────────────────────────────────────

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#aaaaaa" wireframe />
    </mesh>
  )
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

export default function SceneViewer({
  modelPath = 'https://raw.githubusercontent.com/Noyok1vas/figbuildAssets/main/FormTest.glb',
  className = '',
  style = {},
}) {
  const [autoRotate, setAutoRotate] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const uniformsRef = useRef({
    uTwist: { value: 0 },
    uStretch: { value: 1 },
    uNoiseAmp: { value: 0 },
    uNoiseFreq: { value: 3 },
    uPatternScale: { value: 1 },
    uPatternMix: { value: 0 },
    uTime: { value: 0 },
  })

  const focusDistance = 0.015
  const focalLength = 0.025
  const bokehScale = 5
  const color = '#111111'
  const roughness = 1
  const metalness = 1

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={() => setIsGrabbing(true)}
        onPointerUp={() => setIsGrabbing(false)}
        onPointerLeave={() => setIsGrabbing(false)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#c8d8f0" />
        <pointLight position={[0, -3, 2]} intensity={0.3} color="#f0ece8" />
        <Environment preset="studio" />
        <ContactShadows
          position={[0, -1.6, 0]}
          opacity={0.15}
          scale={6}
          blur={3}
          far={1.5}
          color="#888888"
        />
        <Suspense fallback={<Loader />}>
          <Model
            modelPath={modelPath}
            autoRotate={autoRotate}
            uniformsRef={uniformsRef}
          />
        </Suspense>
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
          autoRotate={false}
          onStart={() => setAutoRotate(false)}
        />
        <EffectComposer>
        
          <DepthOfField
  focusDistance={0.01}      // 更小 = 焦点更近
  focalLength={0.1}        // 短焦，景深更浅
  bokehScale={4}
  focusRange={0.05}
  target={[0, 0, 1.5]}       // 新增：焦点指向模型前方
  height={700}
/>
        </EffectComposer>
      </Canvas>

      <button
        type="button"
        onClick={() => setAutoRotate((v) => !v)}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 11,
          letterSpacing: '0.08em',
          color: '#555',
          cursor: 'pointer',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={(e) => (e.target.style.background = 'rgba(255,255,255,0.3)')}
        onMouseLeave={(e) => (e.target.style.background = 'rgba(255,255,255,0.15)')}
      >
        {autoRotate ? '⏸ PAUSE' : '▶ ROTATE'}
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'rgba(0,0,0,0.35)',
          userSelect: 'none',
        }}
      >
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  )
}

useGLTF.preload('https://raw.githubusercontent.com/Noyok1vas/figbuildAssets/main/FormTest.glb')
