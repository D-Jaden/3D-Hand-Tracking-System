<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Cosmic Dex - Hand-Controlled Multiverse Explorer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            background: #000510;
            color: #fff;
            touch-action: none;
        }

        #cosmic-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 1;
        }

        #camera-feed {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 120px;
            height: 90px;
            border-radius: 8px;
            border: 2px solid rgba(0, 217, 255, 0.5);
            z-index: 10;
            object-fit: cover;
            opacity: 0.8;
        }

        @media (min-width: 768px) {
            #camera-feed {
                top: 20px;
                right: 20px;
                width: 200px;
                height: 150px;
                border-radius: 12px;
            }
        }

        /* Camera Permission Modal */
        #camera-permission-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 5, 16, 0.95);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .modal-content {
            background: linear-gradient(135deg, rgba(0, 30, 60, 0.9), rgba(0, 10, 30, 0.9));
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 20px;
            padding: 30px 20px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 217, 255, 0.3);
        }

        @media (min-width: 768px) {
            .modal-content {
                padding: 40px;
            }
        }

        .modal-content h1 {
            font-size: 24px;
            margin-bottom: 15px;
            background: linear-gradient(90deg, #00d9ff, #ff00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        @media (min-width: 768px) {
            .modal-content h1 {
                font-size: 32px;
                margin-bottom: 20px;
            }
        }

        .modal-content p {
            font-size: 14px;
            margin-bottom: 25px;
            color: #a0d9ff;
        }

        @media (min-width: 768px) {
            .modal-content p {
                font-size: 16px;
                margin-bottom: 30px;
            }
        }

        #grant-camera-btn {
            padding: 12px 30px;
            font-size: 16px;
            background: linear-gradient(90deg, #00d9ff, #0088ff);
            border: none;
            border-radius: 12px;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 20px rgba(0, 217, 255, 0.4);
            width: 100%;
            max-width: 280px;
        }

        @media (min-width: 768px) {
            #grant-camera-btn {
                padding: 15px 40px;
                font-size: 18px;
                width: auto;
            }
        }

        #grant-camera-btn:active {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(0, 217, 255, 0.6);
        }

        /* Loading Screen */
        #loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 5, 16, 0.95);
            z-index: 999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #loading-screen.hidden {
            display: none;
        }

        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(0, 217, 255, 0.2);
            border-top: 4px solid #00d9ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }

        @media (min-width: 768px) {
            .loading-spinner {
                width: 80px;
                height: 80px;
            }
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        #loading-text {
            font-size: 16px;
            color: #00d9ff;
            padding: 0 20px;
            text-align: center;
        }

        @media (min-width: 768px) {
            #loading-text {
                font-size: 20px;
            }
        }

        /* HUD Overlay */
        .hud-overlay {
            position: fixed;
            z-index: 10;
            pointer-events: none;
        }

        /* Top Left - Entity Info */
        #entity-info {
            top: 10px;
            left: 10px;
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 10px;
            padding: 12px;
            min-width: 200px;
            backdrop-filter: blur(10px);
            font-size: 12px;
        }

        @media (min-width: 768px) {
            #entity-info {
                top: 20px;
                left: 20px;
                border-radius: 15px;
                padding: 20px;
                min-width: 280px;
                font-size: 14px;
            }
        }

        #entity-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 6px;
            background: linear-gradient(90deg, #00d9ff, #ff00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        @media (min-width: 768px) {
            #entity-name {
                font-size: 24px;
                margin-bottom: 8px;
            }
        }

        #entity-type {
            font-size: 11px;
            color: #a0d9ff;
            margin-bottom: 10px;
        }

        @media (min-width: 768px) {
            #entity-type {
                font-size: 14px;
                margin-bottom: 15px;
            }
        }

        #rarity-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 12px;
        }

        @media (min-width: 768px) {
            #rarity-badge {
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 12px;
                margin-bottom: 15px;
            }
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            font-size: 11px;
        }

        @media (min-width: 768px) {
            .stat-row {
                margin: 8px 0;
                font-size: 14px;
            }
        }

        .stat-label {
            color: #7799bb;
        }

        .stat-value {
            color: #00ff88;
            font-weight: bold;
        }

        /* Bottom Left - Controls */
        #controls-info {
            bottom: 10px;
            left: 10px;
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 10px;
            padding: 10px;
            backdrop-filter: blur(10px);
            max-width: calc(100vw - 20px);
        }

        @media (min-width: 768px) {
            #controls-info {
                bottom: 20px;
                left: 20px;
                border-radius: 15px;
                padding: 20px;
                max-width: none;
            }
        }

        .control-item {
            display: flex;
            align-items: center;
            margin: 6px 0;
            font-size: 11px;
        }

        @media (min-width: 768px) {
            .control-item {
                margin: 10px 0;
                font-size: 14px;
            }
        }

        .control-icon {
            font-size: 18px;
            margin-right: 8px;
        }

        @media (min-width: 768px) {
            .control-icon {
                font-size: 24px;
                margin-right: 12px;
            }
        }

        /* Bottom Right - Power Meter */
        #power-meter {
            bottom: 10px;
            right: 10px;
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 10px;
            padding: 12px;
            min-width: 150px;
            backdrop-filter: blur(10px);
        }

        @media (min-width: 768px) {
            #power-meter {
                bottom: 20px;
                right: 20px;
                border-radius: 15px;
                padding: 20px;
                min-width: 200px;
            }
        }

        #power-label {
            font-size: 11px;
            color: #a0d9ff;
            margin-bottom: 8px;
        }

        @media (min-width: 768px) {
            #power-label {
                font-size: 14px;
                margin-bottom: 10px;
            }
        }

        #power-bar {
            width: 100%;
            height: 20px;
            background: rgba(0, 50, 100, 0.5);
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid rgba(0, 217, 255, 0.3);
        }

        @media (min-width: 768px) {
            #power-bar {
                height: 30px;
                border-radius: 15px;
            }
        }

        #power-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #00d9ff, #ff00ff);
            transition: width 0.3s ease;
            box-shadow: 0 0 20px rgba(0, 217, 255, 0.6);
        }

        /* Top Center - Mode & Status */
        #mode-status {
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 10px;
            padding: 10px 15px;
            text-align: center;
            backdrop-filter: blur(10px);
            max-width: calc(100vw - 20px);
        }

        @media (min-width: 768px) {
            #mode-status {
                top: 20px;
                border-radius: 15px;
                padding: 15px 30px;
                max-width: none;
            }
        }

        #current-mode {
            font-size: 14px;
            font-weight: bold;
            color: #00ff88;
            margin-bottom: 6px;
        }

        @media (min-width: 768px) {
            #current-mode {
                font-size: 18px;
                margin-bottom: 8px;
            }
        }

        #gesture-status {
            font-size: 11px;
            color: #a0d9ff;
        }

        @media (min-width: 768px) {
            #gesture-status {
                font-size: 14px;
            }
        }

        #hand-status {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 6px;
            font-size: 10px;
        }

        @media (min-width: 768px) {
            #hand-status {
                margin-top: 8px;
                font-size: 12px;
            }
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ff4444;
            margin-right: 6px;
            animation: pulse 2s infinite;
        }

        @media (min-width: 768px) {
            .status-dot {
                width: 10px;
                height: 10px;
                margin-right: 8px;
            }
        }

        .status-dot.active {
            background: #00ff88;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Universe Counter */
        #universe-counter {
            top: 110px;
            right: 10px;
            background: rgba(0, 10, 30, 0.8);
            border: 2px solid rgba(0, 217, 255, 0.5);
            border-radius: 10px;
            padding: 10px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        @media (min-width: 768px) {
            #universe-counter {
                top: 200px;
                right: 20px;
                border-radius: 15px;
                padding: 15px;
            }
        }

        #universe-label {
            font-size: 10px;
            color: #a0d9ff;
            margin-bottom: 4px;
        }

        @media (min-width: 768px) {
            #universe-label {
                font-size: 12px;
                margin-bottom: 5px;
            }
        }

        #universe-count {
            font-size: 24px;
            font-weight: bold;
            background: linear-gradient(90deg, #00d9ff, #ff00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        @media (min-width: 768px) {
            #universe-count {
                font-size: 32px;
            }
        }

        /* Evolution Animation Overlay */
        #evolution-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(255, 255, 255, 0.1);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: evolutionFlash 1s ease;
        }

        #evolution-overlay.hidden {
            display: none;
        }

        @keyframes evolutionFlash {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }

        .evolution-text {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(90deg, #00d9ff, #ff00ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: evolutionGlow 1s ease;
        }

        @media (min-width: 768px) {
            .evolution-text {
                font-size: 48px;
            }
        }

        @keyframes evolutionGlow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.5); }
        }
    </style>
