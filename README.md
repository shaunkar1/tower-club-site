# Princeton Tower Club website

Multi-page static site for Princeton Tower Club (13 Prospect Avenue, est. 1902), including the 125th anniversary.

## Editing

Page content lives in `src/pages/`. The shared header, footer and page shell live in `src/partials/`.
After editing, rebuild the top-level `.html` files:

```bash
python3 build.py
```

Preview locally:

```bash
python3 -m http.server 4173
```

- Styles: `css/style.css`
- Animations and interactions (GSAP + ScrollTrigger + Lenis from CDN): `js/main.js`

## Placeholder content to replace before launch

- Members page: the menu, events and notices are sample content. The "Sign in with NetID" button and most quick links are not wired up yet.
- 125 Years page: event dates are TBA.
- Forms (recruitment, alumni list, 125 stories) only show a success state. They still need to be connected to a backend.
- Photos: see `images/CREDITS.md`. Several images need permission or credit before public launch.
