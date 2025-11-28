import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

class AvatarBuilder {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.originalModel = null;
        this.currentHat = null;
        this.currentShirt = null;
        this.animationFrameId = null;
        this.editMode = false;
        this.transformControls = null;
        this.selectedObject = null;
        this.history = []; // Undo/redo history
        this.historyIndex = -1; // Current position in history
        this.maxHistorySize = 50; // Limit history size
        this.storageKey = 'avatarBuilder_positions'; // localStorage key for saved positions
        this.currentZoomLevel = 2;  // Start at level +2 (slightly zoomed out), -6 to +6 (negative = zoom in, positive = zoom out)
        // Reference transforms removed - using default positioning
        this.autoRotate = false;  // Auto-rotation state
        this.rotationSpeed = 0.005;  // Rotation speed (radians per frame)
        
        // Available fur options
        this.furOptions = [
            'OG', 'Red', 'Orange', 'Green', 'Blue', 'Pink', 'Purple',
            'Blue-Tiger', 'Red-Tiger', 'Neon-Tiger', 'Tiger',
            'Green-Dots', 'Purple-Dots',
            'Robo-1', 'Robo-2',
            'Zombie', 'Galaxy', 'Gold', 'SpecialPink'
        ];
        
        // Available hat options (matching WEARABLES/Hats folder, sorted alphabetically)
        this.hatOptions = [
            'Afro-Rainbow', 'Antlers', 'Backwards-Hat', 'Backwards-Hat-Red-v2', 'Backwards-Hat-Yellow-Purple',
            'Banana', 'Bandana', 'Bandana-Red', 'Beanie', 'Beanie-Orange', 'Beanie-Orange-v2', 'Beanie-Stealth',
            'Beret-Green', 'Bow', 'Bucket', 'Bucket-Orange', 'Bucket-Snow-Tan', 'Bunny',
            'Captain', 'Captain-Gold', 'Chef', 'Clouds', 'Cone', 'Cowboy', 'Cowboy-Stealth', 'Crown',
            'Ducky', 'Fisherman', 'Flipped-Brim-Blue', 'Flipped-Brim-Red-v2', 'Frog',
            'Fuzzy-Bucket', 'Fuzzy-Bucket-Blue-Yellow', 'Fuzzy-Bucket-Green-Stealth v2', 'Fuzzy-Bucket-Orange-Blue',
            'Fuzzy-Bucket-Pink-Green', 'Fuzzy-Bucket-Snow', 'Fuzzy-Bucket-Snow-Red', 'Fuzzy-Bucket-Stealth',
            'Fuzzy-Bucket-Stealth-Red', 'Fuzzy-Bucket-Stealth-Teal', 'Green-Dino', 'Halo', 'Hat-Red-v2',
            'Hat-Stealth-v2', 'Helmet Green', 'Horns', 'Island', 'Mowhawk-Green', 'Mowhawk-Stealth',
            'Mushroom-Green', 'Mushroom-Red', 'Pineapple', 'Pink-Dino', 'Pirate',
            'Plumber', 'Plumber-v2', 'Plumber-v3', 'Plumber-v4', 'Plumber-v5', 'Pot-of-Gold', 'Propeller',
            'Sailor', 'Sensei', 'Shark', 'Space-Helmet-Gold', 'Space-Helmet-v2',
            'Spikey-Hair', 'Spikey-Hair-Rose', 'Spikey-Hair-Teal', 'Spikey-Hair-v2', 'Spikey-Hair-Yellow',
            'Sportband-OG', 'Taco', 'Top-Hat-v3', 'Uni-Horn', 'Viking-Helmet', 'Viking-Helmet-Gold',
            'Viking-Helmet-Red', 'Viking-Helmet-Silver', 'Visor', 'Watermelon', 'Whale',
            'Wizard Teal', 'Wizard-Blue'
        ];
        
        // Available shirt options (sorted alphabetically)
        this.shirtOptions = [
            'Apron-Fishy', 'Apron', 'Baseball-Blue-Orange-v2', 'Baseball-Green-Yellow', 'Baseball-Mint-Stealth',
            'Baseball-Snow-Blue-v2', 'Baseball-Snow-Purple', 'Baseball-Snow-Stealth', 'Basketball-Blue', 'Basketball-Gold',
            'Basketball-Green', 'Basketball-Purple-v2', 'Basketball-Purple', 'Basketball-Red', 'Bathrobe', 'Bowtie',
            'Business-v2', 'Business', 'Camo-Green-v2', 'Cowboy-Vest', 'Fishdolier', 'Football-Blue-Red',
            'Football-Purple-Yellow', 'Football-Stealth', 'Golf-Red', 'Hockey-Blue-Orange', 'Hockey-Red-Blue',
            'Kimono-Blue-Flowers', 'Kimono-Pink-Flowers', 'Kimono-Purple-Red', 'Kimono-Snow-Brown-v2', 'Mech-Suit',
            'Ninja', 'Overalls-Orange', 'Overalls-v2', 'Overalls-v3', 'Puffy-Jacket-Stripes-v8', 'Puffy-Jacket-Stripes-v9',
            'Puffy-Sleeves', 'Robe-Purple', 'Scuba', 'Soccer-Mint-Fishy', 'Soccer-Stealth', 'Spacesuit-Gold',
            'Spacesuit-v3', 'Supersuit-v10', 'Supersuit-v2', 'Supersuit-v3', 'Supersuit-v4', 'Supersuit-v5',
            'Supersuit-v6', 'Supersuit-v7', 'Supersuit-v8', 'Supersuit-v9', 'Supersuit', 'Sweater-Yellow',
            'Sweater', 'T-Shirt-Blue-Fishy', 'T-Shirt-Meme', 'T-Shirt', 'Tracksuit-Red', 'Tracksuit-Yellow-Stealth',
            'Tux-Gold', 'Tux-Purple', 'Tux-Snow', 'Tux-Stealth', 'Vest', 'Warmup-Blue-Orange', 'Warmup-Blue-Snow',
            'Warmup-Blue-Stealth', 'Warmup-Mint-Snow', 'Warmup-Pink-Orange', 'Warmup-Purple-Red', 'Warmup-Purple-Yellow',
            'Warmup-Stealth', 'Wings', 'Wizard-Cloak-Green', 'Wizard-Cloak-Pink', 'Wizard-Cloak-Teal'
        ];
        
