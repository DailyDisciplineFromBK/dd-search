/**
 * HubSpot Forms API Integration
 * Submits form data to HubSpot
 */

const HUBSPOT_PORTAL_ID = '108516';

/**
 * Submit a form to HubSpot
 * @param {string} formId - HubSpot form GUID
 * @param {object} fields - Form field values (key-value pairs)
 * @param {object} context - Optional context (pageUri, pageName, etc.)
 */
export async function submitHubSpotForm(formId, fields, context = {}) {
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formId}`;

  // Convert fields object to HubSpot format
  const hubspotFields = Object.keys(fields).map(key => ({
    name: key,
    value: fields[key]
  }));

  const payload = {
    fields: hubspotFields,
    context: {
      pageUri: context.pageUri || 'https://www.dailydiscipline.com/search',
      pageName: context.pageName || 'Daily Discipline Search',
      ...context
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ HubSpot form submitted:', formId);
    return { success: true, data };

  } catch (error) {
    console.error('❌ HubSpot form submission failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit email subscription
 */
export async function submitEmailSubscription(email, context = {}) {
  return submitHubSpotForm(
    '8638e760-519a-4c2f-9580-32573fb5c959',
    { email },
    context
  );
}

/**
 * Submit contact form
 */
export async function submitContactForm(formData, context = {}) {
  return submitHubSpotForm(
    '1691fa5c-ba0b-4d77-8793-d30955ee9286',
    formData,
    context
  );
}

/**
 * Submit keynote inquiry
 */
export async function submitKeynoteInquiry(formData, context = {}) {
  return submitHubSpotForm(
    'da1e8c1d-0f0a-4484-a47c-27078682b8c5',
    formData,
    context
  );
}
