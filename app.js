// GANTI DENGAN API KEY ANDA YANG BARU!
const API_KEY = "AIzaSyC_da1cPftXptl0VRCGn5GlMIfdg6O3m9U"; 

// Database lirik palsu telah dihapus.
// Lirik sekarang akan diambil secara otomatis via API public.

// === Variabel Global ===
let player;         // Player audio (tersembunyi)
let modalPlayer;    // Player video (di modal)
let currentQueue = [];
let currentIndex = 0;

// === DOM Elements ===
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const playerBar = document.getElementById("playerBar");
const playerArt = document.getElementById("playerArt");
const playerTitle = document.getElementById("playerTitle");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");

// !! BARU: Modal Elements !!
const videoModal = document.getElementById("videoModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const playerAlbumTrigger = document.getElementById("playerAlbumTrigger");

// !! BARU: Sidebar Elements !!
const leftSidebar = document.getElementById("leftSidebar");
const sidebarContent = document.getElementById("sidebarContent");
const navTrending = document.getElementById("navTrending");
const navPlaylist = document.getElementById("navPlaylist");
const navHistory = document.getElementById("navHistory");

// !! BARU: Auth Elements !!
function onYouTubeIframeAPIReady() {
    console.log("YouTube API is Ready");
function onPlayerReady() {
    player.setVolume(50); // volume awal 50%
}
    
    // Player 1: Audio (Tersembunyi)
    player = new YT.Player("player", {
        height: "1", width: "1",
        playerVars: { 'playsinline': 1, 'autoplay': 0, 'controls': 0 }, // Set autoplay ke 0 (false) untuk mencegah putar otomatis saat API Ready
        events: {
            'onReady': () => console.log("Audio Player Siap"),
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    const icon = playPauseBtn.querySelector('i');
    if (event.data == YT.PlayerState.PLAYING) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
    if (event.data == YT.PlayerState.ENDED) {
        playNext();
    }
}

const volumeSlider = document.getElementById("volumeSlider");

volumeSlider.addEventListener("input", () => {
    if (player) player.setVolume(volumeSlider.value);
    if (modalPlayer) modalPlayer.setVolume(volumeSlider.value);
});



// === Fungsi Pencarian ===
async function searchVideos(customQuery = null) {
    // Use custom parameter if provided, else use input value. Skip alert if both empty.
    const queryBase = customQuery !== null && typeof customQuery === 'string' ? customQuery : searchInput.value;
    if (!queryBase) return; 
    
    // Adjust algorithm parameter based on logged in user's preference
    let algorithmAddon = "";
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.preference) {
        algorithmAddon = ` ${currentUser.preference}`;
    }
    
    const query = `${queryBase}${algorithmAddon}`;
    
    results.innerHTML = "<p>Mencari...</p>";
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&q=${encodeURIComponent(query)} audio&key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Cek Error API
        if (data.error) {
            results.innerHTML = `<p style="color:red;">Error API: ${data.error.message}. Cek API Key/Kuota.</p>`;
            throw new Error(data.error.message);
        }
        
        currentQueue = data.items;
        displayResults(data.items);
        
        // Otomatis putar lagu pertama dari hasil pencarian
        if (currentQueue.length > 0) {
            playTrack(0);
        }
        
    } catch (error) {
        console.error("Error fetching data:", error);
        // results.innerHTML sudah diupdate di blok if (data.error)
    }
}

// === Menampilkan Hasil ===
function displayResults(items) {
    results.innerHTML = "";
    if (items.length === 0) {
        results.innerHTML = "<p>Tidak ada hasil ditemukan.</p>";
        return;
    }
    items.forEach((video, index) => {
        const div = document.createElement("div");
        div.className = "video-card glass-effect ripple-btn";
        div.innerHTML = `
            <img src="${video.snippet.thumbnails.medium.url}" class="thumbnail" alt="${video.snippet.title}" onerror="this.onerror=null; this.src='https://placehold.co/250x140/1e293b/cbd5e1?text=No+Image';">
            <h4>${video.snippet.title}</h4>
        `;
        div.onclick = () => {
            playTrack(index);
        };
        results.appendChild(div);
    });
}

// Side-bar mobile toggle logic
const hamburgerMenu = document.querySelector('.hamburger-menu');
if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', () => {
        leftSidebar.classList.toggle('open');
    });
}

// Close sidebar on mobile when a link is clicked
[navTrending, navPlaylist, navHistory].forEach(nav => {
    nav.addEventListener('click', () => {
        if(window.innerWidth <= 768) {
             leftSidebar.classList.remove('open');
        }
    });
});

// Fungsi updateQueueSidebar() Dihapus

