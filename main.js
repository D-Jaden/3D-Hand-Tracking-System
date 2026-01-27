// main.js - Main Application with Integrated Particle System

// ============================================
// PARTICLE SYSTEM (Integrated)
// ============================================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleGroups = [];
        this.PARTICLE_COUNT = 8000;
        this.currentEntity = null;
    }

    createEntity(type, position = { x: 0, y: 0, z: 0 }) {
        const entity = {
            type: type,
            name: this.generateEntityName(type),
            rarity: this.calculateRarity(),
            size: Math.random() * 0.5 + 0.5,
            energy: Math.random(),
            evolution: 0,
            geometry: null,
            material: null,
            mesh: null,
            particles: null
        };

        const config = this.getEntityConfig(type);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.PARTICLE_COUNT * 3);
        const colors = new Float32Array(this.PARTICLE_COUNT * 3);
        const sizes = new Float32Array(this.PARTICLE_COUNT);
        const velocities = new Float32Array(this.PARTICLE_COUNT * 3);

        // Get current universe color scheme
        const colorScheme = window.currentUniverseColor || { hue: 0.5, sat: 0.8 };

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const angle = (i / this.PARTICLE_COUNT) * Math.PI * 2 * config.spirals;
            const radius = (i / this.PARTICLE_COUNT) * config.size;

            const pos = this.calculateParticlePosition(type, i, angle, radius, config);
            positions[i3] = pos.x + position.x;
            positions[i3 + 1] = pos.y + position.y;
            positions[i3 + 2] = pos.z + position.z;

            // Use universe color scheme
            const hueVariation = (i / this.PARTICLE_COUNT) * 0.1 - 0.05;
            const hue = (colorScheme.hue + hueVariation + 1) % 1;
            const lightness = 0.5 + (i / this.PARTICLE_COUNT) * 0.3;
            const rgb = this.hslToRgb(hue, colorScheme.sat, lightness);
            colors[i3] = rgb[0];
            colors[i3 + 1] = rgb[1];
            colors[i3 + 2] = rgb[2];

            sizes[i] = Math.random() * 0.5 + 0.3; // FIXED: Increased from 0.08 + 0.04
            velocities[i3] = (Math.random() - 0.5) * 0.01;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                entityGlow: { value: config.glow }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 velocity;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec3 pos = position + velocity * time;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * 100.0 / -mvPosition.z; // FIXED: Changed from 400.0 to 100.0
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float entityGlow;
                
                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    vec3 finalColor = vColor * (1.5 + entityGlow);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        const mesh = new THREE.Points(geometry, material);
        this.scene.add(mesh);

        entity.geometry = geometry;
        entity.material = material;
        entity.mesh = mesh;
        entity.particles = { positions, colors, sizes, velocities };

        this.currentEntity = entity;
        return entity;
    }

    calculateParticlePosition(type, index, angle, radius, config) {
        const pos = { x: 0, y: 0, z: 0 };
        const normalizedIndex = index / this.PARTICLE_COUNT;

        switch (type) {
            case 'planet':
                const theta = Math.acos(2 * normalizedIndex - 1);
                const phi = Math.sqrt(this.PARTICLE_COUNT * Math.PI) * theta;
                pos.x = radius * Math.sin(theta) * Math.cos(phi);
                pos.y = radius * Math.sin(theta) * Math.sin(phi);
                pos.z = radius * Math.cos(theta);
                break;

            case 'ringed_planet':
                if (index < this.PARTICLE_COUNT * 0.6) {
                    const sphereIndex = index / (this.PARTICLE_COUNT * 0.6);
                    const t = Math.acos(2 * sphereIndex - 1);
                    const p = Math.sqrt(this.PARTICLE_COUNT * Math.PI) * t;
                    pos.x = radius * 0.5 * Math.sin(t) * Math.cos(p);
                    pos.y = radius * 0.5 * Math.sin(t) * Math.sin(p);
                    pos.z = radius * 0.5 * Math.cos(t);
                } else {
                    const ringRadius = radius * (0.8 + Math.random() * 0.4);
                    pos.x = Math.cos(angle) * ringRadius;
                    pos.y = (Math.random() - 0.5) * ringRadius * 0.05;
                    pos.z = Math.sin(angle) * ringRadius;
                }
                break;

            case 'star':
                const coreRadius = radius * (0.3 + Math.random() * 0.7);
                pos.x = Math.cos(angle) * coreRadius;
                pos.y = Math.sin(angle) * coreRadius;
                pos.z = (Math.random() - 0.5) * coreRadius;
                break;

            case 'supergiant':
                const expandRadius = radius * (1.5 + Math.random());
                pos.x = Math.cos(angle) * expandRadius;
                pos.y = Math.sin(angle) * expandRadius;
                pos.z = Math.sin(angle * 2) * expandRadius * 0.5;
                break;

            case 'black_hole':
                const diskRadius = radius * (0.5 + normalizedIndex);
                const spiralAngle = angle + (diskRadius * 5);
                pos.x = Math.cos(spiralAngle) * diskRadius;
                pos.y = (Math.random() - 0.5) * diskRadius * 0.1;
                pos.z = Math.sin(spiralAngle) * diskRadius;
                break;

            case 'nebula':
                pos.x = (Math.random() - 0.5) * radius * 2;
                pos.y = (Math.random() - 0.5) * radius * 2;
                pos.z = (Math.random() - 0.5) * radius;
                break;

            case 'solar_system':
                const orbit = Math.floor(index / (this.PARTICLE_COUNT / 5));
                const orbitRadius = radius * (0.3 + orbit * 0.2);
                const orbitAngle = angle + orbit;
                pos.x = Math.cos(orbitAngle) * orbitRadius;
                pos.y = (Math.random() - 0.5) * orbitRadius * 0.1;
                pos.z = Math.sin(orbitAngle) * orbitRadius;
                break;

            case 'galaxy':
                const galaxyRadius = radius * 1.5;
                const spiralGalaxyAngle = angle + (radius * 3);
                pos.x = Math.cos(spiralGalaxyAngle) * galaxyRadius;
                pos.y = Math.sin(spiralGalaxyAngle) * galaxyRadius;
                pos.z = Math.sin(radius * 2) * 0.2;
                break;

            case 'multiverse':
                const cluster = Math.floor(index / (this.PARTICLE_COUNT / 3));
                const clusterOffset = cluster * 2 - 2;
                const clusterAngle = angle + (radius * 2);
                pos.x = Math.cos(clusterAngle) * radius + clusterOffset;
                pos.y = Math.sin(clusterAngle) * radius;
                pos.z = Math.sin(radius) * 0.5;
                break;

            default:
                pos.x = Math.cos(angle) * radius;
                pos.y = Math.sin(angle) * radius;
                pos.z = (Math.random() - 0.5) * radius;
        }

        return pos;
    }

    getEntityConfig(type) {
        const configs = {
            planet: { size: 1, glow: 0.5, spirals: 1 },
            ringed_planet: { size: 1.5, glow: 0.7, spirals: 8 },
            star: { size: 1.2, glow: 2, spirals: 12 },
            supergiant: { size: 2, glow: 3, spirals: 16 },
            black_hole: { size: 1.5, glow: 1.5, spirals: 20 },
            nebula: { size: 3, glow: 1, spirals: 5 },
            solar_system: { size: 2.5, glow: 1.2, spirals: 5 },
            galaxy: { size: 3, glow: 1.8, spirals: 8 },
            multiverse: { size: 5, glow: 2.5, spirals: 3 }
        };
        return configs[type] || configs.planet;
    }

    evolveEntity(entity) {
        const evolutionMap = {
            'planet': 'ringed_planet',
            'ringed_planet': 'star',
            'star': 'supergiant',
            'supergiant': 'black_hole',
            'nebula': 'solar_system',
            'solar_system': 'galaxy',
            'galaxy': 'multiverse',
            'black_hole': 'multiverse'
        };

        const nextType = evolutionMap[entity.type];
        if (!nextType) return entity;

        entity.evolution += 1;
        return this.createEntity(nextType, {
            x: entity.mesh.position.x,
            y: entity.mesh.position.y,
            z: entity.mesh.position.z
        });
    }

    update(time, gestureState) {
        if (!this.currentEntity) return;

        this.currentEntity.material.uniforms.time.value = time;

        const mesh = this.currentEntity.mesh;
        mesh.rotation.y += gestureState.handVelocity.x * 0.05;
        mesh.rotation.x += gestureState.handVelocity.y * 0.05;

        const scale = 0.8 + gestureState.smoothedParams.spread * 0.4;
        mesh.scale.setScalar(scale);
    }

    generateEntityName(type) {
        const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Nova', 'Stellar', 'Cosmic'];
        const suffixes = ['Prime', 'Major', 'Minor', 'Centauri', 'Nebula', 'Cluster', 'System'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const number = Math.floor(Math.random() * 9999);
        return `${prefix}-${number} ${suffix}`;
    }

    calculateRarity() {
        const roll = Math.random();
        if (roll > 0.95) return 'MYTHICAL';
        if (roll > 0.85) return 'LEGENDARY';
        if (roll > 0.65) return 'RARE';
        if (roll > 0.35) return 'UNCOMMON';
        return 'COMMON';
    }

    hslToRgb(h, s, l) {
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
    }

    removeEntity(entity) {
        if (entity && entity.mesh) {
            this.scene.remove(entity.mesh);
            entity.geometry.dispose();
            entity.material.dispose();
        }
    }
}

