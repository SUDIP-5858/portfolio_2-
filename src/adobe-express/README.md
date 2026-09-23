# Adobe Express UI Blocks & Design Components

Extracted from [adobe/express-website](https://github.com/adobe/express-website) for direct use in this portfolio.

## Structure

- **`blocks/`**: 84 production-ready UI blocks
- **`styles/`**: Adobe Express design tokens, buttons, typography, and layout styles (`styles.css`, `lazy-styles.css`)

---

## Key High-Impact Blocks for Cinematic Portfolio

### 1. `fullscreen-marquee` (`blocks/fullscreen-marquee/`)
* **Use case**: Showcasing brand logos, project reels, awards, or client logos in a continuous cinematic loop.
* **Files**: `fullscreen-marquee.css`, `fullscreen-marquee.js`
* **CSS include**: `@import "../adobe-express/blocks/fullscreen-marquee/fullscreen-marquee.css";`

### 2. `hero-3d` (`blocks/hero-3d/`)
* **Use case**: 3D scene background or canvas element with responsive fallback images, scroll indicator, and CTA buttons.
* **Files**: `hero-3d.css`, `hero-3d.js`

### 3. `cards` (`blocks/cards/`)
* **Use case**: Portfolio project showcases, case studies, feature teasers.
* **Files**: `cards.css`, `cards.js`
* **CSS include**: `@import "../adobe-express/blocks/cards/cards.css";`

### 4. `animation` (`blocks/animation/`)
* **Use case**: Autoplaying, looping, muted background video snippets with poster fallbacks.
* **Files**: `animation.css`, `animation.js`

### 5. `bubble-ui-button` & `floating-button` (`blocks/bubble-ui-button/`, `blocks/floating-button/`)
* **Use case**: Floating contact button, audio mute toggle, or quick actions fixed over the 3D canvas.

### 6. `modal` (`blocks/modal/`)
* **Use case**: Detail overlays when clicking a project card without leaving the 3D universe.

---

## How to Use in `index.html` or `projects.css`

### Option A: Using CSS in your existing stylesheets
Add to [`src/styles/projects.css`](file:///c:/Users/deysu/OneDrive/Desktop/cinematic-portofilo-main/src/styles/projects.css) or [`index.html`](file:///c:/Users/deysu/OneDrive/Desktop/cinematic-portofilo-main/index.html):
```html
<link rel="stylesheet" href="src/adobe-express/blocks/fullscreen-marquee/fullscreen-marquee.css">
<link rel="stylesheet" href="src/adobe-express/blocks/cards/cards.css">
```

### Option B: Using the Blocks in HTML
```html
<div class="cards fullwidth">
  <div>
    <div>
      <img src="public/project-thumb.jpg" alt="Project 1">
      <h3>Cinematic Universe</h3>
      <p>Interactive 3D WebGL experience built with Three.js</p>
      <a href="#demo" class="button accent">View Project</a>
    </div>
  </div>
</div>
```
