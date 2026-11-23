# Pecking Order

An interactive org chart for Joomla, built from a CSV or JSON file. By [Chaotic Fish Design](https://chaoticfishdesign.com). GPL v2 or later.

- Search, pan, zoom, fit, collapse branches, and a details panel for everyone
- Unit cards (an office or group with its leader and deputies inside), teams with their own heading and email inside a card, and a choice of how many people sit side by side in a card
- Staff cards beside a boss, assistant cards on the trunk, normal cards below
- Vacancies, dotted-line managers (drawn as dotted lines), photos, per-card accent colors
- Sparkle (on by default, with a whole sparkle pack, each effect switchable) or Sad mode; reduced-motion devices get no motion either way
- New-hire tags (`start_date`) and Help wanted tags with job links on open roles (`link`)
- **Managers** (users who can manage modules, logged in on the site itself, not just the administrator) see problems and setup notes; visitors never do.
- An indented list on narrow screens, and a plain list for visitors without JavaScript
- Filters, a color key, branch focus with a trail back up, three deputy styles, and a left-to-right layout
- **Export** to SVG, PNG or PDF, or print it fitted to one page
- **Pecking Order Studio**: a one-file editor that runs in your browser, offline

Requires Joomla 5 or 6 and PHP 8.2 or later (the installer checks and stops with a message if not). Uses the Bootstrap classes Joomla's templates already load.

**Updates:** from 1.0.1, new versions show in System → Update → Extensions (Chaotic Fish Design's update server, one *Chaotic Fish Design* entry under Update Sites for all CFD extensions). A site on 1.0.0 needs 1.0.1 installed once by hand to get it.

## Quick start

1. Install `mod_peckingorder-x.y.z.zip` (System → Install → Extensions).
2. Make your data file (see **Making the file** below) and upload it, e.g. to `files/org-chart.json`.
3. Content → Site Modules → New → **Pecking Order**. On the **Module** tab choose the **Data source** (Media Manager or File path), pick or type the file, click **Check and preview the picked file**, then set a position or assign it to a menu item and save.
4. On the **Privacy** tab, choose who sees contact details and the rest. If the chart has anything private, use **Lock this folder** in Data tools (see *Privacy*).

> If the Media Manager won't list or upload `.json` or `.csv`, add `json,csv` to **Media → Options**: *Allowed Extensions* and *Document Extensions* (and *Legal MIME Types*: `application/json,text/csv`, if MIME checking is on). Or set **Data source** to **File path** and type the path, or click **Browse…** beside it: that opens the full Media Manager, with every folder listed in the *Filesystem - Local* plugin (`images` and `files` by default), not only `images`.

## Making the file

Three ways, and they all produce the same format:

- **Pecking Order Studio.** In the module's Module tab, click **Open Studio** (or open `media/mod_peckingorder/studio/pecking-order-studio.html` from the package on your own computer, with no site at all). Edit the chart, then Save.
  - **Edge / Chrome:** Save writes straight back to the file you opened.
  - **Firefox:** Save downloads a copy.
  - Studio keeps a draft in the browser, so closing the tab doesn't lose work.
  - **Open the picked file in Studio** (on the module's Module tab) loads the site's file into Studio. Saving there downloads a copy; upload it to replace the old file.
- **An HR export.** Open the CSV from your HR system in Studio: it asks which columns hold the ID, manager (ID or name), name, title and so on, guessing most of them, and makes a new Pecking Order file. Your HR file isn't changed. Studio can also **compare** two versions of a chart, and edit many cards at once (Ctrl/⌘ or Shift + click).
- **A spreadsheet.** Download the blank template or the sample CSV from the Module tab and fill it in.
- **An AI tool.** Studio's **Help** tab has a ready-made prompt for turning a PDF or image of a chart into a file. Attach the chart and `pecking-order-ai-example.json` (in `media/mod_peckingorder/samples/`, or **Download AI example** in Studio's Help tab). The AI also lists its guesses and suggests matching settings. Load the result into Studio and check the **Problems** tab.

### Columns

| Column | What it does |
|---|---|
| `id` | **Required.** A unique short name; other rows point at it. Letters, numbers, `-`, `_`. |
| `parent` | The `id` this person reports to. Empty for the top of the chart. |
| `unit` | On a unit's leader only. Makes a unit card with this heading ("Office", "Group 3"). A row with a `unit` but no `name` or `title` is just the heading with its people (its `deputy_of` rows) inside, like an *Executive Staff* box. |
| `name`, `title` | Shown on the card. A vacant row with no name shows "Open role". |
| `roles` | Chips under the name. Separate with `;` (in JSON, an array). |
| `deputy_of` | Makes this person that leader's deputy: inside the leader's card, beside it, or on the line under it (Look → Deputies). Give them the same `parent` too. People whose `parent` is a deputy are drawn under the leader's card. |
| `columns` | On a card's row (or a team's): how many people sit side by side inside the card, 1 to 6. `1` makes a single column, `2` pairs. Empty keeps everyone in one row (the old look). A team uses its own, or else its leader's. |
| `group_titles` | `yes` on a card's row (or a team's): people next to each other with the same title share one title, with their names under it ("Executive Officer: Ana, Ben"). Screen readers still hear each person's title. |
| `stack` | On a leader's row: `yes` stacks their reports two per row down the trunk (a 2 × 2 block for four groups), `no` never does. Empty uses *Stack rows wider than*. Top-to-bottom charts only. |
| `deputy_style` | On a leader's row: `inside`, `beside` or `stem`, overriding Look → Deputies for that leader's deputies. |
| `placement` | `side` = staff column beside the boss (right; `side-left` / `side-right` to choose). `assistant` = on the trunk below the boss (`assistant-left` / `assistant-right` to choose; plain `assistant` picks the shorter side). `team` = a section inside the `deputy_of` leader's card, with its own heading (`name`) and clickable `email`; its people get `deputy_of` = the team's `id`. Empty = normal card below. |
| `vacant` | `1` / `true` for an open role. |
| `description` | On unit cards and teams (if *Unit descriptions on cards* is on) and in the details panel. |
| `also_reports_to` | Dotted-line managers by `id`, separated by `;`. Drawn as dotted lines (see *Dotted-line managers*) and listed in the details panel. |
| `department`, `office`, `location`, `email`, `phone` | Details panel. |
| `photo` | Image path from the site root (`images/org/pat.jpg`) or a full URL. Initials otherwise. |
| `accent` | Card color, e.g. `#7b4fd6`. Deputies use their leader's. |
| `width` | Card width in px (120 to 900). Empty uses the **Card width** setting. Handy for a wide unit card. |
| `background` | Card background: hex, `rgb()`/`rgba()`, `hsl()`, a color name, or `var(--name)` (works when your template defines it; used as typed, optionally `var(--name, fallback)`). Text color is picked automatically to pass WCAG AA, measured against what the card really looks like. |
| `start_date` | When someone started, as year-month-day (`2026-11-05`). Recent starters get a **New** tag and future starters a **Starting soon** tag (Look → New-hire tag for). |
| `link` | On an open role: the job posting's address (web address, `mailto:` or site path). Adds a **Help wanted** tag and a "See the job posting" link in the details. |
| `class` | Your own CSS class names for the card (space-separated), to style in your template. Names starting `pko-` or `is-` are ignored. Exports pick up your styling too. |
| `color` | Your own text color for a card with a `background`. Used only if it passes AA (4.5:1); otherwise the automatic color is used and the problem list says so. |

