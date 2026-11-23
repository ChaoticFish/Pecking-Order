# Pecking Order 1.0.2: test checklist

The full pass: every section below, newest first, on Joomla 5 and 6. The Kitchen Sink chart (`testkit/pecking-order-kitchen-sink.json` in the source zip) covers most of it on one page.

## Install
- [ ] Installs on Joomla 5 and on Joomla 6 without warnings (PHP 8.2+)
- [ ] `media/mod_peckingorder/` has css, js, samples, studio
- [ ] The module appears in Site Modules → New

## Data
- [ ] Media Manager lists and uploads `.json` and `.csv` (after adding them to Media options, if needed)
- [ ] Sample JSON via the Media field renders the sample chart
- [ ] Same with the sample CSV via **Or a file path**
- [ ] A file path outside the site (`../x.json`) or a URL shows the admin note, not a chart
- [ ] No file picked: logged in **on the site** as a manager, you see the note; logged out, nothing
- [ ] Re-upload an edited file: the change shows on the next page load (no cache clear)

## Data tools (module settings)
- [ ] Template / sample links download
- [ ] **Check and preview** shows "Looks good" plus a preview using the Look tab's current values (change the line style, check again)
- [ ] A broken file (e.g. a `parent` pointing nowhere) lists the problem
- [ ] **Open Studio** opens Studio in a new tab
- [ ] **Open the picked file in Studio** loads the site file into Studio
- [ ] Admin dark mode: the tools and preview are readable

## Chart (front end)
- [ ] Layout matches the sketch: Office card with deputies inside, staff column right, Chief 01 and TD on the trunk, Senior Security beside TD, groups on the bus
- [ ] Line style, line color, accent, card width, spacing and chart height settings all apply
- [ ] `width` on the Office card widens it; the staff column and trunk stay attached
- [ ] Dark, mid and light `background` colors: all text on the card stays readable (names, titles, roles, unit heading, description)
- [ ] Card background / Card text color settings apply to cards without their own
- [ ] Chart background: Default, Transparent (no panel, no border), Custom color; Panel border hide
- [ ] Chart is fitted on first load, including after a hard refresh with an empty cache
- [ ] Module in a tab or accordion that starts closed: fitted when opened
- [ ] Pan or zoom, then resize the window: the chart stays where you put it; Fit re-fits
- [ ] Dotted lines (sample: Kelp Ostrowski → Ray Mantis, Barry Cuda → Pike Morrow): On hover shows them when pointing at either end, when tabbing to them, and while selected; Always shows all; Off shows none
- [ ] Dotted lines follow when collapsing and expanding; hidden when either end is collapsed
- [ ] Search highlights and dims; Enter jumps through matches with the fish (Sparkle)
- [ ] Click a person: details panel shows Reports to / Deputy to / Also reports to as visible links that jump; photo click enlarges; Esc closes
- [ ] Someone whose parent is a deputy is drawn under that unit card; their details say they report to the deputy
- [ ] Search × clears the search and the highlight
- [ ] Fit is centered both ways in your template
- [ ] Collapse and expand with the − / +N buttons
- [ ] Drag pans; Ctrl/⌘ + scroll zooms; Fit works
- [ ] `#pko=td` in the URL opens on the Technical Director
- [ ] Clicking people doesn't change the address; reloading after clicking still fits the whole chart
- [ ] Details panel **Copy link** copies a working deep link (on https; on http it says to right-click)
- [ ] Sad mode: beige, a snark line, no motion; remembered after reload
- [ ] With the OS set to reduce motion: no motion and no snark line
- [ ] Narrow (phone): indented list; search still jumps
- [ ] JavaScript off: plain nested list with deputies shown
- [ ] Controls tab: hiding each control removes it
- [ ] Logged in as a manager with a broken file: problems listed above the chart; logged out: not listed
- [ ] Two Pecking Order modules on one page work independently

## 0.2.0 layout
- [ ] `side-left` puts a staff card on the left of its boss; `side` / `side-right` on the right; both at once works
- [ ] `assistant-left` / `assistant-right` go where asked; plain `assistant` fills the shorter side in order
- [ ] The trunk stops at the last assistant row (no line dangling below when there are no other reports)
- [ ] Levels open at start = 2: only the top two levels show; + opens more; search Enter and `#pko=` open what they need
- [ ] Stack rows wider than = 3 with a boss of 5+ reports: they stack two per row down the trunk; set 0: one wide row again
- [ ] Mobile layout = Keep the chart: on a phone, drag moves and pinch zooms; = Indented list: switches at the chosen breakpoint
- [ ] Keyboard: Tab into the chart, then arrows move (↑ boss, ↓ first report, ← → neighbors, Home top); folded branches open; the chart pans to keep focus in view; Enter opens details

