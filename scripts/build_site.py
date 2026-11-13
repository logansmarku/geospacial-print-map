#!/usr/bin/env python3
"""Prepare a static GitHub Pages site and inject the public browser Maps key.

Browser Google Maps keys are visible to users of the published site. HTTP referrer
restrictions and Maps JavaScript API restrictions are mandatory safeguards.
"""
from __future__ import annotations
import os
import shutil
from pathlib import Path
import json
import argparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'

def build(require_key=False):
    key = os.environ.get('GOOGLE_MAPS_BROWSER_KEY', '').strip()
    if require_key and not key:
        raise SystemExit('Missing GOOGLE_MAPS_BROWSER_KEY. Add it as a GitHub Actions repository secret.')
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'assets').mkdir(parents=True)
    (OUT / 'data').mkdir()
    shutil.copy2(ROOT / 'index.html', OUT / 'index.html')
    for file in ['app.js', 'styles.css', 'data.js', 'us_map.png']:
        shutil.copy2(ROOT / 'assets' / file, OUT / 'assets' / file)
    (OUT / 'assets' / 'config.js').write_text(
        'window.MARKET_ATLAS_CONFIG = { googleMapsApiKey: ' + json.dumps(key) + ' };\n', encoding='utf-8'
    )
    (OUT / '.nojekyll').write_text('', encoding='utf-8')
    print('Built:', OUT)
    print('Google Maps configured:', bool(key))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--require-key', action='store_true')
    args = parser.parse_args()
    build(require_key=args.require_key)
