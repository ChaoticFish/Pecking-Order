# Changelog

## 1.0.2 (2026-11-23)

Teams and more control over how a card is laid out, from building a real chart.

- New: **teams inside a card.** A row with `placement` = `team` and `deputy_of` = a leader becomes a section in that leader's card, with its own heading and a clickable email. Its people point at it with `deputy_of`. Teams get their own details (Reports to, Members), and Beside or Shared stem deputies show a team as its own card.
- New: **`columns`**: how many people sit side by side inside a card (1 to 6), on a leader's, unit's or team's row. `1` makes a single column; `2` makes pairs. Empty keeps the old single row.
- New: **`group_titles`**: people next to each other with the same title share one title, with their names under it. Screen readers still hear each person's title.
- New: **`stack`** on a leader's row: `yes` stacks that leader's reports two per row down the trunk (four groups make a 2 × 2 block), `no` never does, whatever *Stack rows wider than* says.
- New: **heading-only cards.** A row with a `unit` and no name or title shows just the heading and its people, instead of an empty "?" person.
- Fixed: a staff card beside a staff card (Executive Staff to the right of a Chief of Staff) had stray vertical lines above its connector.
- Fixed: deputies and team members always take the nearest leader's color, in details and in the color key too.
- Studio: **+ Team** and **+ Member** buttons, and an *Inside the card* section (People per row, Share titles, Their reports). The placement list has *Team*.
- AI prompt and example: teams, heading-only boxes, `columns`, `group_titles` and `stack`.
- Docs: the README and test checklist called the module's first tab "Data"; Joomla shows it as **Module**.

## 1.0.1 (2026-11-10)

Automatic updates start here, plus three small things from testing 1.0.0.

