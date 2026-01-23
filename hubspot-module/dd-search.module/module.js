(function() {
  // Configuration - Get API base URL from module data attributes
  const widget = document.getElementById('dd-search-widget');
  const API_BASE_URL = widget.dataset.apiBaseUrl || 'https://dd-search-production.up.railway.app';
  const SEARCH_ENDPOINT = widget.dataset.searchEndpoint || '/search';

  console.log('Widget initialized with API:', API_BASE_URL);

  // DOM elements
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const searchStatus = document.querySelector('.dd-search-status');
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

  // Rotate prompts on page load - randomly select 4 from all available chips
  const promptsContainer = document.querySelector('.dd-example-prompts');
  if (promptsContainer) {
    const allChips = Array.from(promptsContainer.querySelectorAll('.dd-prompt-chip'));

    if (allChips.length > 4) {
      // Shuffle all chips
      const shuffled = allChips.sort(() => 0.5 - Math.random());

      // Hide all chips first
      allChips.forEach(chip => chip.style.display = 'none');

      // Show only the first 4 from shuffled array
      shuffled.slice(0, 4).forEach(chip => chip.style.display = 'inline-block');
    }
  }

  // Example prompt chip handlers
  const promptChips = document.querySelectorAll('.dd-prompt-chip');
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      searchInput.value = prompt;
      handleSearch();
    });
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
        console.error('Fallback also failed:', fallbackError);

        // FINAL SAFETY NET: Always show SOMETHING to the user
        showStatus('', '');
        searchResults.innerHTML = `
          <div class="dd-answer-container">
            <div class="dd-answer-content" style="color: #ff6b6b;">
              Search failed. Please try again or rephrase your question.
            </div>
          </div>
        `;
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
        <div id="intent-container" class="dd-intent-container"></div>
        <div id="answer-container" class="dd-answer-container">
          <div id="answer-div" class="dd-answer-content"></div>
        </div>
        <div id="posts-container" class="dd-posts-container">
          <div id="posts-div" class="dd-posts-content"></div>
        </div>
      `;

      const intentContainer = document.getElementById('intent-container');
      const answerContainer = document.getElementById('answer-container');
      const postsContainer = document.getElementById('posts-container');
      const answerDiv = document.getElementById('answer-div');
      const postsDiv = document.getElementById('posts-div');

      // Track if we have a celebratory intent (forms/CTAs)
      let hasCelebratoryIntent = false;
      let receivedAnswer = false;
      let streamTimeout;

      // Safety timeout - if no answer after 30 seconds, show error
      streamTimeout = setTimeout(() => {
        if (!receivedAnswer) {
          console.error('Stream timeout - no answer received');
          answerDiv.textContent = 'Search timed out. Please try again.';
          showStatus('', '');
          resolve();
        }
      }, 30000);

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
              clearTimeout(streamTimeout);

              // SAFETY CHECK: If stream completed but no answer was ever received
              if (!receivedAnswer && answerDiv.textContent.trim().length === 0) {
                console.error('Stream completed but no answer received');
                answerDiv.textContent = 'No results found. Please try a different search.';
              }

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

                // Track if we received an answer
                if (event === 'answer_chunk') {
                  receivedAnswer = true;
                }

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
      }).catch(err => {
        clearTimeout(streamTimeout);
        console.error('Stream error:', err);

        // ALWAYS show an error message - NEVER blank
        if (!receivedAnswer) {
          answerDiv.textContent = 'Search failed. Please try again.';
        }

        reject(err);
      });
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
        // Show answer container
        answerContainer.classList.add('has-content');
        break;

      case 'answer_complete':
        // Add disclaimer class to answer
        answerDiv.classList.add('has-disclaimer');
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
    intentContainer.classList.add('has-content');

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
          <label for="firstname-input" style="display: block; margin-bottom: 5px; font-weight: bold;">First Name:</label>
          <input type="text" id="firstname-input" name="firstname" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="First name">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="lastname-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name:</label>
          <input type="text" id="lastname-input" name="lastname" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="Last name">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="email-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
          <input type="email" id="email-input" name="email" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="your@email.com">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="phone-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone:</label>
          <input type="tel" id="phone-input" name="phone" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="(555) 555-5555">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="company-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Company/Organization:</label>
          <input type="text" id="company-input" name="company" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="Your company">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="jobtitle-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Job Title:</label>
          <input type="text" id="jobtitle-input" name="jobtitle" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="Your title">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="keynote_topic-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Keynote Topic of Interest:</label>
          <input type="text" id="keynote_topic-input" name="keynote_topic" required
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                 placeholder="What topic interests you?">
        </div>
        <div style="margin-bottom: 10px;">
          <label for="product-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Product/Event Type:</label>
          <select id="product-input" name="product" required
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="">Select one...</option>
            <option value="Keynote">Keynote Speaking</option>
            <option value="Workshop">Workshop/Training</option>
            <option value="Consulting">Consulting</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <label for="hs_persona-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Event Type:</label>
          <select id="hs_persona-input" name="hs_persona" required
                  style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="">Select one...</option>
            <option value="Corporate Event">Corporate Event</option>
            <option value="Conference">Conference</option>
            <option value="Sports Team">Sports Team</option>
            <option value="Educational Institution">Educational Institution</option>
            <option value="Non-Profit">Non-Profit</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <label for="message-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Tell us about your event:</label>
          <textarea id="message-input" name="message" rows="4"
                    style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                    placeholder="Event details, audience size, date, location, etc."></textarea>
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

    // Show posts container
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
      postsContainer.classList.add('has-content');
    }
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
      return;
    }

    // Direct answer section (BK's voice)
    const answerHTML = data.answer ? `
      <div class="dd-answer-container">
        <div class="dd-answer-content">${escapeHtml(data.answer)}</div>
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
      <div class="dd-posts-container">
        <div class="dd-posts-content">
          ${resultsHTML}
        </div>
      </div>
    `;
  }

  // Show status message
  function showStatus(message, type = '') {
    searchStatus.textContent = message;
    searchStatus.className = `dd-search-status ${type}`;
  }

  // Hide results
  function hideResults() {
    searchResults.innerHTML = '';
    // Remove has-content classes from any existing containers
    const containers = searchResults.querySelectorAll('.dd-intent-container, .dd-answer-container, .dd-posts-container');
    containers.forEach(c => c.classList.remove('has-content'));
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
