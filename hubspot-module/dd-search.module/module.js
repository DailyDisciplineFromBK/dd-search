(function() {
  // Configuration - Production API
  const API_BASE_URL = 'https://dd-search-production.up.railway.app';

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

  // Handle search with streaming for real-time results
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
      hideResults();

      // Show initial status
      showStatus('Starting search...', 'loading');

      console.log('Making streaming request to:', API_BASE_URL + '/search/stream');
      console.log('Query:', query);

      // Use streaming for real-time results
      await searchWithStreaming(query);

    } catch (error) {
      console.error('Search error details:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);

      // Fallback to non-streaming if streaming fails
      console.log('Streaming failed, falling back to standard search...');
      try {
        await searchWithoutStreaming(query);
      } catch (fallbackError) {
        showStatus('Search failed: ' + fallbackError.message, 'error');
      }
    } finally {
      isSearching = false;
      searchButton.disabled = false;
    }
  }

  // Streaming search using Server-Sent Events
  async function searchWithStreaming(query) {
    return new Promise((resolve, reject) => {
      // Prepare search results container
      searchResults.innerHTML = `
        <div class="direct-answer">
          <div class="answer-label">FROM BK</div>
          <div class="answer-text" id="streaming-answer"></div>
        </div>
        <div class="results-header">Related Posts</div>
        <div class="results-list" id="streaming-posts"></div>
      `;
      searchResults.classList.add('visible');

      const answerDiv = document.getElementById('streaming-answer');
      const postsDiv = document.getElementById('streaming-posts');

      // Create fetch request for streaming
      const response = fetch(`${API_BASE_URL}/search/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      response.then(res => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function processStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              resolve();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;

              const eventMatch = line.match(/^event: (.+)$/m);
              const dataMatch = line.match(/^data: (.+)$/m);

              if (eventMatch && dataMatch) {
                const event = eventMatch[1];
                const data = JSON.parse(dataMatch[1]);
                handleStreamEvent(event, data, answerDiv, postsDiv);
              }
            }

            processStream();
          }).catch(reject);
        }

        processStream();
      }).catch(reject);
    });
  }

  // Handle streaming events
  function handleStreamEvent(event, data, answerDiv, postsDiv) {
    switch (event) {
      case 'status':
        showStatus(data.message, 'loading');
        break;

      case 'expanded':
        console.log('Expanded queries:', data.queries);
        break;

      case 'posts_found':
        showStatus(`Found ${data.count} relevant posts...`, 'loading');
        break;

      case 'answer_chunk':
        // Append text chunk to answer as it arrives
        answerDiv.textContent += data.text;
        break;

      case 'answer_complete':
        showStatus('Finding the best posts...', 'loading');
        break;

      case 'results':
        // Display posts
        displayPosts(data.posts, postsDiv);
        break;

      case 'complete':
        showStatus('');
        console.log(`Search completed in ${data.searchTime}ms`);
        break;

      case 'error':
        showStatus(data.message, 'error');
        break;
    }
  }

  // Display posts (for streaming)
  function displayPosts(posts, container) {
    const postsHTML = posts.map((result) => {
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

    container.innerHTML = postsHTML;
  }

  // Fallback: non-streaming search
  async function searchWithoutStreaming(query) {
    showStatus('Searching...', 'loading');

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

    const data = await response.json();
    displayResults(data);
    showStatus('');
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
    const resultsHTML = data.results.map((result) => {
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
})();