// ============================================
// UNIVERSE MANAGER
// ============================================
class UniverseManager {
    constructor(camera) {
        this.camera = camera;
        this.currentMode = 'planet';
        this.universes = [];
        this.activeUniverseIndex = 0;
        this.zoomLevel = 0;
        this.transitionProgress = 1;
        this.currentUniverseColor = this.generateColorScheme(); // Current active universe color
    }

    getModeFromZoom(handDistance) {
        if (handDistance < 0.3) return 'planet';
        if (handDistance < 0.5) return 'solar_system';
        if (handDistance < 0.7) return 'galaxy';
        return 'multiverse';
    }

    updateMode(newMode) {
        if (newMode !== this.currentMode) {
            this.currentMode = newMode;
            this.transitionProgress = 0;
            return true;
        }
        return false;
    }

    update(handDistance) {
        const targetMode = this.getModeFromZoom(handDistance);
        const changed = this.updateMode(targetMode);

        if (this.transitionProgress < 1) {
            this.transitionProgress += 0.02;
        }

        const targetZ = this.getCameraDistance(this.currentMode);
        const currentZ = this.camera.position.z;
        this.camera.position.z += (targetZ - currentZ) * 0.05;

        return changed;
    }

    getCameraDistance(mode) {
        const distances = {
            'planet': 8, // FIXED: Increased from 5 to 8
            'solar_system': 15, // FIXED: Increased from 12 to 15
            'galaxy': 30, // FIXED: Increased from 25 to 30
            'multiverse': 60 // FIXED: Increased from 50 to 60
        };
        return distances[mode] || 8;
    }