- New: **automatic updates.** Pecking Order now checks Chaotic Fish Design's update server, so new versions show in System → Update → Extensions. Install 1.0.1 over 1.0.0 once (System → Install → Extensions) to turn this on; 1.0.0 can't find updates by itself.
- New: **Sparkle extras** (Look tab, and Studio's Look tab): switch single effects off and keep Sparkle mode: school intro, fish on search jumps, sonar ping, bubble trail, reel in / cast out, depth shading, the rooster, Konami fish, and the shine and bob on tags (the tags stay). All on by default. Sad mode and reduced motion still turn everything off.
- New: **Browse…** next to File path opens the full Media Manager (every folder the Filesystem - Local plugin lists, such as `files`, not just `images`) and fills in the path of the file you pick.
- New: install check. Installing on PHP below 8.2 or Joomla below 5 stops with a plain message instead of breaking the site.
- New: the updated AI conversion prompt (flat file, Assumptions and Suggested settings sections, position-based IDs so Compare works between conversions), and `samples/pecking-order-ai-example.json` to attach with it. Studio's Help tab can download the example too.
- Fixed: in Studio's Help tab, the AI prompt box was squashed to a single line. It now shows the prompt and scrolls.
- Added: `LICENSE.txt` (GPL v2) in the package.

## 1.0.0 (2026-11-06)

First stable release. No new features since 0.7.0: a full test pass of everything from 0.1 to 0.7 (including an automated accessibility check of every test chart), the documentation brought up to date, and the landing page.

- Fixed (accessibility): avatar initials on a light accent (yellow, say) were white and hard to read. They now get the same automatic WCAG AA text color as the rest of the card.
- Fixed (accessibility): unit headings on bright accents could fall just under AA. They now darken (or lighten on a dark card) only as far as needed.
- Fixed (accessibility): toolbar, filter and trail buttons use the chart's text color, so they stay readable on tinted page sections.
- Fixed (accessibility): teams in stacked rows are announced as list items again.
- Changed: the site loads a minified script (about a third smaller); with System Debug on, Joomla loads the readable one.

- An org chart from a CSV or JSON file: unit cards with deputies (inside, beside or on a shared stem), staff and assistant placements, vacancies, dotted-line managers, photos, colors with automatic WCAG AA text.
- Finding your way: search, pan and zoom, fold branches, keyboard navigation, branch focus with a trail, filters and a color key, deep links, top-to-bottom or left-to-right, a list on phones and on request.
- Privacy by field type, stripped on the server, and Lock this folder for the file itself.
- Export to SVG, PNG and vector PDF, and print fitted to one page.
- Sparkle (with the full sparkle pack) or Sad mode; reduced motion honored.
- Pecking Order Studio: an offline editor with HR-export column matching, bulk edit, compare, and an AI conversion prompt.

## 0.7.0 (2026-11-05)

Studio power tools, and fixes from testing 0.4–0.6.

- Fixed: in stacked rows ("Stack rows wider than"), the line from the trunk now reaches each card, at the card's real middle, even when the card sits over a wide branch or is taller than usual.
- Fixed: printing the page (Ctrl/⌘+P) no longer prints the filter bar, the focus trail or the Updated line; the color key is already in the printed chart.
- Fixed: Focus on this branch isn't offered for the top person when there's only one (it was the whole chart).
- Changed: exports draw dotted-line managers on top of the cards, a little thinner, so each reads as one line.
- Changed: the bubble trail waits until the details panel closes, so you can see it.
- Changed: the problem note for staff cards with their own reports now says Focus on this branch shows them.
- New: **Starting soon** tag for start dates in the future, within the New-hire window; the details say "Starts …".
- New column `class`: your own CSS class names on a card (and on the person), to style in your template. Names starting `pko-` or `is-` are ours and are ignored.
- New: **Updated** line under the chart (Controls → 'Updated' line) with the data file's last-changed date. Exports use that date for "As of", so a stale chart can't look current.
- New: **List view** button (Controls → List view button): the indented list at any width, remembered in the visitor's browser.
- New: focus deep links. `#pko-focus=<id>` opens the chart focused on that branch; Copy link while focused keeps the branch (`#pko-focus=td&pko=sec`).
- Studio 0.7.0:
  - **Opening an HR export:** a CSV whose columns aren't Pecking Order's opens a **Match your columns** dialog with guesses filled in: ID (or IDs made from names), manager by ID or by name ("Last, First" works), First + Last name, US or day-first dates turned into year-month-day. Unmatched columns (salary, say) are left out, and the result is a new file; the HR file isn't changed. Choices are remembered for files with the same columns.
  - **Bulk edit:** Ctrl/⌘ or Shift + click to pick several cards (or **Select branch**), then set department, location, office, roles, colors or CSS class for all, move them all under a new boss, or delete them (their reports move up).
  - **Duplicate** a card; **Sort A–Z** someone's reports (staff and assistants sort among themselves).
  - **Compare** tab: check the open chart against an older file: added, removed, moved and changed people, listed and outlined on the chart.
  - CSS class field in Card look.

## 0.6.0 (2026-11-05)

The sparkle pack. All of it is Sparkle-mode only and stops for Sad mode and reduced motion.

- New: **school formation** intro: on load, cards swim in from the middle and settle into place, with a burst of fish. It replaces the old pop-in.
- New: **sonar** pings on search hits, and on the person Enter jumps to.
- New: **bubble trail** up the chain of command when you click someone.
- New: **reel in / cast out**: folding a branch winds it up into its line, opening casts it back out; the button spins like a reel.
- New: **depth shading**: deeper cards get a deeper, bluer shadow (shadow only, so contrast is untouched).
- New: **the rooster** on the top card, pecking now and then, and hopping when you click the top person.
- New: **Konami code** (↑ ↑ ↓ ↓ ← → ← → B A): a school of fish (and a shark) crosses the chart. Sad mode gets one tired fish. Reduced motion gets the message only.
- New column `start_date` (year-month-day) and Look → **New-hire tag for (days)** (default 90; 0 off): recent starters get a **New** tag, and their details show the start date.
- New column `link` on open roles: a **Help wanted** tag on the card and a "See the job posting" link in the details (opens in a new tab). Only web addresses, `mailto:` and site paths are accepted, on the server and in the browser.
- `start_date` and `link` belong to the Organization privacy type.
- Two new Sad mode lines (`MOD_PECKINGORDER_SAD_5` and `_6`).
- Exports and prints leave the decoration out (rooster, pings, fish, bubbles); the tags are kept as text, so PDFs stay vector.
- Studio 0.6.0: Start date and Job posting link fields, New-hire tag setting on the Look tab, and the sparkle pack in the preview.

## 0.5.0 (2026-11-05)

Finding your way.

- New: **Focus on this branch** in a person's details shows just their part of the chart, with a trail above it (Whole chart › Office › Technical Director) to step back up. Searching for someone outside the branch and pressing Enter goes back to the whole chart. Exports of a focused branch print the trail under the title. Focus also shows reports under staff or assistant cards, which the whole chart doesn't draw yet.
- New: **Filters** (Controls → Filters, on by default): Department, Location and Role lists plus an **Open roles** button, built from the file. Only fields the visitor may see are offered. Cards that don't match dim, and folded branches open to show the matches. Filters stay on in exports, so you can print "just Engineering".
- New: **Color key** (Look → Color key): name your accent colors, one per line (`#7b4fd6 = Engineering`). It shows above the chart and on exports; with filters on, clicking a color shows just those cards.
- New: **Deputies** (Look): *Inside the leader's card* (as before), *Beside the leader* (their own cards in the leader's side column, joined by a double line; left, or right with placement `side-right`), or *Shared stem* (their own cards on the line under the leader, above the reports, still visible when the branch is folded). A new `deputy_style` column on a leader's row overrides the setting for that leader.
- New: **Chart direction** (Look): *Left to right* grows the chart sideways. Staff sit above (left) and below (right) their boss, assistants above and below the line, and teams run down a column, so *Stack rows wider than* doesn't apply. Arrow keys follow: → first report, ← boss, ↑ ↓ neighbors.
- Changed: the line joining a boss to a staff column is now one continuous line instead of separate hooks.
- Studio 0.5.0: Look tab has Chart direction, Deputies, Color key and Filters; the Edit tab has a per-leader Deputies setting, and placement can be set on deputies.

