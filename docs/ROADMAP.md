# Pecking Order (mod_peckingorder): roadmap

Current release: **1.0.2** (built 2026-11-23: teams inside cards, `columns`, `group_titles`, `stack`, heading-only cards; Fishie to install-test). Joomla 5/6 site module + **Pecking Order Studio** (one-file offline editor, shipped inside the module and standalone). Prefix `pko-` (Studio `pks-`). Source in `src/` with `build.py` (builds Studio and the module zip from one shared renderer, `pecking-order.js` / `.css`; `pecking-order-export.js` is appended at build time; terser makes `pecking-order.min.js` and `admin-tools.min.js`, which the asset file loads — set `TERSER=` or it uses `npx terser@5`). `testkit/pecking-order-kitchen-sink.json` exercises every feature in one chart, `testkit/pecking-order-teams.json` the 1.0.2 layout features; `landing/` holds the landing page and the Reef demo chart.

## Stages to 1.0

| Stage | Version | What's in it |
|---|---|---|
| 1 ✓ | 0.2.0 | Layout control: `side-left/-right`, `assistant-left/-right` (Studio ← Left / Right →); Levels open at start; Stack rows wider than (default 6, two per row down the trunk); Mobile layout (list or keep chart) with Bootstrap breakpoints; pinch zoom; arrow-key navigation |
| 2 ✓ | 0.3.0 | Privacy and data: field visibility **by field type** (Organization, Contact, Place, Photo) by Joomla access level or Hidden, stripped server-side; unused columns never sent; Lock this folder (.htaccess); Data source switch; translatable chart text; ShrinkRay photos; Chaos Loupe enlarge. Roll-ups dropped (see below) |
| 3 ✓ | 0.4.0 | Export: SVG, PNG, vector PDF and Print from an Export menu (As shown / Everything); Ctrl+P prints the whole chart fitted to the page; Export tab (access level, title, as-of date, file name, Letter/A4, orientation); Studio gets the same |
| 4 ✓ | 0.5.0 | Finding your way: branch focus with a trail; filters (department, location, role, open roles; dim) and a named color key that filters; deputy styles Inside / Beside / Shared stem + `deputy_style` column; left-to-right layout |
| 5 ✓ | 0.6.0 | Sparkle pack: school-formation intro, sonar ping, bubble trail, reel in / cast out, depth shading, rooster, Konami fish; New tag (`start_date`, New-hire tag days setting), Help wanted tag + job link (`link`) |
| 6 ✓ | 0.7.0 | Studio: HR column mapping, bulk edit (Ctrl/Shift-click, Select branch, apply fields, move, delete), Duplicate, Sort A–Z, Compare tab. Chart: testing fixes; Starting soon tag; `class` column; Updated line + "As of" = file date; List view button; `#pko-focus=` deep links |
| 7 ✓ | 1.0.0 | Full test pass (all suites from 0.1–0.7 on the minified build, axe accessibility check of every test chart in both modes), accessibility fixes it found, minified script, landing page + Reef demo |

**Next:** Fishie installs 1.0.2 over 1.0.1 through System → Update (first real update test), uploads `mod_peckingorder.xml` + `cfd.xml` (already regenerated in `claude/cfd-updates/updates/`), and the 1.0.2 zip to jDownloads 15. Report-grid look ("pairs on the trunk") may be revisited (Fishie: "We might have to come back to this"); the alternative offered was a 2-wide grid hanging from a bar. Second tester's feedback still pending.

After 1.0: data from Joomla custom fields / Contacts / Users.

Fishie's standing default: when offered "both" options, he usually wants both.

