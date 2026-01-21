// handTracking.js - Hand Detection & Gesture Recognition

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
            // Get video element
            this.videoElement = document.getElementById('camera-feed');
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user', 
                    width: 1280, 
                    height: 720 
                }
            });
            
            this.videoElement.srcObject = stream;
            await this.videoElement.play();

            // Initialize MediaPipe Hands
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

            // Start processing frames
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

        // Process hands
        const hands = results.multiHandLandmarks;
        const handedness = results.multiHandedness;

        // Identify left and right hands
        this.gestureState.leftHand = null;
        this.gestureState.rightHand = null;

        hands.forEach((landmarks, index) => {
            if (handedness[index].label === 'Left') {
                this.gestureState.leftHand = landmarks;
            } else {
                this.gestureState.rightHand = landmarks;
            }
        });

        // Use first hand for primary calculations
        const primaryHand = hands[0];
        
        // Calculate palm openness
        const thumb = primaryHand[4];
        const pinky = primaryHand[20];
        const palmOpen = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
        this.gestureState.palmOpenness = Math.min(palmOpen * 2, 1);

        // Calculate hand velocity
        const wrist = primaryHand[0];
        if (this.gestureState.prevWrist) {
            this.gestureState.handVelocity.x = (wrist.x - this.gestureState.prevWrist.x) * 10;
            this.gestureState.handVelocity.y = (wrist.y - this.gestureState.prevWrist.y) * 10;
        }
        this.gestureState.prevWrist = { x: wrist.x, y: wrist.y, z: wrist.z };

        // Calculate hand distance (for two hands)
        if (hands.length === 2) {
            const hand1Wrist = hands[0][0];
            const hand2Wrist = hands[1][0];
            this.gestureState.handDistance = Math.hypot(
                hand1Wrist.x - hand2Wrist.x,
                hand1Wrist.y - hand2Wrist.y
            );
        }

        // Detect specific gestures
        const gesture = this.classifyGesture(primaryHand, hands);
        this.gestureState.currentGesture = gesture;

        // Smooth parameters
        const smoothing = 0.15;
        this.gestureState.smoothedParams.spread += 
            (this.gestureState.palmOpenness * 2 - this.gestureState.smoothedParams.spread) * smoothing;
        this.gestureState.smoothedParams.hue += 
            (Math.abs(this.gestureState.handVelocity.x) - this.gestureState.smoothedParams.hue) * smoothing;
        this.gestureState.smoothedParams.speed += 
            (this.gestureState.palmOpenness * 2 - this.gestureState.smoothedParams.speed) * smoothing;
        this.gestureState.smoothedParams.turbulence += 
            (Math.abs(this.gestureState.handVelocity.y) - this.gestureState.smoothedParams.turbulence) * smoothing;

        // Notify listeners
        this.notifyGestureListeners(gesture, this.gestureState);
    }

    classifyGesture(hand, allHands) {
        const thumb = hand[4];
        const index = hand[8];
        const middle = hand[12];
        const ring = hand[16];
        const pinky = hand[20];
        const wrist = hand[0];

        // Calculate distances
        const thumbIndexDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        const thumbPinkyDist = Math.hypot(thumb.x - pinky.x, thumb.y - pinky.y);
        
        // Pinch detection (summon)
        if (thumbIndexDist < 0.08) {
            // Check for forward motion
            const velocity = Math.hypot(this.gestureState.handVelocity.x, this.gestureState.handVelocity.y);
            if (velocity > 0.5) {
                return 'summon';
            }
            return 'pinch';
        }

        // Two hands together (evolve)
        if (allHands.length === 2) {
            if (this.gestureState.handDistance < 0.3) {
                return 'evolve';
            }
            
            // Two hands apart (zoom)
            if (this.gestureState.handDistance > 0.6) {
                return 'zoom_out';
            }
            
            return 'two_hands';
        }

        // Swipe up (create universe)
        if (this.gestureState.handVelocity.y < -1.5) {
            return 'create_universe';
        }

        // Open palm (rotate)
        if (thumbPinkyDist > 0.5) {
            return 'rotate';
        }

        // Fist (special action)
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

// Export for use in main.js
window.HandTracker = HandTracker;