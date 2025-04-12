// Define room positions based on the actual floorplan image
const roomPositions = {
  Room101: { x: 170, y: 100 },
  Room102: { x: 170, y: 240 },
  Room104: { x: 530, y: 375 },
  Room105: { x: 500, y: 130 },
  Reception: { x: 360, y: 500 }
};

// Define waypoints for hallways and intersections
const waypoints = {
  // Hallway outside Room101
  hall_101: { x: 220, y: 100 },
  
  // Hallway between Room101 and Room105
  hall_mid_top: { x: 320, y: 100 },
  
  // Hallway outside Room105
  hall_105: { x: 450, y: 100 },
  
  // Hallway outside Room102
  hall_102: { x: 220, y: 240 },
  
  // Center vertical hallway
  hall_center_top: { x: 320, y: 240 },
  hall_center_mid: { x: 320, y: 320 },
  hall_center_bottom: { x: 320, y: 420 },
  
  // Hallway outside Room104
  hall_104: { x: 480, y: 375 },
  
  // Bottom hallway
  hall_bottom_left: { x: 220, y: 420 },
  hall_bottom_mid: { x: 360, y: 420 },
  hall_bottom_right: { x: 480, y: 420 },
  
  // Reception entrance
  reception_door: { x: 360, y: 450 }
};

// Define room exits - connections between rooms and waypoints
const roomExits = {
  Room101: ["hall_101"],
  Room102: ["hall_102"],
  Room104: ["hall_104"],
  Room105: ["hall_105"],
  Reception: ["reception_door"]
};

// Define connections between waypoints
const waypointConnections = {
  // Top hallway connections
  hall_101: ["Room101", "hall_mid_top"],
  hall_mid_top: ["hall_101", "hall_105", "hall_center_top"],
  hall_105: ["hall_mid_top", "Room105"],
  
  // Vertical hallway connections
  hall_center_top: ["hall_mid_top", "hall_102", "hall_center_mid"],
  hall_center_mid: ["hall_center_top", "hall_center_bottom"],
  hall_center_bottom: ["hall_center_mid", "hall_bottom_mid"],
  
  // Room102 connection
  hall_102: ["Room102", "hall_center_top"],
  
  // Room104 connection
  hall_104: ["Room104", "hall_bottom_right"],
  
  // Bottom hallway
  hall_bottom_left: ["hall_102", "hall_bottom_mid"],
  hall_bottom_mid: ["hall_bottom_left", "hall_center_bottom", "hall_bottom_right", "reception_door"],
  hall_bottom_right: ["hall_bottom_mid", "hall_104"],
  
  // Reception connection
  reception_door: ["Reception", "hall_bottom_mid"]
};

const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext("2d");
let sourceRoom = "Reception"; // Default starting point

// Load and draw the floor plan image
const image = new Image();
image.src = "assets/floorplan.png"; // Make sure this path is correct

image.onload = () => {
  // Draw the floor plan
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // For debugging - uncomment to see waypoints
  // drawAllWaypoints();
};

// Calculate Euclidean distance between two points
function getDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

// Draw all waypoints for debugging
function drawAllWaypoints() {
  ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
  
  // Draw waypoints
  for (const [id, point] of Object.entries(waypoints)) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw waypoint labels
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    ctx.fillText(id, point.x - 10, point.y - 10);
    ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
  }
  
  // Draw room positions
  ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
  for (const [id, point] of Object.entries(roomPositions)) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Draw connections between waypoints
  ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
  ctx.lineWidth = 1;
  
  for (const [id, connections] of Object.entries(waypointConnections)) {
    const start = waypoints[id] || roomPositions[id];
    if (!start) continue;
    
    for (const connId of connections) {
      const end = waypoints[connId] || roomPositions[connId];
      if (!end) continue;
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }
}

// Text-to-speech function
function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
}

