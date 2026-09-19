// ============================================
// ANIPULSE - Ultra Cyberpunk Anime Engine
// Powered by Jikan API v4 (Free, No Key)
// ============================================

// DOM References
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const loaderBox = document.getElementById('loaderBox');
const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');
const sectionTitle = document.getElementById('sectionTitle');
const resultCount = document.getElementById('resultCount');
const filterChips = document.querySelectorAll('.chip');

// Modal DOM
const animeModal = document.getElementById('animeModal');
const closeModalBtn = document.getElementById('closeModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalPoster = document.getElementById('modalPoster');
const modalRank = document.getElementById('modalRank');
const modalTitle = document.getElementById('modalTitle');
const modalTitleEng = document.getElementById('modalTitleEng');
const modalType = document.getElementById('modalType');
const modalScore = document.getElementById('modalScore');
const modalEpisodes = document.getElementById('modalEpisodes');
const modalStatus = document.getElementById('modalStatus');
const modalYear = document.getElementById('modalYear');
const genreTags = document.getElementById('genreTags');
const modalSynopsis = document.getElementById('modalSynopsis');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const malLink = document.getElementById('malLink');
const trailerBtn = document.getElementById('trailerBtn');
const trailerSection = document.getElementById('trailerSection');
const trailerFrame = document.getElementById('trailerFrame');
const closeTrailerBtn = document.getElementById('closeTrailer');

// Nav Buttons
const randomBtn = document.getElementById('randomBtn');
const watchlistBtn = document.getElementById('watchlistBtn');
const savedCountEl = document.getElementById('savedCount');

// App State
let watchlist = JSON.parse(localStorage.getItem('aniPulse_v2_watchlist')) || [];
let activeAnime = null;
let searchTimer = null;

// ============================================
// LOADING SCREEN ANIMATION
// ============================================
const loadingMessages = [
    'INITIALIZING NEURAL NETWORK...',
    'CONNECTING TO ANIME DATABASE...',
    'DECRYPTING WATCHLIST VAULT...',
    'LOADING CYBERPUNK INTERFACE...',
    'SYSTEM READY.'
];

function runLoadingScreen() {
    const bar = document.getElementById('loadingBar');
    const status = document.getElementById('loadingStatus');
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');

    let progress = 0;
    let msgIndex = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 25;
        if (progress > 100) progress = 100;
        bar.style.width = progress + '%';

        if (msgIndex < loadingMessages.length) {
            status.textContent = loadingMessages[msgIndex];
            msgIndex++;
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                appContainer.style.opacity = '1';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 800);
            }, 500);
        }
    }, 300);
}

// ============================================
// MATRIX RAIN CANVAS
// ============================================
function initMatrixRain() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ0123456789ABCDEF';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(0);

    function drawMatrix() {
        ctx.fillStyle = 'rgba(5, 6, 15, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00f3ff';
        ctx.font = `${fontSize}px monospace`;
        drops.forEach((y, i) => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(char, i * fontSize, y * fontSize);
            if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            else drops[i]++;
        });
    }

    setInterval(drawMatrix, 60);
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ============================================
// FETCH ANIME DATA (Jikan API v4)
// ============================================
async function fetchAnimeList(type = 'top') {
    showLoader();
    const endpoints = {
        top: { url: 'https://api.jikan.moe/v4/top/anime?limit=24', title: 'TOP_RATED.db' },
        airing: { url: 'https://api.jikan.moe/v4/top/anime?filter=airing&limit=24', title: 'AIRING_NOW.db' },
        upcoming: { url: 'https://api.jikan.moe/v4/top/anime?filter=upcoming&limit=24', title: 'UPCOMING.db' },
        movie: { url: 'https://api.jikan.moe/v4/top/anime?type=movie&limit=24', title: 'MOVIES.db' },
        bypopularity: { url: 'https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=24', title: 'TRENDING.db' }
    };

    const { url, title } = endpoints[type] || endpoints.top;
    sectionTitle.textContent = title;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API Failed');
        const data = await res.json();
        renderGrid(data.data || []);
    } catch (err) {
        showError('DATABASE CONNECTION FAILED. RETRY.');
    } finally {
        hideLoader();
    }
}

async function searchAnime(query) {
    showLoader();
    sectionTitle.textContent = `SEARCH: "${query.toUpperCase()}"`;
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=24&sfw=true`);
        const data = await res.json();
        renderGrid(data.data || []);
    } catch (err) {
        showError('SEARCH FAILED. CHECK CONNECTION.');
    } finally {
        hideLoader();
    }
}

async function fetchRandom() {
    showLoader();
    try {
        const res = await fetch('https://api.jikan.moe/v4/random/anime');
        const data = await res.json();
        if (data.data) openModal(data.data);
    } catch (err) {
        showError('RANDOM FETCH FAILED.');
    } finally {
        hideLoader();
    }
}

// ============================================
// RENDER ANIME GRID
// ============================================
function renderGrid(animeList) {
    animeGrid.innerHTML = '';
    errorBox.classList.add('hidden');

    if (animeList.length === 0) {
        animeGrid.innerHTML = `<p style="color:var(--text-muted);font-family:var(--font-mono);padding:40px;letter-spacing:2px;">NO RESULTS FOUND IN DATABASE.</p>`;
        resultCount.textContent = '0 RESULTS';
        return;
    }

    resultCount.textContent = `${animeList.length} RESULTS`;

    animeList.forEach((anime, index) => {
        const card = document.createElement('div');
        card.className = 'anime-card';

        const imgUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
        const score = anime.score ? `⭐ ${anime.score}` : 'N/A';
        const type = anime.type || 'ANIME';
        const episodes = anime.episodes ? `${anime.episodes} EPS` : '? EPS';

        card.innerHTML = `
            <div style="position:relative;overflow:hidden;height:300px;">
                <img class="card-img" src="${imgUrl}" alt="${anime.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300/090a0f/00f3ff?text=NO+IMG'">
                <div class="card-overlay"></div>
                <div class="card-badges">
                    <span class="badge-score">${score}</span>
                    <span class="badge-type">${type}</span>
                </div>
                <span class="card-rank">#${index + 1}</span>
                <div class="card-info">
                    <h3 class="card-title">${anime.title}</h3>
                    <div class="card-meta">
                        <span>${episodes}</span>
                        <span>${anime.year || '?'}</span>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(anime, index + 1));

        // 3D Tilt Effect
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translateY(-10px) perspective(500px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });

        animeGrid.appendChild(card);
    });
}