    createUniverse() {
        const colorScheme = this.generateColorScheme();
        const universe = {
            id: this.universes.length,
            physics: this.generatePhysics(),
            chaosLevel: Math.random(),
            colorScheme: colorScheme
        };
        this.universes.push(universe);
        this.currentUniverseColor = colorScheme; // Update current color
        return universe;
    }

    generatePhysics() {
        return {
            gravity: Math.random() * 2,
            timeScale: Math.random() * 2 + 0.5,
            entropy: Math.random()
        };
    }

    generateColorScheme() {
        const schemes = [
            { name: 'Cyan', hue: 0.5, sat: 0.8 },      // Cyan/Blue
            { name: 'Purple', hue: 0.75, sat: 0.9 },   // Purple/Magenta
            { name: 'Green', hue: 0.33, sat: 0.7 },    // Green
            { name: 'Red', hue: 0.0, sat: 0.8 },       // Red
            { name: 'Orange', hue: 0.08, sat: 0.9 },   // Orange
            { name: 'Yellow', hue: 0.15, sat: 0.8 },   // Yellow
            { name: 'Pink', hue: 0.9, sat: 0.9 },      // Pink
            { name: 'Teal', hue: 0.45, sat: 0.7 }      // Teal
        ];
        return schemes[Math.floor(Math.random() * schemes.length)];
    }

    getCurrentColorScheme() {
        return this.currentUniverseColor;
    }

    getCurrentMode() {
        return this.currentMode;
    }

    getUniverseCount() {
        return this.universes.length;
    }
}