// === Fungsi Kontrol Player ===
function playTrack(index) {
    if (!player || typeof player.loadVideoById !== 'function') {
        console.error("Player audio belum siap!");
        return;
    }

    // Pastikan index valid dan ada di antrian
    if (index < 0) index = currentQueue.length - 1; // Kembali ke lagu terakhir
    if (index >= currentQueue.length) index = 0; // Kembali ke lagu pertama
    
    currentIndex = index;
    const video = currentQueue[currentIndex];

    // Tambahkan ke History Tontonan
    if (typeof addToHistory === 'function') {
        addToHistory(video);
    }

    // Load video baru dan langsung putar (autoplay)
    player.loadVideoById(video.id.videoId, 0, 'small'); // Kualitas audio rendah untuk efisiensi

    // Update UI Player Bar
    playerArt.src = video.snippet.thumbnails.medium.url;
    playerTitle.innerText = video.snippet.title;
    playerBar.dataset.cleanTitle = video.snippet.title.toUpperCase(); 
    playerBar.style.display = 'flex';
    
    // Check if liked
    updateLikeButtonState(video.id.videoId);
}

function togglePlayPause() {
    if (!player || typeof player.getPlayerState !== 'function') return;
    const state = player.getPlayerState();
    if (state == YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
}
function playNext() { playTrack(currentIndex + 1); }
function playPrevious() { playTrack(currentIndex - 1); }

// === LOGIKA MODAL (Pop-up) ===
function openModal() {
    if (currentQueue.length === 0) return;

    // Ambil video & waktu saat ini dari Player 1
    const currentVideo = currentQueue[currentIndex];
    const currentTime = player.getCurrentTime();
    
    // **PENTING: Jeda Player 1 (Audio) sebelum membuka modal video**
    player.pauseVideo(); 

    // Tampilkan modal
    videoModal.style.display = 'flex';
    
    // Logika Pencarian Lirik Otomatis (Auto Lyrics)
    const lyricsText = document.getElementById('lyricsText');
    const cleanTitle = playerTitle.innerText || playerBar.dataset.cleanTitle;
    lyricsText.innerHTML = "Mencari lirik otomatis...";
    
    // Menggunakan API public kesediaan lirik (contoh: lrclib.net as it's free and doesn't require keys for basic search)
    // We need to clean the track title from typical YouTube suffixes like "Official Video", etc.
    const searchTitle = cleanTitle.replace(/\[.*?\]|\(.*?\)|official|video|audio|explicit|music|lyric|lyrics/gi, '').trim();

    fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchTitle)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0 && (data[0].syncedLyrics || data[0].plainLyrics)) {
                const lyrics = data[0].syncedLyrics || data[0].plainLyrics;
                // Basic cleaning if it's synced lyrics (remove timestamps)
                const cleanLyrics = lyrics.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '');
                lyricsText.innerHTML = cleanLyrics.replace(/\n/g, '<br>');
            } else {
                lyricsText.innerHTML = "Lirik otomatis tidak ditemukan untuk lagu ini.";
            }
        })
        .catch(err => {
            console.error("Error fetching lyrics:", err);
            lyricsText.innerHTML = "Gagal mengambil lirik otomatis. Silakan coba lagi nanti.";
        });

    // --- Logika player modal ---
    if (!modalPlayer) {
        // Buat player modal jika belum ada
        modalPlayer = new YT.Player('modalVideoPlayer', {
            height: '100%',
            width: '100%',
            playerVars: {
                'playsinline': 1,
                'controls': 1,
                'autoplay': 1 
            },
            events: {
                'onReady': (e) => {
                    e.target.loadVideoById({
                        videoId: currentVideo.id.videoId,
                        startSeconds: currentTime // Sinkronisasi waktu
                    });
                }
            }
        });
    } else {
        // Jika player sudah ada, load dan sinkronkan
        modalPlayer.loadVideoById({
            videoId: currentVideo.id.videoId,
            startSeconds: currentTime
        });
    }
}

function closeModal() {
    videoModal.style.display = 'none';
    
    // **PENTING: Hentikan video di modal agar tidak ada 2 suara**
    if (modalPlayer && typeof modalPlayer.stopVideo === 'function') {
        modalPlayer.stopVideo();
    }
    
    // Lanjutkan putar audio di Player 1 dari waktu terakhir modal
    if (player && typeof player.playVideo === 'function') {
        // Ambil waktu terakhir dari modal (jika modalPlayer sudah dibuat)
        const resumeTime = modalPlayer ? modalPlayer.getCurrentTime() : player.getCurrentTime();
        player.seekTo(resumeTime, true);
        player.playVideo();
    }
}

