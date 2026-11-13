"""Export one HTML demo with bundled CSS, JavaScript, synthetic data, and fallback map.
The Google Maps integration still requires a user-supplied API key and internet access.
"""
from pathlib import Path
import base64
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'assets/styles.css').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="assets/styles.css">','<style>\n'+css+'\n</style>')
for name in ('config.js','data.js','app.js'):
    js=(ROOT/'assets'/name).read_text(encoding='utf-8')
    html=html.replace(f'<script src="assets/{name}"></script>', '<script>\n'+js+'\n</script>')
image=base64.b64encode((ROOT/'assets/us_map.png').read_bytes()).decode('ascii')
html=html.replace('src="assets/us_map.png"', f'src="data:image/png;base64,{image}"')
kml=base64.b64encode((ROOT/'data/market_atlas_google_earth.kml').read_bytes()).decode('ascii')
html=html.replace('href="data/market_atlas_google_earth.kml"',f'href="data:application/vnd.google-earth.kml+xml;base64,{kml}"')
(ROOT/'preview.html').write_text(html,encoding='utf-8')
print('Exported standalone preview.html (offline map works without a key).')