// ============================================
// MODAL OPEN/CLOSE
// ============================================
function openModal(anime, rank = null) {
    activeAnime = anime;

    const imgUrl = anime.images?.jpg?.large_image_url || '';
    modalBackdrop.style.backgroundImage = `url(${imgUrl})`;
    modalPoster.src = imgUrl;
    modalRank.textContent = rank ? `#${rank}` : '#?';
    modalTitle.textContent = anime.title || 'Unknown Title';
    modalTitleEng.textContent = anime.title_english || '';
    modalType.textContent = `// ${(anime.type || 'ANIME').toUpperCase()}`;
    modalScore.textContent = anime.score || 'N/A';
    modalEpisodes.textContent = anime.episodes ? `${anime.episodes} Episodes` : 'Ongoing';
    modalStatus.textContent = anime.status || 'Unknown';
    modalYear.textContent = anime.year || 'Unknown Year';
    modalSynopsis.textContent = anime.synopsis || 'No synopsis available.';
    malLink.href = anime.url || '#';

    // Genre Tags
    genreTags.innerHTML = '';
    if (anime.genres && anime.genres.length > 0) {
        anime.genres.slice(0, 6).forEach(genre => {
            const tag = document.createElement('span');
            tag.className = 'genre-tag';
            tag.textContent = genre.name;
            genreTags.appendChild(tag);
        });
    }

    // Trailer button
    trailerSection.classList.add('hidden');
    trailerFrame.innerHTML = '';

    if (anime.trailer?.embed_url) {
        trailerBtn.style.display = 'inline-flex';
    } else {
        trailerBtn.style.display = 'none';
    }

    updateSaveButton();
    animeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    animeModal.classList.add('hidden');
    trailerFrame.innerHTML = '';
    trailerSection.classList.add('hidden');
    document.body.style.overflow = '';
    activeAnime = null;
}

// ============================================
// WATCHLIST LOGIC
// ============================================
function toggleWatchlist() {
    if (!activeAnime) return;
    const idx = watchlist.findIndex(a => a.mal_id === activeAnime.mal_id);
    if (idx > -1) {
        watchlist.splice(idx, 1);
    } else {
        watchlist.push(activeAnime);
    }
    localStorage.setItem('aniPulse_v2_watchlist', JSON.stringify(watchlist));
    updateSaveButton();
    savedCountEl.textContent = watchlist.length;
}

function updateSaveButton() {
    if (!activeAnime) return;
    const saved = watchlist.some(a => a.mal_id === activeAnime.mal_id);
    if (saved) {
        modalSaveBtn.innerHTML = `<i class="fa-solid fa-heart-circle-check"></i> IN VAULT`;
        modalSaveBtn.style.background = 'rgba(191, 0, 255, 0.3)';
        modalSaveBtn.style.borderColor = 'var(--neon-purple)';
        modalSaveBtn.style.color = 'var(--neon-purple)';
    } else {
        modalSaveBtn.innerHTML = `<i class="fa-solid fa-heart"></i> ADD TO VAULT`;
        modalSaveBtn.style.background = '';
        modalSaveBtn.style.borderColor = '';
        modalSaveBtn.style.color = '';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    runLoadingScreen();
    initMatrixRain();
    fetchAnimeList('top');
    savedCountEl.textContent = watchlist.length;
});

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        fetchAnimeList(chip.dataset.type);
    });
});

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length > 2) {
        searchTimer = setTimeout(() => searchAnime(q), 500);
    } else if (q.length === 0) {
        fetchAnimeList('top');
    }
});

randomBtn.addEventListener('click', fetchRandom);
watchlistBtn.addEventListener('click', () => {
    sectionTitle.textContent = 'MY_VAULT.db';
    renderGrid(watchlist);
});

closeModalBtn.addEventListener('click', closeModal);
animeModal.addEventListener('click', (e) => {
    if (e.target === animeModal) closeModal();
});

modalSaveBtn.addEventListener('click', toggleWatchlist);

trailerBtn.addEventListener('click', () => {
    if (activeAnime?.trailer?.embed_url) {
        trailerSection.classList.remove('hidden');
        trailerFrame.innerHTML = `<iframe src="${activeAnime.trailer.embed_url}" allowfullscreen></iframe>`;
        trailerSection.scrollIntoView({ behavior: 'smooth' });
    }
});

closeTrailerBtn.addEventListener('click', () => {
    trailerSection.classList.add('hidden');
    trailerFrame.innerHTML = '';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================
// STATUS HELPERS
// ============================================
function showLoader() {
    loaderBox.classList.remove('hidden');
    animeGrid.innerHTML = '';
    errorBox.classList.add('hidden');
}

function hideLoader() { loaderBox.classList.add('hidden'); }

function showError(msg) {
    hideLoader();
    errorBox.classList.remove('hidden');
    errorText.textContent = msg;
}