// Voice input for source room
function startVoiceInput() {
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }
  
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    let spokenRoom = transcript.replace(/\s/g, ""); // Remove spaces
    
    // Handle "room" prefix
    if (spokenRoom.toLowerCase().startsWith("room")) {
      spokenRoom = "Room" + spokenRoom.substring(4);
    }
    
    // Check different ways the room might be referenced
    if (roomPositions[spokenRoom]) {
      sourceRoom = spokenRoom;
      speak(`Source set to ${spokenRoom}`);
    } else if (roomPositions["Room" + spokenRoom]) {
      sourceRoom = "Room" + spokenRoom;
      speak(`Source set to Room ${spokenRoom}`);
    } else if (spokenRoom.toLowerCase() === "reception") {
      sourceRoom = "Reception";
      speak("Source set to Reception");
    } else {
      speak("Sorry, room not found");
    }
  };
  
  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    speak("Could not recognize speech. Please try again.");
  };
  
  recognition.start();
}

// Priority queue for A* algorithm
class PriorityQueue {
  constructor() { this.data = []; }
  
  enqueue(element) {
    this.data.push(element);
    this.data.sort((a, b) => a[1] - b[1]);
  }
  
  dequeue() { return this.data.shift(); }
  
  isEmpty() { return this.data.length === 0; }
}

// Find path between two locations (could be waypoints or rooms)
function findPath(start, end) {
  // Track visited nodes to avoid cycles
  let visited = new Set();
  // Track distances from start to each node
  let distances = {};
  // Track the previous node in the optimal path
  let prev = {};
  // Priority queue for exploring nodes
  let pq = new PriorityQueue();
  
  // Initialize all waypoints and rooms with infinite distance
  for (let wp in waypoints) {
    distances[wp] = Infinity;
    prev[wp] = null;
  }
  
  for (let room in roomPositions) {
    distances[room] = Infinity;
    prev[room] = null;
  }
  
  // Set start distance to 0 and add to queue
  distances[start] = 0;
  pq.enqueue([start, 0]);
  
  // Heuristic function for A* (straight-line distance)
  function heuristic(node) {
    const p1 = waypoints[node] || roomPositions[node];
    const p2 = waypoints[end] || roomPositions[end];
    
    if (p1 && p2) {
      return getDistance(p1, p2);
    }
    return 0;
  }
  
  // Main A* loop
  while (!pq.isEmpty()) {
    let [current, dist] = pq.dequeue();
    
    // Skip if already visited
    if (visited.has(current)) continue;
    visited.add(current);
    
    // Found the target
    if (current === end) {
      // Reconstruct path
      let path = [];
      while (current) {
        path.unshift(current);
        current = prev[current];
      }
      return path;
    }
    
    // Get neighbors from appropriate connection list
    let neighbors;
    if (waypointConnections[current]) {
      neighbors = waypointConnections[current];
    } else if (roomExits[current]) {
      neighbors = roomExits[current];
    } else {
      neighbors = [];
    }
    
    // Check each neighbor
    for (let neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      
      // Get coordinates
      let p1 = waypoints[current] || roomPositions[current];
      let p2 = waypoints[neighbor] || roomPositions[neighbor];
      
      if (p1 && p2) {
        // Calculate new distance
        let edgeDistance = getDistance(p1, p2);
        let newDistance = distances[current] + edgeDistance;
        
        // Update if better path found
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          prev[neighbor] = current;
          
          // A* priority includes heuristic
          let priority = newDistance + heuristic(neighbor);
          pq.enqueue([neighbor, priority]);
        }
      }
    }
  }
  
  return []; // No path found
}

// Main function to find path between rooms
function findRoomPath(startRoom, endRoom) {
  // Direct connection if same room
  if (startRoom === endRoom) return [startRoom];
  
  return findPath(startRoom, endRoom);
}

