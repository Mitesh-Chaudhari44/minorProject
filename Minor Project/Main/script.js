const API_KEY = "5fc11b360b5c44ae8c0f47b87bd9ac8f";
const url = "https://newsapi.org/v2/everything";

// Load default news on page load
window.addEventListener("load", () => fetchNews("India"));

function reload() {
    window.location.reload();
}

async function fetchNews(query) {
    const cardsContainer = document.getElementById("cards-container");
    cardsContainer.innerHTML = "<p>Loading...</p>"; // Show loading indicator

    try {
        const res = await fetch(`${url}?q=${query}&apiKey=${API_KEY}`);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.articles || data.articles.length === 0) {
            cardsContainer.innerHTML = "<p>No news articles found.</p>"; // Handle no results
            return;
        }

        bindData(data.articles);
    } catch (error) {
        console.error("Error fetching news:", error);
        cardsContainer.innerHTML = "<p>Error loading news. Please try again later.</p>";
    }
}

function bindData(articles) {
    const cardsContainer = document.getElementById("cards-container");
    const newsCardTemplate = document.getElementById("template-news-card");

    cardsContainer.innerHTML = ""; // Clear existing content

    articles.forEach((article) => {
        if (!article.urlToImage) return; // Skip articles without images
        const cardClone = newsCardTemplate.content.cloneNode(true);
        fillDataInCard(cardClone, article);
        cardsContainer.appendChild(cardClone);
    });
}

function fillDataInCard(cardClone, article) {
    const newsImg = cardClone.querySelector("#news-img");
    const newsTitle = cardClone.querySelector("#news-title");
    const newsSource = cardClone.querySelector("#news-source");
    const newsDesc = cardClone.querySelector("#news-desc");

    newsImg.src = article.urlToImage;
    newsTitle.innerHTML = article.title;
    newsDesc.innerHTML = article.description;

    const date = new Date(article.publishedAt).toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
    });

    newsSource.innerHTML = `${article.source.name} · ${date}`;

    cardClone.firstElementChild.addEventListener("click", () => {
        window.open(article.url, "_blank"); // Open article in new tab
    });
}

let curSelectedNav = null;

function onNavItemClick(id) {
    fetchNews(id); // Fetch news based on category
    const navItem = document.getElementById(id);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = navItem;
    curSelectedNav.classList.add("active");
}

const searchButton = document.getElementById("search-button");
const searchText = document.getElementById("search-text");

searchButton.addEventListener("click", () => {
    const query = searchText.value.trim();
    if (!query) return; // Ignore empty searches
    fetchNews(query);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = null; // Clear active navigation item
});

// Profile Dropdown Toggle
const profileIcon = document.getElementById("profile-icon");
const profileDropdown = document.getElementById("profile-dropdown");

profileIcon.addEventListener("click", () => {
    profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
});

// Hide dropdown when clicking outside
document.addEventListener("click", (e) => {
    if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.style.display = "none";
    }
});

// Logout functionality
document.getElementById("logout-button").addEventListener("click", () => {
    localStorage.removeItem("token"); // Remove token
    localStorage.removeItem("loggedInUser"); // Also remove this
    window.location.href = "/";  // This will redirect to the root URL where login page is served
});

document.getElementById("signup-btn").addEventListener("click", () => {
    window.location.href = "/signup";
});

document.getElementById("login-btn").addEventListener("click", () => {
    window.location.href = "/";
});

// Show logged-in user in the profile dropdown
const currentUser = localStorage.getItem("loggedInUser");
if (currentUser) {
    document.getElementById("profile-username").textContent = currentUser;
}

document.addEventListener("DOMContentLoaded", () => {
    // Check auth on page load
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return;
    }

    const signupBtn = document.getElementById("signup-btn");
    const loginBtn = document.getElementById("login-btn");
    const authButtons = document.querySelector(".auth-buttons"); // Wrapper div
    const profileMenu = document.querySelector(".profile-menu");

    const loggedInUser = localStorage.getItem("loggedInUser"); // Check if user is logged in

    if (loggedInUser) {
        // Hide signup and login buttons
        authButtons.style.display = "none";
        profileMenu.style.display = "flex"; // Show profile menu
    } else {
        profileMenu.style.display = "none"; // Hide profile menu
    }

    // Redirect to Signup/Login pages when clicked
    if (signupBtn) {
        signupBtn.addEventListener("click", () => {
            window.location.href = "/signup";
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "/";
        });
    }

    // Logout functionality
    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        window.location.href = "/";
    });
});