        this.init();
    }

    // Helper function to properly encode file paths with spaces
    encodePath(folder, filename) {
        // Handle nested paths (e.g., "WEARABLES/Furs")
        // Split by forward slash, encode each part, then rejoin
        const folderParts = folder.split('/').map(part => part.replace(/ /g, '%20'));
        const encodedFolder = folderParts.join('/');
        // Use encodeURIComponent for filename to handle all special characters
        const encodedFilename = encodeURIComponent(filename);
        return `${encodedFolder}/${encodedFilename}`;
    }

    async init() {
        console.log('AvatarBuilder.init() called');
        try {
            this.setupTheme();
            console.log('Theme setup complete');
            this.setupScene();
            console.log('Scene setup complete');
            // Note: Reference file loading removed - using default transforms
            this.setupEventListeners();
            console.log('Event listeners setup complete');
            this.setupFurGallery();
            console.log('Fur gallery setup complete');
            this.setupHatGallery();
            console.log('Hat gallery setup complete');
            this.setupShirtGallery();
            console.log('Shirt gallery setup complete');
            this.animate();
            console.log('Animation started');
        } catch (error) {
            console.error('Error in AvatarBuilder.init():', error);
            throw error;
        }
    }

    setupTheme() {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
        }
        
        // Setup theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // Update icon
                const icon = document.querySelector('.theme-icon');
                if (icon) {
                    icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
                }
            });
        }
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 2);

        // Renderer
        const container = document.getElementById('canvas-container');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;  // Disable default zoom, we'll handle it manually
        this.controls.target.set(0, 0, 0);  // Set target to origin (center of scene)
        
        // Enable panning with middle mouse button (scroll wheel click)
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,  // Pan when middle mouse button is held
            RIGHT: THREE.MOUSE.PAN
        };
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };
        
        // Setup custom zoom with discrete levels
        this.setupDiscreteZoom();
        
        // Transform Controls for editing mode
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        let isDragging = false;
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // Disable orbit controls when dragging transform controls
            this.controls.enabled = !event.value;
            isDragging = event.value;
            
            // Save state when dragging ends (not during dragging)
            if (!event.value && this.selectedObject) {
                // Ensure transform is committed immediately
                this.selectedObject.updateMatrixWorld();
                // Small delay to ensure transform is complete
                setTimeout(() => {
                    this.saveStateToHistory('Transform object');
                }, 50);
            }
        });
        this.scene.add(this.transformControls);

        // Enhanced Lighting Setup
        // Ambient light for overall scene illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Main key light (bright, from top-right-front)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        this.directionalLight.position.set(5, 10, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        // Fill light (softer, from opposite side)
        this.fillLight = new THREE.DirectionalLight(0xffffff, 1.8);
        this.fillLight.position.set(-5, 2, -5);
        this.scene.add(this.fillLight);

        // Rim light (backlight for edge definition)
        this.rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.rimLight.position.set(0, 5, -10);
        this.scene.add(this.rimLight);

        // Store lights for intensity control
        this.lights = [this.ambientLight, this.directionalLight, this.fillLight, this.rimLight];

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupDiscreteZoom() {
        // Define zoom levels: base distance is 2.0
        // 6 levels zooming in (closer): -6 to -1
        // Base level: 0
        // 6 levels zooming out (further): +1 to +6
        this.zoomLevels = [
            0.5,   // Level -6 (closest)
            0.75,  // Level -5
            1.0,   // Level -4
            1.25,  // Level -3
            1.5,   // Level -2
            1.75,  // Level -1
            2.0,   // Level 0 (base)
            2.5,   // Level +1
            3.0,   // Level +2
            3.5,   // Level +3
            4.0,   // Level +4
            4.5,   // Level +5
            5.0    // Level +6 (furthest)
        ];

        // Add wheel event listener to canvas
        const canvas = this.renderer.domElement;
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Determine zoom direction
            const delta = e.deltaY > 0 ? 1 : -1;
            
            // Update zoom level
            const newLevel = this.currentZoomLevel + delta;
            
            // Clamp to valid range (-6 to +6, which is indices 0 to 12)
            if (newLevel >= -6 && newLevel <= 6) {
                this.currentZoomLevel = newLevel;
                this.applyZoomLevel();
            }
        }, { passive: false });
    }

    applyZoomLevel() {
        if (!this.camera || !this.controls) return;
        
        // Get the distance for current zoom level
        // currentZoomLevel: -6 to +6, map to array index: 0 to 12
        const levelIndex = this.currentZoomLevel + 6;
        const targetDistance = this.zoomLevels[levelIndex];
        
        // Calculate direction from target to current camera position
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target);
        const directionLength = direction.length();
        
        // If direction is zero or invalid, use default direction (along Z-axis, looking from front)
        if (directionLength === 0 || !isFinite(directionLength)) {
            direction.set(0, 0, 1);
        } else {
            direction.normalize();
        }
        
        // Set new camera position: target + (direction * distance)
        this.camera.position.copy(this.controls.target).addScaledVector(direction, targetDistance);
        this.controls.update();
    }
    
    // Direction movement functions
    moveCamera(direction, amount = 0.1) {
        if (!this.camera || !this.controls) return;
        
        const moveVector = new THREE.Vector3();
        
        switch(direction.toLowerCase()) {
            case 'up':
                moveVector.set(0, amount, 0);
                break;
            case 'down':
                moveVector.set(0, -amount, 0);
                break;
            case 'left':
                moveVector.set(-amount, 0, 0);
                break;
            case 'right':
                moveVector.set(amount, 0, 0);
                break;
            case 'forward':
                // Move along camera's forward direction
                this.camera.getWorldDirection(moveVector);
                moveVector.multiplyScalar(amount);
                break;
            case 'back':
            case 'backward':
                // Move along camera's backward direction
                this.camera.getWorldDirection(moveVector);
                moveVector.multiplyScalar(-amount);
                break;
            default:
                return;
        }
        
        // Apply movement to both camera and target (panning)
        this.camera.position.add(moveVector);
        this.controls.target.add(moveVector);
        this.controls.update();
    }
    
    // Move hat in world space (not local space) to avoid axis confusion
    moveHat(direction, amount = 0.05) {
        if (!this.currentHat) {
            console.warn('No hat loaded to move');
            return;
        }
        
        // Get hat's current world position
        const worldPos = new THREE.Vector3();
        this.currentHat.getWorldPosition(worldPos);
        
        // Calculate movement in world space
        const moveVector = new THREE.Vector3();
        
        switch(direction.toLowerCase()) {
            case 'up':
                moveVector.set(0, amount, 0);  // World Y up
                break;
            case 'down':
                moveVector.set(0, -amount, 0);  // World Y down
                break;
            case 'left':
                moveVector.set(-amount, 0, 0);  // World X left
                break;
            case 'right':
                moveVector.set(amount, 0, 0);  // World X right
                break;
            case 'forward':
                moveVector.set(0, 0, -amount);  // World Z forward (toward camera)
                break;
            case 'back':
            case 'backward':
                moveVector.set(0, 0, amount);  // World Z back (away from camera)
                break;
            default:
                console.warn(`Unknown direction: ${direction}`);
                return;
        }
        
        // Calculate new world position
        const newWorldPos = worldPos.add(moveVector);
        
        // Convert back to local space relative to parent (head bone)
        if (this.currentHat.parent) {
            this.currentHat.parent.worldToLocal(newWorldPos);
            this.currentHat.position.copy(newWorldPos);
        } else {
            // If no parent, just move in world space
            this.currentHat.position.add(moveVector);
        }
        
        this.currentHat.updateMatrixWorld();
        console.log(`Hat moved ${direction}: position now X=${this.currentHat.position.x.toFixed(3)}, Y=${this.currentHat.position.y.toFixed(3)}, Z=${this.currentHat.position.z.toFixed(3)}`);
    }

    // Rotate hat on specified axis (in radians)
    // axis: 'x', 'y', 'z' or 'flip' (180 degrees on Y)
    // amount: rotation amount in radians (default: Math.PI/2 for 90 degrees)
    setBackground(preset) {
        const customColorGroup = document.getElementById('custom-color-group');
        
        switch(preset) {
            case 'dark':
                this.scene.background = new THREE.Color(0x1a1a1a);
                customColorGroup.style.display = 'none';
                break;
            case 'light':
                this.scene.background = new THREE.Color(0xf5f5f5);
                customColorGroup.style.display = 'none';
                break;
            case 'gradient-dark':
                // Create gradient background with fog
                this.scene.background = new THREE.Color(0x0a0a0a);
                this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
                customColorGroup.style.display = 'none';
                break;
            case 'gradient-light':
                this.scene.background = new THREE.Color(0xe8e8e8);
                this.scene.fog = new THREE.Fog(0xe8e8e8, 10, 50);
                customColorGroup.style.display = 'none';
                break;
            case 'blue-sky':
                this.scene.background = new THREE.Color(0x87ceeb);
                this.scene.fog = null;
                customColorGroup.style.display = 'none';
                break;
            case 'sunset':
                this.scene.background = new THREE.Color(0xff6b35);
                this.scene.fog = null;
                customColorGroup.style.display = 'none';
                break;
            case 'custom':
                customColorGroup.style.display = 'block';
                break;
        }
    }

    rotateHat(axis, amount = null) {
        if (!this.currentHat) {
            console.warn('No hat loaded to rotate');
            return;
        }

        // Handle special cases
        if (axis.toLowerCase() === 'flip') {
            // Flip = 180 degrees on Y axis
            axis = 'y';
            amount = Math.PI;
        } else if (axis.toLowerCase() === 'turn') {
            // Turn = 90 degrees on Y axis
            axis = 'y';
            amount = amount || Math.PI / 2;
        }

        // Get current rotation
        const currentRotation = new THREE.Euler().setFromQuaternion(this.currentHat.quaternion);
        
        // Apply rotation on specified axis
        const axisLower = axis.toLowerCase();
        if (axisLower === 'x') {
            currentRotation.x += (amount !== null ? amount : Math.PI / 2);
        } else if (axisLower === 'y') {
            currentRotation.y += (amount !== null ? amount : Math.PI / 2);
        } else if (axisLower === 'z') {
            currentRotation.z += (amount !== null ? amount : Math.PI / 2);
        } else {
            console.warn(`Unknown axis: ${axis}. Use 'x', 'y', 'z', 'flip', or 'turn'`);
            return;
        }

        // Apply the rotation
        this.currentHat.rotation.copy(currentRotation);
        this.currentHat.quaternion.setFromEuler(currentRotation);
        this.currentHat.updateMatrixWorld();
        
        console.log(`Hat rotated on ${axis.toUpperCase()} axis by ${((amount !== null ? amount : Math.PI / 2) * 180 / Math.PI).toFixed(1)}°`);
    }

    setupEventListeners() {
        // Randomize button
        document.getElementById('randomize-btn').addEventListener('click', () => {
            this.randomize();
        });
        
        // Scene controls
        // Background preset selector
        const bgPreset = document.getElementById('bg-preset');
        if (bgPreset) {
            bgPreset.addEventListener('change', (e) => {
                this.setBackground(e.target.value);
            });
            // Initialize with dark studio
            this.setBackground('dark');
        }
        
        // Custom color input
        const bgColor = document.getElementById('bg-color');
        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                this.scene.background = new THREE.Color(e.target.value);
                if (this.scene.fog) this.scene.fog = null;
            });
        }

        document.getElementById('light-intensity').addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            document.getElementById('light-value').textContent = intensity.toFixed(1);
            // Update all lights proportionally
            if (this.lights) {
                this.directionalLight.intensity = intensity;
                this.fillLight.intensity = intensity * 0.6;
                this.rimLight.intensity = intensity * 0.4;
                this.ambientLight.intensity = intensity * 0.2;
            }
        });
        
        // Auto-rotate toggle
        const autoRotateCheckbox = document.getElementById('auto-rotate');
        if (autoRotateCheckbox) {
            autoRotateCheckbox.addEventListener('change', (e) => {
                this.autoRotate = e.target.checked;
                if (this.controls) {
                    this.controls.autoRotate = this.autoRotate;
                    this.controls.autoRotateSpeed = 2.0;
                }
                console.log(`Auto-rotate ${this.autoRotate ? 'enabled' : 'disabled'}`);
            });
        }
        
        // Edit mode toggle
        const editModeCheckbox = document.getElementById('edit-mode');
        if (editModeCheckbox) {
            editModeCheckbox.addEventListener('change', (e) => {
                this.setEditMode(e.target.checked);
            });
        }
        
        // Save positions button
        const savePositionsBtn = document.getElementById('save-positions-btn');
        if (savePositionsBtn) {
            savePositionsBtn.addEventListener('click', () => {
                this.saveCurrentPositions();
            });
        }
        
        // Object selection for edit mode
        this.setupObjectSelection();
        this.setupClickToSelect();
    }

    setupFurGallery() {
        const gallery = document.getElementById('fur-gallery');
        gallery.innerHTML = '';

        this.furOptions.forEach((furName) => {
            const button = document.createElement('button');
            button.className = 'fur-btn';
            button.title = `Load ${furName}.glb from WEARABLES/Furs folder`;
            
            // Create image element
            const img = document.createElement('img');
            const imagePath = `Selection Images/Furs/${furName}.png`;
            img.src = imagePath;
            img.alt = furName;
            img.onerror = (e) => {
                console.warn(`Failed to load image: ${imagePath}`, e);
                // Fallback to text if image doesn't exist
                button.innerHTML = '';
                button.textContent = furName;
            };
            img.onload = () => {
                console.log(`Successfully loaded image: ${imagePath}`);
            };
            button.appendChild(img);
            
            button.addEventListener('click', () => {
                this.loadFurFile(furName);
            });
            gallery.appendChild(button);
        });
    }

    setupHatGallery() {
        const gallery = document.getElementById('hat-gallery');
        gallery.innerHTML = '';

        this.hatOptions.forEach((hatName) => {
            const button = document.createElement('button');
            button.className = 'fur-btn';
            button.title = `Load ${hatName}.glb hat`;
            
            // Create image element
            const img = document.createElement('img');
            const imagePath = `Selection Images/Hats/${hatName}.png`;
            img.src = imagePath;
            img.alt = hatName;
            img.onerror = (e) => {
                console.warn(`Failed to load image: ${imagePath}`, e);
                // Fallback to text if image doesn't exist
                button.innerHTML = '';
                button.textContent = hatName;
            };
            img.onload = () => {
                console.log(`Successfully loaded image: ${imagePath}`);
            };
            button.appendChild(img);
            
            button.addEventListener('click', () => {
                this.loadHat(hatName);
            });
            gallery.appendChild(button);
        });

        // Remove hat button
        document.getElementById('remove-hat-btn').addEventListener('click', () => {
            this.removeHat();
        });
    }

    setupShirtGallery() {
        const gallery = document.getElementById('shirt-gallery');
        gallery.innerHTML = '';

        this.shirtOptions.forEach((shirtName) => {
            const button = document.createElement('button');
            button.className = 'fur-btn';
            button.title = `Load ${shirtName}.glb shirt`;
            
            // Create image element
            const img = document.createElement('img');
            img.src = `Selection%20Images/Shirt/${encodeURIComponent(shirtName)}.png`;
            img.alt = shirtName;
            img.onerror = () => {
                // Fallback to text if image doesn't exist
                button.innerHTML = '';
                button.textContent = shirtName;
            };
            button.appendChild(img);
            
            button.addEventListener('click', () => {
                this.loadShirt(shirtName);
            });
            gallery.appendChild(button);
        });

        // Remove shirt button
        document.getElementById('remove-shirt-btn').addEventListener('click', () => {
            this.removeShirt();
        });
    }

    async loadFurFile(furName) {
        // Load GLB file directly from the WEARABLES/Furs folder
        const fileName = `${furName}.glb`;
        // Properly encode the file path to handle spaces and special characters
        const filePath = this.encodePath('WEARABLES/Furs', fileName);
        
        const loading = document.getElementById('loading');
        const placeholder = document.getElementById('placeholder');
        loading.style.display = 'block';
        placeholder.style.display = 'none';

        const loader = new GLTFLoader();
        
        try {
            console.log(`Loading fur: ${furName}, filePath: ${filePath}`);
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    filePath,
                    resolve,
                    undefined,
                    (error) => {
                        console.error(`Error loading ${fileName} from path: ${filePath}`, error);
                        reject(new Error(`Failed to load ${fileName}. Make sure the file exists in the WEARABLES/Furs folder.`));
                    }
                );
            });

            // Store previous model's transform to preserve position/scale when switching furs
            let previousPosition = null;
            let previousScale = null;
            let previousHat = null;
            let previousShirt = null;
            
            if (this.model) {
                // Save current hat and shirt before removing model
                previousHat = this.currentHat;
                previousShirt = this.currentShirt;
                
                // Save previous model's transform
                previousPosition = this.model.position.clone();
                previousScale = this.model.scale.clone();
                
                // Temporarily remove hat and shirt from model before removing model
                if (this.currentHat && this.currentHat.parent) {
                    this.currentHat.parent.remove(this.currentHat);
                }
                if (this.currentShirt && this.currentShirt.parent) {
                    this.currentShirt.parent.remove(this.currentShirt);
                }
                this.scene.remove(this.model);
            }

            this.model = gltf.scene;
            this.originalModel = this.model.clone();
            
            // Preserve auto-rotate state when switching models
            if (this.controls) {
                this.controls.autoRotate = this.autoRotate;
                if (this.autoRotate) {
                    this.controls.autoRotateSpeed = 2.0;
                }
            }
            
            // Preserve position and scale when switching furs (don't reset)
            if (previousPosition && previousScale) {
                // Use previous position and scale to maintain otter position
                this.model.position.copy(previousPosition);
                this.model.scale.copy(previousScale);
            } else {
                // First load - center and scale normally
                this.centerModel();
                // Reset camera and controls to center on the model
                this.controls.target.set(0, 0, 0);
                this.currentZoomLevel = 2;  // Start slightly zoomed out (level +2)
                this.applyZoomLevel();  // Apply the zoom level
            }
            
            this.scene.add(this.model);

            // Update UI
            document.getElementById('scene-panel').style.display = 'block';
            document.getElementById('hat-panel').style.display = 'block';
            document.getElementById('shirt-panel').style.display = 'block';
            
            // Restore hat if it existed (preserve hat when switching furs)
            if (previousHat) {
                // Find head bone in new model
                const headBone = this.findHeadBone(this.model);
                if (headBone) {
                    headBone.add(previousHat);
                    this.currentHat = previousHat;
                    document.getElementById('remove-hat-btn').disabled = false;
                } else {
                    // If no head bone, remove the hat
                    this.scene.remove(previousHat);
                    this.currentHat = null;
                    document.getElementById('remove-hat-btn').disabled = true;
                }
            }

            // Restore shirt if it existed (preserve shirt when switching furs)
            if (previousShirt) {
                // Attach directly to model root (not body bone) to align with furs
                this.model.add(previousShirt);
                this.currentShirt = previousShirt;
                document.getElementById('remove-shirt-btn').disabled = false;
            }

        } catch (error) {
            console.error('Error loading GLB:', error);
            alert(`Error loading ${fileName}:\n\n${error.message}\n\nMake sure the file exists in the WEARABLES/Furs folder.`);
            placeholder.style.display = 'flex';
        } finally {
            loading.style.display = 'none';
        }
    }

    async loadGLB(file) {
        if (!file) return;

        const loading = document.getElementById('loading');
        const placeholder = document.getElementById('placeholder');
        loading.style.display = 'block';
        placeholder.style.display = 'none';

        const loader = new GLTFLoader();
        
        try {
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    URL.createObjectURL(file),
                    resolve,
                    undefined,
                    reject
                );
            });

            // Remove previous model
            if (this.model) {
                this.scene.remove(this.model);
            }

            this.model = gltf.scene;
            this.originalModel = this.model.clone();
            
            // Center and scale model
            this.centerModel();
            
            this.scene.add(this.model);

            // Reset camera and controls to center on the model
            // Set to perfect viewing position matching the desired size
            this.controls.target.set(0, 0, 0);
            this.currentZoomLevel = 2;  // Start slightly zoomed out (level +2)
            this.applyZoomLevel();  // Apply the zoom level

            // Update UI
            document.getElementById('scene-panel').style.display = 'block';
            document.getElementById('hat-panel').style.display = 'block';
            document.getElementById('shirt-panel').style.display = 'block';
            
            // Remove any existing hat when loading new fur
            if (this.currentHat) {
                if (this.currentHat.parent === this.model) {
                    this.model.remove(this.currentHat);
                } else {
                    this.scene.remove(this.currentHat);
                }
                this.currentHat = null;
                document.getElementById('remove-hat-btn').disabled = true;
            }

            // Remove any existing shirt when loading new fur
            if (this.currentShirt) {
                if (this.currentShirt.parent === this.model) {
                    this.model.remove(this.currentShirt);
                } else {
                    this.scene.remove(this.currentShirt);
                }
                this.currentShirt = null;
                document.getElementById('remove-shirt-btn').disabled = true;
            }

        } catch (error) {
            console.error('Error loading GLB:', error);
            alert('Error loading GLB file. Please make sure it is a valid GLB file.');
        } finally {
            loading.style.display = 'none';
        }
    }

    // Reference file loading removed - using default transforms
    // This function is kept for potential future use but is not called
    async loadReferenceFile() {
        const loader = new GLTFLoader();
        try {
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    'everythinggg.glb',
                    resolve,
                    undefined,
                    (error) => {
                        console.warn('Could not load reference file:', error);
                        reject(error);
                    }
                );
            });

            const referenceScene = gltf.scene;
            this.referenceHatTransforms = {};
            this.referenceShirtTransforms = {};

            // Find head bone and body bone in reference scene
            const headBone = this.findHeadBone(referenceScene);
            const bodyBone = this.findBodyBone(referenceScene);
            
            if (!headBone) {
                console.warn('No head bone found in reference file');
            }
            if (!bodyBone) {
                console.warn('No body bone found in reference file');
            }

            // Traverse entire scene to find hat and shirt meshes (they might be nested)
            referenceScene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const meshName = child.name.toLowerCase();
                    const parentName = child.parent ? child.parent.name.toLowerCase() : '';
                    
                    // Check if this is a hat mesh
                    let hatMatchedKey = null;
                    
                    if (meshName.includes('backwardsh') && (meshName.includes('2') || meshName.includes('3'))) {
                        hatMatchedKey = meshName.includes('2') ? 'backwardsh2' : 'backwardsh3';
                    } else if (meshName.includes('whale')) {
                        hatMatchedKey = 'whale';
                    } else if (meshName.includes('spikey') && meshName.includes('halo')) {
                        hatMatchedKey = 'spikeyhairhalo';
                    } else if (meshName.includes('green') && meshName.includes('dino')) {
                        hatMatchedKey = 'greendino';
                    } else if (meshName.includes('pink') && meshName.includes('dino')) {
                        hatMatchedKey = 'pinkdino';
                    } else if (meshName.includes('ducky')) {
                        hatMatchedKey = 'ducky';
                    }
                    
                    // Store hat transform if matched
                    if (hatMatchedKey && headBone && !this.referenceHatTransforms[hatMatchedKey]) {
                        // Get world transform
                        const worldPos = new THREE.Vector3();
                        const worldQuat = new THREE.Quaternion();
                        const worldScale = new THREE.Vector3();
                        child.getWorldPosition(worldPos);
                        child.getWorldQuaternion(worldQuat);
                        child.getWorldScale(worldScale);
                        
                        // Convert to local space relative to head bone
                        const localPos = worldPos.clone();
                        headBone.worldToLocal(localPos);
                        
                        // Get local rotation (convert world quaternion to local)
                        const localQuat = worldQuat.clone();
                        const headBoneWorldQuat = new THREE.Quaternion();
                        headBone.getWorldQuaternion(headBoneWorldQuat);
                        localQuat.premultiply(headBoneWorldQuat.invert());
                        
                        // Store the transform
                        this.referenceHatTransforms[hatMatchedKey] = {
                            position: localPos.clone(),
                            rotation: new THREE.Euler().setFromQuaternion(localQuat),
                            scale: worldScale.clone()
                        };
                        
                        console.log(`Found reference hat transform for ${hatMatchedKey} (mesh: ${child.name}):`, {
                            position: localPos,
                            rotation: this.referenceHatTransforms[hatMatchedKey].rotation,
                            scale: worldScale
                        });
                    }
                    
                    // Check if this is a shirt mesh - try to match against all shirt options
                    // Shirt meshes typically don't have "body", "head", "teeth", "tongue" in their names
                    const isShirtMesh = (
                        !meshName.includes('body') &&
                        !meshName.includes('head') &&
                        !meshName.includes('teeth') &&
                        !meshName.includes('tooth') &&
                        !meshName.includes('tongue') &&
                        !meshName.includes('eye') &&
                        !meshName.includes('nose') &&
                        !meshName.includes('whisker') &&
                        !meshName.includes('cone') &&
                        !meshName.includes('geo') &&
                        !meshName.includes('sphere') &&
                        !meshName.includes('mesh_0001') &&
                        meshName.length > 0
                    );
                    
                    // Try to match shirt name from mesh name or parent name
                    if (isShirtMesh && bodyBone) {
                        // Check if mesh is parented to body bone or in body bone hierarchy
                        let checkParent = child.parent;
                        let isParentedToBody = false;
                        while (checkParent) {
                            if (checkParent === bodyBone || 
                                (checkParent instanceof THREE.Bone && 
                                 (checkParent.name.toLowerCase().includes('body') ||
                                  checkParent.name.toLowerCase().includes('torso') ||
                                  checkParent.name.toLowerCase().includes('spine') ||
                                  checkParent.name.toLowerCase().includes('chest')))) {
                                isParentedToBody = true;
                                break;
                            }
                            checkParent = checkParent.parent;
                        }
                        
                        // Try to match shirt name from mesh name - use more flexible matching
                        let shirtMatchedKey = null;
                        let bestMatch = null;
                        let bestScore = 0;
                        
                        // Normalize mesh name for comparison
                        const meshNameNormalized = meshName.replace(/[-_\s]/g, '').toLowerCase();
                        const originalMeshName = child.name;
                        
                        for (const shirtOption of this.shirtOptions) {
                            const shirtNameNormalized = shirtOption.replace(/[-_\s]/g, '').toLowerCase();
                            
                            // Exact match
                            if (meshNameNormalized === shirtNameNormalized || 
                                meshName === shirtOption.toLowerCase()) {
                                shirtMatchedKey = shirtOption;
                                break;
                            }
                            
                            // Check if mesh name contains shirt name (or vice versa)
                            if (meshNameNormalized.includes(shirtNameNormalized) || 
                                shirtNameNormalized.includes(meshNameNormalized)) {
                                const score = Math.min(meshNameNormalized.length, shirtNameNormalized.length);
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMatch = shirtOption;
                                }
                            }
                            
                            // Check if original mesh name matches (case-insensitive, with variations)
                            const originalLower = originalMeshName.toLowerCase();
                            const shirtLower = shirtOption.toLowerCase();
                            if (originalLower.includes(shirtLower) || shirtLower.includes(originalLower)) {
                                const score = Math.min(originalLower.length, shirtLower.length);
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMatch = shirtOption;
                                }
                            }
                        }
                        
                        // Use best match if found
                        if (!shirtMatchedKey && bestMatch) {
                            shirtMatchedKey = bestMatch;
                        }
                        
                        // Store shirt transform if matched and not already stored
                        if (shirtMatchedKey && !this.referenceShirtTransforms[shirtMatchedKey]) {
                            // Get world transform
                            const worldPos = new THREE.Vector3();
                            const worldQuat = new THREE.Quaternion();
                            const worldScale = new THREE.Vector3();
                            child.getWorldPosition(worldPos);
                            child.getWorldQuaternion(worldQuat);
                            child.getWorldScale(worldScale);
                            
                            // Convert to local space relative to body bone
                            const localPos = worldPos.clone();
                            bodyBone.worldToLocal(localPos);
                            
                            // Get local rotation (convert world quaternion to local)
                            const localQuat = worldQuat.clone();
                            const bodyBoneWorldQuat = new THREE.Quaternion();
                            bodyBone.getWorldQuaternion(bodyBoneWorldQuat);
                            localQuat.premultiply(bodyBoneWorldQuat.invert());
                            
                            // Store the transform
                            this.referenceShirtTransforms[shirtMatchedKey] = {
                                position: localPos.clone(),
                                rotation: new THREE.Euler().setFromQuaternion(localQuat),
                                scale: worldScale.clone()
                            };
                            
                            console.log(`Found reference shirt transform for ${shirtMatchedKey} (mesh: ${child.name}):`, {
                                position: localPos,
                                rotation: this.referenceShirtTransforms[shirtMatchedKey].rotation,
                                scale: worldScale
                            });
                        }
                    }
                }
            });
            
            console.log('Reference hat transforms loaded:', Object.keys(this.referenceHatTransforms).length, 'hats');
            console.log('Reference shirt transforms loaded:', Object.keys(this.referenceShirtTransforms).length, 'shirts');
            if (Object.keys(this.referenceShirtTransforms).length > 0) {
                console.log('Shirt transforms found:', Object.keys(this.referenceShirtTransforms));
            } else {
                console.warn('No shirt transforms found in reference file. Shirts will use default positioning.');
            }
        } catch (error) {
            console.warn('Could not load reference file, using default transforms:', error);
        }
    }

    centerModel() {
        // Check if model is already at origin and centered (preserve Blender positioning)
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // If model is already centered at origin (within tolerance), preserve Blender positioning
        const isAlreadyCentered = Math.abs(center.x) < 0.01 && 
                                  Math.abs(center.y) < 0.01 && 
                                  Math.abs(center.z) < 0.01;
        
        if (isAlreadyCentered && 
            Math.abs(this.model.position.x) < 0.01 && 
            Math.abs(this.model.position.y) < 0.01 && 
            Math.abs(this.model.position.z) < 0.01) {
            // Model is already correctly positioned in Blender - only apply minimal scaling if needed
            // Don't reposition, preserve Blender's 0,0,0 positioning
            console.log('Model already centered at origin - preserving Blender positioning');
            
            // Only scale if the model is extremely large or small (outside reasonable range)
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 10.0) {
                // Model is very large, scale it down
                const scale = 2.0 / maxDim;
                this.model.scale.multiplyScalar(scale);
                console.log(`Applied scale ${scale.toFixed(3)}x for large model`);
            } else if (maxDim < 0.1) {
                // Model is very small, scale it up
                const scale = 2.0 / maxDim;
                this.model.scale.multiplyScalar(scale);
                console.log(`Applied scale ${scale.toFixed(3)}x for small model`);
            } else {
                // Model is in reasonable size range, keep original scale
                console.log('Model size is reasonable - preserving original scale');
            }
        } else {
            // Model is not centered - apply centering (for older files or incorrectly positioned models)
            console.log('Model not centered - applying centering transform');
            this.model.position.sub(center);
            this.model.position.y -= 0.9;  // Move model down to appear lower on screen
            this.model.position.x = 0;
            
            // Scale to fit - adjust scale factor for perfect viewing size
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim;  // Scale factor for viewing size
            this.model.scale.multiplyScalar(scale);
        }
    }

    /* -----------------------------------------------------
       OPTIMIZED HAT LOADER
    ----------------------------------------------------- */

    async loadHat(hatName) {
        if (!this.model) {
            alert("Please load an otter fur first!");
            return;
        }

        if (this.currentHat?.parent) this.currentHat.parent.remove(this.currentHat);
        this.currentHat = null;

        const filePath = this.encodePath("WEARABLES/Hats", `${hatName}.glb`);
        const loader = new GLTFLoader();
        
        try {
            const gltf = await loader.loadAsync(filePath);

            const hatGroup = new THREE.Group();
            hatGroup.userData.hatName = hatName;

            this.removePlaceholdersFromScene(gltf.scene);

            const meshes = this.extractWearableMeshes(gltf.scene);
            
            // CRITICAL FIX: Get WORLD transforms of meshes before extracting
            // This accounts for any parent transforms in the GLB hierarchy
            gltf.scene.updateMatrixWorld(true);
            
            meshes.forEach(mesh => {
                // Get world transform before removing from GLB scene
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                mesh.getWorldQuaternion(worldQuat);
                mesh.getWorldScale(worldScale);
                
                // Reset mesh to origin in hatGroup's local space
                mesh.position.set(0, 0, 0);
                mesh.rotation.set(0, 0, 0);
                mesh.scale.set(1, 1, 1);
                mesh.quaternion.set(0, 0, 0, 1);
                
                // Add to hatGroup first (so we can convert world to local)
                hatGroup.add(mesh);
                
                // Convert world transform to hatGroup's local space
                hatGroup.updateMatrixWorld(true);
                const localPos = worldPos.clone();
                const localQuat = worldQuat.clone();
                const localScale = worldScale.clone();
                
                hatGroup.worldToLocal(localPos);
                
                // Apply the converted local transform
                mesh.position.copy(localPos);
                mesh.quaternion.copy(localQuat);
                mesh.scale.copy(localScale);
                mesh.rotation.setFromQuaternion(localQuat);
            });

            const headBone = this.findHeadBone(this.model);

            if (!headBone) {
                console.warn("No head bone found – attaching hat to root instead.");
                this.model.add(hatGroup);
                this.currentHat = hatGroup;
                document.getElementById("remove-hat-btn").disabled = false;
                return;
            }

            // FORCE EXACT COORDINATES FOR ALL HATS - These values are mandatory for all hats
            // Set forced values BEFORE parenting to bone (skip attachWearableToBone calculation)
            // Position (local): x: -0.607745, y: 0.000000, z: 0.005627
            hatGroup.position.set(-0.607745, 0.000000, 0.005627);
            
            // Scale (local): x: 1.000000, y: 1.000000, z: 1.000000
            hatGroup.scale.set(1.000000, 1.000000, 1.000000);
            
            // Rotation (local, Euler): x: 0.000000, y: -0.000000, z: -1.570796 (approximately -90 degrees, or -π/2 radians)
            hatGroup.rotation.set(0.000000, -0.000000, -1.570796);
            
            // Quaternion (local): x: 0.000000, y: -0.000000, z: -0.707107, w: 0.707107
            hatGroup.quaternion.set(0.000000, -0.000000, -0.707107, 0.707107);
            
            // Parent directly to bone with forced values (skip attachWearableToBone calculation)
            headBone.add(hatGroup);
            
            // Expected World Position: x: -0.000000, y: -0.900000, z: 0.150000

            // Log exact position, scale, and rotation values
            console.log(`=== ${hatName} - FORCED Exact Transform Values ===`);
            console.log('Position (local):', {
                x: hatGroup.position.x.toFixed(6),
                y: hatGroup.position.y.toFixed(6),
                z: hatGroup.position.z.toFixed(6)
            });
            console.log('Scale (local):', {
                x: hatGroup.scale.x.toFixed(6),
                y: hatGroup.scale.y.toFixed(6),
                z: hatGroup.scale.z.toFixed(6)
            });
            console.log('Rotation (local, Euler):', {
                x: hatGroup.rotation.x.toFixed(6),
                y: hatGroup.rotation.y.toFixed(6),
                z: hatGroup.rotation.z.toFixed(6)
            });
            console.log('Quaternion (local):', {
                x: hatGroup.quaternion.x.toFixed(6),
                y: hatGroup.quaternion.y.toFixed(6),
                z: hatGroup.quaternion.z.toFixed(6),
                w: hatGroup.quaternion.w.toFixed(6)
            });
            
            // Also log world position for reference
            const finalWorldPos = new THREE.Vector3();
            hatGroup.getWorldPosition(finalWorldPos);
            console.log('World Position:', {
                x: finalWorldPos.x.toFixed(6),
                y: finalWorldPos.y.toFixed(6),
                z: finalWorldPos.z.toFixed(6)
            });
            console.log('==========================================');

            this.currentHat = hatGroup;
            document.getElementById("remove-hat-btn").disabled = false;
        } catch (error) {
            console.error('Error loading hat:', error);
            alert(`Error loading ${hatName}.glb:\n\n${error.message}\n\nMake sure the file exists in the WEARABLES/Hats folder.`);
        }
    }

    findHeadBone(model) {
        let headBone = null;
        const headBoneNames = ['head', 'Head', 'HEAD', 'head_bone', 'Head_Bone'];
        
        model.traverse((child) => {
            if (child instanceof THREE.Bone || child.type === 'Bone') {
                const name = child.name.toLowerCase();
                if (headBoneNames.some(pattern => name.includes(pattern.toLowerCase())) || 
                    name === 'head' || 
                    name.includes('head')) {
                    headBone = child;
                }
            }
        });
        
        // If no head bone found, try to find it in skeleton
        if (!headBone && model.children.length > 0) {
            model.traverse((child) => {
                if (child.skeleton) {
                    child.skeleton.bones.forEach(bone => {
                        const name = bone.name.toLowerCase();
                        if (headBoneNames.some(pattern => name.includes(pattern.toLowerCase())) || 
                            name === 'head' || 
                            name.includes('head')) {
                            headBone = bone;
                        }
                    });
                }
            });
        }
        
        return headBone;
    }

    findBodyBone(model) {
        let bodyBone = null;
        const bodyBoneNames = ['body', 'Body', 'BODY', 'torso', 'Torso', 'TORSO', 'spine', 'Spine', 'SPINE', 'chest', 'Chest', 'CHEST', 'root', 'Root', 'ROOT'];
        
        model.traverse((child) => {
            if (child instanceof THREE.Bone || child.type === 'Bone') {
                const name = child.name.toLowerCase();
                if (bodyBoneNames.some(pattern => name.includes(pattern.toLowerCase())) || 
                    (name.includes('body') && !name.includes('head')) ||
                    (name.includes('torso') && !name.includes('head')) ||
                    (name.includes('spine') && !name.includes('head')) ||
                    (name === 'root' && !name.includes('head'))) {
                    bodyBone = child;
                }
            }
        });
        
        // If no body bone found, try to find it in skeleton
        if (!bodyBone && model.children.length > 0) {
            model.traverse((child) => {
                if (child.skeleton) {
                    child.skeleton.bones.forEach(bone => {
                        const name = bone.name.toLowerCase();
                        if (bodyBoneNames.some(pattern => name.includes(pattern.toLowerCase())) || 
                            (name.includes('body') && !name.includes('head')) ||
                            (name.includes('torso') && !name.includes('head')) ||
                            (name.includes('spine') && !name.includes('head'))) {
                            bodyBone = bone;
                        }
                    });
                }
            });
        }
        
        return bodyBone;
    }

    filterHatByHeadBone(hatScene, headBone) {
        // Create a new group for filtered hat
        const filteredHat = new THREE.Group();
        filteredHat.userData = hatScene.userData;
        
        const meshesToKeep = [];
        const meshesToRemove = [];
        
        // Get otter body mesh names for comparison
        const otterBodyMeshes = new Set();
        if (this.model) {
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    otterBodyMeshes.add(child.name);
                }
            });
        }
        
        // Collect only meshes (not bones or other objects)
        const allObjects = [];
        hatScene.traverse((child) => {
            // Only collect meshes - skip bones, groups, and other objects
            if (child instanceof THREE.Mesh) {
                allObjects.push(child);
            }
        });
        
        // Filter objects: remove placeholders and body parts, keep everything else
        allObjects.forEach((child) => {
            const name = child.name.toLowerCase();
            const originalName = child.name;
            
            // REMOVE: Blender placeholder objects - check for ANY occurrence of cone/geo/sphere
            const isPlaceholder = (
                name.includes('cone') ||
                name.includes('geo') ||
                name.includes('sphere')
            );
            
            // Only process meshes (all objects in allObjects are already meshes)
            
            // Check if this is a body mesh (matches otter body exactly)
            const isOtterBody = otterBodyMeshes.has(child.name);
            
            // Body part keywords to remove
            const isBodyPart = (
                name.includes('teeth') ||
                name.includes('tooth') ||
                name.includes('tongue') ||
                name.includes('body') ||
                name.includes('torso') ||
                name.includes('mouth') ||
                (name.includes('eye') && !name.includes('ear') && !name.includes('bunny')) ||
                name.includes('nose') ||
                name.includes('whisker')
            );
            
            // Generic body mesh patterns - ALL mesh_0001 patterns are body
            const isGenericBody = (
                name.includes('mesh_0001') || 
                name.startsWith('mesh_0001') ||
                name.match(/^mesh_0001/i)
            );
            
            // Remove placeholders and body parts
            if (isPlaceholder || isOtterBody || isGenericBody || isBodyPart) {
                meshesToRemove.push(child);
            } else {
                // Keep everything else (should be the hat)
                meshesToKeep.push(child);
            }
        });
        
        // Clone and add only hat meshes, preserving their transforms
        meshesToKeep.forEach(mesh => {
            const clonedMesh = mesh.clone();
            // Preserve all transforms from the original mesh
            clonedMesh.position.copy(mesh.position);
            clonedMesh.rotation.copy(mesh.rotation);
            clonedMesh.scale.copy(mesh.scale);
            clonedMesh.quaternion.copy(mesh.quaternion);
            clonedMesh.matrix.copy(mesh.matrix);
            clonedMesh.matrixWorld.copy(mesh.matrixWorld);
            // Preserve skeleton if it exists
            if (mesh.skeleton) {
                clonedMesh.skeleton = mesh.skeleton;
                clonedMesh.bind(mesh.skeleton, mesh.bindMatrix);
            }
            filteredHat.add(clonedMesh);
        });
        
        return filteredHat;
    }

    filterShirtByBody(shirtScene) {
        // Create a new group for filtered shirt
        const filteredShirt = new THREE.Group();
        filteredShirt.userData = shirtScene.userData;
        
        const meshesToKeep = [];
        const meshesToRemove = [];
        
        // Get otter body mesh names and geometry for comparison
        const otterBodyMeshes = new Set();
        const otterBodyGeometries = new Map(); // Store geometry to compare
        
        if (this.model) {
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    otterBodyMeshes.add(child.name);
                    // Store geometry for comparison (by vertex count or bounding box)
                    if (child.geometry) {
                        const box = new THREE.Box3().setFromObject(child);
                        const size = box.getSize(new THREE.Vector3());
                        otterBodyGeometries.set(child.name, {
                            vertexCount: child.geometry.attributes.position?.count || 0,
                            size: size,
                            center: box.getCenter(new THREE.Vector3())
                        });
                    }
                }
            });
        }
        
        // Collect meshes AND curves/lines (text content on shirts)
        // Also log all object names for debugging
        const allObjects = [];
        const allObjectNames = [];
        shirtScene.traverse((child) => {
            if (child instanceof THREE.Mesh || 
                child instanceof THREE.Line || 
                child instanceof THREE.LineSegments ||
                child.type === 'Line' ||
                child.type === 'LineSegments') {
                allObjects.push(child);
                allObjectNames.push(child.name);
            }
        });
        console.log(`Found ${allObjects.length} objects in shirt scene:`, allObjectNames);
        
        // Filter objects: remove otter body meshes, placeholders, and head parts
        allObjects.forEach((child) => {
            const name = child.name.toLowerCase();
            const originalName = child.name;
            
            // REMOVE: Blender placeholder objects - check both lowercase and original name
            const isPlaceholder = (
                name.includes('cone') ||
                name.includes('geo') ||
                name.includes('sphere') ||
                name.includes('placeholder') ||
                name.includes('temp') ||
                originalName.includes('Cone') ||
                originalName.includes('Sphere') ||
                originalName.includes('Geo')
            );
            
            // Check if this is a curve/line (text content) - these should be kept but may need rotation/positioning
            const isCurveOrLine = (
                child instanceof THREE.Line ||
                child instanceof THREE.LineSegments ||
                child.type === 'Line' ||
                child.type === 'LineSegments' ||
                name.includes('curve') ||
                name.includes('text') ||
                originalName.includes('Curve') ||
                originalName.includes('Text')
            );
            
            // Check geometry shape - detect cones and spheres ONLY by geometry type (primitives)
            // Don't use bounding box detection - it's too aggressive and removes actual shirts
            // BUT: Don't remove curves/lines - they're text content on shirts
            let isConeOrSphere = false;
            if (!isCurveOrLine && child.geometry) {
                const geometryType = child.geometry.type;
                // ONLY check for primitive geometry types - these are definitely placeholders
                // Don't check bounding box - actual shirt meshes might have similar shapes
                if (geometryType === 'ConeGeometry' || 
                    geometryType === 'SphereGeometry' ||
                    geometryType === 'ConeBufferGeometry' ||
                    geometryType === 'SphereBufferGeometry') {
                    isConeOrSphere = true;
                }
                // Only check bounding box for VERY small objects that are clearly placeholders
                // Make it very strict - only tiny objects
                try {
                    const box = new THREE.Box3().setFromObject(child);
                    const size = box.getSize(new THREE.Vector3());
                    const maxSize = Math.max(size.x, size.y, size.z);
                    // Only remove if it's VERY small (less than 0.1 units) AND roughly round
                    // This catches tiny placeholder objects, not actual clothing
                    if (maxSize < 0.1) {
                        const isRoughlyRound = Math.abs(size.x - size.z) < 0.05 && size.y < 0.1;
                        if (isRoughlyRound) {
                            isConeOrSphere = true;
                        }
                    }
                } catch (e) {
                    // Ignore errors in shape detection
                }
            }
            
            // Head/face part keywords to remove
            const isHeadPart = (
                name.includes('teeth') ||
                name.includes('tooth') ||
                name.includes('tongue') ||
                name.includes('head') ||
                name.includes('mouth') ||
                name.includes('jaw') ||
                (name.includes('eye') && !name.includes('ear') && !name.includes('bunny')) ||
                name.includes('nose') ||
                name.includes('whisker') ||
                name.includes('snout') ||
                name.includes('muzzle')
            );
            
            // Check if this is an otter body mesh by comparing geometry
            let isOtterBody = false;
            
            // First check: exact name match
            if (otterBodyMeshes.has(child.name)) {
                // Check if geometry matches (same vertex count and similar size)
                if (child.geometry && child.geometry.attributes && otterBodyGeometries.has(child.name)) {
                    try {
                        const otterGeo = otterBodyGeometries.get(child.name);
                        const shirtBox = new THREE.Box3().setFromObject(child);
                        const shirtSize = shirtBox.getSize(new THREE.Vector3());
                        const shirtVertexCount = child.geometry.attributes.position?.count || 0;
                    
                    // If vertex count and size are very similar, it's the otter body
                    const vertexMatch = Math.abs(shirtVertexCount - otterGeo.vertexCount) < 10;
                    const sizeMatch = Math.abs(shirtSize.x - otterGeo.size.x) < 0.01 &&
                                     Math.abs(shirtSize.y - otterGeo.size.y) < 0.01 &&
                                     Math.abs(shirtSize.z - otterGeo.size.z) < 0.01;
                    
                        if (vertexMatch && sizeMatch) {
                            isOtterBody = true;
                        }
                    } catch (e) {
                        console.warn(`Error comparing geometry for ${child.name}:`, e);
                        // If name matches but geometry comparison fails, assume it's body
                        isOtterBody = true;
                    }
                } else {
                    // If name matches but no geometry to compare, assume it's body
                    isOtterBody = true;
                }
            }
            
            // Check if mesh is very large (likely body) - body meshes are typically much larger than clothing
            let isLargeBodyMesh = false;
            if (child.geometry && child.geometry.attributes) {
                try {
                    const box = new THREE.Box3().setFromObject(child);
                    const size = box.getSize(new THREE.Vector3());
                // Body meshes are typically large (torso/body sized)
                // Shirt meshes are usually smaller and positioned around the body
                const isLarge = size.y > 0.6 || (size.x > 0.5 && size.z > 0.5 && size.y > 0.4);
                const isVeryLarge = size.y > 1.0 || (size.x > 0.8 && size.z > 0.8);
                
                // If it's very large and positioned at body center, it's likely the body
                const center = box.getCenter(new THREE.Vector3());
                const isAtBodyCenter = Math.abs(center.y) < 0.5 && Math.abs(center.x) < 0.3 && Math.abs(center.z) < 0.3;
                
                    if (isVeryLarge || (isLarge && isAtBodyCenter)) {
                        isLargeBodyMesh = true;
                    }
                } catch (e) {
                    console.warn(`Error checking mesh size for ${child.name}:`, e);
                }
            }
            
            // Remove placeholders, cones/spheres, head parts, otter body matches, and large body meshes
            // BUT: Keep curves/lines (text content) - they need special handling for rotation/positioning
            const shouldRemove = !isCurveOrLine && (isPlaceholder || isConeOrSphere || isHeadPart || isOtterBody || isLargeBodyMesh);
            
            if (shouldRemove) {
                meshesToRemove.push(child);
                // Log why it was removed for debugging
                const reasons = [];
                if (isPlaceholder) reasons.push('placeholder');
                if (isConeOrSphere) reasons.push('cone/sphere');
                if (isHeadPart) reasons.push('head part');
                if (isOtterBody) reasons.push('otter body');
                if (isLargeBodyMesh) reasons.push('large body mesh');
                console.log(`Removing mesh "${originalName}": ${reasons.join(', ')}`);
            } else {
                // Keep everything else - this should be a shirt mesh
                meshesToKeep.push(child);
            }
        });
        
        // Clone and add shirt meshes and curves/lines (text content)
        // Convert SkinnedMesh to regular Mesh to prevent deformation and errors
        meshesToKeep.forEach(mesh => {
            try {
                // Check if this is a curve/line (text content)
                const isCurveOrLine = (
                    mesh instanceof THREE.Line ||
                    mesh instanceof THREE.LineSegments ||
                    mesh.type === 'Line' ||
                    mesh.type === 'LineSegments'
                );
                
                if (isCurveOrLine) {
                    // Handle curves/lines (text content) - they were parented to bones
                    // Need to convert from bone-relative space to world space, then to model space
                    const clonedCurve = mesh.clone();
                    
                    // Get world transform before removing from bone parent
                    const worldPos = new THREE.Vector3();
                    const worldQuat = new THREE.Quaternion();
                    const worldScale = new THREE.Vector3();
                    
                    mesh.getWorldPosition(worldPos);
                    mesh.getWorldQuaternion(worldQuat);
                    mesh.getWorldScale(worldScale);
                    
                    // Apply the same scale as shirts (0.5x fur scale)
                    const furScale = this.model ? this.model.scale.x : 1.0;
                    const targetScale = furScale * 0.5;
                    
                    // Set world scale, then convert to local space relative to model
                    clonedCurve.scale.copy(worldScale);
                    clonedCurve.scale.multiplyScalar(targetScale / furScale);
                    
                    // Convert world position to local space relative to model root
                    // Apply Y offset (-0.02) in local space
                    const localPos = worldPos.clone();
                    if (this.model) {
                        this.model.worldToLocal(localPos);
                    }
                    localPos.y -= 0.02;
                    clonedCurve.position.copy(localPos);
                    
                    // Convert world rotation to local space, then apply X axis rotation
                    // Text curves need rotation on X axis to align properly
                    const localQuat = worldQuat.clone();
                    if (this.model) {
                        const modelWorldQuat = new THREE.Quaternion();
                        this.model.getWorldQuaternion(modelWorldQuat);
                        localQuat.premultiply(modelWorldQuat.invert());
                    }
                    
                    // Apply X axis rotation (180 degrees) to fix text orientation
                    const xRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                    localQuat.multiply(xRotation);
                    
                    clonedCurve.quaternion.copy(localQuat);
                    clonedCurve.rotation.setFromQuaternion(localQuat);
                    
                    filteredShirt.add(clonedCurve);
                    console.log(`Added curve/line "${mesh.name}" with world-to-local transform, X rotation applied`);
                } else {
                    // Handle regular meshes
                    // Clone the geometry first
                    let newGeometry = null;
                    if (mesh.geometry) {
                        newGeometry = mesh.geometry.clone();
                        
                        // Remove skinning attributes if they exist
                        if (newGeometry.attributes.skinIndex) {
                            delete newGeometry.attributes.skinIndex;
                        }
                        if (newGeometry.attributes.skinWeight) {
                            delete newGeometry.attributes.skinWeight;
                        }
                    }
                    
                    // Create a regular Mesh (not SkinnedMesh) to avoid bone transformation errors
                    const clonedMesh = new THREE.Mesh(newGeometry || mesh.geometry, mesh.material);
                    // Preserve all transforms from the original mesh
                    clonedMesh.position.copy(mesh.position);
                    clonedMesh.rotation.copy(mesh.rotation);
                    clonedMesh.scale.copy(mesh.scale);
                    clonedMesh.quaternion.copy(mesh.quaternion);
                    clonedMesh.matrix.copy(mesh.matrix);
                    clonedMesh.matrixWorld.copy(mesh.matrixWorld);
                    
                    // Copy all properties from original mesh
                    clonedMesh.name = mesh.name;
                    clonedMesh.position.copy(mesh.position);
                    clonedMesh.rotation.copy(mesh.rotation);
                    clonedMesh.scale.copy(mesh.scale);
                    clonedMesh.quaternion.copy(mesh.quaternion);
                    clonedMesh.matrix.copy(mesh.matrix);
                    clonedMesh.matrixWorld.copy(mesh.matrixWorld);
                    
                    // Explicitly ensure no skeleton references
                    clonedMesh.skeleton = null;
                    clonedMesh.bindMatrix = null;
                    
                    // Copy userData if it exists
                    if (mesh.userData) {
                        clonedMesh.userData = JSON.parse(JSON.stringify(mesh.userData));
                    }
                    
                    filteredShirt.add(clonedMesh);
                }
            } catch (error) {
                console.error(`Error processing object ${mesh.name}:`, error);
                // If processing fails, try to add a simple clone
                try {
                    const simpleClone = mesh.clone();
                    if (simpleClone.skeleton) {
                        simpleClone.skeleton = null;
                    }
                    if (simpleClone.bindMatrix) {
                        simpleClone.bindMatrix = null;
                    }
                    filteredShirt.add(simpleClone);
                } catch (e) {
                    console.error(`Failed to add object ${mesh.name}:`, e);
                }
            }
        });
        
        console.log(`Filtered shirt: kept ${meshesToKeep.length} meshes, removed ${meshesToRemove.length} meshes`);
        if (meshesToRemove.length > 0) {
            console.log('Removed meshes:', meshesToRemove.map(m => m.name));
        }
        
        return filteredShirt;
    }

    /* -----------------------------------------------------
       UNIVERSAL HELPERS (ALL-IN-ONE)
    ----------------------------------------------------- */

    attachWearableToBone(group, bone) {
        if (!group || !bone) return;

        group.updateMatrixWorld(true);
        bone.updateMatrixWorld(true);

        const wPos = new THREE.Vector3();
        const wQuat = new THREE.Quaternion();
        const wScale = new THREE.Vector3();
        group.getWorldPosition(wPos);
        group.getWorldQuaternion(wQuat);
        group.getWorldScale(wScale);

        const localPos = wPos.clone();
        bone.worldToLocal(localPos);

        const boneQuat = new THREE.Quaternion();
        bone.getWorldQuaternion(boneQuat);
        const localQuat = wQuat.clone().premultiply(boneQuat.invert());

        group.position.copy(localPos);
        group.quaternion.copy(localQuat);
        group.scale.copy(wScale);

        bone.add(group);
    }

    removePlaceholdersFromScene(scene) {
        scene.traverse((child) => {
            const n = child.name?.toLowerCase();
            if (n && n.includes("placeholder")) {
                child.parent?.remove(child);
            }
        });
    }

    extractWearableMeshes(scene) {
        const meshes = [];
        scene.traverse((child) => {
            if (!child.isMesh) return;

            const n = child.name.toLowerCase();
            const isBodyPart =
                n.includes("body") ||
                n.includes("eye") ||
                n.includes("teeth") ||
                n.includes("tongue") ||
                n.includes("nose") ||
                n.includes("whisker");

            if (!isBodyPart) meshes.push(child);
        });
        return meshes;
    }

    removeHat() {
        if (this.currentHat) {
            // Remove hat from wherever it's parented (head bone, otter model, or scene)
            if (this.currentHat.parent) {
                this.currentHat.parent.remove(this.currentHat);
            } else {
                this.scene.remove(this.currentHat);
            }
            this.currentHat = null;
            document.getElementById('remove-hat-btn').disabled = true;
            
            // Update object selection dropdown if edit mode is active
            if (this.editMode) {
                this.updateObjectSelectionDropdown();
            }
        }
    }

    /* -----------------------------------------------------
       OPTIMIZED SHIRT LOADER  (unchanged behavior)
    ----------------------------------------------------- */

    async loadShirt(shirtName) {
        if (!this.model) {
            alert("Please load an otter fur first!");
            return;
        }

        if (this.currentShirt?.parent) this.currentShirt.parent.remove(this.currentShirt);
        this.currentShirt = null;

        const filePath = this.encodePath("WEARABLES/Shirts", `${shirtName}.glb`);
        const loader = new GLTFLoader();
        
        try {
            const gltf = await loader.loadAsync(filePath);

            const shirtGroup = new THREE.Group();
            shirtGroup.userData.shirtName = shirtName;

            this.removePlaceholdersFromScene(gltf.scene);

            const meshes = this.extractWearableMeshes(gltf.scene);
            
            // CRITICAL FIX: Get WORLD transforms of meshes before extracting
            // This accounts for any parent transforms in the GLB hierarchy
            gltf.scene.updateMatrixWorld(true);
            
            meshes.forEach(mesh => {
                // Get world transform before removing from GLB scene
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                mesh.getWorldQuaternion(worldQuat);
                mesh.getWorldScale(worldScale);
                
                // Reset mesh to origin in shirtGroup's local space
                mesh.position.set(0, 0, 0);
                mesh.rotation.set(0, 0, 0);
                mesh.scale.set(1, 1, 1);
                mesh.quaternion.set(0, 0, 0, 1);
                
                // Add to shirtGroup first (so we can convert world to local)
                shirtGroup.add(mesh);
                
                // Convert world transform to shirtGroup's local space
                shirtGroup.updateMatrixWorld(true);
                const localPos = worldPos.clone();
                const localQuat = worldQuat.clone();
                const localScale = worldScale.clone();
                
                shirtGroup.worldToLocal(localPos);
                
                // Apply the converted local transform
                mesh.position.copy(localPos);
                mesh.quaternion.copy(localQuat);
                mesh.scale.copy(localScale);
                mesh.rotation.setFromQuaternion(localQuat);
            });

            // Attach to ROOT because your shirts align correctly this way
            this.model.add(shirtGroup);

            this.currentShirt = shirtGroup;
            document.getElementById("remove-shirt-btn").disabled = false;
            
            // Update object selection dropdown if edit mode is active
            if (this.editMode) {
                this.updateObjectSelectionDropdown();
            }
        } catch (error) {
            console.error('Error loading shirt:', error);
            alert(`Error loading ${shirtName}.glb:\n\n${error.message}\n\nMake sure the file exists in the WEARABLES/Shirts folder.`);
        }
    }

    removeShirt() {
        if (this.currentShirt) {
            // Remove shirt from wherever it's parented (body bone, otter model, or scene)
            if (this.currentShirt.parent) {
                this.currentShirt.parent.remove(this.currentShirt);
            } else {
                this.scene.remove(this.currentShirt);
            }
            this.currentShirt = null;
            document.getElementById('remove-shirt-btn').disabled = true;
            
            // Update object selection dropdown if edit mode is active
            if (this.editMode) {
                this.updateObjectSelectionDropdown();
            }
        }
    }

    randomize() {
        // Randomly select a fur
        const randomFur = this.furOptions[Math.floor(Math.random() * this.furOptions.length)];
        console.log(`Randomizing: fur = ${randomFur}`);
        
        // Load the random fur
        this.loadFurFile(randomFur).then(() => {
            // After fur loads, randomly select a hat (or no hat)
            const shouldHaveHat = Math.random() > 0.3; // 70% chance of having a hat
            
            if (shouldHaveHat) {
                const randomHat = this.hatOptions[Math.floor(Math.random() * this.hatOptions.length)];
                console.log(`Randomizing: hat = ${randomHat}`);
                // Small delay to ensure fur is fully loaded
                setTimeout(() => {
                    this.loadHat(randomHat);
                }, 100);
            } else {
                // Remove hat if one exists
                this.removeHat();
                console.log('Randomizing: no hat');
            }

            // Randomly select a shirt (or no shirt)
            const shouldHaveShirt = Math.random() > 0.2; // 80% chance of having a shirt
            
            if (shouldHaveShirt) {
                const randomShirt = this.shirtOptions[Math.floor(Math.random() * this.shirtOptions.length)];
                console.log(`Randomizing: shirt = ${randomShirt}`);
                // Small delay to ensure fur is fully loaded
                setTimeout(() => {
                    this.loadShirt(randomShirt);
                }, 150);
            } else {
                // Remove shirt if one exists
                this.removeShirt();
                console.log('Randomizing: no shirt');
            }
        });
    }


    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // Auto-rotate model if enabled
        // Rotate the entire scene or use OrbitControls auto-rotate
        if (this.autoRotate) {
            if (this.controls) {
                // Use OrbitControls built-in auto-rotate for smoother rotation
                this.controls.autoRotate = true;
                this.controls.autoRotateSpeed = 2.0; // Rotation speed
            } else if (this.model) {
                // Fallback: rotate model directly
                this.model.rotation.y += this.rotationSpeed;
            }
        } else {
            if (this.controls) {
                this.controls.autoRotate = false;
            }
        }
        
        if (this.controls) {
            this.controls.update();
        }
        
        // TransformControls don't need update() - they update automatically

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

    }
    
    setEditMode(enabled) {
        this.editMode = enabled;
        const objectSelectGroup = document.getElementById('object-select-group');
        const savePositionsGroup = document.getElementById('save-positions-group');
        
        if (enabled) {
            if (objectSelectGroup) {
                objectSelectGroup.style.display = 'block';
            }
            if (savePositionsGroup) {
                savePositionsGroup.style.display = 'block';
            }
            this.updateObjectSelectionDropdown();
            console.log('Edit mode enabled - Click objects in 3D view or use dropdown to select');
            console.log('Click any mesh/curve in the 3D view to select it for editing');
        } else {
            if (objectSelectGroup) {
                objectSelectGroup.style.display = 'none';
            }
            if (savePositionsGroup) {
                savePositionsGroup.style.display = 'none';
            }
            // Save state before disabling edit mode
            if (this.selectedObject) {
                // Ensure transforms are committed before saving
                this.selectedObject.updateMatrixWorld();
                this.saveStateToHistory('Transform object');
            }
            // Detach transform controls
            if (this.transformControls) {
                this.transformControls.detach();
                this.selectedObject = null;
            }
            console.log('Edit mode disabled');
        }
    }
    
    setupObjectSelection() {
        const objectSelect = document.getElementById('object-select');
        if (objectSelect) {
            objectSelect.addEventListener('change', (e) => {
                const selected = e.target.value;
                if (selected === '' || selected === '-- Select --') {
                    // Deselect and save current state
                    if (this.selectedObject) {
                        this.saveStateToHistory('Transform object');
                    }
                    if (this.transformControls) {
                        this.transformControls.detach();
                    }
                    this.selectedObject = null;
                    console.log('Deselected object - changes saved');
                } else {
                    this.selectObjectForEditing(selected);
                }
            });
        }
        
        // Keyboard shortcuts for transform modes and delete/undo
        window.addEventListener('keydown', (e) => {
            // Only handle if not typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Undo/Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    e.preventDefault();
                    return;
                } else if (e.key === 'y' || e.key === 'Y') {
                    this.redo();
                    e.preventDefault();
                    return;
                }
            }
            
            if (!this.editMode || !this.transformControls) return;
            
            switch(e.key.toLowerCase()) {
                case 'g':
                    if (this.selectedObject) {
                        this.transformControls.setMode('translate');
                        e.preventDefault();
                    }
                    break;
                case 'r':
                    if (this.selectedObject) {
                        this.transformControls.setMode('rotate');
                        e.preventDefault();
                    }
                    break;
                case 's':
                    if (this.selectedObject) {
                        this.transformControls.setMode('scale');
                        e.preventDefault();
                    }
                    break;
                case 'delete':
                case 'backspace':
                    if (this.selectedObject) {
                        this.deleteSelectedObject();
                        e.preventDefault();
                    }
                    break;
            }
        });
    }
    
    selectObjectForEditing(objectType) {
        if (!this.editMode || !this.transformControls) return;
        
        // Save state of previous object before switching
        if (this.selectedObject) {
            // Ensure transforms are committed before saving
            this.selectedObject.updateMatrixWorld();
            this.saveStateToHistory('Transform object');
        }
        
        // Detach from previous object
        this.transformControls.detach();
        this.selectedObject = null;
        
        let targetObject = null;
        
        if (objectType === 'hat' && this.currentHat) {
            targetObject = this.currentHat;
            console.log('Selected hat group for editing - drag the controls to move/rotate/scale');
        } else if (objectType === 'shirt' && this.currentShirt) {
            targetObject = this.currentShirt;
            console.log('Selected shirt group for editing - drag the controls to move/rotate/scale');
        } else if (objectType && objectType.startsWith('hat_')) {
            // Individual hat mesh/curve
            const index = parseInt(objectType.replace('hat_', ''));
            if (this.currentHat && this.currentHat.children[index]) {
                targetObject = this.currentHat.children[index];
                console.log(`Selected hat mesh/curve "${targetObject.name}" for editing`);
            }
        } else if (objectType && objectType.startsWith('shirt_')) {
            // Individual shirt mesh/curve
            const index = parseInt(objectType.replace('shirt_', ''));
            if (this.currentShirt && this.currentShirt.children[index]) {
                targetObject = this.currentShirt.children[index];
                console.log(`Selected shirt mesh/curve "${targetObject.name}" for editing`);
            }
        }
        
        if (targetObject) {
            this.selectedObject = targetObject;
            this.transformControls.attach(targetObject);
            this.transformControls.setMode('translate'); // Default to translate mode
            console.log(`Transform controls attached. Right-click controls to switch modes (translate/rotate/scale)`);
            console.log('Press Delete/Backspace to delete, Ctrl+Z to undo');
        } else {
            console.warn(`Cannot select ${objectType} - object not loaded`);
        }
    }
    
    // Get all selectable objects (groups and individual meshes/curves)
    getAllSelectableObjects() {
        const objects = [];
        
        if (this.currentHat) {
            objects.push({ value: 'hat', label: 'Hat (Group)' });
            this.currentHat.children.forEach((child, index) => {
                objects.push({ 
                    value: `hat_${index}`, 
                    label: `Hat: ${child.name || `Mesh ${index}`}` 
                });
            });
        }
        
        if (this.currentShirt) {
            objects.push({ value: 'shirt', label: 'Shirt (Group)' });
            this.currentShirt.children.forEach((child, index) => {
                objects.push({ 
                    value: `shirt_${index}`, 
                    label: `Shirt: ${child.name || `Mesh ${index}`}` 
                });
            });
        }
        
        return objects;
    }
    
    // Update object selection dropdown with all available objects
    updateObjectSelectionDropdown() {
        const objectSelect = document.getElementById('object-select');
        if (!objectSelect) return;
        
        // Clear existing options
        objectSelect.innerHTML = '<option value="">-- Select --</option>';
        
        // Add all selectable objects
        const objects = this.getAllSelectableObjects();
        objects.forEach(obj => {
            const option = document.createElement('option');
            option.value = obj.value;
            option.textContent = obj.label;
            objectSelect.appendChild(option);
        });
        
        console.log(`Updated object selection: ${objects.length} objects available`);
    }
    
    // Setup click-to-select in 3D view
    setupClickToSelect() {
        if (!this.renderer) return;
        
        const canvas = this.renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        canvas.addEventListener('click', (event) => {
            if (!this.editMode) return;
            
            // Calculate mouse position in normalized device coordinates
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Raycast to find intersected objects
            raycaster.setFromCamera(mouse, this.camera);
            
            // Collect all selectable objects (hat, shirt, and their children)
            const selectableObjects = [];
            if (this.currentHat) {
                selectableObjects.push(this.currentHat);
                this.currentHat.traverse((child) => {
                    if (child instanceof THREE.Mesh || 
                        child instanceof THREE.Line || 
                        child instanceof THREE.LineSegments) {
                        selectableObjects.push(child);
                    }
                });
            }
            if (this.currentShirt) {
                selectableObjects.push(this.currentShirt);
                this.currentShirt.traverse((child) => {
                    if (child instanceof THREE.Mesh || 
                        child instanceof THREE.Line || 
                        child instanceof THREE.LineSegments) {
                        selectableObjects.push(child);
                    }
                });
            }
            
            const intersects = raycaster.intersectObjects(selectableObjects, true);
            
            if (intersects.length > 0) {
                const selected = intersects[0].object;
                // Find the top-level selectable object (group or direct child)
                let targetObject = selected;
                
                // If clicked object is a child, use it directly; otherwise use the group
                if (selected.parent === this.currentHat || selected.parent === this.currentShirt) {
                    targetObject = selected;
                } else if (selected === this.currentHat || selected === this.currentShirt) {
                    targetObject = selected;
                } else {
                    // Find the parent group
                    let parent = selected.parent;
                    while (parent) {
                        if (parent === this.currentHat || parent === this.currentShirt) {
                            targetObject = selected; // Use the clicked mesh/curve
                            break;
                        }
                        parent = parent.parent;
                    }
                }
                
                // Attach transform controls to selected object
                if (this.transformControls) {
                    // Save state of previous object before switching
                    if (this.selectedObject && this.selectedObject !== targetObject) {
                        // Ensure previous object's transforms are committed
                        this.selectedObject.updateMatrixWorld();
                        this.saveStateToHistory('Transform object');
                    }
                    
                    this.transformControls.detach();
                    this.transformControls.attach(targetObject);
                    this.transformControls.setMode('translate');
                    this.selectedObject = targetObject;
                    console.log(`Selected "${targetObject.name || 'object'}" for editing - click and drag to transform`);
                    console.log('Press Delete/Backspace to delete, Ctrl+Z to undo');
                    
                    // Update dropdown to reflect selection
                    this.updateObjectSelectionDropdown();
                }
            } else {
                // Clicked on empty space - deselect and save current state
                if (this.transformControls && this.selectedObject) {
                    // Ensure transforms are committed before saving
                    this.selectedObject.updateMatrixWorld();
                    this.saveStateToHistory('Transform object');
                    this.transformControls.detach();
                    this.selectedObject = null;
                    console.log('Deselected object - changes saved');
                    
                    // Update dropdown
                    this.updateObjectSelectionDropdown();
                }
            }
        });
    }
    
    // Method to turn off edit mode when user confirms they like the positions
    confirmEditPositions() {
        if (this.editMode) {
            console.log('Saving current positions...');
            // Positions are already saved in the objects themselves
            // Just turn off edit mode
            this.setEditMode(false);
            const editModeCheckbox = document.getElementById('edit-mode');
            if (editModeCheckbox) {
                editModeCheckbox.checked = false;
            }
            console.log('Edit mode turned off. Positions saved.');
        }
    }
    
    // Delete the currently selected object
    deleteSelectedObject() {
        if (!this.selectedObject) {
            console.warn('No object selected to delete');
            return;
        }
        
        const objectToDelete = this.selectedObject;
        const parent = objectToDelete.parent;
        const objectName = objectToDelete.name || 'object';
        
        // Get index in parent before removal
        let indexInParent = -1;
        if (parent) {
            indexInParent = parent.children.indexOf(objectToDelete);
        }
        
        // Save state to history before deleting (store object reference for undo)
        this.saveStateToHistory(`Delete ${objectName}`, objectToDelete, parent, indexInParent);
        
        // Detach transform controls
        if (this.transformControls) {
            this.transformControls.detach();
        }
        
        // Remove from parent
        if (parent) {
            parent.remove(objectToDelete);
        } else {
            this.scene.remove(objectToDelete);
        }
        
        // Check if we deleted the entire hat or shirt
        if (objectToDelete === this.currentHat) {
            this.currentHat = null;
            const removeHatBtn = document.getElementById('remove-hat-btn');
            if (removeHatBtn) removeHatBtn.disabled = true;
        } else if (objectToDelete === this.currentShirt) {
            this.currentShirt = null;
            const removeShirtBtn = document.getElementById('remove-shirt-btn');
            if (removeShirtBtn) removeShirtBtn.disabled = true;
        }
        
        this.selectedObject = null;
        console.log(`Deleted ${objectName}. Press Ctrl+Z to undo.`);
        
        // Update dropdown
        if (this.editMode) {
            this.updateObjectSelectionDropdown();
        }
    }
    
    // Save current state to history for undo/redo
    saveStateToHistory(action = 'Edit', deletedObject = null, deletedObjectParent = null, deletedObjectIndex = -1) {
        // Ensure all transforms are committed before saving
        if (this.selectedObject) {
            this.selectedObject.updateMatrixWorld();
        }
        if (this.currentHat) {
            this.currentHat.updateMatrixWorld();
        }
        if (this.currentShirt) {
            this.currentShirt.updateMatrixWorld();
        }
        
        const state = {
            action: action,
            timestamp: Date.now(),
            hat: this.currentHat ? this.serializeObject(this.currentHat) : null,
            shirt: this.currentShirt ? this.serializeObject(this.currentShirt) : null,
            deletedObject: deletedObject,
            deletedObjectParent: deletedObjectParent,
            deletedObjectIndex: deletedObjectIndex
        };
        
        // Remove any states after current index (when we're not at the end)
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new state
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        console.log(`State saved: ${action}`, {
            hat: state.hat ? `${state.hat.position.x.toFixed(3)}, ${state.hat.position.y.toFixed(3)}, ${state.hat.position.z.toFixed(3)}` : 'null',
            shirt: state.shirt ? `${state.shirt.position.x.toFixed(3)}, ${state.shirt.position.y.toFixed(3)}, ${state.shirt.position.z.toFixed(3)}` : 'null'
        });
        
        // Also save to localStorage for persistence across page refreshes
        this.savePositionsToStorage();
    }
    
    // Save current positions to localStorage
    savePositionsToStorage() {
        try {
            const positions = {
                hats: {},
                shirts: {}
            };
            
            // Save hat position if it exists
            if (this.currentHat) {
                const hatName = this.getHatName();
                if (hatName) {
                    // Get world position if parented to bone, otherwise use local
                    let pos, rot, scale, quat;
                    if (this.currentHat.parent && this.currentHat.parent.type === 'Bone') {
                        const worldPos = new THREE.Vector3();
                        const worldQuat = new THREE.Quaternion();
                        const worldScale = new THREE.Vector3();
                        this.currentHat.getWorldPosition(worldPos);
                        this.currentHat.getWorldQuaternion(worldQuat);
                        this.currentHat.getWorldScale(worldScale);
                        pos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
                        quat = { x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w };
                        scale = { x: worldScale.x, y: worldScale.y, z: worldScale.z };
                        rot = { x: this.currentHat.rotation.x, y: this.currentHat.rotation.y, z: this.currentHat.rotation.z };
                    } else {
                        pos = { x: this.currentHat.position.x, y: this.currentHat.position.y, z: this.currentHat.position.z };
                        rot = { x: this.currentHat.rotation.x, y: this.currentHat.rotation.y, z: this.currentHat.rotation.z };
                        scale = { x: this.currentHat.scale.x, y: this.currentHat.scale.y, z: this.currentHat.scale.z };
                        quat = { x: this.currentHat.quaternion.x, y: this.currentHat.quaternion.y, z: this.currentHat.quaternion.z, w: this.currentHat.quaternion.w };
                    }
                    const hatData = { position: pos, rotation: rot, scale: scale, quaternion: quat, children: [] };
                    
                    // Save all children (meshes, curves, lines) positions
                    this.currentHat.children.forEach((child, index) => {
                        if (child instanceof THREE.Mesh || 
                            child instanceof THREE.Line || 
                            child instanceof THREE.LineSegments ||
                            child instanceof THREE.Group) {
                            child.updateMatrixWorld();
                            let childPos, childRot, childScale, childQuat;
                            if (this.currentHat.parent && this.currentHat.parent.type === 'Bone') {
                                const worldPos = new THREE.Vector3();
                                const worldQuat = new THREE.Quaternion();
                                const worldScale = new THREE.Vector3();
                                child.getWorldPosition(worldPos);
                                child.getWorldQuaternion(worldQuat);
                                child.getWorldScale(worldScale);
                                childPos = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
                                childQuat = { x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w };
                                childScale = { x: worldScale.x, y: worldScale.y, z: worldScale.z };
                                childRot = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
                            } else {
                                childPos = { x: child.position.x, y: child.position.y, z: child.position.z };
                                childRot = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
                                childScale = { x: child.scale.x, y: child.scale.y, z: child.scale.z };
                                childQuat = { x: child.quaternion.x, y: child.quaternion.y, z: child.quaternion.z, w: child.quaternion.w };
                            }
                            hatData.children.push({
                                name: child.name,
                                index: index,
                                position: childPos,
                                rotation: childRot,
                                scale: childScale,
                                quaternion: childQuat,
                                visible: child.visible
                            });
                        }
                    });
                    
                    positions.hats[hatName] = hatData;
                }
            }
            
            // Save shirt position if it exists
            if (this.currentShirt) {
                const shirtName = this.getShirtName();
                if (shirtName) {
                    const shirtData = {
                        position: { x: this.currentShirt.position.x, y: this.currentShirt.position.y, z: this.currentShirt.position.z },
                        rotation: { x: this.currentShirt.rotation.x, y: this.currentShirt.rotation.y, z: this.currentShirt.rotation.z },
                        scale: { x: this.currentShirt.scale.x, y: this.currentShirt.scale.y, z: this.currentShirt.scale.z },
                        quaternion: { x: this.currentShirt.quaternion.x, y: this.currentShirt.quaternion.y, z: this.currentShirt.quaternion.z, w: this.currentShirt.quaternion.w },
                        children: []
                    };
                    
                    // Save all children (meshes, curves, lines) positions
                    this.currentShirt.children.forEach((child, index) => {
                        if (child instanceof THREE.Mesh || 
                            child instanceof THREE.Line || 
                            child instanceof THREE.LineSegments ||
                            child instanceof THREE.Group) {
                            child.updateMatrixWorld();
                            shirtData.children.push({
                                name: child.name,
                                index: index,
                                position: { x: child.position.x, y: child.position.y, z: child.position.z },
                                rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
                                scale: { x: child.scale.x, y: child.scale.y, z: child.scale.z },
                                quaternion: { x: child.quaternion.x, y: child.quaternion.y, z: child.quaternion.z, w: child.quaternion.w },
                                visible: child.visible
                            });
                        }
                    });
                    
                    positions.shirts[shirtName] = shirtData;
                }
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(positions));
            console.log('Positions saved to localStorage');
        } catch (error) {
            console.error('Error saving positions to localStorage:', error);
        }
    }
    
    // Load saved position from localStorage
    loadSavedPosition(type, name) {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return null;
            
            const positions = JSON.parse(stored);
            if (type === 'hat' && positions.hats && positions.hats[name]) {
                return positions.hats[name];
            } else if (type === 'shirt' && positions.shirts && positions.shirts[name]) {
                return positions.shirts[name];
            }
            return null;
        } catch (error) {
            console.error('Error loading saved position:', error);
            return null;
        }
    }
    
    // Get current hat name
    getHatName() {
        if (this.currentHat && this.currentHat.userData && this.currentHat.userData.hatName) {
            return this.currentHat.userData.hatName;
        }
        return null;
    }
    
    // Get current shirt name
    getShirtName() {
        if (this.currentShirt && this.currentShirt.userData && this.currentShirt.userData.shirtName) {
            return this.currentShirt.userData.shirtName;
        }
        return null;
    }
    
    // Explicitly save current positions as default (called by Save button)
    saveCurrentPositions() {
        // Ensure all transforms are committed
        if (this.currentHat) {
            this.currentHat.updateMatrixWorld();
            this.currentHat.children.forEach(child => child.updateMatrixWorld());
        }
        if (this.currentShirt) {
            this.currentShirt.updateMatrixWorld();
            this.currentShirt.children.forEach(child => child.updateMatrixWorld());
        }
        if (this.selectedObject) {
            this.selectedObject.updateMatrixWorld();
        }
        
        // Save to localStorage
        this.savePositionsToStorage();
        
        // Show feedback
        const saveFeedback = document.getElementById('save-feedback');
        if (saveFeedback) {
            const hatName = this.getHatName();
            const shirtName = this.getShirtName();
            let message = 'Positions saved!';
            if (hatName || shirtName) {
                message += ' Saved positions for:';
                if (hatName) message += ` ${hatName}`;
                if (shirtName) message += ` ${shirtName}`;
            }
            saveFeedback.textContent = message;
            saveFeedback.style.display = 'block';
            saveFeedback.style.color = '#4CAF50'; // Green color
            
            // Hide feedback after 3 seconds
            setTimeout(() => {
                saveFeedback.style.display = 'none';
            }, 3000);
        }
        
        console.log('✅ Positions explicitly saved as default load positions');
    }
    
    // Serialize object state (position, rotation, scale, children)
    serializeObject(object) {
        if (!object) return null;
        
        // Ensure matrix is up to date before reading transforms
        object.updateMatrixWorld();
        
        const serialized = {
            position: object.position.clone(),
            rotation: object.rotation.clone(),
            scale: object.scale.clone(),
            quaternion: object.quaternion.clone(),
            children: []
        };
        
        // Serialize children
        object.children.forEach((child, index) => {
            if (child instanceof THREE.Mesh || 
                child instanceof THREE.Line || 
                child instanceof THREE.LineSegments ||
                child instanceof THREE.Group) {
                // Ensure child matrix is updated
                child.updateMatrixWorld();
                serialized.children.push({
                    name: child.name,
                    position: child.position.clone(),
                    rotation: child.rotation.clone(),
                    scale: child.scale.clone(),
                    quaternion: child.quaternion.clone(),
                    visible: child.visible,
                    index: index
                });
            }
        });
        
        return serialized;
    }
    
    // Restore object from serialized state
    restoreObject(object, state) {
        if (!object || !state) return;
        
        console.log(`Restoring object "${object.name || 'object'}"`, {
            from: `${object.position.x.toFixed(3)}, ${object.position.y.toFixed(3)}, ${object.position.z.toFixed(3)}`,
            to: `${state.position.x.toFixed(3)}, ${state.position.y.toFixed(3)}, ${state.position.z.toFixed(3)}`
        });
        
        object.position.copy(state.position);
        object.rotation.copy(state.rotation);
        object.scale.copy(state.scale);
        object.quaternion.copy(state.quaternion);
        
        // Restore children states
        state.children.forEach((childState) => {
            if (object.children[childState.index]) {
                const child = object.children[childState.index];
                child.position.copy(childState.position);
                child.rotation.copy(childState.rotation);
                child.scale.copy(childState.scale);
                child.quaternion.copy(childState.quaternion);
                child.visible = childState.visible;
                child.updateMatrixWorld();
            }
        });
        
        object.updateMatrixWorld();
    }
    
    // Undo last action
    undo() {
        if (this.historyIndex <= 0) {
            console.log('Nothing to undo');
            return;
        }
        
        // Get current state before undoing
        const currentState = this.history[this.historyIndex];
        
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        
        // If we're undoing a deletion, restore the deleted object
        if (currentState.deletedObject && currentState.deletedObjectParent !== null) {
            const deletedObj = currentState.deletedObject;
            const parent = currentState.deletedObjectParent;
            const index = currentState.deletedObjectIndex;
            
            // Restore object to parent
            if (parent) {
                if (index >= 0 && index < parent.children.length) {
                    parent.children.splice(index, 0, deletedObj);
                } else {
                    parent.add(deletedObj);
                }
            } else {
                this.scene.add(deletedObj);
            }
            
            // Restore hat/shirt references if needed
            if (deletedObj === this.currentHat || (this.currentHat === null && deletedObj.name && deletedObj.name.includes('hat'))) {
                // Check if this was the hat
                if (deletedObj === currentState.hat || !this.currentHat) {
                    this.currentHat = deletedObj;
                    const removeHatBtn = document.getElementById('remove-hat-btn');
                    if (removeHatBtn) removeHatBtn.disabled = false;
                }
            }
            if (deletedObj === this.currentShirt || (this.currentShirt === null && deletedObj.name && deletedObj.name.includes('shirt'))) {
                // Check if this was the shirt
                if (deletedObj === currentState.shirt || !this.currentShirt) {
                    this.currentShirt = deletedObj;
                    const removeShirtBtn = document.getElementById('remove-shirt-btn');
                    if (removeShirtBtn) removeShirtBtn.disabled = false;
                }
            }
            
            console.log(`Restored deleted object: ${deletedObj.name || 'object'}`);
        }
        
        // Restore hat state
        if (state.hat && this.currentHat) {
            this.restoreObject(this.currentHat, state.hat);
        }
        
        // Restore shirt state
        if (state.shirt && this.currentShirt) {
            this.restoreObject(this.currentShirt, state.shirt);
        }
        
        console.log(`Undo: ${state.action}`);
        
        // Update dropdown
        if (this.editMode) {
            this.updateObjectSelectionDropdown();
        }
        
        // Reattach transform controls if object is still selected
        if (this.selectedObject && this.transformControls) {
            this.transformControls.attach(this.selectedObject);
        }
    }
    
    // Redo last undone action
    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            console.log('Nothing to redo');
            return;
        }
        
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        
        // If we're redoing a deletion, delete the object again
        if (state.deletedObject && state.deletedObjectParent !== null) {
            const deletedObj = state.deletedObject;
            const parent = state.deletedObjectParent;
            
            // Remove object again
            if (parent) {
                parent.remove(deletedObj);
            } else {
                this.scene.remove(deletedObj);
            }
            
            // Clear hat/shirt references if needed
            if (deletedObj === this.currentHat) {
                this.currentHat = null;
                const removeHatBtn = document.getElementById('remove-hat-btn');
                if (removeHatBtn) removeHatBtn.disabled = true;
            }
            if (deletedObj === this.currentShirt) {
                this.currentShirt = null;
                const removeShirtBtn = document.getElementById('remove-shirt-btn');
                if (removeShirtBtn) removeShirtBtn.disabled = true;
            }
            
            // Clear selection if it was the selected object
            if (deletedObj === this.selectedObject) {
                this.selectedObject = null;
                if (this.transformControls) {
                    this.transformControls.detach();
                }
            }
            
            console.log(`Redid deletion: ${deletedObj.name || 'object'}`);
        }
        
        // Restore hat state
        if (state.hat && this.currentHat) {
            this.restoreObject(this.currentHat, state.hat);
        }
        
        // Restore shirt state
        if (state.shirt && this.currentShirt) {
            this.restoreObject(this.currentShirt, state.shirt);
        }
        
        console.log(`Redo: ${state.action}`);
        
        // Update dropdown
        if (this.editMode) {
            this.updateObjectSelectionDropdown();
        }
        
        // Reattach transform controls if object is still selected
        if (this.selectedObject && this.transformControls) {
            this.transformControls.attach(this.selectedObject);
        }
    }
}

// Initialize
let avatarBuilder;
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing AvatarBuilder...');
    try {
        avatarBuilder = new AvatarBuilder();
        console.log('AvatarBuilder initialized successfully!');
    } catch (error) {
        console.error('Error initializing AvatarBuilder:', error);
        alert('Error initializing Avatar Builder. Check console for details.');
    }
    
    // Expose hat rotation function globally for console access
    window.rotateHat = (axis, amount = null) => {
        if (avatarBuilder) {
            avatarBuilder.rotateHat(axis, amount);
        }
    };
    
    // Expose hat movement function globally for console access
    window.moveHat = (direction, amount = 0.05) => {
        if (avatarBuilder) {
            avatarBuilder.moveHat(direction, amount);
        }
    };
    
    // Expose edit mode confirmation function
    window.confirmEditPositions = () => {
        if (avatarBuilder) {
            avatarBuilder.confirmEditPositions();
        }
    };
    
    // Expose object selection for editing
    window.selectForEditing = (objectType) => {
        if (avatarBuilder) {
            avatarBuilder.selectObjectForEditing(objectType);
        }
    };
});
