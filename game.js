const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lengthValue = document.getElementById('lengthValue');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');

const WORLD_SIZE = 5200;
const FOOD_COUNT = 380;
const BOT_COUNT = 16;
const SEGMENT_DISTANCE = 8;
const INITIAL_LENGTH = 28;

const state = {
  running: false,
  gameOver: false,
  pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  boosting: false,
  foods: [],
  snakes: [],
  player: null,
  camera: { x: 0, y: 0 },
  time: 0,
};

const mutedPalette = ['#7f8b9d', '#8fa18d', '#8f819f', '#9a8e83', '#6f8f97', '#8f97af'];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function clampToWorld(value) {
  return Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, value));
}

function makeSnake({ x, y, color, isPlayer = false }) {
  const segments = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    segments.push({ x: x - i * SEGMENT_DISTANCE, y });
  }

  return {
    isPlayer,
    color,
    radius: 10,
    speed: 120,
    boostSpeed: 210,
    angle: 0,
    targetAngle: 0,
    segments,
    grow: 0,
    alive: true,
    aiTurnTimer: rand(0.6, 2.5),
    aiTarget: { x: rand(-WORLD_SIZE, WORLD_SIZE), y: rand(-WORLD_SIZE, WORLD_SIZE) },
  };
}

function spawnFood(x = rand(-WORLD_SIZE, WORLD_SIZE), y = rand(-WORLD_SIZE, WORLD_SIZE), amount = 1) {
  for (let i = 0; i < amount; i++) {
    state.foods.push({
      x: clampToWorld(x + rand(-16, 16)),
      y: clampToWorld(y + rand(-16, 16)),
      r: rand(2.2, 5.2),
      color: mutedPalette[(Math.random() * mutedPalette.length) | 0],
      glow: rand(0.2, 0.7),
    });
  }
}

function resetGame() {
  state.foods.length = 0;
  state.snakes.length = 0;

  for (let i = 0; i < FOOD_COUNT; i++) spawnFood();

  state.player = makeSnake({ x: 0, y: 0, color: '#d8dfe8', isPlayer: true });
  state.snakes.push(state.player);

  for (let i = 0; i < BOT_COUNT; i++) {
    state.snakes.push(
      makeSnake({
        x: rand(-WORLD_SIZE * 0.8, WORLD_SIZE * 0.8),
        y: rand(-WORLD_SIZE * 0.8, WORLD_SIZE * 0.8),
        color: mutedPalette[i % mutedPalette.length],
      })
    );
  }

  state.camera.x = state.player.segments[0].x;
  state.camera.y = state.player.segments[0].y;
  state.gameOver = false;
  state.running = true;
  overlay.classList.add('hidden');
}

function setGameOver() {
  state.running = false;
  state.gameOver = true;
  overlayText.textContent = `You crashed at length ${state.player.segments.length}. Press R to restart.`;
  overlay.classList.remove('hidden');
}

function addFoodFromSnake(snake) {
  for (let i = 3; i < snake.segments.length; i += 2) {
    spawnFood(snake.segments[i].x, snake.segments[i].y, 1);
  }
}

function consumeFood(snake) {
  const head = snake.segments[0];
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const pellet = state.foods[i];
    const d = Math.hypot(head.x - pellet.x, head.y - pellet.y);
    if (d < snake.radius + pellet.r + 1) {
      snake.grow += 1.7;
      state.foods.splice(i, 1);
      if (state.foods.length < FOOD_COUNT) spawnFood();
    }
  }
}

