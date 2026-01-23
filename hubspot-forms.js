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
    console.log('📝 Submitting to HubSpot:', { formId, fields: Object.keys(fields) });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('HubSpot response status:', response.status);
    console.log('HubSpot response body:', responseText);

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // Response might not be JSON
      data = { message: responseText };
    }

    console.log('✅ HubSpot form submitted successfully:', formId);
    return { success: true, data };

  } catch (error) {
    console.error('❌ HubSpot form submission failed:', error);
    console.error('Form ID:', formId);
    console.error('Fields:', fields);
    console.error('Payload:', JSON.stringify(payload, null, 2));
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
