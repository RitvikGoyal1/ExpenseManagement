# Hosted legal pages

Static, self-contained HTML for `index.html`, `terms.html`, `privacy.html`, and `data-collection.html`. Apple (App Store Connect) and Google (Play Console) both require a **live, publicly-reachable URL** for your privacy policy at submission time — the in-app screens under `app/legal/` aren't enough on their own.

## Host via GitHub Pages (free, zero config)

1. Push this repo to GitHub (if not already).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder: **/docs** → Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/`. Use `.../privacy.html`, `.../terms.html`, `.../data-collection.html` in App Store Connect / Play Console.

## Alternative: Netlify / Vercel drop

Drag the `docs/` folder into Netlify Drop (https://app.netlify.com/drop) or `vercel deploy docs/` for an instant URL — no GitHub required.

## Keeping content in sync

The in-app source of truth is `constants/legalContent.ts`. These HTML files are hand-written to match — if you edit one, update the other.
