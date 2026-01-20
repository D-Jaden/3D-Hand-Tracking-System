import React, { useEffect, useRef, useState } from 'react';
import { Camera, Hand, Sparkles, Info } from 'lucide-react';

const GestureParticleSystem = () => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState('bloom');
  const [gestureInfo, setGestureInfo] = useState('');

  useEffect(() => {
    let scene, camera, renderer, particles, particleSystem;
    let animationId;
    let hands, videoElement, cameraStream;
    let gestureState = {
      handDistance: 0.5,
      palmOpenness: 0.5,
      handVelocity: { x: 0, y: 0 },
      rotationAngle: 0,
      currentGesture: 'none',
      smoothedParams: {
        spread: 1,
        hue: 0.6,
        speed: 1,
        turbulence: 0.3
      }
    };
    let targetTemplate = 'bloom';
    let transitionProgress = 1;
    let previousTemplate = 'bloom';

    const PARTICLE_COUNT = 5000;
    const templates = {
      bloom: {
        name: 'Organic Bloom',
        color: 0xff69b4,
        pattern: 'spiral',
        spread: 1.5,
        layers: 8
      },
      saturn: {
        name: 'Saturn Rings',
        color: 0x4a90e2,
        pattern: 'rings',
        spread: 2,
        layers: 5
      },
      firework: {
        name: 'Firework Burst',
        color: 0xffd700,
        pattern: 'explosion',
        spread: 2.5,
        layers: 12
      },
      galaxy: {
        name: 'Spiral Galaxy',
        color: 0x9b59b6,
        pattern: 'galaxy',
        spread: 2,
        layers: 10
      }
    };

    const initThree = () => {
      scene = new window.THREE.Scene();
      scene.background = new window.THREE.Color(0x0a0a0a);
      
      camera = new window.THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      renderer = new window.THREE.WebGLRenderer({ 
        canvas: canvasRef.current,
        antialias: true,
        alpha: true
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create particle geometry
      const geometry = new window.THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      const sizes = new Float32Array(PARTICLE_COUNT);
      const velocities = new Float32Array(PARTICLE_COUNT * 3);
      const phases = new Float32Array(PARTICLE_COUNT);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 2;
        positions[i3 + 1] = (Math.random() - 0.5) * 2;
        positions[i3 + 2] = (Math.random() - 0.5) * 2;
        
        colors[i3] = 1;
        colors[i3 + 1] = 0.4;
        colors[i3 + 2] = 0.7;
        
        sizes[i] = Math.random() * 0.05 + 0.02;
        phases[i] = Math.random() * Math.PI * 2;
        
        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      }

      geometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new window.THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new window.THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('velocity', new window.THREE.BufferAttribute(velocities, 3));
      geometry.setAttribute('phase', new window.THREE.BufferAttribute(phases, 1));

      const material = new window.THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          spread: { value: 1 },
          hueShift: { value: 0 },
          brightness: { value: 1 },
          turbulence: { value: 0.3 }
        },
        vertexShader: `
          attribute float size;
          attribute float phase;
          attribute vec3 velocity;
          varying vec3 vColor;
          uniform float time;
          uniform float spread;
          uniform float turbulence;
          
          void main() {
            vColor = color;
            vec3 pos = position;
            
            // Apply spread
            pos *= spread;
            
            // Add turbulent motion
            pos.x += sin(time + phase) * turbulence;
            pos.y += cos(time * 1.3 + phase) * turbulence;
            pos.z += sin(time * 0.8 + phase) * turbulence * 0.5;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * 300.0 / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          uniform float hueShift;
          uniform float brightness;
          
          vec3 hueShiftColor(vec3 color, float shift) {
            float angle = shift * 3.14159265 * 2.0;
            float s = sin(angle);
            float c = cos(angle);
            mat3 rotMat = mat3(
              0.299 + 0.701*c, 0.587 - 0.587*c, 0.114 - 0.114*c,
              0.299 - 0.299*c, 0.587 + 0.413*c, 0.114 - 0.114*c,
              0.299 - 0.299*c, 0.587 - 0.587*c, 0.114 + 0.886*c
            );
            return rotMat * color;
          }
          
          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            vec3 finalColor = hueShiftColor(vColor, hueShift) * brightness;
            
            // Glow effect
            float glow = 1.0 - dist * 2.0;
            finalColor += vec3(glow * 0.3);
            
            gl_FragColor = vec4(finalColor, alpha * 0.8);
          }
        `,
        blending: window.THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
      });

      particleSystem = new window.THREE.Points(geometry, material);
      scene.add(particleSystem);

      // Add ambient light
      const ambientLight = new window.THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);

      particles = {
        geometry,
        material,
        system: particleSystem,
        positions,
        colors,
        velocities,
        phases
      };
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        
        videoElement = videoRef.current;
        videoElement.srcObject = stream;
        cameraStream = stream;
        
        await videoElement.play();
        
        // Initialize MediaPipe Hands
        hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });
        
        hands.onResults(onHandResults);
        
        const processFrame = async () => {
          if (videoElement && videoElement.readyState === 4) {
            await hands.send({ image: videoElement });
          }
          requestAnimationFrame(processFrame);
        };
        
        processFrame();
        setIsLoading(false);
      } catch (err) {
        setError('Camera access denied. Please allow camera access to use hand tracking.');
        setIsLoading(false);
      }
    };

    const onHandResults = (results) => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setGestureInfo('No hands detected');
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      
      // Calculate palm openness (distance between thumb and pinky)
      const thumb = landmarks[4];
      const pinky = landmarks[20];
      const palmOpen = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
      gestureState.palmOpenness = Math.min(palmOpen * 2, 1);

      // Calculate hand velocity
      const wrist = landmarks[0];
      if (gestureState.prevWrist) {
        gestureState.handVelocity.x = (wrist.x - gestureState.prevWrist.x) * 10;
        gestureState.handVelocity.y = (wrist.y - gestureState.prevWrist.y) * 10;
      }
      gestureState.prevWrist = { x: wrist.x, y: wrist.y };

      // Detect gestures
      const fingersClosed = palmOpen < 0.2;
      const fingersOpen = palmOpen > 0.5;
      const index = landmarks[8];
      const middle = landmarks[12];
      const isPinch = Math.hypot(thumb.x - index.x, thumb.y - index.y) < 0.1;
      
      // Two hands detection for distance
      if (results.multiHandLandmarks.length === 2) {
        const hand1 = results.multiHandLandmarks[0][0];
        const hand2 = results.multiHandLandmarks[1][0];
        gestureState.handDistance = Math.hypot(hand1.x - hand2.x, hand1.y - hand2.y);
      } else {
        gestureState.handDistance = 0.5;
      }

      // Gesture recognition for template switching
      let gesture = 'none';
      let info = '';
      
      if (fingersClosed) {
        gesture = 'fist';
        info = '✊ Fist - Firework Burst';
        if (targetTemplate !== 'firework') {
          previousTemplate = targetTemplate;
          targetTemplate = 'firework';
          transitionProgress = 0;
          setCurrentTemplate('firework');
        }
      } else if (isPinch) {
        gesture = 'pinch';
        info = '🤏 Pinch - Saturn Rings';
        if (targetTemplate !== 'saturn') {
          previousTemplate = targetTemplate;
          targetTemplate = 'saturn';
          transitionProgress = 0;
          setCurrentTemplate('saturn');
        }
      } else if (fingersOpen && results.multiHandLandmarks.length === 2) {
        gesture = 'two_hands';
        info = '🙌 Two Hands - Spiral Galaxy';
        if (targetTemplate !== 'galaxy') {
          previousTemplate = targetTemplate;
          targetTemplate = 'galaxy';
          transitionProgress = 0;
          setCurrentTemplate('galaxy');
        }
      } else if (fingersOpen) {
        gesture = 'open';
        info = '✋ Open Palm - Organic Bloom';
        if (targetTemplate !== 'bloom') {
          previousTemplate = targetTemplate;
          targetTemplate = 'bloom';
          transitionProgress = 0;
          setCurrentTemplate('bloom');
        }
      }
      
      gestureState.currentGesture = gesture;
      setGestureInfo(info);

      // Smooth parameter transitions
      const smoothing = 0.1;
      gestureState.smoothedParams.spread += (gestureState.palmOpenness * 2 - gestureState.smoothedParams.spread) * smoothing;
      gestureState.smoothedParams.hue += (Math.abs(gestureState.handVelocity.x) - gestureState.smoothedParams.hue) * smoothing;
      gestureState.smoothedParams.speed += (gestureState.palmOpenness * 2 - gestureState.smoothedParams.speed) * smoothing;
      gestureState.smoothedParams.turbulence += (Math.abs(gestureState.handVelocity.y) - gestureState.smoothedParams.turbulence) * smoothing;
    };

    const updateParticles = (time) => {
      if (!particles) return;

      const positions = particles.positions;
      const colors = particles.colors;
      const velocities = particles.velocities;
      const template = templates[targetTemplate];
      
      // Smooth transition
      if (transitionProgress < 1) {
        transitionProgress += 0.02;
      }
      const t = Math.min(transitionProgress, 1);
      const eased = t * t * (3 - 2 * t); // Smoothstep

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 * template.layers;
        const radius = (i / PARTICLE_COUNT) * template.spread;
        
        let targetX, targetY, targetZ;
        
        switch (template.pattern) {
          case 'spiral':
            targetX = Math.cos(angle + time * 0.5) * radius;
            targetY = Math.sin(angle + time * 0.5) * radius;
            targetZ = Math.sin(angle * 2 + time) * 0.5;
            break;
          case 'rings':
            const ring = Math.floor(i / (PARTICLE_COUNT / 3));
            const ringRadius = 1 + ring * 0.3;
            targetX = Math.cos(angle) * ringRadius;
            targetY = Math.sin(angle) * ringRadius * 0.1;
            targetZ = Math.sin(angle) * ringRadius;
            break;
          case 'explosion':
            const explosionRadius = radius * 1.5;
            targetX = Math.cos(angle) * explosionRadius;
            targetY = Math.sin(angle) * explosionRadius;
            targetZ = Math.cos(angle * 0.5) * explosionRadius;
            break;
          case 'galaxy':
            const spiralAngle = angle + radius * 2;
            targetX = Math.cos(spiralAngle) * radius * 1.2;
            targetY = Math.sin(spiralAngle) * radius * 1.2;
            targetZ = Math.sin(radius * 3) * 0.3;
            break;
          default:
            targetX = positions[i3];
            targetY = positions[i3 + 1];
            targetZ = positions[i3 + 2];
        }

        // Apply gesture controls
        targetX *= gestureState.smoothedParams.spread;
        targetY *= gestureState.smoothedParams.spread;
        targetZ *= gestureState.smoothedParams.spread;

        // Smooth interpolation
        positions[i3] += (targetX - positions[i3]) * 0.05 * eased;
        positions[i3 + 1] += (targetY - positions[i3 + 1]) * 0.05 * eased;
        positions[i3 + 2] += (targetZ - positions[i3 + 2]) * 0.05 * eased;

        // Color based on hue shift
        const hue = (gestureState.smoothedParams.hue + i / PARTICLE_COUNT) % 1;
        const rgb = hslToRgb(hue, 0.8, 0.6);
        colors[i3] = rgb[0];
        colors[i3 + 1] = rgb[1];
        colors[i3 + 2] = rgb[2];
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;

      // Update shader uniforms
      particles.material.uniforms.spread.value = gestureState.smoothedParams.spread;
      particles.material.uniforms.hueShift.value = gestureState.smoothedParams.hue;
      particles.material.uniforms.brightness.value = 1 + gestureState.smoothedParams.speed * 0.5;
      particles.material.uniforms.turbulence.value = gestureState.smoothedParams.turbulence * 0.5;
    };

    const hslToRgb = (h, s, l) => {
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [r, g, b];
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      particles.material.uniforms.time.value = time;
      
      updateParticles(time);
      
      particleSystem.rotation.y += gestureState.handVelocity.x * 0.1;
      particleSystem.rotation.x += gestureState.handVelocity.y * 0.1;
      
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const init = async () => {
      // Load Three.js
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = async () => {
        // Load MediaPipe
        const handsScript = document.createElement('script');
        handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        handsScript.onload = async () => {
          const cameraUtilsScript = document.createElement('script');
          cameraUtilsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
          cameraUtilsScript.onload = async () => {
            initThree();
            await initCamera();
            animate();
            window.addEventListener('resize', handleResize);
          };
          document.head.appendChild(cameraUtilsScript);
        };
        document.head.appendChild(handsScript);
      };
      document.head.appendChild(script);
    };

    init();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <video 
        ref={videoRef} 
        className="absolute top-4 right-4 w-40 h-30 rounded-lg border-2 border-purple-500 opacity-50"
        playsInline
        muted
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse" />
            <p className="text-white text-xl">Initializing hand tracking...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="text-center max-w-md p-8">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-black bg-opacity-70 p-4 rounded-lg border border-purple-500">
        <div className="flex items-center gap-2 mb-2">
          <Hand className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold">Current Template:</span>
        </div>
        <p className="text-purple-300 text-lg">{currentTemplate}</p>
        {gestureInfo && (
          <p className="text-cyan-300 text-sm mt-2">{gestureInfo}</p>
        )}
      </div>

      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-4 rounded-lg border border-purple-500 max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold">Gesture Controls:</span>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          <p>✋ <span className="text-purple-300">Open Palm</span> → Organic Bloom</p>
          <p>🤏 <span className="text-blue-300">Pinch</span> → Saturn Rings</p>
          <p>✊ <span className="text-yellow-300">Fist</span> → Firework Burst</p>
          <p>🙌 <span className="text-pink-300">Two Hands</span> → Spiral Galaxy</p>
          <p className="mt-2 text-cyan-300">• Hand distance controls particle spread</p>
          <p className="text-cyan-300">• Movement changes colors & turbulence</p>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black bg-opacity-70 p-3 rounded-lg border border-purple-500">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <span className="text-white text-sm">Gesture-Controlled Particles</span>
      </div>
    </div>
  );
};

export default GestureParticleSystem;