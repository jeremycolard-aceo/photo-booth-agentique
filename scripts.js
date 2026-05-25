// ════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════
const API_URL  = 'https://script.google.com/macros/s/AKfycbz8HfEmA9QsfGTiRvr6lfDP-FkpOSujcEdmqT889IeDq_XCe3wDDhxmzWTkWGJGN9UW/exec';
const SECRET   = 'ton-uuid-secret';
const LOGO_URL = 'https://raw.githubusercontent.com/jeremycolard-aceo/photo-booth-agentique/main/logo-aceo.png';
const IDLE_TIMEOUT = 120;

// ════════════════════════════════════════
//  ARCHETYPES & PROMPT ENGINEERING
// ════════════════════════════════════════
const ARCHETYPES = {
  'security-sentinel': { 
    label: 'Security Sentinel', 
    emoji: '🛡️', 
    videoSrc: 'https://res.cloudinary.com/dayss50y9/video/upload/v1779697682/SENTINELLE_flwkop.mp4',              
    scene: `Holding a luminous shield engraved with cryptographic runes (hash symbols, key patterns), wearing armor made of stylized hexagonal locks in Google Cloud blue and green, with vault doors and golden keys floating in the background. Dramatic backlit lighting.` 
  },
  'ai-sorcerer': { 
    label: 'AI Sorcerer',       
    emoji: '🧙', 
    videoSrc: 'https://res.cloudinary.com/dayss50y9/video/upload/v1779697681/de_m%C3%AAme_avec_cette_image_a8uegn.mp4', 
    scene: `Surrounded by floating glowing orbs representing AI agents, hands radiating soft neural network patterns of light, wearing robes embroidered with Gemini-inspired geometric motifs. Wisps of stylized code circle around them like magical energy. Mystical aurora-like background.` 
  },
  'cloud-architect': { 
    label: 'Cloud Architect',   
    emoji: '🏗️', 
    videoSrc: 'https://res.cloudinary.com/dayss50y9/video/upload/v1779697141/CLOUDARCHITECT_q22kix.mp4',          
    scene: `Standing on a floating platform of stylized clouds, holding luminous architectural blueprints with Google Cloud iconography (kubernetes pods, service meshes, network nodes), wearing a tech-forward cape with subtle circuit patterns. Geometric towers made of clouds rise in the background.` 
  },
  'data-wrangler': { 
    label: 'Data Wrangler',     
    emoji: '🗄️', 
    videoSrc: 'https://res.cloudinary.com/dayss50y9/video/upload/v1779697141/DATAWRANGLER_jvhosa.mp4',              
    scene: `Wearing a flowing cape made of cascading data streams in blue and green, holding a glowing tablet projecting BigQuery-like schemas and SQL queries into the air, floating data particles in Google Cloud colors swirling around them. Subtle hexagonal patterns of data nodes in the background.` 
  }
};

function buildPrompt(key) {
  const arch = ARCHETYPES[key];
  return `A heroic stylized 3D illustration portrait based on the reference photo.
CRITICAL: Preserve the exact facial features, skin tone, hair, and ethnicity of the person(s) in the reference image. The face(s) must remain clearly recognizable.
COMPOSITION: The subject(s) must be perfectly centered in the frame. Maintain a well-balanced composition, showing the characters clearly from the chest or waist up.
MULTIPLE SUBJECTS: If there are multiple people in the reference photo, you MUST generate the exact same number of characters. Apply the archetype theme, outfits, and magical elements to ALL characters present, ensuring they are posing together harmoniously in the center of the image.
SETTING & THEME: ${arch.scene}`;
}

// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
let selectedArch = null, userName = '', userEmail = '';
let camStream = null, capturedB64 = null, resultImage = null;
let currentFileId = null;
let idleInterval = null, idleSeconds = 0, countdownInt = null, loadingMsgInterval = null;
let genProgressInterval = null;

// ════════════════════════════════════════
//  AUDIO ENGINE (Web Audio synthétique)
// ════════════════════════════════════════
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function resumeAudio() { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }

