# Astro Hub Documentation Site

This directory contains the static files that are published to GitHub Pages.

## Publishing Configuration

The site is published from the `main` branch using the `/docs` folder as the source. GitHub Pages is configured to serve static content from this directory.

## Building the MET App

The MET application located at `projects/2025/met/met-app/` is configured to build directly into this docs directory structure for GitHub Pages deployment.

### To build the MET app:

1. Navigate to the MET app directory:
   ```bash
   cd projects/2025/met/met-app
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Build for production:
   ```bash
   npm run build
   ```

This will generate the production build and place it in `docs/projects/2025/met/met-app/` due to the configuration in `vite.config.ts`.

### Configuration Details

The Vite configuration automatically:
- Sets the base path to `/astro-hub/projects/2025/met/met-app/` for production builds
- Outputs files to `../../../../docs/projects/2025/met/met-app` (relative to the app directory)
- Uses `emptyOutDir: false` to avoid deleting content outside the project root

### Accessing the App

After building and pushing to the main branch, the MET app will be available at:
https://webdev-it.github.io/astro-hub/projects/2025/met/met-app/