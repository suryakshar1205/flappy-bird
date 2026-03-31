# Flappy Voice Web Deployment

This project now includes a browser-ready build:

- `index.html`
- `styles.css`
- `app.js`
- `assets/`

## Sanity check before deploy

Run this before publishing:

```bash
npm run sanity-check
```

If you use VS Code, there is also a built-in task:

- `Terminal` -> `Run Task` -> `Sanity Check`

## What it supports

- Responsive canvas layout for phones, tablets, laptops, and desktops
- Voice input in supported browsers
- Tap / click fallback controls
- Local top-5 score persistence with `localStorage`

## Important microphone note

Voice input needs a secure context in browsers. That means:

- `http://localhost` works for local testing
- A deployed site must use `https://`

## Easy deployment options

### Netlify

1. Create a new site from this folder.
2. Use the project root as the publish directory.
3. No build command is required.

This repo already includes `netlify.toml`.

### Vercel

1. Import the folder or repo into Vercel.
2. Deploy it as a static site.
3. No framework preset is required.

This repo already includes `vercel.json`.

### GitHub Pages

1. Push the project to a GitHub repository.
2. Enable GitHub Pages from the repository root.
3. Serve from the default branch.

## Shared leaderboard note

The web build stores top scores in browser `localStorage`, so scores are saved per device / browser.
If you want one shared leaderboard for every player, the next step is a backend or database.
