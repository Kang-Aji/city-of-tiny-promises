/* City of Tiny Promises
 *
 * Structure follows the White House Arcade titles it was measured against: a
 * fixed-timestep loop driven by requestAnimationFrame, an attract screen that
 * states the premise before anything moves, a persistent control bar, and a
 * best score in localStorage.
 */

const ROUND_SECONDS = 60;
/* Simulation tick. The old loop ran at 1000ms, which is the coarsest possible
 * granularity for a timer bar and made every countdown visibly stair-step. */
const TICK_MS = 100;

/* Must match .citizen-card in styles.css. */
const CARD_W = 88;
const CARD_H = 100;
/* The request bubble sits 40px above the card; reserve room so it is not
 * clipped off the top of the street. */
const BUBBLE_SPACE = 44;
const STREET_PADDING = 10;
const MIN_GAP = 8;

/* Difficulty curve. Spawns accelerate and the street gets more crowded as the
 * round runs, so the pressure comes from the schedule rather than from a flat
 * rate that never changes. */
const SPAWN_MS_START = 2600;
const SPAWN_MS_END = 1100;
const MAX_CITIZENS_START = 5;
const MAX_CITIZENS_END = 10;

const BEST_SCORE_PREFIX = 'cotp.best.';

const POINTS_HELPED = 10;
const POINTS_AVOIDED = 5;
const POINTS_DECEIVED = -15;
const POINTS_MISSED = -10;

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.volume = 0.7;
        this.backgroundOscillator = null;
        this.backgroundGain = null;
        this.initAudioContext();
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Browsers start an AudioContext created outside a user gesture in the
    // 'suspended' state. Without this every sound is silently dropped.
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playSound(frequency, duration, type = 'sine', volume = 1) {
        if (this.isMuted || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(volume * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    playFulfillmentSound(streak = 0) {
        // Pitch rises with the streak so a long run sounds like one.
        const step = Math.min(streak, 8) * 12;
        this.playSound(523.25 + step, 0.1, 'sine', 0.3);
        setTimeout(() => this.playSound(659.25 + step, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playSound(783.99 + step, 0.2, 'sine', 0.3), 200);
    }

    playIgnoreSound() {
        this.playSound(196, 0.15, 'sine', 0.3);
        setTimeout(() => this.playSound(165, 0.15, 'sine', 0.3), 150);
        setTimeout(() => this.playSound(147, 0.3, 'sine', 0.3), 300);
    }

    playBadRequestSound() {
        this.playSound(300, 0.1, 'square', 0.2);
        setTimeout(() => this.playSound(250, 0.1, 'square', 0.2), 100);
        setTimeout(() => this.playSound(200, 0.2, 'square', 0.2), 200);
    }

    playAvoidedSound() {
        this.playSound(440, 0.08, 'triangle', 0.22);
        setTimeout(() => this.playSound(587.33, 0.14, 'triangle', 0.22), 90);
    }

    playGameOverSound() {
        this.playSound(392, 0.2, 'sine', 0.3);
        setTimeout(() => this.playSound(349.23, 0.2, 'sine', 0.3), 200);
        setTimeout(() => this.playSound(329.63, 0.4, 'sine', 0.3), 400);
    }

    startBackgroundMusic(difficulty) {
        if (this.isMuted || !this.audioContext) return;

        this.stopBackgroundMusic();

        this.backgroundOscillator = this.audioContext.createOscillator();
        this.backgroundGain = this.audioContext.createGain();

        this.backgroundOscillator.connect(this.backgroundGain);
        this.backgroundGain.connect(this.audioContext.destination);

        this.backgroundOscillator.type = 'sine';
        this.backgroundGain.gain.setValueAtTime(0.05 * this.volume, this.audioContext.currentTime);
        this.backgroundOscillator.frequency.value = difficulty === 'nyc' ? 220 : 196;

        this.backgroundOscillator.start();
    }

    stopBackgroundMusic() {
        if (this.backgroundOscillator) {
            this.backgroundOscillator.stop();
            this.backgroundOscillator = null;
        }
        this.backgroundGain = null;
    }

    setVolume(value) {
        this.volume = value / 100;
        if (this.backgroundGain) {
            this.backgroundGain.gain.setValueAtTime(0.05 * this.volume, this.audioContext.currentTime);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.backgroundGain) {
            const level = this.isMuted ? 0 : 0.05 * this.volume;
            this.backgroundGain.gain.setValueAtTime(level, this.audioContext.currentTime);
        }
        return this.isMuted;
    }
}

class CityOfTinyPromises {
    constructor() {
        this.citizens = [];
        this.difficulty = null;
        this.audioManager = new AudioManager();

        this.rafId = null;
        this.lastFrame = 0;
        this.accumulator = 0;
        this.isPaused = false;
        this.isGameOver = true;

        this.prefersReducedMotion =
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.goodRequestTypes = [
            { type: 'WALK WITH ME', icon: '🚶', urgency: 'low', impact: 5, color: '#FFB6C1', description: 'Companionship', isBad: false },
            { type: 'LISTEN', icon: '👂', urgency: 'medium', impact: 8, color: '#87CEEB', description: 'Emotional support', isBad: false },
            { type: 'HELP MOVE BOXES', icon: '📦', urgency: 'high', impact: 12, color: '#FF6B6B', description: 'Physical help', isBad: false },
            { type: 'SHARE MEAL', icon: '🍽️', urgency: 'medium', impact: 9, color: '#FFD700', description: 'Community', isBad: false },
            { type: 'GIVE DIRECTIONS', icon: '🗺️', urgency: 'low', impact: 4, color: '#98D8C8', description: 'Guidance', isBad: false },
            { type: 'CELEBRATE WITH ME', icon: '🎉', urgency: 'low', impact: 7, color: '#F7B731', description: 'Joy', isBad: false },
            { type: 'COMFORT ME', icon: '🤗', urgency: 'high', impact: 11, color: '#FF9FF3', description: 'Emotional care', isBad: false },
            { type: 'TEACH ME', icon: '📚', urgency: 'medium', impact: 10, color: '#54A0FF', description: 'Knowledge', isBad: false }
        ];

        /* The premise is that these are hard to tell apart. Previously each one
         * arrived with a red dashed border, a warning pulse and a red bubble,
         * which made "hard" mode a colour-matching exercise. They now use the
         * same palette and the same chrome as genuine requests; the tell is in
         * what is actually being asked for. */
        this.badRequestTypes = [
            { type: 'INVEST WITH ME', icon: '💰', urgency: 'high', impact: -8, color: '#FFD700', description: 'Ground floor', isBad: true },
            { type: 'HEAR ABOUT THEM', icon: '🗣️', urgency: 'medium', impact: -6, color: '#87CEEB', description: 'Neighborhood news', isBad: true },
            { type: 'KEEP THEM OUT', icon: '🚫', urgency: 'low', impact: -9, color: '#98D8C8', description: 'Community standards', isBad: true },
            { type: 'HOLD MY CASH', icon: '💸', urgency: 'high', impact: -10, color: '#FFB6C1', description: 'Trust exercise', isBad: true },
            { type: 'COVER FOR ME', icon: '🏃', urgency: 'medium', impact: -5, color: '#F7B731', description: 'Just this once', isBad: true },
            { type: 'SIGN THIS', icon: '📋', urgency: 'medium', impact: -7, color: '#54A0FF', description: 'Formality', isBad: true }
        ];

        this.citizenNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Sam', 'Quinn', 'Drew', 'Blake', 'Avery', 'Skylar'];
        this.citizenEmojis = ['👨', '👩', '🧑', '👱', '👨‍🦱', '👩‍🦱', '🧔', '👱‍♀️', '👨‍🦲', '👩‍🦲', '🧑‍🦰', '👨‍🦳'];

        this.resetRoundState();
        this.bindControls();
        this.renderBestScores();
    }

    resetRoundState() {
        this.communityScore = 50;
        this.points = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.missStreak = 0;
        this.requestsFulfilled = 0;
        this.requestsIgnored = 0;
        this.deceived = 0;
        this.avoided = 0;
        this.elapsedMs = 0;
        this.nextSpawnMs = 0;
        this.citizens = [];
    }

    /* Bound exactly once. These elements live for the lifetime of the page, so
     * re-binding them per round only ever duplicated handlers. */
    bindControls() {
        document.getElementById('startBtn').addEventListener('click', () => this.showCityPicker());
        document.getElementById('nycBtn').addEventListener('click', () => this.startGame('nyc'));
        document.getElementById('sfBtn').addEventListener('click', () => this.startGame('sf'));
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('pauseOverlay').addEventListener('click', () => this.setPaused(false));

        const soundToggle = document.getElementById('soundToggle');
        soundToggle.addEventListener('click', () => this.toggleMute());
        document.getElementById('volumeSlider').addEventListener('input', (event) => {
            this.audioManager.setVolume(event.target.value);
        });

        document.addEventListener('keydown', (event) => this.handleKey(event));

        /* A backgrounded tab throttles timers, so a round left in another tab
         * used to stretch well past its 60 seconds. Pause instead. */
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.isGameOver) this.setPaused(true);
        });
    }

    handleKey(event) {
        const key = event.key.toLowerCase();

        if (key === 'm') {
            this.toggleMute();
            return;
        }

        if (key === 'r' && !document.getElementById('gameContainer').classList.contains('hidden')) {
            event.preventDefault();
            this.restartGame();
            return;
        }

        if (this.isGameOver) {
            // Space advances the attract screen, the way the arcade titles do.
            if ((key === ' ' || key === 'enter') &&
                !document.getElementById('attractScreen').classList.contains('hidden')) {
                event.preventDefault();
                this.showCityPicker();
            }
            return;
        }

        if (key === 'p' || key === 'escape') {
            event.preventDefault();
            this.setPaused(!this.isPaused);
            return;
        }

        if (this.isPaused) return;

        // Digits act on the queue panel, which is sorted most-urgent-first.
        if (/^[1-9]$/.test(key)) {
            event.preventDefault();
            const target = this.queueOrder()[Number(key) - 1];
            if (target) this.fulfillRequest(target.id);
            return;
        }

        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
            event.preventDefault();
            this.moveFocus(key === 'arrowright' || key === 'arrowdown' ? 1 : -1);
        }
    }

    moveFocus(direction) {
        const cards = Array.from(document.querySelectorAll('.citizen-card'));
        if (!cards.length) return;
        const current = cards.indexOf(document.activeElement);
        const next = current === -1
            ? (direction > 0 ? 0 : cards.length - 1)
            : (current + direction + cards.length) % cards.length;
        cards[next].focus();
    }

    toggleMute() {
        const isMuted = this.audioManager.toggleMute();
        const soundToggle = document.getElementById('soundToggle');
        soundToggle.setAttribute('aria-pressed', String(!isMuted));
        soundToggle.querySelector('.toggle-text').textContent = isMuted ? 'Sound off' : 'Sound on';

        if (!isMuted && !this.isGameOver) {
            this.audioManager.startBackgroundMusic(this.difficulty);
        } else if (isMuted) {
            this.audioManager.stopBackgroundMusic();
        }
    }

    showCityPicker() {
        // First real gesture of the session, so audio can be unlocked here.
        this.audioManager.resume();
        document.getElementById('attractScreen').classList.add('hidden');
        document.getElementById('difficultyMenu').classList.remove('hidden');
        this.renderBestScores();
        document.getElementById('nycBtn').focus();
    }

    startGame(difficulty) {
        this.difficulty = difficulty;
        this.audioManager.resume();

        document.getElementById('difficultyMenu').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        document.getElementById('skyline').classList.toggle('hidden', difficulty === 'sf');
        document.getElementById('sf-skyline').classList.toggle('hidden', difficulty !== 'sf');

        this.resetRoundState();
        this.isGameOver = false;
        this.isPaused = false;
        document.getElementById('pauseOverlay').classList.add('hidden');
        document.getElementById('streetContainer').innerHTML = '';
        document.getElementById('activeRequests').innerHTML = '';

        this.updateUI();
        this.updateCityAppearance();
        this.renderBestScores();
        this.audioManager.startBackgroundMusic(difficulty);
        this.announce(`${difficulty === 'sf' ? 'San Francisco' : 'New York City'} round started.`);

        this.spawnCitizen();
        this.startGameLoop();
    }

    /* Fixed-timestep loop. The simulation advances in whole TICK_MS steps no
     * matter how the frames fall, so the round is exactly 60 seconds on any
     * refresh rate, and a long frame is caught up rather than skipped. */
    startGameLoop() {
        this.stopGameLoop();
        this.lastFrame = performance.now();
        this.accumulator = 0;

        const frame = (now) => {
            this.rafId = requestAnimationFrame(frame);

            const delta = now - this.lastFrame;
            this.lastFrame = now;

            if (this.isPaused || this.isGameOver) return;

            // Clamp so returning from a stall does not fast-forward the round.
            this.accumulator += Math.min(delta, 250);

            while (this.accumulator >= TICK_MS) {
                this.accumulator -= TICK_MS;
                this.tick(TICK_MS);
                if (this.isGameOver) break;
            }

            this.updateUI();
            this.updateRequestQueue();
        };

        this.rafId = requestAnimationFrame(frame);
    }

    stopGameLoop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    setPaused(paused) {
        if (this.isGameOver) return;
        this.isPaused = paused;
        document.getElementById('pauseOverlay').classList.toggle('hidden', !paused);
        if (paused) {
            this.audioManager.stopBackgroundMusic();
            this.announce('Paused.');
        } else {
            this.audioManager.startBackgroundMusic(this.difficulty);
            this.lastFrame = performance.now();
            this.accumulator = 0;
        }
    }

    tick(deltaMs) {
        this.elapsedMs += deltaMs;

        this.citizens.forEach((citizen) => {
            if (!citizen.resolved) citizen.timeLeftMs -= deltaMs;
        });

        this.citizens
            .filter((citizen) => !citizen.resolved && citizen.timeLeftMs <= 0)
            .forEach((citizen) => this.ignoreRequest(citizen.id));

        this.citizens.forEach((citizen) => {
            if (citizen.resolved) return;
            const element = document.getElementById(`citizen-${citizen.id}`);
            if (element) element.classList.toggle('urgent', citizen.timeLeftMs <= 3000);
        });

        if (this.elapsedMs >= this.nextSpawnMs) {
            this.spawnCitizen();
            this.nextSpawnMs = this.elapsedMs + this.currentSpawnInterval();
        }

        this.checkGameEnd();
    }

    roundProgress() {
        return Math.min(1, this.elapsedMs / (ROUND_SECONDS * 1000));
    }

    currentSpawnInterval() {
        const progress = this.roundProgress();
        return SPAWN_MS_START + (SPAWN_MS_END - SPAWN_MS_START) * progress;
    }

    currentMaxCitizens() {
        const progress = this.roundProgress();
        return Math.round(MAX_CITIZENS_START + (MAX_CITIZENS_END - MAX_CITIZENS_START) * progress);
    }

    spawnCitizen() {
        if (this.citizens.length >= this.currentMaxCitizens()) return;

        // Deception ramps up through a San Francisco round.
        let pool = this.goodRequestTypes;
        if (this.difficulty === 'sf') {
            const badChance = 0.22 + 0.18 * this.roundProgress();
            if (Math.random() < badChance) pool = this.badRequestTypes;
        }

        const requestType = pool[Math.floor(Math.random() * pool.length)];
        const timeByUrgency = { low: 12000, medium: 10000, high: 8000 };
        const position = this.pickSpawnPosition();

        const citizen = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            x: position.x,
            y: position.y,
            name: this.citizenNames[Math.floor(Math.random() * this.citizenNames.length)],
            emoji: this.citizenEmojis[Math.floor(Math.random() * this.citizenEmojis.length)],
            request: requestType,
            timeLeftMs: timeByUrgency[requestType.urgency],
            maxTimeMs: timeByUrgency[requestType.urgency],
            resolved: false
        };

        this.citizens.push(citizen);
        this.renderCitizen(citizen);
        this.updateRequestQueue();
    }

    /* Picks a pixel position inside the street that fits a whole card and, where
     * possible, does not overlap an existing one. Rejection sampling with a
     * best-effort fallback: a crowded street should still place the citizen
     * rather than drop it. */
    pickSpawnPosition() {
        const rect = document.getElementById('streetContainer').getBoundingClientRect();
        const maxX = Math.max(0, rect.width - CARD_W - STREET_PADDING * 2);
        const maxY = Math.max(0, rect.height - CARD_H - STREET_PADDING - BUBBLE_SPACE);

        let fallback = null;
        let fallbackClearance = -Infinity;

        for (let attempt = 0; attempt < 30; attempt++) {
            const candidate = {
                x: STREET_PADDING + Math.random() * maxX,
                y: STREET_PADDING + BUBBLE_SPACE + Math.random() * maxY
            };
            const clearance = this.clearanceAt(candidate);

            if (clearance >= MIN_GAP) return candidate;
            if (clearance > fallbackClearance) {
                fallbackClearance = clearance;
                fallback = candidate;
            }
        }

        return fallback;
    }

    /* Distance to the nearest existing card along whichever axis separates them
     * most. Negative means the boxes overlap. */
    clearanceAt(candidate) {
        return this.citizens.reduce((closest, citizen) => {
            const gapX = Math.abs(citizen.x - candidate.x) - CARD_W;
            const gapY = Math.abs(citizen.y - candidate.y) - CARD_H;
            return Math.min(closest, Math.max(gapX, gapY));
        }, Infinity);
    }

    renderCitizen(citizen) {
        /* A real <button>, not a div with a click handler. This is the whole
         * interaction surface of the game and it was unreachable by keyboard. */
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'citizen-card';
        card.id = `citizen-${citizen.id}`;
        card.style.left = `${citizen.x}px`;
        card.style.top = `${citizen.y}px`;
        card.style.backgroundColor = citizen.request.color;
        card.setAttribute('aria-label',
            `${citizen.name} asks: ${citizen.request.type}. ${citizen.request.description}.`);

        card.innerHTML = `
            <span class="citizen-avatar" aria-hidden="true">${citizen.emoji}</span>
            <span class="citizen-name">${citizen.name}</span>
            <span class="citizen-mood">${citizen.request.description}</span>
            <span class="request-badge" aria-hidden="true">${citizen.request.icon}</span>
            <span class="request-bubble" aria-hidden="true">${citizen.request.type}</span>
            <span class="citizen-timer" aria-hidden="true"><i></i></span>
        `;

        if (citizen.request.urgency === 'high') card.classList.add('urgent');
        card.addEventListener('click', () => this.fulfillRequest(citizen.id));

        document.getElementById('streetContainer').appendChild(card);
    }

    fulfillRequest(citizenId) {
        if (this.isGameOver || this.isPaused) return;

        const citizen = this.citizens.find((entry) => entry.id === citizenId);
        if (!citizen || citizen.resolved) return;

        citizen.resolved = true;
        this.requestsFulfilled++;

        if (citizen.request.isBad) {
            /* Helping a bad request is the mistake the mode is built around, so
             * it lands at full force and breaks the streak. */
            this.deceived++;
            this.streak = 0;
            this.changeCommunity(citizen.request.impact);
            this.points = Math.max(0, this.points + POINTS_DECEIVED);
            this.audioManager.playBadRequestSound();
            this.announce(`${citizen.request.type} was not what it looked like.`);
        } else {
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.missStreak = 0;
            /* Diminishing returns: the last stretch of community trust is the
             * expensive part. Without this the score pinned at 100 in about
             * twenty seconds and stayed there. */
            const diminish = 1 - (this.communityScore / 100) * 0.7;
            this.changeCommunity(citizen.request.impact * diminish);
            this.points += Math.round(POINTS_HELPED * this.streakMultiplier());
            this.audioManager.playFulfillmentSound(this.streak);
        }

        this.resolveCitizen(citizen, citizen.request.isBad ? 'sad' : 'heart');
    }

    ignoreRequest(citizenId) {
        const citizen = this.citizens.find((entry) => entry.id === citizenId);
        if (!citizen || citizen.resolved) return;

        citizen.resolved = true;

        if (citizen.request.isBad) {
            // Letting a bad request expire is the correct read, and scores.
            this.avoided++;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.changeCommunity(2);
            this.points += POINTS_AVOIDED;
            this.audioManager.playAvoidedSound();
        } else {
            this.requestsIgnored++;
            this.streak = 0;
            this.missStreak++;
            /* Consecutive misses compound. A city you have stopped showing up
             * for gives up on you faster. */
            const penalty = 5 * (1 + Math.min(this.missStreak, 4) * 0.25);
            this.changeCommunity(-penalty);
            this.points = Math.max(0, this.points + POINTS_MISSED);
            this.audioManager.playIgnoreSound();
        }

        this.resolveCitizen(citizen, citizen.request.isBad ? 'heart' : 'sad');
    }

    streakMultiplier() {
        return 1 + Math.min(this.streak, 10) * 0.1;
    }

    changeCommunity(delta) {
        this.communityScore = Math.max(0, Math.min(100, this.communityScore + delta));
    }

    resolveCitizen(citizen, particleType) {
        const element = document.getElementById(`citizen-${citizen.id}`);
        if (element) {
            /* Hand focus to the next card before this one leaves the document.
             * Letting it fall back to <body> silently strands a keyboard player
             * mid-round. */
            if (document.activeElement === element) {
                const remaining = Array.from(document.querySelectorAll('.citizen-card'))
                    .filter((card) => card !== element && !card.disabled);
                if (remaining.length) remaining[0].focus({ preventScroll: true });
                else element.blur();
            }
            element.classList.add(particleType === 'heart' ? 'fulfilled-effect' : 'ignored-effect');
            element.disabled = true;
            this.createParticles(element, particleType, 5);
            setTimeout(() => element.remove(), 600);
        }

        this.citizens = this.citizens.filter((entry) => entry.id !== citizen.id);

        this.updateUI();
        this.updateRequestQueue();
        this.updateCityAppearance();
        this.checkGameEnd();
    }

    createParticles(element, type, count) {
        if (this.prefersReducedMotion) return;

        const container = document.getElementById('streetContainer');
        const rect = element.getBoundingClientRect();
        const origin = container.getBoundingClientRect();
        const glyph = type === 'heart' ? '❤️' : '💔';

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${type}`;
            particle.textContent = glyph;
            /* Spread and stagger. Previously all five spawned at one point with
             * one animation, so they rendered as a single particle. */
            particle.style.left = `${rect.left - origin.left + CARD_W / 2 + (Math.random() * 40 - 20)}px`;
            particle.style.top = `${rect.top - origin.top + CARD_H / 2}px`;
            particle.style.animationDelay = `${i * 60}ms`;
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 1000 + i * 60);
        }
    }

    queueOrder() {
        return [...this.citizens]
            .filter((citizen) => !citizen.resolved)
            .sort((a, b) => a.timeLeftMs - b.timeLeftMs)
            .slice(0, 9);
    }

    /* Reconciles the queue against live citizens instead of clearing and
     * rebuilding it, which restarted the slideIn animation on every row on
     * every tick. */
    updateRequestQueue() {
        const container = document.getElementById('activeRequests');
        const order = this.queueOrder();
        const live = new Set();

        order.forEach((citizen, index) => {
            const rowId = `request-${citizen.id}`;
            live.add(rowId);

            let row = document.getElementById(rowId);
            if (!row) {
                row = this.createRequestRow(citizen, rowId);
                container.appendChild(row);
            }

            row.classList.toggle('urgent', citizen.timeLeftMs <= 3000);
            row.querySelector('.request-item-key').textContent = index + 1;
            row.querySelector('.request-item-time').textContent =
                `${Math.max(0, citizen.timeLeftMs / 1000).toFixed(1)}s`;
            row.querySelector('.request-item-bar-fill').style.width =
                `${Math.max(0, (citizen.timeLeftMs / citizen.maxTimeMs) * 100)}%`;
            // Keep DOM order matching key order so the digits stay truthful.
            if (container.children[index] !== row) {
                container.insertBefore(row, container.children[index] || null);
            }
        });

        Array.from(container.children).forEach((row) => {
            if (!live.has(row.id)) row.remove();
        });
    }

    createRequestRow(citizen, rowId) {
        const row = document.createElement('div');
        row.className = 'request-item';
        row.id = rowId;
        row.style.backgroundColor = citizen.request.color;
        row.innerHTML = `
            <div class="request-item-head">
                <span class="request-item-key" aria-hidden="true"></span>
                <span class="request-item-name"><strong>${citizen.name}</strong></span>
                <span class="request-item-time"></span>
            </div>
            <div class="request-item-type">${citizen.request.icon} ${citizen.request.type}</div>
            <div class="request-item-bar"><div class="request-item-bar-fill"></div></div>
        `;
        return row;
    }

    updateCityAppearance() {
        const buildings = document.querySelectorAll('.skyscraper, .sf-building, .tree');
        const state = this.communityScore < 30 ? 'depressed'
            : this.communityScore > 70 ? 'vibrant' : null;

        buildings.forEach((building) => {
            building.classList.remove('depressed', 'vibrant');
            if (state) building.classList.add(state);
        });
    }

    updateUI() {
        const secondsLeft = Math.max(0, Math.ceil((ROUND_SECONDS * 1000 - this.elapsedMs) / 1000));
        const community = Math.round(this.communityScore);

        document.getElementById('timeRemaining').textContent = secondsLeft;
        document.getElementById('score').textContent = this.points;
        document.getElementById('communityScore').textContent = community;
        document.getElementById('streak').textContent =
            this.streak > 1 ? `${this.streak} ×${this.streakMultiplier().toFixed(1)}` : this.streak;

        document.getElementById('streakStat').classList.toggle('hot', this.streak >= 5);
        document.getElementById('communityMeterFill').style.width = `${community}%`;
        document.getElementById('communityMeter').setAttribute(
            'aria-label', `Community health ${community} of 100`);

        const meter = document.getElementById('communityMeter');
        meter.classList.toggle('low', community < 30);
        meter.classList.toggle('high', community > 70);

        // Per-card countdown ring, so urgency is readable on the street itself.
        this.citizens.forEach((citizen) => {
            const element = document.getElementById(`citizen-${citizen.id}`);
            const fill = element && element.querySelector('.citizen-timer i');
            if (fill) {
                fill.style.width = `${Math.max(0, (citizen.timeLeftMs / citizen.maxTimeMs) * 100)}%`;
            }
        });
    }

    announce(message) {
        document.getElementById('srStatus').textContent = message;
    }

    bestScoreKey(difficulty = this.difficulty) {
        return `${BEST_SCORE_PREFIX}${difficulty}`;
    }

    readBest(difficulty) {
        try {
            return Number(window.localStorage.getItem(this.bestScoreKey(difficulty))) || 0;
        } catch (error) {
            // Private browsing and blocked storage both throw. Not fatal.
            return 0;
        }
    }

    writeBest(difficulty, value) {
        try {
            window.localStorage.setItem(this.bestScoreKey(difficulty), String(value));
        } catch (error) {
            /* Best score is a nicety; a round is still playable without it. */
        }
    }

    renderBestScores() {
        document.getElementById('bestNyc').textContent = this.readBest('nyc') || '–';
        document.getElementById('bestSf').textContent = this.readBest('sf') || '–';
        if (this.difficulty) {
            document.getElementById('bestScore').textContent = this.readBest(this.difficulty);
        }
    }

    checkGameEnd() {
        if (this.isGameOver) return;

        if (this.communityScore <= 0) {
            this.endGame('collapse');
        } else if (this.elapsedMs >= ROUND_SECONDS * 1000) {
            this.endGame('time');
        }
    }

    endGame(reason) {
        this.isGameOver = true;
        this.stopGameLoop();
        this.audioManager.stopBackgroundMusic();
        this.audioManager.playGameOverSound();

        const community = Math.round(this.communityScore);
        const previousBest = this.readBest(this.difficulty);
        const isNewBest = this.points > previousBest;
        if (isNewBest) this.writeBest(this.difficulty, this.points);

        const endings = [
            [80, '🌟 Your community thrives. People help each other without being asked, and the streets carry the sound of it.'],
            [60, '👍 Your community holds. Some people show up, others keep to themselves, and the city works well enough.'],
            [40, '😐 Your community strains. Requests go unanswered often enough that people have stopped expecting an answer.'],
            [0, '💔 Your community has broken down. The tiny promises that could have held it together were left unfulfilled.']
        ];

        document.getElementById('endGameTitle').textContent =
            reason === 'collapse' ? 'The city stopped asking' : 'Your Community';
        document.getElementById('endGameScene').textContent =
            endings.find(([threshold]) => community >= threshold)[1];
        document.getElementById('newBestBanner').classList.toggle('hidden', !isNewBest);

        const attempted = this.requestsFulfilled + this.requestsIgnored;
        const responseRate = attempted > 0
            ? Math.round((this.requestsFulfilled / attempted) * 100) : 0;

        const rows = [
            ['Score', this.points],
            ['Best', Math.max(this.points, previousBest)],
            ['Community', `${community}/100`],
            ['Longest streak', this.bestStreak],
            ['Requests helped', this.requestsFulfilled],
            ['Requests missed', this.requestsIgnored],
            ['Response rate', `${responseRate}%`]
        ];

        if (this.difficulty === 'sf') {
            rows.push(['Deceptions avoided', this.avoided]);
            rows.push(['Deceptions fallen for', this.deceived]);
        }

        document.getElementById('finalStats').innerHTML = `
            <h3>Final Statistics</h3>
            <dl class="final-stats-list">
                ${rows.map(([label, value]) =>
                    `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
            </dl>
        `;

        this.renderBestScores();
        document.getElementById('endGameModal').classList.remove('hidden');
        document.getElementById('restartBtn').focus();
        this.announce(`Round over. Score ${this.points}. Community ${community} of 100.` +
            (isNewBest ? ' New best score.' : ''));
    }

    restartGame() {
        this.isGameOver = true;
        this.stopGameLoop();
        this.audioManager.stopBackgroundMusic();
        this.resetRoundState();

        document.getElementById('streetContainer').innerHTML = '';
        document.getElementById('activeRequests').innerHTML = '';
        document.getElementById('endGameModal').classList.add('hidden');
        document.getElementById('pauseOverlay').classList.add('hidden');
        document.getElementById('gameContainer').classList.add('hidden');
        document.getElementById('difficultyMenu').classList.remove('hidden');

        this.updateUI();
        this.updateCityAppearance();
        this.renderBestScores();
        document.getElementById('nycBtn').focus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CityOfTinyPromises();
});
