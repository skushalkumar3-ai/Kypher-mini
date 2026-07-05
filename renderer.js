import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = {
  characterHeight: 185,
  bubbleWidth: 290,
  bubbleTextAlign: 'center',
  walkSpeed: 95,
  flySpeed: 180,
  focusMinutes: 25,
  breakMinutes: 5,
  sleepEveryMs: 3 * 60 * 1000,
  sleepForMs: 60 * 1000,
  speechEveryMs: 30 * 1000,
  floorMargin: 18,
  ceilingMargin: 70,
  perchAfterMs: 18 * 1000,
  modelPath: './assets/lego_batman_minifigure.glb'
};

const COZY_MESSAGES = [
  'breathe in... hold it... breathe out...',
  'take a sip of your tea or coffee',
  'you are coding poetry today',
  'a tiny step forward is still progress',
  "relax your shoulders, you're doing great"
];

const HERO_MESSAGES = [
  'night patrol: activated.',
  'small guardian. huge focus.',
  'debugging from the shadows.',
  'productivity signal detected.'
];

const pet = document.querySelector('#pet');
const canvas = document.querySelector('#petCanvas');
const bubble = document.querySelector('#bubble');
const bubbleText = document.querySelector('#bubbleText');
const focusPanel = document.querySelector('#focusPanel');
const focusTime = document.querySelector('#focusTime');
const focusFill = document.querySelector('#focusFill');
const treatLayer = document.querySelector('#treatLayer');
const heartLayer = document.querySelector('#heartLayer');
const zzzLayer = document.querySelector('#zzzLayer');
const debugPanel = document.querySelector('#debugPanel');

document.documentElement.style.setProperty('--character-height', `${CONFIG.characterHeight}px`);
document.documentElement.style.setProperty('--bubble-width', `${CONFIG.bubbleWidth}px`);
document.documentElement.style.setProperty('--bubble-align', CONFIG.bubbleTextAlign);

function showDebug(error) {
  debugPanel.hidden = false;
  debugPanel.textContent = `Kypher Mini renderer error:\n${error?.stack || error?.message || error}`;
}

window.addEventListener('error', (event) => showDebug(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => showDebug(event.reason));

const state = {
  mode: 'explore',
  x: 90,
  y: CONFIG.floorMargin,
  vx: CONFIG.walkSpeed,
  vy: 0,
  targetX: 90,
  targetY: CONFIG.floorMargin,
  drag: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  fallVelocity: 0,
  perch: false,
  heroUntil: 0,
  timerEnd: 0,
  timerTotal: 0,
  bubbleTimeout: 0,
  nextSpeechAt: performance.now() + 3500,
  nextSleepAt: performance.now() + CONFIG.sleepEveryMs,
  nextPerchAt: performance.now() + CONFIG.perchAfterMs,
  nextTargetAt: 0,
  nextSparkAt: 0,
  sleepEndAt: 0,
  lastTick: performance.now()
};

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 1.15, 5);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);
scene.add(new THREE.HemisphereLight(0x9bf5ff, 0x39294f, 2.2));

const rimLight = new THREE.PointLight(0x65ffd6, 3.7, 8);
rimLight.position.set(-2.4, 1.4, 2.2);
scene.add(rimLight);

const modelGroup = new THREE.Group();
const gauntlets = new THREE.Group();
const animatedParts = {
  leftArm: [],
  rightArm: [],
  hands: [],
  cape: [],
  head: []
};
scene.add(modelGroup);
modelGroup.add(gauntlets);

const gauntletMaterial = new THREE.MeshBasicMaterial({
  color: 0x65ffd6,
  transparent: true,
  opacity: 0.78
});
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd66b,
  transparent: true,
  opacity: 0.58,
  side: THREE.DoubleSide
});
const leftGauntlet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), gauntletMaterial);
const rightGauntlet = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), gauntletMaterial);
const leftRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 8, 28), ringMaterial);
const rightRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.014, 8, 28), ringMaterial);
gauntlets.add(leftGauntlet, rightGauntlet, leftRing, rightRing);

