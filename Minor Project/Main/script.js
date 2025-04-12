// Debug logging for DOM elements
document.addEventListener('DOMContentLoaded', () => {
    // Only log DOM element status in development
    if (process.env.NODE_ENV === 'development') {
        console.log('DOM Elements Status:', {
            cardsContainer: !!document.getElementById("cards-container"),
            newsCardTemplate: !!document.getElementById("template-news-card"),
            searchButton: !!document.getElementById("search-button"),
            searchText: !!document.getElementById("search-text"),
            lastViewedSection: !!document.getElementById("last-viewed-section")
        });
    }
});

// Only log critical errors in production
const logError = (error) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(error);
    }
};

const API_KEY = "5fc11b360b5c44ae8c0f47b87bd9ac8f";
const url = "https://newsapi.org/v2/everything";
const BASE_URL = "http://localhost:5002";

let curSelectedNav = null;

// Add pagination state
let currentPage = 1;
let isLoading = false;
let hasMoreArticles = true;
let currentQuery = '';

// Change the number of initial articles to display
const INITIAL_ARTICLE_COUNT = 36; // Show even more articles initially
const ARTICLES_PER_LOAD = 24; // Increased articles per load

// Add a set to track articles we've already displayed
const displayedArticleTitles = new Set();

// Change the article display approach to show all articles at once
const DISPLAY_ALL_ARTICLES = true; // New flag to display all articles

// Ensure DOM is loaded before adding event listeners or accessing elements
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    try {
        // Set up event listeners first
        setupEventListeners();
        
        // Set up search functionality
        setupSearch();
        
        // Load default news
        fetchNews("India");
        
        // Display saved news if available
        displaySavedNews();
    } catch (error) {
        logError('Error initializing app: ' + error.message);
    }
}

function setupSearch() {
    const searchButton = document.getElementById("search-button");
    const searchText = document.getElementById("search-text");

    if (searchButton && searchText) {
        // Search button click handler
        searchButton.addEventListener("click", () => {
            handleSearch(searchText.value);
        });

        // Enter key support
        searchText.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                handleSearch(searchText.value);
            }
        });
    }
}

function handleSearch(query) {
    query = query.trim();
    if (!query) return;
    
    fetchNews(query);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = null; // Clear active navigation item
}

function onNavItemClick(id) {
    fetchNews(id);
    const navItem = document.getElementById(id);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = navItem;
    curSelectedNav.classList.add("active");
}

async function fetchNews(query) {
    const cardsContainer = document.getElementById("cards-container");
    
    if (!cardsContainer) return;

    try {
        // Store current query for reference
        currentQuery = query;
        
        // Show loading spinner
        showLoadingSpinner(cardsContainer, query);
        
        // Fetch news data
        const data = await fetchNewsData(query);

        if (data?.articles?.length > 0) {
            // Validate and filter articles
            const validArticles = validateArticles(data.articles);
            
            // Store all articles for reference
            window.allArticles = validArticles;
            
            if (validArticles.length > 0) {
                // Clear container and show ALL articles at once
                cardsContainer.innerHTML = "";
                
                // When DISPLAY_ALL_ARTICLES is true, show all articles
                if (DISPLAY_ALL_ARTICLES) {
                    bindData(validArticles, 0, validArticles.length);
                    showSuccessMessage(validArticles.length);
                } else {
                    // Fall back to paginated display if flag is disabled
                    bindData(validArticles, 0, INITIAL_ARTICLE_COUNT);
                    if (validArticles.length > 50) {
                        showSuccessMessage(validArticles.length);
                    }
                    setupScrollAutoload(validArticles);
                }
            } else {
                showNoArticlesMessage(cardsContainer, query);
            }
        } else {
            showNoArticlesMessage(cardsContainer, query);
        }
    } catch (error) {
        showErrorMessage(cardsContainer, error);
    }
}

function validateArticles(articles) {
    // Clear the set when starting a new search
    displayedArticleTitles.clear();
    
    return articles.filter(article => {
        // Skip articles missing required fields
        if (!article.urlToImage || 
            !article.title || 
            !article.description || 
            article.title.includes('[Removed]') ||
            !article.urlToImage.startsWith('http') ||
            article.title.length < 10 || 
            article.description.length < 20) {
            return false;
        }
        
        // Skip duplicate titles (normalized to avoid similar titles)
        const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        if (displayedArticleTitles.has(normalizedTitle)) {
            return false;
        }
        
        // Add to tracking set and return true to keep this article
        displayedArticleTitles.add(normalizedTitle);
        return true;
    });
}

