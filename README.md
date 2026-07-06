# 🌾 WillowWish
> **Plant your wishes. Watch the price bend.**

WillowWish is a premium, real-time product wishlist and price tracker. It monitors e-commerce links (like Amazon, Flipkart, etc.), extracts product names, prices, and cover images, and alerts you automatically via WhatsApp when a price drops.

---

## ✨ Features

- **Dynamic Scraping Engine**: Automatically parses product names, current prices (in ₹), and product cover images from e-commerce links.
- **Price History & Alerts**: Tracks stored vs. current scraped prices. Visual indicators (green/red arrows) show price trends in the UI.
- **Customizable Dashboard Layouts**: Toggle seamlessly between list views and fluid 3-column card layouts, tailored for desktop, tablet, and mobile displays.
- **Multi-User Scaling**: Supports secure Google Sign-in / Email Auth, and stores profile-specific notification preferences (like WhatsApp numbers).
- **Automated Price Checks**: GitHub Actions run background scraper jobs to check item prices thrice daily.
- **Instant WhatsApp Alerts**: Automatically routes personalized alerts to users via Twilio when items on their list drop in price.

---

## 🛠️ Tech Stack

* **Frontend**: Angular 17, Tailwind CSS, Angular Signals (state management)
* **Backend**: Supabase (Database, Auth, Edge Functions)
* **Hosting**: Cloudflare Pages (Frontend), Supabase (Edge API)
* **CI/CD**: GitHub Actions (Automatic builds & deployments)
* **Scraper / APIs**: Deno DOM (in Edge Functions), Twilio (WhatsApp messaging API)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or newer)
- Supabase CLI (v2.107.0)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Local Environment Configuration
Create a development environment configuration file at `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_PUBLISHABLE_KEY',
};
```

### 3. Running Locally
Start the development server:
```bash
npm start
```
Navigate to `http://localhost:4200/` in your browser.

---

## 🤖 CI/CD & Deployment

This project automates builds, frontend deployments (Cloudflare Pages), and edge function updates using GitHub Actions.

### Required Secrets
Add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

| Secret Name | Description |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permissions |
| `SUPABASE_PROJECT_ID` | Supabase Project Ref |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token (`sbp_...`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (`sb_secret_...`) |

### Workflows
- **Deploy Pipeline (`deploy.yml`)**: Compiles Angular code, publishes build assets to Cloudflare Pages, and deploys Edge Functions to Supabase on every commit to `release/dev` or `main`.
- **Scraper Schedule (`thrice-daily.yml`)**: Runs background price audits thrice daily and triggers WhatsApp alerts on price drops.
