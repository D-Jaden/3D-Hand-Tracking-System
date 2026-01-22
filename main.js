// main.js - Main Application Bootstrap

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
        // Verify all classes are loaded
        if (typeof ParticleSystem === 'undefined') {
            console.error('ParticleSystem not loaded!');
            alert('Error: ParticleSystem not loaded. Please refresh the page.');
            return;
        }
        if (typeof UniverseManager === 'undefined') {
            console.error('UniverseManager not loaded!');
            alert('Error: UniverseManager not loaded. Please refresh the page.');
            return;
        }
        if (typeof HandTracker === 'undefined') {
            console.error('HandTracker not loaded!');
            alert('Error: HandTracker not loaded. Please refresh the page.');
            return;
        }

        console.log('All classes loaded successfully!');
        
        // Show camera permission modal
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
            // Update loading text
            loadingText.textContent = 'Accessing camera...';
            await this.sleep(500);

            // Initialize hand tracking
            this.handTracker = new HandTracker();
            await this.handTracker.initialize();

            loadingText.textContent = 'Initializing Three.js...';
            await this.sleep(500);

            // Initialize Three.js
            this.initThree();

            loadingText.textContent = 'Creating particle systems...';
            await this.sleep(500);

            // Initialize particle system
            this.particleSystem = new ParticleSystem(this.scene);

            loadingText.textContent = 'Connecting to the multiverse...';
            await this.sleep(500);

            // Initialize universe manager
            this.universeManager = new UniverseManager(this.camera);
            this.universeManager.createUniverse();

            // Setup gesture handlers
            this.setupGestureHandlers();

            // Create initial entity
            const initialEntity = this.particleSystem.createEntity('planet');
            this.updateHUD(initialEntity);

            loadingText.textContent = 'Ready!';
            await this.sleep(500);

            // Hide loading screen
            loadingScreen.classList.add('hidden');

            // Start animation loop
            this.isRunning = true;
            this.animate();

            // Update status
            this.updateHandStatus(true);

        } catch (error) {
            loadingScreen.classList.add('hidden');
            console.error('Initialization error:', error);
            alert('Failed to initialize Cosmic Dex: ' + error.message);
        }
    }

    initThree() {
        // Setup scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000510);
        this.scene.fog = new THREE.FogExp2(0x000510, 0.05);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        // Setup renderer
        const canvas = document.getElementById('cosmic-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        // Add point light
        const pointLight = new THREE.PointLight(0x00d9ff, 2, 100);
        pointLight.position.set(0, 0, 10);
        this.scene.add(pointLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupGestureHandlers() {
        this.handTracker.onGesture((gesture, state) => {
            const statusEl = document.getElementById('gesture-status');
            
            switch (gesture) {
                case 'summon':
                    statusEl.textContent = '🤏➡️ Summoning entity...';
                    this.summonEntity();
                    break;

                case 'evolve':
                    statusEl.textContent = '🙌 Evolving entity...';
                    this.evolveCurrentEntity();
                    break;

                case 'create_universe':
                    statusEl.textContent = '👆⬆️ Creating universe...';
                    this.createNewUniverse();
                    break;

                case 'zoom_out':
                    statusEl.textContent = '👐 Zooming universe...';
                    break;

                case 'rotate':
                    statusEl.textContent = '🔄 Rotating galaxy...';
                    break;

                case 'none':
                    statusEl.textContent = 'Waiting for hands...';
                    break;

                default:
                    statusEl.textContent = `Gesture detected: ${gesture}`;
            }

            // Update cosmic power
            const velocity = Math.hypot(state.handVelocity.x, state.handVelocity.y);
            this.cosmicPower = Math.min(this.cosmicPower + velocity * 0.1, 100);
            this.cosmicPower = Math.max(this.cosmicPower - 0.5, 0);
            
            const powerFill = document.getElementById('power-fill');
            powerFill.style.width = this.cosmicPower + '%';
        });
    }

    summonEntity() {
        const types = ['planet', 'star', 'nebula', 'ringed_planet'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        if (this.particleSystem.currentEntity) {
            this.particleSystem.removeEntity(this.particleSystem.currentEntity);
        }

        const entity = this.particleSystem.createEntity(randomType);
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
            this.evolutionCooldown = 60; // 1 second cooldown
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

        // Color rarity badge
        const rarityEl = document.getElementById('rarity-badge');
        const rarityColors = {
            'COMMON': '#888',
            'UNCOMMON': '#00ff88',
            'RARE': '#00d9ff',
            'LEGENDARY': '#ff00ff',
            'MYTHICAL': '#ffd700'
        };
        rarityEl.style.background = `rgba(${this.hexToRgb(rarityColors[entity.rarity])}, 0.3)`;
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

        // Update particle system
        this.particleSystem.update(time, gestureState);

        // Update universe mode
        const modeChanged = this.universeManager.update(gestureState.handDistance);
        if (modeChanged) {
            const mode = this.universeManager.getCurrentMode();
            document.getElementById('current-mode').textContent = mode.replace('_', ' ').toUpperCase() + ' VIEW';
        }

        // Cooldown management
        if (this.evolutionCooldown > 0) {
            this.evolutionCooldown--;
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 255, 255';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Wait for all scripts and DOM to be ready
window.addEventListener('load', () => {
    console.log('Page fully loaded');
    // Small delay to ensure all scripts are parsed
    setTimeout(() => {
        const app = new CosmicDex();
        app.init();
    }, 100);
});
