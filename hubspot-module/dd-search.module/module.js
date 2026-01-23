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
      // Prepare search results container with separate intent and answer sections
      searchResults.innerHTML = `
        <div id="intent-container" style="display: none;"></div>
        <div id="answer-container" class="direct-answer">
          <div class="answer-label">FROM BK</div>
          <div class="answer-text" id="streaming-answer"></div>
        </div>
        <div id="posts-container">
          <div class="results-header">Related Posts</div>
          <div class="results-list" id="streaming-posts"></div>
        </div>
      `;
      searchResults.classList.add('visible');

      const intentContainer = document.getElementById('intent-container');
      const answerContainer = document.getElementById('answer-container');
      const postsContainer = document.getElementById('posts-container');
      const answerDiv = document.getElementById('streaming-answer');
      const postsDiv = document.getElementById('streaming-posts');

      // Track if we have a celebratory intent (forms/CTAs)
      let hasCelebratoryIntent = false;

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
                handleStreamEvent(event, data, {
                  intentContainer,
                  answerContainer,
                  postsContainer,
                  answerDiv,
                  postsDiv,
                  hasCelebratoryIntent: () => hasCelebratoryIntent,
                  setHasCelebratoryIntent: (val) => { hasCelebratoryIntent = val; }
                });
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
  function handleStreamEvent(event, data, containers) {
    const { intentContainer, answerContainer, postsContainer, answerDiv, postsDiv, hasCelebratoryIntent, setHasCelebratoryIntent } = containers;

    switch (event) {
      case 'status':
        showStatus(data.message, 'loading');
        break;

      case 'intent_detected':
        // Handle special intents (forms, redirects, etc.)
        handleIntent(data, intentContainer, answerDiv);

        // If this is a celebratory intent (form/CTA), hide posts and modify answer container
        if (data.celebratory) {
          setHasCelebratoryIntent(true);
          postsContainer.style.display = 'none';
        }
        break;

      case 'expanded':
        console.log('Expanded queries:', data.queries);
        break;

      case 'posts_found':
        // Only show this status if not celebratory
        if (!hasCelebratoryIntent()) {
          showStatus(`Found ${data.count} relevant posts...`, 'loading');
        }
        break;

      case 'answer_chunk':
        // Append text chunk to answer as it arrives
        answerDiv.textContent += data.text;
        break;

      case 'answer_complete':
        // Only show this status if not celebratory
        if (!hasCelebratoryIntent()) {
          showStatus('Finding the best posts...', 'loading');
        }
        break;

      case 'results':
        // Only display posts if not celebratory
        if (!hasCelebratoryIntent()) {
          displayPosts(data.posts, postsDiv);
        }
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

  // Handle special intents
  function handleIntent(intent, intentContainer, answerDiv) {
    console.log('Intent detected:', intent);

    // Show the intent container
    intentContainer.style.display = 'block';

    if (intent.action === 'hubspot_form') {
      // Show inline form in intent container
      renderInlineForm(intent, intentContainer);

      // Show celebratory message in answer div if provided
      if (intent.response) {
        answerDiv.textContent = intent.response;
      }
    } else if (intent.action === 'redirect') {
      // Show redirect link in intent container
      intentContainer.innerHTML = `
        <div style="margin-bottom: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <a href="${escapeHtml(intent.url)}" target="_blank" class="intent-link" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
            ${intent.intentType === 'circleJoin' ? 'Join Community' : 'Visit Store'} →
          </a>
        </div>
      `;

      // Show message in answer div
      answerDiv.textContent = intent.response;
    } else if (intent.action === 'info') {
      // Just show informational text in answer div
      answerDiv.textContent = intent.response;
    }
  }

  // Render inline form for HubSpot submission
  function renderInlineForm(intent, container) {
    let formHTML = `
      <div class="intent-form" style="margin-bottom: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <form id="inline-form" style="margin-top: 15px;">
    `;

    // Add form fields based on intent type
    if (intent.intentType === 'emailSubscription') {
      formHTML += `
        <div style="margin-bottom: 10px;">
          <label for="email-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
          <input type="email" id="email-input" name="email" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="your@email.com">
        </div>
      `;
    } else if (intent.intentType === 'hiring') {
      formHTML += `
        <div style="margin-bottom: 10px;">
          <label for="name-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
          <input type="text" id="name-input" name="firstname" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="Your name">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="email-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
          <input type="email" id="email-input" name="email" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="your@email.com">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="message-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Message:</label>
          <textarea id="message-input" name="message" required rows="4"
                    style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                    placeholder="Tell us about your event..."></textarea>
        </div>
      `;
    } else if (intent.intentType === 'contactUs') {
      // Contact Us form might need different field names
      formHTML += `
        <div style="margin-bottom: 10px;">
          <label for="name-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Full Name:</label>
          <input type="text" id="name-input" name="name" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="Your name">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="email-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
          <input type="email" id="email-input" name="email" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="your@email.com">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="subject-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Subject:</label>
          <input type="text" id="subject-input" name="subject" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="What's this about?">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="message-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Message:</label>
          <textarea id="message-input" name="message" required rows="4"
                    style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                    placeholder="Your message..."></textarea>
        </div>
      `;
    }

    formHTML += `
          <button type="submit" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
            Submit
          </button>
          <div id="form-status" style="margin-top: 10px; display: none;"></div>
        </form>
      </div>
    `;

    container.innerHTML = formHTML;

    // Attach form submit handler
    document.getElementById('inline-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitInlineForm(intent, e.target);
    });
  }

  // Submit inline form to backend
  async function submitInlineForm(intent, formElement) {
    const formStatus = document.getElementById('form-status');
    const submitButton = formElement.querySelector('button[type="submit"]');

    try {
      submitButton.disabled = true;
      formStatus.textContent = 'Submitting...';
      formStatus.style.display = 'block';
      formStatus.style.color = '#666';

      // Collect form data
      const formData = new FormData(formElement);
      const fields = {};
      formData.forEach((value, key) => {
        fields[key] = value;
      });

      console.log('Submitting form:', intent.formId, fields);

      // Submit to backend
      const response = await fetch(`${API_BASE_URL}/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: intent.formId,
          fields: fields,
          context: {
            pageUri: window.location.href,
            pageName: document.title
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.status}`);
      }

      const result = await response.json();

      // Show success message
      formStatus.textContent = 'Success! ✓';
      formStatus.style.color = '#0a0';

      // Hide form, show success with redirect if applicable
      setTimeout(() => {
        if (intent.successUrl) {
          formElement.innerHTML = `
            <p style="color: #0a0; font-weight: bold;">✓ Submission successful!</p>
            <p>Next step: <a href="${escapeHtml(intent.successUrl)}" target="_blank" style="color: #000; text-decoration: underline;">
              ${intent.intentType === 'emailSubscription' ? 'Whitelist our email' : 'Continue'}
            </a></p>
          `;
        } else {
          formElement.innerHTML = `
            <p style="color: #0a0; font-weight: bold;">✓ Thank you! We'll be in touch soon.</p>
          `;
        }
      }, 1000);

    } catch (error) {
      console.error('Form submission error:', error);
      formStatus.textContent = 'Submission failed. Please try again.';
      formStatus.style.color = '#c00';
      submitButton.disabled = false;
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
