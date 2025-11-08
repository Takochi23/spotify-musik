// GANTI DENGAN API KEY ANDA YANG BARU!
const API_KEY = "AIzaSyC_da1cPftXptl0VRCGn5GlMIfdg6O3m9U"; 

// !! Database Lirik Palsu (Dummy) !!
const dummyLyricsDB = {
    "SLOW DANCING IN THE DARK": 
`I don't want a friend (just one more)
I just want my lover
(Pause)
(Lookin' at me)
(I don't want a friend)
...
(Lirik lengkap demo - Joji)`,

    "Die For You": 
`I'm passing out
And it's turning me inside out
(Inside out)
...
(Lirik lengkap demo - Joji)`,

    "Past Won't Leave My Bed":
`The past won't leave my bed (my bed)
I've been sleepin' with the dead (the dead)
The past won't leave my bed (my bed)
...
(Lirik lengkap demo - Joji)`
};

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
const rightSidebar = document.getElementById("rightSidebar");
const queueList = document.getElementById("queueList");


// === Inisialisasi YouTube Player ===
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
async function searchVideos() {
    const query = searchInput.value;
    if (!query) return; // Tidak perlu alert
    results.innerHTML = "<p>Mencari...</p>";
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&q=${query} audio&key=${API_KEY}`;
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
        div.className = "video-card";
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

// === BARU: Fungsi untuk mengupdate Sidebar Antrian ===
function updateQueueSidebar() {
    queueList.innerHTML = ''; 
    
    if (currentQueue.length === 0) {
        rightSidebar.style.display = 'none';
        return;
    }

    rightSidebar.style.display = 'block';

    // Tampilkan 5 lagu berikutnya (atau semua jika kurang dari 5)
    currentQueue.slice(currentIndex, currentIndex + 5).forEach((video, index) => {
        const li = document.createElement('li');
        const globalIndex = currentIndex + index;
        
        li.textContent = video.snippet.title;
        li.onclick = () => playTrack(globalIndex);
        
        // Tandai lagu yang sedang diputar
        if (index === 0) {
            li.classList.add('active');
        }
        queueList.appendChild(li);
    });
}


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

    // Load video baru dan langsung putar (autoplay)
    player.loadVideoById(video.id.videoId, 0, 'small'); // Kualitas audio rendah untuk efisiensi

    // Update UI Player Bar
    playerArt.src = video.snippet.thumbnails.medium.url;
    playerTitle.innerText = video.snippet.title;
    playerBar.dataset.cleanTitle = video.snippet.title.toUpperCase(); 
    playerBar.style.display = 'flex';
    
    // Update Sidebar Antrian
    updateQueueSidebar();
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
    
    // Logika Pencarian Lirik
    const lyricsText = document.getElementById('lyricsText');
    const cleanTitle = playerBar.dataset.cleanTitle;
    let foundLyric = "Maaf, lirik untuk lagu ini belum tersedia di database demo.";

    for (const key in dummyLyricsDB) {
        if (cleanTitle.includes(key.toUpperCase())) { // Ubah kunci lirik menjadi uppercase untuk perbandingan yang lebih baik
            foundLyric = dummyLyricsDB[key];
            break;
        }
    }
    lyricsText.innerHTML = foundLyric.replace(/\n/g, '<br>');

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
playerAlbumTrigger.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

// (Opsional) Tutup modal jika klik di luar
videoModal.addEventListener('click', (event) => {
    if (event.target === videoModal) {
        closeModal();
    }
});

// Event listener untuk tombol Settings di Sidebar
document.getElementById("navSettings").addEventListener('click', () => {
    alert("Fungsi pengaturan belum diimplementasikan.");
});