function playSynthHover() {
  try {
    const ctx = getAudio(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);
    osc.type = 'sine'; gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
}
function playSynthClick() {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator(); const gainO = ctx.createGain();
    osc.connect(gainO); gainO.connect(ctx.destination);
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
    osc.type = 'square'; gainO.gain.setValueAtTime(0.2, ctx.currentTime);
    gainO.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}
function playSynthShutter() {
  try {
    const ctx = getAudio();
    [0, 0.02, 0.04].forEach((t, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 400 - i*80; osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.05);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.06);
    });
  } catch(e) {}
}
function playSynthReveal() {
  try {
    const ctx = getAudio();
    [220, 277, 330, 415, 523, 659, 830, 1046].forEach((f, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = f; osc.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.65);
    });
  } catch(e) {}
}

let ambientPlaying = false;
function startAmbient() {
  const el = document.getElementById('snd-ambient');
  el.src = './musique.mp3'; el.volume = 0;
  el.play().then(() => {
    let v = 0;
    const fad = setInterval(() => {
      v = Math.min(v + 0.01, 0.28); el.volume = v;
      if (v >= 0.28) clearInterval(fad);
    }, 80);
    ambientPlaying = true;
  }).catch(() => { startSynthAmbient(); });
}
function startSynthAmbient() {
  try {
    const ctx = getAudio(); const aGain = ctx.createGain(); aGain.gain.value = 0;
    aGain.connect(ctx.destination);
    function makeLayer(freq, type, vol, vibRate) {
      const osc = ctx.createOscillator(); const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain(); lfo.frequency.value = vibRate;
      lfoGain.gain.value = freq * 0.003; lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      const g = ctx.createGain(); g.gain.value = vol;
      osc.type = type; osc.frequency.value = freq;
      osc.connect(g); g.connect(aGain); osc.start(); lfo.start();
    }
    makeLayer(110, 'sine', 0.1, 0.13); makeLayer(165, 'triangle', 0.05, 0.23);
    let v = 0;
    const fad = setInterval(() => {
      v = Math.min(v + 0.002, 0.08); aGain.gain.value = v;
      if (v >= 0.08) clearInterval(fad);
    }, 80);
    ambientPlaying = true;
  } catch(e) {}
}

// ════════════════════════════════════════
//  SONS hover/click sur les boutons
// ════════════════════════════════════════
function attachSounds() {
  document.querySelectorAll('.arch-panel, .btn-action, .btn-validate, .btn-shutter, #btn-home, .btn-action-ghost, .btn-action-primary').forEach(el => {
    el.addEventListener('mouseenter', () => { resumeAudio(); playSynthHover(); });
  });
  document.querySelectorAll('.btn-action, .btn-validate, #btn-home').forEach(el => {
    el.addEventListener('click', () => { resumeAudio(); playSynthClick(); });
  });
}

// ════════════════════════════════════════
//  VEILLE & NAVIGATION
// ════════════════════════════════════════
document.getElementById('screen-video').addEventListener('click', exitVideo);
document.getElementById('idle-video').play().catch(() => {});

function exitVideo() {
  resumeAudio();
  if (!ambientPlaying) startAmbient();
  document.getElementById('screen-video').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  showScreen('screen-choose');
  resetIdleTimer(); bindIdleEvents(); attachSounds();
}
function goToSleep() {
  clearInterval(idleInterval); unbindIdleEvents(); resetAll(true);
  document.getElementById('app').classList.remove('visible');
  document.getElementById('screen-video').style.display = 'flex';
  document.getElementById('idle-video').play().catch(() => {});
}
function goHome() {
  playSynthClick(); resetAll(true);
  document.getElementById('app').classList.remove('visible');
  document.getElementById('screen-video').style.display = 'flex';
  document.getElementById('idle-video').play().catch(() => {});
}

function resetIdleTimer() {
  idleSeconds = 0; clearInterval(idleInterval); updateIdleBar(0);
  idleInterval = setInterval(() => {
    idleSeconds++;
    updateIdleBar(idleSeconds / IDLE_TIMEOUT);
    if (idleSeconds >= IDLE_TIMEOUT) goToSleep();
  }, 1000);
}
function updateIdleBar(pct) { document.getElementById('idle-fill').style.transform = `scaleX(${1 - pct})`; }
const IDLE_EVENTS = ['click','mousemove','keydown','touchstart'];
const idleReset = () => resetIdleTimer();
function bindIdleEvents()   { IDLE_EVENTS.forEach(e => document.addEventListener(e, idleReset)); }
function unbindIdleEvents() { IDLE_EVENTS.forEach(e => document.removeEventListener(e, idleReset)); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  setTimeout(attachSounds, 50);
}

