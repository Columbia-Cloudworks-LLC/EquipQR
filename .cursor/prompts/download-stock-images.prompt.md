
# Prompt for agent: seed equipment stock images

**Task:** Review EquipQR seed equipment data, find suitable stock photos for each record, download them, and save them in the repo with the correct naming so they can be used as display images for seed data.

**Context:**
- EquipQR is a multi-tenant fleet/equipment management app. Seed data lives in `supabase/seeds/07_equipment.sql`.
- The `equipment` table has an `image_url` column (TEXT). The UI shows this as the equipment’s display image; if null, it shows a placeholder icon.
- We want **one image per seed equipment record**, stored in the repo and later uploaded to Supabase Storage by a separate script. This task is **only** to create the image files.

**What to do:**

1. **Review seed data**  
   Open `supabase/seeds/07_equipment.sql` and extract every equipment row. Each row has:
   - `id` (UUID), e.g. `aa0e8400-e29b-41d4-a716-446655440000`
   - `name` (e.g. "CAT 320 Excavator", "Bobcat S650 Skid Steer")
   - `manufacturer` and `model` (for picking the right type of image)

2. **Create the image directory**  
   Create:
   - `supabase/seed-images/equipment/`  
   (Do not add this path to `.gitignore`; these files will be committed.)

3. **Find and download one stock image per equipment record**  
   - Use free, commercially usable sources (e.g. Unsplash, Pexels, Pixabay, Wikimedia Commons). Prefer images that clearly show the type of equipment (excavator, dozer, forklift, generator, compressor, welder, mower, chainsaw, scissor lift, boom lift, pallet jack, light tower, tractor, utility vehicle, concrete saw, skid steer).
   - Match the **equipment type** (and ideally manufacturer/model) rather than the exact name. For duplicates like "CAT 320 Excavator" and "CAT 320 Excavator #2", you may use the same or a similar image.
   - Download the image and save it under `supabase/seed-images/equipment/` with this exact naming:
     - Filename: `{equipment-uuid}.jpg`  
     Example: `aa0e8400-e29b-41d4-a716-446655440000.jpg` for the CAT 320 Excavator.
   - Use the **full UUID** from the seed file (e.g. `aa0e8400-e29b-41d4-a716-446655440000`), not a short suffix.

4. **Format and size**  
   - Save as **JPEG** (`.jpg`).
   - Resize or choose images so the longer side is roughly **800–1200 px** and file size is under ~200 KB per image if possible, to keep the repo small while still looking good in the app.

5. **Do not change code or SQL**  
   - Do **not** modify `07_equipment.sql` or any other code.
   - Only add the directory `supabase/seed-images/equipment/` and the image files `{uuid}.jpg`.

6. **Optional: manifest**  
   - Optionally add a small `supabase/seed-images/equipment/README.md` (or a CSV/JSON) that lists each `{uuid}.jpg` and the corresponding equipment name from the seed (e.g. for auditing or future scripting).

**Equipment list (id → name) from seed — use these UUIDs for filenames:**

| Filename (UUID).jpg | Equipment name |
|---------------------|----------------|
| aa0e8400-e29b-41d4-a716-446655440000.jpg | CAT 320 Excavator |
| aa0e8400-e29b-41d4-a716-446655440001.jpg | John Deere 850L Dozer |
| aa0e8400-e29b-41d4-a716-446655440002.jpg | Portable Generator |
| aa0e8400-e29b-41d4-a716-446655440003.jpg | Portable Light Tower |
| aa0e8400-e29b-41d4-a716-446655440010.jpg | Bobcat S650 Skid Steer |
| aa0e8400-e29b-41d4-a716-446655440011.jpg | JLG 450AJ Boom Lift |
| aa0e8400-e29b-41d4-a716-446655440012.jpg | Genie GS-2669 Scissor Lift |
| aa0e8400-e29b-41d4-a716-446655440020.jpg | John Deere Z930M Mower |
| aa0e8400-e29b-41d4-a716-446655440021.jpg | Stihl MS 500i Chainsaw |
| aa0e8400-e29b-41d4-a716-446655440022.jpg | Kubota B2650 Tractor |
| aa0e8400-e29b-41d4-a716-446655440030.jpg | Toyota 8FGU25 Forklift |
| aa0e8400-e29b-41d4-a716-446655440031.jpg | Crown WP 3000 Pallet Jack |
| aa0e8400-e29b-41d4-a716-446655440032.jpg | Ingersoll Rand P185 Compressor |
| aa0e8400-e29b-41d4-a716-446655440033.jpg | Miller Trailblazer 325 Welder |
| aa0e8400-e29b-41d4-a716-446655440040.jpg | CAT 320 Excavator #2 |
| aa0e8400-e29b-41d4-a716-446655440041.jpg | Komatsu PC210 Excavator |
| aa0e8400-e29b-41d4-a716-446655440042.jpg | John Deere 700K Dozer |
| aa0e8400-e29b-41d4-a716-446655440043.jpg | Generac XG7500E Generator |
| aa0e8400-e29b-41d4-a716-446655440050.jpg | Bobcat S650 Skid Steer #2 |
| aa0e8400-e29b-41d4-a716-446655440051.jpg | Bobcat S770 Skid Steer |
| aa0e8400-e29b-41d4-a716-446655440052.jpg | Genie GS-1930 Scissor Lift |
| aa0e8400-e29b-41d4-a716-446655440053.jpg | JLG 600S Boom Lift |
| aa0e8400-e29b-41d4-a716-446655440054.jpg | Snorkel TB42J Boom Lift |
| aa0e8400-e29b-41d4-a716-446655440060.jpg | John Deere Z930M Mower #2 |
| aa0e8400-e29b-41d4-a716-446655440061.jpg | Kubota RTV-X1140 Utility Vehicle |
| aa0e8400-e29b-41d4-a716-446655440062.jpg | Husqvarna 572 XP Chainsaw |
| aa0e8400-e29b-41d4-a716-446655440070.jpg | Toyota 8FGU25 Forklift #2 |
| aa0e8400-e29b-41d4-a716-446655440071.jpg | Toyota 8FGU25 Forklift #3 |
| aa0e8400-e29b-41d4-a716-446655440072.jpg | Hyster H50FT Forklift |
| aa0e8400-e29b-41d4-a716-446655440073.jpg | Crown FC5245 Forklift |
| aa0e8400-e29b-41d4-a716-446655440080.jpg | Sullair 185 Compressor |
| aa0e8400-e29b-41d4-a716-446655440081.jpg | Lincoln Ranger 225 Welder |
| aa0e8400-e29b-41d4-a716-446655440082.jpg | Milwaukee MX FUEL Concrete Saw |
| aa0e8400-e29b-41d4-a716-446655440090.jpg | Doosan P185 Compressor |
| aa0e8400-e29b-41d4-a716-446655440091.jpg | Vermeer S800TX Mini Skid Steer |

**Summary:** Produce 35 JPEGs in `supabase/seed-images/equipment/` named by the UUIDs above, using stock imagery that matches each equipment type, without changing any application or seed SQL code.
