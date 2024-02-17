

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 0); // Camera is above looking down at the scene
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the scene

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Load the circle texture
const circleTexture = textureLoader.load('https://threejs.org/examples/textures/sprites/circle.png');

// Particles setup
const particlesGeometry = new THREE.BufferGeometry();
const particlesCnt = 150000; // Lower this number if you are experiencing performance issues
const posArray = new Float32Array(particlesCnt * 3); // Multiply by 3 for x,y,z coordinates
const velocityArray = new Float32Array(particlesCnt); // Just need one component for Y velocity

for (let i = 0; i < particlesCnt * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 5;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocityArray, 1));

// Materials setup
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.015,
    map: circleTexture,
    transparent: true,
    blending: THREE.AdditiveBlending
});

// Mesh
const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleMesh);

// Responsive canvas
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Instantiate the SimplexNoise
const simplex = new SimplexNoise();

// Animation constants
const gravity = -0.00005; // Gravity pulling down the particles
const bounceFactor = 0.5; // How 1.5'bouncy' the particles are

function regenerateParticle(i, positions, velocities) {
    // Randomize the x and z coordinates around the 'sea level'
    positions[i] = (Math.random() - 0.5) * 5; // x position
    positions[i + 1] = 2.5; // y position (sea level)
    positions[i + 2] = (Math.random() - 0.5) * 5; // z position
    velocities[i / 3] = 0; // reset velocity
}

// Extend the particle system to interact with local storage
function handleParticleExit(index, positions, velocity) {
    // Calculate which edge the particle is exiting from
    const edge = calculateExitEdge(positions[index], positions[index + 1]);

    // Save particle data to local storage with a unique key
    const particleData = { position: [positions[index], positions[index + 1], positions[index + 2]], velocity: velocity, edge: edge };
    const key = 'particleExit' + Date.now();
    localStorage.setItem(key, JSON.stringify(particleData));
    console.log(`Particle exited on ${edge} edge, setting item in localStorage with key: ${key}`); // Log when a particle exits
}

// Listen for local storage changes to import particles
window.addEventListener('storage', (event) => {
    console.log(`Storage event detected! Key: ${event.key}`); // Log when an event is detected
    if (event.key.startsWith('particleExit')) {
        const particleData = JSON.parse(event.newValue);
        console.log(`Importing particle with data:`, particleData); // Log the data of the importing particle
        importParticle(particleData);
    }
});

function importParticle(particleData) {
    // Determine where to place the particle based on the edge it exited from
    const newPosition = calculateImportPosition(particleData.edge);

    // Add the particle to the system at the new position
    addParticle(newPosition, particleData.velocity); // Implement this function based on your system
}
// Store window position on load, resize, and move
function storeWindowPosition() {
  const windowData = {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
    title: document.title // Assuming each window has a unique title
  };
  localStorage.setItem('windowPosition-' + document.title, JSON.stringify(windowData));
}

// Call this function whenever the window is moved or resized
window.addEventListener('resize', storeWindowPosition);
window.addEventListener('mousemove', storeWindowPosition);

// Initial call to store the position when the page loads
storeWindowPosition();

// Your calculateImportPosition and isEdgeAdjacentToOtherWindow functions will need to use the stored positions
function isEdgeAdjacentToOtherWindow(edge) {
  // Replace with the actual logic to determine adjacency
  // Get this window's position from localStorage
  const thisWindowPosition = JSON.parse(localStorage.getItem('windowPosition-' + document.title));
  
  // Check against the positions of other windows
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('windowPosition') && key !== 'windowPosition-' + document.title) {
      const otherWindowPosition = JSON.parse(localStorage.getItem(key));
      
      // Logic to determine if otherWindowPosition is adjacent based on the edge
      // This is a placeholder logic; you'll have to develop a proper algorithm depending on your needs
      if (otherWindowPosition && Math.abs(otherWindowPosition.x - thisWindowPosition.x) < someThreshold && edge === 'right') {
        return true;
      }
    }
  }
  return false;
}



function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.0002;
    const positions = particleMesh.geometry.attributes.position.array;
    const velocities = particleMesh.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
        const indexY = i / 3;

        // Your noise application and gravity
        const noiseX = simplex.noise3D(positions[i], positions[i + 1], time) * 0.1;
        const noiseY = simplex.noise3D(positions[i + 1], positions[i + 2], time) * 0.1;
        const noiseZ = simplex.noise3D(positions[i + 2], positions[i], time) * 0.1;

        velocities[indexY] += gravity; // Apply gravity to velocity
        positions[i] += noiseX;
        positions[i + 1] += velocities[indexY] + noiseY; // Apply velocity to position
        positions[i + 2] += noiseZ;

        // Check if the particle is exiting the viewport and handle it