// ============================================
// HAND TRACKER
// ============================================
class HandTracker {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.gestureState = {
            leftHand: null,
            rightHand: null,
            handDistance: 0,
            palmOpenness: 0,
            handVelocity: { x: 0, y: 0 },
            rotationAngle: 0,
            prevWrist: null,
            currentGesture: 'none',
            gestureConfidence: 0,
            smoothedParams: {
                spread: 1,
                hue: 0.6,
                speed: 1,
                turbulence: 0.3
            }
        };
        this.gestureCallbacks = [];
    }

    async initialize() {
        try {
            this.videoElement = document.getElementById('camera-feed');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user', 
                    width: 1280, 
                    height: 720 
                }
            });
            
            this.videoElement.srcObject = stream;
            await this.videoElement.play();

            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.8,
                minTrackingConfidence: 0.8
            });

            this.hands.onResults(this.onHandResults.bind(this));

            this.processFrame();
            this.isInitialized = true;
            
            return true;
        } catch (error) {
            console.error('Hand tracking initialization failed:', error);
            throw error;
        }
    }

    async processFrame() {
        if (this.videoElement && this.videoElement.readyState === 4) {
            await this.hands.send({ image: this.videoElement });
        }
        requestAnimationFrame(() => this.processFrame());
    }

    onHandResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.gestureState.currentGesture = 'none';
            this.notifyGestureListeners('none', this.gestureState);
            return;
        }

        const hands = results.multiHandLandmarks;
        const handedness = results.multiHandedness;

        this.gestureState.leftHand = null;
        this.gestureState.rightHand = null;

        hands.forEach((landmarks, index) => {
            if (handedness[index].label === 'Left') {
                this.gestureState.leftHand = landmarks;
            } else {
                this.gestureState.rightHand = landmarks;
            }
        });

        const primaryHand = hands[0];
        
        const thumb = primaryHand[4];
        const pinky = primaryHand[20];
        const palmOpen = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
        this.gestureState.palmOpenness = Math.min(palmOpen * 2, 1);

        const wrist = primaryHand[0];
        if (this.gestureState.prevWrist) {
            this.gestureState.handVelocity.x = (wrist.x - this.gestureState.prevWrist.x) * 10;
            this.gestureState.handVelocity.y = (wrist.y - this.gestureState.prevWrist.y) * 10;
        }
        this.gestureState.prevWrist = { x: wrist.x, y: wrist.y, z: wrist.z };

        if (hands.length === 2) {
            const hand1Wrist = hands[0][0];
            const hand2Wrist = hands[1][0];
            this.gestureState.handDistance = Math.hypot(
                hand1Wrist.x - hand2Wrist.x,
                hand1Wrist.y - hand2Wrist.y
            );
        }

        const gesture = this.classifyGesture(primaryHand, hands);
        this.gestureState.currentGesture = gesture;

        const smoothing = 0.15;
        this.gestureState.smoothedParams.spread += 
            (this.gestureState.palmOpenness * 2 - this.gestureState.smoothedParams.spread) * smoothing;
        this.gestureState.smoothedParams.hue += 
            (Math.abs(this.gestureState.handVelocity.x) - this.gestureState.smoothedParams.hue) * smoothing;
        this.gestureState.smoothedParams.speed += 
            (this.gestureState.palmOpenness * 2 - this.gestureState.smoothedParams.speed) * smoothing;
        this.gestureState.smoothedParams.turbulence += 
            (Math.abs(this.gestureState.handVelocity.y) - this.gestureState.smoothedParams.turbulence) * smoothing;

        this.notifyGestureListeners(gesture, this.gestureState);
    }

    classifyGesture(hand, allHands) {
        const thumb = hand[4];
        const index = hand[8];
        const middle = hand[12];
        const ring = hand[16];
        const pinky = hand[20];
        const wrist = hand[0];

        const thumbIndexDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        const thumbPinkyDist = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
        
        // IRON MAN STYLE GESTURES - ONE HAND ONLY
        
        // Open palm (all fingers extended) = Rotate/Look around
        const allFingersExtended = thumbPinkyDist > 0.4;
        if (allFingersExtended) {
            return 'look_around'; // Use hand movement to look around in 3D
        }

        // Pinch (thumb + index) = Summon entity
        if (thumbIndexDist < 0.12) {
            return 'summon';
        }

        // Point (index finger extended, others closed) = Evolve
        const indexExtended = Math.hypot(index.x - wrist.x, index.y - wrist.y) > 0.15;
        const middleClosed = Math.hypot(middle.x - wrist.x, middle.y - wrist.y) < 0.12;
        if (indexExtended && middleClosed) {
            return 'evolve';
        }

        // Fist (all fingers closed) = Create universe
        if (thumbPinkyDist < 0.15) {
            // Check if moving up (creating universe gesture)
            if (this.gestureState.handVelocity.y < -0.8) {
                return 'create_universe';
            }
            return 'fist';
        }

        // Peace sign (index + middle extended) = Zoom
        const middleExtended = Math.hypot(middle.x - wrist.x, middle.y - wrist.y) > 0.15;
        const ringClosed = Math.hypot(ring.x - wrist.x, ring.y - wrist.y) < 0.12;
        if (indexExtended && middleExtended && ringClosed) {
            return 'zoom';
        }

        return 'idle';
    }

    onGesture(callback) {
        this.gestureCallbacks.push(callback);
    }

    notifyGestureListeners(gesture, state) {
        this.gestureCallbacks.forEach(callback => callback(gesture, state));
    }

    getGestureState() {
        return this.gestureState;
    }

    destroy() {
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// ============================================
// MAIN APP
// ============================================
class CosmicDex {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.handTracker = null;
        this.particleSystem = null;
        this.universeManager = null;
        this.isRunning = false;
        this.cosmicPower = 0;
        this.evolutionCooldown = 0;
    }

    async init() {
        this.showCameraModal();
    }

    showCameraModal() {
        const modal = document.getElementById('camera-permission-modal');
        const grantBtn = document.getElementById('grant-camera-btn');

        grantBtn.addEventListener('click', async () => {
            modal.style.display = 'none';
            await this.requestCameraAndStart();
        });
    }

    async requestCameraAndStart() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.getElementById('loading-text');
        
        loadingScreen.classList.remove('hidden');

        try {
            loadingText.textContent = 'Accessing camera...';
            await this.sleep(500);

            this.handTracker = new HandTracker();
            await this.handTracker.initialize();

            loadingText.textContent = 'Initializing Three.js...';
            await this.sleep(500);

            this.initThree();

            loadingText.textContent = 'Creating particle systems...';
            await this.sleep(500);

            this.particleSystem = new ParticleSystem(this.scene);

            loadingText.textContent = 'Connecting to the multiverse...';
            await this.sleep(500);

            this.universeManager = new UniverseManager(this.camera);
            this.universeManager.createUniverse();
            
            // Set initial universe color
            window.currentUniverseColor = this.universeManager.getCurrentColorScheme();
            console.log('Initial universe color:', window.currentUniverseColor.name);

            this.setupGestureHandlers();

            const initialEntity = this.particleSystem.createEntity('planet');
            console.log('Initial entity created:', initialEntity);
            console.log('Scene children count:', this.scene.children.length);
            console.log('Particle mesh position:', initialEntity.mesh.position);
            this.updateHUD(initialEntity);

            loadingText.textContent = 'Ready!';
            await this.sleep(500);

            loadingScreen.classList.add('hidden');

            this.isRunning = true;
            this.animate();

            this.updateHandStatus(true);

        } catch (error) {
            loadingScreen.classList.add('hidden');
            alert('Failed to initialize Cosmic Dex: ' + error.message);
        }
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 8; // FIXED: Increased from 5 to 8

        const canvas = document.getElementById('cosmic-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 3, 100);
        pointLight.position.set(0, 0, 10);
        this.scene.add(pointLight);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupGestureHandlers() {
        this.handTracker.onGesture((gesture, state) => {
            const statusEl = document.getElementById('gesture-status');
            
            switch (gesture) {
                case 'summon':
                    statusEl.textContent = '🤏 Pinch: Summoning entity...';
                    this.summonEntity();
                    break;

                case 'evolve':
                    statusEl.textContent = '☝️ Point: Evolving entity...';
                    this.evolveCurrentEntity();
                    break;

                case 'create_universe':
                    statusEl.textContent = '✊⬆️ Fist Up: Creating universe...';
                    this.createNewUniverse();
                    break;

                case 'look_around':
                    statusEl.textContent = '✋ Open Palm: Looking around in 3D...';
                    break;

                case 'zoom':
                    statusEl.textContent = '✌️ Peace Sign: Zooming...';
                    break;

                case 'fist':
                    statusEl.textContent = '✊ Fist: Ready...';
                    break;

                case 'idle':
                    statusEl.textContent = '👋 Show hand to interact...';
                    break;

                case 'none':
                    statusEl.textContent = 'Waiting for hand...';
                    break;

                default:
                    statusEl.textContent = `Gesture: ${gesture}`;
            }

            const velocity = Math.hypot(state.handVelocity.x, state.handVelocity.y);
            this.cosmicPower = Math.min(this.cosmicPower + velocity * 0.1, 100);
            this.cosmicPower = Math.max(this.cosmicPower - 0.05, 0);
            const powerFill = document.getElementById('power-fill');
            powerFill.style.width = this.cosmicPower + '%';
        });
    }

    summonEntity() {
        const types = ['planet', 'star', 'nebula', 'ringed_planet'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        console.log('Summoning entity:', randomType);

        if (this.particleSystem.currentEntity) {
            this.particleSystem.removeEntity(this.particleSystem.currentEntity);
        }

        const entity = this.particleSystem.createEntity(randomType);
        console.log('Entity created:', entity);
        this.updateHUD(entity);
        this.cosmicPower = Math.max(this.cosmicPower - 20, 0);
    }

    evolveCurrentEntity() {
        if (!this.particleSystem.currentEntity || this.evolutionCooldown > 0) return;

        const currentEntity = this.particleSystem.currentEntity;
        this.showEvolutionAnimation();

        setTimeout(() => {
            const evolved = this.particleSystem.evolveEntity(currentEntity);
            this.particleSystem.removeEntity(currentEntity);
            this.updateHUD(evolved);
            this.hideEvolutionAnimation();
            this.evolutionCooldown = 60;
            this.cosmicPower = Math.max(this.cosmicPower - 30, 0);
        }, 1000);
    }

    createNewUniverse() {
        const universe = this.universeManager.createUniverse();
        
        // Store color scheme globally for particles to use
        window.currentUniverseColor = this.universeManager.getCurrentColorScheme();
        console.log('New universe created with color:', window.currentUniverseColor.name);
        
        // Recreate current entity with new colors
        if (this.particleSystem.currentEntity) {
            const currentType = this.particleSystem.currentEntity.type;
            this.particleSystem.removeEntity(this.particleSystem.currentEntity);
            const newEntity = this.particleSystem.createEntity(currentType);
            this.updateHUD(newEntity);
        }
        
        document.getElementById('universe-count').textContent = this.universeManager.getUniverseCount();
        this.cosmicPower = Math.max(this.cosmicPower - 40, 0);
    }

    updateHUD(entity) {
        document.getElementById('entity-name').textContent = entity.name;
        document.getElementById('entity-type').textContent = entity.type.replace('_', ' ').toUpperCase();
        document.getElementById('rarity-value').textContent = entity.rarity;
        document.getElementById('stat-size').textContent = entity.size.toFixed(2);
        document.getElementById('stat-energy').textContent = (entity.energy * 100).toFixed(0) + '%';
        document.getElementById('stat-evolution').textContent = 'Level ' + entity.evolution;

        const rarityEl = document.getElementById('rarity-badge');
        const rarityColors = {
            'COMMON': '#666',
            'UNCOMMON': '#999',
            'RARE': '#ccc',
            'LEGENDARY': '#eee',
            'MYTHICAL': '#fff'
        };
        rarityEl.style.background = rarityColors[entity.rarity];
        rarityEl.style.color = '#000';
    }

    updateHandStatus(active) {
        const statusDot = document.querySelector('.status-dot');
        if (active) {
            statusDot.classList.add('active');
        } else {
            statusDot.classList.remove('active');
        }
    }

    showEvolutionAnimation() {
        document.getElementById('evolution-overlay').classList.remove('hidden');
    }

    hideEvolutionAnimation() {
        document.getElementById('evolution-overlay').classList.add('hidden');
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;
        const gestureState = this.handTracker.getGestureState();

        this.particleSystem.update(time, gestureState);

        // IRON MAN 3D CAMERA CONTROL - Look around with open palm
        if (gestureState.currentGesture === 'look_around' && gestureState.prevWrist) {
            const handX = gestureState.prevWrist.x;
            const handY = gestureState.prevWrist.y;
            
            // Map hand position to camera rotation
            const targetRotationY = (handX - 0.5) * Math.PI * 0.8;
            const targetRotationX = (handY - 0.5) * Math.PI * 0.4;
            
            // Smooth camera movement
            this.camera.rotation.y += (targetRotationY - this.camera.rotation.y) * 0.1;
            this.camera.rotation.x += (targetRotationX - this.camera.rotation.x) * 0.1;
        }

        const modeChanged = this.universeManager.update(gestureState.handDistance);
        if (modeChanged) {
            const mode = this.universeManager.getCurrentMode();
            document.getElementById('current-mode').textContent = mode.replace('_', ' ').toUpperCase() + ' VIEW';
        }

        if (this.evolutionCooldown > 0) {
            this.evolutionCooldown--;
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.addEventListener('load', () => {
    const app = new CosmicDex();
    app.init();
});
