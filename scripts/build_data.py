"""Validate the three CSV tables and build browser data and Google Earth KML.
No third-party packages required. Run: python scripts/build_data.py
"""
from __future__ import annotations
import csv, json, html, xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from math import cos, log, pi, radians, sin, tan
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NS = 'http://www.opengis.net/kml/2.2'
ET.register_namespace('', NS)


def read_csv(filename):
    with (ROOT / 'data' / filename).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

PHI1, PHI2 = radians(30), radians(45)
LAMBDA0 = radians(-96)
N = log(cos(PHI1)/cos(PHI2))/log(tan(pi/4+PHI2/2)/tan(pi/4+PHI1/2))
F = cos(PHI1)*tan(pi/4+PHI1/2)**N/N

def project(latitude, longitude):
    lat,lon=radians(latitude),radians(longitude)
    rho=F/tan(pi/4+lat/2)**N
    return rho*sin(N*(lon-LAMBDA0)), -rho*cos(N*(lon-LAMBDA0))

LOWER_LEFT=project(23,-126)
UPPER_RIGHT=project(50,-65)

def write_kml(stores, grouped, prints_by_id):
    kml=ET.Element(f'{{{NS}}}kml')
    document=ET.SubElement(kml,f'{{{NS}}}Document')
    ET.SubElement(document,f'{{{NS}}}name').text='Market Atlas · Fictional Network'
    ET.SubElement(document,f'{{{NS}}}description').text='Synthetic sample partner and print records; not actual company data.'
    style=ET.SubElement(document,f'{{{NS}}}Style',id='storePin')
    icon_style=ET.SubElement(style,f'{{{NS}}}IconStyle')
    ET.SubElement(icon_style,f'{{{NS}}}color').text='ff77994c'
    ET.SubElement(icon_style,f'{{{NS}}}scale').text='0.7'
    icon=ET.SubElement(icon_style,f'{{{NS}}}Icon')
    ET.SubElement(icon,f'{{{NS}}}href').text='https://maps.google.com/mapfiles/kml/shapes/shopping.png'
    for store in stores:
        point=ET.SubElement(document,f'{{{NS}}}Placemark')
        ET.SubElement(point,f'{{{NS}}}name').text=store['partner_name']
        ET.SubElement(point,f'{{{NS}}}styleUrl').text='#storePin'
        products=[prints_by_id[x['product_id']] for x in grouped[store['store_id']]]
        regular=[p for p in products if p['edition']=='Regular']
        custom=[p for p in products if p['edition']=='Custom']
        rows=['<div style="font-family:Arial,sans-serif;font-size:13px;min-width:240px">',
              f'<h3 style="margin:0 0 4px">{html.escape(store["partner_name"])}</h3>',
              f'<p style="color:#666;margin:0 0 12px">{html.escape(store["city"])}, {html.escape(store["state"])}</p>',
              '<p><b>Regular prints</b></p><ul>']
        rows += [f'<li>◻ {html.escape(p["print_name"])}</li>' for p in regular]
        rows += ['</ul><p><b>Custom editions</b></p><ul>']
        rows += [f'<li>◻ {html.escape(p["print_name"])}</li>' for p in custom]
        rows += ['</ul><small>Artwork thumbnails omitted in public demonstration.</small></div>']
        ET.SubElement(point,f'{{{NS}}}description').text=''.join(rows)
        loc=ET.SubElement(point,f'{{{NS}}}Point')
        ET.SubElement(loc,f'{{{NS}}}coordinates').text=f'{store["lon"]},{store["lat"]},0'
    path=ROOT/'data'/'market_atlas_google_earth.kml'
    ET.ElementTree(kml).write(path, encoding='utf-8',xml_declaration=True)
    return path

def main():
    stores=read_csv('stores.csv')
    prints=read_csv('prints.csv')
    assignments=read_csv('store_inventory.csv')
    store_ids=[s['store_id'] for s in stores]
    print_ids=[p['product_id'] for p in prints]
    if len(set(store_ids))!=len(store_ids) or len(set(print_ids))!=len(print_ids):
        raise ValueError('Duplicate store_id or product_id')
    store_set=set(store_ids); print_set=set(print_ids)
    if any(a['store_id'] not in store_set or a['product_id'] not in print_set for a in assignments):
        raise ValueError('An assignment refers to an unknown store or print')
    if len({(a['store_id'],a['product_id']) for a in assignments})!=len(assignments):
        raise ValueError('Duplicate (store_id, product_id) assignment')
    prints_by_id={p['product_id']:p for p in prints}
    custom_counts=Counter(a['product_id'] for a in assignments if prints_by_id[a['product_id']]['edition']=='Custom')
    if any(v!=1 for v in custom_counts.values()):
        raise ValueError('A custom edition is assigned to more than one location')
    custom_designs = [p for p in prints if p['edition']=='Custom']
    if len(custom_counts) != len(custom_designs):
        raise ValueError('Every custom edition must have exactly one location assignment')
    if len({p['print_name'] for p in custom_designs}) != len(custom_designs):
        raise ValueError('Custom edition names must be unique')
    grouped=defaultdict(list)
    for item in assignments: grouped[item['store_id']].append(item)
    for store in stores:
        store['lat'],store['lon']=float(store['lat']),float(store['lon'])
        if not -125 < store['lon'] < -65 or not 24 < store['lat'] < 50:
            raise ValueError('Location outside supported map extent: '+store['store_id'])
        x,y=project(store['lat'],store['lon'])
        store['x']=round((x-LOWER_LEFT[0])/(UPPER_RIGHT[0]-LOWER_LEFT[0]),7)
        store['y']=round(1-(y-LOWER_LEFT[1])/(UPPER_RIGHT[1]-LOWER_LEFT[1]),7)
    inventory=[dict(store_id=a['store_id'],product_id=a['product_id'],print_name=prints_by_id[a['product_id']]['print_name'],category=prints_by_id[a['product_id']]['category'],custom='Yes' if prints_by_id[a['product_id']]['edition']=='Custom' else 'No') for a in assignments]
    data={'stores':stores,'prints':prints,'inventory':inventory}
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    (ROOT/'assets'/'data.js').write_text('/* Generated from three editable CSV files. */\nwindow.ATLAS_DATA = '+encoded+';\n',encoding='utf-8')
    path=write_kml(stores,grouped,prints_by_id)
    r=sum(p['custom']=='No' for p in inventory)
    c=sum(p['custom']=='Yes' for p in inventory)
    print(f'Validated {len(stores)} stores, {len(prints)} designs, {r} regular + {c} custom assignments; exported {path.name}')

if __name__=='__main__':main()
