// script.js 
let canvas, ctx;
let player;
let enemies = [];
let bullets = [];
let score = 0;
let lives = 3;
let gameTime = 120;
let shootKey = ' ';
let gameInterval;
let keys = {};
let currentLevel = 1;
let enemyShootInterval;
let enemyFormation = 0;
let playerScores = [];
let currentPlayer = null;
let speedIncreaseCount = 0;
let lastSpeedIncrease = 0;
let eventListenersInitialized = false;
let speedLevel = 1;

const DIAGONAL_SPEED_FACTOR = 0.707;
const BULLET_ANGLE_VARIATION = Math.PI / 6;
const TILT_ANGLE = Math.PI / 12; // 15 degrees

const KEY_DISPLAY_NAMES = {
  ' ': 'Space',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'Enter': 'Enter',
  'Control': 'Ctrl',
  'Shift': 'Shift',
  'Alt': 'Alt'
};

function getReadableKeyName(key) {
  if (key in KEY_DISPLAY_NAMES) {
    return KEY_DISPLAY_NAMES[key];
  }
  return key.length === 1 ? key.toUpperCase() : key;
}

// Test user
const TEST_USER = {
  username: 'p',
  password: 'testuser'
};

// Initialize users
let users = JSON.parse(localStorage.getItem('users')) || {
  'p': {
    password: 'testuser',
    first: 'Test',
    last: 'User',
    email: 'test@example.com'
  }
};
localStorage.setItem('users', JSON.stringify(users));

// Load game images
const playerImg = new Image();
const enemyImg = new Image();
const playerBulletImg = new Image();
const enemyBulletImg = new Image();
const explosionImg = new Image();
const backgroundImg = new Image();
const enemyImages = {
  0: new Image(),
  1: new Image(),
  2: new Image(),
  3: new Image()
};
const playerImages = {
  blue: new Image(),
  green: new Image(),
  orange: new Image(),
  red: new Image()
};

// Set image sources
enemyImages[0].src = 'assets/images/enemy4.png';
enemyImages[1].src = 'assets/images/enemy3.png';
enemyImages[2].src = 'assets/images/enemy2.png';
enemyImages[3].src = 'assets/images/enemy1.png';
playerImages.blue.src = 'assets/images/player_blue.png';
playerImages.green.src = 'assets/images/player_green.png';
playerImages.orange.src = 'assets/images/player_orange.png';
playerImages.red.src = 'assets/images/player_red.png';
enemyImg.src = 'assets/images/enemy.png';
playerBulletImg.src = 'assets/images/bullet_player.png';
enemyBulletImg.src = 'assets/images/bullet_enemy.png';
explosionImg.src = 'assets/images/explosion.png';
backgroundImg.src = 'assets/images/background_game.jpg';

let playerColor = 'blue';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  currentPlayer = localStorage.getItem('currentUser');
  if (currentPlayer) {
    updateWelcomeScreen();
    updateLogoutButton();
  }

  // Initialize event listeners
  initializeEventListeners();
  initializeFormHandlers();
  initializeDateSelectors();
});

// Event Listeners Setup
function initializeEventListeners() {
  if (eventListenersInitialized) return;
  
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  
  // Add About button click handler
  const aboutBtn = document.createElement('button');
  aboutBtn.textContent = 'About';
  aboutBtn.onclick = showAboutModal;
  aboutBtn.className = 'about-btn';
  
  // Add the button to the navigation area
  const nav = document.querySelector('.nav-buttons') || document.body;
  nav.appendChild(aboutBtn);
  
  eventListenersInitialized = true;
}

function initializeFormHandlers() {
  // Login form handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register form handler
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Config form handler
  const configForm = document.querySelector("#configForm");
  if (configForm) {
    configForm.addEventListener("input", saveConfig);
    
    // Add event listeners for color radio buttons
    const colorRadios = document.querySelectorAll('input[name="color"]');
    colorRadios.forEach(radio => {
      radio.addEventListener('change', updateColorPreview);
    });

    // Load saved configuration
    loadSavedConfig();
  }

  // Add key input handler
  const shootKeyInput = document.querySelector("input[name='shootKey']");
  if (shootKeyInput) {
    shootKeyInput.addEventListener('keydown', function(e) {
      e.preventDefault();
      const key = e.key;
      this.value = getReadableKeyName(key);
      saveConfig();
    });

    // Prevent default keyboard behavior when focusing the input
    shootKeyInput.addEventListener('keypress', function(e) {
      e.preventDefault();
    });
  }
}