// === Event Listeners ===
searchBtn.addEventListener("click", searchVideos);
searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") searchVideos();
});

// Player Bar Controls
playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrevious);

// Modal Listeners
document.getElementById("lyricsBtn").addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

// Tutup modal jika klik di luar
videoModal.addEventListener('click', (event) => {
    if (event.target === videoModal) {
        closeModal();
    }
});

// === MOCK AUTHENTICATION & SECURITY LOGIC ===
let isRegisterMode = false;
let currentUser = null;

// Load users and current user from localStorage
const loadUsers = () => JSON.parse(localStorage.getItem('ytUsers')) || {};
const saveUsers = (users) => localStorage.setItem('ytUsers', JSON.stringify(users));

// Basic Mock hashing to simulate security
const mockHash = (str) => btoa(str).split('').reverse().join('');

function checkAuth() {
    const session = localStorage.getItem('ytSession');
    if (session) {
        currentUser = JSON.parse(session);
        if (userGreeting) {
            userGreeting.innerText = `Halo, ${currentUser.username}`;
            userGreeting.style.display = 'inline-block';
        }
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        currentUser = null;
        if (userGreeting) userGreeting.style.display = 'none';
        if (authBtn) authBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

if (authBtn) {
    authBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
    });
}

if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
    });
}

if (toggleAuthMode) {
    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authTitle.innerText = "Register";
            toggleAuthMode.innerText = "Sudah punya akun? Login";
            registerFields.style.display = 'block';
        } else {
            authTitle.innerText = "Login";
            toggleAuthMode.innerText = "Belum punya akun? Daftar";
            registerFields.style.display = 'none';
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ytSession');
        checkAuth();
        alert('Anda berhasil logout.');
    });
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = authUsername.value.trim();
        const password = mockHash(authPassword.value);
        const preference = authPreference.value;

        const users = loadUsers();

        if (isRegisterMode) {
            if (users[username]) {
                alert('Username sudah terdaftar!');
                return;
            }
            users[username] = { password, preference };
            saveUsers(users);
            alert('Registrasi berhasil! Silakan login.');
            isRegisterMode = false;
            authTitle.innerText = "Login";
            toggleAuthMode.innerText = "Belum punya akun? Daftar";
            registerFields.style.display = 'none';
            authPassword.value = "";
        } else {
            if (users[username] && users[username].password === password) {
                // Login sukses
                localStorage.setItem('ytSession', JSON.stringify({ username, preference: users[username].preference }));
                checkAuth();
                authModal.style.display = 'none';
                alert('Login berhasil!');
            } else {
                alert('Username atau password salah!');
            }
        }
    });
}

// Run auth check on load
checkAuth();

// === LIQUID RIPPLE EFFECT LOGIC ===
document.addEventListener('click', function (e) {
    const rippleBtn = e.target.closest('.ripple-btn');
    if (rippleBtn) {
        createRipple(e, rippleBtn);
    }
});

