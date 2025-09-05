// Elements
const startButton = document.getElementById('startButton');
const container = document.getElementById('container');

// Event listener to start the experience
startButton.addEventListener('click', () => {
    startButton.style.display = 'none';
    container.style.display = 'block';
    init();  // Initialize 3D scene
});

let scene, camera, renderer, controls;
let sun, planets = [];
const satellitesInOrbit = [];
const spaceObjectsData = []; // Массив для околоземных объектов

// Updated planet data with realistic scales
const planetData = [
    // Mercury
    {
        name: 'Mercury',
        texture: 'textures/mercury.jpg',
        radius: 0.38 * 3,  // Увеличиваем радиус в 3 раза
        distance: 39,
        speed: 6.21,
        description: 'Mercury is the smallest planet in our solar system and the closest to the Sun.'
    },
    // Venus
    {
        name: 'Venus',
        texture: 'textures/venus.jpg',
        radius: 0.95 * 3,  // Увеличиваем радиус в 3 раза
        distance: 79,
        speed: 2.44,
        description: 'Venus is the second planet from the Sun and is similar in structure to Earth.'
    },
    // Earth with Moon
    {
        name: 'Earth',
        texture: 'textures/earth.jpg',
        radius: 1 * 3,  // Увеличиваем радиус в 3 раза
        distance: 100,
        speed: 1.5,
        satellites: [
            {
                name: 'Moon',
                texture: 'textures/moon.jpg',
                radius: 0.27 * 3,  // Увеличиваем радиус Луны в 3 раза
                distance: 1.5
            }
        ],
        description: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life.'
    },
    // Mars with moons Phobos and Deimos
    {
        name: 'Mars',
        texture: 'textures/mars.jpg',
        radius: 0.53 * 3,  // Увеличиваем радиус в 3 раза
        distance: 152,
        speed: 0.80,
        satellites: [
            {
                name: 'Phobos',
                texture: 'textures/phobos.jpg',
                radius: 0.14 * 3,  // Увеличиваем радиус в 3 раза
                distance: 1
            },
            {
                name: 'Deimos',
                texture: 'textures/deimos.jpg',
                radius: 0.08 * 3,  // Увеличиваем радиус в 3 раза
                distance: 1.5
            }
        ],
        description: 'Mars is the fourth planet from the Sun and is known for its red color.'
    },
    // Jupiter
    {
        name: 'Jupiter',
        texture: 'textures/jupiter.jpg',
        radius: 11.2 * 3,  // Увеличиваем радиус в 3 раза
        distance: 520,
        speed: 0.25,
        description: 'Jupiter is the largest planet in our solar system, known for its Great Red Spot.'
    },
    // Saturn with Rings
    {
        name: 'Saturn',
        texture: 'textures/saturn.jpg',
        radius: 9.5 * 3,  // Увеличиваем радиус в 3 раза
        distance: 958,
        speed: 0.05,
        description: 'Saturn is famous for its stunning rings and is the second largest planet in the solar system.'
    },
    // Uranus
    {
        name: 'Uranus',
        texture: 'textures/uranus.jpg',
        radius: 4.0 * 3,  // Увеличиваем радиус в 3 раза
        distance: 1400,
        speed: 0.017,
        description: 'Uranus is the third largest planet in our solar system and has a unique blue color.'
    },
    // Neptune
    {
        name: 'Neptune',
        texture: 'textures/neptune.jpg',
        radius: 3.9 * 3,  // Увеличиваем радиус в 3 раза
        distance: 1800,
        speed: 0.009,
        description: 'Neptune is known for its deep blue color and is the farthest planet from the Sun.'
    }
];

// Function for asynchronously loading textures
function loadTextureAsync(texturePath) {
    return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            texturePath,
            (texture) => resolve(texture),
            undefined,
            (error) => reject(error)
        );
    });
}

async function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Directional light for realistic shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Load texture for the star background
    const starTexture = new THREE.TextureLoader().load('textures/stars.jpg');
    const starGeometry = new THREE.SphereGeometry(5000, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({ map: starTexture, side: THREE.BackSide });
    const stars = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(stars);

    // Sun with texture
    const sunTexture = new THREE.TextureLoader().load('textures/sun.jpg');
    const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({ map: sunTexture });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.castShadow = true;
    scene.add(sun);

    // Create planets with async texture loading
    for (const data of planetData) {
        try {
            const planetTexture = await loadTextureAsync(data.texture);
            const planetGeometry = new THREE.SphereGeometry(data.radius, 64, 64);
            const planetMaterial = new THREE.MeshStandardMaterial({ map: planetTexture });
            const planet = new THREE.Mesh(planetGeometry, planetMaterial);
            planet.position.set(data.distance, 0, 0);
            planet.userData = { ...data };

            planet.castShadow = true;
            planets.push(planet);
            scene.add(planet);

            // Add satellites for planets
            if (data.satellites) {
                addSatellites(planet, data.satellites);
            }

            // Add Saturn's Rings
            if (data.name === 'Saturn') {
                const ringTexture = await loadTextureAsync('textures/saturn_rings.png');
                const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 2, 64);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    map: ringTexture,
                    side: THREE.DoubleSide,
                    transparent: true
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                planet.add(ring);
            }

        } catch (error) {
            console.error(`Error loading texture for ${data.name}:`, error);
        }
    }

    camera.position.z = 150;

    // Add orbit lines
    planetData.forEach(data => createOrbit(data.distance));

    // Load and display near-Earth objects from NASA API
    loadNearEarthObjects();

    // Save camera position on page unload
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('cameraPosition', JSON.stringify(camera.position));
        localStorage.setItem('cameraRotation', JSON.stringify(camera.rotation));
    });

    // Restore camera position on page load
    const savedPosition = localStorage.getItem('cameraPosition');
    const savedRotation = localStorage.getItem('cameraRotation');
    if (savedPosition && savedRotation) {
        const position = JSON.parse(savedPosition);
        const rotation = JSON.parse(savedRotation);
        camera.position.set(position.x, position.y, position.z);
        camera.rotation.set(rotation._x, rotation._y, rotation._z);
    }

    animate();
}