new GLTFLoader().load(CONFIG.modelPath, (gltf) => {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y += size.y / 2;
  model.scale.setScalar(2.45 / Math.max(size.y, 0.01));
  model.traverse((child) => {
    const name = child.name.toLowerCase();
    if (name.includes('left') && (name.includes('arm') || name.includes('hand'))) animatedParts.leftArm.push(child);
    if (name.includes('right') && (name.includes('arm') || name.includes('hand'))) animatedParts.rightArm.push(child);
    if (name.includes('hand')) animatedParts.hands.push(child);
    if (name.includes('cape')) animatedParts.cape.push(child);
    if (name.includes('head') || name.includes('helmet') || name.includes('mask')) animatedParts.head.push(child);
    if (child.isMesh) {
      child.castShadow = false;
      child.frustumCulled = false;
    }
  });
  modelGroup.add(model);
}, undefined, () => {
  const fallback = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.8, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.48, metalness: 0.18 })
  );
  fallback.position.y = 0.9;
  modelGroup.add(fallback);
});

function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function petMaxX() {
  return Math.max(18, window.innerWidth - pet.offsetWidth - 16);
}

function petMaxY() {
  return Math.max(CONFIG.floorMargin, window.innerHeight - pet.offsetHeight - CONFIG.ceilingMargin);
}

function bottomY() {
  return CONFIG.floorMargin;
}

function chooseTarget(forceSky = false) {
  state.targetX = 18 + Math.random() * (petMaxX() - 18);
  state.targetY = forceSky || Math.random() > 0.62
    ? bottomY() + Math.random() * Math.max(1, petMaxY() - bottomY())
    : bottomY();
  state.nextTargetAt = performance.now() + 3200 + Math.random() * 4200;
}

function setPetPosition() {
  pet.style.left = `${state.x}px`;
  pet.style.bottom = `${state.y}px`;
  const panelBottom = Math.min(window.innerHeight - 112, state.y + CONFIG.characterHeight + 12);
  bubble.style.left = `${Math.max(12, Math.min(state.x - 52, window.innerWidth - CONFIG.bubbleWidth - 12))}px`;
  bubble.style.bottom = `${panelBottom}px`;
  focusPanel.style.left = `${Math.max(12, Math.min(state.x - 34, window.innerWidth - 250))}px`;
  focusPanel.style.bottom = `${panelBottom}px`;
}

function say(message = COZY_MESSAGES[Math.floor(Math.random() * COZY_MESSAGES.length)], duration = 4600) {
  if (state.mode === 'focus') return;
  clearTimeout(state.bubbleTimeout);
  bubbleText.textContent = message;
  bubble.hidden = false;
  state.bubbleTimeout = setTimeout(() => {
    bubble.hidden = true;
  }, duration);
}

function setMode(mode) {
  state.mode = mode;
  pet.className = mode === 'focus' ? 'focus' : mode === 'sleep' ? 'sleep' : mode === 'perch' ? 'perch' : '';
  focusPanel.hidden = mode !== 'focus';
  bubble.hidden = mode === 'focus' ? true : bubble.hidden;
}

function perchHere() {
  state.perch = true;
  state.targetX = state.x;
  state.targetY = state.y;
  setMode('perch');
  say('perched. watching over the workspace.', 4200);
}

function exploreScreen() {
  state.perch = false;
  setMode('explore');
  chooseTarget(true);
  say('full-screen patrol engaged.', 4200);
}

function heroPose() {
  state.perch = false;
  state.heroUntil = performance.now() + 5200;
  setMode('hero');
  burstSignal();
  say(HERO_MESSAGES[Math.floor(Math.random() * HERO_MESSAGES.length)], 4800);
}