## Decisions (1.0.2)
- From Fishie building a real chart: Director card with 2 deputies and a Support team (email + 2 people) in 3 rows; a Chief of Staff to the right of the Director and an Executive Staff box (6 roles, 2 roles held by 2 people) to the right of that, in a single column; and 4 groups under one leader as 2 columns / 2 rows.
- Fishie's picks: **Team row** (`placement` = `team`, `deputy_of` = leader; heading = `name`, clickable `email`, details panel; members `deputy_of` = team id, `parent` = team id — the AI prompt and Studio use parent = deputy_of; parent = leader also works); **shared titles opt-in per card** (`group_titles`); **pairs on the trunk** for report grids (`stack` = yes/no per leader, overrides Stack rows wider than; ignored left to right); extras: training manual, landing changelog, Data tab → Module tab wording, updated Studio.
- My calls (flagged to Fishie): `columns` 1–6 on a leader/unit/team row (team inherits its leader's); grid cells `minmax(180px,1fr)` so cards widen themselves (no `width` needed); list mode forces one column. A row with `unit` and no name/title (not vacant) = heading-only card: the heading is the button (`.pko-headbtn`, also `.pko-person` so search/keyboard/filters work); its people are "Members", they're "Part of" it. Teams: "Reports to" the leader in details; leader's details list Deputies and Teams separately. Team inside a team → warning, shown as a person. Team description shows under the team when Unit descriptions on cards is on. Beside/Stem deputy styles: a team becomes its own card with its people inside. Shared title: shown once (`aria-hidden`), each button keeps its title in a `.pko-vh` span; the exporter skips `.pko-vh`.
- Accent now climbs the whole deputy chain (`accOf`), in cards, details and the color key; Focus from a team member focuses the top leader (`leadOf`).
- Line fix: a single side card inside a side card's own column (`.pko-side .pko-side > li:only-child`) has no stem (height 0; width 0 left to right). Tried also removing it for a top-level single side card with nested sides: broke the Shared stem case (line floated below a short leader card), so reverted. The Director → Chief of Staff spine still runs from the Director's top edge (existing look).
- PHP: new columns cleaned (`columns` 1–6, `group_titles`/`stack` yes/no words); `buildTree` keeps members of deputies, no-JS list shows "Team: members" and drops "Deputy:" inside heading-only boxes. New words `W_MEMBERS`, `W_PART_OF`, `W_TEAMS`; column reference rows for the three columns.
- `build.py` now copies `samples/` into `media/samples` (the AI example had drifted).
- Update XML: written by hand to match `cfd_update.py` output (generator not on disk in the build chat), parsed back; project copies of `mod_peckingorder.xml` and `cfd.xml` updated. 1.0.2 install zip SHA-256: `8b1093b88066964f828c7abc1796d6bc6f6edf59949aef9518a16346859983ee` (rebuild-stable).
- Tests: old suites (ui50, lay, sp60, ks70, t100, t101, export, fx101, studio) rerun on 1.0.2 with only the known pixel-identical export failure; new `t102.py` (29 checks incl. axe in sparkle, sad, list, left-to-right, beside) and `studio102.py` (11 checks incl. axe) pass. Test setup copied to `/home/claude/tests` (served on :8767 from `web100`).

## Decisions (1.0.1)
- Shipped together: Studio prompt box fix, new AI prompt + `pecking-order-ai-example.json` (in `media/samples`, and Studio's Help has **Download AI example**, embedded at build via `/*@aiexample*/`), Sparkle extras switches, Browse button, `<updateservers>` collection tag (last child of `<extension>`), `script.php` install check, `LICENSE.txt`. No tester feedback yet (Fishie: "None yet").
- `script.php` and `LICENSE.txt` copied from TideWrack 1.1.1 (Fishie uploaded TideWrack 1.1.1, Chaos Filet 1.4.0 and Reel Fishy 1.0.1 zips): only names and language keys changed; strings `MOD_PECKINGORDER_INSTALL_PHP` / `_JOOMLA` in the sys.ini.
- Sparkle extras: data attribute `data-fx-off="rooster,depth"` (a list of what's *off*, so a missing attribute = all on); module fields `fx_school`, `fx_swim`, `fx_ping`, `fx_trail`, `fx_reel`, `fx_depth`, `fx_rooster`, `fx_konami`, `fx_tags` (Yes/No switches at the bottom of the Look tab, under a "Sparkle extras" note); JS `opts.fxOff` Set, `on(k)` = `fx()` and not off; CSS gates via root classes `no-fx-depth`, `no-fx-rooster`, `no-fx-tags`; `PeckingOrder.FX` / `fxOffOf`; `chart.set('fxOff', …)`. My calls: switches always shown (not only when Mode = Sparkle); Konami off = nothing in either mode; with Fish off the jump still ends in bubbles; with Reel off folding is instant (with the old bubble burst). The small bubble bursts and the vacancy shimmer aren't switchable (candidates if asked).
- Browse: new field type `Datapath` (`src/Field/DatapathField.php`, extends TextField) = input group with **Browse…**. Opens Joomla's own `<joomla-dialog>` (got via `customElements`, since `joomla.dialog` is an importmap module; the field loads `webcomponent.field-media` to bring it in) at `com_media&view=media&tmpl=component&mediatypes=3&path=local-<dir>:/<folder>`; starts at the current file's folder, else `files`, else the first Local directory (read from the Filesystem - Local plugin params). Listens for com_media's `onMediaFileSelected` event; `local-files:/x/y.json` → `files/x/y.json`; refuses folders, non-json/csv, non-local adapters with a Joomla warning; dialog marked `joomla-dialog-media-field` and set as `Joomla.Modal` current, like Joomla's media field. Only shown to users with `core.manage` on com_media. Only visible with Data source = File path (showon), so it doesn't switch the source itself. Checked against Joomla 5.4-dev source on GitHub; tested with a stand-in dialog, not real Joomla (Fishie tests live). Joomla 5.4's default Local directories already include `files`.
- `build.py`: checks manifest = asset JSON = JS version, a CHANGELOG entry, the update tag and `script.php`; fixed zip timestamps (rebuild = same SHA-256, confirmed); source zip now includes the module folder; calls `cfd_update.release('mod_peckingorder', zip)` when `CFD_UPDATES` / `../cfd-updates` has `cfd_update.py`, otherwise prints a note with the command; a `cfd_update.Fail` prints a note.
- Studio accessibility (axe on the Help and Look tabs, first time Studio was axe-checked): the title is now an `h1`, panel headings `h2`, the draft banner is a labeled region, and both `pre.pks-out` boxes are focusable (`tabindex=0`, labeled) so the scroll is keyboard-reachable.
- Fishie gave the download link as `https://chaoticfishdesign.com/downloads/send/4-cfd-developed/15-module-pecking-order`; verified from the server 2026-11-17 (200, application/x-zip).
- 1.0.1 install zip SHA-256: `0930edebbc73bb410bd83abc35c2e619ccab505e1f5a0e4dd55c2e9847ed206d`.

## Training manual
- **2026-11-23, 1.0.2 edition** (`Pecking-Order-Training-Building-a-Chart--1.0.2.docx`, 28 pages, 21 images): new section *Teams and card layout* (in *Making the data file*) with three new pictures (team card + Chief of Staff + Executive Staff; a 2 × 2 stack; Studio's Inside the card), the three columns and `team` placement in the column table, + Team/+ Member in Studio's button table, a team problem row, an FAQ and a checklist line. Studio's main Edit-tab screenshot (t1) is still the 1.0.1 one (no + Team button visible).
- **2026-11-17, 1.0.1 edition:** **Pecking Order Training: Building a Chart** (Word, 25 pages): for the person who builds the file and sets up the module. Built on the SquidForm training template Fishie supplied (`SquidForm-Training-Building-Forms--1.0.2.docx`: CFD cover, purple headings, purple-header tables, footer "title · version"). Tasks + FAQ style, like the SquidForm manuals. jDownloads item 21 (`7-training/21-training-pecking-order-building-a-chart`); landing page has a Training card for it.
- Screenshots from a real Joomla 5.4.0 test site (PostgreSQL, PHP built-in server) with 1.0.1 installed and the Reef as module "The Reef"; Studio shots from the bundled Studio; two diagrams (placements, three deputy styles) rendered by the real chart code. Builder scripts: `build_doc.py` + `content.py` (two passes fill the Contents page numbers from a LibreOffice render; Word may paginate slightly differently, Update Field fixes it).
- The live Browse button worked in real Joomla 5.4 (dialog, folders, Select fills `files/demos/peckingorder/pecking-order-demo.json`).
- README/TESTING said "Data tab"; fixed to **Module** tab in 1.0.2.

## Launch details (1.0.0)
- jDownloads ID **15** (Fishie). Download link used: `/downloads/send/4-cfd-developed/15-module-pecking-order`; `{jd_file file==15}` in the closing section.
- Demo modules **145** (top to bottom, defaults) and **146** (left to right, Shared stem, color key) — Fishie said future modules are 145 and up; I read that as Joomla module IDs.
- Upload to `/files/demos/peckingorder/`: `pecking-order-demo.json` (the Reef) and `pecking-order-studio.html` ("Open Studio" uses `?src=` to load the Reef).
- Landing page `module_peckingorder.html`: Reel Fishy's cf-page structure (hero, pitch, live demos "The pond", Studio, 8 feature cards, Sparkle or Sad, Under the hood, Training, CTA, changelog). Guessed links: `/tools/shrinkray`, `/tools/chaos-loupe`; hero icon guessed at `/images/tools/icons/peckingorder.svg`.
- Reef dates: New tags until ~Feb 2027; Starting soon until 2026-11-20.

## Decisions (1.0.0)
- Full pass found and fixed: white avatar initials on light accents (now automatic AA ink per accent, `--pko-avink`); unit headings on bright accents (darkened/lightened only as far as AA, `--pko-unink`); toolbar/filter/trail buttons use `--pko-ink` (gray outline buttons failed on tinted sections); stacked team `<li>`s now sit in `role="list"` slots.
- Minified script (110 KB → 68 KB; 26 KB gzipped); Joomla loads the readable one under System Debug.
- Tested in Chromium only (headless) plus Fishie's own Brave / DuckDuckGo / Firefox testing through 0.6; PHP lint on 8.3 only.
- Joomla Media field in modules only browses `/images/` (by design, not a 5.4 bug); the article editor's manager looks different because it's the full Media Manager. Workaround: File path, or add a `files` folder to the Filesystem - Local plugin.

## Decisions (0.7.0)
- Testing notes fixed: stacked hooks measured by JS from layout offsets (not CSS guesses, not getBoundingClientRect, so animations don't skew them); print hides filter bar/trail/Updated; no Focus on a lone top person; exports draw dotted lines on top, 0.8× width; bubble trail plays after the details panel closes (Fishie: "delay"); staff-with-reports problem wording mentions Focus.
- Fishie confirmed: `start_date` stays YYYY-MM-DD; keep the Sad mode lines; wanted Starting soon (future dates within the same N-day window) and a `class` column.
- `class`: plain class names only, never `pko-`/`is-` prefixes, max 8; applied to the person and to the card they own; cleaned in PHP and JS; always sent (not a privacy type).
- Extras Fishie picked: "As of" = data file's date (PHP `filemtime` → `data-updated`; Updated line under the chart, Controls toggle); List view button (Controls toggle, remembered in localStorage `pko:list`); focus deep links (`#pko-focus=<id>[&pko=<id>]`). Declined: Open roles count and "/" to search.
- Studio HR mapping: dialog when headers lack `id` + name/title; synonym guesses; First + Last; manager by ID or name ("Last, First" too); IDs from names if none; US or day-first dates → ISO; unmapped columns dropped; result saved as `…-pecking-order.json` (HR file untouched); choices remembered per header set.
- Studio bulk edit: Ctrl/⌘/Shift-click picks; "leave as is" fields; move-all skips moves under one's own reports; bulk delete moves reports up to the nearest surviving boss. Sort A–Z sorts within each placement group.
- Compare: by ID; added/removed/moved (boss or placement)/changed fields; outlines on the chart (green/blue/orange) plus text labels; refreshes when the tab opens.
- Known edge: a Beside deputy with `side-right` in a left-hand stacked slot has the hook pass behind the deputy card.

## Decisions (0.6.0)
- Fishie said "have fun"; I made the calls and flagged guesses.
- All effects use the Web Animations API (`el.animate`), sparkle-only via `fx()` (Sparkle mode and no reduced motion). They never touch CSS `animation`, so nothing replays. The CSS pop-in was replaced by the school-formation intro.
- Depth shading is shadow-only (bluer, deeper shadow per level, capped at 5) so WCAG text contrast is never affected.
- Rooster 🐓 only on the real top card (not on a focused branch), hidden in Sad mode, list mode and exports.
- Konami: listens on the document, ignores keys typed in inputs; Sad mode = one tired fish + "…no."; reduced motion = message only.
- `start_date`: YYYY-MM-DD only. New for 0–N days (default 90).
- `link`: web address, `mailto:` or site path; checked on the server and in the browser; opens in a new tab with `rel=noopener`. Tag shows only on vacant cards with a link.
- `start_date` and `link` are Organization-type fields (privacy).
- Exports hide decorations (rooster, pings) and keep tags as text, so PDFs stay vector.

## Decisions (0.5.0)
- Filters: department, location, role lists + Open roles button, built from the file (only fields the viewer may see). Non-matches **dim** (not hidden). Combine with AND. Matches inside folded branches unfold. Exports keep the dimming.
- Legend: module setting, `color = label` per line; shows above the chart and in exports; with filters on, each key color is a filter button (deputies use their leader's accent; cards without accent use the chart accent).
- Deputy styles: Inside (default), Beside, Shared stem. Matrix dropped. Chart-wide setting + `deputy_style` column on the leader's row. Beside = deputy cards in the leader's side column (left; `side-right` placement → right) on a double line. Shared stem = deputy cards between leader and the fold button (stay visible when folded), double line.
- Left to right: rotate everything; staff above (left) / below (right), assistants above/below the trunk, kids in a column; wrapAt ignored; arrows remapped. List mode still wins on narrow screens.
- Focus: Details → Focus on this branch; trail (nav.pko-crumbs) back up; search Enter outside the branch exits focus; focus also draws reports under staff/assistant cards.
- Fixed along the way: staff-column connector is now continuous (was separate hooks since 0.1).

## Decisions (0.4.0)
- Who sees Export: module setting (access level or Hidden), default Public. Exports only hold what the viewer already sees. Studio always has it.
- Folded branches: the menu asks, *As shown* or *Everything (all branches open)*; only offered when something is folded.
- PDF: vector, built in the browser with no libraries. Uses the PDF's built-in Helvetica (WinAnsi), stretched with `Tz` to the measured widths (Arial metrics = Helvetica). Any character outside WinAnsi → the PDF becomes one high-res picture.
- Paper: setting, Letter or A4, Automatic/Landscape/Portrait, chart scaled to fit one page.
- How it works: `capture()` in the renderer freezes the chart synchronously (no transform, no highlights, optional unfold, list mode off, zeroed animation timing so nothing replays), then the exporter reads geometry + computed styles (incl. `::before/::after` connectors) into a scene of rects/lines/text/images/paths → SVG string, canvas (PNG), or PDF writer.
- Exports keep the current mode (Sad mode → beige, gray photos). Dotted lines are drawn in exports even on *On hover*.
- My additions, not asked for: title and "As of" date on exports, file name setting, Ctrl+P print stylesheet working even with the button hidden.

## Decisions (0.3.0)
- Visibility is set per field **type**, not per field. Defaults: Organization and Photo Public; Contact and Place Registered. Name, title and unit always show. Email stays a mailto: link where shown.
- **Headcount / vacancy roll-ups dropped:** they go stale fast and most charts cover management only, so the numbers mislead. Put counts in `description` if wanted.
- Protecting the raw file: **Lock this folder** writes a deny-all `.htaccess` (Apache 2.2 + 2.4) and blank `index.html`, only for a dedicated folder (inside the site, not a top-level core folder like `images`/`files`, only CSV/JSON in it, no foreign `.htaccess`). Check / Open in Studio use a server-read copy embedded for managers, so they still work after locking. Studio receives files via localStorage (`pko-studio:incoming`, `?incoming=1`), never by URL.
- Data source switch: Media Manager or File path radio with `showon`; if the chosen one is empty, the other is used, so old modules keep working.
- `var(--x)` colors are used as typed, no checks (Fishie's call); documented as "works when your template defines it".
- Chaos Loupe: the details panel (a modal `<dialog>`, top layer) can't sit under Loupe, so it closes on photo click and reopens on `chaosloupe:close`, deferred one tick so Loupe's Escape doesn't close it again; 700 ms fallback if Loupe never opens.

## Update server
See `claude/cfd-update-server.md` and `claude/cfd-updates/` (collection `cfd.xml`, per-extension details XML from `cfd_update.py`). Releases are tagged `stable` from 1.0.0; Joomla `(5|6)\..*`, PHP 8.2+. Cloudflare: when the proxy is back on, bypass cache for `/updates/*.xml`.

## Sharing with the world (back pocket)
JED listing later, once new ideas slow down. First batch: Reel Fishy, SquidForm, Wayfin, Pecking Order and the Accessibility Toolbar. The shared update server comes first. JED expects Joomla 5 compatibility, a JEDChecker pass, working links (site, docs, support, demo), no encoded PHP, a clean install, and update servers.

## Shipped so far
- **1.0.2:** see Decisions (1.0.2).
- **1.0.1:** see Decisions (1.0.1).
- **1.0.0:** see stage 7, Launch details and Decisions (1.0.0).
- **0.7.0:** see stage 6 and Decisions (0.7.0).
- **0.6.0:** see stage 5 and Decisions (0.6.0).
- **0.5.0:** see stage 4 and Decisions (0.5.0).
- **0.4.0:** see stage 3 and Decisions (0.4.0).
- **0.3.0:** see stage 2 and Decisions (0.3.0).
- **0.2.1:** card colors accept rgb/rgba, hsl/hsla, names and `var(--x[, fallback])`; see-through colors measured blended onto the panel for contrast.
- **0.2.0:** see stage 1. The trunk is now drawn per row, so it stops at the last assistant or stacked row.
- **0.1.x:**
  - CSV/JSON (flat or nested); unit cards with deputies inside (reports to a deputy are drawn under the unit card); side and assistant placements; vacancies; roles; accent; per-card `width` / `background` / `color`
  - WCAG AA text contrast enforced on any card background; a chosen text color is used only if it passes
  - Dotted lines for `also_reports_to` (hover / always / off); chart background default / transparent / custom; panel border
  - Search with highlight, clear and jump; pan, zoom, auto-fit until the visitor moves it; collapse; details panel with Copy link; `#pko=<id>` deep links (clicking doesn't write the address)
  - Sparkle and Sad mode (snark lines); reduced motion honored; no-JS nested list
  - Module: Media picker or path, parse cache by file time and size, data cleaning, manager-only problem notes, Data tools (templates, check and preview, open in Studio, column reference)
  - Studio: open/save in place (Edge, Chrome) or by download (Firefox), edit panel with Card look and contrast readout, Go to picker, drag to rehome, undo, problems, raw, Look tab with matching settings, draft autosave, AI conversion prompt

## Notes and lessons
- Managers see notes only when logged in on the site front end (admin and site sessions are separate).
- Media Manager needs `json`/`csv` in Allowed Extensions and Document Extensions, plus MIME types `application/json,text/csv,text/plain`.
- Class names must be unique between the SVG layer and the HTML (0.1.3: `pko-link` clash hid the details links; lines now use `pko-dot`).
- Template-proofing: card buttons and list resets use `.pko`-prefixed selectors so global `button` / `ul` rules can't override them.
- A leftover `#pko=` in the address centers on that person instead of fitting (0.1.4 stopped clicks writing it).
- Reopening a modal dialog inside another script's Escape handler gets closed by the same keypress; defer with `setTimeout(…, 0)`.
- `animation:none` then restoring it replays CSS animations; to freeze for a capture, zero `animation-duration`/`animation-delay` instead. For one-shot effects, prefer the Web Animations API.
- A script's own `a.click()` for downloads counts as a document click; outside-click handlers should check `e.isTrusted`.
- Left-to-right rules are all scoped `.pko.is-ltr:not(.is-list)` so the narrow-screen list always wins.
- `build.py` asserts the manifest, `joomla.asset.json` and JS versions match and a CHANGELOG entry exists: bump all three together.
- Emoji in exported text force the PDF picture fallback (not WinAnsi), so decorations that use emoji must be hidden during capture.
- Measure layout with offsetLeft/offsetTop chains, not getBoundingClientRect, whenever an animation might be running.
- Studio has no details dialog: renderer code touching `dlg` must be guarded (0.7.0 nearly shipped a startup crash in Studio).
- Run axe on the test charts before a release: it caught three contrast problems and a list-structure problem the visual checks missed. Run it after the Sparkle intro settles: mid-animation it reports false contrast failures.
- Bootstrap's `btn-outline-secondary` gray (#6c757d) only passes AA on white; on any tint, use the chart's ink.
- A scroll box (`overflow:auto`) inside a flex column can shrink to almost nothing; give it `flex:none` (the 1.0.0 Studio prompt box).
- A pixel-identical screenshot test fails while any infinite CSS animation runs (vacancy shimmer, rooster peck, tag shine); still them first, and even then expect a few hundred anti-aliased pixels to differ.
- A Set passed through a helper that expects an array/string silently becomes empty (`String(new Set)` = "[object Set]"): 1.0.1's switches did nothing until `fxOffOf` accepted Sets.
- Visually hidden text (`.pko-vh`) must be skipped by the exporter, or it's drawn as stray text.
- Anything that finds a card through its person button (`cardEl`) breaks for a card with no person (heading-only); 1.0.2 falls back to `.pko-card[data-id]`.
