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
    // 'suspended' state. Without this every sound was silently dropped.
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
    
    playFulfillmentSound() {
        this.playSound(523.25, 0.1, 'sine', 0.3);
        setTimeout(() => this.playSound(659.25, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playSound(783.99, 0.2, 'sine', 0.3), 200);
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
    
    playGameOverSound() {
        this.playSound(392, 0.2, 'sine', 0.3);
        setTimeout(() => this.playSound(349.23, 0.2, 'sine', 0.3), 200);
        setTimeout(() => this.playSound(329.63, 0.4, 'sine', 0.3), 400);
    }
    
    startBackgroundMusic(difficulty) {
        if (this.isMuted || !this.audioContext) return;
        
        if (this.backgroundOscillator) {
            this.backgroundOscillator.stop();
        }
        
        this.backgroundOscillator = this.audioContext.createOscillator();
        this.backgroundGain = this.audioContext.createGain();
        
        this.backgroundOscillator.connect(this.backgroundGain);
        this.backgroundGain.connect(this.audioContext.destination);
        
        this.backgroundOscillator.type = 'sine';
        this.backgroundGain.gain.setValueAtTime(0.05 * this.volume, this.audioContext.currentTime);
        
        if (difficulty === 'nyc') {
            this.backgroundOscillator.frequency.value = 220;
        } else {
            this.backgroundOscillator.frequency.value = 196;
        }
        
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
        if (this.isMuted && this.backgroundOscillator) {
            this.backgroundGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        } else if (!this.isMuted && this.backgroundOscillator) {
            this.backgroundGain.gain.setValueAtTime(0.05 * this.volume, this.audioContext.currentTime);
        }
        return this.isMuted;
    }
}

const ROUND_SECONDS = 60;

// Must match .citizen-card in styles.css.
const CARD_W = 88;
const CARD_H = 100;
// The request bubble is absolutely positioned 40px above the card; reserve room
// for it so it is not clipped off the top of the street.
const BUBBLE_SPACE = 44;
// Matches #streetContainer's padding.
const STREET_PADDING = 10;
// Breathing room between two cards before they read as overlapping.
const MIN_GAP = 8;

class CityOfTinyPromises {
    constructor() {
        this.communityScore = 50;
        this.requestsFulfilled = 0;
        this.requestsIgnored = 0;
        this.citizens = [];
        this.activeRequests = [];
        this.gameTime = 0;
        this.isGameOver = false;
        this.difficulty = null;
        this.audioManager = new AudioManager();
        
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
        
        this.badRequestTypes = [
            { type: 'BUY MY PRODUCT', icon: '💰', urgency: 'high', impact: -8, color: '#FF4444', description: 'Scam', isBad: true },
            { type: 'SPREAD RUMORS', icon: '🗣️', urgency: 'medium', impact: -6, color: '#FF6B6B', description: 'Gossip', isBad: true },
            { type: 'IGNORE THEM', icon: '🚫', urgency: 'low', impact: -4, color: '#FF9999', description: 'Exclusion', isBad: true },
            { type: 'TAKE MY MONEY', icon: '💸', urgency: 'high', impact: -10, color: '#CC0000', description: 'Theft', isBad: true },
            { type: 'SKIP WORK', icon: '🏃', urgency: 'medium', impact: -5, color: '#FF7777', description: 'Irresponsibility', isBad: true }
        ];
        
        this.citizenNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Sam', 'Quinn', 'Drew', 'Blake', 'Avery', 'Skylar'];
        this.citizenEmojis = ['👨', '👩', '🧑', '👱', '👨‍🦱', '👩‍🦱', '🧔', '👱‍♀️', '👨‍🦲', '👩‍🦲', '🧑‍🦰', '👨‍🦳'];
        
        // Handle for the round timer so it can be cleared. Leaving it unset was
        // what let intervals stack up across replays.
        this.loopId = null;

        this.bindControls();
    }

    // Bound exactly once, at construction. These elements live for the lifetime
    // of the page, so re-binding them per round only ever duplicated handlers.
    bindControls() {
        document.getElementById('nycBtn').addEventListener('click', () => this.startGame('nyc'));
        document.getElementById('sfBtn').addEventListener('click', () => this.startGame('sf'));
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        this.setupSoundControls();
    }
    
    startGame(difficulty) {
        this.difficulty = difficulty;
        document.getElementById('difficultyMenu').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        
        if (difficulty === 'sf') {
            document.getElementById('skyline').classList.add('hidden');
            document.getElementById('sf-skyline').classList.remove('hidden');
        } else {
            document.getElementById('skyline').classList.remove('hidden');
            document.getElementById('sf-skyline').classList.add('hidden');
        }
        
        // First real user gesture of the session - safe to unlock audio here.
        this.audioManager.resume();
        this.init();
    }
    
    setupSoundControls() {
        const soundToggle = document.getElementById('soundToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        
        soundToggle.addEventListener('click', () => {
            const isMuted = this.audioManager.toggleMute();
            soundToggle.classList.toggle('muted', isMuted);
            soundToggle.textContent = isMuted ? '🔇' : '🔊';
            
            if (!isMuted) {
                this.audioManager.startBackgroundMusic(this.difficulty);
            } else {
                this.audioManager.stopBackgroundMusic();
            }
        });
        
        volumeSlider.addEventListener('input', (e) => {
            this.audioManager.setVolume(e.target.value);
        });
    }
    
    init() {
        this.updateUI();
        this.audioManager.startBackgroundMusic(this.difficulty);
        this.startGameLoop();
        this.spawnCitizen();
    }
    
    startGameLoop() {
        this.stopGameLoop();
        this.loopId = setInterval(() => {
            if (!this.isGameOver) {
                this.gameTime++;
                this.updateUI();
                this.updateRequests();
                this.checkGameEnd();
                
                if (this.gameTime % 3 === 0) {
                    this.spawnCitizen();
                }
            }
        }, 1000);
    }
    
    stopGameLoop() {
        if (this.loopId !== null) {
            clearInterval(this.loopId);
            this.loopId = null;
        }
    }
    
    spawnCitizen() {
        if (this.citizens.length >= 8) return;
        
        let requestType;
        let availableRequests = [...this.goodRequestTypes];
        
        if (this.difficulty === 'sf') {
            if (Math.random() < 0.3) {
                availableRequests = [...this.badRequestTypes];
            }
        }
        
        requestType = availableRequests[Math.floor(Math.random() * availableRequests.length)];
        const name = this.citizenNames[Math.floor(Math.random() * this.citizenNames.length)];
        const emoji = this.citizenEmojis[Math.floor(Math.random() * this.citizenEmojis.length)];
        
        const timeByUrgency = {
            'low': 12,
            'medium': 10,
            'high': 8
        };
        
        const position = this.pickSpawnPosition();
        
        const citizen = {
            id: Date.now() + Math.random(),
            x: position.x,
            y: position.y,
            name: name,
            emoji: emoji,
            request: requestType,
            timeLeft: timeByUrgency[requestType.urgency],
            maxTime: timeByUrgency[requestType.urgency],
            fulfilled: false,
            mood: 'hopeful'
        };
        
        this.citizens.push(citizen);
        this.activeRequests.push(citizen);
        this.renderCitizen(citizen);
        this.updateRequestQueue();
    }
    
    // Picks a pixel position inside the street that fits a whole card and, where
    // possible, does not overlap an existing one. Rejection sampling with a
    // best-effort fallback: a crowded street should still place the citizen
    // rather than drop it.
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
    
    // Distance to the nearest existing card along whichever axis separates them
    // most. Negative means the boxes overlap.
    clearanceAt(candidate) {
        return this.citizens.reduce((closest, citizen) => {
            const gapX = Math.abs(citizen.x - candidate.x) - CARD_W;
            const gapY = Math.abs(citizen.y - candidate.y) - CARD_H;
            return Math.min(closest, Math.max(gapX, gapY));
        }, Infinity);
    }
    
    renderCitizen(citizen) {
        const streetContainer = document.getElementById('streetContainer');
        const citizenCard = document.createElement('div');
        citizenCard.className = 'citizen-card';
        citizenCard.id = `citizen-${citizen.id}`;
        citizenCard.style.left = `${citizen.x}px`;
        citizenCard.style.top = `${citizen.y}px`;
        citizenCard.style.backgroundColor = citizen.request.color;
        citizenCard.style.opacity = '0.9';
        
        if (citizen.request.isBad) {
            citizenCard.classList.add('bad-request');
            citizenCard.style.border = '3px dashed #CC0000';
        }
        
        citizenCard.innerHTML = `
            <div class="citizen-avatar">${citizen.emoji}</div>
            <div class="citizen-name">${citizen.name}</div>
            <div class="citizen-mood">${citizen.request.description}</div>
        `;
        
        const badge = document.createElement('div');
        badge.className = 'request-badge';
        badge.textContent = citizen.request.icon;
        citizenCard.appendChild(badge);
        
        if (citizen.request.urgency === 'high') {
            citizenCard.classList.add('urgent');
        }
        
        const bubble = document.createElement('div');
        bubble.className = 'request-bubble';
        bubble.textContent = citizen.request.type;
        if (citizen.request.isBad) {
            bubble.style.background = '#FF4444';
            bubble.style.color = 'white';
        }
        citizenCard.appendChild(bubble);
        
        citizenCard.style.cursor = 'pointer';
        citizenCard.style.transition = 'all 0.3s ease';
        citizenCard.addEventListener('mouseenter', () => {
            citizenCard.style.transform = 'scale(1.1)';
            citizenCard.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });
        citizenCard.addEventListener('mouseleave', () => {
            citizenCard.style.transform = 'scale(1)';
            citizenCard.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });
        citizenCard.addEventListener('click', () => this.fulfillRequest(citizen.id));
        
        streetContainer.appendChild(citizenCard);
    }
    
    fulfillRequest(citizenId) {
        const citizen = this.citizens.find(c => c.id === citizenId);
        if (!citizen || citizen.fulfilled) return;
        
        citizen.fulfilled = true;
        this.requestsFulfilled++;
        this.communityScore += citizen.request.impact;
        this.communityScore = Math.min(100, this.communityScore);
        
        if (citizen.request.isBad) {
            this.audioManager.playBadRequestSound();
        } else {
            this.audioManager.playFulfillmentSound();
        }
        
        const element = document.getElementById(`citizen-${citizenId}`);
        if (element) {
            element.classList.add('fulfilled-effect');
            this.createParticles(element, 'heart', 5);
            setTimeout(() => element.remove(), 600);
        }
        
        this.citizens = this.citizens.filter(c => c.id !== citizenId);
        this.activeRequests = this.activeRequests.filter(r => r.id !== citizenId);
        
        this.updateUI();
        this.updateRequestQueue();
        this.updateCityAppearance();
    }
    
    updateRequests() {
        this.citizens.forEach(citizen => {
            if (!citizen.fulfilled) {
                citizen.timeLeft--;
                
                if (citizen.timeLeft <= 0) {
                    this.ignoreRequest(citizen.id);
                } else if (citizen.timeLeft <= 3) {
                    const element = document.getElementById(`citizen-${citizen.id}`);
                    if (element && !element.classList.contains('urgent')) {
                        element.classList.add('urgent');
                    }
                }
            }
        });
        
        this.updateRequestQueue();
    }
    
    ignoreRequest(citizenId) {
        const citizen = this.citizens.find(c => c.id === citizenId);
        if (!citizen || citizen.fulfilled) return;
        
        citizen.fulfilled = true;
        this.requestsIgnored++;
        
        if (citizen.request.isBad) {
            this.audioManager.playFulfillmentSound();
            this.communityScore += 3;
        } else {
            this.audioManager.playIgnoreSound();
            this.communityScore -= 5;
        }
        
        this.communityScore = Math.max(0, Math.min(100, this.communityScore));
        
        const element = document.getElementById(`citizen-${citizenId}`);
        if (element) {
            element.classList.add('ignored-effect');
            this.createParticles(element, 'sad', 3);
            setTimeout(() => element.remove(), 800);
        }
        
        this.citizens = this.citizens.filter(c => c.id !== citizenId);
        this.activeRequests = this.activeRequests.filter(r => r.id !== citizenId);
        
        this.updateUI();
        this.updateRequestQueue();
        this.updateCityAppearance();
    }
    
    createParticles(element, type, count) {
        const rect = element.getBoundingClientRect();
        const container = document.getElementById('streetContainer');
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${type}`;
            
            if (type === 'heart') {
                particle.textContent = '❤️';
            } else if (type === 'star') {
                particle.textContent = '⭐';
            } else if (type === 'sad') {
                particle.textContent = '💔';
            }
            
            particle.style.left = `${rect.left - container.getBoundingClientRect().left}px`;
            particle.style.top = `${rect.top - container.getBoundingClientRect().top}px`;
            
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }
    
    // Reconciles the queue against this.activeRequests instead of clearing and
    // rebuilding it. The old version wiped innerHTML every tick, which restarted
    // the slideIn animation on every row once a second and rebuilt the whole
    // subtree for what is usually a one-character change.
    updateRequestQueue() {
        const queueContainer = document.getElementById('activeRequests');
        const live = new Set();
        
        this.activeRequests.forEach(citizen => {
            const rowId = `request-${citizen.id}`;
            live.add(rowId);
            
            let row = document.getElementById(rowId);
            if (!row) {
                row = this.createRequestRow(citizen, rowId);
                queueContainer.appendChild(row);
            }
            
            row.classList.toggle('urgent', citizen.timeLeft <= 3);
            row.querySelector('.request-item-time').textContent = `${citizen.timeLeft}s`;
            row.querySelector('.request-item-bar-fill').style.width =
                `${(citizen.timeLeft / citizen.maxTime) * 100}%`;
        });
        
        Array.from(queueContainer.children).forEach(row => {
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
                <span><strong>${citizen.name}</strong></span>
                <span class="request-item-time"></span>
            </div>
            <div class="request-item-type">${citizen.request.icon} ${citizen.request.type}</div>
            <div class="request-item-bar">
                <div class="request-item-bar-fill"></div>
            </div>
        `;
        return row;
    }
    
    updateCityAppearance() {
        const skyscrapers = document.querySelectorAll('.skyscraper');
        const sfBuildings = document.querySelectorAll('.sf-building');
        const trees = document.querySelectorAll('.tree');
        
        skyscrapers.forEach(building => {
            building.classList.remove('depressed', 'vibrant');
        });
        
        sfBuildings.forEach(building => {
            building.classList.remove('depressed', 'vibrant');
        });
        
        trees.forEach(tree => {
            tree.classList.remove('depressed', 'vibrant');
        });
        
        if (this.communityScore < 30) {
            skyscrapers.forEach(building => building.classList.add('depressed'));
            sfBuildings.forEach(building => building.classList.add('depressed'));
            trees.forEach(tree => tree.classList.add('depressed'));
        } else if (this.communityScore > 70) {
            skyscrapers.forEach(building => building.classList.add('vibrant'));
            sfBuildings.forEach(building => building.classList.add('vibrant'));
            trees.forEach(tree => tree.classList.add('vibrant'));
        }
    }
    
    updateUI() {
        document.getElementById('communityScore').textContent = this.communityScore;
        document.getElementById('requestsFulfilled').textContent = this.requestsFulfilled;
        document.getElementById('requestsIgnored').textContent = this.requestsIgnored;
        document.getElementById('timeRemaining').textContent =
            Math.max(0, ROUND_SECONDS - this.gameTime);
    }
    
    checkGameEnd() {
        if (this.gameTime >= ROUND_SECONDS) {
            this.endGame();
        }
    }
    
    endGame() {
        this.isGameOver = true;
        this.stopGameLoop();
        this.audioManager.stopBackgroundMusic();
        this.audioManager.playGameOverSound();
        
        const modal = document.getElementById('endGameModal');
        const scene = document.getElementById('endGameScene');
        const finalStats = document.getElementById('finalStats');
        
        let endingText = '';
        if (this.communityScore >= 80) {
            endingText = '🌟 Your community thrives! Citizens help each other, streets are clean, and there\'s a sense of belonging. You built a vibrant, caring neighborhood where everyone looks out for one another.';
        } else if (this.communityScore >= 60) {
            endingText = '👍 Your community is balanced. Some people help, others keep to themselves. The city functions adequately, though there\'s room for more connection and care.';
        } else if (this.communityScore >= 40) {
            endingText = '😐 Your community struggles. People mostly ignore each other, the streets feel lonely, and requests often go unanswered. There\'s a noticeable lack of community spirit.';
        } else {
            endingText = '💔 Your community has broken down. Citizens avoid eye contact, help is rare, and the city feels cold and unwelcoming. The tiny promises that could have connected people were left unfulfilled.';
        }
        
        scene.textContent = endingText;
        
        finalStats.innerHTML = `
            <h3>Final Statistics</h3>
            <p><strong>Community Score:</strong> ${this.communityScore}/100</p>
            <p><strong>Requests Fulfilled:</strong> ${this.requestsFulfilled}</p>
            <p><strong>Requests Ignored:</strong> ${this.requestsIgnored}</p>
            <p><strong>Response Rate:</strong> ${this.requestsFulfilled + this.requestsIgnored > 0 ? Math.round((this.requestsFulfilled / (this.requestsFulfilled + this.requestsIgnored)) * 100) : 0}%</p>
        `;
        
        modal.classList.remove('hidden');
    }
    
    restartGame() {
        this.communityScore = 50;
        this.requestsFulfilled = 0;
        this.requestsIgnored = 0;
        this.citizens = [];
        this.activeRequests = [];
        this.gameTime = 0;
        this.isGameOver = false;
        
        this.stopGameLoop();
        this.audioManager.stopBackgroundMusic();
        
        document.getElementById('streetContainer').innerHTML = '';
        document.getElementById('activeRequests').innerHTML = '';
        document.getElementById('endGameModal').classList.add('hidden');
        document.getElementById('gameContainer').classList.add('hidden');
        document.getElementById('difficultyMenu').classList.remove('hidden');
        
        this.updateUI();
        this.updateCityAppearance();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CityOfTinyPromises();
});