function startTimer(minutes, mode) {
  state.timerTotal = minutes * 60 * 1000;
  state.timerEnd = performance.now() + state.timerTotal;
  state.perch = mode === 'focus';
  setMode(mode === 'focus' ? 'focus' : 'break');
  if (mode === 'break') {
    chooseTarget(true);
    say('break time. let your eyes wander softly.', 5000);
  }
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function dropTreat() {
  const treat = document.createElement('img');
  treat.src = './assets/treat.png';
  treat.className = 'treat';
  const targetX = state.x + pet.offsetWidth * 0.5 - 18;
  const targetY = window.innerHeight - state.y - CONFIG.characterHeight * 0.45;
  let y = -42;
  treat.style.left = `${targetX}px`;
  treatLayer.append(treat);

  const fall = () => {
    y += 8;
    treat.style.transform = `translateY(${y}px) rotate(${y * 2}deg)`;
    if (y < targetY) {
      requestAnimationFrame(fall);
    } else {
      treat.remove();
      burstHearts();
      say('thank you. tiny fuel acquired.', 4200);
    }
  };
  fall();
}

function burstHearts() {
  for (let i = 0; i < 8; i += 1) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '♥';
    heart.style.left = `${state.x + 34 + Math.random() * 76}px`;
    heart.style.bottom = `${state.y + CONFIG.characterHeight - 20 + Math.random() * 28}px`;
    heart.style.fontSize = `${18 + Math.random() * 12}px`;
    heartLayer.append(heart);
    setTimeout(() => heart.remove(), 1400);
  }
}

function burstSignal() {
  for (let i = 0; i < 14; i += 1) {
    const spark = document.createElement('div');
    spark.className = 'signal';
    spark.textContent = i % 3 === 0 ? '◆' : '✦';
    spark.style.left = `${state.x + 40 + Math.random() * 108}px`;
    spark.style.bottom = `${state.y + 52 + Math.random() * 118}px`;
    spark.style.animationDelay = `${Math.random() * 0.22}s`;
    heartLayer.append(spark);
    setTimeout(() => spark.remove(), 1600);
  }
}

function spawnZzz() {
  const zzz = document.createElement('div');
  zzz.className = 'zzz';
  zzz.textContent = 'Zzz';
  zzz.style.left = `${state.x + pet.offsetWidth * 0.62}px`;
  zzz.style.bottom = `${state.y + CONFIG.characterHeight - 12}px`;
  zzzLayer.append(zzz);
  setTimeout(() => zzz.remove(), 2300);
}

function animateParts(now) {
  const t = now * 0.001;
  const walkSwing = state.mode === 'explore' || state.mode === 'break' ? Math.sin(t * 8) * 0.42 : 0;
  const wave = state.mode === 'hero' ? Math.sin(t * 12) * 0.55 + 0.65 : 0;
  const focusBreath = state.mode === 'focus' || state.mode === 'perch' ? Math.sin(t * 2.3) * 0.08 : 0;
  const airborne = state.y > bottomY() + 18;
  const handBob = Math.sin(t * (airborne ? 10 : 7));
  const leftY = state.mode === 'hero' ? 1.78 + Math.sin(t * 14) * 0.16 : 1.03 + handBob * 0.16 + focusBreath;
  const rightY = state.mode === 'hero' ? 1.28 + Math.cos(t * 10) * 0.12 : 1.03 - handBob * 0.16 + focusBreath;
  const spread = airborne ? 1.02 : 0.82;

  gauntlets.visible = true;
  leftGauntlet.position.set(-spread, leftY, 0.08);
  rightGauntlet.position.set(spread, rightY, 0.08);
  leftRing.position.copy(leftGauntlet.position);
  rightRing.position.copy(rightGauntlet.position);
  leftRing.rotation.set(Math.PI / 2, t * 3, t * 2.2);
  rightRing.rotation.set(Math.PI / 2, -t * 3, -t * 2.2);
  const pulse = state.mode === 'hero' ? 1.65 + Math.sin(t * 16) * 0.22 : 1 + Math.sin(t * 8) * 0.12;
  leftGauntlet.scale.setScalar(pulse);
  rightGauntlet.scale.setScalar(pulse);
  leftRing.scale.setScalar(pulse);
  rightRing.scale.setScalar(pulse);

  animatedParts.leftArm.forEach((part) => {
    part.rotation.z = walkSwing + wave;
    part.rotation.x = state.mode === 'focus' ? -0.35 + focusBreath : part.rotation.x * 0.86;
  });
  animatedParts.rightArm.forEach((part) => {
    part.rotation.z = -walkSwing - wave * 0.55;
    part.rotation.x = state.mode === 'focus' ? -0.22 + focusBreath : part.rotation.x * 0.86;
  });
  animatedParts.hands.forEach((part, index) => {
    part.rotation.y = Math.sin(t * 10 + index) * 0.35;
  });
  animatedParts.cape.forEach((part) => {
    part.rotation.x = Math.sin(t * 5) * 0.08 - Math.min(0.28, Math.abs(state.vx) / 700);
  });
  animatedParts.head.forEach((part) => {
    part.rotation.y = Math.sin(t * 1.9) * 0.16;
  });
}

