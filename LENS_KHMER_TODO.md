# Lens guide — Khmer copy needed

**116 strings.** Fill the Khmer column and send it back; each one then becomes
`{ en: '…', km: '…' }` in `src/types/lens.ts` and `localize()` picks it up with
no other change.

Product and SKU names (UV400 Clear, 1.56 GOLD Premium Coating Clear …) are
deliberately kept in English and are not listed here.

Anything left blank keeps showing the English text — which is the current state.

## standard-clear

| field | English | Khmer |
|---|---|---|
| name | Standard Clear Lenses |  |
| title | Standard Clear Lenses |  |
| subtitle | Clear everyday lenses with UV & screen protection. |  |
| recommendedFor | Ideal for digital device users, office workers, and general everyday wear. |  |
| coating | Green Anti-Reflection |  |
| coating | Blue Blocking Shield |  |
| coating | Hydrophobic Easy-Clean |  |
| coating | German Gold Coating |  |
| coating | German Red Coating |  |
| feature | UV400 Sun Protection |  |
| feature | 60% Blue Light Block |  |
| feature | Basic Anti-Glare Protection |  |
| feature | UV420 Screen Safety |  |
| feature | 100% Digital Blue Light Block |  |
| feature | Reduces Screen Eye Fatigue |  |
| feature | Super Hydrophobic Layer (SHMC) |  |
| feature | 100% Blue Light Block |  |
| feature | Scratch-resistant & Dust-repellent |  |
| feature | German Premium Gold Protection |  |
| feature | Super Hydrophobic (SHMC) |  |
| feature | 100% Blue Light Filter |  |
| feature | Highest Durability |  |
| feature | Less Coating Technology |  |
| feature | Repels dust, smoke and fog |  |
| feature | Premium German Red Anti-Reflection |  |
| feature | 100% Blue Light Filter |  |
| feature | Slick & Easy Clean |  |
| feature | High contrast visual field |  |
| tip | Ideal for office workers who spend long hours looking at computer screens. |  |
| tip | Anti-reflection coatings help reduce halo effects during night driving. |  |

## clear-thin

| field | English | Khmer |
|---|---|---|
| name | Clear Thin Lenses (High-Index) |  |
| title | Clear Thin Lenses (High-Index) |  |
| subtitle | Ultra-thin, lightweight lenses for high prescriptions. |  |
| recommendedFor | Highly recommended for moderate to strong prescriptions (SPH from -2.00 and above) who want thin, aesthetic lenses. |  |
| coating | Green Anti-Reflection |  |
| coating | Red Anti-Reflection |  |
| coating | Green Anti-Reflection |  |
| coating | Blue Protective Coat |  |
| feature | Refractive Index 1.61 (Thin) |  |
| feature | 100% Blue Light Protection |  |
| feature | Super Hydrophobic Easy-Clean Coating |  |
| feature | Premium German MR-8 Material |  |
| feature | Tough & Flexible Lens Material |  |
| feature | Thin & Lightweight Profile |  |
| feature | 100% Blue Light Block |  |
| feature | Super Hydrophobic |  |
| feature | Refractive Index 1.67 (Extra Thin) |  |
| feature | 100% Blue Light Block |  |
| feature | Hydrophobic Easy-Clean Profile |  |
| feature | German Premium Quality |  |
| feature | Extreme thickness reduction |  |
| feature | Accommodates SPH up to -15.00 |  |
| feature | Hydrophobic finish |  |
| tip | bug-eye |  |
| tip | Thin lenses are up to 50% lighter, keeping your glasses securely on your face without nose strain. |  |

## photochromic

| field | English | Khmer |
|---|---|---|
| name | Photochromic Lenses (Transitions) |  |
| title | Photochromic Lenses (Transitions) |  |
| subtitle | Light-adaptive lenses that darken automatically outdoors. |  |
| recommendedFor | Recommended for people sensitive to sunlight, frequent outdoor workers, or daytime drivers. |  |
| coating | Adaptive UV Shield |  |
| coating | Blue Shield + Transition |  |
| coating | Super Hydrophobic Photo |  |
| coating | Crystal Drive Transition |  |
| feature | Quick UV Reaction |  |
| feature | Lightweight Everyday Comfort |  |
| feature | Clear Indoor Vision |  |
| feature | UV420 & Blue Light Filter |  |
| feature | Deep Outdoor Tint |  |
| feature | Dual Digital & Sun Safety |  |
| feature | Rapid Outdoor Darkening |  |
| feature | Hydrophobic Water & Oil Repellent |  |
| feature | Scratch-resistant Clear Layer |  |
| feature | Japanese technology |  |
| feature | Automotive & Road Anti-Glare |  |
| feature | Fast Solar Activation |  |
| feature | Enhanced Contrast & Crispness |  |
| feature | German Quality Layer |  |
| tip | Photochromic lenses replace the need to switch between regular glasses and sunglasses. |  |
| tip | Quick-transition technology reacts in seconds when exposed to direct sunlight. |  |

