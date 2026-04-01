# HTML → Image Converter
**Deploy on Vercel in 10 minutes**

---

## Step 1 — Get Browserless Token (Free)

1. Go to: https://www.browserless.io
2. Sign up for free account
3. Copy your API token from dashboard
4. Free tier: 6 hours/month of browser time (enough for personal use)

---

## Step 2 — Push to GitHub

```bash
# In this folder:
git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/html2img-converter.git
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to: https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repo
4. In **Environment Variables**, add:
   ```
   Name:  BROWSERLESS_TOKEN
   Value: your_token_from_step_1
   ```
5. Click **Deploy**

Done! Your app is live at `https://your-app.vercel.app`

---

## How It Works

```
You upload HTML → Vercel API → Browserless (real Chrome) → PNG/ZIP back to you
```

- Carousel HTML → ZIP with slide_01.png, slide_02.png...
- Single HTML → One PNG at 1080×1080px
- Real Chrome renders it → pixel perfect output

---

## Local Development (Optional)

```bash
npm install
# Create .env.local file:
echo "BROWSERLESS_TOKEN=your_token" > .env.local
npm run dev
# Open http://localhost:3000
```