// ════════════════════════════════════════
//  IFRAME CARD — communication postMessage
// ════════════════════════════════════════

/**
 * Envoie les données de la carte à l'iframe card.html.
 * On attend que l'iframe soit prête (event "CARD_READY") ou on réessaie après délai.
 */
let cardIframeReady = false;

function getCardIframe() { return document.getElementById('card-iframe'); }

// Écoute le signal "CARD_READY" de l'iframe
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'CARD_READY') {
    cardIframeReady = true;
  }
});

/**
 * Envoie les données carte à l'iframe.
 * Si l'iframe n'est pas encore prête, on attend 200ms et on réessaie (max 20 fois).
 */
function sendCardData(imageSrc, name, archLabel, attempts = 0) {
  const iframe = getCardIframe();
  if (!iframe) return;

  const payload = { type: 'CARD_DATA', imageSrc, name, archLabel };

  if (cardIframeReady || attempts > 20) {
    iframe.contentWindow.postMessage(payload, '*');
  } else {
    setTimeout(() => sendCardData(imageSrc, name, archLabel, attempts + 1), 200);
  }
}

// ════════════════════════════════════════
//  FORMULAIRE
// ════════════════════════════════════════
function onArchClick(panel) {
  resumeAudio(); playSynthClick();
  selectedArch = panel.dataset.arch;
  document.getElementById('form-arch-name').textContent = ARCHETYPES[selectedArch].label;
  document.getElementById('f-nom').value = '';
  document.getElementById('f-email').value = '';
  document.getElementById('f-consent').checked = false;
  document.getElementById('btn-validate').disabled = true;
  document.getElementById('form-overlay').classList.add('open');
  setTimeout(attachSounds, 50);
}
function closeForm() { document.getElementById('form-overlay').classList.remove('open'); }
function toggleConsent() { const cb = document.getElementById('f-consent'); cb.checked = !cb.checked; checkForm(); }
function checkForm() {
  const nom   = document.getElementById('f-nom').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const ok    = nom.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && document.getElementById('f-consent').checked;
  document.getElementById('btn-validate').disabled = !ok;
}
function submitForm() {
  userName  = document.getElementById('f-nom').value.trim();
  userEmail = document.getElementById('f-email').value.trim();
  closeForm(); goCapture();
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'logUser', secret: SECRET, nom: userName, email: userEmail, archetype: selectedArch })
  }).catch(() => {});
}

// ════════════════════════════════════════
//  CAPTURE
// ════════════════════════════════════════
function playArchVideo(panel) { const v = panel.querySelector('video'); if (v) v.play().catch(() => {}); }
function pauseArchVideo(panel) { const v = panel.querySelector('video'); if (v) v.pause(); }

async function goCapture() {
  const arch = ARCHETYPES[selectedArch];
  const capVideo = document.getElementById('cap-arch-video');
  capVideo.src = arch.videoSrc;
  capVideo.play().catch(() => {});
  document.getElementById('cap-arch-label').textContent = arch.label;
  document.getElementById('cap-username').textContent = userName;
  showScreen('screen-capture');
  await initCam();
}
async function initCam() {
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    document.getElementById('cam-video').srcObject = camStream;
  } catch(e) { alert('Caméra inaccessible : ' + e.message); }
}
function startCountdown() {
  if (countdownInt) return; resumeAudio();
  const btn = document.getElementById('btn-shutter'); btn.style.pointerEvents = 'none';
  const overlay = document.getElementById('countdown-overlay');
  const numEl   = document.getElementById('countdown-num');
  overlay.classList.add('show');
  let count = 3; numEl.textContent = count; playSynthHover();
  countdownInt = setInterval(() => {
    count--;
    if (count > 0) {
      numEl.style.animation = 'none'; numEl.offsetHeight; numEl.style.animation = '';
      numEl.textContent = count; playSynthHover();
    } else {
      clearInterval(countdownInt); countdownInt = null;
      overlay.classList.remove('show'); btn.style.pointerEvents = '';
      takePhoto();
    }
  }, 1000);
}
function takePhoto() {
  playSynthShutter();
  const vid = document.getElementById('cam-video');
  const c   = document.getElementById('canvas');
  c.width = vid.videoWidth; c.height = vid.videoHeight;
  const ctx = c.getContext('2d'); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0);
  capturedB64 = c.toDataURL('image/jpeg', 0.85);
  const fl = document.getElementById('flash'); fl.classList.add('go');
  setTimeout(() => fl.classList.remove('go'), 180);
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  generateAvatar();
}

