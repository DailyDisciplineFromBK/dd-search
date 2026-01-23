# HubSpot CAPTCHA Fix - Form Submission Issue

## 🚨 The Problem

Your forms are failing with this error:
```
Form has RECAPTCHA enabled. Can't receive API submissions as Captcha (SPAM prevention) is enabled.
```

**Why:** HubSpot forms with CAPTCHA enabled **cannot accept API submissions**. Our search widget submits forms via API, so CAPTCHA blocks it.

## ✅ The Solution

You need to **disable CAPTCHA** on these forms in HubSpot:

### Forms That Need CAPTCHA Disabled:

1. **Keynote Inquiry Form** - ID: `12h6MHQ8KRISkfCcHhoK4xQ2bqc`
2. **Contact Us Form** - ID: `1691fa5c-ba0b-4d77-8793-d30955ee9286`
3. **Email Subscription Form** - ID: `8638e760-519a-4c2f-9580-32573fb5c959` (if you have CAPTCHA on this too)

## 📋 Step-by-Step Instructions

### Option 1: Disable CAPTCHA Completely (Recommended for API Forms)

1. **Go to HubSpot Forms:**
   - Click **Marketing** → **Lead Capture** → **Forms**

2. **Find the Form:**
   - Search for "Keynote Inquiry" or use form ID `12h6MHQ8KRISkfCcHhoK4xQ2bqc`
   - Click to edit the form

3. **Navigate to Options:**
   - Click the **Options** tab (top of form editor)

4. **Find CAPTCHA Setting:**
   - Scroll to **"CAPTCHA"** section
   - You'll see something like "Add reCAPTCHA to this form"

5. **Disable CAPTCHA:**
   - Toggle it **OFF** or select **"No CAPTCHA"**
   - Click **Update** or **Save**

6. **Repeat for Other Forms:**
   - Do the same for "Contact Us" form (`1691fa5c-ba0b-4d77-8793-d30955ee9286`)
   - And "Email Subscription" form (`8638e760-519a-4c2f-9580-32573fb5c959`) if needed

### Option 2: Use HubSpot's Invisible reCAPTCHA (If Available)

If your HubSpot plan supports it:

1. Go to **Settings** → **Marketing** → **CAPTCHA**
2. Enable **"Invisible reCAPTCHA"**
3. This MAY allow API submissions while still providing spam protection
4. Test to verify it works

### Option 3: Use HubSpot's API Key Authentication

If you want spam protection but need API submissions:

1. Keep CAPTCHA disabled on forms
2. Use HubSpot's built-in spam detection (happens automatically)
3. Monitor submissions for spam
4. Use HubSpot workflows to filter suspicious submissions

## 🧪 How to Test After Disabling CAPTCHA

1. **Wait 2-3 minutes** for Railway to redeploy (should be automatic)

2. **Clear browser cache** and **use Incognito mode**

3. **Test the form:**
   - Search: "Can I hire you to speak?"
   - Fill out the form
   - Click Submit

4. **Check HubSpot:**
   - Go to **Contacts** → **Forms** → **Keynote Inquiry**
   - Check **Submissions** tab
   - You should see your test submission!

5. **Check Railway Logs:**
   - Should see: `✅ HubSpot form submitted successfully`
   - No more "Form has RECAPTCHA enabled" error

## ⚠️ Important Notes

### About Spam Protection:

**Without CAPTCHA, won't I get spam?**
- HubSpot has **built-in spam detection** that works automatically
- It uses IP blocking, pattern detection, and honeypot fields
- For forms embedded in your own site (dailydiscipline.com), spam is usually minimal

**If you do get spam:**
1. Monitor submissions for the first week
2. Use HubSpot **Workflows** to auto-delete obvious spam
3. Consider using **Form field validation** (email format, required fields)
4. Use **Progressive profiling** to require more info from repeat visitors

### Alternative: Create Separate API-Friendly Forms

If you want CAPTCHA for public forms but API submission for the widget:

1. **Clone** your existing forms
2. Name them: "Keynote Inquiry (API)" and "Contact Us (API)"
3. **Disable CAPTCHA** on the API versions
4. **Keep CAPTCHA** on the public versions
5. Update our widget to use the API form IDs

## 🔍 Verify CAPTCHA is Disabled

After disabling, verify in the form editor:

1. Edit the form
2. Go to **Options** tab
3. Look for CAPTCHA section
4. Should say: **"No CAPTCHA"** or toggle should be **OFF**
5. If you see reCAPTCHA logo/badge, it's still enabled

## 📊 Expected Results

**Before (with CAPTCHA):**
```
❌ HubSpot form submission failed
Error: Form has RECAPTCHA enabled
```

**After (CAPTCHA disabled):**
```
✅ HubSpot form submitted successfully
Form ID: 12h6MHQ8KRISkfCcHhoK4xQ2bqc
```

## 🆘 Still Having Issues?

### If form still fails after disabling CAPTCHA:

1. **Check the form ID is correct:**
   - In HubSpot, edit the form
   - Look at the URL: `...forms/12h6MHQ8KRISkfCcHhoK4xQ2bqc`
   - Verify it matches our form IDs in the code

2. **Check required fields:**
   - Our code sends: `firstname`, `email`, `message`
   - HubSpot form must have fields with **exactly these names**
   - Field labels don't matter, internal names must match

3. **Check Railway logs:**
   - Look for the full payload being sent
   - Check if HubSpot returns a different error

4. **Try submitting directly in HubSpot:**
   - Go to the form in HubSpot
   - Click "Test" or "Preview"
   - Try submitting manually
   - If that fails, the form itself has an issue

## 📞 HubSpot Support

If you need help finding these settings:

- HubSpot Knowledge Base: https://knowledge.hubspot.com/forms/use-recaptcha-in-your-forms
- HubSpot Support: https://help.hubspot.com/

Search for: "disable reCAPTCHA on forms" or "API form submissions"

---

**Bottom Line:** Disable CAPTCHA on the three forms, wait 2-3 minutes, test in Incognito. Form submissions should work!
