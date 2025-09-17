

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
  let API_URL = "";

  if (currentQuery) {
    API_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=pl-PL&query=${encodeURIComponent(currentQuery)}&page=${page}`;
  } else {
    API_URL = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=pl-PL&page=${page}`;
  }

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (page === 1) {
      document.getElementById("movies").innerHTML = ""; // reset przy nowym wyszukiwaniu
    }

    showMovies(data.results);
  } catch (err) {
    console.error("Błąd pobierania filmów:", err);
  } finally {
    isLoading = false;
  }
}
async function saveSwipe(movieId, action) {
  await supabaseClient.from('swipes').insert([
    { user_id: currentUser, movie_id: movieId, action }
  ]);
}


async function addToSharedList(movieId) {
  // Sprawdź, czy film już jest
  const { data: existing, error: checkError } = await supabaseClient
    .from('shared_list')
    .select('*')
    .eq('movie_id', movieId)
    .maybeSingle(); // single() zwraca pierwszy rekord lub null

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = record not found
    console.error("Błąd sprawdzania filmu:", checkError);
    alert("Wystąpił błąd przy sprawdzaniu filmu.");
    return;
  }

  if (existing) {
    alert("Ten film jest już na wspólnej liście!");
    return;
  }

  // Dodaj film
  const { data, error } = await supabaseClient
    .from('shared_list')
    .insert([{ movie_id: movieId, added_by: currentUser }]);

  if (error) {
    console.error("Błąd dodawania do wspólnej listy:", error);
    alert("Nie udało się dodać filmu.");
  } else {
    console.log("Dodano do wspólnej listy:", data);
    alert("Dodano do wspólnej listy!");
    
  }
}






// Wyświetlanie filmów
function showMovies(movies) {
  


  const container = document.getElementById("movies");

  if (!movies || movies.length === 0) {
    if (currentPage === 1) {
      container.innerHTML = `<p style="text-align:center;width:100%;">Brak wyników.</p>`;
    }
    return;
  }

 movies.forEach(movie => {
  const movieEl = document.createElement("div");
  movieEl.classList.add("movie");

  movieEl.innerHTML = `
    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${movie.title}">
    <h3>${movie.title}</h3>
    <p>Premiera: ${movie.release_date || "brak danych"}</p>
    <button class="shared-btn">Dodaj do listy</button>
  `;

  // 1️⃣ Obsługa przycisku "Dodaj do wspólnej listy"
  movieEl.querySelector(".shared-btn").addEventListener("click", (e) => {
    e.stopPropagation(); // ważne! żeby kliknięcie przycisku nie otwierało modala
    addToSharedList(movie.id);
  });

  // 2️⃣ Kliknięcie w film (poza przyciskiem) – otwiera modal
  movieEl.addEventListener("click", () => {
    openMovieModal(movie.id);
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
async function openMovieModal(movieId) {
  try {
    // Pobierz szczegóły filmu z TMDB
    const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=pl-PL&append_to_response=videos`);
    const movie = await res.json();

    modalTitle.textContent = movie.title;
    modalOverview.textContent = movie.overview || "Brak opisu.";

    if (movie.genres && movie.genres.length > 0) {
      modalGenres.innerHTML = "<b>Gatunki: </b>" + movie.genres.map(g => g.name).join(", ");
    } else {
      modalGenres.textContent = "Gatunki: brak danych";
    }
  
    // Pobierz trailer z YouTube
    const trailer = movie.videos.results.find(v => (v.type === "Trailer" || v.type === "Teaser") && v.site === "YouTube");

    if (trailer) {
      modalTrailer.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`;
    } else {
      const safeTitle = encodeURIComponent(movie.title || "");
      modalTrailer.innerHTML = `<p>Brak trailera w TMDB. <a href="https://www.youtube.com/results?search_query=${safeTitle}+trailer" target="_blank" rel="noopener">Szukaj na YouTube</a></p>`;
    }

    modal.style.display = "block";
  } catch (err) {
    console.error("Błąd ładowania filmu:", err);
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

// Przykład – w showMovies dodaj event
// movieEl.addEventListener("click", () => openMovieModal(movie.id));




// Start – popularne filmy
getMovies();