function moveTowardTarget(dt, now) {
  if (state.perch || state.mode === 'focus') return;
  if (now >= state.nextTargetAt || Math.hypot(state.targetX - state.x, state.targetY - state.y) < 24) {
    chooseTarget(state.mode === 'hero' || state.mode === 'break');
  }

  const dx = state.targetX - state.x;
  const dy = state.targetY - state.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = state.targetY > bottomY() + 8 ? CONFIG.flySpeed : CONFIG.walkSpeed;
  state.vx = (dx / distance) * speed;
  state.vy = (dy / distance) * speed;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.x = Math.max(12, Math.min(state.x, petMaxX()));
  state.y = Math.max(bottomY(), Math.min(state.y, petMaxY()));
}

function tick(now) {
  const dt = Math.min(0.04, (now - state.lastTick) / 1000);
  state.lastTick = now;

  if (state.mode === 'focus' || state.mode === 'break') {
    const remaining = state.timerEnd - now;
    if (state.mode === 'focus') {
      focusTime.textContent = formatMs(remaining);
      focusFill.style.width = `${Math.max(0, remaining / state.timerTotal) * 100}%`;
    }
    if (remaining <= 0) {
      const finishedMode = state.mode;
      state.perch = false;
      setMode('explore');
      chooseTarget(true);
      state.nextSleepAt = now + CONFIG.sleepEveryMs;
      say(finishedMode === 'focus' ? 'focus complete. proud of you.' : 'break complete. welcome back.', 5200);
    }
  }

  if (state.heroUntil && now > state.heroUntil) {
    state.heroUntil = 0;
    setMode('explore');
  }

  if (!state.drag) {
    moveTowardTarget(dt, now);
  }

  if (!state.drag && !state.perch && state.y > bottomY() && state.mode !== 'break' && state.mode !== 'hero') {
    state.fallVelocity += 550 * dt;
    state.y = Math.max(bottomY(), state.y - state.fallVelocity * dt);
    if (state.y === bottomY()) state.fallVelocity = 0;
  }

  if (state.mode === 'explore' && CONFIG.speechEveryMs && now >= state.nextSpeechAt) {
    say();
    state.nextSpeechAt = now + CONFIG.speechEveryMs;
  }

  if (state.mode === 'explore' && now >= state.nextPerchAt) {
    perchHere();
    state.nextPerchAt = now + CONFIG.perchAfterMs + Math.random() * 12000;
  }

  if (state.mode === 'explore' && now >= state.nextSleepAt) {
    setMode('sleep');
    state.perch = true;
    state.sleepEndAt = now + CONFIG.sleepForMs;
  }

  if (state.mode === 'sleep') {
    if (Math.floor(now / 900) !== Math.floor((now - 16) / 900)) spawnZzz();
    if (now >= state.sleepEndAt) {
      state.perch = false;
      setMode('explore');
      chooseTarget(true);
      state.nextSleepAt = now + CONFIG.sleepEveryMs;
    }
  }

  if ((state.mode === 'hero' || state.mode === 'break') && now >= state.nextSparkAt) {
    burstSignal();
    state.nextSparkAt = now + 1250;
  }

  const facing = state.vx >= 0 ? 1 : -1;
  pet.style.scale = `${facing} 1`;
  const airborne = state.y > bottomY() + 18;
  modelGroup.rotation.y = Math.sin(now * 0.0018) * 0.18 + (facing < 0 ? -0.2 : 0.2);
  modelGroup.rotation.z = state.mode === 'sleep' ? -0.34 : airborne ? Math.sin(now * 0.004) * 0.18 : Math.sin(now * 0.006) * 0.045;
  modelGroup.position.y = airborne ? Math.sin(now * 0.004) * 0.08 : 0;
  modelGroup.scale.setScalar(state.mode === 'hero' ? 1.08 + Math.sin(now * 0.008) * 0.018 : 1);
  rimLight.intensity = state.mode === 'focus' || state.mode === 'hero' ? 5.8 : 3.7;
  animateParts(now);

  setPetPosition();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  state.drag = true;
  state.perch = false;
  pet.classList.add('dragging');
  state.dragOffsetX = event.clientX - state.x;
  state.dragOffsetY = window.innerHeight - event.clientY - state.y;
  pet.setPointerCapture(event.pointerId);
});

