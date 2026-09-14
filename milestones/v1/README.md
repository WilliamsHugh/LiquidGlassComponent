# Aera — Find your quiet

A responsive, Apple-inspired liquid glass landing page, built with plain HTML, CSS, and JavaScript. A pearl-pink palette, translucent phone interface, floating frosted widgets, and softly lit glass shapes follow the visual direction of https://liquidglassdesign.com/. Includes three ambient sound modes, play/pause, previous/next, volume, and per-scene favorites for the current session.

## Run

Open `index.html` directly, or run `npm run dev` and visit http://localhost:5173. The development server requires Python 3. No npm dependencies are needed.

## Glass material

`liquid-glass.css` and `liquid-glass.js` provide a web approximation inspired by the clear/interactive material exposed in [Callstack Liquid Glass](https://github.com/callstack/liquid-glass). That library wraps Apple's native `UIGlassEffect` and cannot run in this plain HTML site. This implementation uses rounded-rectangle displacement maps on Chromium, subtle backdrop blur, directional rim highlights, and pointer lighting. Other browsers use a CSS fallback. It does not reproduce UIKit's automatic material merging or native rendering. Layout and colors remain separate in `styles.css`.

Additional research: [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass) for Compose material design, and [rukkiecodes/liquid-glass](https://github.com/rukkiecodes/liquid-glass) for rounded distance fields, convex surface normals, and Snell refraction. No native library is installed or bundled; the web material is implemented locally.

## Verify

Run `npm run check` to check JavaScript syntax.

The optional Google Font falls back to system fonts offline. Visuals and audio are generated locally. Audio starts only after pressing play. Reduced motion preferences and mobile layouts are supported. This is an independent design concept, not an Apple product.
