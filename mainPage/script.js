

const currentUser = sessionStorage.getItem('currentUser') || 'guest';
console.log("Zalogowany użytkownik:", currentUser);

// Wyświetlenie nazwy użytkownika
document.getElementById("profileName").textContent = currentUser;

document.getElementById("profilePicture").innerHTML = '<img src="../loginPage/img/avatar'+currentUser+'.jpg" alt="">'

// Toggle dropdown
const profileBtn = document.getElementById("profileBtn");
const dropdown = document.getElementById("dropdown");

profileBtn.addEventListener("click", () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

document.getElementById("sharedListBtn").addEventListener("click", () => {

  window.location.href = "shared.html";

});

document.getElementById("logoutBtn").addEventListener("click", () => {

  sessionStorage.removeItem("currentUser");
  // przekieruj na stronę logowania
  window.location.href = "../loginPage/loginPage.html"; // lub "login.html" jeśli masz osobną stronę logowania
});


// Zamknij dropdown jeśli klikniesz poza nim
window.addEventListener("click", (e) => {
  if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = "none";
  }
});



//  Konfiguracja Supabase
const SUPABASE_URL = "https://hxaqbpcufdlzfhmgddds.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4YXFicGN1ZmRsemZobWdkZGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzY3ODQsImV4cCI6MjA3MjQxMjc4NH0.o38-3lqMWMAESf5I3oXaGXqTp1fXw6mkZ310b7-EhXo";
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);


async function fetchSharedItem(item) {
  let url = "";

  if(item.type === "movie") {
    url = `https://api.themoviedb.org/3/movie/${item.movie_id}?api_key=${API_KEY}&language=pl-PL`;
  } else if(item.type === "tv") {
    url = `https://api.themoviedb.org/3/tv/${item.movie_id}?api_key=${API_KEY}&language=pl-PL`;
  } else if(item.type === "anime") {
    // jeśli traktujesz anime jak film w TMDB
    url = `https://api.themoviedb.org/3/movie/${item.movie_id}?api_key=${API_KEY}&language=pl-PL`;
  }

  const res = await fetch(url);
  const data = await res.json();
  return data;
}




const API_KEY = "9b02e967dce99b746fc634d03605d150";
let currentPage = 1;
let isLoading = false;
let currentQuery = "";


let genresMap = {};