function moveSnake(snake, dt) {
  if (!snake.alive) return;
  const head = snake.segments[0];

  if (snake.isPlayer) {
    const mouseWorldX = state.pointer.x - canvas.width / 2 + state.camera.x;
    const mouseWorldY = state.pointer.y - canvas.height / 2 + state.camera.y;
    snake.targetAngle = Math.atan2(mouseWorldY - head.y, mouseWorldX - head.x);
  } else {
    snake.aiTurnTimer -= dt;
    if (snake.aiTurnTimer <= 0) {
      snake.aiTurnTimer = rand(0.7, 2.8);
      snake.aiTarget.x = rand(-WORLD_SIZE, WORLD_SIZE);
      snake.aiTarget.y = rand(-WORLD_SIZE, WORLD_SIZE);
    }

    const nearestFood = state.foods.reduce(
      (best, f) => {
        const d = Math.hypot(head.x - f.x, head.y - f.y);
        return d < best.d ? { d, food: f } : best;
      },
      { d: Infinity, food: null }
    );

    if (nearestFood.food && nearestFood.d < 280) {
      snake.targetAngle = Math.atan2(nearestFood.food.y - head.y, nearestFood.food.x - head.x);
    } else {
      snake.targetAngle = Math.atan2(snake.aiTarget.y - head.y, snake.aiTarget.x - head.x);
    }
  }

  const angleDiff = ((snake.targetAngle - snake.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  snake.angle += angleDiff * Math.min(1, dt * 8.8);

  const boosting = snake.isPlayer ? state.boosting : Math.random() < 0.008;
  const speed = boosting ? snake.boostSpeed : snake.speed;

  head.x = clampToWorld(head.x + Math.cos(snake.angle) * speed * dt);
  head.y = clampToWorld(head.y + Math.sin(snake.angle) * speed * dt);

  for (let i = 1; i < snake.segments.length; i++) {
    const prev = snake.segments[i - 1];
    const seg = snake.segments[i];
    const dx = prev.x - seg.x;
    const dy = prev.y - seg.y;
    const current = Math.hypot(dx, dy) || 0.001;
    const diff = (current - SEGMENT_DISTANCE) / current;
    seg.x += dx * diff;
    seg.y += dy * diff;
  }

  if (snake.grow > 0) {
    const tail = snake.segments[snake.segments.length - 1];
    snake.segments.push({ x: tail.x, y: tail.y });
    snake.grow -= 1;
  }

  if (boosting && snake.segments.length > INITIAL_LENGTH && Math.random() < 0.2) {
    const tail = snake.segments.pop();
    spawnFood(tail.x, tail.y, 1);
  }
}

function detectCollisions() {
  const playerHead = state.player.segments[0];

  if (
    playerHead.x <= -WORLD_SIZE ||
    playerHead.x >= WORLD_SIZE ||
    playerHead.y <= -WORLD_SIZE ||
    playerHead.y >= WORLD_SIZE
  ) {
    addFoodFromSnake(state.player);
    setGameOver();
    return;
  }

  for (const snake of state.snakes) {
    for (let i = snake === state.player ? 9 : 0; i < snake.segments.length; i++) {
      const segment = snake.segments[i];
      if (Math.hypot(playerHead.x - segment.x, playerHead.y - segment.y) < state.player.radius) {
        addFoodFromSnake(state.player);
        setGameOver();
        return;
      }
    }
  }

  for (const snake of state.snakes) {
    if (snake.isPlayer || !snake.alive) continue;

    const head = snake.segments[0];
    for (const other of state.snakes) {
      for (let i = other === snake ? 8 : 0; i < other.segments.length; i++) {
        if (Math.hypot(head.x - other.segments[i].x, head.y - other.segments[i].y) < snake.radius * 0.95) {
          snake.alive = false;
          addFoodFromSnake(snake);
          break;
        }
      }
      if (!snake.alive) break;
    }

    if (!snake.alive) {
      const idx = state.snakes.indexOf(snake);
      if (idx >= 0) {
        state.snakes.splice(idx, 1);
        state.snakes.push(
          makeSnake({
            x: rand(-WORLD_SIZE * 0.8, WORLD_SIZE * 0.8),
            y: rand(-WORLD_SIZE * 0.8, WORLD_SIZE * 0.8),
            color: mutedPalette[(Math.random() * mutedPalette.length) | 0],
          })
        );
      }
    }
  }
}

function updateCamera(dt) {
  const head = state.player.segments[0];
  const smooth = 1 - Math.exp(-dt * 8);
  state.camera.x += (head.x - state.camera.x) * smooth;
  state.camera.y += (head.y - state.camera.y) * smooth;
}

function drawFood() {
  for (const p of state.foods) {
    const sx = p.x - state.camera.x + canvas.width / 2;
    const sy = p.y - state.camera.y + canvas.height / 2;
    if (sx < -30 || sy < -30 || sx > canvas.width + 30 || sy > canvas.height + 30) continue;

    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.55 + p.glow * 0.4;
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSnake(snake) {
  const alpha = snake.isPlayer ? 1 : 0.9;

  for (let i = snake.segments.length - 1; i >= 0; i--) {
    const s = snake.segments[i];
    const sx = s.x - state.camera.x + canvas.width / 2;
    const sy = s.y - state.camera.y + canvas.height / 2;

    if (sx < -40 || sy < -40 || sx > canvas.width + 40 || sy > canvas.height + 40) continue;

    const t = i / snake.segments.length;
    const r = snake.radius * (0.78 + (1 - t) * 0.25);

    ctx.beginPath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = snake.color;
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const head = snake.segments[0];
  const hx = head.x - state.camera.x + canvas.width / 2;
  const hy = head.y - state.camera.y + canvas.height / 2;
  const eyeOffset = snake.radius * 0.36;
  const dirX = Math.cos(snake.angle);
  const dirY = Math.sin(snake.angle);

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5f7fb';
  ctx.beginPath();
  ctx.arc(hx + dirX * 4 - dirY * eyeOffset, hy + dirY * 4 + dirX * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.arc(hx + dirX * 4 + dirY * eyeOffset, hy + dirY * 4 - dirX * eyeOffset, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b1f29';
  ctx.beginPath();
  ctx.arc(hx + dirX * 5 - dirY * eyeOffset, hy + dirY * 5 + dirX * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.arc(hx + dirX * 5 + dirY * eyeOffset, hy + dirY * 5 - dirX * eyeOffset, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawWorldBounds() {
  const left = -WORLD_SIZE - state.camera.x + canvas.width / 2;
  const top = -WORLD_SIZE - state.camera.y + canvas.height / 2;
  const size = WORLD_SIZE * 2;

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 3;
  ctx.strokeRect(left, top, size, size);
}

let lastTime = performance.now();
function tick(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  state.time += dt;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.running) {
    for (const snake of state.snakes) {
      moveSnake(snake, dt);
      consumeFood(snake);
    }

    detectCollisions();
    updateCamera(dt);

    lengthValue.textContent = state.player.segments.length;
  }

  drawWorldBounds();
  drawFood();
  for (const snake of state.snakes) drawSnake(snake);

  requestAnimationFrame(tick);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', (e) => {
  state.pointer.x = e.clientX;
  state.pointer.y = e.clientY;
});
window.addEventListener('mousedown', () => (state.boosting = true));
window.addEventListener('mouseup', () => (state.boosting = false));
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') state.boosting = true;
  if (e.code === 'Enter' && !state.running) resetGame();
  if (e.key.toLowerCase() === 'r') resetGame();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') state.boosting = false;
});

resizeCanvas();
resetGame();
requestAnimationFrame(tick);