// ════════════════════════════════════════
//  GÉNÉRATION
// ════════════════════════════════════════
async function generateAvatar() {
  const whiteFlash = document.getElementById('gen-white-flash');
  whiteFlash.classList.add('flash-in'); await sleep(140);

  const labelEl = document.getElementById('gen-label');
  const msgs = [
    "Conversion de votre photo...",
    "Envoi via l'API Vertex AI...",
    "Génération par Gemini...",
    "Sauvegarde dans Google Drive...",
    "Finalisation..."
  ];
  let msgIdx = 0; labelEl.textContent = msgs[0];
  if (loadingMsgInterval) clearInterval(loadingMsgInterval);
  loadingMsgInterval = setInterval(() => {
    msgIdx++;
    if (msgIdx < msgs.length) labelEl.textContent = msgs[msgIdx];
  }, 2200);

  document.getElementById('gen-overlay').classList.add('show');
  whiteFlash.classList.remove('flash-in'); whiteFlash.classList.add('flash-out');
  await sleep(900); whiteFlash.classList.remove('flash-out');

  const bar = document.getElementById('gen-progress'); bar.style.width = '0%';
  let prog = 0;
  genProgressInterval = setInterval(() => {
    prog += Math.random() * 2.5; if (prog > 88) prog = 88;
    bar.style.width = prog + '%';
  }, 300);

  let resultData;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action:    'transform',
        secret:    SECRET,
        image:     capturedB64,
        prompt:    buildPrompt(selectedArch),
        archetype: selectedArch,
        nom:       userName
      })
    });
    resultData = await res.json();
  } catch(e) {
    clearInterval(genProgressInterval);
    if (loadingMsgInterval) clearInterval(loadingMsgInterval);
    document.getElementById('gen-overlay').classList.remove('show');
    alert('Erreur réseau : ' + e.message);
    return;
  }

  clearInterval(genProgressInterval);
  if (loadingMsgInterval) clearInterval(loadingMsgInterval);
  bar.style.width = '100%'; await sleep(400);
  document.getElementById('gen-overlay').classList.remove('show');

  if (!resultData.success) {
    alert('Erreur génération : ' + (resultData.error || 'inconnue'));
    return;
  }

  currentFileId = resultData.fileId || null;

  try { resultImage = await addLogo(resultData.image); }
  catch { resultImage = resultData.image; }

  await cinemaReveal(resultImage);
}

// ════════════════════════════════════════
//  LOGO
// ════════════════════════════════════════
function loadImg(src) {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => rej();
    img.src = src;
  });
}
async function addLogo(base64) {
  const [base, logo] = await Promise.all([loadImg(base64), loadImg(LOGO_URL)]);
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  const ctx = c.getContext('2d'); ctx.drawImage(base, 0, 0);
  const lw = base.width * 0.25, lh = lw * (logo.height / logo.width), m = base.width * 0.025;
  ctx.globalAlpha = 1; ctx.drawImage(logo, base.width - lw - m, base.height - lh - m, lw, lh);
  return c.toDataURL('image/png');
}

// ════════════════════════════════════════
//  REVEAL CINÉMATIQUE (simplifié, dans index.html)
// ════════════════════════════════════════
let revealParticlesRAF = null;

async function cinemaReveal(imgSrc) {
  const revealDiv        = document.getElementById('gen-result-reveal');
  const revealImg        = document.getElementById('reveal-img');
  const revealPartCanvas = document.getElementById('reveal-particles-canvas');

  revealImg.src = imgSrc;
  revealImg.classList.remove('reveal-anim');

  const whiteFlash = document.getElementById('gen-white-flash');
  whiteFlash.classList.add('flash-in'); await sleep(120);
  revealDiv.classList.add('show');
  whiteFlash.classList.remove('flash-in'); whiteFlash.classList.add('flash-out');
  await sleep(200); whiteFlash.classList.remove('flash-out');

  revealImg.classList.add('reveal-anim'); playSynthReveal();
  await sleep(400);

  // Petits particules dorées autour du reveal
  startRevealParticles(revealPartCanvas, revealImg);
}