if (isParticleExitingViewport(positions[i], positions[i + 1], positions[i + 2])) {
    handleParticleExit(i, positions, velocities[indexY]);
    regenerateParticle(i, positions, velocities); // Reset the particle
        } else {
            // Regenerate particle if it goes below the 'floor'
            if (positions[i + 1] < -2.5) {
                regenerateParticle(i, positions, velocities);
            }
        }
    }

    particleMesh.geometry.attributes.position.needsUpdate = true;
    particleMesh.geometry.attributes.velocity.needsUpdate = true;

    renderer.render(scene, camera);
}
function isParticleExitingViewport(x, y, z) {
    // Assuming the viewport is centered at (0,0) and spans from -2.5 to 2.5 in all directions
    return x < -2.5 || x > 2.5 || y < -2.5 || y > 2.5 || z < -2.5 || z > 2.5;
}
function addParticle(position, velocity) {
    // Find the first "dead" particle in the system and replace it
    const positions = particlesGeometry.getAttribute('position');
    const velocities = particlesGeometry.getAttribute('velocity');
    for (let i = 0; i < particlesCnt; i++) {
        if (positions.array[i * 3 + 1] < -2.5) { // Assume -2.5 is "out of bounds"
            positions.array[i * 3] = position[0];
            positions.array[i * 3 + 1] = position[1];
            positions.array[i * 3 + 2] = position[2];
            velocities.array[i] = velocity;
            break;
        }
    }

    // Mark attributes as needing update
    positions.needsUpdate = true;
    velocities.needsUpdate = true;
    console.log(`Adding particle at position: ${position} with velocity: ${velocity}`); // Log when a new particle is added

}

function handleParticleExit(index, positions, velocity) {
    // Calculate which edge the particle is exiting from and only save it if it's near the edge
    const edge = calculateExitEdge(positions[index], positions[index + 1]);

    // Only save if particle is near an edge
    if (edge) {
        try {
            // Compress the particle data before saving it to reduce size
            const particleData = { position: [positions[index], positions[index + 1], positions[index + 2]], velocity: velocity, edge: edge };
            const compressedData = LZString.compressToUTF16(JSON.stringify(particleData));

            // Save the compressed particle data to local storage
            localStorage.setItem('particleExit' + Date.now(), compressedData);
        } catch (e) {
            console.error('LocalStorage is full, please clear some particles', e);
            // Here, implement a strategy to clear old particles or compress them further.
        }
    }
}
function calculateExitEdge(x, y, z) {
    const edgeThreshold = 0.1; // How close a particle needs to be to the edge to be considered exiting
    let edge = null;

    if (x > window.innerWidth * 0.5 - edgeThreshold) edge = 'right';
    else if (x < -window.innerWidth * 0.5 + edgeThreshold) edge = 'left';
    if (y > window.innerHeight * 0.5 - edgeThreshold) edge = 'top';
    else if (y < -window.innerHeight * 0.5 + edgeThreshold) edge = 'bottom';

    // Add your logic for front and back if needed using z value.
    // ...

    return edge;
}

// This function is a stub, you'll need to replace it with your actual logic
function calculateImportPosition(edge) {
  // Assume particles are entering at the opposite side they exited
  let x, y, z;
  switch(edge) {
    case 'left':
      x = window.innerWidth * 0.5; // Enter from the right
      break;
    case 'right':
      x = -window.innerWidth * 0.5; // Enter from the left
      break;
    case 'top':
      y = -window.innerHeight * 0.5; // Enter from the bottom
      break;
    case 'bottom':
      y = window.innerHeight * 0.5; // Enter from the top
      break;
    // Handle 'front' and 'back' if needed
  }

  // You will need to replace this with your actual positioning logic
  z = 0; // This is just a placeholder

  return [x, y, z];
}


function isWindowPositionAdjacent(thisPos, otherPos, edge) {
  // Replace with your logic that checks if the other window is adjacent based on the edge
  // Here's a simple example that just checks if another window's X position is within 100 pixels
  switch(edge) {
    case 'left':
      return otherPos.x < thisPos.x && Math.abs(thisPos.y - otherPos.y) <= 100;
    case 'right':
      return otherPos.x > thisPos.x && Math.abs(thisPos.y - otherPos.y) <= 100;
    case 'top':
      return otherPos.y < thisPos.y && Math.abs(thisPos.x - otherPos.x) <= 100;
    case 'bottom':
      return otherPos.y > thisPos.y && Math.abs(thisPos.x - otherPos.x) <= 100;
  }
  return false;
}

// This function is a stub, you'll need to replace it with your actual logic
function calculateEntryPositionFromEdge(edge, position) {
  // Calculate the position at which the particle should enter the new window
  // For now, let's just mirror the position
  let newPosition = position.slice(); // Clone the position array
  if(edge === 'left' || edge === 'right') {
    newPosition[0] = -newPosition[0]; // Mirror the x position
  } else if(edge === 'top' || edge === 'bottom') {
    newPosition[1] = -newPosition[1]; // Mirror the y position
  }
  // Handle 'front' and 'back' if needed

  return newPosition;
}
// This should be placed outside and after your function definition to start the interval
setInterval(checkForIncomingParticles, 100); // Check every 100 milliseconds

function checkForIncomingParticles() {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('particleExit')) {
            const particleData = JSON.parse(localStorage.getItem(key));
            const edge = particleData.edge;

            console.log(`Attempting to import particle from edge: ${edge}`); // Log attempt to import

            // If the particle is entering from the edge that's adjacent to another window, import it
            if (isEdgeAdjacentToOtherWindow(edge)) {
                const entryPosition = calculateEntryPositionFromEdge(edge, particleData.position);
                addParticle(entryPosition, particleData.velocity);

                // Clean up the local storage entry after importing
                localStorage.removeItem(key);
                console.log(`Particle imported and local storage entry removed for key: ${key}`); // Log successful import and cleanup
            }
        }
    }
}
animate();