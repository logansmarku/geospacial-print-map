"""Regenerate the PUBLIC-SAFE FICTIONAL catalog (never reads private Inciardi records).

Usage: python scripts/generate_sample_data.py
All IDs and assignments are reproducible. Editing the CSVs is recommended instead
of rerunning this script after manual edits.
"""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
R = random.Random(202711)
# city, state, latitude, longitude, weight; coordinates are approximate metro centers.
CITIES = [
('Portland','ME',43.66,-70.26,7),('Bangor','ME',44.80,-68.77,3),('Burlington','VT',44.48,-73.21,4),
('Manchester','NH',42.99,-71.46,4),('Concord','NH',43.21,-71.54,2),('Boston','MA',42.36,-71.06,13),
('Cambridge','MA',42.37,-71.11,5),('Worcester','MA',42.26,-71.80,4),('Providence','RI',41.82,-71.41,7),
('Hartford','CT',41.77,-72.68,5),('New Haven','CT',41.31,-72.92,5),('Stamford','CT',41.05,-73.54,3),
('New York','NY',40.72,-73.99,18),('Brooklyn','NY',40.68,-73.96,13),('Albany','NY',42.65,-73.76,5),
('Buffalo','NY',42.89,-78.88,4),('Rochester','NY',43.16,-77.61,3),('Syracuse','NY',43.05,-76.15,3),
('Philadelphia','PA',39.95,-75.16,10),('Pittsburgh','PA',40.44,-79.99,5),('Lancaster','PA',40.04,-76.31,3),
('Newark','NJ',40.74,-74.17,5),('Princeton','NJ',40.35,-74.66,3),('Jersey City','NJ',40.73,-74.06,5),
('Wilmington','DE',39.75,-75.55,3),('Baltimore','MD',39.29,-76.61,7),('Washington','DC',38.90,-77.04,9),
('Richmond','VA',37.54,-77.44,4),('Arlington','VA',38.88,-77.11,4),('Norfolk','VA',36.85,-76.29,3),
('Charlotte','NC',35.23,-80.84,5),('Raleigh','NC',35.78,-78.64,5),('Asheville','NC',35.59,-82.55,4),
('Charleston','SC',32.78,-79.94,3),('Atlanta','GA',33.75,-84.39,5),('Savannah','GA',32.08,-81.09,3),
('Nashville','TN',36.17,-86.78,4),('Louisville','KY',38.25,-85.76,3),('Birmingham','AL',33.52,-86.80,2),
('New Orleans','LA',29.95,-90.07,4),('Miami','FL',25.77,-80.19,4),('Orlando','FL',28.54,-81.38,3),
('Tampa','FL',27.95,-82.46,3),('Chicago','IL',41.88,-87.63,9),('Milwaukee','WI',43.04,-87.91,3),
('Madison','WI',43.08,-89.38,3),('Minneapolis','MN',44.98,-93.27,4),('Detroit','MI',42.33,-83.05,4),
('Cleveland','OH',41.50,-81.69,3),('Columbus','OH',39.96,-83.00,3),('Indianapolis','IN',39.77,-86.16,3),
('St. Louis','MO',38.63,-90.20,3),('Kansas City','MO',39.10,-94.58,3),('Dallas','TX',32.78,-96.80,4),
('Austin','TX',30.27,-97.74,5),('Houston','TX',29.76,-95.37,3),('Denver','CO',39.74,-104.99,4),
('Boulder','CO',40.02,-105.27,3),('Salt Lake City','UT',40.76,-111.89,3),('Phoenix','AZ',33.45,-112.07,3),
('Albuquerque','NM',35.08,-106.65,2),('Portland','OR',45.52,-122.68,5),('Seattle','WA',47.61,-122.33,6),
('Tacoma','WA',47.25,-122.44,3),('San Francisco','CA',37.77,-122.42,7),('Oakland','CA',37.80,-122.27,4),
('Los Angeles','CA',34.05,-118.24,7),('San Diego','CA',32.72,-117.16,3),('Sacramento','CA',38.58,-121.49,3),
('Las Vegas','NV',36.17,-115.14,2),('Boise','ID',43.62,-116.20,2)
]
REGION = {
 'ME':'Northeast','VT':'Northeast','NH':'Northeast','MA':'Northeast','RI':'Northeast','CT':'Northeast','NY':'Northeast',
 'PA':'Mid-Atlantic','NJ':'Mid-Atlantic','DE':'Mid-Atlantic','MD':'Mid-Atlantic','DC':'Mid-Atlantic','VA':'Mid-Atlantic',
 'NC':'South','SC':'South','GA':'South','TN':'South','KY':'South','AL':'South','LA':'South','FL':'South',
 'IL':'Midwest','WI':'Midwest','MN':'Midwest','MI':'Midwest','OH':'Midwest','IN':'Midwest','MO':'Midwest',
 'TX':'South','CO':'Mountain','UT':'Mountain','AZ':'Mountain','NM':'Mountain','NV':'West','ID':'Mountain',
 'OR':'West','WA':'West','CA':'West'
}
ROOTS = ['Ash & Arrow','Blue Hour','Juniper','Northline','Common Ground','Field Notes','Morrow','Kindred','The Paper Room','Orchard','Coastal','Stillwater','Small Hours','Beacon','Daybreak','Elm & Ink','Larkspur','Drift','Lumen','The Narrow Lane','Grove','Hearthside','Wildflower','Southbank','Aperture','Quarry','Good Company','Moss','Lightwell','Harborline','Mariner','Linden','Side Street','Kestrel','Pine & Press','Willow','Golden Hour','Little Acre','Clover','Mosaic','Pollen','Mapleline','Tandem','Cinder','Margot','August','Palisade','Wren','Slow Sunday','Borough','Slate','Riverton','Heirloom','Cypress','Wildwood','Fern','Ridgeway','Sable','Everspring','Parkside']
SUFFIXES = ['Books','Market','Supply','Gallery','Goods','Studio','Collective','Paper Co.','General Store','Museum Shop']
TYPES = ['Bookstore','Gift Shop','Museum Shop','Independent Retail','Gallery','Lifestyle Shop']
ADJECTIVES = ['Amber','Cobalt','Quiet','Golden','Winding','Soft','Morning','Wild','Open','Glass','New','Distant','Blue','Salt','Velvet','Warmed','Paper','Fresh']
NOUNS = ['Window','Boulevard','Garden','Tide','Cloud','Lantern','Shore','Studio','Horizon','Transit','Petal','Passage','Sunroom','Corner','Canopy','Lighthouse','River','Atlas','Postcard','Market']
CATEGORIES = ['Cityscape','Nature','Abstract','Travel','Botanical','Architecture']


