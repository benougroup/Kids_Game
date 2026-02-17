# Lumenfall

Lumenfall is a canvas-based browser game starter built with Vite + TypeScript and set up for GitHub Pages deployment.

## Requirements

- Node.js 18+
- npm 9+

## Local development

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This project is configured for GitHub Pages via Vite's `base` option:

```ts
base: process.env.BASE_PATH ?? '/lumenfall/'
```

By default, assets are served from `/lumenfall/`, which matches a repository named `lumenfall`.

### Use a different repository name

Set `BASE_PATH` to your repo path before building:

```bash
BASE_PATH=/your-repo-name/ npm run build
```

Make sure the value starts and ends with `/`.

### Automatic deployment

A GitHub Actions workflow is included in `.github/workflows/pages.yml`. On every push to `main`, it:

1. Installs dependencies.
2. Builds the project (output in `dist/`).
3. Uploads `dist/` as the Pages artifact.
4. Deploys to GitHub Pages using the official `pages` deployment action.
