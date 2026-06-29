"""
Lumenfall Sprite Re-cutter
Reads each atlas JSON, crops each frame from the source PNG,
and saves it as an individual file in the correct category directory.
Also resizes the crop to the canonical size defined in this spec.
"""
from pathlib import Path
from PIL import Image
import json

ASSET_DIR  = Path('/home/ubuntu/Kids_Game/kids_games/lumenfall/public/assets')
OUTPUT_DIR = Path('/home/ubuntu/Kids_Game/kids_games/lumenfall/public/assets/sprites')

# ─── Category routing ────────────────────────────────────────────────────────
# Maps frame name prefixes/keywords to (category_dir, canonical_w, canonical_h)
# Order matters: first match wins.
CATEGORY_RULES = [
    # Buildings
    (['tavern', 'house_', 'cottage', 'inn_', 'market_food', 'chapel', 'church',
      'blacksmith', 'alchemy', 'magic_shop', 'watchtower', 'windmill',
      'castle_fortress', 'castle_gate', 'ruin_castle', 'dockside_building',
      'house_blue', 'house_stone', 'house_thatch', 'house_snow',
      'fortress_small', 'castle_entrance', 'market_square', 'dockside_large',
      'windmill_small', 'inn_large'],
     'buildings', 256, 256),

    # Large props: trees, statues, ruins, tents
    (['tree_oak', 'tree_pine', 'tree_dead', 'tree_ruins',
      'statue_', 'ruin_arch', 'tower_ruins', 'bridge_stone',
      'tent_circus', 'tent_plain', 'fountain_round',
      'sarcophagus', 'column_ruins'],
     'props_large', 128, 192),

    # Medium props: tables, market stalls, well, lamp, fence, pillory, chest
    (['table_', 'market_stall', 'well_large', 'lamp_post', 'fence_long',
      'pillory', 'chest_', 'cooking_pot', 'cauldron_', 'campfire',
      'bucket_pair', 'barrel_pair', 'barrel_triple', 'log_pile',
      'hay_bale', 'rock_large', 'bush_small', 'skull_pile',
      'crate_pile', 'chest_medium', 'chest_treasure', 'campfire_large',
      'cauldron_magic', 'bucket_magic', 'table_market'],
     'props_medium', 64, 64),

    # Small props: single items
    (['barrel_single', 'crate_small', 'sack_', 'sign_', 'fence_short',
      'gravestone_', 'lamp_post_2', 'well_small', 'cart_empty',
      'mushroom_pile', 'skull_', 'sack_pile'],
     'props_small', 32, 48),
]

def classify_frame(name: str):
    """Return (category, target_w, target_h) for a frame name."""
    name_lower = name.lower()
    for keywords, category, w, h in CATEGORY_RULES:
        for kw in keywords:
            if name_lower.startswith(kw.lower()) or kw.lower() in name_lower:
                return category, w, h
    # Default fallback
    return 'misc', 64, 64


def recut_atlas(atlas_name: str, png_path: Path, json_path: Path):
    if not png_path.exists() or not json_path.exists():
        print(f"  SKIP (missing files): {atlas_name}")
        return

    with open(json_path) as f:
        data = json.load(f)
    frames = data.get('frames', {})

    sheet = Image.open(png_path).convert('RGBA')
    results = []

    for frame_name, info in frames.items():
        fr = info.get('frame', {})
        x, y, w, h = fr.get('x', 0), fr.get('y', 0), fr.get('w', 0), fr.get('h', 0)
        if w == 0 or h == 0:
            continue

        # Crop the frame from the sheet
        raw_crop = sheet.crop((x, y, x + w, y + h))
        # Tighten to actual alpha content boundary to avoid bleeding from
        # adjacent sprites that were packed tightly in the original sheet.
        bbox = raw_crop.getbbox()  # (left, upper, right, lower) of non-zero alpha
        if bbox:
            # Add a small padding (2px) around the content
            pad = 2
            bx, by, bx2, by2 = bbox
            bx  = max(0, bx  - pad)
            by  = max(0, by  - pad)
            bx2 = min(raw_crop.width,  bx2 + pad)
            by2 = min(raw_crop.height, by2 + pad)
            crop = raw_crop.crop((bx, by, bx2, by2))
        else:
            crop = raw_crop

        # Classify
        category, target_w, target_h = classify_frame(frame_name)

        # Output path
        out_dir = OUTPUT_DIR / category
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{frame_name}.png"

        # Resize to canonical size using high-quality Lanczos resampling,
        # preserving aspect ratio by fitting within the target canvas.
        ratio = min(target_w / w, target_h / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        resized = crop.resize((new_w, new_h), Image.LANCZOS)

        # Paste onto a transparent canvas of the exact target size
        canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        # Center horizontally, align to bottom (for depth sorting accuracy)
        paste_x = (target_w - new_w) // 2
        paste_y = target_h - new_h
        canvas.paste(resized, (paste_x, paste_y), resized)
        canvas.save(out_path, 'PNG')

        results.append({
            'atlas': atlas_name,
            'name': frame_name,
            'category': category,
            'original_size': f"{w}x{h}",
            'canonical_size': f"{target_w}x{target_h}",
            'output': str(out_path.relative_to(OUTPUT_DIR.parent.parent.parent)),
        })
        print(f"  [{category}] {frame_name}: {w}x{h} -> {target_w}x{target_h}")

    return results


# ─── Main ────────────────────────────────────────────────────────────────────
ATLASES_TO_RECUT = [
    ('buildings_v002', ASSET_DIR / 'buildings_v002.png', ASSET_DIR / 'buildings_v002.json'),
    ('buildings_v003', ASSET_DIR / 'buildings_v003.png', ASSET_DIR / 'buildings_v003.json'),
    ('objects_props_v002', ASSET_DIR / 'objects_props_v002.png', ASSET_DIR / 'objects_props_v002.json'),
    ('objects_props_v003', ASSET_DIR / 'objects_props_v003.png', ASSET_DIR / 'objects_props_v003.json'),
]

all_results = []
for atlas_name, png_path, json_path in ATLASES_TO_RECUT:
    print(f"\n=== {atlas_name} ===")
    res = recut_atlas(atlas_name, png_path, json_path)
    if res:
        all_results.extend(res)

# Write manifest CSV
import csv
manifest_path = Path('/home/ubuntu/Kids_Game/lumenfall_sprite_manifest.csv')
with open(manifest_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['atlas','name','category','original_size','canonical_size','output'])
    writer.writeheader()
    writer.writerows(all_results)

print(f"\nDone. {len(all_results)} sprites cut. Manifest: {manifest_path}")
