// Typing Game logic (icon sprites + collision)
// Contract:
// - Levels start at 1; each level spawns baseCount + (level-1) Pokemon
// - Icons (Pokémon) spawn at edges and approach a fixed hero at the board center
// - If a Pokémon collides with the hero, Game Over
// - Catch a Pokémon by typing its full normalized name; label above icon shows typed vs remaining colored
// - Names are case-insensitive and forgiving to spaces/dots/apostrophes; hyphen optional

(function() {
  // State
  let level = 1;
  const baseCount = 3; // number of pokemon at level 1
  let activeMons = []; // { name, nameNoHyphen, displayName, data, typedCount, caught, x, y, el, labelEl }
  let caught = 0;
  let isRunning = false;
  let lastTs = 0;
  let rafId = null;
  let boardW = 0, boardH = 0;

  // Gameplay constants
  const HERO_SIZE = 64; // px
  const ENEMY_SIZE = 64; // px
  const BASE_SPEED = 70; // px/sec
  const SPEED_PER_LEVEL = 10; // px/sec per level

  // DOM
  const levelEl = document.getElementById('level');
  const caughtEl = document.getElementById('caughtCount');
  const remainingEl = document.getElementById('remainingCount');
  const boardEl = document.getElementById('gameBoard');
  const inputEl = document.getElementById('typeInput');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetGameBtn');

  // Hero (fixed center)
  const hero = { x: 0, y: 0, r: HERO_SIZE / 2, el: null };

  // Utilities
  const normalize = (s) => (s || '')
    .toLowerCase()
    .replace(/['`\.\s]/g, '') // remove spaces, apostrophes, dots
    .replace(/–|—/g, '-')       // normalize long dashes to hyphen
    .trim();

  const stripHyphen = (s) => normalize(s).replace(/-/g, '');

  function updateHUD() {
    levelEl.textContent = level;
    caughtEl.textContent = caught;
    const remaining = activeMons.filter(m => !m.caught).length;
    remainingEl.textContent = remaining;
    nextLevelBtn.disabled = remaining !== 0;
  }

  function clearBoard() {
    cancelAnim();
    boardEl.innerHTML = '<div id="boardLoading" class="text-center my-5"><div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  }

  function renderBoard() {
    // Build board with hero + enemy sprites
    boardEl.innerHTML = '';
    boardEl.classList.add('game-board');

    // Measure board
    boardW = boardEl.clientWidth;
    boardH = Math.max(boardEl.clientHeight, 320);

    // Create hero element at center
    hero.x = boardW / 2;
    hero.y = boardH / 2;
    const h = document.createElement('div');
    h.className = 'entity hero-entity';
    h.style.width = HERO_SIZE + 'px';
    h.style.height = HERO_SIZE + 'px';
    h.style.left = hero.x + 'px';
    h.style.top = hero.y + 'px';
    h.innerHTML = '<div class="hero-icon">🎮</div>';
    hero.el = h;
    boardEl.appendChild(h);

    // Spawn enemies at edges
    activeMons.forEach((m) => {
      // Random edge spawn
      const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
      if (edge === 0) { m.x = Math.random() * boardW; m.y = -ENEMY_SIZE; }
      else if (edge === 1) { m.x = boardW + ENEMY_SIZE; m.y = Math.random() * boardH; }
      else if (edge === 2) { m.x = Math.random() * boardW; m.y = boardH + ENEMY_SIZE; }
      else { m.x = -ENEMY_SIZE; m.y = Math.random() * boardH; }

      const e = document.createElement('div');
      e.className = 'entity pokemon-entity';
      e.style.width = ENEMY_SIZE + 'px';
      e.style.height = ENEMY_SIZE + 'px';
      e.style.left = m.x + 'px';
      e.style.top = m.y + 'px';
      e.innerHTML = `
        <img class="sprite" src="${getPokemonImageUrl(m.data)}" alt="${m.displayName}">
        <div class="name-label text-capitalize"></div>
      `;
      m.el = e;
      m.labelEl = e.querySelector('.name-label');
      updateNameLabel(m); // initial label
      boardEl.appendChild(e);
    });
  }

  function updateNameLabel(m) {
    const name = m.displayName;
    const typed = name.slice(0, m.typedCount);
    const rest = name.slice(m.typedCount);
    m.labelEl.innerHTML = `<span class="typed-chars">${typed}</span><span class="remaining-chars">${rest}</span>`;
  }

  function cancelAnim() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTs = 0;
  }

  function gameOver() {
    isRunning = false;
    cancelAnim();
    inputEl.disabled = true;
    const overlay = document.createElement('div');
    overlay.className = 'board-overlay game-over-overlay';
    overlay.innerHTML = `
      <div class="overlay-card text-center">
        <h2 class="text-danger">Game Over</h2>
        <p>Try again or lower your level pace.</p>
        <div class="d-flex gap-2 justify-content-center">
          <button class="btn btn-warning" id="retryLevelBtn">Retry Level</button>
          <button class="btn btn-secondary" id="backToStartBtn">Reset</button>
        </div>
      </div>`;
    boardEl.appendChild(overlay);
    overlay.querySelector('#retryLevelBtn').addEventListener('click', () => startLevel(level));
    overlay.querySelector('#backToStartBtn').addEventListener('click', resetGame);
  }

  function levelCleared() {
    isRunning = false;
    cancelAnim();
    inputEl.disabled = true;
    nextLevelBtn.disabled = false;
    const overlay = document.createElement('div');
    overlay.className = 'board-overlay level-clear-overlay';
    overlay.innerHTML = `
      <div class="overlay-card text-center">
        <h2 class="text-success">Level ${level} Cleared!</h2>
        <button class="btn btn-success" id="goNextBtn">Next Level</button>
      </div>`;
    boardEl.appendChild(overlay);
    overlay.querySelector('#goNextBtn').addEventListener('click', () => startLevel(level + 1));
  }

  function loop(ts) {
    if (!isRunning) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000); // cap dt for stability
    lastTs = ts;

    const speed = BASE_SPEED + (level - 1) * SPEED_PER_LEVEL;
    const heroR = HERO_SIZE / 2;
    const enemyR = ENEMY_SIZE / 2;

    let remainingEnemies = 0;

    for (const m of activeMons) {
      if (m.caught) continue;
      remainingEnemies++;

      // Homing towards hero
      const dx = hero.x - m.x;
      const dy = hero.y - m.y;
      const len = Math.hypot(dx, dy) || 1;
      const step = speed * dt;
      m.x += (dx / len) * step;
      m.y += (dy / len) * step;
      if (m.el) {
        m.el.style.left = m.x + 'px';
        m.el.style.top = m.y + 'px';
      }

      // Collision with hero
      if (len < heroR + enemyR) {
        gameOver();
        return;
      }
    }

    if (remainingEnemies === 0) {
      levelCleared();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  async function fetchRandomPokemon(count) {
    // Fetch a random slice of list results, then pick random names and resolve details.
    // This avoids hitting non-existent numeric IDs and improves success rate.
    const batchSize = Math.max(count * 2, 20); // overfetch a bit to account for failures
    const maxOffset = 1200; // generous upper bound for list endpoint
    const offset = Math.max(0, Math.floor(Math.random() * Math.max(1, maxOffset - batchSize)));

    let listResp;
    try {
      listResp = await pokeApi.getPokemonList(batchSize, offset);
    } catch (e) {
      console.error('Failed to get Pokemon list:', e);
      return [];
    }

    // Randomly sample names from the list
    const pool = [...listResp.results];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, Math.min(pool.length, count * 2));

    const settled = await Promise.allSettled(
      picks.map(p => pokeApi.getPokemonDetails(p.name))
    );
    const mons = settled
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .slice(0, count);
    return mons;
  }

  async function startLevel(newLevel) {
    try {
      isRunning = true;
      if (typeof newLevel === 'number') level = newLevel;
      caught = 0;
      updateHUD();
      clearBoard();

      const count = baseCount + (level - 1); // linear scaling
      let mons = await fetchRandomPokemon(count);

      // Fallback: try another batch if we didn't get enough
      if (mons.length < count) {
        const more = await fetchRandomPokemon(count);
        mons = [...mons, ...more].slice(0, count);
      }

      if (mons.length === 0) {
        boardEl.innerHTML = '<div class="alert alert-danger m-3">Failed to load Pokémon. Check your connection and try Start or Next Level again.</div>';
        nextLevelBtn.disabled = false; // allow trying again
        return;
      }

      activeMons = mons.map(p => ({
        name: normalize(p.name),
        nameNoHyphen: stripHyphen(p.name),
        displayName: p.name,
        data: p,
        typedCount: 0,
        caught: false,
        x: 0,
        y: 0,
        el: null,
        labelEl: null,
      }));

      renderBoard();
      inputEl.value = '';
      inputEl.disabled = false;
      inputEl.focus();
      updateHUD();

      // Start animation loop
      isRunning = true;
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      console.error('Error starting level:', err);
      boardEl.innerHTML = '<div class="alert alert-danger m-3">Unexpected error starting level. Please try again.</div>';
      nextLevelBtn.disabled = false;
    }
  }

  function processInput() {
    if (!isRunning) return;
    const raw = inputEl.value;

    // For matching we try both with and without hyphens
    const normalized = normalize(raw);
    const normalizedNoHyphen = stripHyphen(raw);

  let anyChanged = false;

    activeMons.forEach(m => {
      if (m.caught) return;

      // two strategies: prefer exact-with-hyphen; fallback to no-hyphen match
      const target = m.name;
      const targetNoHyphen = m.nameNoHyphen;

      if (target.startsWith(normalized) || targetNoHyphen.startsWith(normalizedNoHyphen)) {
        // typed prefix length for display should reflect original display name
        // Compute typedCount based on displayName characters matched progressively (case-insensitive)
        const disp = m.displayName;
        let count = 0;
        let nIdx = 0;
        // Build a compact normalized stream for comparison against input (no spaces, dots, apostrophes)
        const dispStream = normalize(disp);
        const streamNoHyphen = dispStream.replace(/-/g, '');
        const compareAgainst = (target.startsWith(normalized)) ? normalized : normalizedNoHyphen;

        // count visual chars matched by mapping back to original display string
        // We'll iterate original display chars and advance nIdx along normalized stream
        const targetStream = (target.startsWith(normalized)) ? dispStream : streamNoHyphen;
        for (let i = 0, j = 0; i < disp.length && j < compareAgainst.length; i++) {
          const c = disp[i];
          const cn = normalize(c);
          const cnNo = cn.replace(/-/g, '');
          // Skip characters that vanished during normalization, but still count them visually if they align
          if (target.startsWith(normalized)) {
            if (cn === targetStream[j]) {
              count++;
              j++;
            } else if (cn === '') {
              count++; // visual char like space/apostrophe/dot
            }
          } else {
            if (cnNo && cnNo === targetStream[j]) {
              count++;
              j++;
            } else if (!cnNo) {
              count++;
            }
          }
        }
        const newCount = Math.max(m.typedCount, count);
        if (newCount !== m.typedCount) { m.typedCount = newCount; anyChanged = true; }

        // full catch check
        if (normalized === target || normalizedNoHyphen === targetNoHyphen) {
          m.caught = true;
          m.typedCount = m.displayName.length; // fully highlight
          caught += 1;
          anyChanged = true;
          // play catch animation and remove
          if (m.el) {
            m.el.classList.add('caught-pop');
            setTimeout(() => { m.el?.remove(); }, 250);
          }
          // clear input for next catch
          inputEl.value = '';
        }
      } else {
        // reset highlight if diverged
        if (m.typedCount !== 0) { m.typedCount = 0; anyChanged = true; }
      }
    });

    if (anyChanged) {
      // update labels only
      activeMons.forEach(m => { if (m.labelEl) updateNameLabel(m); });
      updateHUD();
    }
  }

  function resetGame() {
    level = 1;
    caught = 0;
    activeMons = [];
    isRunning = false;
  cancelAnim();
    inputEl.value = '';
    inputEl.disabled = true;
    clearBoard();
    updateHUD();
    nextLevelBtn.disabled = true;
  }

  // Events
  startBtn?.addEventListener('click', () => startLevel(level));
  nextLevelBtn?.addEventListener('click', () => startLevel(level + 1));
  resetBtn?.addEventListener('click', resetGame);
  inputEl?.addEventListener('input', processInput);

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-start Level 1 for better UX
    inputEl.disabled = true;
    updateHUD();
    startLevel(1);
  });
})();