// Form Handlers
function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const username = form.username.value;
  const password = form.password.value;

  if (users[username] && users[username].password === password) {
    currentPlayer = username;
    localStorage.setItem('currentUser', username);
    
    const savedScores = localStorage.getItem(`scores_${currentPlayer}`);
    playerScores = savedScores ? JSON.parse(savedScores) : [];
    
    alert('Login successful!');
    updateWelcomeScreen();
    updateLogoutButton();
    showScreen('welcome');
    form.reset();
  } else {
    alert('Invalid username or password');
    form.reset();
  }
}

function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const username = form.username.value;
  const password = form.password.value;
  const confirm = form.confirm.value;
  const first = form.first.value;
  const last = form.last.value;
  const email = form.email.value;

  if (!/^[A-Za-z]+$/.test(first) || !/^[A-Za-z]+$/.test(last)) {
    alert('Names cannot contain numbers.');
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
    alert('Password must be at least 8 characters and contain letters and numbers.');
    return;
  }

  if (password !== confirm) {
    alert('Passwords do not match.');
    return;
  }

  if (!username || !email) {
    alert('All fields are required.');
    return;
  }

  if (users[username]) {
    alert('Username already exists.');
    return;
  }

  users[username] = { password, first, last, email };
  localStorage.setItem('users', JSON.stringify(users));
  alert('Registered successfully!');
  showScreen('login');
}

// UI Update Functions
function updateLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  if (currentPlayer) {
    logoutBtn.style.display = 'inline-block';
    leaderboardBtn.style.display = 'inline-block';
  } else {
    logoutBtn.style.display = 'none';
    leaderboardBtn.style.display = 'none';
  }
}

function updateWelcomeScreen() {
  const welcomeDiv = document.getElementById('welcome');
  const existingButtons = welcomeDiv.querySelectorAll('.start-game-btn');
  existingButtons.forEach(button => button.remove());
  
  if (currentPlayer) {
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.onclick = () => showScreen('config');
    startButton.className = 'start-game-btn';
    welcomeDiv.appendChild(startButton);
  }
}

// Navigation Functions
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(div => div.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  
  if (id === 'welcome' && currentPlayer) {
    updateWelcomeScreen();
  }
  
  if (id === 'leaderboard') {
    loadLeaderboard();
  }
}

function logout() {
  currentPlayer = null;
  localStorage.removeItem('currentUser');
  updateWelcomeScreen();
  updateLogoutButton();
  showScreen('welcome');
}

// Configuration Functions
function initializeDateSelectors() {
  const yearSelect = document.querySelector("select[name='year']");
  const monthSelect = document.querySelector("select[name='month']");
  const daySelect = document.querySelector("select[name='day']");

  if (!yearSelect || !monthSelect || !daySelect) return;

  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1900; y--) {
    yearSelect.add(new Option(y, y));
  }

  for (let m = 1; m <= 12; m++) {
    monthSelect.add(new Option(m, m));
  }

  function updateDays() {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const daysInMonth = new Date(year, month, 0).getDate();
    daySelect.innerHTML = '';
    for (let d = 1; d <= daysInMonth; d++) {
      daySelect.add(new Option(d, d));
    }
  }

  yearSelect.addEventListener('change', updateDays);
  monthSelect.addEventListener('change', updateDays);
  updateDays();
}

function updateColorPreview() {
  const selectedColor = document.querySelector('input[name="color"]:checked');
  if (selectedColor) {
    saveConfig();
  }
}

function saveConfig() {
  const configForm = document.querySelector("#configForm");
  const shootKeyInput = configForm.querySelector("input[name='shootKey']");
  const duration = parseInt(configForm.querySelector("input[name='duration']").value);
  const color = configForm.querySelector("input[name='color']:checked").value;

  // Update the input display with readable name
  const readableKeyName = getReadableKeyName(shootKeyInput.value);
  shootKeyInput.value = readableKeyName;

  sessionStorage.setItem("gameConfig", JSON.stringify({ 
    shootKey: shootKeyInput.value === 'Space' ? ' ' : shootKeyInput.value, 
    duration, 
    color 
  }));
}

