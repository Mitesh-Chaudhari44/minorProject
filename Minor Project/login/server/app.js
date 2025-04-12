const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the Main directory
app.use('/Main', express.static('../Minor Project/Main'));

// Helper function to remove duplicate articles
function removeDuplicateArticles(articles) {
    const seen = new Set();
    const titleSeen = new Set();
    
    return articles.filter(article => {
        // Check for duplicate URLs
        const urlDuplicate = seen.has(article.url);
        seen.add(article.url);
        
        // Check for duplicate or similar titles (after normalization)
        const normalizedTitle = article.title?.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const titleDuplicate = normalizedTitle && titleSeen.has(normalizedTitle);
        if (normalizedTitle) titleSeen.add(normalizedTitle);
        
        // Filter out articles with missing data or duplicates
        return !urlDuplicate && 
               !titleDuplicate && 
               article.urlToImage && 
               article.title && 
               article.description;
    });
}

// News API proxy endpoint
app.get('/api/news', async (req, res) => {
    try {
        const query = req.query.q || '';
        const apiKey = '5fc11b360b5c44ae8c0f47b87bd9ac8f';
        const pageSize = 100; // Maximum per request
        let allArticles = [];

        // Create broader range of diverse source combinations
        const sources = [];
        
        // Add country-specific sources for more diversity
        const countries = ['in', 'us', 'gb', 'au', 'ca', 'sg', 'nz', 'za'];
        countries.forEach(country => {
            sources.push(`https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${apiKey}&pageSize=${pageSize}&q=${encodeURIComponent(query)}`);
        });
        
        // Add category-specific sources
        const categories = ['business', 'technology', 'entertainment', 'science', 'health', 'sports', 'general'];
        categories.forEach(category => {
            sources.push(`https://newsapi.org/v2/top-headlines?category=${category}&language=en&apiKey=${apiKey}&pageSize=${pageSize}&q=${encodeURIComponent(query)}`);
        });
        
        // Add general searches with different sorting
        const sortOptions = ['publishedAt', 'relevancy', 'popularity'];
        sortOptions.forEach(sort => {
            sources.push(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=${sort}&apiKey=${apiKey}&pageSize=${pageSize}`);
        });
        
        // Add multiple page requests for everything endpoint to get maximum results
        for (let page = 1; page <= 5; page++) {
            sources.push(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&page=${page}&apiKey=${apiKey}&pageSize=${pageSize}`);
        }

        // Add domain-specific sources for reliable news
        const domains = [
            'bbc.co.uk,theguardian.com,reuters.com',
            'cnn.com,nytimes.com,washingtonpost.com',
            'thehindu.com,indiatimes.com,ndtv.com',
            'techcrunch.com,wired.com,theverge.com'
        ];
        
        domains.forEach(domain => {
            sources.push(`https://newsapi.org/v2/everything?domains=${domain}&q=${encodeURIComponent(query)}&apiKey=${apiKey}&pageSize=${pageSize}`);
        });

        // Process all sources without limiting batches
        try {
            const batchSize = 10;
            for (let i = 0; i < sources.length; i += batchSize) {
                const batch = sources.slice(i, i + batchSize);
                const batchResponses = await Promise.all(
                    batch.map(url => fetch(url)
                        .then(res => res.json())
                        .catch(error => ({ articles: [] }))
                    )
                );
                
                batchResponses.forEach(response => {
                    if (response.articles && Array.isArray(response.articles)) {
                        allArticles = [...allArticles, ...response.articles];
                    }
                });
                
                // Small delay between batches to avoid rate limits
                if (i + batchSize < sources.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (error) {
            console.log("Error fetching batches: ", error.message);
            // Continue with whatever articles we have
        }

        // Remove duplicates and invalid articles
        const uniqueArticles = removeDuplicateArticles(allArticles);

        // Sort articles by date
        uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        // Add custom ID for each article for frontend tracking
        uniqueArticles.forEach((article, index) => {
            article.id = `article-${Date.now()}-${index}`;
        });

        console.log(`Fetched ${allArticles.length} total articles, returning ${uniqueArticles.length} unique articles`);

        // Return all results without pagination
        res.json({
            status: "ok",
            totalResults: uniqueArticles.length,
            articles: uniqueArticles
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching news', 
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    // Only log server start
    console.log(`Server running on port ${PORT}`);
}); 