## bifocal

| field | English | Khmer |
|---|---|---|
| name | Bifocal Lenses (2-Zones) |  |
| title | Bifocal Lenses (2-Zones) |  |
| subtitle | Dual-vision lenses for near and distance viewing. |  |
| recommendedFor | Ideal for customers over 40 needing both distance vision and reading correction in one frame. |  |
| coating | Premium Red Anti-Glare |  |
| coating | Red Photochromic |  |
| coating | Hydrophobic Photochromic |  |
| feature | Clear Round-Top Reading Zone |  |
| feature | Distance Vision Top |  |
| feature | Anti-Glare Coating |  |
| feature | Relieves reading fatigue |  |
| feature | Sun-Adaptive Dual-Zone |  |
| feature | Indoor Clarity + Outdoor Shade |  |
| feature | UV400 Full Protection |  |
| feature | Dual-Vision Convenience |  |
| feature | Super Hydrophobic Easy-Clean |  |
| feature | Scratch & Smudge Resistant |  |
| feature | Fast Light Adaptation |  |
| feature | Dual-Vision Convenience |  |
| tip | Bifocals eliminate the hassle of taking reading glasses on and off throughout the day. |  |
| tip | The visible reading segment provides a dedicated, wide sweet spot for close-up reading. |  |

## progressive

| field | English | Khmer |
|---|---|---|
| name | Progressive Lenses (Corridor) |  |
| title | Progressive Lenses (Corridor) |  |
| subtitle | Seamless multifocal lenses for all distances without lines. |  |
| recommendedFor | Highly recommended for individuals aged 40 and above experiencing presbyopia who want seamless, line-free multi-distance vision. |  |
| coating | Green Anti-Reflection |  |
| coating | Green Anti-Reflection |  |
| feature | 100% Blue light filter |  |
| feature | Super Hydrophobic layer (SHMC) |  |
| feature | Wide visual corridor |  |
| feature | Japanese technology |  |
| feature | UV420 responsive transition (Grey) |  |
| feature | 100% Blue light block |  |
| feature | Super Hydrophobic layer |  |
| feature | German technology |  |
| tip | Highly recommended for individuals aged 40 and above facing presbyopia. |  |
| tip | jump |  |


---

## UI labels (still showing my Khmer — please confirm or correct)

These 51 live in `src/localizations/locales/km.json`, not the catalogue.
They are the headings and demo labels around the lens content. I have left
them in place; say the word and I will strip these to English too.