function loadSavedConfig() {
  const configForm = document.querySelector("#configForm");
  const savedConfig = sessionStorage.getItem("gameConfig");
  if (savedConfig && configForm) {
    const config = JSON.parse(savedConfig);
    
    if (config.shootKey) {
      const shootKeyInput = configForm.querySelector("input[name='shootKey']");
      shootKeyInput.value = getReadableKeyName(config.shootKey);
    }
    
    if (config.duration) {
      configForm.querySelector("input[name='duration']").value = config.duration;
    }
    
    if (config.color) {
      const colorRadio = configForm.querySelector(`input[name="color"][value="${config.color}"]`);
      if (colorRadio) {
        colorRadio.checked = true;
      }
    }
  }
}

// Color Utility Functions
function getColorNameFromHex(hexColor) {
  const colorMap = {
    '#4a4aff': 'blue',
    '#4aff4a': 'green',
    '#ffa500': 'orange',
    '#ff4a4a': 'red'
  };
  
  let closestColor = 'blue';
  let minDifference = Number.MAX_VALUE;
  
  for (const [hex, name] of Object.entries(colorMap)) {
    const difference = colorDifference(hexColor, hex);
    if (difference < minDifference) {
      minDifference = difference;
      closestColor = name;
    }
  }
  
  return closestColor;
}

function colorDifference(color1, color2) {
  const r1 = parseInt(color1.substr(1, 2), 16);
  const g1 = parseInt(color1.substr(3, 2), 16);
  const b1 = parseInt(color1.substr(5, 2), 16);
  
  const r2 = parseInt(color2.substr(1, 2), 16);
  const g2 = parseInt(color2.substr(3, 2), 16);
  const b2 = parseInt(color2.substr(5, 2), 16);
  
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

// Game Control Functions
function handleKeyDown(e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
    keys[e.key] = true;
  }
}

function handleKeyUp(e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
    keys[e.key] = false;
  }
}

// Game State Functions
function startGame() {
  const config = JSON.parse(sessionStorage.getItem("gameConfig"));
  shootKey = config?.shootKey || " ";
  gameTime = (config?.duration || 2) * 60;
  speedIncreaseCount = 0;
  lastSpeedIncrease = Date.now();
  speedLevel = 1;
  score = 0;
  lives = 3;
  
  if (config && config.color) {
    playerColor = getColorNameFromHex(config.color);
  }
  
  currentPlayer = localStorage.getItem('currentUser');
  
  if (currentPlayer) {
    const savedScores = localStorage.getItem(`scores_${currentPlayer}`);
    playerScores = savedScores ? JSON.parse(savedScores) : [];
  } else {
    playerScores = [];
  }

  showScreen("game");
  
  document.getElementById("game-start").play();
  
  setTimeout(() => {
    document.getElementById("bg-music").play();
  }, 1000);

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  const bottomLimit = canvas.height * 0.6;
  const playerTerritoryHeight = canvas.height - bottomLimit;
  
  const randomX = Math.floor(Math.random() * (canvas.width - 50));
  const randomY = Math.floor(Math.random() * playerTerritoryHeight) + bottomLimit;
  
  player = {
    x: randomX,
    y: randomY,
    width: 50,
    height: 50,
    speed: 5,
    lastShot: 0,
    invincible: false,
    color: playerColor,
    tiltAngle: 0,
    targetTiltAngle: 0
  };

  // Initialize enemies once
  enemies = [];
  createRectangleFormation();
  initializeEnemies();
  
  initializeEventListeners();
  gameInterval = setInterval(updateGame, 1000 / 60);
  setInterval(() => gameTime--, 1000);
  startEnemyShooting();
}

function initializeEnemies() {
  enemies.forEach(enemy => {
    enemy.alive = true;
    enemy.explosionFrame = 0;
    enemy.lastShot = 0;
    enemy.shootDelay = 2000 + Math.random() * 1000;
    enemy.baseSpeed = 1;
    enemy.speed = enemy.baseSpeed;
    enemy.direction = 1;
    enemy.verticalDirection = 1;
    enemy.tiltAngle = 0;
    enemy.targetTiltAngle = Math.atan2(enemy.direction, enemy.verticalDirection);
  });
}

function createRectangleFormation() {
  const rows = 4;
  const cols = 5;
  const spacing = 80;
  const startX = (canvas.width - (cols * spacing)) / 2;
  const startY = 60;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        x: startX + c * spacing,
        y: startY + r * 60,
        width: 40,
        height: 40,
        row: r,
        direction: 1,
        verticalDirection: 1,
        speed: 1,
        tiltAngle: 0,
        targetTiltAngle: 0
      });
    }
  }
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(enemyShootInterval);
  document.getElementById("bg-music").pause();
  
  document.getElementById("game-over").play();
  
  if (currentPlayer) {
    updateLeaderboard(score, currentLevel, getEndGameMessage());
  }
  
  showScreen("gameOver");
  
  document.getElementById("gameOverMessage").textContent = 
    `${getEndGameMessage()} Final Score: ${score} (Level ${currentLevel})`;
  
  displayScoreTable();
}