## 0.4.0 (2026-11-05)

Export.

- New: **Export** button: save the chart as an **SVG drawing**, a **PNG image** (2× resolution, your template's fonts) or a **PDF**, or **Print** it. Choose **As shown** (folded branches stay folded) or **Everything (all branches open)**; the choice only appears when something is folded.
- PDFs are vector: sharp at any zoom, with real, searchable text, using the PDF's built-in Helvetica stretched to match your font's widths. If a name uses characters Helvetica can't show (Chinese, Arabic, Cyrillic, …), that PDF is made as one high-resolution picture instead.
- New: printing the page (Ctrl/⌘+P) prints the whole chart fitted to the paper, instead of the part showing in the panel. This works for every visitor, even with the button hidden.
- New: **Export** tab: who sees the button (an access level, or Hidden; default Public), a title, an "As of" date, the file name, and paper (US Letter or A4, Automatic/Landscape/Portrait). PDF and Print scale the chart to fit one page.
- Exports hold only what the visitor can see; the Privacy settings still apply. Everything is made in the browser: nothing is sent anywhere, and no outside libraries are used.
- Exports look like the screen (Sparkle or Sad mode included) without the highlights, selection, fold buttons or animation. Dotted-line managers set to *On hover* are drawn in exports; *Off* leaves them out.
- Studio 0.4.0: the same Export menu in the toolbar; Export settings on the Look tab, with matching module settings.
- Fixed: closing Chaos Loupe with Escape could leave the details panel closed.

## 0.3.0 (2026-11-05)

Privacy and data.

- New: **Privacy** tab. Choose who can see each type of field: Organization (roles, department, description), Contact (email, phone), Place (office, location), Photo. Each takes a Joomla access level or Hidden. Defaults: Organization and Photo Public, Contact and Place Registered. Hidden fields are removed on the server and never reach the visitor's browser. Name, title and unit always show.
- New: only the columns the chart uses are sent to the browser; anything else in your file stays on the server.
- New: **Lock this folder**. Data tools tells you when the saved chart file can be downloaded directly, and one click writes a deny-all `.htaccess` (Apache 2.2 and 2.4) so only the module can read it. For safety it only locks a dedicated folder: inside the site, not a main folder like `images` or `files`, holding nothing but CSV/JSON files.
- Changed: Check and Open in Studio use a copy of the saved file read on the server, so they work after the folder is locked. Studio now receives files through the browser's storage instead of the file's address.
- New: **Data source** switch (Media Manager or File path); only the chosen field shows. If the chosen one is empty, the other is used, so older modules keep working.
- New: all chart text is in the language file (details labels, Open role, Copy link, search counts, the Sad mode button and up to 8 snark lines), so it can be translated or reworded per site with Joomla's language overrides.
- New: **ShrinkRay** photos. When ShrinkRay is enabled, photos under `/images` use its WebP copies (only ones newer than the original), with a proper `srcset` when it sizes by width.
- New: **Chaos Loupe**. When it's installed, clicking the photo in the details panel opens it in Chaos Loupe at the largest copy, using the site's Loupe attribute settings; the panel steps aside and comes back when Loupe closes. Without Loupe, the panel's own click-to-enlarge uses the largest copy.

## 0.2.1 (2026-11-05)

- New: card colors (`background`, `color`, and the chart-wide Card background / Card text color) accept `rgb()`/`rgba()`, `hsl()`/`hsla()`, and `var(--name)` (optionally with a fallback, `var(--brand, #05b5c3)`). A variable works when your template defines it; it's used exactly as typed, with no checks.
- Accessibility: see-through colors are now measured as they appear, blended onto the chart panel behind the card, so automatic text color stays at WCAG AA. When the browser can work out a variable's color, the same automatic text applies.
- Module: Card background and Card text color are text fields now, so they take any of these formats.

## 0.2.0 (2026-11-05)

Layout control.

- New placements: `side-left`, `side-right`, `assistant-left`, `assistant-right`. Plain `side` stays right, and plain `assistant` fills whichever side is shorter, in order. Studio has **← Left / Right →** buttons on side and assistant cards.
- New: Look → **Levels open at start**. Deeper branches start folded; search, deep links and the arrow keys open them as needed.
- New: Look → **Stack rows wider than** (default 6). Long teams stack down the trunk two per row instead of one very wide row.
- New: Look → **Mobile layout** (indented list, or keep the chart) and **Switch to the list below** with Bootstrap breakpoints (sm, md, lg, xl, or custom px). Replaces the old pixel setting.
- New: pinch to zoom on touch screens.
- New: arrow keys move between people (↑ boss, ↓ first report, ← → neighbors, Home the top), opening folded branches and keeping the person in view.
- Fixed: the trunk line no longer runs past the last assistant row.
- Studio 0.2.0: new placement choices, Left/Right buttons, and the two new Look options.

## 0.1.5 (2026-11-05)

- New per-card columns: `width` (px), `background` and `color`. Studio's editor has them in a new **Card look** section.
- New: Look → **Card background** and **Card text color** for every card without its own.
- Accessibility: on any card background, text color is picked automatically to pass WCAG AA (4.5:1). That covers names, titles, roles, descriptions and the unit heading; softer text is kept at 4.5:1 too. A text color you choose is used only if it passes; otherwise the automatic color is used, and Problems, the module's Check and Studio say so with the actual ratio. Studio shows the live contrast as you pick.

## 0.1.4 (2026-11-05)

- Fixed: the chart could load centered on someone instead of fitted. Clicking a person wrote a `#pko=` deep link into the address, so every reload after that followed it. Clicking no longer changes the address.
- New: **Copy link** in the details panel makes a deep link to that person on purpose. Deep links (`#pko=<id>`) still open the chart centered on that person.

## 0.1.3 (2026-11-05)

- Fixed: the details panel's Reports to, Deputy to and Also reports to links were invisible. The dotted-line drawing added in 0.1.1 reused their class name (`pko-link`) and hid them; the lines now use `pko-dot`.

## 0.1.2 (2026-11-05)

- Fixed: **Reports to** and **Also reports to** links in the details panel could be invisible under some templates' button styles. They're now plain links with their own styling.
- Fixed: people who report to a deputy weren't drawn. They now appear under the deputy's unit card, and their details still say they report to the deputy.
- Fixed: Fit now centers on the cards themselves, so template margins can't push the chart off-center.
- New: a clear (×) button in the search box.
- Studio 0.1.2: **Go to** picker at the top of the Edit tab reaches anyone, drawn or not; a note explains when someone isn't drawn; selecting an undrawn person no longer breaks.

## 0.1.1 (2026-11-05)

- New: **Also reports to** is drawn as dotted lines (Look → Dotted-line managers: On hover, Always, or Off). On hover shows a person's lines while you point at, tab to or select them.
- New: Look → **Chart background** (Default, Transparent, Custom color) and **Panel border** (show or hide).
- Fixed: the chart now keeps fitting itself while the page finishes loading (fonts, images, template layout, or a module that starts hidden), until the visitor pans or zooms. Fit turns it back on.
- Studio 0.1.1: Look tab has the new background and dotted-line options; Help mentions dotted lines.

## 0.1.0 (2026-11-05)

First testing release.

- Org chart from a CSV or JSON file (flat rows with `parent`, or nested `children`)
- Unit cards with deputies inside; side (staff) and assistant (on the trunk) placements; vacancies; roles; accent colors; photos
- Search with highlight and jump (Enter), pan, zoom, fit, collapse, details panel, `#pko=<id>` deep links
- Sparkle mode (pop-in, fish swim to search hits, bubbles, chain-of-command glow, vacancy shimmer) and Sad mode, with visitor switch; no motion for reduced-motion devices
- Indented list on narrow screens; plain nested list without JavaScript
- PHP parse cache keyed to file time and size; data cleaned (site files only, size limits, color and photo checks)
- Data tools in the module settings: templates, samples, check and preview the picked file, open it in Studio, column reference
- Pecking Order Studio 0.1.0: offline one-file editor. Open and save in place (Edge, Chrome) or by download (Firefox), edit panel, add report, side, assistant or deputy, drag to change who someone reports to, reorder, delete, undo and redo, problems list, raw JSON or CSV editing, Look preview with matching module settings, draft autosave, AI conversion prompt