function createRipple(event, button) {
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    // Offset click position somewhat due to fixed button positioning
    const clientX = event.clientX;
    const clientY = event.clientY;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${clientX - rect.left - radius}px`;
    circle.style.top = `${clientY - rect.top - radius}px`;
    circle.classList.add('ripple-span');

    const ripple = button.querySelector('.ripple-span');
    if (ripple) {
        ripple.remove();
    }

    button.appendChild(circle);
}

// Close Auth Modal on Outside Click
if (authModal) {
    authModal.addEventListener('click', (event) => {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
}

// === PLAYLIST (LIKES) & SIDEBAR ROUTING LOGIC ===
const getPlaylist = () => JSON.parse(localStorage.getItem('ytPlaylist')) || [];
const savePlaylist = (list) => localStorage.setItem('ytPlaylist', JSON.stringify(list));

const likeBtn = document.getElementById("likeBtn");
if (likeBtn) {
    likeBtn.addEventListener('click', () => {
        if (currentQueue.length > 0) {
            const currentVideo = currentQueue[currentIndex];
            let list = getPlaylist();
            const exists = list.findIndex(v => v.id.videoId === currentVideo.id.videoId);
            if (exists >= 0) {
                list.splice(exists, 1);
                likeBtn.classList.remove('liked');
                likeBtn.querySelector('i').classList.replace('fas', 'far');
            } else {
                list.unshift(currentVideo);
                likeBtn.classList.add('liked');
                likeBtn.querySelector('i').classList.replace('far', 'fas');
            }
            savePlaylist(list);
            
            // Perbarui sidebar seketika jika tab Playlist sedang aktif
            if (navPlaylist.classList.contains('active')) {
                renderSidebarList(getPlaylist(), "Playlist Kosong. Tambahkan lagu yang kamu suka!");
            }
        }
    });
}

function updateLikeButtonState(videoId) {
    if(!likeBtn) return;
    const list = getPlaylist();
    const isLiked = list.some(v => v.id.videoId === videoId);
    if(isLiked){
        likeBtn.classList.add('liked');
        likeBtn.querySelector('i').classList.replace('far', 'fas');
    }else{
        likeBtn.classList.remove('liked');
        likeBtn.querySelector('i').classList.replace('fas', 'far');
    }
}

// === HISTORY LOGIC ===
const loadHistory = () => JSON.parse(localStorage.getItem('ytHistory')) || [];
const saveHistory = (history) => localStorage.setItem('ytHistory', JSON.stringify(history));

function addToHistory(video) {
    let history = loadHistory();
    history = history.filter(v => v.id.videoId !== video.id.videoId);
    history.unshift(video);
    if (history.length > 30) history.pop(); 
    saveHistory(history);
    
    // Perbarui otomatis jika sedang di tab History
    if (navHistory.classList.contains('active')) {
        renderSidebarList(loadHistory(), "Belum ada riwayat tontonan.");
    }
}

function renderSidebarList(items, emptyMsg) {
    sidebarContent.innerHTML = '';
    
    if(items.length === 0){
        sidebarContent.innerHTML = `<p style="padding:15px; color:#94a3b8; font-size:0.9rem; text-align:center;">${emptyMsg}</p>`;
        return;
    }
    
    items.forEach(video => {
        const div = document.createElement("div");
        div.className = "sidebar-video-item ripple-btn";
        div.innerHTML = `
            <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" onerror="this.onerror=null; this.src='https://placehold.co/60x34/1e293b/cbd5e1';">
            <h4>${video.snippet.title}</h4>
        `;
        div.onclick = () => {
            currentQueue = [video];
            playTrack(0);
        };
        sidebarContent.appendChild(div);
    });
}

function setActiveNav(selectedNav) {
    [navTrending, navPlaylist, navHistory].forEach(nav => nav.classList.remove('active'));
    selectedNav.classList.add('active');
}

// Event Listeners for Sidebar Tabs
navTrending.addEventListener('click', () => {
    setActiveNav(navTrending);
    sidebarContent.innerHTML = '<p style="padding:15px; text-align:center; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Memuat...</p>';
    // Gunakan fungsi pencarian dengan query statik atau hit API trending
    // Karena API search normal tidak murni trending, kita spoof dengan query populer
    searchVideos("indonesia populer music hits official");
    // Setelah render di main container, kita juga bisa tampilkan sekilas (misal 5 teratas) di sidebar
    setTimeout(()=>{
        renderSidebarList(currentQueue.slice(0, 5), "Tidak ada trending.");
    }, 1500);
});

navPlaylist.addEventListener('click', () => {
    setActiveNav(navPlaylist);
    renderSidebarList(getPlaylist(), "Playlist kamu masih kosong. Tekan tombol <i class='far fa-heart'></i> pada pemutar.");
});

navHistory.addEventListener('click', () => {
    setActiveNav(navHistory);
    sidebarContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 0 5px 10px; margin-bottom: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1);">
            <span style="font-size:0.8rem; color:#94a3b8;">Baru saja diputar</span>
            <button id="clearHistoryBtn" style="background:#e11d48; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Hapus</button>
        </div>
    `;
    
    // Bind the inner clear history button
    document.getElementById("clearHistoryBtn").addEventListener('click', () => {
        localStorage.removeItem('ytHistory');
        renderSidebarList([], "Belum ada riwayat tontonan.");
    });
    
    // Render the rest of history
    const historyItems = loadHistory();
    const listContainer = document.createElement("div");
    sidebarContent.appendChild(listContainer);
    
    if(historyItems.length === 0){
        listContainer.innerHTML = `<p style="padding:15px; color:#94a3b8; font-size:0.9rem; text-align:center;">Belum ada riwayat tontonan.</p>`;
    } else {
        historyItems.forEach(video => {
            const div = document.createElement("div");
            div.className = "sidebar-video-item ripple-btn";
            div.innerHTML = `
                <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" onerror="this.onerror=null; this.src='https://placehold.co/60x34/1e293b/cbd5e1';">
                <h4>${video.snippet.title}</h4>
            `;
            div.onclick = () => {
                currentQueue = [video];
                playTrack(0);
            };
            listContainer.appendChild(div);
        });
    }
});

// Init on page load
function initApp() {
    // Load default videos instead of empty screen
    if (!searchInput.value) {
        searchVideos("trending music video hits indonesia");
    }
}

// Jalankan saat semua selesai
window.addEventListener('DOMContentLoaded', initApp);