function addSatellites(planet, satellites) {
    satellites.forEach(satelliteData => {
        const texture = new THREE.TextureLoader().load(satelliteData.texture);
        const geometry = new THREE.SphereGeometry(satelliteData.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({ map: texture });
        const satellite = new THREE.Mesh(geometry, material);
        satellite.position.set(satelliteData.distance, 0, 0);
        satellitesInOrbit.push({ mesh: satellite, distance: satelliteData.distance, planet });
        planet.add(satellite);
    });
}

// Function to create orbits around the sun
function createOrbit(distance) {
    const curve = new THREE.EllipseCurve(0, 0, distance, distance);
    const points = curve.getPoints(50);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);
}

// NASA API function to get near-Earth objects
async function loadNearEarthObjects() {
    const nasaApiKey = 'aleLKWD6iXBIn5WL0D8nG1oNbdepArTkLU9drzbr'; // Replace with your NASA API Key
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=2024-10-01&end_date=2024-10-07&api_key=${nasaApiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const nearEarthObjects = data.near_earth_objects;

        Object.keys(nearEarthObjects).forEach(date => {
            nearEarthObjects[date].forEach(neo => {
                const distance = neo.close_approach_data[0].miss_distance.lunar;
                const radius = (neo.estimated_diameter.kilometers.estimated_diameter_max / 2) * 10; // Scale for visibility

                spaceObjectsData.push({
                    name: neo.name,
                    texture: 'textures/meteorite.jpg',
                    radius: radius,
                    distance: distance,
                    speed: Math.random() * 2 + 1,  // Random speed for rotation
                    description: `NEO ${neo.name} with a diameter of ${radius.toFixed(2)} km`
                });
            });
        });

        addSpaceObjects();  // Добавляем объекты в сцену
    } catch (error) {
        console.error('Error fetching NASA NEO data:', error);
    }
}

// Добавляем метеориты и астероиды в сцену
async function addSpaceObjects() {
    for (const objectData of spaceObjectsData) {
        try {
            const objectTexture = await loadTextureAsync(objectData.texture);
            const objectGeometry = new THREE.SphereGeometry(objectData.radius, 32, 32);
            const objectMaterial = new THREE.MeshStandardMaterial({ map: objectTexture });
            const spaceObject = new THREE.Mesh(objectGeometry, objectMaterial);

            // Устанавливаем позицию объекта
            spaceObject.position.set(objectData.distance * 2, 0, 0);
            spaceObject.userData = { ...objectData };

            spaceObject.castShadow = true;
            planets.push(spaceObject);  // Добавляем в массив для анимации
            scene.add(spaceObject);
        } catch (error) {
            console.error(`Error loading texture for ${objectData.name}:`, error);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Rotate planets and update positions
    planets.forEach(planet => {
        planet.rotation.y += 0.01;
        planet.position.x = planet.userData.distance * Math.cos(Date.now() * 0.001 * planet.userData.speed);
        planet.position.z = planet.userData.distance * Math.sin(Date.now() * 0.001 * planet.userData.speed);
    });

    // Update satellite positions
    satellitesInOrbit.forEach(({ mesh, distance, planet }) => {
        mesh.position.x = planet.position.x + distance * Math.cos(Date.now() * 0.002);
        mesh.position.z = planet.position.z + distance * Math.sin(Date.now() * 0.002);
    });

    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse move event for hover interaction
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const infoCard = document.getElementById('infoCard');

window.addEventListener('mousemove', onMouseMove);

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.concat(spaceObjectsData));  // Добавляем околоземные объекты

    if (intersects.length > 0) {
        const object = intersects[0].object;
        infoCard.style.display = 'block';
        infoCard.style.left = event.clientX + 'px';
        infoCard.style.top = event.clientY + 'px';
        infoCard.innerHTML = `<strong>${object.userData.name}</strong><br>${object.userData.description}`;
    } else {
        infoCard.style.display = 'none';
    }
}