pet.addEventListener('pointermove', (event) => {
  if (!state.drag) return;
  state.x = Math.max(8, Math.min(event.clientX - state.dragOffsetX, petMaxX()));
  state.y = Math.max(bottomY(), Math.min(window.innerHeight - event.clientY - state.dragOffsetY, petMaxY()));
});

pet.addEventListener('pointerup', (event) => {
  state.drag = false;
  state.fallVelocity = 0;
  state.targetX = state.x;
  state.targetY = state.y;
  state.nextTargetAt = performance.now() + 1800;
  pet.classList.remove('dragging');
  pet.releasePointerCapture(event.pointerId);
});

pet.addEventListener('click', () => {
  if (state.mode === 'perch') exploreScreen();
  else say();
});
pet.addEventListener('dblclick', dropTreat);
pet.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.kypher.showMenu();
});

window.kypher.onCommand((command) => {
  if (command === 'focus') startTimer(CONFIG.focusMinutes, 'focus');
  if (command === 'break') startTimer(CONFIG.breakMinutes, 'break');
  if (command === 'perch') perchHere();
  if (command === 'explore') exploreScreen();
  if (command === 'hero') heroPose();
  if (command === 'speech-15') CONFIG.speechEveryMs = 15 * 1000;
  if (command === 'speech-30') CONFIG.speechEveryMs = 30 * 1000;
  if (command === 'speech-60') CONFIG.speechEveryMs = 60 * 1000;
  if (command === 'speech-off') CONFIG.speechEveryMs = 0;
});

window.addEventListener('resize', () => {
  resizeRenderer();
  state.x = Math.min(state.x, petMaxX());
  state.y = Math.min(state.y, petMaxY());
});

window.addEventListener('mousemove', (event) => {
  const rect = pet.getBoundingClientRect();
  const padding = 14;
  const overPet = event.clientX >= rect.left - padding && event.clientX <= rect.right + padding
    && event.clientY >= rect.top - padding && event.clientY <= rect.bottom + padding;
  window.kypher.setIgnoreMouse(!overPet);
});

window.addEventListener('mouseleave', () => {
  window.kypher.setIgnoreMouse(true);
});

resizeRenderer();
chooseTarget(true);
setPetPosition();
say('right-click me for patrol tricks.', 9000);
requestAnimationFrame(tick);