## 1.0.2
Use `testkit/pecking-order-teams.json` (the source zip): Director with deputies and a Support team, a Chief of Staff with an Executive Staff box beside them, and an Operations Lead whose four groups stack 2 × 2.

**Teams and card layout**
- [ ] The Director's card: deputies two per row, then a **SUPPORT TEAM** heading with its email (a working mailto link), then its two people two per row, then the team's description
- [ ] Click the team heading: details show the team, *Reports to* the Director, its *Members*; the Director's details list *Deputies* and *Teams*
- [ ] Click a team member: details say *Part of Support team*; Focus on this branch focuses the Director's branch
- [ ] Executive Staff: a heading-only card (no "?" person line), one column, *Executive Officer* and *Senior Advisor* shown once each with two names under them
- [ ] The line from the Chief of Staff to Executive Staff is straight across (no stray vertical lines)
- [ ] Operations Lead's four groups sit 2 × 2 on the trunk (stack = yes) with Stack rows wider than at its default 6
- [ ] Deputies = Beside and = Shared stem: the team becomes its own card with its people inside
- [ ] Left to right: teams, columns and shared titles still look right; stack is ignored
- [ ] Narrow screen / List view: everyone in one column, team heading and email kept
- [ ] Keyboard: ↓ from the team heading goes to its first person, ↑ goes back to the team, then the Director
- [ ] Search "support" finds the team; Export SVG/PNG/PDF shows the team heading, email and shared titles once (no hidden titles drawn)
- [ ] Privacy: with Contact = Registered, a guest sees the team heading without the email
- [ ] Check (module) and Studio Problems: a `team` without `deputy_of`, a team inside a team, an empty team, `columns` = 9 and `stack` = maybe each get a plain message
- [ ] Without JavaScript: the list shows the team name and its people under the Director
- [ ] Studio: **+ Team** on a leader adds a team in their card; on the team, **+ Member** adds people; the *Inside the card* section sets People per row, Share titles and Their reports, and the chart updates

## 1.0.1
**Install and updates**
- [ ] Install 1.0.1 over 1.0.0: settings kept, chart unchanged
- [ ] System → Update → Update Sites: one *Chaotic Fish Design* entry (shared with your other CFD extensions), enabled
- [ ] Pecking Order appears in System → Manage → Extensions as `mod_peckingorder`, Site
- [ ] Optional, on a throwaway site with PHP 8.1: install stops with "Pecking Order needs PHP 8.2 or later…" and nothing is installed
- [ ] After the update XML is uploaded: a test version higher than 1.0.1 shows in System → Update → Extensions and installs

**Sparkle extras** (Look tab, bottom)
- [ ] All nine switches show, all Yes on a new or upgraded module
- [ ] Rooster No: no rooster; everything else still sparkles
- [ ] School formation No: the chart appears without the swim-in
- [ ] Fish on search jumps No: search Enter (and Go to in the details panel) moves without the fish, bubbles at the end
- [ ] Sonar ping No: search matches don't ping
- [ ] Bubble trail No: closing a details panel sends no bubbles up the chain
- [ ] Reel in / cast out No: − / + folds and opens at once
- [ ] Depth shading No: all cards have the same shadow
- [ ] Tag shine and bob No: New and Help wanted tags show but don't move
- [ ] Konami fish No: ↑ ↑ ↓ ↓ ← → ← → B A does nothing, in Sparkle and in Sad mode
- [ ] Sad mode and reduced motion: still no effects, whatever the switches say

**Browse… next to File path** (Module tab, Data source = File path)
- [ ] Browse… opens the Media Manager popup with the Local drives listed (images and files)
- [ ] Opens in `files`, or in the folder of the path already in the box
- [ ] Pick a `.json` or `.csv`, click Select: the path fills in (`files/…/chart.json`), the popup closes, focus goes back to Browse…
- [ ] Check and preview the picked file shows that chart
- [ ] Pick an image or a folder, Select: a warning, the popup stays open
- [ ] Close (×) or Esc: nothing changes
- [ ] Save, reopen the module: the path is kept; the chart shows on the site
- [ ] As a user who can edit modules but not use the Media Manager: no Browse… button, typing still works

