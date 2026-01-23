# Intelligent Assistant Features Guide

Your search is now an **intelligent assistant** that can handle actions, not just search results!

## 🎯 What's New

The Daily Discipline search now detects user intent and provides multi-modal responses:
- **Inline forms** for subscriptions and inquiries
- **Direct links** to community and store
- **Knowledge base** for special topics (book, Focus 3, etc.)
- **Content filtering** for restricted topics

## 🧪 Testing Scenarios

Railway is deploying the backend now (2-3 minutes). Once deployed, test these scenarios:

### 1. Email Subscription ✉️

**Test queries:**
- "How do I subscribe?"
- "Sign up for emails"
- "Get Daily Discipline email"
- "Newsletter"
- "I want to receive emails"

**Expected behavior:**
- Shows inline email form
- One field: email address
- Submit button
- On success: shows whitelisting link (https://www.dailydiscipline.com/whitelisting)
- Submits to HubSpot Form ID: `8638e760-519a-4c2f-9580-32573fb5c959`

### 2. Circle Community 👥

**Test queries:**
- "How do I join the community?"
- "Circle community"
- "Sign up for Circle"
- "Become a member"

**Expected behavior:**
- Shows message: "You can join the Daily Discipline Circle community"
- Direct link button to: https://app.dailydiscipline.com/sign_up
- Mentions it's free with premium options

### 3. Hiring/Speaking Inquiries 🎤

**Test queries:**
- "Hire BK to speak"
- "Book Brian for keynote"
- "Speaking engagement"
- "Work with Brian Kight"
- "DIGVNS inquiry"

**Expected behavior:**
- Shows inline keynote inquiry form
- Fields: Name, Email, Message
- Submit button
- On success: "Thank you! We'll be in touch soon."
- Submits to HubSpot Form ID: `da1e8c1d-0f0a-4484-a47c-27078682b8c5`

### 4. Contact Us 📞

**Test queries:**
- "Contact us"
- "Get in touch"
- "I have a question"

**Expected behavior:**
- Shows inline contact form
- Fields: Name, Email, Message
- Submit button
- On success: "Thank you! We'll be in touch soon."
- Submits to HubSpot Form ID: `1691fa5c-ba0b-4d77-8793-d30955ee9286`

### 5. Product Purchases 🛍️

**Test queries:**
- "Buy Daily Discipline journal"
- "Purchase journal"
- "T-shirt"
- "Wristband"
- "Merch"
- "Store"

**Expected behavior:**
- Shows message about products
- Direct link button to: https://store.tbriankight.com/
- Button text: "Visit Store →"

### 6. Order Status 📦

**Test queries:**
- "Order status"
- "Track my order"
- "Where is my order?"
- "Shipping"

**Expected behavior:**
- Informational message: "Check your order confirmation email for tracking"
- Suggests submitting contact form if needed
- NO form shown (just info)

### 7. Book Inquiries 📖

**Test queries:**
- "Has BK written a book?"
- "Brian Kight book"
- "Above the Line"
- "Daily Discipline book"
- "When is the book coming out?"

**Expected behavior:**
- Answer mentions: "BK has not yet written a book under his own name"
- Mentions "Above the Line" (2015) with Urban Meyer and Tim Kight
- Mentions upcoming "Daily Discipline" book (2026)
- Includes quote from DD 01-21-26
- States: "We don't have information on price or preorder yet"
- **Never makes up pricing or preorder info**

### 8. Focus 3 Restrictions 🚫 (CRITICAL)

**Test queries - Restricted:**
- "What is The R Factor?"
- "Tell me about the Six Disciplines"
- "Press Pause technique"
- "Get Your Mind Right"
- "Focus 3 methodology"
- "Lead Now"

**Expected behavior:**
- **NEVER uses Focus 3 trademarked terms** in response
- For "The R Factor" → mentions "E+R=O" instead
- Shows: "Unable to discuss specific Focus 3 trademarked content due to legal restrictions"
- Offers Daily Discipline alternatives
- **Conservative and careful** with language

**Test queries - Allowed:**
- "Focus 3 podcast"
- "Do you work for Focus 3?"
- "What happened to the old podcast?"

**Expected behavior:**
- "Old episodes of the Focus 3 Podcast... are no longer available"
- "This was not our decision"
- Directs to Daily Discipline Podcast
- For affiliation: "I am no longer affiliated with Focus 3, and have not been since my departure in 2019"
- May link to DD entry about this

### 9. Content Policy Violations 🛡️

**Test queries:**
- Self-harm language
- Explicit/vulgar content
- Inappropriate requests

**Expected behavior:**
- **Does NOT go blank**
- Shows: "Your search appears to violate our use-policy. Please rephrase your question and try again."
- Graceful handling, not system error

### 10. Normal Search (Still Works!) 🔍

**Test queries:**
- "How to build discipline"
- "Morning routine"
- "Overcoming procrastination"

**Expected behavior:**
- Standard search results as before
- BK's answer streaming in real-time
- Related posts
- < 5 second perceived time

## 📊 How It Works

### Backend Flow:

1. **Query received** → Intent detection runs
2. **Check restrictions** → Focus 3 filtering
3. **Check knowledge facts** → Special topics
4. **Send intent event** → Frontend receives action
5. **Run search** → Still finds relevant posts
6. **Stream answer** → Enhanced with context
7. **Show results** → Multi-modal response

### Frontend Flow:

1. **Receive `intent_detected` event**
2. **Determine action type:**
   - `hubspot_form` → Render inline form
   - `redirect` → Show link button
   - `info` → Show informational text
3. **User interacts:**
   - Fills form → Submit to `/submit-form` endpoint
   - Clicks link → Opens in new tab
4. **Backend submits to HubSpot** → Real submission
5. **Show success** → Whitelisting link or confirmation

## 🔍 Debugging

### Check Backend Logs (Railway):

Look for these log entries:
```
🔍 Search query: "how do I subscribe"
Intent detected: emailSubscription
Restrictions: none
Knowledge fact: none
📝 Form submission: 8638e760-519a-4c2f-9580-32573fb5c959
✅ HubSpot form submitted: 8638e760-519a-4c2f-9580-32573fb5c959
```

### Check Frontend Console:

Look for these console logs:
```
Making streaming request to: ...
Intent detected: {type: 'emailSubscription', action: 'hubspot_form', ...}
Submitting form: 8638e760-519a-4c2f-9580-32573fb5c959 {email: 'test@example.com'}
```

### Verify HubSpot Submissions:

1. Go to HubSpot dashboard
2. Navigate to **Contacts** → **Forms**
3. Find the form (Email Subscription, Contact Us, or Keynote Inquiry)
4. Check recent submissions
5. Verify data appears correctly

## 🚨 Important Notes

### Focus 3 Restrictions (CRITICAL):

**Never mention these terms:**
- "The R Factor"
- "Six Disciplines of the R Factor"
- "Press Pause"
- "Get Your Mind Right"
- "Step Up"
- "Adjust & Adapt"
- "Make a Difference"
- "Build Skill"
- "Lead Now"
- "5-Driver System"

**Why?** These are trademarked by Focus 3, LLC. BK's exit agreement forbids using these specific terms and systems.

**What to do instead:**
- Use "E+R=O" for "The R Factor"
- Explain concepts using Daily Discipline principles
- Be conservative - when in doubt, don't mention it

### Book Information:

**Never make up:**
- Book price
- Preorder dates
- Publisher name
- Release date specifics

**Only state:**
- "Publishing later this year" (2026)
- "First draft sent to publisher"
- "365 Daily Disciplines"
- "Monthly themes: Simplify The Complex, Make The Truth Obvious, Outlast The Cynics"

## 🎉 Expected User Experience

### Before:
- Search only returned posts
- No action capability
- Had to leave site for subscriptions/contact

### Now:
- Detects what user wants to DO
- Provides inline forms (no navigation away)
- Handles special knowledge (book, Focus 3)
- Still shows great search results
- Faster, more helpful, more complete

## 📈 Metrics to Track

After deployment, monitor:

1. **Form submissions** in HubSpot:
   - Email subscriptions
   - Contact form entries
   - Keynote inquiries

2. **Intent detection rate**:
   - How many searches trigger intents?
   - Which intents are most common?

3. **Conversion improvements**:
   - Before: Users had to find contact page
   - Now: Inline forms in search results

4. **Focus 3 mentions**:
   - Are restrictions working?
   - Any leakage of trademarked terms?

## 🔧 Troubleshooting

**Form doesn't appear:**
- Check Railway logs for "Intent detected"
- Check browser console for `intent_detected` event
- Verify pattern matching in `knowledge-base.js`

**Form submission fails:**
- Check Railway logs for HubSpot API errors
- Verify Form IDs are correct
- Check HubSpot portal ID (108516)
- Test HubSpot API directly

**Restricted content appears:**
- Check `checkRestrictions()` function
- Add more banned terms if needed
- Review answer generation prompts

**Normal search broken:**
- Intent detection is **non-blocking**
- Search still runs even with intent detected
- Check for JavaScript errors in console

## 🚀 Deployment Status

- ✅ Backend committed and pushed
- ✅ Frontend widget uploaded to HubSpot
- 🔄 Railway deploying (2-3 minutes)
- ⏳ Waiting for deployment complete

Once Railway shows "Deployment successful", all features will be live!

## 📞 Next Steps

1. Wait for Railway deployment (check dashboard)
2. Hard refresh your search page: `Cmd + Shift + R`
3. Test each scenario above
4. Check HubSpot for form submissions
5. Monitor Railway logs for any errors
6. Report any issues or unexpected behavior

---

**This is a major upgrade!** Your search is now an intelligent assistant that:
- ✅ Understands intent
- ✅ Takes actions (forms, redirects)
- ✅ Knows special facts (book, Focus 3)
- ✅ Filters restricted content
- ✅ Still provides great search results
- ✅ Streams in real-time (< 5s)

Let me know once Railway finishes deploying and we can test together!