function startRevealParticles(canvas, imgEl) {
  stopRevealParticles();
  function sync() {
    const rect = imgEl.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';
    return { w: rect.width, h: rect.height };
  }
  const { w, h } = sync();
  if (w === 0 || h === 0) return;

  const ctx = canvas.getContext('2d');
  const COLORS = ['66,133,244', '246,161,25', '255,255,255'];
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 1.0,
    vy: -(Math.random() * 1.2 + 0.2),
    life: Math.random(),
    decay: Math.random() * 0.012 + 0.005,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));

  function draw() {
    const { w, h } = sync();
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${Math.max(0, p.life) * 0.8})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) {
        p.x = Math.random() * w; p.y = Math.random() * h;
        p.life = 1.0;
      }
    }
    revealParticlesRAF = requestAnimationFrame(draw);
  }
  draw();
}

function stopRevealParticles() {
  if (revealParticlesRAF) { cancelAnimationFrame(revealParticlesRAF); revealParticlesRAF = null; }
  const c = document.getElementById('reveal-particles-canvas');
  if (c) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); }
}

function confirmReveal() {
  playSynthClick();
  stopRevealParticles();
  document.getElementById('gen-result-reveal').classList.remove('show');
  document.getElementById('reveal-img').classList.remove('reveal-anim');
  showResult();
}

// ════════════════════════════════════════
//  RÉSULTAT
// ════════════════════════════════════════
function showResult() {
  const arch = ARCHETYPES[selectedArch];
  document.getElementById('res-name-em').textContent   = userName;
  document.getElementById('res-arch-badge').textContent = arch.emoji + ' ' + arch.label;

  hideStatus();
  showScreen('screen-result');

  // Réinitialise l'iframe et lui envoie les nouvelles données
  cardIframeReady = false;
  const iframe = getCardIframe();
  // Recharge l'iframe pour repartir d'un état propre
  iframe.src = 'card.html';
  iframe.onload = () => {
    // On attend un tout petit peu que les scripts s'initialisent
    setTimeout(() => {
      sendCardData(resultImage, userName, arch.label);
    }, 150);
  };

  requestAnimationFrame(() => {
    loadLeaderboard();
    loadGallery();
  });
}

// ════════════════════════════════════════
//  CARROUSEL GALERIE DRIVE
// ════════════════════════════════════════
async function loadGallery() {
  const container = document.getElementById('gallery-inner');
  container.innerHTML = '<div class="gallery-loading">Chargement des avatars…</div>';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getGallery', secret: SECRET })
    });
    const data = await res.json();
    if (!data.success || !data.images || data.images.length === 0) {
      container.innerHTML = '<div class="gallery-empty">Aucun avatar encore généré aujourd\'hui.</div>';
      return;
    }
    buildCarousel(container, data.images);
  } catch(e) {
    container.innerHTML = '<div class="gallery-empty">Galerie indisponible.</div>';
  }
}

function buildCarousel(container, images) {
  const carouselId = 'gallery-carousel-' + Date.now();
  const items = images.map((img, idx) => {
    const isMine = currentFileId && img.fileId === currentFileId;
    return `
      <div class="gallery-item${isMine ? ' is-mine' : ''}"
           onclick="openLightbox('${img.thumbnailUrl.replace(/&sz=w600/, '&sz=w1200')}')">
        <img src="${img.thumbnailUrl}" alt="Avatar ${idx + 1}" loading="lazy"
             onerror="this.parentElement.style.display='none'">
        <div class="gallery-lightbox-hint">🔍</div>
      </div>`;
  }).join('');
  container.innerHTML = `
    <div class="gallery-carousel" id="${carouselId}">${items}</div>
    <div class="gallery-nav">
      <button class="gallery-nav-btn" onclick="scrollCarousel('${carouselId}', -1)" title="Précédent">◀</button>
      <button class="gallery-nav-btn" onclick="scrollCarousel('${carouselId}', 1)"  title="Suivant">▶</button>
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(38,47,99,0.5);margin-left:6px;align-self:center;">
        ${images.length} avatar${images.length > 1 ? 's' : ''}
      </span>
    </div>`;
}

function scrollCarousel(carouselId, direction) {
  const el = document.getElementById(carouselId);
  if (!el) return;
  el.scrollBy({ left: direction * (72 + 10) * 3, behavior: 'smooth' });
}