Any other column is kept and ignored. **Row order sets left-to-right order** among people with the same boss, and the order of deputies and teams inside a card.

**A card with a team.** The Director's card with two deputies and a Support team under them, two people per row:

```csv
id,parent,unit,name,title,email,deputy_of,placement,columns
dir,,Office of the Director,Pat Lead,Director,,,,2
dd1,dir,,Sam One,Deputy Director,,dir,,
dd2,dir,,Alex Two,Deputy Director,,dir,,
support,dir,,Support team,,support@example.org,dir,team,
sup1,support,,Jo Help,Support Specialist,,support,,
sup2,support,,Lee Help,Support Specialist,,support,,
```

**A heading-only box beside a staff card.** A Chief of Staff to the right of the Director, and an Executive Staff box to the right of them, one column, shared titles:

```csv
id,parent,unit,name,title,deputy_of,placement,columns,group_titles
cos,dir,,Chris Staff,Chief of Staff,,side-right,,
exec,cos,Executive Staff,,,,side-right,1,yes
ex1,exec,,Ana One,Executive Officer,exec,,,
ex2,exec,,Ben Two,Executive Officer,exec,,,
ex3,exec,,Cy Three,Protocol,exec,,,
```

**JSON** can be a flat array of rows (each with `parent`) or nested, with `children` arrays. Arrays are fine for `roles` and `also_reports_to`, and `true` is fine for `vacant`. See `media/mod_peckingorder/samples/`.

