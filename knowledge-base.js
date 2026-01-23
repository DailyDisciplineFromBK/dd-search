/**
 * Daily Discipline Knowledge Base
 * Special facts, rules, and intent handling
 */

export const KNOWLEDGE_BASE = {
  // Intent detection patterns
  intents: {
    emailSubscription: {
      patterns: [
        /subscribe/i,
        /sign up for email/i,
        /get emails/i,
        /daily discipline email/i,
        /newsletter/i,
        /receive.*email/i,
        /how do i subscribe/i,
        /can i subscribe/i
      ],
      action: 'hubspot_form',
      formId: '8638e760-519a-4c2f-9580-32573fb5c959',
      requiredFields: ['email'],
      successUrl: 'https://www.dailydiscipline.com/whitelisting',
      response: "Subscribing is simple, submit this form, and you're in! Here's what to expect: Every morning, you'll get a Daily Discipline message that's direct, actionable, and built to help you do what you know you need to do. No fluff, just discipline.",
      celebratory: true
    },

    circleJoin: {
      patterns: [
        /join.*community/i,
        /circle community/i,
        /sign up.*circle/i,
        /how.*join/i,
        /become.*member/i
      ],
      action: 'redirect',
      url: 'https://app.dailydiscipline.com/sign_up',
      response: 'You can join the Daily Discipline Circle community at https://app.dailydiscipline.com/sign_up - It\'s free to join, though there are premium options available at additional cost.'
    },

    hiring: {
      patterns: [
        /hire.*bk/i,
        /hire.*me/i,
        /hire.*you/i,
        /book.*speaker/i,
        /keynote/i,
        /speaking engagement/i,
        /work with.*brian/i,
        /digvns/i,
        /hire.*brian.*kight/i,
        /speak at.*event/i,
        /speaker.*event/i,
        /book.*event/i
      ],
      action: 'hubspot_form',
      formId: 'da1e8c1d-0f0a-4484-a47c-27078682b8c5', // Keynote Inquiry
      response: "I'm so excited to learn more about your event! I know how important the outcomes of your event are to you and I know I can bring the tangible systems and energy to make it a huge success. Submit this form to get started.",
      celebratory: true
    },

    contactUs: {
      patterns: [
        /contact/i,
        /get in touch/i,
        /reach out/i,
        /question about/i
      ],
      action: 'hubspot_form',
      formId: '1691fa5c-ba0b-4d77-8793-d30955ee9286', // Contact Us
      response: 'I can help you get in touch. What would you like to contact us about?'
    },

    products: {
      patterns: [
        /buy.*journal/i,
        /purchase.*journal/i,
        /daily discipline journal/i,
        /where.*journal/i,
        /get.*journal/i
      ],
      action: 'redirect',
      url: 'https://store.tbriankight.com/products/daily-discipline-journal',
      response: 'The Daily Discipline Journal is available at the store for $25. It\'s built to help you track your daily discipline practice.',
      celebratory: true,
      productName: 'Daily Discipline Journal'
    },

    productsShirts: {
      patterns: [
        /t-shirt/i,
        /tshirt/i,
        /shirt/i,
        /dmgb.*shirt/i,
        /doesn.*matter.*better/i
      ],
      action: 'redirect',
      url: 'https://store.tbriankight.com/collections/t-shirts',
      response: 'Check out the t-shirt collection! DMGB (Doesn\'t Matter, Get Better) shirts, DIGNVS gear, and more.',
      celebratory: true,
      productName: 'T-Shirts'
    },

    productsPosters: {
      patterns: [
        /poster/i,
        /e\+r\=o.*poster/i,
        /wall art/i
      ],
      action: 'redirect',
      url: 'https://store.tbriankight.com/collections/posters',
      response: 'E+R=O posters available - great for keeping discipline visible in your space.',
      celebratory: true,
      productName: 'Posters'
    },

    productsGeneral: {
      patterns: [
        /merch/i,
        /store/i,
        /shop/i,
        /products/i,
        /buy.*gear/i
      ],
      action: 'redirect',
      url: 'https://store.tbriankight.com/',
      response: 'The store has Daily Discipline Journals, DMGB t-shirts, E+R=O posters, and more gear to support your discipline practice.',
      celebratory: true,
      productName: 'Store'
    },

    orderStatus: {
      patterns: [
        /order status/i,
        /track.*order/i,
        /where.*order/i,
        /shipping/i
      ],
      action: 'info',
      response: 'Please check your order confirmation email for tracking information. If you need additional help, you can submit a contact form and we\'ll assist you.'
    }
  },

  // Special knowledge facts
  facts: {
    book: {
      patterns: [
        /book/i,
        /publish/i,
        /above the line/i,
        /written by.*bk/i,
        /brian.*book/i
      ],
      info: `BK has not yet written a book under his own name. He worked with Urban Meyer and his dad, Tim Kight, on "Above the Line" in 2015.

However, BK is completing work on his first book titled "Daily Discipline." From DD 01-21-26: "I'm publishing my first book later this year. 365 Daily Disciplines organized into monthly themes like Simplify The Complex, Make The Truth Obvious, and Outlast The Cynics. I've sent the first draft to the publisher."

We don't have information on price or preorder availability yet.`
    },

    focus3Podcast: {
      patterns: [
        /focus 3 podcast/i,
        /focus3 podcast/i,
        /old podcast/i,
        /tim and brian podcast/i,
        /podcast with tim/i
      ],
      info: `The old Focus 3 Podcast episodes with my dad, Tim Kight, and me are no longer available. This was not our decision. You can find current content on the Daily Discipline Podcast.`
    },

    focus3Affiliation: {
      patterns: [
        /work for focus 3/i,
        /work for focus3/i,
        /still at focus 3/i,
        /focus 3 affiliation/i,
        /focus3 affiliation/i,
        /what.*focus 3/i,
        /what.*focus3/i,
        /tell.*focus 3/i,
        /about focus 3/i,
        /focus 3.*brian/i
      ],
      info: `I am no longer affiliated with Focus 3, and have not been since my departure in 2019. Focus 3 was a leadership development company where I served as CEO. My current work is through Daily Discipline, where I help people build discipline through daily practice.`,
      linkToDDEntry: true // Link to DD entry about this
    }
  },

  // Restricted/banned topics (Focus 3 trademarked content)
  restrictions: {
    focus3Trademarks: {
      bannedTerms: [
        'the r factor',
        'six disciplines of the r factor',
        'press pause',
        'get your mind right',
        'step up',
        'adjust & adapt',
        'adjust and adapt',
        'make a difference',
        'build skill',
        'lead now',
        '5-driver system',
        'five-driver system'
      ],
      replacement: 'E+R=O', // For "The R Factor"
      warning: `These concepts are proprietary and trademarked by Focus 3, LLC. BK's exit agreement forbids use of these specific systems and terminology.`,
      response: `I can help you with similar concepts through Daily Discipline principles, but I'm unable to discuss specific Focus 3 trademarked content due to legal restrictions.`
    }
  },

  // Content policy violations
  contentPolicy: {
    message: 'Your search appears to violate our use-policy. Please rephrase your question and try again.'
  }
};