async function loadGenres() {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=pl-PL`);
    const data = await res.json();
    data.genres.forEach(g => {
      genresMap[g.id] = g.name;
    });


  } catch (err) {
    console.error("Błąd pobierania listy gatunków:", err);
  }
}

// Wywołaj przy starcie
loadGenres();



// Pobieranie filmów
async function getMovies(page = 1) {
  try {
    let moviesData = [];
    let tvData = [];

    if (currentQuery) {
      // Wyszukiwanie filmów
      const resMovies = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=pl-PL&query=${encodeURIComponent(currentQuery)}&page=${page}`);
      const dataMovies = await resMovies.json();
      moviesData = dataMovies.results;

      // Wyszukiwanie seriali
      const resTV = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=pl-PL&query=${encodeURIComponent(currentQuery)}&page=${page}`);
      const dataTV = await resTV.json();
      tvData = dataTV.results;
    } else {
      // Popularne filmy
      const resMovies = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=pl-PL&page=${page}`);
      const dataMovies = await resMovies.json();
      moviesData = dataMovies.results;

      // Popularne seriale
      const resTV = await fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=pl-PL&page=${page}`);
      const dataTV = await resTV.json();
      tvData = dataTV.results;
    }

    // Opcjonalnie: filtruj anime po gatunku 16 (Animation)
    const animeMovies = moviesData.filter(m => m.genre_ids.includes(16));
    const animeTV = tvData.filter(t => t.genre_ids.includes(16));

    // Połącz wszystko
    const combined = [...moviesData, ...tvData, ...animeMovies, ...animeTV];

    if (page === 1) document.getElementById("movies").innerHTML = "";

    showMovies(combined);
  } catch (err) {
    console.error("Błąd pobierania filmów i seriali:", err);
  } finally {
    isLoading = false;
  }
}

async function addToSharedList(itemId, type = 'movie') {
  try {
    // Sprawdź, czy już jest element o tym ID i typie
    const { data: existing, error: checkError } = await supabaseClient
      .from('shared_list')
      .select('*')
      .eq('movie_id', itemId)
      .eq('type', type)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { 
      console.error("Błąd sprawdzania:", checkError);
      alert("Błąd przy sprawdzaniu listy.");
      return;
    }

    if (existing) {
      alert("Ten element jest już na liście!");
      return;
    }

    // Dodaj element z typem
    const { data, error } = await supabaseClient
      .from('shared_list')
      .insert([{ movie_id: itemId, type, added_by: currentUser }]);

    if (error) {
      console.error("Błąd dodawania:", error);
      alert("Nie udało się dodać elementu.");
    } else {
      console.log("Dodano:", data);
      alert("Dodano do wspólnej listy!");
    }

  } catch (err) {
    console.error("Nieoczekiwany błąd:", err);
  }
}







// Wyświetlanie filmów
function showMovies(items, page = 1) {
  const container = document.getElementById("movies");

  if (!items || items.length === 0) {
    if (page === 1) {
      container.innerHTML = `<p style="text-align:center;width:100%;">Brak wyników.</p>`;
    }
    return; // dla kolejnych stron po prostu nic nie dodawaj
  }

  items.forEach(item => {
    const movieEl = document.createElement("div");
    movieEl.classList.add("movie");

    movieEl.innerHTML = `
      <img src="${item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 'https://via.placeholder.com/300x450?text=Brak+Plakatu'}" alt="${item.title || item.name}">
      <h3>${item.title || item.name}</h3>
      <p>Premiera: ${item.release_date || item.first_air_date || "brak danych"}</p>
      <button class="shared-btn">Dodaj do listy</button>
    `;

    movieEl.querySelector(".shared-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      addToSharedList(item.id, item.title ? 'movie' : 'tv'); 
    });

    movieEl.addEventListener("click", () => {
      openMovieModal(item.id, item.title ? 'movie' : 'tv'); 
    });

    container.appendChild(movieEl);
  });
}

// Obsługa wyszukiwarki
document.getElementById("searchBtn").addEventListener("click", () => {
  currentQuery = document.getElementById("searchInput").value.trim();
  currentPage = 1;
  getMovies(currentPage);
});

document.getElementById("searchInput").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    currentQuery = document.getElementById("searchInput").value.trim();
    currentPage = 1;
    getMovies(currentPage);
  }
});

// Infinite scroll
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !isLoading) {
    isLoading = true;
    currentPage++;
    getMovies(currentPage);
  }
});



//FOOTER
// Obsługa wysuwanego footera
// FOOTER TOGGLE
const footer = document.getElementById("footer");
const footerToggle = document.getElementById("footerToggle");

footerToggle.addEventListener("click", () => {
  footer.classList.toggle("open");
  footerToggle.classList.toggle("open");
});
// Elementy modala
const modal = document.getElementById("movieModal");
const modalTitle = document.getElementById("modalTitle");
const modalOverview = document.getElementById("modalOverview");
const modalTrailer = document.getElementById("modalTrailer");
const modalGenres = document.getElementById("modalGenres"); 
const closeBtn = document.querySelector(".close-btn");




// Funkcja otwierająca modal
async function openMovieModal(itemId, type = 'movie') {
  try {
    let url = type === 'tv' 
      ? `https://api.themoviedb.org/3/tv/${itemId}?api_key=${API_KEY}&language=pl-PL&append_to_response=videos`
      : `https://api.themoviedb.org/3/movie/${itemId}?api_key=${API_KEY}&language=pl-PL&append_to_response=videos`;

    const res = await fetch(url);
    const movie = await res.json();

    modalTitle.textContent = movie.title || movie.name;
    modalOverview.textContent = movie.overview || "Brak opisu.";
    modalGenres.innerHTML = movie.genres?.length
      ? "<b>Gatunki: </b>" + movie.genres.map(g => g.name).join(", ")
      : "Gatunki: brak danych";

    // trailer
    const trailer = movie.videos?.results?.find(v => (v.type === "Trailer" || v.type === "Teaser") && v.site === "YouTube");
    modalTrailer.innerHTML = trailer
      ? `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`
      : `<p>Brak trailera. <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title || movie.name)}+trailer" target="_blank">Szukaj na YouTube</a></p>`;

    modal.style.display = "block";
  } catch (err) {
    console.error("Błąd ładowania w modalu:", err);
  }
}


// Zamknięcie modala
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
  modalTrailer.innerHTML = ""; // usuń iframe, żeby zatrzymać film
});

// Zamknięcie po kliknięciu poza modal
window.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
    modalTrailer.innerHTML = "";
  }
});






// Start – popularne filmy
getMovies();