</head>
<body>
    <!-- Camera Permission Modal -->
    <div id="camera-permission-modal">
        <div class="modal-content">
            <h1>🌌 Welcome to Cosmic Dex</h1>
            <p>To become a Cosmic Trainer and control the universe with your hands, we need camera access.</p>
            <button id="grant-camera-btn">🎮 Grant Camera Access</button>
        </div>
    </div>

    <!-- Loading Screen -->
    <div id="loading-screen" class="hidden">
        <div class="loading-spinner"></div>
        <div id="loading-text">Initializing...</div>
    </div>

    <!-- Evolution Animation -->
    <div id="evolution-overlay" class="hidden">
        <div class="evolution-text">✨ EVOLVING ✨</div>
    </div>

    <!-- Main Canvas -->
    <canvas id="cosmic-canvas"></canvas>

    <!-- Camera Feed -->
    <video id="camera-feed" autoplay playsinline muted></video>

    <!-- HUD Overlays -->
    <div id="entity-info" class="hud-overlay">
        <div id="entity-name">No Entity</div>
        <div id="entity-type">-</div>
        <div id="rarity-badge">
            <span id="rarity-value">COMMON</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Size:</span>
            <span class="stat-value" id="stat-size">0.00</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Energy:</span>
            <span class="stat-value" id="stat-energy">0%</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Evolution:</span>
            <span class="stat-value" id="stat-evolution">Level 0</span>
        </div>
    </div>

    <div id="mode-status" class="hud-overlay">
        <div id="current-mode">PLANET VIEW</div>
        <div id="gesture-status">Waiting for hands...</div>
        <div id="hand-status">
            <span class="status-dot"></span>
            <span>Hand Tracking</span>
        </div>
    </div>

    <div id="controls-info" class="hud-overlay">
        <div class="control-item">
            <span class="control-icon">🤏➡️</span>
            <span>Pinch + Forward = Summon</span>
        </div>
        <div class="control-item">
            <span class="control-icon">🙌</span>
            <span>Two Hands Together = Evolve</span>
        </div>
        <div class="control-item">
            <span class="control-icon">👐</span>
            <span>Two Hands Apart = Zoom</span>
        </div>
        <div class="control-item">
            <span class="control-icon">👆⬆️</span>
            <span>Swipe Up = New Universe</span>
        </div>
    </div>

    <div id="power-meter" class="hud-overlay">
        <div id="power-label">⚡ Cosmic Power</div>
        <div id="power-bar">
            <div id="power-fill"></div>
        </div>
    </div>

    <div id="universe-counter" class="hud-overlay">
        <div id="universe-label">Universes Created</div>
        <div id="universe-count">1</div>
    </div>

    <!-- Three.js Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <!-- MediaPipe Hands -->
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>

    <!-- Application Modules - LOAD IN CORRECT ORDER -->
    <script defer src="particles.js"></script>
    <script defer src="universeModes.js"></script>
    <script defer src="handTracking.js"></script>
    <script defer src="main.js"></script>
    
    <script>
        // Ensure all scripts are loaded before initializing
        window.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded');
            console.log('ParticleSystem available:', typeof ParticleSystem);
            console.log('UniverseManager available:', typeof UniverseManager);
            console.log('HandTracker available:', typeof HandTracker);
        });
    </script>
</body>
</html>