**Studio**
- [ ] Help tab: the AI prompt box shows many lines and scrolls; Copy prompt copies all of it
- [ ] Download AI example saves `pecking-order-ai-example.json`; it opens in Studio with 0 problems
- [ ] Look tab: Sparkle extras switches work like the module's, and show under *Matching module settings*

## 1.0.0
- [ ] Install over 0.7.0: settings kept, chart unchanged
- [ ] View source: the page loads `pecking-order.min.js`; with System Debug on, `pecking-order.js`
- [ ] A card with a yellow accent (`#fcc419`): avatar initials are dark and readable; the unit heading is a readable gold
- [ ] Module in a tinted section: toolbar and filter button text is readable
- [ ] Optional: run an accessibility checker (axe, WAVE, or your Accessibility Toolbar) on the chart: no contrast or list errors

## 0.7.0 fixes and extras
- [ ] Kitchen Sink: every stacked hook (Groups 1–7) touches its card at the card's middle; the trunk ends at the last hook
- [ ] Ctrl/⌘+P: no filter bar, trail or Updated line on paper; the chart and color key are there
- [ ] One top person: no Focus button on them; Focus still offered for others
- [ ] Export with dotted lines on: each dotted line is one line drawn over the cards
- [ ] Click someone: no bubbles until you close the details; then they rise up the chain
- [ ] `start_date` a week from now: **Starting soon** tag; details say "Starts …"
- [ ] `class` = `vip` on a row: `vip` is on that card in DevTools; a rule like `.pko-card.vip{outline:3px solid gold}` in your template shows (and appears in exports); `is-hit` or `pko-card` in the column are ignored
- [ ] Updated line under the chart shows the file's date; re-upload the file and it changes; Controls → hide it
- [ ] Export: "As of" is the file's date, not today
- [ ] List view button: switches to the list on a wide screen; reload keeps it; click again: chart, fitted
- [ ] Focus on someone, Copy link on someone in the branch, open it in a new tab: same branch, that person selected
- [ ] `#pko-focus=g1` in the address opens on Group 1's branch with the trail

## 0.7.0 Studio
- [ ] Open an HR-style CSV (e.g. Employee ID, First Name, Last Name, Job Title, Manager ID, Hire Date, Salary): Match your columns opens with good guesses; the summary shows 1 at the top
- [ ] Use these columns: chart appears; file is named `…-pecking-order.json` and marked unsaved; Salary isn't in Raw; dates are year-month-day
- [ ] A CSV with a manager-name column ("Hayes, Marlin") and no ID column: manager = names, IDs made from names; a manager not in the file is counted in the summary
- [ ] Reopen the same HR file: your column choices come back
- [ ] Ctrl/⌘ + click three cards: "3 people selected"; set Location and Card background, Apply: all three change; Undo puts them back
- [ ] Bulk "Move all to report to": they move; someone can't move under their own report (skipped, toast says so)
- [ ] Select branch on a group leader, then Delete N people: their reports move up to the next boss
- [ ] Duplicate: a copy appears next to the card with "(copy)"
- [ ] Sort A–Z on the Director: groups re-order by name; staff and assistants stay in their own places
- [ ] Compare with an older file: added / removed / moved / changed listed; outlined on the chart; clicking a name opens it; edit something and reopen Compare: counts update; Stop comparing clears the outlines
- [ ] Card look → CSS class field works

