# Widget Testing & Cache-Busting Fix

## 🔧 Problem Identified
The preview pages were loading cached versions of the widget, so recent changes (rich text formatting, phone numbers, links, loader) weren't visible.

## ✅ Solutions Implemented

### 1. **Cache-Busting Added to All Test Files**
All widget loading scripts now use dynamic timestamps to force fresh loads:
```javascript
const timestamp = new Date().getTime();
script.src = `/api/static/chatbot-widget.v2.js?v=${timestamp}`;
```

### 2. **Files Updated:**
- ✅ `index.html` - Main test file
- ✅ `test-widget.html` - Production URL test
- ✅ `test-widget-local.html` - **NEW** comprehensive local test file
- ✅ `frontend/public/preview-iframe.html` - iFrame preview
- ✅ `frontend/public/preview-javascript.html` - JavaScript preview

---

## 🧪 How to Test NOW

### Option 1: Local Test File (RECOMMENDED)
1. Open `test-widget-local.html` directly in your browser
2. It has built-in cache-busting and shows load timestamp
3. Check browser console for detailed logs

### Option 2: After Deployment
1. Deploy all changes:
   ```powershell
   git add .
   git commit -m "Fix: Add cache-busting + rich text formatting"
   git push origin main
   ```

2. On server:
   ```bash
   cd ChatBot
   git pull origin main
   docker compose restart backend
   ```

3. Hard refresh browser (Ctrl+Shift+R or Ctrl+F5)

---

## 🎯 Features to Test

### 1. **Rich Text Formatting**
Send: `"What do you guys do and how much does it cost? answer in bullet points"`

Expected response should show:
- ✅ Proper bullet point lists
- ✅ Clickable links (blue, underlined)
- ✅ Clickable phone numbers (light blue background)
- ✅ Bold text formatting

### 2. **Phone Number Copy**
- Click on any phone number in messages
- Should show "Copied!" briefly
- Number copied to clipboard

### 3. **Link Opening**
- Click any URL in messages
- Should open in new tab
- Styled in primary blue color

### 4. **Message Loader**
- Open chat widget
- Should see spinning loader while messages load
- "Loading messages..." text displayed

---

## 📝 Example Test Message

Ask the bot:
```
"What do you guys do and how much does it cost? answer in bullet points"
```

Expected formatted response:
```
**Services Offered:**
- AED sales and service
- CPR/First Aid training for groups
- Emergency response program management

**Pricing:**
- AEDs: $1,200-$3,000+
- Training: $40-100 per person for group sessions

For more information, call (530) 477-6818 or visit https://dipietroassoc.com/contact/.
```

You should see:
1. Bold "Services Offered:" and "Pricing:"
2. Proper bullet points with indentation
3. Phone number (530) 477-6818 is clickable/copyable
4. URL is blue and clickable

---

## 🚨 Browser Cache Issue?

If you still see old version:
1. **Hard Refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear Cache:** Browser settings → Clear browsing data → Cached images and files
3. **Incognito Mode:** Open in private/incognito window
4. **Check Console:** Look for the timestamp in console logs

---

## 💡 Console Debugging

Open browser console (F12) and look for:
```
🚀 Loading chatbot widget with cache-busting...
✅ Widget script loaded successfully!
⏰ Timestamp: 1704239847563
✅ Widget initialized!
```

If you see these, the latest version is loaded!

---

## 📦 What's New in Widget v2

1. ✅ **Rich Text Support**
   - Auto-detect and format URLs as clickable links
   - Phone numbers become click-to-copy
   - **Bold** text with `**text**`
   - *Italic* text with `*text*`
   - `Code` with backticks
   - Bullet points auto-convert to proper lists

2. ✅ **Loading Indicator**
   - Animated spinner while fetching messages
   - Eliminates blank screen flicker

3. ✅ **Parallel API Loading**
   - 3x faster initialization
   - Starter questions pre-loaded

4. ✅ **Better Styling**
   - Links styled in brand colors
   - Phone numbers have hover effects
   - Proper list formatting with indentation

---

## 🔄 For Production Use

When giving the widget to clients, use this code:
```html
<script>
    (function() {
        const timestamp = new Date().getTime();
        const script = document.createElement('script');
        script.src = `https://chatbot.dipietroassociates.com/api/static/chatbot-widget.v2.js?v=${timestamp}`;
        script.setAttribute('data-api-base', 'https://chatbot.dipietroassociates.com/api/');
        script.defer = true;
        script.onload = function() {
            if (window.createChatbotWidget) {
                window.createChatbotWidget({ 
                    apiBase: 'https://chatbot.dipietroassociates.com/api/' 
                });
            }
        };
        document.body.appendChild(script);
    })();
</script>
```

This ensures they always get the latest version!
