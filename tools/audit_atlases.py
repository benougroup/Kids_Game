"""
Lumenfall sprite-atlas auditor.
Reads every atlas JSON and writes a master CSV catalog.
"""
import json, csv
from pathlib import Path

ASSET_DIR = Path('/home/ubuntu/Kids_Game/kids_games/lumenfall/public/assets')
OUT_CSV   = Path('/home/ubuntu/Kids_Game/lumenfall_master_catalog.csv')

ATLAS_FILES = [
    'buildings_v002.json',
    'buildings_v003.json',
    'objects_props_v002.json',
    'objects_props_v003.json',
    'terrain_grassland.json',
    'terrain_walls_natural.json',
    'terrain_walls_manmade.json',
    'characters.json',
    'monsters.json',
]

rows = []
for jf in ATLAS_FILES:
    path = ASSET_DIR / jf
    if not path.exists():
        print(f"MISSING: {jf}")
        continue
    with open(path) as f:
        data = json.load(f)
    frames = data.get('frames', {})
    for name, info in frames.items():
        fr = info.get('frame', {})
        rows.append({
            'atlas': jf.replace('.json', ''),
            'name': name,
            'x': fr.get('x', 0),
            'y': fr.get('y', 0),
            'w': fr.get('w', 0),
            'h': fr.get('h', 0),
            'area_px': fr.get('w', 0) * fr.get('h', 0),
        })

with open(OUT_CSV, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['atlas','name','x','y','w','h','area_px'])
    writer.writeheader()
    writer.writerows(rows)

print(f"Wrote {len(rows)} frames to {OUT_CSV}")

# Summary by atlas
from collections import defaultdict
by_atlas = defaultdict(list)
for r in rows:
    by_atlas[r['atlas']].append(r)

print("\n--- Summary by atlas ---")
for atlas, items in sorted(by_atlas.items()):
    widths  = set(r['w'] for r in items)
    heights = set(r['h'] for r in items)
    print(f"  {atlas}: {len(items)} frames | widths={sorted(widths)} | heights={sorted(heights)}")

# Detect duplicate bounding boxes within same atlas
print("\n--- Duplicate bounding boxes ---")
for atlas, items in sorted(by_atlas.items()):
    seen = {}
    for r in items:
        key = (r['x'], r['y'], r['w'], r['h'])
        if key in seen:
            print(f"  DUPLICATE in {atlas}: '{seen[key]}' and '{r['name']}' share {key}")
        else:
            seen[key] = r['name']