## 0.6.0 sparkle pack
- [ ] Hard refresh: cards swim in from the middle with a burst of fish and settle exactly into place; dotted lines fade in after
- [ ] The rooster sits on the top card and pecks every few seconds; click the top person: it hops
- [ ] Rooster: gone in Sad mode, in the phone list, in exports and prints; not shown on a focused branch
- [ ] Search "chief": hit cards ping; Enter: the fish swims, then that card pings
- [ ] Click someone deep in the chart: bubbles rise from them, then each boss up the chain
- [ ] Fold a branch with − : it winds up into the line, then folds; + casts it back out with a bounce; the button spins
- [ ] Click − twice fast: no glitch
- [ ] Deeper cards have a slightly deeper shadow; text looks exactly the same
- [ ] Give someone `start_date` from last month: **New** tag shines next to their name; details show "Started …"
- [ ] `start_date` older than the New-hire setting: no tag; setting 0: no tags at all; a date like 10/20/2026 is listed as a problem in Check (and in Studio)
- [ ] Open role with `link`: **Help wanted** tag bobs; details link opens the posting in a new tab
- [ ] `link` = `javascript:alert(1)`: dropped (no tag, no link); listed as a problem in Check
- [ ] Organization privacy = Registered: logged out, no New/Help wanted tags and no start date or link in the page source
- [ ] ↑ ↑ ↓ ↓ ← → ← → B A (click the page first, not in the search box): fish parade, shark, cards wiggle, "+30 lives"
- [ ] Same in Sad mode: one tired fish and "…no."
- [ ] OS reduce motion: no intro, pings, bubbles, reeling or parade; Konami shows the message only
- [ ] Sad mode: tags stay but don't move; two new snark lines can appear
- [ ] PDF export: New and Help wanted tags are real text (select them); no rooster
- [ ] Studio: Start date (date picker) and Job posting link fields; Look → New-hire tag for

## 0.5.0 finding your way
- [ ] Details panel for someone with reports: **Focus on this branch** shows only their branch, fitted; trail above reads Whole chart › … › them
- [ ] Click a step in the trail: focus moves up; **Whole chart** returns everything
- [ ] Focused: search for someone outside the branch and press Enter: whole chart returns, they're selected
- [ ] Someone with no reports (and deputies only): no Focus button
- [ ] Filters bar: Department, Location and Role lists list the file's values; Open roles shows if anyone is vacant
- [ ] Pick a department: other cards dim, the count says how many match; inside a unit card, non-matching deputies dim
- [ ] Two filters at once narrow further; **Clear filters** brings everything back
- [ ] With a branch folded, a filter that matches someone inside it opens it
- [ ] Logged out (Place = Registered): no Location list
- [ ] Controls → Filters = Hide: no filter bar (a color key still shows, not clickable)
- [ ] Look → Color key with 2–3 lines: swatches and labels above the chart; clicking one filters to that color; a bad line is skipped
- [ ] Export with a key, a filter and a focus: the file has the key, the trail and the dimming
- [ ] Deputies = Beside: deputy cards in the leader's left column on a double line; a deputy with placement `side-right` goes right
- [ ] Deputies = Shared stem: deputy cards on the line under the leader (double line), reports below; fold the branch and the deputies stay
- [ ] `deputy_style` on one leader's row overrides the chart setting for that leader only
- [ ] Chart direction = Left to right: boss at left, staff above/below, assistants above/below the line, teams in a column; Fit centers it
- [ ] Left to right with each deputy style; folding works; dotted lines follow
- [ ] Left to right keys: → first report, ← boss, ↑ ↓ neighbors
- [ ] Left to right on a phone: indented list as before
- [ ] Staff column lines are one continuous line (both directions)
- [ ] Studio: Look tab Chart direction, Deputies, Color key, Filters preview; Edit tab "This leader's deputies" overrides

## 0.4.0 export
- [ ] Export tab defaults: Export button for = Public; the button shows for a logged-out visitor
- [ ] Export button for = Registered: gone when logged out, back when logged in; Hidden: gone for everyone
- [ ] Search, zoom and the Sad switch all hidden but export allowed: the bar still shows, with just Export
- [ ] **SVG drawing** downloads `org-chart.svg`; it opens in a browser (and Inkscape/Illustrator if you have them) with photos
- [ ] **PNG image** downloads a sharp image in your template's font
- [ ] **PDF** downloads one Letter page (landscape for the sample); text can be selected and searched; photos show
- [ ] **Print** opens the print dialog with only the chart, fitted to one page
- [ ] Fold a branch: the menu offers **Include**; *As shown* leaves it out, *Everything* includes it, and the chart on screen stays folded
- [ ] Nothing folded: **Include** isn't shown
- [ ] Title, 'As of' date, File name, Paper = A4 and Orientation = Portrait all show up in the PDF (and Print)
- [ ] Search for someone and click a person, then export: no highlight, dimming or selection in the file; the screen keeps them
- [ ] Sad mode: the export is beige with gray photos; Sparkle: no animation caught mid-way
- [ ] Logged out with Contact = Registered: no email or phone in any export (open the SVG in a text editor to check)
- [ ] Give someone a name in another script (e.g. 王小明): the PDF still works (as a picture; text not selectable)
- [ ] Phone width (list mode): Export still gives the full chart; the page stays in list mode
- [ ] Ctrl/⌘+P on the page: the print preview shows the whole chart on the page, not the panel; after closing, the page is unchanged
- [ ] Ctrl/⌘+P with the Export button Hidden: same
- [ ] Language override on `MOD_PECKINGORDER_W_EXPORT` changes the button
- [ ] Studio: Export in the toolbar works; Look tab Export settings change the files; the settings text lists them
- [ ] Edge, Chrome and Firefox: each format downloads (Firefox may ask where to save)