def write(name, fieldnames, records):
    with (ROOT / 'data' / name).open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main():
    # Weighted selection favors urban clusters in northeast while preserving national coverage.
    weights = [item[4] for item in CITIES]
    chosen = [CITIES[i] for i in R.choices(range(len(CITIES)), weights, k=167)]
    # 36 recurring designs, mapped to multiple stores, plus 225 exclusive designs.
    prints = []
    for i in range(36):
        title = f'{ADJECTIVES[i % len(ADJECTIVES)]} {NOUNS[(i * 7 + 4) % len(NOUNS)]}'
        prints.append(dict(product_id=f'R{i+1:03}',print_name=title,category=CATEGORIES[i%len(CATEGORIES)],edition='Regular'))
    stores = []
    assignments = []
    used_names = set()
    # Exactly 66 locations receive a third regular assignment: 334 + 66 = 400.
    three_regular = set(R.sample(range(167), 66))
    # Exactly 58 locations receive two custom prints: 167 + 58 = 225.
    two_custom = set(R.sample(range(167), 58))
    for i, (city, state, lat, lon, _) in enumerate(chosen):
        store_id = f'S{i+1:03}'
        # Names and coordinates are fully synthetic; map to neighborhoods near real metro centers.
        # Natural-looking fictional names, unique across the synthetic network.
        while True:
            root, suffix = R.choice(ROOTS), R.choice(SUFFIXES)
            name = f'{root} {suffix}'
            if name not in used_names:
                used_names.add(name)
                break
        store = dict(store_id=store_id,partner_name=name,city=city,state=state,region=REGION[state],lat=round(lat+R.uniform(-0.065,0.065),5),lon=round(lon+R.uniform(-0.08,0.08),5),store_type=TYPES[(i*3 + i//8) % len(TYPES)])
        stores.append(store)
        regular = R.sample([f'R{n:03}' for n in range(1,37)], 3 if i in three_regular else 2)
        for pid in regular:
            assignments.append(dict(store_id=store_id,product_id=pid))
        for k in range(2 if i in two_custom else 1):
            pid=f'C{len(prints)-35:03}'
            label = f'{city} / {NOUNS[(i*3+k*11)%len(NOUNS)]} — {name}'
            prints.append(dict(product_id=pid,print_name=label,category='Custom',edition='Custom'))
            assignments.append(dict(store_id=store_id,product_id=pid))
    assert len(stores)==167 and len(assignments)==625
    assert sum(p['edition']=='Regular' for p in prints)==36
    assert sum(p['edition']=='Custom' for p in prints)==225
    write('stores.csv', ['store_id','partner_name','city','state','region','lat','lon','store_type'], stores)
    write('prints.csv', ['product_id','print_name','category','edition'], prints)
    write('store_inventory.csv', ['store_id','product_id'], assignments)
    print(f'Generated {len(stores)} fictional partners, {len(prints)} print designs, {len(assignments)} placements')

if __name__ == '__main__': main()
