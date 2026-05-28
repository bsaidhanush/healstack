# HealStack Developer Documentation Portal

This is the developer documentation portal for HealStack, built using **Next.js App Router**, **TypeScript**, and **Tailwind CSS**. It provides a 5-minute integration quickstart, detailed setup instructions for Web and Flutter SDKs, FastAPI backend deployment guidelines, and dashboard console references.

---

## Getting Started

To run the documentation portal locally on your workstation:

1. **Navigate to the docs directory:**
   ```bash
   cd docs-site
   ```

2. **Install package dependencies:**
   ```bash
   npm install
   ```

3. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```

4. **Open your web browser:**
   Open [http://localhost:3000](http://localhost:3000) to view the live responsive developer portal.

---

## Project Structure

- `src/app/page.tsx`: The core multi-section workspace containing code highlights, sidebar navigations, and quickstart tutorials.
- `src/app/globals.css`: Contains dark-mode color variables, custom scrollbar tracks, copy success toast animations, and glows.
- `public/`: Assets and icon resources.

---

## Production Compilation

To compile and verify the production build locally:

```bash
npm run build
```
This performs strict ESLint and TypeScript code validation, generating a fully optimized static website ready for deployment.

---

## Cloud Deployment

Because the documentation website is compiled as optimized static assets, it can be hosted for **free** on major cloud hosting platforms:

### Option 1: Vercel (Recommended)
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` in the `docs-site` directory and follow the prompts to deploy in seconds.

### Option 2: Netlify
1. Connect your GitHub repository to Netlify.
2. Select the `docs-site` directory as your base directory.
3. Configure the Build settings:
   - Build command: `npm run build`
   - Publish directory: `docs-site/out` (if using static export) or Next.js adapter.
