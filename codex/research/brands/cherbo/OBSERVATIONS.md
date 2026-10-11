# 라체르보 푸르지오 써밋 — photo-backed architecture notes

Reviewed 2026-10-11. The evidence set contains **11 distinct, visually inspected actual complex photos**: 10 exterior/site views and 1 shared amenity interior. No renderings count toward that total. Photo indexes below match [`manifest.json`](manifest.json); local originals are in [`photos/`](photos/).

The strongest daylight exterior reference is **#9**, a resident post explicitly described as a photo shared by the association and showing buildings 104 and 105. It supports a cool, restrained façade palette: dark slate or blue-gray window/spandrel fields, broad pale-gray vertical blades, a nearly black stone podium, dark window frames, and narrow repeating window bays. Keep the V3 world’s warm, walkable tone in its light and planting; let the building itself read as cooler and more architectural. Do not paint the entire complex beige or white based on low-resolution night captures.

## Useful design observations

| Element | Photo evidence | Implementation direction | Confidence |
|---|---|---|---|
| Façade palette | **#9** daylight target façade; **#3**, **#5** night tower views | Use charcoal/slate glazing fields with large cool light-gray vertical wall bands. Keep highlights muted. Night imagery is useful for lighting only. | High for broad color split from #9; exact material/color values remain estimates. |
| Podium and base | **#1**, **#2**, **#3**, **#9** | Ground floors and tower bases read substantially darker than the upper wall bands. Model a dark stone/plinth band, with lighter stone around the entry volume. | High for #9 tower base; medium for gate material because #1 is night-lit. |
| Crown and silhouette | **#5** shows SUMMIT branding high on the tower; **#3** shows the upper tower against the sky | Preserve a distinct darker crown/roof zone and tall, slim tower proportions. Keep the crown simple until a daylight detail reference confirms its screen geometry. | Medium. The dark top is visible, but photos do not establish a precise crown profile. |
| Vertical façade rhythm | **#3**, **#5**, **#9** | Build repeated narrow window bays and taller pale vertical strips. The major rhythm is vertical even where balcony slabs create horizontal subdivision. | High for rhythm; medium for exact module width from compressed photos. |
| Windows and balconies | **#3**, **#5**, **#9** | Use dark-framed rectangular openings in consistent stacks. The reference photos do not clearly resolve balcony rail construction or a reliable balcony count; avoid inventing projecting glass balconies as a signature. | Medium for window rhythm, low for balcony detail. |
| Gate and signage | **#1** | Entry fascia is a curved, vertically ribbed band with a continuous warm light edge. Actual sign reads **SUMMIT PRUGIO** in white-lit letters. The adjacent **SUMMIT LOUNGE** sign is visible in **#2**. Use the project-era mark root is retrieving; do not redraw the physical sign as generic text. | High; directly legible in resident photo. |
| Courtyard and landscape | **#2**, **#4**, **#6**, **#7**, **#8**, **#9**, **#10** | Use planted tower courts, trimmed pines, small-canopy trees, broad paved paths, curved retaining edges, and low warm path lighting. Several views show a sunken garden/courtyard and landscaped walks linking low community volumes to the towers. | High for site character; exact dimensions and planting species are not measured. |
| Shared lounge | **#11**, plus the exterior entrance in **#2** | The communal lounge is a dark, quiet interior: charcoal vertical slats, dark timber, gray stone floor, black-framed glazing, and low lounge furniture. This is a common amenity reference only; it says nothing about private unit interiors. | High; official project article identifies the space. |

## Photo index

1. **Gate / SUMMIT PRUGIO sign** — Resident night photo; curved ribbed entry fascia, pale base, warm linear edge light, paving and planting. Actual sign is legible.
2. **SUMMIT LOUNGE courtyard entrance** — Resident night photo; tower IDs 102, 103, and 106 frame the lounge frontage and planted courtyard.
3. **Tower 103/105 and covered frontage** — Resident night photo; tall tower faces, low community frontage, trees, and curved lighting canopy.
4. **Broad tower and planted-court view** — Resident night photo; several towers above a green courtyard. Use for composition, not daylight color.
5. **SUMMIT crown above park canopy** — Resident dusk photo; dark tower faces, pale vertical bands, and warm horizontal landscape lighting.
6. **Night courtyard and bridge** — Resident photo; planted mounds, curved paths, bridge, and low-level lights; façade is partly cropped.
7. **Terrace and planted court** — Resident evening photo; outdoor seating, glass guardrail, tower backdrop, and warm courtyard edge lighting.
8. **Internal pedestrian path** — Resident dusk photo; lit path, trees, and tower edges. Use as a route/landscape reference rather than façade detail.
9. **Daylight towers 104/105 and sunken court** — Resident post says the association shared the image. This is the most useful actual daylight façade and podium reference.
10. **Official sunken courtyard from lounge glazing** — Daewoo/Prugio caption identifies the photo as La Cherbo Summit’s sunken and amenity space. It shows a planted island, curved pale stone, layered soffits, and dark mullions.
11. **Official shared lounge interior** — The same official article identifies this as a Summit amenity interior. Use only for common-space architecture.

## Provenance and limits

- Resident images #1–9 are linked to the La Cherbo complex/community pages on Hogangnono. Dates embedded in image IDs or post dates are treated as upload/post dates, not confirmed camera dates; `shotDate` stays null in the manifest.
- Official photos #10–11 are from Daewoo/Prugio’s 2026-03-03 article, “대우건설, ‘2026 iF DESIGN AWARD’ 최종 Winner 수상.” The article captions explicitly identify #10 as La Cherbo Summit’s sunken/amenity space and #11 as the amenity interior: [official article](https://m.prugio.com/brand/news-view.aspx?idx=99751).
- The asset hashes in the manifest are unique across all 11 counted images. Candidate photos visibly belonging to neighboring THE SHARP towers, private interiors, infographics, scale models, unrelated/ambiguous skyline views, and promotional renderings are kept out of the count.
- An early demolition photo and a September 2024 construction photo are saved as excluded candidates. They document the site historically, not the completed façade. The night render in `photos/apt-main.jpg` is also excluded; use it only as a marked concept rendering if a massing clue is needed.
- The most current target-specific resident image in this set is #5 (asset key begins 2026-07-05); the October 2026 resident review images available on the page depict neighboring towers or private interiors and were excluded. Treat currentness as the review/image upload window, not a verified camera timestamp.
- Current source pages and photo files remain external copyrighted works. These saved files are for internal visual research and are not cleared for product redistribution.