function startNewGame() {
  score = 0;
  lives = 3;
  currentLevel = 1;
  showScreen('config');
}

// Game Logic Functions
function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

  document.getElementById("timer").textContent = "Time: " + gameTime;
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("lives").textContent = "Lives: " + lives;

  movePlayer();
  moveEnemies();
  drawPlayer();
  updateBullets();
  drawEnemies();

  // End game if player loses all lives, time runs out, or all enemies are destroyed
  if (lives <= 0 || gameTime <= 0 || enemies.every(e => !e.alive)) {
    endGame();
  }
}

// Game Movement Functions
function movePlayer() {
  let dx = 0;
  let dy = 0;
  
  if (keys["ArrowLeft"]) dx -= 1;
  if (keys["ArrowRight"]) dx += 1;
  if (keys["ArrowUp"]) dy -= 1;
  if (keys["ArrowDown"]) dy += 1;
  
  if (dx !== 0 && dy !== 0) {
    dx *= DIAGONAL_SPEED_FACTOR;
    dy *= DIAGONAL_SPEED_FACTOR;
  }
  
  player.x += dx * player.speed;
  player.y += dy * player.speed;
  
  // New tilt angle calculation that prevents 180-degree flips
  if (dx !== 0) {
    // Only tilt based on left/right movement
    player.targetTiltAngle = Math.atan2(dx, 0);
  } else {
    // Return to upright position when only moving up/down or not moving
    player.targetTiltAngle = 0;
  }
  
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  
  const bottomLimit = canvas.height * 0.6;
  player.y = Math.max(bottomLimit, Math.min(canvas.height - player.height, player.y));
  
  if (player.tiltAngle !== player.targetTiltAngle) {
    const tiltDiff = player.targetTiltAngle - player.tiltAngle;
    player.tiltAngle += tiltDiff * 0.2;
  }
  
  if (keys[shootKey]) shoot();
}

function moveEnemies() {
  let reachedEdge = false;
  let reachedTopBottom = false;
  
  enemies.forEach(enemy => {
    if (enemy.alive) {
      if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
        reachedEdge = true;
      }
      if (enemy.y <= 20 || enemy.y + enemy.height >= canvas.height * 0.5) {
        reachedTopBottom = true;
      }
    }
  });
  
  if (reachedEdge || reachedTopBottom) {
    enemies.forEach(enemy => {
      if (enemy.alive) {
        if (reachedEdge) {
          enemy.direction *= -1;
        }
        if (reachedTopBottom) {
          enemy.verticalDirection *= -1;
        }
        
        const angle = Math.atan2(enemy.direction, enemy.verticalDirection);
        enemy.targetTiltAngle = angle;
      }
    });
  }
  
  enemies.forEach(enemy => {
    if (enemy.alive) {
      const moveX = enemy.speed * enemy.direction * DIAGONAL_SPEED_FACTOR;
      const moveY = enemy.speed * enemy.verticalDirection * DIAGONAL_SPEED_FACTOR;
      
      enemy.x += moveX;
      enemy.y += moveY;
      
      if (enemy.x < 0) {
        enemy.x = 0;
      } else if (enemy.x + enemy.width > canvas.width) {
        enemy.x = canvas.width - enemy.width;
      }
      
      if (enemy.y < 20) {
        enemy.y = 20;
      } else if (enemy.y + enemy.height > canvas.height * 0.5) {
        enemy.y = canvas.height * 0.5 - enemy.height;
      }
      
      if (enemy.tiltAngle !== enemy.targetTiltAngle) {
        const tiltDiff = enemy.targetTiltAngle - enemy.tiltAngle;
        enemy.tiltAngle += tiltDiff * 0.2;
      }
    }
  });
}

function shoot() {
  const now = Date.now();
  if (now - player.lastShot > 300) {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    // Calculate shooting angle based on left/right keys
    let shootAngle = -Math.PI/2; // Default upward
    if (keys["ArrowLeft"]) {
      shootAngle = -Math.PI * 3/4; // 45 degrees left
    } else if (keys["ArrowRight"]) {
      shootAngle = -Math.PI/4; // 45 degrees right
    }
    
    // Calculate bullet position and direction
    const laserX = centerX - 5;
    const laserY = centerY - player.height / 2;
    
    // Use angle to determine bullet direction
    const bulletSpeed = 7;
    const laserDx = Math.cos(shootAngle) * bulletSpeed;
    const laserDy = Math.sin(shootAngle) * bulletSpeed;
    
    bullets.push({
      x: laserX,
      y: laserY,
      dx: laserDx,
      dy: laserDy,
      isPlayer: true
    });
    
    document.getElementById("shoot-sound").play();
    player.lastShot = now;
  }
}