/**
 * Detect intent from user query
 */
export function detectIntent(query) {
  const lowerQuery = query.toLowerCase();

  // Check for email subscription
  for (const pattern of KNOWLEDGE_BASE.intents.emailSubscription.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'emailSubscription', ...KNOWLEDGE_BASE.intents.emailSubscription };
    }
  }

  // Check for Circle community
  for (const pattern of KNOWLEDGE_BASE.intents.circleJoin.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'circleJoin', ...KNOWLEDGE_BASE.intents.circleJoin };
    }
  }

  // Check for hiring/keynote
  for (const pattern of KNOWLEDGE_BASE.intents.hiring.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'hiring', ...KNOWLEDGE_BASE.intents.hiring };
    }
  }

  // Check for products (specific first, then general)
  for (const pattern of KNOWLEDGE_BASE.intents.products.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'products', ...KNOWLEDGE_BASE.intents.products };
    }
  }

  for (const pattern of KNOWLEDGE_BASE.intents.productsShirts.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'productsShirts', ...KNOWLEDGE_BASE.intents.productsShirts };
    }
  }

  for (const pattern of KNOWLEDGE_BASE.intents.productsPosters.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'productsPosters', ...KNOWLEDGE_BASE.intents.productsPosters };
    }
  }

  for (const pattern of KNOWLEDGE_BASE.intents.productsGeneral.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'productsGeneral', ...KNOWLEDGE_BASE.intents.productsGeneral };
    }
  }

  // Check for order status
  for (const pattern of KNOWLEDGE_BASE.intents.orderStatus.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'orderStatus', ...KNOWLEDGE_BASE.intents.orderStatus };
    }
  }

  // Check for contact us (more general, check last)
  for (const pattern of KNOWLEDGE_BASE.intents.contactUs.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'contactUs', ...KNOWLEDGE_BASE.intents.contactUs };
    }
  }

  return null;
}

