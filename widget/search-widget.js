// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change this to your production API URL

// DOM elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchStatus = document.getElementById('search-status');
const searchResults = document.getElementById('search-results');

// State
let isSearching = false;

// Initialize
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// Handle search
async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    showStatus('Please enter a search query', 'error');
    return;
  }

  if (isSearching) {
    return;
  }

  try {
    isSearching = true;
    searchButton.disabled = true;
    showStatus('Searching...', 'loading');
    hideResults();

    const results = await searchAPI(query);
    displayResults(results);
    showStatus('');
  } catch (error) {
    console.error('Search error:', error);
    showStatus('Search failed. Please try again.', 'error');
  } finally {
    isSearching = false;
    searchButton.disabled = false;
  }
}

// Call the search API
async function searchAPI(query) {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Display results
function displayResults(data) {
  if (!data.results || data.results.length === 0) {
    searchResults.innerHTML = `
      <div class="no-results">
        <h3>No results found</h3>
        <p>Try a different search query</p>
      </div>
    `;
    searchResults.classList.add('visible');
    return;
  }

  // Direct answer section (BK's voice)
  const answerHTML = data.answer ? `
    <div class="direct-answer">
      <div class="answer-label">FROM BK</div>
      <div class="answer-text">${escapeHtml(data.answer)}</div>
    </div>
  ` : '';

  // Related posts section
  const resultsHTML = data.results.map((result, index) => {
    const date = new Date(result.published_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="result-card">
        <h3 class="result-title">
          <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(result.title)}
          </a>
        </h3>
        <div class="result-meta">
          <span>${date}</span>
        </div>
        <div class="result-relevance">
          ${escapeHtml(result.relevance)}
        </div>
        <div class="result-content">
          ${escapeHtml(result.content)}
        </div>
        <a href="${escapeHtml(result.url)}" class="result-link" target="_blank" rel="noopener noreferrer">
          Read full post →
        </a>
      </div>
    `;
  }).join('');

  searchResults.innerHTML = `
    ${answerHTML}
    <div class="results-header">Related Posts</div>
    <div class="results-list">
      ${resultsHTML}
    </div>
  `;

  searchResults.classList.add('visible');
}

// Show status message
function showStatus(message, type = '') {
  searchStatus.textContent = message;
  searchStatus.className = `search-status ${type}`;

  if (type === 'loading') {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    searchStatus.prepend(spinner);
  }
}

// Hide results
function hideResults() {
  searchResults.classList.remove('visible');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Optional: Auto-focus search input on page load
searchInput.focus();
