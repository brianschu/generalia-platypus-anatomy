# Platypus anatomy viewer

This folder is the GitHub Pages deployment root for the Generalia platypus viewer. Publish the full `platypus-anatomy` folder without changing its internal paths. The HTML is copied byte for byte from `index-v5.html` after confirming the SHA-256 hashes match.

## GitHub Pages

1. Upload this directory at `platypus-anatomy/` in the repository's default branch.
2. In repository Settings → Pages, publish from the default branch and `/ (root)`.
3. Wait for the Pages deployment to finish. The viewer URL will be `https://OWNER.github.io/REPOSITORY/platypus-anatomy/?embed=1`.
4. Open the URL and confirm the living, ivory, and anatomy color states load before adding the Ghost card.

The page includes all required scripts, models, anatomy assignments and review record, Three.js modules, and licenses. Do not remove `assets/` or `vendor/`.

## Ghost

Use `ghost-html-card.html` as the template for a Ghost HTML card. Replace the example Pages URL with the verified live URL. The viewer can be shown as a regular page by omitting `?embed=1`.

Credits and the model license are linked from `credits.html`.