/**
 * Check if query mentions restricted Focus 3 content
 */
export function checkRestrictions(query) {
  const lowerQuery = query.toLowerCase();
  const restrictions = KNOWLEDGE_BASE.restrictions.focus3Trademarks;

  for (const term of restrictions.bannedTerms) {
    if (lowerQuery.includes(term)) {
      return {
        restricted: true,
        term: term,
        replacement: term === 'the r factor' ? restrictions.replacement : null,
        response: restrictions.response
      };
    }
  }

  return { restricted: false };
}

/**
 * Check if query matches special knowledge facts
 */
export function checkKnowledgeFacts(query) {
  const lowerQuery = query.toLowerCase();

  // Check book questions
  for (const pattern of KNOWLEDGE_BASE.facts.book.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'book', info: KNOWLEDGE_BASE.facts.book.info };
    }
  }

  // Check Focus 3 podcast
  for (const pattern of KNOWLEDGE_BASE.facts.focus3Podcast.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'focus3Podcast', info: KNOWLEDGE_BASE.facts.focus3Podcast.info };
    }
  }

  // Check Focus 3 affiliation
  for (const pattern of KNOWLEDGE_BASE.facts.focus3Affiliation.patterns) {
    if (pattern.test(lowerQuery)) {
      return { type: 'focus3Affiliation', info: KNOWLEDGE_BASE.facts.focus3Affiliation.info };
    }
  }

  return null;
}

/**
 * Build enhanced answer prompt with knowledge base
 */
export function buildAnswerPrompt(query, posts, intent, restrictions, knowledgeFact) {
  let contextAdditions = '';

  // Add restriction warning if applicable
  if (restrictions && restrictions.restricted) {
    contextAdditions += `\n\nIMPORTANT: The user asked about "${restrictions.term}" which is restricted content. ${restrictions.response}`;
    if (restrictions.replacement) {
      contextAdditions += ` You can discuss the concept of ${restrictions.replacement} instead.`;
    }
  }

  // Add knowledge fact if applicable
  if (knowledgeFact) {
    contextAdditions += `\n\nIMPORTANT FACT: ${knowledgeFact.info}`;
  }

  // Add intent information if applicable (but not the response text - that's shown separately)
  if (intent && intent.celebratory) {
    contextAdditions += `\n\nNOTE: The user's intent (${intent.type}) has already been addressed with a form/link. Your answer should be SHORT (1-2 sentences) and SUPPORTIVE. DO NOT repeat URLs or instructions that are already shown to the user.`;
  }

  const formattedPosts = posts.slice(0, 10)
    .map((post) => `"${post.title}"\n${post.content.slice(0, 300)}...`)
    .join('\n\n');

  return `You are BK from Daily Discipline. Answer this question directly in 2-3 paragraphs: "${query}"

${contextAdditions}

Posts: ${formattedPosts}

Be direct, actionable, simple. Tell them what to DO. Use short sentences. DO NOT make up URLs or guess at web addresses.`;
}