function startEnemyShooting() {
  if (enemyShootInterval) {
    clearInterval(enemyShootInterval);
  }
  
  const baseInterval = 1000;
  const levelReduction = Math.min(currentLevel * 100, 800);
  const shootInterval = baseInterval - levelReduction;
  
  enemyShootInterval = setInterval(() => {
    if (enemies.length > 0) {
      const shootingEnemies = enemies.filter(e => e.alive && Date.now() - e.lastShot > e.shootDelay);
      
      if (shootingEnemies.length > 0) {
        const shooter = shootingEnemies[Math.floor(Math.random() * shootingEnemies.length)];
        shootEnemyBullet(shooter);
        shooter.lastShot = Date.now();
        document.getElementById("enemy-shoot").play();
      }
    }
  }, shootInterval);
}

function shootEnemyBullet(enemy) {
  const angle = (Math.random() - 0.5) * BULLET_ANGLE_VARIATION;
  
  const dx = Math.sin(angle);
  const dy = Math.cos(angle);
  
  const baseBulletSpeed = 3 + (currentLevel * 0.5);
  const bulletSpeed = baseBulletSpeed * speedLevel;
  
  bullets.push({
    x: enemy.x + enemy.width / 2 - 5,
    y: enemy.y + enemy.height,
    dx: dx * bulletSpeed,
    dy: dy * bulletSpeed,
    isPlayer: false
  });
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx;
    b.y += b.dy;
    
    return b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height;
  });
  
  bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x + 5, b.y + 10);
    
    if (b.isPlayer) {
      ctx.rotate(Math.atan2(b.dx, b.dy));
    } else {
      ctx.rotate(Math.atan2(b.dx, b.dy));
    }
    
    ctx.drawImage(b.isPlayer ? playerBulletImg : enemyBulletImg, -5, -10, 10, 20);
    ctx.restore();
    
    if (!b.isPlayer && !player.invincible) {
      if (b.x > player.x && b.x < player.x + player.width &&
          b.y > player.y && b.y < player.y + player.height) {
        playerHit();
      }
    }
    
    if (b.isPlayer) {
      enemies.forEach(e => {
        if (e.alive && b.x > e.x && b.x < e.x + e.width && b.y > e.y && b.y < e.y + e.height) {
          e.alive = false;
          e.explosionFrame = 1;
          
          const rowPoints = [20, 15, 10, 5];
          score += rowPoints[e.row] * currentLevel;
          
          document.getElementById("hit-enemy").play();
        }
      });
    }
  });
}

function drawPlayer() {
  if (!player.invincible || Math.floor(Date.now() / 100) % 2) {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.tiltAngle);
    
    const currentPlayerImg = playerImages[player.color] || playerImages.blue;
    ctx.drawImage(currentPlayerImg, -player.width / 2, -player.height / 2, player.width, player.height);
    
    ctx.restore();
  }
}

function drawEnemies() {
  enemies.forEach(e => {
    if (e.alive) {
      ctx.save();
      ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
      ctx.rotate(e.tiltAngle);
      
      const enemyImage = enemyImages[e.row] || enemyImg;
      ctx.drawImage(enemyImage, -e.width / 2, -e.height / 2, e.width, e.height);
      
      ctx.restore();
    } else if (e.explosionFrame > 0) {
      const frameWidth = explosionImg.width / 5;
      ctx.drawImage(
        explosionImg,
        frameWidth * (e.explosionFrame - 1), 0, frameWidth, explosionImg.height,
        e.x - 10, e.y - 10, e.width + 20, e.height + 20
      );
      e.explosionFrame++;
      if (e.explosionFrame > 5) e.explosionFrame = 0;
    }
  });
}

function playerHit() {
  lives--;
  player.invincible = true;
  document.getElementById("hit-player").play();
  
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - player.height - 10;
  
  setTimeout(() => {
    player.invincible = false;
  }, 2000);
}

function getEndGameMessage() {
  if (enemies.every(e => !e.alive)) {
    return "Champion!";

  } else if (score < 100){
      return 'You can do better';
  }
  return "You Lost!";
}