// Draw navigation path between rooms
function drawLineToRoom(destinationRoom) {
  if (!roomPositions[destinationRoom]) {
    speak("Invalid destination room.");
    return;
  }
  
  if (!roomPositions[sourceRoom]) {
    speak("Invalid source room.");
    return;
  }
  
  // Find the path
  const path = findRoomPath(sourceRoom, destinationRoom);
  
  if (path.length === 0) {
    speak("No valid path found.");
    return;
  }
  
  // Clear canvas and redraw floor plan
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // Convert path names to coordinates
  let pathPoints = [];
  for (let i = 0; i < path.length; i++) {
    let point;
    if (roomPositions[path[i]]) {
      point = { ...roomPositions[path[i]], name: path[i] };
    } else if (waypoints[path[i]]) {
      point = { ...waypoints[path[i]], name: path[i] };
    }
    
    if (point) pathPoints.push(point);
  }
  
  // Draw the path
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  
  ctx.strokeStyle = "red";
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // Mark start point
  ctx.beginPath();
  ctx.arc(pathPoints[0].x, pathPoints[0].y, 8, 0, 2 * Math.PI);
  ctx.fillStyle = "green";
  ctx.fill();
  
  // Mark end point
  ctx.beginPath();
  ctx.arc(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y, 8, 0, 2 * Math.PI);
  ctx.fillStyle = "blue";
  ctx.fill();
  
  // Add animated dot along the path
  animatePathTraversal(pathPoints);
  
  speak(`Navigating from ${sourceRoom} to ${destinationRoom}`);
}

// Animate a dot moving along the path
function animatePathTraversal(pathPoints) {
  let step = 0;
  const totalSteps = 90; // More steps for smoother animation
  
  function drawDot() {
    if (step >= totalSteps) return;
    
    // Redraw the path
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Redraw the path
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Mark start and end points
    ctx.beginPath();
    ctx.arc(pathPoints[0].x, pathPoints[0].y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "green";
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();
    
    // Calculate position for animated dot
    const progress = step / totalSteps;
    const segmentCount = pathPoints.length - 1;
    const segmentIndex = Math.min(Math.floor(progress * segmentCount), segmentCount - 1);
    const segmentProgress = (progress * segmentCount) % 1;
    
    const p1 = pathPoints[segmentIndex];
    const p2 = pathPoints[segmentIndex + 1];
    
    const dotX = p1.x + (p2.x - p1.x) * segmentProgress;
    const dotY = p1.y + (p2.y - p1.y) * segmentProgress;
    
    // Draw animated dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "purple";
    ctx.fill();
    
    step++;
    requestAnimationFrame(drawDot);
  }
  
  drawDot();
}

// Scale coordinates to match canvas size
function adjustCoordinatesToCanvas() {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const scaleX = canvasWidth / 600; // Assuming original coordinates are based on 600px width
  const scaleY = canvasHeight / 600; // Assuming original coordinates are based on 600px height
  
  // Scale room positions
  for (const room in roomPositions) {
    roomPositions[room].x = Math.round(roomPositions[room].x * scaleX);
    roomPositions[room].y = Math.round(roomPositions[room].y * scaleY);
  }
  
  // Scale waypoints
  for (const point in waypoints) {
    waypoints[point].x = Math.round(waypoints[point].x * scaleX);
    waypoints[point].y = Math.round(waypoints[point].y * scaleY);
  }
}

// Call this when the page loads
window.addEventListener('load', () => {
  // Uncomment if your canvas size is different from the coordinate system
  // adjustCoordinatesToCanvas();
  
  // Draw the initial view
  if (image.complete) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
});

// QR Scan & Upload
const qrScanner = new Html5QrcodeScanner("qr-reader", {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  supportedScanTypes: [
    Html5QrcodeScanType.SCAN_TYPE_CAMERA,
    Html5QrcodeScanType.SCAN_TYPE_FILE
  ]
});

qrScanner.render((decodedText) => {
  // Handle different possible QR code formats
  let roomName = decodedText;
  
  // Check if it's a valid destination
  if (roomPositions[roomName]) {
    drawLineToRoom(roomName);
  } else if (roomPositions["Room" + roomName]) {
    drawLineToRoom("Room" + roomName);
  } else {
    speak("Invalid room code scanned.");
  }
});