### Problems the chart works around

Missing `parent` or `deputy_of` (the card goes to the top), reporting loops (broken at the top), duplicate ids (the later row is skipped), an unknown `placement` (shown as a normal card), and reports under staff or assistant cards (shown only in details for now). Managers see these listed above the chart; visitors never do. Studio's **Problems** tab and the module's **Check** button show the same list.

## Settings

**Module** (the data settings)
- **Data source:** Media Manager or File path; only the chosen field shows (if it's empty, the other is used).
- **Chart file / File path:** the CSV or JSON file.
- **Data tools:** templates, Studio, check and preview.
- **Unit descriptions on cards.**
- **Show data problems to managers.**

**Look**
- **Start in:** Sparkle or Sad mode.
- **Line style:** solid, dashed or dotted.
- **Line color**, **Accent color.**
- **Card background**, **Card text color:** for cards without their own; text is kept at WCAG AA contrast.
- **Card width**, **Spacing.**
- **Chart background:** default soft panel, transparent (no panel or border), or a custom color; **Panel border:** show or hide.
- **Dotted-line managers:** On hover (lines appear for whoever is pointed at, tabbed to or selected), Always, or Off.
- **Chart height:** e.g. `600px` or `70vh`.
- **Levels open at start:** 0 shows everything.
- **New-hire tag for (days):** default 90 (New for that many days after starting, Starting soon for that many days before); 0 turns both off.
- **Stack rows wider than:** long teams stack down the trunk two per row (default 6; 0 never).
- **Chart direction:** top to bottom, or left to right.
- **Deputies:** inside the leader's card, beside the leader, or shared stem (under the leader).
- **Color key:** `color = label`, one per line.
- **Mobile layout:** indented list or keep the chart; **Switch to the list below:** a Bootstrap breakpoint (sm 576, md 768, lg 992, xl 1200) or custom px, measured on the module's width.

Studio's **Look** tab previews these and prints the matching values.

**Controls**
- Search box, zoom buttons, Sparkle/Sad switch, filters, List view button, 'Updated' line, help line: each can be shown or hidden.

**Export**
- **Export button for:** an access level (default Public), or Hidden.
- **Title on exports**, **'As of' date on exports:** printed above the chart; the title is also the PDF's title.
- **File name:** without the extension.
- **Paper (PDF and Print):** US Letter or A4; **Orientation:** Automatic (landscape for a wide chart), Landscape or Portrait.

## Privacy

**Who sees which fields** (Privacy tab). Each field type gets a Joomla access level, or Hidden:

| Type | Fields | Default |
|---|---|---|
| Organization | roles, department, description, start_date, link | Public |
| Contact | email, phone (email is a `mailto:` link) | Registered |
| Place | office, location | Registered |
| Photo | photo | Public |

Name, title and unit always show. Hidden fields are removed on the server, so they never reach the visitor's browser, not even in the page source. Columns the chart doesn't use are never sent at all.

**The file itself.** The settings above protect the chart, but a CSV/JSON file in a public folder can still be downloaded by anyone who knows its address. Data tools checks this after you save:
- If the file is downloadable, it says so and offers **Lock this folder**. That writes a deny-all `.htaccess` (and a blank `index.html`) into the file's folder. Visitors get "forbidden"; the module still reads the file.
- It only locks a folder of its own: inside the site, not a main folder (`images`, `files`, `media`, …), containing nothing but CSV/JSON files, and without someone else's `.htaccess`. Put chart files in something like `files/orgcharts/` and use **Data source → File path** if the Media Manager won't browse there.
- `.htaccess` works on Apache (most hosts, including GoDaddy). On nginx, ask your host to deny the folder.
- After locking, Check and Open in Studio keep working (they use a copy read on the server).

## Photos: ShrinkRay and Chaos Loupe

- **ShrinkRay** (if enabled): photos under `/images` use its WebP copies from its output folder (`{output}/{same subfolders}/{name}--{size}.webp`), only when newer than the original. With *Size By: width* the browser picks the right size from a `srcset`. Pecking Order never makes copies itself; run ShrinkRay's batch for existing photos.
- **Chaos Loupe** (if installed): clicking the photo in a person's details opens it in Chaos Loupe at the largest copy, with name and title as the caption. The details panel steps aside while Loupe is open and comes back when it closes. Without Loupe, the panel's own click-to-enlarge is used.

## Sparkle

Sparkle mode is the default, and visitors can switch to Sad mode with the button. Everything below is decoration, never information, and it all stops for Sad mode and for devices set to reduce motion.

- **School formation:** on load, cards swim in from the middle of the chart and settle into place, with a burst of fish.
- **Sonar:** search hits ping; the one Enter jumps to pings again when the fish arrives.
- **Bubble trail:** clicking someone sends bubbles up their chain of command.
- **Reel in / cast out:** folding winds a branch back up to its line; opening casts it out with a little overshoot. The − / + button spins like a reel.
- **Depth:** deeper cards sit in deeper water (a slightly deeper, bluer shadow). Text contrast never changes.
- **The rooster** 🐓 sits on the top card (it is a pecking order) and pecks now and then. Click the top person and it hops.
- **Tags:** **New** shines on recent starters; **Help wanted** bobs on open roles that have a `link`. The tags themselves show in Sad mode too, just without the motion.
- **↑ ↑ ↓ ↓ ← → ← → B A.** Try it. Then try it in Sad mode.

None of the decoration (rooster, pings, fish, bubbles) goes into exports or prints. The tags do, as text.

**Sparkle extras** (Look tab, at the bottom; also in Studio's Look tab): each effect above has its own switch, all on by default, so the rooster can go and the rest stay. With an effect off:
- *Fish on search jumps*: the chart still moves to the person, with a small burst of bubbles.
- *Reel in / cast out*: branches fold and open at once.
- *Tag shine and bob*: the tags stay, standing still.
- *Konami fish*: the key code does nothing, in either mode.

The small bubble bursts on folding and on arrival aren't switchable; Sad mode turns them off with everything else.

## Finding your way

- **Deep links to a branch:** `#pko-focus=<id>` opens the chart focused on that branch; Copy link while focused keeps it (`#pko-focus=td&pko=sec` also selects someone).
- **List view** (button): the indented list at any width, remembered in the visitor's browser. Handy with a screen reader or a very big chart.
- **Focus on this branch** (in a person's details) shows only that person and everyone under them, with a trail above: *Whole chart › Office › Technical Director*. Click any step to go back up. Search + Enter for someone outside the branch returns to the whole chart. Focus also draws reports under staff or assistant cards, which the whole chart doesn't yet.
- **Filters:** Department, Location and Role lists and an **Open roles** button, built from the file. They only offer fields this visitor is allowed to see (Privacy tab). Cards that don't match dim; inside a unit card, non-matching people dim too. Folded branches open to show matches. Filters combine (Engineering *and* Open roles). Exports keep the dimming.
- **Color key:** list your accent colors with names in Look → Color key:
  ```
  #7b4fd6 = Engineering
  #e8590c = Customer
  ```
  Any color format works. Cards without their own accent use the chart's accent, so you can name that too. With filters on, each key color is a button that shows just those cards (deputies count with their leader's color). The key is printed on exports.
- **Deputies:** *Inside* keeps them in the leader's card. *Beside* gives them their own cards in the leader's side column on a double line (left; `placement` = `side-right` puts one on the right). This makes the chart wider, because the leader stays centered over their line. *Shared stem* puts them on the line just under the leader, before the reports; they stay visible when the branch is folded.
- **Left to right:** the chart grows sideways. Staff go above (`side-left`) and below (`side`/`side-right`), assistants above and below the line, teams in a column. Long teams already run downward, so *Stack rows wider than* is ignored. Arrow keys follow the direction. Narrow screens still get the indented list.

## Export and print

The **Export** button (above the chart) offers:

| Choice | What you get |
|---|---|
| SVG drawing | A vector file for Illustrator, Inkscape, Visio or a browser. Photos are embedded. Uses your template's font names, so another computer without those fonts shows a similar one. |
| PNG image | A picture at twice screen resolution, in your template's fonts. Good for email and slides. |
| PDF | One page, scaled to fit the paper setting. Sharp at any zoom, with real, searchable text in Helvetica stretched to your font's widths. |
| Print | The browser's print dialog with just the chart, fitted to the page. |

- **Include:** *As shown* keeps folded branches folded; *Everything* opens all of them for the file (the chart on screen doesn't change). This choice only appears when something is folded.
- **As of** on exports is the data file's last-changed date (the same date as the Updated line under the chart), so a stale chart can't look current.
- Exports show only what that visitor can see (the Privacy settings apply), with no search highlight, selection, fold buttons or animation. Sparkle or Sad mode is kept, so Sad mode exports are beige and their photos gray.
- Dotted-line managers set to *On hover* are drawn in exports; *Off* leaves them out.
- **Ctrl/⌘+P** on the page prints the whole chart fitted to the paper, not just the part showing in the panel. This works for everyone, even with the button hidden.
- PDFs use the PDF's built-in Helvetica, which covers Western European characters. If any name or title has characters it can't show (Chinese, Arabic, Cyrillic, …), the PDF is made as one high-resolution picture instead. It looks the same, but its text can't be selected.
- A photo hosted on another site may be left out of PNG and PDF files (browsers block reading other sites' images); SVG links to it instead.
- Everything happens in the visitor's browser. Nothing is uploaded, and there are no outside libraries.

## Translating or rewording the chart

All chart text (details labels, Open role, Copy link, search counts, the Export menu, the Sad mode button and lines) lives in the module's language file as `MOD_PECKINGORDER_W_…`, `MOD_PECKINGORDER_OPEN_ROLE` and `MOD_PECKINGORDER_SAD_1` to `_8`. Change them per site with **System → Language Overrides**. `{n}`, `{i}` and `{name}` are filled in. Studio stays in English.

## Accessibility

- Text on any card background meets WCAG AA (4.5:1), including the softer title and description text. Pecking Order picks dark or light text itself; a text color you set is used only when it passes.
- See-through colors are measured as they appear, blended onto the chart panel. `var(--…)` colors are used as typed; when the browser can work out the color, automatic text applies too.
- Studio shows the contrast ratio while you choose colors. Problems and the module's Check list any color that was overridden, with its ratio.
- Keyboard: everything is a real button or link; focus is visible; arrow keys move between people (↑ boss, ↓ first report, ← → neighbors, Home the top); Enter opens details; Esc closes them.
- Reduced motion is honored, and Sad mode turns motion off for anyone.
- Without JavaScript, the chart is a plain nested list.

## How it works

- PHP reads the file once and caches the parsed rows against the file's modified time and size, so a new upload shows straight away. It also cleans the data: only `.csv` / `.json` inside the site, 5 MB / 5,000 rows max, colors checked, photo paths made absolute.
- The browser builds the chart from that data with `media/mod_peckingorder/js/pecking-order.js`. Studio uses the same file, so what you edit is what Joomla shows.
- Everything is local: no CDNs, no external fonts, no tracking. It works on closed networks.
- The chart fits itself to the panel on load and keeps fitting while the page settles, until the visitor pans or zooms. **Fit** turns that back on.
- **Deep links:** `#pko=<id>` in the page URL opens the chart on that person. The details panel's **Copy link** makes one. Clicking around doesn't change the address.
- Visitors' Sparkle or Sad choice is stored in their browser's localStorage (`pko:mode`).

## For developers

`window.PeckingOrder` offers `init(root, rows, options)`, `parse(text, name)`, `parseCSV`, `parseJSON`, `toCSV`, `toJSON` and `build(rows)` (returns `{errs, byId, roots}`). Charts on the page with `data-pko-auto` start themselves from their `script.pko-data` JSON.

The source lives outside the package: `src/` holds the renderer, Studio and the AI prompt, and `build.py` builds Studio and this zip.

## Known limits (1.0.2)

- Reports under staff or assistant cards are only drawn when you focus on that person (Studio's Go to picker still reaches them). Staff cards beside a staff card (an Executive Staff box to the right of a Chief of Staff) are drawn.
- A team can't sit inside another team, and only one level of people shows inside a card: someone whose `deputy_of` is a deputy (not a team) isn't drawn inside the card.
- `stack` is ignored left to right, where reports already run in a column.
- *Beside* deputies and left/right staff make the chart wider (or taller, left to right), because each leader stays centered over their line. A *Beside* deputy on the right, in a left-hand stacked row, sits in front of the line to its leader.
- Browse only reaches folders the Media Manager knows (the *Filesystem - Local* plugin's list). A locked folder may not show there; type its path instead.
- Exports are one page; a very large chart gets small on Letter or A4 (use SVG or PNG and zoom, or print *As shown* with branches folded).
- Card shadows and the vacancy shimmer aren't in exports.
- Studio's own interface is English; the chart's text can be translated (see *Translating*).
- **Lock this folder** writes an Apache `.htaccess`; nginx hosts need a rule from the host.
- Data from Joomla custom fields is planned as a second source.
