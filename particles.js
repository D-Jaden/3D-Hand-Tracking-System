// particles.js - Particle System & Celestial Entity Management

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

        // Create particle geometry based on type
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

            // Position based on entity type
            const pos = this.calculateParticlePosition(type, i, angle, radius, config);
            positions[i3] = pos.x + position.x;
            positions[i3 + 1] = pos.y + position.y;
            positions[i3 + 2] = pos.z + position.z;

            // Color
            const hue = (config.hue + i / this.PARTICLE_COUNT * 0.2) % 1;
            const rgb = this.hslToRgb(hue, 0.9, 0.6);
            colors[i3] = rgb[0];
            colors[i3 + 1] = rgb[1];
            colors[i3 + 2] = rgb[2];

            // Size and velocity
            sizes[i] = Math.random() * 0.04 + 0.02;
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
                    
                    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
                    vec3 finalColor = vColor * (1.0 + entityGlow);
                    
                    float glow = (1.0 - dist * 2.0) * entityGlow;
                    finalColor += vec3(glow);
                    
                    gl_FragColor = vec4(finalColor, alpha * 0.9);
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
                // Spherical distribution
                const theta = Math.acos(2 * normalizedIndex - 1);
                const phi = Math.sqrt(this.PARTICLE_COUNT * Math.PI) * theta;
                pos.x = radius * Math.sin(theta) * Math.cos(phi);
                pos.y = radius * Math.sin(theta) * Math.sin(phi);
                pos.z = radius * Math.cos(theta);
                break;

            case 'ringed_planet':
                if (index < this.PARTICLE_COUNT * 0.6) {
                    // Planet sphere
                    const sphereIndex = index / (this.PARTICLE_COUNT * 0.6);
                    const t = Math.acos(2 * sphereIndex - 1);
                    const p = Math.sqrt(this.PARTICLE_COUNT * Math.PI) * t;
                    pos.x = radius * 0.5 * Math.sin(t) * Math.cos(p);
                    pos.y = radius * 0.5 * Math.sin(t) * Math.sin(p);
                    pos.z = radius * 0.5 * Math.cos(t);
                } else {
                    // Rings
                    const ringRadius = radius * (0.8 + Math.random() * 0.4);
                    pos.x = Math.cos(angle) * ringRadius;
                    pos.y = (Math.random() - 0.5) * ringRadius * 0.05;
                    pos.z = Math.sin(angle) * ringRadius;
                }
                break;

            case 'star':
                // Bright core with corona
                const coreRadius = radius * (0.3 + Math.random() * 0.7);
                pos.x = Math.cos(angle) * coreRadius;
                pos.y = Math.sin(angle) * coreRadius;
                pos.z = (Math.random() - 0.5) * coreRadius;
                break;

            case 'supergiant':
                // Massive expanding star
                const expandRadius = radius * (1.5 + Math.random());
                pos.x = Math.cos(angle) * expandRadius;
                pos.y = Math.sin(angle) * expandRadius;
                pos.z = Math.sin(angle * 2) * expandRadius * 0.5;
                break;

            case 'black_hole':
                // Accretion disk with fixed spiral calculation
                const diskRadius = radius * (0.5 + normalizedIndex);
                const blackHoleSpiralAngle = angle + (diskRadius * 5);
                pos.x = Math.cos(blackHoleSpiralAngle) * diskRadius;
                pos.y = (Math.random() - 0.5) * diskRadius * 0.1;
                pos.z = Math.sin(blackHoleSpiralAngle) * diskRadius;
                break;

            case 'nebula':
                // Cloud-like distribution
                pos.x = (Math.random() - 0.5) * radius * 2;
                pos.y = (Math.random() - 0.5) * radius * 2;
                pos.z = (Math.random() - 0.5) * radius;
                break;

            case 'solar_system':
                // Multiple orbits
                const orbit = Math.floor(index / (this.PARTICLE_COUNT / 5));
                const orbitRadius = radius * (0.3 + orbit * 0.2);
                const orbitAngle = angle + orbit;
                pos.x = Math.cos(orbitAngle) * orbitRadius;
                pos.y = (Math.random() - 0.5) * orbitRadius * 0.1;
                pos.z = Math.sin(orbitAngle) * orbitRadius;
                break;

            case 'galaxy':
                // Spiral galaxy arms with fixed calculation
                const galaxyRadius = radius * 1.5;
                const galaxySpiralAngle = angle + (radius * 3);
                pos.x = Math.cos(galaxySpiralAngle) * galaxyRadius;
                pos.y = Math.sin(galaxySpiralAngle) * galaxyRadius;
                pos.z = Math.sin(radius * 2) * 0.2;
                break;

            case 'multiverse':
                // Multiple galaxy clusters
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
            planet: { size: 1, hue: 0.6, glow: 0.5, spirals: 1 },
            ringed_planet: { size: 1.5, hue: 0.15, glow: 0.7, spirals: 8 },
            star: { size: 1.2, hue: 0.1, glow: 2, spirals: 12 },
            supergiant: { size: 2, hue: 0.05, glow: 3, spirals: 16 },
            black_hole: { size: 1.5, hue: 0.75, glow: 1.5, spirals: 20 },
            nebula: { size: 3, hue: 0.8, glow: 1, spirals: 5 },
            solar_system: { size: 2.5, hue: 0.55, glow: 1.2, spirals: 5 },
            galaxy: { size: 3, hue: 0.65, glow: 1.8, spirals: 8 },
            multiverse: { size: 5, hue: 0.9, glow: 2.5, spirals: 3 }
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

        // Apply gesture influences
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

window.ParticleSystem = ParticleSystem;
