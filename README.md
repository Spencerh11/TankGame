# TankGame

A fast-paced tank arena built with TypeScript, Vite, and Phaser 3.

## Controls
- **WASD**: Move the tank
- **Mouse**: Aim the turret
- **Left click**: Fire a bouncing shell
- **R**: Restart after death

## Local development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```
The static site will be generated in `dist/`.

## GitHub Pages
The game is configured for GitHub Pages with `base: './'` in Vite. After pushing to `main`, GitHub Actions will publish the site at:
```
https://<your-github-username>.github.io/<your-repo-name>/
```