| key | English | current Khmer | corrected Khmer |
|---|---|---|---|
| `LensGuideTitle` | Lens Technology | បច្ចេកវិទ្យាកែវ |  |
| `LensRecommendedFor` | Recommended For | សមស្របសម្រាប់ |  |
| `LensFeatures` | Features | លក្ខណៈពិសេស |  |
| `LensRangePrice` | Range & Price | កម្រិត និងតម្លៃ |  |
| `LensTips` | Recommendation Tips | ការណែនាំ |  |
| `LensComingSoon` | Details coming soon | ព័ត៌មានលម្អិតនឹងមកដល់ឆាប់ៗ |  |
| `LensComingSoonHint` | Lens options for this type are being added. Ask in store for current pricing. | ជម្រើសកែវសម្រាប់ប្រភេទនេះកំពុងត្រូវបានបញ្ចូល។ សូមសាកសួរនៅសាខាសម្រាប់តម្លៃបច្ចុប្បន្ន។ |  |
| `LensDemoKicker` | Interactive demo | ការសាកល្បងផ្ទាល់ |  |
| `LensDemoTitle` | Blue Block Laser Simulation | ការសាកល្បងពន្លឺ Blue Block |  |
| `LensDemoLaser` | Laser | ពន្លឺ |  |
| `LensDemoLens` | Lens | កែវ |  |
| `LensDemoEye` | Eye | ភ្នែក |  |
| `LensDemoLaserOn` | Laser: ON | ពន្លឺ៖ បើក |  |
| `LensDemoLaserOff` | Laser: OFF | ពន្លឺ៖ បិទ |  |
| `LensDemoUv400` | UV400 | UV400 |  |
| `LensDemoBlueBlock` | Blue Block | Blue Block |  |
| `LensDemoIdle` | Turn the laser on to see how each coating handles blue light. | សូមបើកពន្លឺ ដើម្បីមើលថាកែវនីមួយៗការពារពន្លឺខៀវយ៉ាងដូចម្តេច។ |  |
| `LensDemoBlocked` | The Blue Block coating stops the blue light at the lens — your eye stays protected. | ស្រទាប់ Blue Block បញ្ឈប់ពន្លឺខៀវនៅត្រង់កែវ — ភ្នែករបស់អ្នកត្រូវបានការពារ។ |  |
| `LensDemoPassing` | UV400 filters sunlight, but digital blue light still reaches your eye. | UV400 ការពារពន្លឺព្រះអាទិត្យ ប៉ុន្តែពន្លឺខៀវពីអេក្រង់នៅតែចូលដល់ភ្នែក។ |  |
| `LensOptions` | Lens Options | ជម្រើសកែវ |  |
| `LensThicknessTitle` | Lens Index Thickness Comparison SPH -4.00 | ការប្រៀបធៀបកម្រាស់កែវតាមសន្ទស្សន៍ SPH -4.00 |  |
| `LensThicknessBaseline` | 1.56 Index (Thicker) | សន្ទស្សន៍ 1.56 (ក្រាស់ជាង) |  |
| `LensThicknessSelected` | {{index}} Thinner | {{index}} ស្តើងជាង |  |
| `LensThicknessVs` | VS | ធៀបនឹង |  |
| `LensThicknessResult` | {{percent}}% Thinner & Lighter | ស្តើង និងស្រាលជាង {{percent}}% |  |
| `LensProfileStandard` | Standard Profile | កម្រាស់ធម្មតា |  |
| `LensProfileThin` | Thin Profile | កម្រាស់ស្តើង |  |
| `LensProfileExtraThin` | Extra Thin Profile | កម្រាស់ស្តើងបន្ថែម |  |
| `LensProfileUltraThin` | Ultra Thin Profile | កម្រាស់ស្តើងបំផុត |  |
| `LensPhotoTitle` | Photochromic Light Transition Demo | ការសាកល្បងការប្តូរពណ៌តាមពន្លឺ |  |
| `LensPhotoIndoor` | Indoor | ក្នុងផ្ទះ |  |
| `LensPhotoSunlight` | Sunlight | ពន្លឺថ្ងៃ |  |
| `LensPhotoAdapting` | Adapting | កំពុងប្រែ |  |
| `LensPhotoAvailableIn` | Available in: | មានពណ៌៖ |  |
| `TintGray` | Gray | ប្រផេះ |  |
| `TintBrown` | Brown | ត្នោត |  |
| `TintGreen` | Green | បៃតង |  |
| `TintBlue` | Blue | ខៀវ |  |
| `TintPurple` | Purple | ស្វាយ |  |
| `TintTeal` | Teal | បៃតងខៀវ |  |
| `TintOrange` | Orange | ទឹកក្រូច |  |
| `TintPink` | Pink | ផ្កាឈូក |  |
| `LensZoneBifocalTitle` | Bifocal Zone Mapping | ផែនទីតំបន់កែវពីរកម្រិត |  |
| `LensZoneProgressiveTitle` | Progressive Zone Mapping | ផែនទីតំបន់កែវបន្តបន្ទាប់ |  |
| `ZoneTapHint` | Tap a lens segment to map the zones | ចុចលើផ្នែកកែវ ដើម្បីមើលតំបន់នីមួយៗ |  |
| `ZoneFar` | FAR | ឆ្ងាយ |  |
| `ZoneMid` | MID | កណ្តាល |  |
| `ZoneNear` | NEAR | ជិត |  |
| `ZoneFarBody` | The upper zone, used for distance — driving, watching TV, seeing across a room. | ផ្នែកខាងលើ សម្រាប់មើលឆ្ងាយ — បើកបរ មើលទូរទស្សន៍ មើលឆ្លងបន្ទប់។ |  |
| `ZoneMidBody` | The middle corridor, for arm's-length work such as a computer screen. | ច្រករបៀងកណ្តាល សម្រាប់ការងារចម្ងាយដៃ ដូចជាអេក្រង់កុំព្យូទ័រ។ |  |
| `ZoneNearBody` | The lower zone, for close work — reading, your phone, fine detail. | ផ្នែកខាងក្រោម សម្រាប់មើលជិត — អាន មើលទូរស័ព្ទ និងព័ត៌មានលម្អិត។ |  |