// Leaderboard Functions
function loadLeaderboard() {
  currentPlayer = localStorage.getItem('currentUser');
  
  if (!currentPlayer) {
    const scoreTableElements = document.querySelectorAll("#scoreTable");
    scoreTableElements.forEach(element => {
      element.innerHTML = "<p>Please log in to view scores.</p>";
    });
    return;
  }
  
  const savedScores = localStorage.getItem(`scores_${currentPlayer}`);
  playerScores = savedScores ? JSON.parse(savedScores) : [];
  
  displayScoreTable();
}

function displayScoreTable() {
  const scoreTableElements = document.querySelectorAll("#scoreTable");
  
  if (!currentPlayer) {
    scoreTableElements.forEach(element => {
      element.innerHTML = "<p style='text-align: center;'>Please log in to view scores.</p>";
    });
    return;
  }
  
  const savedScores = localStorage.getItem(`scores_${currentPlayer}`);
  const scores = savedScores ? JSON.parse(savedScores) : [];
  
  if (scores.length === 0) {
    scoreTableElements.forEach(element => {
      element.innerHTML = "<p style='text-align: center;'>No previous scores available.</p>";
    });
    return;
  }
  
  scoreTableElements.forEach(scoreTableElement => {
    if (!scoreTableElement.querySelector('table')) {
      scoreTableElement.innerHTML = `
        <h3 style='text-align: center;'>Top Scores</h3>
        <table class="score-table" style='margin: 0 auto;'>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Score</th>
              <th>Level</th>
              <th>Date</th>
              <th>Time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
        <div style='text-align: center; margin-top: 15px;'>
          <p>Keep playing to climb the ranks!</p>
          <button onclick="clearLeaderboard()" class="clear-leaderboard-btn">Clear Leaderboard</button>
        </div>
      `;
    }
    
    const tbody = scoreTableElement.querySelector('tbody');
    tbody.innerHTML = '';
    
    scores.forEach((score, index) => {
      const isLatest = index === scores.length - 1;
      const rowClass = isLatest ? 'latest-score' : '';
      
      const row = document.createElement('tr');
      row.className = rowClass;
      row.style.textAlign = 'center';
      
      // Add result message styling based on the message type
      let messageStyle = '';
      if (score.message === 'Champion!') {
        messageStyle = 'color: gold; font-weight: bold;';
      } else if (score.message === 'Winner!') {
        messageStyle = 'color: green; font-weight: bold;';
      } else if (score.message === 'You Lost!') {
        messageStyle = 'color: red;';
      }
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${score.score}</td>
        <td>${score.level}</td>
        <td>${score.date}</td>
        <td>${score.time}</td>
        <td style="${messageStyle}">${score.message}</td>
      `;
      
      tbody.appendChild(row);
    });
  });
}

function updateLeaderboard(finalScore, finalLevel, result) {
  if (!currentPlayer) return;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  
  const newScore = {
    score: finalScore,
    level: finalLevel,
    date: dateStr,
    time: timeStr,
    message: result // Store the result message
  };
  
  let scores = JSON.parse(localStorage.getItem(`scores_${currentPlayer}`) || '[]');
  scores.push(newScore);
  
  // Sort scores by score value in descending order
  scores.sort((a, b) => b.score - a.score);
  
  // Keep only top 10 scores
  if (scores.length > 10) {
    scores = scores.slice(0, 10);
  }
  
  localStorage.setItem(`scores_${currentPlayer}`, JSON.stringify(scores));
  displayScoreTable();
}

function clearLeaderboard() {
  if (!currentPlayer) return;
  
  localStorage.removeItem(`scores_${currentPlayer}`);
  displayScoreTable();
}

// About Modal Functions
function showAboutModal() {
  const modal = document.getElementById('aboutModal');
  modal.style.display = 'block';
  
  // Add event listeners for closing the modal
  const closeBtn = modal.querySelector('.close');
  
  function closeModal() {
    modal.style.display = 'none';
    document.removeEventListener('keydown', handleEscKey);
    modal.removeEventListener('click', handleOutsideClick);
  }
  
  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
  
  function handleOutsideClick(e) {
    if (e.target === modal) {
      closeModal();
    }
  }
  
  // Close button click
  closeBtn.onclick = closeModal;
  
  // ESC key press
  document.addEventListener('keydown', handleEscKey);
  
  // Click outside modal
  modal.addEventListener('click', handleOutsideClick);
} 