function openLightbox(url) {
  document.getElementById('gallery-lightbox-img').src = url;
  document.getElementById('gallery-lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('gallery-lightbox').classList.remove('open');
  document.getElementById('gallery-lightbox-img').src = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ════════════════════════════════════════
//  LEADERBOARD
// ════════════════════════════════════════
const ARCH_LABELS = {
  'security-sentinel': '🛡️ Security Sentinel',
  'ai-sorcerer':       '🧙 AI Sorcerer',
  'cloud-architect':   '🏗️ Cloud Architect',
  'data-wrangler':     '🗄️ Data Wrangler'
};

async function loadLeaderboard() {
  const lbContent = document.getElementById('lb-content');
  const lbTotal   = document.getElementById('lb-total');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getStats', secret: SECRET })
    });
    const data = await res.json();
    if (!data.success) {
      lbContent.innerHTML = '<div class="lb-loading">Stats indisponibles</div>';
      return;
    }
    const sorted = Object.entries(data.counts)
      .map(([k, v]) => ({ key: k, count: v }))
      .sort((a, b) => b.count - a.count);
    const maxCount    = sorted[0]?.count || 1;
    const rankLabels  = ['①', '②', '③', '④'];
    const rankClasses = ['gold', 'silver', 'bronze', ''];
    let html = '';
    sorted.forEach((item, i) => {
      const isActive = item.key === selectedArch;
      const pct      = maxCount > 0 ? Math.round(item.count / maxCount * 100) : 0;
      html += `
        <div class="lb-row">
          <span class="lb-rank ${rankClasses[i]}">${rankLabels[i]}</span>
          <span class="lb-label ${isActive ? 'active-arch' : ''}">${ARCH_LABELS[item.key] || item.key}</span>
          <div class="lb-bar-wrap">
            <div class="lb-bar ${isActive ? 'active-bar' : ''}" data-pct="${pct}" style="width:0%"></div>
          </div>
          <span class="lb-count ${isActive ? 'active-count' : ''}">${item.count}</span>
        </div>`;
    });
    lbContent.innerHTML = html;
    lbTotal.textContent = `${data.total} avatar${data.total > 1 ? 's' : ''} généré${data.total > 1 ? 's' : ''} aujourd'hui`;
    lbTotal.style.display = 'block';
    requestAnimationFrame(() => {
      document.querySelectorAll('.lb-bar').forEach(bar => {
        setTimeout(() => { bar.style.width = bar.dataset.pct + '%'; }, 80);
      });
    });
  } catch(e) {
    document.getElementById('lb-content').innerHTML = '<div class="lb-loading">Stats indisponibles</div>';
  }
}

// ════════════════════════════════════════
//  EMAIL & UTILS
// ════════════════════════════════════════
async function sendEmail() {
  setStatus('info', '> Envoi en cours…');
  try {
    const res = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'sendEmail', secret: SECRET, email: userEmail, nom: userName, image: resultImage, archetype: selectedArch })
    });
    const d = await res.json();
    if (d.success) setStatus('success', '> Email envoyé à ' + userEmail + ' ✓');
    else setStatus('error', '> ERREUR : ' + d.error);
  } catch(e) { setStatus('error', '> ERREUR : ' + e.message); }
}
function setStatus(type, msg) {
  const el = document.getElementById('result-status');
  el.className = 'result-status ' + type; el.textContent = msg;
}
function hideStatus() { document.getElementById('result-status').className = 'result-status'; }

function resetAll(silent) {
  selectedArch = null; userName = ''; userEmail = '';
  capturedB64 = null; resultImage = null; currentFileId = null;
  cardIframeReady = false;
  if (camStream)           { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  if (countdownInt)        { clearInterval(countdownInt); countdownInt = null; }
  if (genProgressInterval) { clearInterval(genProgressInterval); genProgressInterval = null; }
  if (loadingMsgInterval)  { clearInterval(loadingMsgInterval); loadingMsgInterval = null; }
  stopRevealParticles();
  document.getElementById('countdown-overlay').classList.remove('show');
  document.getElementById('gen-overlay').classList.remove('show');
  document.getElementById('gen-result-reveal').classList.remove('show');
  document.getElementById('gen-white-flash').className = '';
  document.getElementById('form-overlay').classList.remove('open');
  document.getElementById('gallery-lightbox').classList.remove('open');
  // Réinitialise l'iframe
  const iframe = getCardIframe();
  if (iframe) iframe.src = 'card.html';
  if (!silent) showScreen('screen-choose');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