// Optimize performance for loading many articles
function bindData(articles, startIndex = 0, limit = articles.length) {
    const cardsContainer = document.getElementById("cards-container");
    const newsCardTemplate = document.getElementById("template-news-card");

    if (!cardsContainer || !newsCardTemplate) {
        console.error("Required DOM elements not found");
        return;
    }

    try {
        const endIndex = Math.min(startIndex + limit, articles.length);
        const articlesToShow = articles.slice(startIndex, endIndex);
        
        // Clear any existing loading message
        if (startIndex === 0) {
            cardsContainer.innerHTML = "";
        }
        
        // Create a fragment to batch DOM operations
        const fragment = document.createDocumentFragment();
        
        // Create all cards at once for better performance
        articlesToShow.forEach(article => {
            try {
                const cardClone = newsCardTemplate.content.cloneNode(true);
                if (cardClone) {
                    fillDataInCard(cardClone, article);
                    fragment.appendChild(cardClone);
                }
            } catch (error) {
                console.error('Error creating card:', error);
            }
        });
        
        // Append all cards at once
        cardsContainer.appendChild(fragment);
        
        // Force browser to update the layout
        // This helps ensure cards are displayed properly
        requestAnimationFrame(() => {
            const cards = cardsContainer.querySelectorAll('.card');
            if (cards.length > 0) {
                // Add a small delay to ensure images are loaded properly
                setTimeout(() => {
                    cards.forEach(card => {
                        card.style.opacity = 1;
                    });
                }, 100);
            }
        });
        
    } catch (error) {
        console.error('Error in bindData:', error);
    }
}

