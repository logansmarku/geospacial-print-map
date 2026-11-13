# Print Map

An interactive location-to-print catalog with a 3D Google Maps view, individual print listings, location search, and basic geographic analysis.

## Project context and data disclosure

This **public-facing application is a separate portfolio redesign**, based on an earlier internal workflow created at Inciardi Prints. In the original work, I used Python and AI-assisted research to compile product and partner information into a Google Earth overlay. That original internal source data, artwork, and Google Earth file are **not published** here.

All **167 locations, 400 regular-print assignments, and 225 custom-print assignments in this repository are fictional**. They are included to demonstrate the application's structure and behavior. Real outcomes should be described separately and only when verified and authorized. The original internal project was **not** a JavaScript/Google 3D app.

## Publish to GitHub Pages (direct-to-3D link)

1. Create a **new GitHub repository** (for example `print-map`). Upload **the contents of this folder**, keeping `index.html`, `assets/`, `data/`, `scripts/` and `.github/` at the root. You can use GitHub **Add file → Upload files**, or Git locally.
2. In Google Cloud, enable **Maps JavaScript API** and billing. Create a **browser API key** restricted to this API and **Websites (HTTP referrers)**.
3. Once your GitHub username and repo name are known, add your site origin as an allowed referrer. For a repo named `print-map`, use `https://YOUR_USERNAME.github.io/*` (Google may send only the origin in its Referer header). For local testing, add `http://localhost:8000/*` to a separate test key if desired. Avoid unrestricted keys; do not grant access to unrelated APIs. Set API quotas and billing alerts.
4. In GitHub open your repo → **Settings → Secrets and variables → Actions → New repository secret**. Name it exactly `GOOGLE_MAPS_BROWSER_KEY` and paste your restricted **browser** key. Do not paste a server-side secret or an unrestricted key.
5. In **Settings → Pages → Build and deployment**, select **GitHub Actions**. Commit/push to `main` (or click **Actions → Deploy Print Map to GitHub Pages → Run workflow**). The workflow validates your CSVs, builds the static website, and publishes it.
6. Open the URL shown under **Settings → Pages**, commonly `https://YOUR_USERNAME.github.io/print-map/`. The app loads Google imagery automatically and **opens in 3D mode**. No reviewer login, key entry, or manual selection is needed.

**Note on key privacy:** The key is stored as a GitHub Actions secret so it won't appear in the repository source. However, it **must be delivered to the browser** for Google Maps JavaScript API to work and can be inspected by website visitors. Site/referrer and API restrictions protect usage; the key is not truly private. A static GitHub Pages deployment cannot conceal a browser Maps key. Do not publish unrestricted credentials. Billing or usage limits may apply.

**If Google 3D imagery is unavailable**, the app retains a satellite view when Maps loads, or the offline US-map fallback if no valid Google connection exists. 3D buildings are available only in supported areas; outside them Google may show terrain/satellite imagery instead.

## Local preview

```bash
python -m http.server 8000
```

Visit `http://localhost:8000`. Without a Google Maps key, the offline map is usable. To test Google locally without publishing a key, use the settings (gear) button to enter a key for that browser session; authorize `http://localhost:8000/*` in its referrer restrictions.

To preview the **same automatic 3D initialization** used on GitHub Pages:

```bash
# PowerShell: $env:GOOGLE_MAPS_BROWSER_KEY = 'YOUR_RESTRICTED_BROWSER_KEY'
# macOS/Linux: export GOOGLE_MAPS_BROWSER_KEY='YOUR_RESTRICTED_BROWSER_KEY'
python scripts/build_data.py
python scripts/build_site.py --require-key
cd _site
python -m http.server 8000
```

## Edit print data

| File | Description |
|---|---|
| `data/stores.csv` | `store_id`, partner name, city, state, coordinates and type |
| `data/prints.csv` | print catalog (`product_id`, name, type) |
| `data/store_inventory.csv` | store-to-print relationships |

Regular prints can recur across stores. Each custom print must have a unique title and be assigned to one location only. After editing, run `python scripts/build_data.py` to validate the relationships and regenerate `assets/data.js` and `data/market_atlas_google_earth.kml`.

## Source files

- `index.html` — application layout and minimal labels
- `assets/styles.css` — styling and responsive layout
- `assets/app.js` — navigation, filtering, map camera, and location-print details
- `assets/config.js` — empty development config; **never add an unrestricted key**
- `scripts/build_data.py` — dataset validation and generated JS/KML
- `scripts/build_site.py` — create deployable site; inject restricted browser key at build time
- `.github/workflows/pages.yml` — automated GitHub Pages deployment

### URLs

The primary site URL opens the nationwide 3D view. To link directly to one location, append `?location=STORE_ID`, using an identifier from `data/stores.csv`.

For Google Maps Platform documentation, see https://developers.google.com/maps/documentation/javascript/3d/overview and https://developers.google.com/maps/api-security-best-practices .
