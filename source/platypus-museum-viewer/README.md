# Generalia Platypus museum scanner

Editable source of the single-theme museum scanner, saved October 21, 2026.

Live viewer: https://brianschu.github.io/generalia-platypus-anatomy/platypus-museum-viewer/

## Run or rebuild

Requires Node.js and pnpm. From this folder:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Build with `pnpm run build`. The complete `dist/` output can be served at a subpath; publish it to `platypus-museum-viewer/` in this repository.

## Files

- `main-gpu.js`: shared camera, living/skeleton registration, progressive WebGPU lighting, immediate raster preview during interaction, board fade, scanner mask, and anatomy interactions.
- `anatomy-surface-colors.js`: source identity and reviewed group checks, coloring, highlighting and picking.
- `bone-explorer.js`: group focus and exact camera/scanner return.
- `index.html`, `test.css`: one HUD theme, anatomical key and pose note.
- `public/`: required models, HDRI lighting, textures, fonts, denoising weights, Draco decoder and attribution.

## Current behavior and scope

Living, ivory skeleton and 11 reviewed anatomical surface groups; movable/dockable scanner; focus and Return; hidden HDRI that still lights the specimen. Fast preview stays visible while rotating and until fresh refined samples exist. The board fits the animal and clears when viewed underneath. Depth of field is disabled.

The hind legs have different poses between living and skeleton views. The visible pose note documents this. Registration remains provisional. Surface groups do not certify individual constituent bones or fine fused contacts. The living exterior is a real-time preview; progressive skeleton lighting approximates Cycles, and the original Cycles reference retains its original table/camera.

WebGPU support is required. An AI browser without WebGPU may not render the specimen, but can inspect this source and the packaged assets.

See `public/credits.html` and `public/THIRD-PARTY-NOTICES.txt` for third-party attribution and licenses. The native Blender original was not edited or included in this export.