function showLoadingSpinner(container, query) {
    if (!container) return;
    
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div style="display: inline-block; width: 50px; height: 50px; border: 5px solid #f3f3f3; 
                        border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;">
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 18px;">
                Loading all news for "${query}"...
            </p>
            <p style="margin-top: 10px; color: #888; font-size: 14px;">
                This may take a moment as we fetch hundreds of articles for you
            </p>
        </div>
    `;
}

function fillDataInCard(cardClone, article) {
    if (!cardClone || !article) {
        console.error('Invalid card clone or article data');
        return;
    }

    try {
        const elements = {
            newsImg: cardClone.querySelector("#news-img"),
            newsTitle: cardClone.querySelector("#news-title"),
            newsSource: cardClone.querySelector("#news-source"),
            newsDesc: cardClone.querySelector("#news-desc"),
            cardContent: cardClone.querySelector(".card-content")
        };

        // Verify all elements exist
        const missingElements = Object.entries(elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('Missing elements:', missingElements);
            return;
        }

        // Set image with more reliable fallbacks that won't have connection errors
        const newsImages = [
            'https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/1480690/pexels-photo-1480690.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/5473298/pexels-photo-5473298.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/3944425/pexels-photo-3944425.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg?auto=compress&cs=tinysrgb&w=400'
        ];
        
        // Choose a random fallback image for variety
        const randomFallbackImage = newsImages[Math.floor(Math.random() * newsImages.length)];
        
        // Cautiously try to set the article image, with reliable fallbacks
        if (article.urlToImage && article.urlToImage.startsWith('http') && 
            !article.urlToImage.includes('livemint.com')) { // Skip known problematic domains
            elements.newsImg.src = article.urlToImage;
        } else {
            // Use our reliable fallback images
            elements.newsImg.src = randomFallbackImage;
        }
        
        // Add error handler for images with reliable fallbacks
        elements.newsImg.onerror = () => {
            elements.newsImg.src = randomFallbackImage;
            // Second fallback if even that fails
            elements.newsImg.onerror = () => {
                elements.newsImg.style.backgroundColor = '#e0e0e0';
                elements.newsImg.style.display = 'block';
                elements.newsImg.style.width = '100%';
                elements.newsImg.style.height = '200px';
                elements.newsImg.alt = "News Image Unavailable";
            };
        };

        elements.newsTitle.textContent = article.title || 'No title available';
        elements.newsDesc.textContent = article.description || 'No description available';

        const date = article.publishedAt ? 
            new Date(article.publishedAt).toLocaleString("en-US", {
                timeZone: "Asia/Jakarta",
            }) : 'Date not available';

        elements.newsSource.textContent = `${article.source?.name || 'Unknown Source'} · ${date}`;

        // Add click handler for opening article
        const newsCard = cardClone.firstElementChild;
        if (newsCard) {
            newsCard.classList.add("news");
            setupCardClickHandler(newsCard, article);
        }
    } catch (error) {
        console.error('Error in fillDataInCard:', error);
    }
}

async function fetchNewsData(query, page = 1) {
    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`${BASE_URL}/api/news?q=${encodeURIComponent(query)}&page=${page}&_t=${timestamp}`, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!res.ok) {
            throw new Error('Server error occurred');
        }

        const data = await res.json();
        
        if (!data || !data.articles || !Array.isArray(data.articles)) {
            throw new Error('Invalid response format');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

function setupEventListeners() {
    try {
        // Profile Dropdown Toggle
        const profileIcon = document.getElementById("profile-icon");
        const profileDropdown = document.getElementById("profile-dropdown");

        if (profileIcon && profileDropdown) {
            profileIcon.addEventListener("click", () => {
                profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
            });

            // Hide dropdown when clicking outside
            document.addEventListener("click", (e) => {
                if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.style.display = "none";
                }
            });
        }

        // Auth related buttons
        const signupBtn = document.getElementById("signup-btn");
        const loginBtn = document.getElementById("login-btn");
        const logoutBtn = document.getElementById("logout-button");
        const authButtons = document.querySelector(".auth-buttons");
        const profileMenu = document.querySelector(".profile-menu");

        // Check auth status
        const token = localStorage.getItem("token");
        const loggedInUser = localStorage.getItem("loggedInUser");

        if (loggedInUser) {
            // Update username in profile
            const profileUsername = document.getElementById("profile-username");
            if (profileUsername) {
                profileUsername.textContent = loggedInUser;
            }

            // Show/hide appropriate elements
            if (authButtons) authButtons.style.display = "none";
            if (profileMenu) profileMenu.style.display = "flex";
        } else {
            if (profileMenu) profileMenu.style.display = "none";
            if (!token) {
                window.location.href = "/";
                return;
            }
        }

        // Setup button click handlers
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

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("loggedInUser");
                window.location.href = "/";
            });
        }

        // Clear history button
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                localStorage.removeItem('newsArticles');
                localStorage.removeItem('currentNewsTitle');
                localStorage.removeItem('currentNewsDesc');
                
                const lastViewedSection = document.getElementById('last-viewed-section');
                if (lastViewedSection) {
                    lastViewedSection.style.display = 'none';
                }
            });
        }
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Function to retrieve saved news from localStorage
function getSavedNews() {
    // Get the news store (title as key, description as value)
    let newsArticles;
    try {
        newsArticles = JSON.parse(localStorage.getItem("newsArticles") || "[]");
    } catch (e) {
        newsArticles = [];
    }
    
    // Convert to array of objects for easier display
    const articles = newsArticles.map((article) => ({
        title: article.title,
        description: article.description
    }));
    
    // For backward compatibility
    if (articles.length === 0) {
        const title = localStorage.getItem("currentNewsTitle");
        const description = localStorage.getItem("currentNewsDesc");
        
        if (title && description) {
            return [{
                title: title,
                description: description
            }];
        }
    }
    
    return articles;
}

// Display saved news from localStorage
function displaySavedNews() {
    const allArticles = getSavedNews();
    
    if (allArticles.length > 0) {
        // Take only the 3 most recent articles
        const recentArticles = allArticles.slice(0, 3);
        
        // Show the last viewed section
        const lastViewedSection = document.getElementById('last-viewed-section');
        if (lastViewedSection) {
            // Clear any existing content
            const contentArea = document.querySelector('.last-viewed-content');
            contentArea.innerHTML = '';
            
            // Update section title
            document.querySelector('#last-viewed-section h3').textContent = 'Last 3 Viewed Articles';
            
            // Add each article to the section
            recentArticles.forEach((article, index) => {
                // Create article element
                const articleElement = document.createElement('div');
                articleElement.className = 'viewed-article';
                articleElement.style.padding = '10px 0';
                if (index > 0) articleElement.style.borderTop = '1px solid #eee';
                
                // Add title
                const titleElement = document.createElement('h4');
                titleElement.textContent = article.title;
                titleElement.style.margin = '0 0 8px 0';
                titleElement.style.fontSize = '18px';
                
                // Add description
                const descElement = document.createElement('p');
                descElement.textContent = article.description;
                descElement.style.margin = '0';
                descElement.style.fontSize = '14px';
                descElement.style.lineHeight = '1.4';
                
                // Assemble and add to content area
                articleElement.appendChild(titleElement);
                articleElement.appendChild(descElement);
                contentArea.appendChild(articleElement);
            });
            
            // Add view all button if there are more than 3 articles
            if (allArticles.length > 3) {
                const viewAllContainer = document.createElement('div');
                viewAllContainer.style.textAlign = 'center';
                viewAllContainer.style.marginTop = '15px';
                viewAllContainer.style.paddingTop = '10px';
                viewAllContainer.style.borderTop = '1px solid #eee';
                
                const viewAllButton = document.createElement('button');
                viewAllButton.textContent = `View All Articles (${allArticles.length})`;
                viewAllButton.style.padding = '8px 15px';
                viewAllButton.style.backgroundColor = '#007bff';
                viewAllButton.style.color = 'white';
                viewAllButton.style.border = 'none';
                viewAllButton.style.borderRadius = '4px';
                viewAllButton.style.cursor = 'pointer';
                viewAllButton.style.fontSize = '14px';
                viewAllButton.style.fontWeight = 'bold';
                viewAllButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                viewAllButton.style.transition = 'all 0.2s ease';
                
                // Add hover effect
                viewAllButton.addEventListener('mouseover', () => {
                    viewAllButton.style.backgroundColor = '#0069d9';
                    viewAllButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                });
                
                viewAllButton.addEventListener('mouseout', () => {
                    viewAllButton.style.backgroundColor = '#007bff';
                    viewAllButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                });
                
                viewAllButton.addEventListener('click', () => showAllArticles(allArticles));
                
                // Add an info text about storage capacity
                const infoText = document.createElement('p');
                infoText.textContent = `Storing up to 50 recently viewed articles`;
                infoText.style.margin = '8px 0 0 0';
                infoText.style.fontSize = '12px';
                infoText.style.color = '#666';
                
                viewAllContainer.appendChild(viewAllButton);
                viewAllContainer.appendChild(infoText);
                contentArea.appendChild(viewAllContainer);
            }
            
            // Ensure the section is visible
            lastViewedSection.style.display = 'block';
            
            // Scroll to make sure it's visible within the viewport if it's a new addition
            if (lastViewedSection.getAttribute('data-just-added') === 'true') {
                lastViewedSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                lastViewedSection.setAttribute('data-just-added', 'false');
            }
        }
    } else {
        // No articles to display, hide the section
        const lastViewedSection = document.getElementById('last-viewed-section');
        if (lastViewedSection) {
            lastViewedSection.style.display = 'none';
        }
    }
}

// Function to show all articles in a modal
function showAllArticles(articles) {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '20px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.position = 'relative';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#333';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Create header
    const header = document.createElement('h2');
    header.textContent = `All Viewed Articles (${articles.length})`;
    header.style.marginTop = '0';
    header.style.marginBottom = '20px';
    header.style.borderBottom = '1px solid #eee';
    header.style.paddingBottom = '10px';
    
    // Add close button and header to modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(header);
    
    // Add articles to modal
    articles.forEach((article, index) => {
        const articleElement = document.createElement('div');
        articleElement.className = 'viewed-article-in-modal';
        articleElement.style.padding = '15px 0';
        if (index > 0) articleElement.style.borderTop = '1px solid #eee';
        
        // Add number indicator
        const numberIndicator = document.createElement('div');
        numberIndicator.textContent = `${index + 1}.`;
        numberIndicator.style.fontWeight = 'bold';
        numberIndicator.style.marginRight = '10px';
        numberIndicator.style.color = '#007bff';
        numberIndicator.style.fontSize = '16px';
        numberIndicator.style.minWidth = '30px';
        numberIndicator.style.display = 'inline-block';
        
        // Add title
        const titleElement = document.createElement('h4');
        titleElement.textContent = article.title;
        titleElement.style.margin = '0 0 8px 0';
        titleElement.style.fontSize = '18px';
        titleElement.style.display = 'inline-block';
        
        // Title container for flex layout
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'baseline';
        titleContainer.appendChild(numberIndicator);
        titleContainer.appendChild(titleElement);
        
        // Add description
        const descElement = document.createElement('p');
        descElement.textContent = article.description;
        descElement.style.margin = '5px 0 0 30px';
        descElement.style.fontSize = '14px';
        descElement.style.lineHeight = '1.4';
        descElement.style.color = '#555';
        
        // Assemble and add to modal
        articleElement.appendChild(titleContainer);
        articleElement.appendChild(descElement);
        modalContent.appendChild(articleElement);
    });
    
    // Add modal to page
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Close on click outside the modal content
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
    
    // Prevent scrolling on the main page when modal is open
    document.body.style.overflow = 'hidden';
    
    // Add event listener to restore scrolling when modal is closed
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.style.overflow = '';
        }
    });
    closeButton.addEventListener('click', () => {
        document.body.style.overflow = '';
    });
}

function showSuccessMessage(count) {
    try {
        // Always show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #2ecc71;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            animation: fadeOut 3s forwards;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        successMsg.textContent = `Loaded ${count} articles`;
        document.body.appendChild(successMsg);
        setTimeout(() => {
            if (document.body.contains(successMsg)) {
                document.body.removeChild(successMsg);
            }
        }, 3000);
    } catch (error) {
        // Don't log success message errors
    }
}

function showNoArticlesMessage(container, query) {
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 20px;">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" 
                     alt="No results" style="width: 100px; height: 100px; opacity: 0.5;">
            </div>
            <p style="color: #666; margin-bottom: 15px;">No news articles found for "${query}"</p>
            <button onclick="fetchNews('India')" 
                    style="padding: 10px 20px; background-color: #3498db; color: white; 
                           border: none; border-radius: 5px; cursor: pointer; 
                           transition: background-color 0.3s;">
                Show Latest News
            </button>
        </div>`;
}

