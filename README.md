# NicoJrey Racing

A self-contained, polished browser racing game for embedding on a website or playing locally.

## Fastest way to play

You do **not** need a paid server, a build system, or external game assets.

1. Download this project folder or clone the repository.
2. Open `index.html` in a modern browser such as Chrome, Edge, Firefox, or Safari.
3. Click **Quick Race** or press **Enter**.

If your browser blocks local audio or module loading from a double-clicked file, use the local server option below.

## Run locally with a tiny server

From the project folder:

```bash
npm run start
```

Then open:

```text
http://localhost:5173
```

You can also use Python directly if you do not want npm:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Create downloadable website files

To create a clean upload/download folder:

```bash
npm run build
```

This creates `dist/` with:

```text
dist/index.html
dist/src/main.js
dist/src/styles.css
```

Upload the whole `dist/` folder to your web host, or zip it and share it.

## Create a ZIP you can download/share

```bash
npm run package
```

This creates:

```text
nicojrey-racing.zip
```

Unzip it anywhere, then open `index.html` or upload the unzipped files to your website.

## Website embedding

After uploading the built files to your host, you can link to the game directly or embed it in an iframe:

```html
<iframe
  src="/nicojrey-racing/index.html"
  title="NicoJrey Racing"
  style="width:100%;height:720px;border:0;border-radius:20px;overflow:hidden"
  allow="gamepad; autoplay"
></iframe>
```

## Controls

- **Keyboard:** WASD or arrow keys to steer/accelerate/brake, Space or Shift for nitro.
- **Mobile/tablet:** Touch buttons appear automatically during a race.
- **Controller:** Browser Gamepad API support is included; use left stick, triggers, and the main face button.

## Features

- 3D-ish pseudo-perspective racing rendered on Canvas
- Multiple circuits with different weather, grip, lap counts, and day/night moods
- Multiple NicoJrey-branded cars with colour/livery customisation
- NJC currency, upgrade purchases, race rewards, championships, and saved progress
- AI opponents, DRS/nitro boost, crash sparks/screenshake, engine SFX, and music
- Keyboard, touch/mobile controls, and browser Gamepad API support
- LocalStorage save system plus leaderboard/high-score table
- Intro/menu, garage, circuit selection, and settings

## Save data

Progress is saved in your browser using `localStorage`. If you clear browser site data, NJC, upgrades, selected livery, championship progress, and high scores reset.
