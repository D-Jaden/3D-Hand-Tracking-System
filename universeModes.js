// universeModes.js - Universe Scale & Mode Management

class UniverseManager {
    constructor(camera) {
        this.camera = camera;
        this.currentMode = 'planet';
        this.universes = [];
        this.activeUniverseIndex = 0;
        this.zoomLevel = 0; // 0 = planet, 1 = solar system, 2 = galaxy, 3 = multiverse
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

        // Adjust camera based on mode
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
            colorPalette: this.generateColorPalette(),
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

    generateColorPalette() {
        const baseHue = Math.random();
        return {
            primary: baseHue,
            secondary: (baseHue + 0.3) % 1,
            tertiary: (baseHue + 0.6) % 1
        };
    }

    getCurrentMode() {
        return this.currentMode;
    }

    getUniverseCount() {
        return this.universes.length;
    }
}

window.UniverseManager = UniverseManager;