function showErrorMessage(container, error) {
    if (!container) return;
    
    let errorMessage = 'Unable to load news at this time. Please try again later.';
    if (error.message.includes('API key')) {
        errorMessage = "Service temporarily unavailable. Please try again later.";
    } else if (error.message.includes('rate limit')) {
        errorMessage = "Please try again in a few minutes.";
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 20px;">
                <img src="https://cdn-icons-png.flaticon.com/512/1832/1832415.png" 
                     alt="Error" style="width: 100px; height: 100px; opacity: 0.5;">
            </div>
            <p style="color: #666; margin-bottom: 15px;">${errorMessage}</p>
            <button onclick="fetchNews('India')" 
                    style="padding: 10px 20px; background-color: #e74c3c; color: white; 
                           border: none; border-radius: 5px; cursor: pointer;">
                Show Latest News
            </button>
        </div>`;
}

function setupCardClickHandler(newsCard, article) {
    if (!newsCard || !article) return;

    newsCard.addEventListener("click", async (e) => {
        try {
            // Handle article storage
            await handleArticleStorage(article);

            // Open article in new tab
            if (article.url) {
                window.open(article.url, "_blank");
            }
        } catch (error) {
            console.error('Error handling card click:', error);
        }
    });
}

async function handleArticleStorage(article) {
    try {
        // Get existing news articles
        let newsArticles = [];
        try {
            newsArticles = JSON.parse(localStorage.getItem("newsArticles") || "[]");
        } catch (e) {
            console.error("Error parsing localStorage:", e);
        }

        const isFirstArticle = newsArticles.length === 0;

        // Create new article entry
        const newArticle = {
            title: article.title,
            description: article.description,
            timestamp: Date.now()
        };

        // Remove duplicate and add new article
        newsArticles = newsArticles.filter(item => item.title !== article.title);
        newsArticles.unshift(newArticle);

        // Keep only the 50 most recent articles
        if (newsArticles.length > 50) {
            newsArticles = newsArticles.slice(0, 50);
        }

        // Save to localStorage
        localStorage.setItem("newsArticles", JSON.stringify(newsArticles));
        localStorage.setItem("currentNewsTitle", article.title);
        localStorage.setItem("currentNewsDesc", article.description);

        // Update UI
        if (isFirstArticle) {
            const lastViewedSection = document.getElementById('last-viewed-section');
            if (lastViewedSection) {
                lastViewedSection.setAttribute('data-just-added', 'true');
            }
        }

        // Update display
        displaySavedNews();
    } catch (error) {
        console.error('Error storing article:', error);
    }
}

function setupInfiniteScroll() {
    // Remove existing observer if any
    if (window.scrollObserver) {
        window.scrollObserver.disconnect();
    }

    // Create new observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMoreArticles) {
                isLoading = true;
                fetchNews(currentQuery, currentPage + 1);
            }
        });
    }, { threshold: 0.1 });

    // Observe the last article
    const articles = document.querySelectorAll('.news');
    if (articles.length > 0) {
        observer.observe(articles[articles.length - 1]);
    }

    window.scrollObserver = observer;
}

function addEndOfResultsMessage(container) {
    // Function intentionally left empty to prevent end message display
    return;
}

// Add a function to automatically load more articles on scroll
function setupScrollAutoload(articles) {
    // Remove existing listener if any
    if (window.scrollListener) {
        window.removeEventListener('scroll', window.scrollListener);
    }
    
    // Current index tracker
    let currentIndex = INITIAL_ARTICLE_COUNT;
    let isLoading = false;
    
    const scrollHandler = () => {
        if (isLoading || currentIndex >= articles.length) return;
        
        // Calculate how far down the page the user has scrolled
        const scrollTop = (document.documentElement || document.body).scrollTop;
        const scrollHeight = (document.documentElement || document.body).scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        // If scrolled 80% down, load more articles
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            isLoading = true;
            
            // Add a small loading indicator at the bottom
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'scroll-loading-indicator';
            loadingIndicator.innerHTML = `
                <div style="text-align: center; padding: 15px; grid-column: 1 / -1;">
                    <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; 
                                border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;">
                    </div>
                </div>
            `;
            
            const cardsContainer = document.getElementById("cards-container");
            cardsContainer.appendChild(loadingIndicator);
            
            // Load more articles after a small delay for better UX
            setTimeout(() => {
                // Remove loading indicator
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
                
                // Load more articles
                const nextBatch = Math.min(ARTICLES_PER_LOAD, articles.length - currentIndex);
                if (nextBatch > 0) {
                    bindData(articles, currentIndex, nextBatch);
                    currentIndex += nextBatch;
                }
                
                isLoading = false;
            }, 500);
        }
    };
    
    // Store the listener for later cleanup
    window.scrollListener = scrollHandler;
    window.addEventListener('scroll', scrollHandler);
}

// Improved handling for TTS errors
function initializeTTS() {
    try {
        if (window.newsTTS) {
            console.log("TTS already initialized");
            return;
        }
        
        // Check if speech synthesis is available
        if (!window.speechSynthesis) {
            console.error("Speech synthesis not supported in this browser");
            return;
        }
        
        // Make sure the NewsTTS class exists
        if (typeof NewsTTS === 'undefined') {
            console.error("NewsTTS class not found. Ensure tts.js is loaded properly.");
            return;
        }
        
        // Initialize TTS with error handling
        window.newsTTS = new NewsTTS();
        
        // Add event listener to handle errors
        window.addEventListener('error', function(event) {
            // Check if error is related to TTS
            if (event.message && (
                event.message.includes('speech') || 
                event.message.includes('tts') || 
                event.message.includes('voice')
            )) {
                console.warn("TTS error detected:", event.message);
                // Reset TTS
                if (window.newsTTS) {
                    window.newsTTS.stop();
                }
            }
        });
        
    } catch (error) {
        console.error("Error initializing TTS:", error);
    }
}

// Call initialization when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeTTS, 1000); // Delay initialization to ensure resources are loaded
});
