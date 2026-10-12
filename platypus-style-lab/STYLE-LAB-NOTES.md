# Platypus style lab

Open `index-style-lab.html` from the existing local viewer server to compare ten selectable interface treatments. The `style` query parameter preserves the current choice, for example `?style=9` opens the holographic direction.

1. Cyberpunk HUD — black instrument panel, cyan and red accents, scan grid.
2. Retro media player — compact gray controls and blue selection bars.
3. Millennium desktop — sky-and-meadow backdrop with glossy desktop windows.
4. Vaporwave — violet field, cyan and magenta borders, perspective grid.
5. Memphis — saturated geometric color blocks and playful offset framing.
6. Early console — deep purple launch-screen palette and glossy hardware framing.
7. 16-bit arcade — pixel-era navy interface with bright teal and coral accents.
8. Encarta — warm reference-library palette, serif text, classic blue window bars.
9. Holographic scan — dark technical grid with cyan and orange readouts.
10. Expressive editorial — cream canvas, oversized primary-color shapes, bold collage framing.

The second style-lab pass adds themed typography, scanner proportions and chrome, anatomy-key composition, lighting presets, display-surface treatments and entrance animation. Each theme has a different scanner arrival and key reveal. Anatomy colors resolve from ivory to the reviewed palette using theme-dependent timing; bone groups and final palette memberships remain the same. Group hover and pin highlighting still work.

Exploration update: the key now shows eleven named skeletal groups. The unresolved-surfaces button was removed while the original uncertain surface geometry remains visible. Clicking a named key entry or a colored group on the model highlights it, docks the scanner, gently frames that group's reviewed geometry, and opens a short explanation. Return to view (or Escape) restores the captured camera and scanner layout. Dock scanner opens a full-stage anatomy window; Undock scanner or dragging its handle picks it up again. Docking, pickup by drag, selection, and exact floating-box restoration were checked in the live browser.

Desktop anatomy mode pairs the scene with a visible key rail or tile menu; compact screens use a two-row horizontal drawer above the scene. The scanner's reveal rectangle follows its moving frame throughout animation. Reduced-motion preferences bypass the animation.

The font files are self-hosted in assets/fonts, with their open font licenses bundled. The original museum viewer is separate. The first style-lab version is backed up in outputs/review/style-lab-v1 for restoration. No source GLB or Blender files were edited for this pass.

New lab runtime files: viewer-style-lab.js, three-state-style-lab.js, scanner-style-lab.js, anatomy-surface-colors-lab.js and lab-scene-styles.js. Main presentation files: style-lab.js and style-lab-advanced.css. The old stylesheet supplies initial theme variables; the advanced stylesheet applies full themed composition.
