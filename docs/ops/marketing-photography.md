# Marketing photography

## Placement and creative direction

Use real working environments to help visitors recognize their own shop. Keep
the home-page animation as the main product story and keep actual EquipQR
screenshots as feature proof. Photography supplies context, not UI evidence.

| Surface | Placement | Purpose |
| --- | --- | --- |
| Home (`/`, `/landing`) | Equipment yard beside “Who EquipQR is for”, below the animation and feature overview | Make the primary repair-shop audience recognizable and link into the repair-shop solution |
| `/solutions/repair-shops` | Equipment yard beside the hero copy and signup CTA | Continue the visual story from the home page without pushing the CTA below an image on mobile |
| `/features/inventory` | Workshop bench after benefits, before capabilities | Connect stock tracking to the next repair while retaining the inventory screenshots below |

Keep text on solid backgrounds. Stack columns on mobile, preserve the image
aspect ratio, and keep captions readable. Do not add stock photography to
customer testimonials, partner logos, the pricing screenshot collage, or the
animated hero. These photos do not depict EquipQR customers or endorsements.

For future campaigns, reuse the equipment yard alongside repair-workflow copy
and the workbench alongside parts-availability copy. Pair either with a real
product screenshot in campaign landing pages. Retain the logo-based social
preview until a separate campaign-specific composition is designed; a generic
photo alone would communicate less about the product.

## Source and license register

Reviewed September 20, 2026. These are photographs selected from photographer
source pages with pre-generative-AI-era dates and camera metadata, then visually
reviewed. No image generation, generative fill, or AI retouching was used.

### Equipment yard

- Photographer: **Jason Jarrach**.
- [Original photo on Unsplash](https://unsplash.com/photos/yellow-and-black-excavator-on-brown-soil-CaZHJbYdEf0).
- Source page: published **October 27, 2020**, **Canon EOS 6D Mark II**.
- [Download source](https://images.unsplash.com/photo-1603814929877-d5d927322656?fm=jpg&q=80&w=1200&fit=max).
- [Unsplash License](https://unsplash.com/license): permits free commercial use,
  download, modification, and distribution. Attribution is appreciated, and is
  included beside the image. The license does not permit selling unmodified
  photos or building a competing image library.
- Incidental equipment markings remain part of the scene. Do not use these as
  partner logos or suggest a manufacturer or fleet operator endorses EquipQR.

### Workshop tools

- Photographer: **Anastasia Shuraeva**.
- [Original photo on Pexels](https://www.pexels.com/photo/car-mechanic-tools-on-a-metal-surface-8470683/).
- Source page: taken **June 20, 2021**, uploaded **June 24, 2021**;
  **Panasonic DC-S5**, 35 mm, f/3.5, ISO 1250, 1/160 second. The page identifies
  Lightroom Classic 10.0 as the editing software.
- [Download source](https://images.pexels.com/photos/8470683/pexels-photo-8470683.jpeg?auto=compress&cs=tinysrgb&w=1200).
- [Pexels License](https://www.pexels.com/license/): permits free website and
  marketing use and modifications without required attribution. Visible credit
  is included. Do not imply endorsement, resell an unaltered photo, redistribute
  as stock, or incorporate it into a trademark.

## Asset handling

The shipped assets are in `public/images/landing/stock/`, registered in
`src/lib/landingImage.ts`, and rendered through `MarketingPhoto.tsx`.
There are no third-party image requests at runtime or new dependencies.

Both downloaded sources are 1200 × 1800. Conventional Sharp crops use
`{ left: 0, top: 0, width: 1200, height: 900 }` for the yard and
`{ left: 0, top: 550, width: 1200, height: 900 }` for the workbench.
Resize to 640 and 1200 pixels wide, then encode WebP at quality 78, effort 6.
Do not stretch or synthesize missing image content.

| Asset | Dimensions | Bytes |
| --- | --- | ---: |
| `equipment-yard-640.webp` | 640 × 480 | 42,178 |
| `equipment-yard-1200.webp` | 1200 × 900 | 104,012 |
| `workshop-tools-640.webp` | 640 × 480 | 33,136 |
| `workshop-tools-1200.webp` | 1200 × 900 | 92,368 |

Explicit dimensions reserve layout space. Below-fold images load lazily; only
the repair-shop hero image loads eagerly with high fetch priority. `srcSet`
allows mobile browsers to choose the smaller derivative.
