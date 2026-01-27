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

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const angle = (i / this.PARTICLE_COUNT) * Math.PI * 2 * config.spirals;
            const radius = (i / this.PARTICLE_COUNT) * config.size;

            const pos = this.calculateParticlePosition(type, i, angle, radius, config);
            positions[i3] = pos.x + position.x;
            positions[i3 + 1] = pos.y + position.y;
            positions[i3 + 2] = pos.z + position.z;

            // Grayscale colors based on brightness - make brighter and more visible
            const brightness = 0.7 + (i / this.PARTICLE_COUNT) * 0.3;
            colors[i3] = brightness;
            colors[i3 + 1] = brightness;
            colors[i3 + 2] = brightness;

            sizes[i] = Math.random() * 0.08 + 0.04;
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
                    gl_PointSize = size * 400.0 / -mvPosition.z;
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
            'planet': 5,
            'solar_system': 12,
            'galaxy': 25,
            'multiverse': 50
        };
        return distances[mode] || 5;
    }

    createUniverse() {
        const universe = {
            id: this.universes.length,
            physics: this.generatePhysics(),
            chaosLevel: Math.random()
        };
        this.universes.push(universe);
        return universe;
    }

    generatePhysics() {
        return {
            gravity: Math.random() * 2,
            timeScale: Math.random() * 2 + 0.5,
            entropy: Math.random()
        };
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
        const pinky = hand[20];

        const thumbIndexDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        const thumbPinkyDist = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
        
        if (thumbIndexDist < 0.12) {
            const velocity = Math.hypot(this.gestureState.handVelocity.x, this.gestureState.handVelocity.y);
            if (velocity > 0.3) {
                return 'summon';
            }
            return 'pinch';
        }

        if (allHands.length === 2) {
            if (this.gestureState.handDistance < 0.3) {
                return 'evolve';
            }
            
            if (this.gestureState.handDistance > 0.6) {
                return 'zoom_out';
            }
            
            return 'two_hands';
        }

        if (this.gestureState.handVelocity.y < -1.0) {
            return 'create_universe';
        }

        if (thumbPinkyDist > 0.5) {
            return 'rotate';
        }

        if (thumbPinkyDist < 0.2) {
            return 'fist';
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
        // Remove fog that was hiding particles
        // this.scene.fog = new THREE.FogExp2(0x000000, 0.05);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

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
                    statusEl.textContent = 'Summoning entity...';
                    this.summonEntity();
                    break;

                case 'evolve':
                    statusEl.textContent = 'Evolving entity...';
                    this.evolveCurrentEntity();
                    break;

                case 'create_universe':
                    statusEl.textContent = 'Creating universe...';
                    this.createNewUniverse();
                    break;

                case 'zoom_out':
                    statusEl.textContent = 'Zooming universe...';
                    break;

                case 'rotate':
                    statusEl.textContent = 'Rotating galaxy...';
                    break;

                case 'none':
                    statusEl.textContent = 'Waiting for hands...';
                    break;

                default:
                    statusEl.textContent = `Gesture detected: ${gesture}`;
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