## 0.3.0 privacy and data
- [ ] Data source switch shows one field at a time; the chosen one is used; an old module that only had a path still works after saving
- [ ] Privacy defaults: logged out, no email/phone/office/location anywhere (cards, details panel, **page source**); logged in, they appear
- [ ] Set Organization to Hidden: roles, department and description disappear for everyone
- [ ] Set Photo to Registered: logged out shows initials, and no photo address is in the page source
- [ ] A column the chart doesn't use (e.g. `salary`) never appears in the page source
- [ ] Data tools with the file in `files/`: Check warns it's downloadable; Lock this folder refuses (main folder) with a clear message
- [ ] Move it to `files/orgcharts/`, Data source → File path, save: Lock this folder works; the direct file address now gives 403; the chart still shows; Check and Open in Studio still work
- [ ] Lock refuses a folder holding other file types, and one with its own .htaccess
- [ ] Language override on `MOD_PECKINGORDER_W_REPORTS_TO` (e.g. "Answers to") changes the details panel; overriding `MOD_PECKINGORDER_SAD_3` changes that snark line
- [ ] ShrinkRay on: a photo under `/images` with copies loads a `--333.webp` copy on the card (check DevTools Network); stale copies (original newer) are ignored
- [ ] Chaos Loupe on: clicking the photo in details opens Loupe at the large copy with name · title caption; the panel comes back when Loupe closes
- [ ] Chaos Loupe off: the photo enlarges inside the panel

## 0.2.1 colors
- [ ] `background` = `rgba(5,181,195,.35)` on a card: readable text; contrast measured against the panel behind it
- [ ] `background` = `var(--your-template-color)`: card uses your template's color with readable text
- [ ] `var(--not-defined, #1b1b2b)`: the fallback is used
- [ ] Module Card background accepts `var(--…)` and rgba

## Studio
- [ ] Edge or Chrome: Open a JSON file, edit, Save writes back to the same file (check the file on disk)
- [ ] Firefox: Open, edit, Save downloads a copy
- [ ] Save as CSV, then reopen the CSV: same chart
- [ ] Add report, side, assistant and deputy; ← Earlier / Later →; Delete moves reports up
- [ ] Drag a person onto someone else: the reporting line changes; dropping on a deputy goes to their leader; dropping onto your own report is refused
- [ ] Card look: width widens the card; background recolors it with readable text; contrast readout updates as you pick
- [ ] Pick a failing text color (e.g. #999 on #fff): readout and Problems say it's overridden, with the ratio; the card uses a readable color
- [ ] Look tab Card background and Card text color apply to cards without their own
- [ ] ← Left / Right → on side and assistant cards
- [ ] Card look accepts `var(--…)`; the readout notes it's used as-is on the site
- [ ] Look: Levels open at start and Stack rows wider than preview correctly
- [ ] Undo and redo (buttons and Ctrl+Z / Ctrl+Shift+Z)
- [ ] Set someone's Reports to a deputy: they stay visible under the unit card
- [ ] Go to picker reaches everyone, including anyone not drawn
- [ ] Rename an id: references follow; an invalid or duplicate id is refused
- [ ] Problems tab: count badge; clicking jumps to the card
- [ ] Raw tab: edit the JSON, Apply, Undo
- [ ] Look tab: changes preview; the settings text matches the module's labels
- [ ] Close the tab with unsaved changes, reopen: draft banner
- [ ] Help tab: Copy prompt works
- [ ] Works from a local file with no network
