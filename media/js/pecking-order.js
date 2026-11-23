/*! Pecking Order by Chaotic Fish Design | GPL v2 */
(function (w) {
  'use strict';

  /* Column order used for exports and the field reference. */
  const COLS = ['id', 'parent', 'unit', 'name', 'title', 'roles', 'department', 'office', 'email', 'phone', 'location', 'photo', 'description', 'deputy_of', 'also_reports_to', 'placement', 'vacant', 'accent', 'width', 'background', 'color', 'deputy_style', 'start_date', 'link', 'class', 'columns', 'group_titles', 'stack'];
  const LISTS = ['roles', 'also_reports_to'];
  const PLACEMENTS = ['', 'child', 'side', 'side-left', 'side-right', 'assistant', 'assistant-left', 'assistant-right', 'team'];
  const DEPUTY_STYLES = ['inside', 'beside', 'stem'];
  const kind = pl => pl.startsWith('side') ? 'side' : pl.startsWith('assistant') ? 'asst' : 'kids';
  const sideOf = pl => /-left$/.test(pl) ? 'l' : /-right$/.test(pl) ? 'r' : '';

  /* ---------- helpers ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const truthy = v => /^(1|y|yes|true|x)$/i.test(String(v || '').trim());
  // YYYY-MM-DD only (what Studio writes); a local date, so "today" is the visitor's today.
  const dateOf = v => { const m = String(v || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return d.getMonth() === m[2] - 1 ? d : null; };
  // Job posting links: web addresses, mailto: or site paths; never javascript: and friends.
  const safeLink = v => { v = String(v || '').trim(); return v && (/^(https?:|mailto:)/i.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v)) ? v : ''; };
  // Your own CSS classes from the class column: plain class names only, and never ours (pko-…, is-…).
  const classesOf = n => String(n.class || '').split(/[\s,]+/).filter(c => /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/.test(c) && !/^(pko-|is-)/i.test(c)).slice(0, 8);
  const split = v => String(v || '').split(/[;|]/).map(s => s.trim()).filter(Boolean);
  // Accepted color values: hex, names, rgb()/rgba()/hsl()/hsla(), and var(--name) or var(--name, fallback).
  const COLOR_FN = String.raw`(rgb|hsl)a?\([\d.,%\s/]+\)`;
  const COLOR_RE = new RegExp(String.raw`^(#[0-9a-f]{3,8}|[a-z]{3,20}|${COLOR_FN}|var\(\s*--[\w-]+\s*(,\s*(#[0-9a-f]{3,8}|[a-z]{3,20}|${COLOR_FN})\s*)?\))$`, 'i');
  const okColor = v => COLOR_RE.test(String(v || '').trim());
  const isVar = v => /^\s*var\(/i.test(String(v || ''));
  const SVGNS = 'http://www.w3.org/2000/svg';
  // A card's own heading stands in for a person: team rows, and unit rows with no name or title.
  const isHead = n => !!(n && (n._team || (n.unit && !n.name && !n.title && !truthy(n.vacant))));
  // The leader whose card someone sits in (deputies and team members climb to it).
  const leadOf = n => { let x = n; for (let i = 0; x.boss && i < 50; i++) x = x.boss; return x; };
  // A card color: your own, else the nearest leader's up the deputy chain.
  const accOf = n => { for (let x = n, i = 0; x && i < 50; x = x.boss, i++) if (okColor(x.accent)) return x.accent; return ''; };

  /* ---------- color and contrast (WCAG 2) ---------- */
  const AA = 4.5, AAA = 7, DARK = '#1b1f23', LIGHT = '#ffffff', WHITE = [255, 255, 255];
  const colorCache = new Map();
  const resetColors = () => colorCache.clear();
  // A CSS variable's value on this page (from :root, body, or the template), or its fallback.
  function resolveVar(c, depth) {
    const m = String(c).trim().match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/i);
    if (!m || depth > 6 || typeof document === 'undefined' || !document.body) return null;
    const v = getComputedStyle(document.body).getPropertyValue(m[1]).trim() || (m[2] || '').trim();
    return v ? (isVar(v) ? resolveVar(v, depth + 1) : v) : null;
  }
  // Any color → [r, g, b, a] (0–255, alpha 0–1). null if it isn't a color or the variable isn't defined.
  function rgbaOf(c) {
    c = String(c || '').trim();
    if (!c || !okColor(c)) return null;
    if (colorCache.has(c)) return colorCache.get(c);
    let out = null, v = c;
    if (isVar(c)) v = resolveVar(c, 0);
    if (v) {
      const hex = v.match(/^#([0-9a-f]{3,8})$/i);
      if (hex) {
        let h = hex[1]; if (h.length <= 4) h = h.split('').map(x => x + x).join('');
        const n = [0, 2, 4, 6].map(i => parseInt(h.slice(i, i + 2), 16));
        out = [n[0], n[1], n[2], h.length === 8 ? n[3] / 255 : 1];
      } else if (typeof document !== 'undefined' && document.body) {
        const probe = document.createElement('i'); probe.style.color = v;
        if (probe.style.color) {
          document.body.append(probe);
          const m = getComputedStyle(probe).color.match(/[\d.]+/g); probe.remove();
          if (m && m.length >= 3) out = [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1];
        }
      }
    }
    colorCache.set(c, out); return out;
  }
  // Solid [r, g, b] as the eye sees it: a see-through color blended onto what's under it (white if unknown).
  function rgbOf(c, under) {
    const x = rgbaOf(c); if (!x) return null;
    const u = under || WHITE, a = x[3];
    return [0, 1, 2].map(i => Math.round(x[i] * a + u[i] * (1 - a)));
  }
  const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
  const css = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  // Text colors for a background sitting on `under`: main text, softer text (still ≥ 4.5:1), hover tint.
  // Honors `wanted` only if it passes AA.
  function inkFor(bg, wanted, under) {
    const b = rgbOf(bg, under); if (!b) return null;
    const want = rgbOf(wanted, b);
    let ink, auto = true;
    if (want && ratio(want, b) >= AA) { ink = want; auto = false; }
    else { const d = rgbOf(DARK), l = rgbOf(LIGHT); ink = ratio(d, b) >= ratio(l, b) ? d : l; }
    let muted = ink;
    for (const t of [0.72, 0.8, 0.88]) { const m = mix(ink, b, t); if (ratio(m, b) >= AA) { muted = m; break; } }
    return {
      ink: css(ink), muted: css(muted), soft: css(mix(ink, b, 0.08)), chip: css(mix(ink, b, 0.12)), seen: css(b),
      ratio: Math.round(ratio(ink, b) * 10) / 10, auto, wantedRatio: want ? Math.round(ratio(want, b) * 10) / 10 : null
    };
  }
  // The solid color behind an element: the first non-transparent background up the page (white if none).
  function backdropOf(e) {
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if (m && m.length >= 3 && (m[3] == null || +m[3] > 0.05)) {
        const a = m[3] != null ? +m[3] : 1;
        return [0, 1, 2].map(i => Math.round(+m[i] * a + 255 * (1 - a)));
      }
    }
    return WHITE;
  }
  const reduced = () => w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- parsing ---------- */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    const clean = rows.filter(r => r.some(v => v.trim()));
    const head = (clean.shift() || []).map(h => h.trim().toLowerCase());
    return clean.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  function parseJSON(text) {
    const data = JSON.parse(String(text).replace(/^﻿/, '')), out = [];
    const norm = o => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'children').map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(';') : (v === true ? '1' : v === false ? '' : String(v ?? '').trim())]));
    const walk = (arr, parent) => arr.forEach(o => {
      if (!o || typeof o !== 'object') return;
      const r = norm(o);
      if (parent && !r.parent) r.parent = parent;
      out.push(r);
      if (Array.isArray(o.children)) walk(o.children, r.id);
    });
    walk(Array.isArray(data) ? data : (data.people || [data]), '');
    return out;
  }

  /* Either format, sniffed from the name or the first character. */
  function parse(text, name) {
    const json = /\.json$/i.test(name || '') || (!/\.csv$/i.test(name || '') && /^\s*[[{]/.test(text));
    return json ? parseJSON(text) : parseCSV(text);
  }

  /* ---------- exporting ---------- */
  const keysOf = rows => [...COLS, ...[...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => !COLS.includes(k) && k[0] !== '_')];
  function toCSV(rows) {
    const keys = keysOf(rows);
    const q = v => { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [keys.join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\n') + '\n';
  }
  function toJSON(rows) {
    const keys = keysOf(rows);
    return JSON.stringify(rows.map(r => {
      const o = {};
      keys.forEach(k => {
        let v = r[k];
        if (v == null || v === '') return;
        if (LISTS.includes(k)) v = split(v);
        else if (k === 'vacant') { if (!truthy(v)) return; v = true; }
        o[k] = v;
      });
      return o;
    }), null, 2) + '\n';
  }

  /* ---------- tree building + checks ---------- */
  function build(rows) {
    const errs = [], byId = new Map(), roots = [];
    const warn = (id, msg) => errs.push({ id, msg });
    rows.forEach((r, i) => {
      const id = String(r.id || '').trim();
      if (!id) { warn('', `Row ${i + 1} has no id, so it was skipped.`); return; }
      if (byId.has(id)) { warn(id, `Duplicate id (row ${i + 1}) was skipped.`); return; }
      byId.set(id, { ...r, id, deps: [], side: [], asst: [], kids: [], up: null, boss: null });
    });
    for (const n of byId.values()) {
      if (n.deputy_of) {
        const b = byId.get(n.deputy_of);
        if (b && b !== n) { n.boss = b; n.up = b; continue; }
        warn(n.id, `deputy_of "${n.deputy_of}" wasn't found, so it's shown as a normal card.`);
      }
      if (n.parent) {
        const p = byId.get(n.parent);
        if (p && p !== n) n.up = p;
        else warn(n.id, `parent "${n.parent}" wasn't found, so it's shown at the top.`);
      }
    }
    for (const n of byId.values()) {
      const seen = new Set([n]);
      for (let p = n.up; p; p = p.up) {
        if (seen.has(p)) { warn(n.id, 'is part of a reporting loop, so it was moved to the top.'); n.up = null; n.boss = null; break; }
        seen.add(p);
      }
    }
    for (const n of byId.values()) {
      const pl = String(n.placement || '').toLowerCase();
      if (!PLACEMENTS.includes(pl)) warn(n.id, `placement "${n.placement}" isn't one of side, side-left, side-right, assistant, assistant-left, assistant-right or team, so it's shown as a normal card.`);
      n._pl = PLACEMENTS.includes(pl) ? pl : '';
      // A team is a section inside its leader's card, so it needs deputy_of; a team can't sit inside another team.
      if (n._pl === 'team') {
        if (!n.boss) { warn(n.id, 'is a team but has no deputy_of (the card it sits in), so it\'s shown as a normal card.'); n._pl = ''; }
        else if (String(n.boss.placement || '').trim().toLowerCase() === 'team' && n.boss.deputy_of) { warn(n.id, `is a team inside the team "${n.boss.id}", so it's shown as a person in that team.`); n._pl = ''; }
        else n._team = true;
      }
      if (!n.up) { roots.push(n); continue; }
      if (n.boss) { n.boss.deps.push(n); continue; }
      // Someone who reports to a deputy is drawn under the deputy's unit card; details still name the deputy.
      let host = n.up; for (let i = 0; host.boss && i < 50; i++) host = host.boss;
      n._host = host;
      host[kind(n._pl)].push(n);
    }
    for (const n of byId.values()) {
      const placed = !n.boss && kind(n._pl || '') !== 'kids' && n.up;
      if (placed && (n.kids.length || n.asst.length)) warn(n.id, 'is a side or assistant card with its own reports; those reports aren\'t drawn on the whole chart yet; Focus on this branch shows them.');
      if (!n.name && !n.title && !n.unit) warn(n.id, 'has no name, title or unit, so its card is empty.');
      if (n.background && !okColor(n.background)) warn(n.id, `background "${n.background}" isn't a color, so it's ignored.`);
      if (n.color && !okColor(n.color)) warn(n.id, `color "${n.color}" isn't a color, so text color is automatic.`);
      if (n.color && n.background && rgbOf(n.color) && rgbOf(n.background)) {
        const r = Math.round(ratio(rgbOf(n.color, rgbOf(n.background)), rgbOf(n.background)) * 10) / 10;
        if (r < AA) warn(n.id, `text color ${n.color} on ${n.background} is only ${r}:1 (AA needs 4.5:1), so the chart picks a readable color instead.`);
      }
      if (n.color && !n.background) warn(n.id, 'has a text color but no background; text color only applies with a background.');
      const ds = String(n.deputy_style || '').trim().toLowerCase();
      if (ds && !DEPUTY_STYLES.includes(ds)) warn(n.id, `deputy_style "${n.deputy_style}" isn't inside, beside or stem, so the chart's setting is used.`);
      n._ds = DEPUTY_STYLES.includes(ds) ? ds : '';
      if (n.start_date && !dateOf(n.start_date)) warn(n.id, `start_date "${n.start_date}" should be a date like 2026-11-05 (year-month-day), so it's ignored.`);
      if (n.link && !safeLink(n.link)) warn(n.id, `link "${n.link}" isn't a web address or site path, so it's ignored.`);
      if (n._team && !n.name && !n.title) warn(n.id, 'is a team with no name, so its heading is empty.');
      const cols = String(n.columns || '').trim();
      if (cols && !/^[1-6]$/.test(cols)) warn(n.id, `columns "${n.columns}" should be a number from 1 to 6, so it's ignored.`);
      n._cols = /^[1-6]$/.test(cols) ? +cols : 0;
      n._gt = truthy(n.group_titles);
      const st = String(n.stack || '').trim().toLowerCase();
      n._stack = /^(1|y|yes|true|on|x)$/.test(st) ? 'on' : /^(0|n|no|false|off)$/.test(st) ? 'off' : '';
      if (st && !n._stack) warn(n.id, `stack "${n.stack}" should be yes or no, so the chart's setting is used.`);
      if (n.width && !(+n.width >= 120 && +n.width <= 900)) warn(n.id, `width "${n.width}" should be a number of pixels from 120 to 900, so it's ignored.`);
      split(n.also_reports_to).forEach(a => { if (!byId.has(a)) warn(n.id, `also_reports_to "${a}" wasn't found.`); });
      n._s = [n.name, n.title, n.unit, n.roles, n.department, n.office].join(' ').toLowerCase();
    }
    for (const n of byId.values()) if (n._team && !n.deps.length) warn(n.id, 'is a team with nobody in it yet (give its people deputy_of = this id).');
    return { errs, byId, roots };
  }

  /* ---------- words (the Joomla module passes translations; these are the defaults) ---------- */
  const WORDS = {
    openRole: 'Open role', status: 'Status', department: 'Department', office: 'Office', location: 'Location',
    email: 'Email', phone: 'Phone', deputyTo: 'Deputy to', reportsTo: 'Reports to', alsoReportsTo: 'Also reports to',
    deputy: 'Deputy', deputies: 'Deputies', members: 'Members', partOf: 'Part of', teams: 'Teams', directReports: 'Direct reports', linkHere: 'Link here', copyLink: 'Copy link',
    linkCopied: 'Link copied ✓', rightClickCopy: 'Right-click to copy the link', close: 'Close',
    found: '{n} found', noOne: 'No one', nOfM: '{i} of {n}', toggle: 'Show or hide the {n} below {name}',
    sadOn: '😐 Sad mode', sadOff: '✨ Bring back the sparkle',
    exportBtn: 'Export', exportScope: 'Include', asShown: 'As shown', everything: 'Everything (all branches open)',
    svg: 'SVG drawing', png: 'PNG image', pdf: 'PDF', print: 'Print',
    exportBusy: '🎣 Reeling it in…', exportBusySad: 'Please wait.', exportDone: 'Saved {file}', exportFail: 'Couldn\'t make the file: {msg}', asOf: 'As of {date}',
    newHire: 'New', soon: 'Starting soon', started: 'Started', starts: 'Starts', updated: 'Updated {date}', listView: 'List view', helpWanted: 'Help wanted', jobLink: 'See the job posting',
    konami: '🐟 +30 lives. The school says hi.', konamiSad: '🐟 …no.',
    filter: 'Filter', allDepartments: 'All departments', allLocations: 'All locations', allRoles: 'All roles', openRoles: 'Open roles',
    clearFilters: 'Clear filters', filterCount: '{n} match', filterNone: '🐟 Nobody matches. Not even a minnow.', legend: 'Key',
    wholeChart: 'Whole chart', focusBranch: 'Focus on this branch', crumbs: 'Branch',
    sad: ['🐟 Sparkle off. It\'s very beige in here.', '🐟 Sad mode. The fish has gone to lie down.', '🐟 Nothing moves. Nothing glows. Enjoy your spreadsheet energy.', '🐟 Welcome to the beige zone. Population: you.', '🐟 The rooster has been asked to keep it down.', '🐟 No bubbles were harmed in the making of this chart.']
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

  // Sparkle extras that can be switched off one by one: "rooster, depth" or an array. Anything else is ignored.
  const FX = ['school', 'swim', 'ping', 'trail', 'reel', 'depth', 'rooster', 'konami', 'tags'];
  const fxOffOf = v => new Set((Array.isArray(v) || v instanceof Set ? [...v] : String(v || '').split(/[\s,]+/)).map(x => String(x).trim().toLowerCase()).filter(x => FX.includes(x)));

  // Legend: [{color, label}] from JSON, or lines like "#7b4fd6 = Engineering".
  function legendOf(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(x => x && okColor(x.color) && x.label);
    try { const j = JSON.parse(v); if (Array.isArray(j)) return legendOf(j); } catch (e) { /* plain lines */ }
    return String(v).split(/\r?\n/).map(l => l.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/)).filter(Boolean).map(m => ({ color: m[1], label: m[2] })).filter(x => okColor(x.color));
  }

  /* ---------- the chart ---------- */
  function init(root, rows, opts) {
    opts = Object.assign({ unitDesc: true, showErrors: true, dotted: root.dataset.dotted || 'hover', startDepth: parseInt(root.dataset.startDepth || '0', 10) || 0, wrapAt: root.dataset.wrapAt != null ? parseInt(root.dataset.wrapAt, 10) || 0 : 6, cardBg: root.dataset.cardBg || '', cardColor: root.dataset.cardColor || '', deputyStyle: root.dataset.deputyStyle || 'inside', dir: root.dataset.dir === 'right' ? 'right' : 'down',
      filters: root.dataset.filters !== '0', updated: root.dataset.updated || '', newDays: root.dataset.newDays != null && root.dataset.newDays !== '' ? Math.max(0, parseInt(root.dataset.newDays, 10) || 0) : 90, legend: legendOf(root.dataset.legend), fxOff: fxOffOf(root.dataset.fxOff), onPick: null, onDrop: null, onRender: null }, opts || {});
    const view = root.querySelector('.pko-view'), stage = root.querySelector('.pko-stage'), tree = root.querySelector('.pko-tree');
    const search = root.querySelector('.pko-search'), count = root.querySelector('.pko-count');
    const errBox = root.querySelector('.pko-errs'), sadNote = root.querySelector('.pko-sadnote'), modeBtn = root.querySelector('.pko-mode');
    const dlg = root.querySelector('.pko-dlg'), dHead = dlg && dlg.querySelector('.pko-dlg-head'), dBody = dlg && dlg.querySelector('.pko-dlg-body');
    const st = { x: 0, y: 0, s: 1 };
    // #pko-focus=<id> opens the chart focused on that branch.
    let lastRows = [], focus = decodeURIComponent((location.hash.match(/(?:^#|&)pko-focus=([^&]+)/) || [])[1] || '') || null;
    let model = { errs: [], byId: new Map(), roots: [] }, idx = 0, sel = null, hits = [], hi = -1, mode = 'sparkle', listMode = false, autoFit = true, hoverId = null;
    const links = document.createElementNS(SVGNS, 'svg'); links.setAttribute('class', 'pko-links'); links.setAttribute('aria-hidden', 'true'); stage.prepend(links);

    let underCache = null;
    const under = () => underCache || (underCache = backdropOf(view));
    let words = Object.assign({}, WORDS);
    try { const t = root.querySelector('script.pko-i18n'); if (t) Object.assign(words, JSON.parse(t.textContent)); } catch (e) { /* keep defaults */ }
    if (opts.words) Object.assign(words, opts.words);
    const W = k => words[k] != null ? words[k] : WORDS[k];
    const fx = () => mode === 'sparkle' && !reduced();
    // One sparkle extra: Sparkle mode, no reduced motion, and not switched off in the settings.
    const on = k => fx() && !opts.fxOff.has(k);
    const syncFx = () => ['depth', 'rooster', 'tags'].forEach(k => root.classList.toggle('no-fx-' + k, opts.fxOff.has(k)));
    opts.fxOff = fxOffOf(opts.fxOff); syncFx();
    // New hire: started within the last newDays days (0 turns it off).
    const daysIn = n => { const d = dateOf(n.start_date); if (!d) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((t - d) / 864e5); };
    const isNew = n => { const k = daysIn(n); return k != null && opts.newDays > 0 && k >= 0 && k <= opts.newDays; };
    // Starting soon: a start date in the future, within the same window.
    const isSoon = n => { const k = daysIn(n); return k != null && opts.newDays > 0 && k < 0 && -k <= opts.newDays; };
    const nameOf = n => truthy(n.vacant) ? (n.name || W('openRole')) : (n.name || n.title || (isHead(n) && n.unit) || '—');
    const nameLine = n => truthy(n.vacant) ? (n.name || W('openRole')) : (n.name || (isHead(n) && (n.unit || n.title)) || '—');

    /* render */
    function avatar(n, px) {
      const a = el('span', 'pko-av'); a.setAttribute('aria-hidden', 'true');
      const initials = () => { a.textContent = truthy(n.vacant) && !n.name ? '?' : (n.name || n.title || (isHead(n) && n.unit) || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(); };
      if (n.photo && !/^\s*(javascript|data|vbscript):/i.test(n.photo)) { const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = n.photo; if (n.photo_srcset) { img.srcset = n.photo_srcset; img.sizes = (px || 42) + 'px'; } img.onerror = () => { img.remove(); initials(); }; a.append(img); }
      else initials();
      return a;
    }
    function chips(list, tag) { const c = el(tag || 'span', 'pko-chips'); list.forEach(r => c.append(el('span', 'pko-chip', r))); return c; }
    function person(n, dep, shared) {
      const b = el('button', 'pko-person' + (dep ? ' pko-dep' : '') + (truthy(n.vacant) ? ' is-vacant' : ''));
      b.type = 'button'; b.dataset.id = n.id; b.setAttribute('aria-haspopup', 'dialog'); b.classList.add(...classesOf(n));
      const t = el('span', 'pko-txt');
      // A shared title is shown once above the group; each person still says it to screen readers.
      if (n.title) t.append(el('span', 'pko-title' + (shared ? ' pko-vh' : ''), n.title));
      const nm = el('span', 'pko-name', nameLine(n)); t.append(nm);
      if (isNew(n)) nm.append(' ', el('span', 'pko-new', W('newHire')));
      else if (isSoon(n)) nm.append(' ', el('span', 'pko-new is-soon', W('soon')));
      if (truthy(n.vacant) && safeLink(n.link)) nm.append(' ', el('span', 'pko-hiring', W('helpWanted')));
      const roles = split(n.roles); if (roles.length) t.append(chips(roles));
      b.append(avatar(n), t);
      return b;
    }
    const dsOf = n => n._ds || (DEPUTY_STYLES.includes(opts.deputyStyle) ? opts.deputyStyle : 'inside');
    // A team's or heading-only unit's heading: a button, so it opens its details like a person does.
    function headBtn(n) {
      const b = el('button', 'pko-person pko-headbtn', n._team ? (n.name || n.title || '—') : n.unit);
      b.type = 'button'; b.dataset.id = n.id; b.setAttribute('aria-haspopup', 'dialog'); b.classList.add(...classesOf(n));
      return b;
    }
    function teamHead(n) {
      const h = el('div', 'pko-unitname pko-teamhead'); h.append(headBtn(n));
      if (n.email) { const a = el('a', 'pko-teammail', n.email); a.href = 'mailto:' + n.email; h.append(a); }
      return h;
    }
    const titleKey = n => String(n.title || '').trim().toLowerCase();
    // A grid of people. With group_titles, neighbours with the same title share one title.
    function peopleBlock(list, cols, gt) {
      const d = el('div', 'pko-deps'); if (cols) { d.classList.add('has-cols'); d.style.setProperty('--pko-cols', cols); }
      for (let i = 0; i < list.length;) {
        const t = gt && titleKey(list[i]); let j = i + 1;
        if (t) while (j < list.length && titleKey(list[j]) === t) j++;
        if (j - i > 1) {
          const g = el('div', 'pko-role'), lab = el('span', 'pko-title pko-roletitle', list[i].title); lab.setAttribute('aria-hidden', 'true');
          g.append(lab, ...list.slice(i, j).map(x => person(x, true, true))); d.append(g);
        } else d.append(person(list[i], true));
        i = j;
      }
      return d;
    }
    // Deputies in file order: runs of people make a grid, and each team is its own section with its heading.
    function depsInto(c, n, cols, gt) {
      let run = [];
      const flush = () => { if (run.length) { c.append(peopleBlock(run, cols, gt)); run = []; } };
      n.deps.forEach(x => {
        if (!x._team) { run.push(x); return; }
        flush();
        const s = el('div', 'pko-team'); s.dataset.id = x.id; s.classList.add(...classesOf(x)); s.append(teamHead(x));
        if (x.deps.length) s.append(peopleBlock(x.deps, x._cols || cols, x._gt || gt));
        if (opts.unitDesc && x.description) s.append(el('p', 'pko-desc', x.description));
        c.append(s);
      });
      flush();
    }
    function card(n, ds) {
      const c = el('div', 'pko-card' + (n.boss ? ' is-dep' : '')); c.dataset.id = n.id; c.style.setProperty('--i', idx++); c.classList.add(...classesOf(n));
      const acc = accOf(n);
      if (acc) c.style.setProperty('--pko-a', acc);
      const w0 = +n.width; if (w0 >= 120 && w0 <= 900) { c.style.width = w0 + 'px'; c.style.minWidth = w0 + 'px'; }
      const own = okColor(n.background), bg = own ? n.background : (okColor(opts.cardBg) ? opts.cardBg : '');
      const wanted = own ? n.color : opts.cardColor;
      const ink = bg && inkFor(bg, wanted, under());
      if (ink) {
        c.classList.add('has-bg');
        [['--pko-card', bg], ['--pko-ink', ink.ink], ['--pko-muted', ink.muted], ['--pko-soft', ink.soft], ['--pko-chip', ink.chip]].forEach(([k, v]) => c.style.setProperty(k, v));
      } else if (bg && isVar(bg)) {
        // A var(--…) the page can't resolve right now: use it exactly as typed, no checks.
        c.classList.add('has-bg'); c.style.setProperty('--pko-card', bg);
        if (okColor(wanted)) { c.style.setProperty('--pko-ink', wanted); c.style.setProperty('--pko-muted', wanted); }
      }
      if (n._team) { c.classList.add('is-unit', 'is-team', 'has-head'); c.append(teamHead(n)); }
      else if (isHead(n)) { c.classList.add('is-unit', 'has-head'); const u = el('div', 'pko-unitname'); u.append(headBtn(n)); c.append(u); }
      else if (n.unit) { c.classList.add('is-unit'); c.append(el('div', 'pko-unitname', n.unit)); }
      else if (truthy(n.vacant)) c.classList.add('is-vacant');
      if (!isHead(n)) c.append(person(n, false));
      // A team's own people always sit inside its card, whatever the deputy style.
      if (n.deps.length && (n._team || (ds || 'inside') === 'inside')) { c.classList.add('has-deps'); depsInto(c, n, n._cols, n._gt); }
      if (opts.unitDesc && (n.unit || n._team) && n.description) c.append(el('p', 'pko-desc', n.description));
      return c;
    }
    // Side cards: side-left goes left, everything else right (plain "side" keeps the old behavior).
    const sidesOf = (n, ds) => {
      const d = ds === 'beside' ? n.deps : [];
      // Beside: deputies go left unless their placement says right; they come before any staff.
      return { l: [...d.filter(x => sideOf(x._pl) !== 'r'), ...n.side.filter(s => sideOf(s._pl) === 'l')], r: [...d.filter(x => sideOf(x._pl) === 'r'), ...n.side.filter(s => sideOf(s._pl) !== 'l')] };
    };
    function sideList(list, flip) {
      const ul = el('ul', 'pko-side' + (flip ? ' is-flip' : ''));
      list.forEach(s => { const li = el('li', s.boss ? 'is-dep' : null); li.append(unitEl(s, flip)); ul.append(li); });
      return ul;
    }
    // A card plus its own side cards. Inside a flipped (left-hand) column everything mirrors.
    function unitEl(n, flip) {
      const c = card(n); if (!n.side.length) return c;
      const x = el('div', 'pko-aunit' + (flip ? ' is-flip' : '')); x.append(c, sideList(n.side, flip)); return x;
    }
    // Rows of two either side of the trunk. Explicit -left/-right go where asked; the rest fill the shorter side, in order.
    function pairRows(list, cls, make) {
      const L = [], R = [];
      list.forEach(x => { const s = sideOf(x._pl || ''); (s === 'l' ? L : s === 'r' ? R : (L.length <= R.length ? L : R)).push(x); });
      const a = el('div', 'pko-asst' + (cls ? ' ' + cls : ''));
      for (let i = 0; i < Math.max(L.length, R.length); i++) {
        const row = el('div', 'pko-arow');
        [L[i], R[i]].forEach((x, j) => { const slot = el('div', 'pko-aslot' + (j ? '' : ' is-l')); if (x) slot.append(el('span', 'pko-hl'), make(x, !j)); row.append(slot); });
        a.append(row);
      }
      return a;
    }
    function below(n) { return n.side.length + n.asst.length + n.kids.length + [...n.side, ...n.asst, ...n.kids].reduce((s, x) => s + below(x), 0); }
    function node(n) {
      const li = el('li', 'pko-node'); li.dataset.id = n.id;
      const ds = dsOf(n), stemDeps = ds === 'stem' && n.deps.length;
      const top = el('div', 'pko-top'), cw = el('div', 'pko-cw'); cw.append(card(n, ds));
      if (n.asst.length || n.kids.length || stemDeps) cw.append(el('span', 'pko-fill'));
      const sd = sidesOf(n, ds);
      top.append(sd.l.length ? sideList(sd.l, true) : el('div'), cw); if (sd.r.length) top.append(sideList(sd.r, false));
      li.append(top);
      // Shared stem: deputies sit on the trunk under the leader, outside the fold, so they stay visible.
      if (stemDeps) { const d = el('div', 'pko-dstem'); if (n.deps.length > 1) d.append(el('span', 'pko-dbar')); n.deps.forEach(x => d.append(card(x))); li.append(d); }
      if (n.asst.length || n.kids.length) {
        const stem = el('div', 'pko-stem'), tog = el('button', 'pko-tog', '−');
        tog.type = 'button'; tog.dataset.count = below(n); tog.setAttribute('aria-expanded', 'true');
        tog.setAttribute('aria-label', fill(W('toggle'), { n: tog.dataset.count, name: nameOf(n) }));
        stem.append(tog); li.append(stem);
        const down = el('div', 'pko-down');
        if (n.asst.length) down.append(pairRows(n.asst, '', unitEl));
        // stack on a leader's row: yes = always two per row down the trunk, no = never; empty = the chart's setting.
        const stack = opts.dir !== 'right' && n.kids.length > 1 && (n._stack === 'on' || (n._stack !== 'off' && opts.wrapAt > 0 && n.kids.length > opts.wrapAt));
        if (stack) {
          // A long team stacks down the trunk, two per row, instead of one very wide row.
          const kids = n.kids.map(k => Object.assign(Object.create(k), { _pl: '' }));
          // Each slot holds a team's <li>, so it is a list to assistive tech, like the row it replaces.
          const st = pairRows(kids, 'is-stack', x => node(Object.getPrototypeOf(x)));
          st.querySelectorAll(':scope > .pko-arow > .pko-aslot').forEach(sl => { if (sl.querySelector(':scope > .pko-node')) sl.setAttribute('role', 'list'); });
          down.append(st);
        } else if (n.kids.length) { const ul = el('ul', 'pko-kids'); n.kids.forEach(k => ul.append(node(k))); down.append(ul); }
        li.append(down);
      }
      return li;
    }

    function load(rows, o) {
      o = o || {};
      const collapsed = o.keep ? [...tree.querySelectorAll('.pko-node.is-collapsed')].map(li => li.dataset.id) : [];
      resetColors(); underCache = null;
      model = build(rows || []); idx = 0; hits = []; hi = -1;
      if (!o.keep) { sel = null; if (search) search.value = ''; if (count) count.textContent = ''; root.classList.remove('is-searching'); }
      if (errBox) {
        errBox.replaceChildren(...model.errs.map(e => el('li', null, (e.id ? `"${e.id}" ` : '') + e.msg)));
        errBox.hidden = !opts.showErrors || !model.errs.length;
      }
      if (o.keep) root.classList.add('is-quiet');
      lastRows = rows || [];
      root.classList.toggle('is-ltr', opts.dir === 'right');
      if (focus && !model.byId.has(focus)) focus = null;
      const fr = focus && model.byId.get(focus);
      tree.replaceChildren(...(fr ? [node(fr)] : model.roots.map(node)));
      decorate();
      crumbs(); showUpdated();
      collapsed.forEach(id => { const li = tree.querySelector(`.pko-node[data-id="${CSS.escape(id)}"]`); if (li) setCollapsed(li, true); });
      if (!o.keep && opts.startDepth > 0) collapseFrom(opts.startDepth);
      buildFilters();
      if (o.keep && !o.refit) {
        if (sel && model.byId.has(sel)) markPath(model.byId.get(sel)); else sel = null;
        if (search && search.value) runSearch();
        requestAnimationFrame(() => root.classList.remove('is-quiet'));
        requestAnimationFrame(drawLinks);
      } else if (o.refit) {
        autoFit = true; requestAnimationFrame(() => root.classList.remove('is-quiet'));
        if (search && search.value) runSearch();
        requestAnimationFrame(() => { fit(); drawLinks(); });
      } else {
        autoFit = true;
        requestAnimationFrame(() => {
          fit(); drawLinks(); school();
          const h = decodeURIComponent((location.hash.match(/(?:^#|&)pko=([^&]+)/) || [])[1] || '');
          if (h && model.byId.has(h)) select(h, { center: true });
        });
      }
      if (opts.onRender) opts.onRender(model);
    }

    /* lookups */
    const personEl = id => tree.querySelector(`.pko-person[data-id="${CSS.escape(id)}"]`);
    const cardEl = n => { if (!n) return null; const p = personEl(n.id); return p ? p.closest('.pko-card') : tree.querySelector(`.pko-card[data-id="${CSS.escape(n.id)}"]`); };
    const liOf = n => tree.querySelector(`.pko-node[data-id="${CSS.escape(n.id)}"]`);

    /* pan + zoom */
    const apply = () => { stage.style.transform = `translate(${st.x}px,${st.y}px) scale(${st.s})`; };
    // Fit and center on the cards themselves, so template margins on lists can't push the chart off-center.
    function bounds() {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      tree.querySelectorAll('.pko-card, .pko-tog').forEach(c => {
        if (!c.offsetParent) return;
        const b = boxOf(c); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
      });
      return x1 === Infinity ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    function fit() {
      if (listMode) return;
      const vw = view.clientWidth, vh = view.clientHeight, b = bounds(), pad = 24;
      if (!vw || !vh || !b || !b.w || !b.h) return;
      st.s = Math.max(0.1, Math.min(1, (vw - pad * 2) / b.w, (vh - pad * 2) / b.h));
      st.x = vw / 2 - (b.x + b.w / 2) * st.s; st.y = vh / 2 - (b.y + b.h / 2) * st.s; apply();
    }
    function zoomAt(f, cx, cy) {
      autoFit = false;
      const s = Math.min(2.5, Math.max(0.2, st.s * f)), k = s / st.s;
      st.x = cx - (cx - st.x) * k; st.y = cy - (cy - st.y) * k; st.s = s; apply();
    }
    function centerOn(target) {
      if (!target) return 0;
      autoFit = false;
      if (listMode) { target.scrollIntoView({ block: 'center', behavior: fx() ? 'smooth' : 'auto' }); return fx() ? 400 : 0; }
      const vr = view.getBoundingClientRect(), r = target.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const lx = (r.left - sr.left) / st.s + r.width / st.s / 2, ly = (r.top - sr.top) / st.s + r.height / st.s / 2;
      if (st.s < 0.75) st.s = 0.75;
      st.x = vr.width / 2 - lx * st.s; st.y = vr.height / 2 - ly * st.s;
      if (fx()) { stage.style.transition = 'transform .45s ease'; setTimeout(() => { stage.style.transition = ''; }, 470); }
      apply();
      return fx() ? 470 : 0;
    }

    /* dragging: empty space pans; with onDrop, a person drags onto another person */
    let drag = null, moved = false, ghost = null, dropOn = null;
    function clearDrop() { if (dropOn) dropOn.classList.remove('is-drop'); dropOn = null; }
    const pts = new Map(); let pinch = null;
    const pinchState = () => { const [a, b] = [...pts.values()], r = view.getBoundingClientRect(); return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top }; };
    view.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && !listMode) { pinch = pinchState(); drag = null; moved = true; return; }
      if (e.button !== 0) return;
      const p = e.target.closest('.pko-person');
      if (opts.onDrop && p && !listMode) drag = { card: true, id: p.dataset.id, x: e.clientX, y: e.clientY, pid: e.pointerId };
      else if (!listMode) drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, pid: e.pointerId };
      moved = false;
    });
    view.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { const now = pinchState(); if (pinch.d > 0) zoomAt(now.d / pinch.d, now.cx, now.cy); st.x += now.cx - pinch.cx; st.y += now.cy - pinch.cy; apply(); pinch = now; return; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true; view.setPointerCapture(drag.pid);
        if (drag.card) {
          const n = model.byId.get(drag.id); root.classList.add('is-carddrag');
          ghost = el('div', 'pko-ghost', '↳ ' + nameOf(n)); document.body.append(ghost);
          const c = cardEl(n); if (c) c.classList.add('is-dragsrc');
        } else { view.classList.add('is-dragging'); autoFit = false; }
      }
      if (drag.card) {
        ghost.style.transform = `translate(${e.clientX + 12}px,${e.clientY + 10}px)`;
        const under = document.elementFromPoint(e.clientX, e.clientY), tp = under && under.closest('.pko-person');
        const tc = tp && tp.dataset.id !== drag.id ? tp.closest('.pko-card') : null;
        if (tc !== dropOn) { clearDrop(); if (tc) { dropOn = tc; dropOn.classList.add('is-drop'); dropOn.dataset.dropId = tp.dataset.id; } }
        else if (tc) tc.dataset.dropId = tp.dataset.id;
      } else { st.x = drag.sx + dx; st.y = drag.sy + dy; apply(); }
    });
    const endDrag = () => {
      if (!drag) return;
      if (drag.card && moved) {
        const target = dropOn && dropOn.dataset.dropId, src = drag.id;
        tree.querySelectorAll('.is-dragsrc').forEach(x => x.classList.remove('is-dragsrc'));
        clearDrop(); if (ghost) ghost.remove(); ghost = null; root.classList.remove('is-carddrag');
        if (target) setTimeout(() => opts.onDrop(src, target), 0);
      }
      drag = null; view.classList.remove('is-dragging');
    };
    const lift = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; endDrag(); };
    view.addEventListener('pointerup', lift); view.addEventListener('pointercancel', lift);
    view.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    view.addEventListener('wheel', e => {
      if (listMode || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); const r = view.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    const zoomBar = root.querySelector('.pko-zoom');
    if (zoomBar) zoomBar.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'fit') { autoFit = true; fit(); } else zoomAt(b.dataset.act === 'in' ? 1.2 : 1 / 1.2, view.clientWidth / 2, view.clientHeight / 2);
    });

    /* sparkle */
    function bubbles(t) {
      if (!fx() || !t) return;
      const vr = view.getBoundingClientRect(), r = t.getBoundingClientRect();
      const cx = r.left + r.width / 2 - vr.left, cy = r.top + r.height / 2 - vr.top;
      for (let i = 0; i < 9; i++) {
        const b = el('span', 'pko-bub'); view.append(b);
        const ang = (i / 9) * Math.PI * 2, d = 26 + Math.random() * 26, sz = 0.6 + Math.random() * 0.9;
        b.animate([
          { opacity: 0.9, transform: `translate(${cx - 4}px,${cy - 4}px) scale(${sz})` },
          { opacity: 0, transform: `translate(${cx - 4 + Math.cos(ang) * d}px,${cy - 4 + Math.sin(ang) * d - 20}px) scale(${sz * 1.4})` }
        ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => b.remove();
      }
    }
    function swim(fromEl, toEl) {
      if (!on('swim') || !fromEl || !toEl || fromEl === toEl) { bubbles(toEl); return; }
      const vr = view.getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
      const x0 = a.left + a.width / 2 - vr.left, y0 = a.top - vr.top, x1 = b.left + b.width / 2 - vr.left, y1 = b.top - vr.top;
      const f = el('span', 'pko-fish', '🐟'); f.setAttribute('aria-hidden', 'true'); view.append(f);
      const dir = x1 >= x0 ? -1 : 1, frames = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        frames.push({ opacity: i === 16 ? 0 : 1, transform: `translate(${x0 + (x1 - x0) * t - 13}px,${y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 3) * 12 - 30}px) scaleX(${dir})` });
      }
      f.animate(frames, { duration: 950, easing: 'ease-in-out' }).onfinish = () => { f.remove(); bubbles(toEl); };
    }

    /* ---------- sparkle pack ---------- */
    const FISH = ['🐟', '🐠', '🐡', '🐟', '🐠'];
    const inView = (stageX, stageY) => ({ x: st.x + stageX * st.s, y: st.y + stageY * st.s });
    function sprite(txt, cls) { const f = el('span', cls || 'pko-fish', txt); f.setAttribute('aria-hidden', 'true'); view.append(f); return f; }
    // Depth: deeper cards sit in deeper water (shadow only, so text contrast never changes). The real top card gets the rooster.
    function decorate() {
      const avInk = new Map(), unInk = new Map();
      tree.querySelectorAll('.pko-card').forEach(c => {
        let d = -1; for (let p = c.closest('.pko-node'); p; p = p.parentElement && p.parentElement.closest('.pko-node')) d++;
        c.style.setProperty('--d', Math.max(0, Math.min(5, d)));
        // Avatar initials sit on the accent darkened to 70%: white when it passes AA, dark when it doesn't (light accents like yellow).
        const a = getComputedStyle(c).getPropertyValue('--pko-accent').trim();
        if (!avInk.has(a)) { const v = a && rgbOf(a); const k = v && inkFor(css(v.map(x => Math.round(x * 0.7))), '#ffffff'); avInk.set(a, k ? k.ink : null); }
        if (avInk.get(a)) c.style.setProperty('--pko-avink', avInk.get(a)); else c.style.removeProperty('--pko-avink');
        // Unit heading: the accent mixed toward black (toward white on a dark card), only as far as AA needs.
        if ((c.classList.contains('is-unit') || c.querySelector('.pko-teamhead')) && !c.classList.contains('has-bg')) {
          const bg = backdropOf(c), key = a + '|' + bg.join(',');
          if (!unInk.has(key)) {
            const v = a && rgbOf(a), dark = ratio(bg, [0, 0, 0]) < ratio(bg, [255, 255, 255]);
            let out = null;
            if (v) for (let f = 0.55; f >= 0.05 && !out; f -= 0.05) { const m = v.map(x => Math.round(dark ? x + (255 - x) * (1 - f) : x * f)); if (ratio(m, bg) >= AA) out = css(m); }
            unInk.set(key, out);
          }
          if (unInk.get(key)) c.style.setProperty('--pko-unink', unInk.get(key)); else c.style.removeProperty('--pko-unink');
        }
      });
      if (!focus) model.roots.forEach(r => { const c = cardEl(r); if (c && !c.querySelector('.pko-rooster')) { const k = el('span', 'pko-rooster', '🐓'); k.setAttribute('aria-hidden', 'true'); c.append(k); } });
    }
    // School formation: cards swim in from the middle and settle into place.
    function school() {
      if (!on('school') || listMode) return;
      const cards = [...tree.querySelectorAll('.pko-card')].filter(c => c.offsetParent), b = bounds();
      if (!cards.length || !b) return;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, spread = Math.min(cards.length * 26, 900);
      cards.forEach((c, i) => {
        const p = boxOf(c), dx = cx - (p.x + p.w / 2), dy = cy - (p.y + p.h / 2), wob = (Math.random() - 0.5) * 70;
        c.animate([
          { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.15) rotate(${(Math.random() - 0.5) * 50}deg)` },
          { opacity: 1, offset: 0.55, transform: `translate(${dx * 0.35}px,${dy * 0.35 + wob}px) scale(.6)` },
          { opacity: 1, transform: 'none' }
        ], { duration: 900, delay: (i / cards.length) * spread, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'backwards' });
      });
      links.animate([{ opacity: 0 }, { opacity: 0, offset: 0.75 }, { opacity: 1 }], { duration: 900 + spread });
      const o = inView(cx, cy);
      for (let i = 0; i < 9; i++) {
        const f = sprite(FISH[i % FISH.length]), a = (i / 9) * Math.PI * 2 + Math.random() * 0.4, d = 140 + Math.random() * 120, flip = Math.cos(a) < 0 ? 1 : -1;
        f.animate([
          { opacity: 0, transform: `translate(${o.x - 12}px,${o.y - 12}px) scale(.4) scaleX(${flip})` },
          { opacity: 1, offset: 0.2, transform: `translate(${o.x - 12 + Math.cos(a) * d * 0.25}px,${o.y - 12 + Math.sin(a) * d * 0.25}px) scale(1) scaleX(${flip})` },
          { opacity: 0, transform: `translate(${o.x - 12 + Math.cos(a) * d}px,${o.y - 12 + Math.sin(a) * d}px) scale(.9) scaleX(${flip})` }
        ], { duration: 1100 + Math.random() * 400, delay: 80 + i * 30, easing: 'ease-out', fill: 'backwards' }).onfinish = () => f.remove();
      }
    }
    // Sonar: a ring pulses out from a card.
    let pingTimer = 0;
    function ping(c, delay, times) {
      if (!on('ping') || !c || !c.isConnected) return;
      const r = el('span', 'pko-ping'); r.setAttribute('aria-hidden', 'true'); c.append(r);
      r.animate([{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 950, delay: delay || 0, iterations: times || 2, easing: 'ease-out', fill: 'backwards' }).onfinish = () => r.remove();
    }
    // Bubble trail: bubbles rise from the person up their chain of command.
    function rise(c) {
      if (!c || !c.offsetParent) return;
      const vr = view.getBoundingClientRect(), r = c.getBoundingClientRect();
      for (let i = 0; i < 5; i++) {
        const b = el('span', 'pko-bub'); view.append(b);
        const x = r.left - vr.left + r.width * (0.3 + Math.random() * 0.4), y = r.top - vr.top, sz = 0.5 + Math.random() * 0.8;
        b.animate([
          { opacity: 0.85, transform: `translate(${x}px,${y}px) scale(${sz})` },
          { opacity: 0, transform: `translate(${x + (Math.random() - 0.5) * 24}px,${y - 40 - Math.random() * 40}px) scale(${sz * 1.3})` }
        ], { duration: 700 + Math.random() * 300, delay: i * 60, easing: 'ease-out', fill: 'backwards' }).onfinish = () => b.remove();
      }
    }
    function trail(n) {
      if (!on('trail') || !n) return;
      const seen = new Set(); let i = 0;
      for (let x = n; x; x = x.boss || x.up) {
        const c = cardEl(x); if (!c || seen.has(c)) continue; seen.add(c);
        const k = c.querySelector('.pko-rooster');
        setTimeout(() => { rise(c); if (k) k.animate([{ transform: 'none' }, { transform: 'translateY(-14px) rotate(-12deg)', offset: 0.4 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' }); }, i++ * 130);
      }
    }
    // Reel in / cast out: folding winds a branch back up to its line; opening casts it out with a little overshoot.
    function reel(li, tog) {
      if (li.dataset.reeling) return;
      const c = !li.classList.contains('is-collapsed'), down = li.querySelector(':scope > .pko-down');
      if (!on('reel') || !down || listMode) { setCollapsed(li, c); if (!c) bubbles(tog); return; }
      const ltr = opts.dir === 'right', away = ltr ? 'translateX(-34px) scale(.1)' : 'translateY(-34px) scale(.1)';
      const done = () => { delete li.dataset.reeling; down.style.transformOrigin = ''; };
      li.dataset.reeling = '1'; down.style.transformOrigin = ltr ? 'left center' : 'top center';
      tog.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${c ? -360 : 360}deg)` }], { duration: 450, easing: 'ease-in-out' });
      if (c) {
        down.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: away }], { duration: 380, easing: 'cubic-bezier(.5,0,.9,.5)' }).onfinish = () => { done(); setCollapsed(li, true); };
      } else {
        setCollapsed(li, false);
        down.animate([{ opacity: 0, transform: away }, { opacity: 1, offset: 0.7, transform: ltr ? 'translateX(8px) scale(1.02)' : 'translateY(8px) scale(1.02)' }, { opacity: 1, transform: 'none' }],
          { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => { done(); drawLinks(); };
        bubbles(tog);
      }
    }
    // ↑ ↑ ↓ ↓ ← → ← → B A
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kpos = 0;
    document.addEventListener('keydown', e => {
      if (opts.fxOff.has('konami') || !root.isConnected || !root.offsetParent || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
      const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? (kpos === 2 ? 2 : 1) : 0);
      if (kpos === KONAMI.length) { kpos = 0; konami(); }
    });
    function toast(msg) {
      const t = el('div', 'pko-toast', msg); t.setAttribute('role', 'status'); view.append(t);
      setTimeout(() => t.remove(), 3600);
    }
    function konami() {
      if (mode === 'sad') {
        toast(W('konamiSad'));
        if (!reduced()) { const f = sprite('🐟'), h = view.clientHeight; f.animate([{ transform: `translate(${view.clientWidth}px,${h - 60}px) scaleX(1)` }, { transform: `translate(-40px,${h - 50}px) scaleX(1)` }], { duration: 9000, easing: 'linear' }).onfinish = () => f.remove(); }
        return;
      }
      toast(W('konami'));
      if (!fx()) return;
      const W2 = view.clientWidth, H = view.clientHeight, n = 18;
      for (let i = 0; i <= n; i++) {
        const shark = i === n, f = sprite(shark ? '🦈' : FISH[i % FISH.length]);
        if (shark) f.style.fontSize = '2.6rem';
        const y = shark ? H / 2 : 40 + Math.random() * (H - 80), amp = 10 + Math.random() * 18, frames = [];
        for (let j = 0; j <= 20; j++) { const t = j / 20; frames.push({ transform: `translate(${-60 + (W2 + 120) * t}px,${y + Math.sin(t * Math.PI * 4 + i) * amp}px) scaleX(-1)` }); }
        f.animate(frames, { duration: shark ? 2600 : 2200 + Math.random() * 900, delay: shark ? 1500 : i * 70, easing: 'linear', fill: 'backwards' }).onfinish = () => {
          f.remove();
          if (shark) tree.querySelectorAll('.pko-card').forEach((c, j) => c.animate([{ transform: 'none' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'none' }], { duration: 420, delay: (j % 12) * 25 }));
        };
      }
    }

    /* dotted lines for also_reports_to */
    function boxOf(e) { let x = 0, y = 0; for (let n = e; n && n !== stage; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y, w: e.offsetWidth, h: e.offsetHeight }; }
    // Stacked rows: each hook runs from the trunk to its card's real edge, at the card's real middle (cards sit centered over wide branches).
    function hookStacks() {
      tree.querySelectorAll('.pko-asst.is-stack > .pko-arow').forEach(row => {
        let low = 0;
        row.querySelectorAll(':scope > .pko-aslot').forEach(slot => {
          const hl = slot.querySelector(':scope > .pko-hl'), c = slot.querySelector(':scope > .pko-node > .pko-top > .pko-cw > .pko-card');
          if (!hl || !c) return;
          // Layout positions (offsets), so animations and zoom never skew the measurement.
          let x = 0, y = 0, e = c;
          while (e && e !== slot) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
          if (e !== slot) return;
          y += c.offsetHeight / 2;
          const left = slot.classList.contains('is-l');
          hl.style.top = `calc(${y}px - var(--pko-lw) / 2)`;
          hl.style.width = Math.max(0, left ? slot.offsetWidth - x - c.offsetWidth : x) + 'px';
          low = Math.max(low, y);
        });
        if (low) row.style.setProperty('--pko-hly', `calc(${low}px - var(--pko-lw)/2)`);
      });
    }
    function drawLinks() {
      if (!listMode) hookStacks();
      links.replaceChildren();
      links.classList.toggle('is-always', opts.dotted === 'always');
      if (opts.dotted === 'off' || listMode) return;
      links.setAttribute('width', stage.offsetWidth); links.setAttribute('height', stage.offsetHeight);
      for (const n of model.byId.values()) {
        for (const mid of split(n.also_reports_to)) {
          const m = model.byId.get(mid), pe = personEl(n.id), me = m && personEl(m.id);
          if (!me || !pe || !me.offsetParent || !pe.offsetParent || m === n) continue;
          const a = boxOf(me.closest('.pko-card') || me), b = boxOf(pe.closest('.pko-card') || pe);
          const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
          let d, s1, s2;
          if (Math.abs(by - ay) > Math.min(a.h, b.h)) {
            const down = by > ay, sy = down ? a.y + a.h : a.y, ey = down ? b.y : b.y + b.h, k = Math.max(40, Math.abs(ey - sy) / 2) * (down ? 1 : -1);
            s1 = [ax, sy]; s2 = [bx, ey]; d = `M${ax},${sy} C${ax},${sy + k} ${bx},${ey - k} ${bx},${ey}`;
          } else {
            const right = bx > ax, sx = right ? a.x + a.w : a.x, ex = right ? b.x : b.x + b.w, k = Math.max(30, Math.abs(ex - sx) / 2) * (right ? 1 : -1);
            s1 = [sx, ay]; s2 = [ex, by]; d = `M${sx},${ay} C${sx + k},${ay} ${ex - k},${by} ${ex},${by}`;
          }
          const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'pko-dot'); g.dataset.a = m.id; g.dataset.b = n.id;
          const path = document.createElementNS(SVGNS, 'path'); path.setAttribute('d', d); g.append(path);
          [s1, s2].forEach(([cx, cy]) => { const c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 3.5); g.append(c); });
          links.append(g);
        }
      }
      markLinks();
    }
    function markLinks() {
      const on = new Set([hoverId, sel].filter(Boolean));
      links.querySelectorAll('.pko-dot').forEach(g => g.classList.toggle('is-on', on.has(g.dataset.a) || on.has(g.dataset.b)));
    }

    /* start collapsed: levels 1..depth stay open, anything deeper starts folded */
    function collapseFrom(depth) {
      const walk = (li, d) => {
        if (d >= depth && li.querySelector(':scope > .pko-stem > .pko-tog')) { setCollapsed(li, true, true); return; }
        li.querySelectorAll(':scope > .pko-down .pko-node').forEach(c => { if (c.parentElement.closest('.pko-node') === li) walk(c, d + 1); });
      };
      tree.querySelectorAll(':scope > .pko-node').forEach(li => walk(li, 1));
      drawLinks();
    }

    /* keyboard: arrows move between people, following the chart */
    const kidsOf = n => [...n.deps, ...n.side, ...n.asst, ...n.kids];
    const parentOf = n => n.boss || n._host || null;
    function focusPerson(n) {
      if (!n) return;
      for (let x = n; x; x = parentOf(x)) { const li = liOf(x); if (li && li.classList.contains('is-collapsed') && x !== n) setCollapsed(li, false); }
      const p = personEl(n.id); if (!p) return;
      p.focus({ preventScroll: true });
      if (listMode) { p.scrollIntoView({ block: 'nearest' }); return; }
      const v = view.getBoundingClientRect(), r = p.getBoundingClientRect();
      if (r.left < v.left || r.right > v.right || r.top < v.top || r.bottom > v.bottom) centerOn(p.closest('.pko-card') || p);
    }
    view.addEventListener('keydown', e => {
      const p = e.target.closest && e.target.closest('.pko-person'); if (!p || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = model.byId.get(p.dataset.id); if (!n) return;
      const up = parentOf(n), sibs = up ? kidsOf(up) : model.roots, i = sibs.indexOf(n);
      let to = null;
      const k = opts.dir !== 'right' ? e.key : ({ ArrowLeft: 'ArrowUp', ArrowRight: 'ArrowDown', ArrowUp: 'ArrowLeft', ArrowDown: 'ArrowRight' }[e.key] || e.key);
      if (k === 'ArrowUp') to = n.id === focus ? null : up;
      else if (k === 'ArrowDown') { const li = liOf(n); if (li && li.classList.contains('is-collapsed')) setCollapsed(li, false); to = kidsOf(n)[0]; }
      else if (k === 'ArrowLeft') to = n.id === focus ? null : sibs[i - 1];
      else if (k === 'ArrowRight') to = n.id === focus ? null : sibs[i + 1];
      else if (k === 'Home') to = (focus && model.byId.get(focus)) || model.roots[0];
      else return;
      e.preventDefault();
      if (to) { focusPerson(to); hoverId = to.id; markLinks(); }
    });

    /* collapse */
    function setCollapsed(li, c, quiet) {
      li.classList.toggle('is-collapsed', c);
      const t = li.querySelector(':scope > .pko-stem > .pko-tog');
      if (!t) return;
      t.setAttribute('aria-expanded', String(!c)); t.textContent = c ? '+' + t.dataset.count : '−';
      if (!quiet) drawLinks();
    }

    /* selection */
    function markPath(n) {
      tree.querySelectorAll('.is-path, .is-sel').forEach(e => e.classList.remove('is-path', 'is-sel'));
      for (let x = n; x; x = x.up) { const c = cardEl(x); if (c) c.classList.add('is-path'); }
      const p = personEl(n.id); if (p) p.classList.add('is-sel');
      markLinks();
      return !!p;
    }
    function select(id, o) {
      o = o || {};
      const n = model.byId.get(id); if (!n) return;
      if (focus && !inFocus(n)) { focus = null; load(lastRows, { keep: true, refit: true }); }
      const prev = sel && model.byId.get(sel);
      const from = prev ? cardEl(prev) : (model.roots[0] && cardEl(model.roots[0]));
      for (let x = n; x; x = x.up) { const li = liOf(x); if (li && li.classList.contains('is-collapsed')) setCollapsed(li, false); }
      sel = id;
      markPath(n);
      if (o.center) { const wait = centerOn(cardEl(n)); if (o.fish) setTimeout(() => swim(from, cardEl(n)), wait); }
    }

    /* details panel */
    function linkTo(t) { const a = el('a', 'pko-link', nameOf(t) + (t.title && t.name ? ` (${t.title})` : '')); a.href = '#pko=' + encodeURIComponent(t.id); a.dataset.go = t.id; return a; }
    const joinLinks = list => list.flatMap((t, i) => i ? [document.createTextNode(', '), linkTo(t)] : [linkTo(t)]);
    function openPanel(id) {
      const n = model.byId.get(id); if (!n || !dlg) return;
      const acc = accOf(n);
      dlg.style.setProperty('--pko-a', acc);
      dHead.classList.remove('is-big');
      const who = el('div', 'pko-dlg-who'), h = el('h3', null, nameLine(n)); h.id = (root.id || 'pko') + '-name';
      dlg.setAttribute('aria-labelledby', h.id);
      who.append(h); if (n.title) who.append(el('div', 'pko-title', n.title));
      // The card someone sits in: a team member's team, a deputy's unit; a heading's own name is already the h3.
      const ub = n.boss, unitName = isHead(n) ? (ub && !isHead(ub) ? ub.unit : '') : (n.unit || (ub && (ub._team ? nameOf(ub) : ub.unit)));
      if (unitName) who.append(el('div', 'pko-unitname', unitName));
      const x = el('button', 'pko-x', '×'); x.type = 'button'; x.setAttribute('aria-label', W('close')); x.onclick = () => dlg.close();
      dHead.replaceChildren(avatar(n, 88), who, x);
      const img = dHead.querySelector('img');
      if (img) {
        const big = n.photo_large || n.photo, loupe = loupeCfg();
        if (loupe) {
          // Chaos Loupe is on this site: hand the photo to it. Its viewer can't sit above this panel, so the panel steps aside.
          img.setAttribute(loupe.attribute || 'data-enlarge', 'true');
          img.setAttribute(loupe.highResAttribute || 'data-enlarge-src', new URL(big, location.href).href);
          img.setAttribute(loupe.captionAttribute || 'data-enlarge-caption', [nameLine(n), n.title].filter(Boolean).join(' · '));
          img.style.cursor = 'zoom-in';
          img.addEventListener('click', () => { loupeReturn = n.id; loupeOpened = false; dlg.close(); setTimeout(() => { if (!loupeOpened && loupeReturn) { loupeReturn = null; openPanel(n.id); } }, 700); });
        } else {
          img.onclick = () => { if (!dHead.classList.contains('is-big') && big !== n.photo) { img.removeAttribute('srcset'); img.src = big; } dHead.classList.toggle('is-big'); };
        }
      }
      const body = [];
      const roles = split(n.roles); if (roles.length) body.push(chips(roles, 'div'));
      if (n.description) body.push(el('p', null, n.description));
      const dl = el('dl', 'pko-dl');
      const row = (k, v) => { if (!v || (Array.isArray(v) && !v.length)) return; dl.append(el('dt', null, k)); const dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.append(...[].concat(v)); dl.append(dd); };
      const a = (href, text) => { const l = el('a', null, text); l.href = href; return l; };
      if (truthy(n.vacant) && !safeLink(n.link)) row(W('status'), W('openRole'));
      row(W('department'), n.department); row(W('office'), n.office); row(W('location'), n.location);
      const sd = dateOf(n.start_date); if (sd && isSoon(n)) row(W('starts'), sd.toLocaleDateString(document.documentElement.lang || undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
      else if (sd) row(W('started'), sd.toLocaleDateString(document.documentElement.lang || undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + (isNew(n) ? ' · ' + W('newHire') : ''));
      if (truthy(n.vacant) && safeLink(n.link)) { const j = a(safeLink(n.link), W('jobLink')); if (/^https?:/i.test(j.getAttribute('href'))) { j.target = '_blank'; j.rel = 'noopener'; } row(W('status'), [W('openRole') + ' · ', j]); }
      if (n.email) row(W('email'), a('mailto:' + n.email, n.email));
      if (n.phone) row(W('phone'), a('tel:' + n.phone.replace(/[^\d+]/g, ''), n.phone));
      if (n.boss) row(n._team ? W('reportsTo') : isHead(n.boss) ? W('partOf') : W('deputyTo'), linkTo(n.boss)); else if (n.up) row(W('reportsTo'), linkTo(n.up));
      row(W('alsoReportsTo'), joinLinks(split(n.also_reports_to).map(i => model.byId.get(i)).filter(Boolean)));
      const deps = n.deps.filter(x => !x._team), teams = n.deps.filter(x => x._team);
      if (deps.length) row(isHead(n) ? W('members') : deps.length > 1 ? W('deputies') : W('deputy'), joinLinks(deps));
      if (teams.length) row(W('teams'), joinLinks(teams));
      const direct = n.side.length + n.asst.length + n.kids.length; if (direct) row(W('directReports'), String(direct));
      if (!opts.onPick) {
        // While focused, the link keeps the branch: #pko-focus=<branch>&pko=<person>.
        const href = location.href.split('#')[0] + (focus ? '#pko-focus=' + encodeURIComponent(focus) + (n.id !== focus ? '&pko=' + encodeURIComponent(n.id) : '') : '#pko=' + encodeURIComponent(n.id));
        const share = el('a', 'pko-link', W('copyLink')); share.href = href; share.dataset.copy = href;
        row(W('linkHere'), share);
      }
      if (dl.children.length) body.push(dl);
      const ft = leadOf(n);
      const lone = !focus && model.roots.length === 1 && model.roots[0] === ft;
      if (!opts.onPick && !lone && ft.id !== focus && (ft.side.length + ft.asst.length + ft.kids.length)) {
        const fb = el('button', 'btn btn-sm btn-outline-secondary pko-focusbtn', W('focusBranch')); fb.type = 'button'; fb.dataset.focus = ft.id; body.push(fb);
      }
      dBody.replaceChildren(...body);
      if (!dlg.open) dlg.showModal();
    }
    let loupeReturn = null, loupeOpened = false, pendingTrail = null;
    if (dlg) dlg.addEventListener('close', () => { if (pendingTrail && !loupeReturn) { const t = pendingTrail; pendingTrail = null; setTimeout(() => trail(t), 120); } });
    w.addEventListener('chaosloupe:open', () => { loupeOpened = true; });
    const loupeCfg = () => (w.Joomla && typeof w.Joomla.getOptions === 'function' && w.Joomla.getOptions('plg_system_chaosloupe')) || null;
    // Reopen after Loupe's own Escape/close handling finishes, or the same keypress closes the panel again.
    w.addEventListener('chaosloupe:close', () => { if (loupeReturn) { const id = loupeReturn; loupeReturn = null; setTimeout(() => openPanel(id), 0); } });
    if (dlg) dlg.addEventListener('click', e => {
      if (e.target === dlg) { dlg.close(); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        e.preventDefault();
        const done = ok => { cp.textContent = ok ? W('linkCopied') : W('rightClickCopy'); setTimeout(() => { cp.textContent = W('copyLink'); }, 2200); };
        if (navigator.clipboard && w.isSecureContext) navigator.clipboard.writeText(cp.dataset.copy).then(() => done(true), () => done(false)); else done(false);
        return;
      }
      const fb = e.target.closest('[data-focus]');
      if (fb) { dlg.close(); focusOn(fb.dataset.focus); return; }
      const go = e.target.closest('[data-go]'); if (!go) return;
      e.preventDefault(); dlg.close(); select(go.dataset.go, { center: true, fish: true }); openPanel(go.dataset.go);
    });

    /* clicks in the chart */
    view.addEventListener('click', e => {
      const tog = e.target.closest('.pko-tog');
      if (tog) { reel(tog.closest('.pko-node'), tog); return; }
      const p = e.target.closest('.pko-person'); if (!p) return;
      select(p.dataset.id);
      // The trail would rise behind the details panel, so it waits until the panel closes.
      if (opts.onPick) { trail(model.byId.get(p.dataset.id)); opts.onPick(p.dataset.id); } else { pendingTrail = model.byId.get(p.dataset.id); openPanel(p.dataset.id); }
    });

    /* search */
    function runSearch() {
      const q = search.value.trim().toLowerCase();
      tree.querySelectorAll('.is-hit').forEach(e => e.classList.remove('is-hit'));
      root.classList.toggle('is-searching', !!q);
      hits = q ? [...model.byId.values()].filter(n => n._s.includes(q)) : []; hi = -1;
      hits.forEach(n => { const c = cardEl(n); if (c) c.classList.add('is-hit'); const p = personEl(n.id); if (p) p.classList.add('is-hit'); });
      count.textContent = q ? (hits.length ? fill(W('found'), { n: hits.length }) : W('noOne')) : '';
      syncClear();
      clearTimeout(pingTimer);
      if (q.length >= 2 && hits.length) pingTimer = setTimeout(() => [...new Set(hits.map(cardEl).filter(Boolean))].slice(0, 30).forEach((c, i) => ping(c, i * 40)), 280);
    }
    const clearBtn = root.querySelector('.pko-clear');
    const syncClear = () => { if (clearBtn) clearBtn.hidden = !search.value; };
    if (clearBtn) clearBtn.addEventListener('click', () => { search.value = ''; runSearch(); search.focus(); });
    if (search) {
      search.addEventListener('input', runSearch);
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') { search.value = ''; runSearch(); return; }
        if (e.key !== 'Enter' || !hits.length) return;
        e.preventDefault(); hi = (hi + 1) % hits.length;
        select(hits[hi].id, { center: true, fish: true });
        const hc = cardEl(hits[hi]); if (hc) setTimeout(() => ping(hc, 0, 3), on('swim') ? 950 : 0);
        if (opts.onPick) opts.onPick(hits[hi].id);
        count.textContent = fill(W('nOfM'), { i: hi + 1, n: hits.length });
      });
    }

    /* sparkle / sad */
    const sadLines = [].concat(W('sad')).filter(Boolean);
    function setMode(m, save) {
      mode = m === 'sad' ? 'sad' : 'sparkle';
      root.classList.toggle('is-sparkle', mode === 'sparkle'); root.classList.toggle('is-sad', mode === 'sad');
      if (sadNote) { sadNote.hidden = mode !== 'sad'; if (mode === 'sad') sadNote.textContent = sadLines.length ? sadLines[Math.floor(Math.random() * sadLines.length)] : ''; }
      if (modeBtn) { modeBtn.textContent = mode === 'sad' ? W('sadOff') : W('sadOn'); modeBtn.setAttribute('aria-pressed', String(mode === 'sad')); }
      if (save) { try { localStorage.setItem('pko:mode', mode); } catch (e) { /* storage blocked */ } }
    }
    if (modeBtn) modeBtn.addEventListener('click', () => setMode(mode === 'sad' ? 'sparkle' : 'sad', true));
    let saved = null; try { saved = localStorage.getItem('pko:mode'); } catch (e) { /* storage blocked */ }
    setMode(saved || root.dataset.mode || 'sparkle', false);

    /* narrow screens → list */
    const listAt = parseInt(root.dataset.listAt || '640', 10);
    // List view button: the visitor can ask for the list at any width (remembered in this browser).
    let listForced = false; try { listForced = localStorage.getItem('pko:list') === '1'; } catch (e) { /* storage blocked */ }
    function syncList() {
      const l = listForced || root.clientWidth < listAt;
      if (listBtn) listBtn.setAttribute('aria-pressed', String(listForced));
      if (l !== listMode) { listMode = l; root.classList.toggle('is-list', l); if (!l) { autoFit = true; requestAnimationFrame(fit); } drawLinks(); }
    }
    let listBtn = null;
    if (root.dataset.listToggle === '1' && root.querySelector('.pko-bar')) {
      listBtn = el('button', 'btn btn-sm btn-outline-secondary pko-listbtn', W('listView')); listBtn.type = 'button';
      const m = root.querySelector('.pko-mode'); if (m) m.before(listBtn); else root.querySelector('.pko-bar').append(listBtn);
      listBtn.addEventListener('click', () => { listForced = !listForced; try { localStorage.setItem('pko:list', listForced ? '1' : '0'); } catch (e) { /* storage blocked */ } syncList(); });
    }
    new ResizeObserver(syncList).observe(root);
    // Keep fitting while fonts, images and the template settle, until the visitor moves the chart themselves.
    const settle = new ResizeObserver(() => { if (autoFit && !listMode) fit(); drawLinks(); });
    settle.observe(view); settle.observe(tree);
    w.addEventListener('load', () => { if (autoFit) fit(); drawLinks(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (autoFit) fit(); drawLinks(); });
    view.addEventListener('pointerover', e => { const p = e.target.closest('.pko-person'); const id = p ? p.dataset.id : null; if (id !== hoverId) { hoverId = id; markLinks(); } });
    view.addEventListener('pointerleave', () => { hoverId = null; markLinks(); });
    view.addEventListener('focusin', e => { const p = e.target.closest('.pko-person'); hoverId = p ? p.dataset.id : null; markLinks(); });
    listMode = listForced || root.clientWidth < listAt; root.classList.toggle('is-list', listMode);
    if (listBtn) listBtn.setAttribute('aria-pressed', String(listForced));

    /* branch focus: draw one person's branch, with a trail back up */
    function inFocus(n) { const f = focus && model.byId.get(focus); if (!f) return true; for (let x = n; x; x = x.boss || x._host || null) if (x === f || x.boss === f) return true; return false; }
    function focusOn(id) {
      const n = id && model.byId.get(id);
      focus = n ? leadOf(n).id : null;
      load(lastRows, { keep: true, refit: true });
      const f = crumbBox && crumbBox.querySelector('[aria-current]'); if (f) f.focus();
    }
    // "Updated" line under the chart: the data file's date, so a stale chart can't look current.
    let updBox = null;
    function showUpdated() {
      const d = dateOf(opts.updated), want = d && root.dataset.showUpdated !== '0';
      if (!want) { if (updBox) updBox.hidden = true; return; }
      if (!updBox) { updBox = el('p', 'pko-updated'); view.after(updBox); }
      updBox.textContent = fill(W('updated'), { date: d.toLocaleDateString(document.documentElement.lang || undefined, { year: 'numeric', month: 'long', day: 'numeric' }) });
      updBox.hidden = false;
    }
    let crumbBox = null;
    function crumbs() {
      const f = focus && model.byId.get(focus);
      if (!f) { if (crumbBox) crumbBox.hidden = true; return; }
      if (!crumbBox) {
        crumbBox = el('nav', 'pko-crumbs'); crumbBox.setAttribute('aria-label', W('crumbs'));
        crumbBox.addEventListener('click', e => { const b = e.target.closest('[data-focus]'); if (b) focusOn(b.dataset.focus); });
        view.before(crumbBox);
      }
      const chain = []; for (let x = f; x; x = x.boss || x._host || null) chain.unshift(x);
      const ol = el('ol');
      const item = (label, id, cur) => { const li = el('li'); const b = el(cur ? 'span' : 'button', cur ? 'is-cur' : null, label); if (cur) { b.setAttribute('aria-current', 'location'); b.tabIndex = -1; } else { b.type = 'button'; b.dataset.focus = id; } li.append(b); ol.append(li); };
      item(W('wholeChart'), '', false);
      chain.forEach((x, i) => item(x.unit || nameOf(x), x.id, i === chain.length - 1));
      crumbBox.replaceChildren(ol); crumbBox.hidden = false;
    }

    /* filters and the color key */
    const fsel = { department: '', location: '', role: '', open: false, colors: new Set() };
    let filterBox = null;
    const baseAccent = () => getComputedStyle(root).getPropertyValue('--pko-base').trim() || '#05b5c3';
    const colorKey = c => { const v = rgbOf(c); return v ? v.join(',') : ''; };
    const accentOf = n => colorKey(accOf(n) || baseAccent());
    function matches(n) {
      return (!fsel.department || n.department === fsel.department) && (!fsel.location || n.location === fsel.location) &&
        (!fsel.role || split(n.roles).includes(fsel.role)) && (!fsel.open || truthy(n.vacant)) && (!fsel.colors.size || fsel.colors.has(accentOf(n)));
    }
    function buildFilters() {
      const ppl = [...model.byId.values()], uniq = f => [...new Set(ppl.flatMap(f).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const opt = { department: uniq(n => [n.department]), location: uniq(n => [n.location]), role: uniq(n => split(n.roles)) };
      const anyOpen = ppl.some(n => truthy(n.vacant)), legend = opts.legend || [];
      const want = opts.filters && (opt.department.length || opt.location.length || opt.role.length || anyOpen);
      if (!want && !legend.length) { if (filterBox) filterBox.hidden = true; clearFilters(true); return; }
      if (!filterBox) {
        filterBox = el('div', 'pko-filters');
        filterBox.addEventListener('change', e => { const k = e.target.dataset.f; if (k) { fsel[k] = e.target.value; applyFilters(true); } });
        filterBox.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.f === 'open') fsel.open = !fsel.open;
          else if (b.dataset.color) { const k = b.dataset.color; if (fsel.colors.has(k)) fsel.colors.delete(k); else fsel.colors.add(k); }
          else if (b.classList.contains('pko-fclear')) { clearFilters(); return; }
          applyFilters(true);
        });
        const bar = root.querySelector('.pko-bar'); if (bar) bar.after(filterBox); else view.before(filterBox);
      }
      const parts = [];
      if (want) {
        const lab = el('span', 'pko-flabel', W('filter')); parts.push(lab);
        [['department', 'allDepartments'], ['location', 'allLocations'], ['role', 'allRoles']].forEach(([k, all]) => {
          if (!opt[k].length) { fsel[k] = ''; return; }
          if (!opt[k].includes(fsel[k])) fsel[k] = '';
          const s2 = el('select', 'form-select form-select-sm pko-fsel'); s2.dataset.f = k; s2.setAttribute('aria-label', W(all));
          s2.append(new Option(W(all), ''), ...opt[k].map(v => new Option(v, v, false, v === fsel[k]))); parts.push(s2);
        });
        if (anyOpen) { const b = el('button', 'btn btn-sm btn-outline-secondary pko-fchip', W('openRoles')); b.type = 'button'; b.dataset.f = 'open'; parts.push(b); } else fsel.open = false;
      }
      if (legend.length) {
        const k = el('div', 'pko-legend'); k.setAttribute('role', 'group'); k.setAttribute('aria-label', W('legend'));
        legend.forEach(x => {
          const b = el(opts.filters ? 'button' : 'span', 'pko-key'); if (opts.filters) { b.type = 'button'; b.dataset.color = colorKey(x.color); }
          const sw = el('span', 'pko-sw'); sw.style.background = x.color; b.append(sw, x.label); k.append(b);
        });
        parts.push(k);
      }
      if (want || legend.length) { const c = el('button', 'btn btn-sm btn-link pko-fclear', W('clearFilters')); c.type = 'button'; c.hidden = true; parts.push(c, Object.assign(el('span', 'pko-fcount'), { role: 'status' })); }
      filterBox.replaceChildren(...parts); filterBox.hidden = false;
      applyFilters(false);
    }
    function clearFilters(quiet) {
      fsel.department = fsel.location = fsel.role = ''; fsel.open = false; fsel.colors.clear();
      if (filterBox && !quiet) { filterBox.querySelectorAll('select').forEach(x => { x.value = ''; }); applyFilters(true); }
      else root.classList.remove('is-filtering');
    }
    function applyFilters(reveal) {
      const on = !!(fsel.department || fsel.location || fsel.role || fsel.open || fsel.colors.size);
      root.classList.toggle('is-filtering', on);
      tree.querySelectorAll('.is-fhit, .is-fmiss').forEach(e => e.classList.remove('is-fhit', 'is-fmiss'));
      let found = 0;
      if (on) {
        for (const n of model.byId.values()) {
          const ok = matches(n), p = personEl(n.id);
          if (ok) {
            if (!inFocus(n)) continue;
            found++;
            if (reveal) for (let x = n.boss || n._host; x; x = x.boss || x._host) { const li = liOf(x); if (li && li.classList.contains('is-collapsed')) setCollapsed(li, false, true); }
          }
          if (p) { p.classList.toggle('is-fmiss', !ok); if (ok) { const c = p.closest('.pko-card'); if (c) c.classList.add('is-fhit'); } }
        }
        if (reveal) drawLinks();
      }
      if (filterBox) {
        const cb = filterBox.querySelector('.pko-fclear'), ct = filterBox.querySelector('.pko-fcount'), ob = filterBox.querySelector('[data-f="open"]');
        if (cb) cb.hidden = !on;
        if (ct) ct.textContent = on ? (found ? fill(W('filterCount'), { n: found }) : W('filterNone')) : '';
        if (ob) ob.setAttribute('aria-pressed', String(fsel.open));
        filterBox.querySelectorAll('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(fsel.colors.has(b.dataset.color))));
      }
    }

    /* export: hand a still, untransformed, fully drawn chart to fn, then put everything back.
       All synchronous, so the visitor never sees it happen. */
    function capture(o, fn) {
      o = o || {};
      root.classList.add('is-exporting');
      const undo = [];
      ['is-hit', 'is-path', 'is-sel', 'is-drop', 'is-dragsrc'].forEach(c => tree.querySelectorAll('.' + c).forEach(e => { e.classList.remove(c); undo.push(() => e.classList.add(c)); }));
      const rootCls = ['is-searching', 'is-list'].filter(c => root.classList.contains(c));
      rootCls.forEach(c => root.classList.remove(c));
      const folded = o.all ? [...tree.querySelectorAll('.pko-node.is-collapsed')] : [];
      folded.forEach(li => setCollapsed(li, false, true));
      const t0 = stage.style.transform, wasList = listMode;
      stage.style.transform = 'none'; listMode = false;
      drawLinks(); links.querySelectorAll('.pko-dot').forEach(g => g.classList.add('is-on'));
      try { return fn({ root, view, stage, tree, links, model, W }); }
      finally {
        folded.forEach(li => setCollapsed(li, true, true));
        stage.style.transform = t0; listMode = wasList;
        rootCls.forEach(c => root.classList.add(c)); undo.forEach(f => f());
        root.classList.remove('is-exporting'); drawLinks();
      }
    }

    root.classList.add('is-ready');
    load(rows);
    return { load, fit, select, setMode, capture, words: W, getMode: () => mode, fx, focus: focusOn, getFocus: () => focus, legend: () => opts.legend || [], updated: () => dateOf(opts.updated), filtering: () => root.classList.contains('is-filtering'),
      set: (k, v) => { opts[k] = k === 'legend' ? legendOf(v) : k === 'fxOff' ? fxOffOf(v) : v; if (k === 'fxOff') syncFx(); if (k === 'dotted') drawLinks(); if (k === 'updated') showUpdated(); }, getModel: () => model, getSelected: () => sel, center: id => { const n = model.byId.get(id); if (n) centerOn(cardEl(n)); } };
  }

  /* Auto-start any chart whose data is embedded as JSON (the Joomla module does this). */
  function auto() {
    document.querySelectorAll('.pko[data-pko-auto]').forEach(root => {
      if (root.pko || !root.querySelector('.pko-view')) return;
      const data = root.querySelector('script.pko-data');
      let rows = [];
      try { rows = JSON.parse(data ? data.textContent : '[]'); } catch (e) { rows = []; }
      root.pko = init(root, rows, { unitDesc: root.dataset.unitDesc !== '0', showErrors: root.dataset.showErrors === '1' });
      if (w.PeckingOrder.exporter) w.PeckingOrder.exporter.attach(root, root.pko);
    });
  }
  // The exporter is appended to this same file, so start after the whole file has run.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else Promise.resolve().then(auto);

  w.PeckingOrder = { WORDS, DEPUTY_STYLES, FX, fxOffOf, legendOf, init, parse, parseCSV, parseJSON, toCSV, toJSON, build, COLS, inkFor, okColor, resetColors, rgbOf, AA, AAA, version: '1.0.2' };
})(window);

/*! Pecking Order export: SVG, PNG, PDF and print | Chaotic Fish Design | GPL v2 */
(function (w) {
  'use strict';
  const PO = w.PeckingOrder; if (!PO) return;

  /* ---------- helpers ---------- */
  const px = v => parseFloat(v) || 0;
  const n2 = v => String(Math.round(v * 100) / 100);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cv1 = document.createElement('canvas'); cv1.width = cv1.height = 1;
  const c1 = cv1.getContext('2d', { willReadFrequently: true });
  const colors = new Map();
  // Any CSS color the browser computed (rgb, color-mix, color(srgb …), oklch …) → {r,g,b,a}, or null when invisible.
  function col(s) {
    if (!s || s === 'transparent' || s === 'none') return null;
    if (colors.has(s)) return colors.get(s);
    let v, m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) v = { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : (m[4].endsWith('%') ? px(m[4]) / 100 : +m[4]) };
    else {
      c1.clearRect(0, 0, 1, 1); c1.fillStyle = '#000'; c1.fillStyle = s; c1.fillRect(0, 0, 1, 1);
      const d = c1.getImageData(0, 0, 1, 1).data; v = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    if (!(v.a > 0.004)) v = null;
    colors.set(s, v); return v;
  }
  const fade = (c, op) => c && op < 1 ? Object.assign({}, c, { a: c.a * op }) : c;
  const rgb = c => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
  const radiusOf = (cs, wd, ht) => { const v = cs.borderTopLeftRadius.split(' ')[0]; const r = v.endsWith('%') ? px(v) / 100 * Math.min(wd, ht) : px(v); return Math.max(0, Math.min(r, wd / 2, ht / 2)); };
  const dashOf = (style, sw) => style === 'dashed' ? [sw * 3, sw * 2] : style === 'dotted' ? [0.01, sw * 2] : null;
  const mc = document.createElement('canvas').getContext('2d');
  const fontOf = t => `${t.style} ${t.weight} ${t.size}px ${t.family}`;

  /* ---------- scene: what the chart looks like, as plain shapes ---------- */
  // Reads the live chart (geometry and computed styles) and returns rects, lines, text, images and paths in chart pixels.
  function scene(chart, o) {
    o = o || {};
    return chart.capture({ all: !!o.all }, ({ root, view, stage, tree, links }) => {
      const base = stage.getBoundingClientRect(), items = [];
      const box = r => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
      const add = it => items.push(it);

      function paint(b, cs, op) {
        if (b.w <= 0 && b.h <= 0) return;
        const r = radiusOf(cs, b.w, b.h), bg = fade(col(cs.backgroundColor), op);
        if (bg && b.w > 0 && b.h > 0) add({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, r, fill: bg });
        const S = ['Top', 'Right', 'Bottom', 'Left'].map(k => {
          const s = { w: px(cs['border' + k + 'Width']), c: fade(col(cs['border' + k + 'Color']), op), s: cs['border' + k + 'Style'] };
          return s.w > 0 && s.c && s.s !== 'none' && s.s !== 'hidden' ? s : null;
        });
        if (!S.some(Boolean)) return;
        const same = S.every(s => s && s.w === S[0].w && s.s === S[0].s && rgb(s.c) === rgb(S[0].c) && s.c.a === S[0].c.a);
        const ring = (s, clip) => add({ t: 'rect', x: b.x + s.w / 2, y: b.y + s.w / 2, w: Math.max(0, b.w - s.w), h: Math.max(0, b.h - s.w), r: Math.max(0, r - s.w / 2), stroke: s.c, sw: s.w, dash: dashOf(s.s, s.w), cap: s.s === 'dotted' ? 'round' : 'butt', clip });
        if (same && b.w > S[0].w && b.h > S[0].w) { ring(S[0]); return; }
        if (r > 0) {
          // Rounded box with different sides (the card's thick accent top): stroke the rounded outline once per side, clipped to that side.
          const D = Math.min(Math.max(r, ...S.map(s => s ? s.w : 0)) + 2, b.w / 2, b.h / 2), x = b.x, y = b.y, W = b.w, H = b.h;
          const bands = [
            [[x, y], [x + W, y], [x + W - D, y + D], [x + D, y + D]],
            [[x + W, y], [x + W, y + H], [x + W - D, y + H - D], [x + W - D, y + D]],
            [[x, y + H], [x + W, y + H], [x + W - D, y + H - D], [x + D, y + H - D]],
            [[x, y], [x, y + H], [x + D, y + H - D], [x + D, y + D]]
          ];
          S.forEach((s, i) => s && ring(s, { poly: bands[i] }));
          return;
        }
        // Square box (the connector lines): each side is a straight line.
        const [T, R, B, L] = S, line = (s, x1, y1, x2, y2) => {
          // A double border (the deputy lines) becomes two thin lines.
          if (s.s === 'double') { const t = s.w / 3, h = y1 === y2; [-t, t].forEach(d => add({ t: 'line', x1: x1 + (h ? 0 : d), y1: y1 + (h ? d : 0), x2: x2 + (h ? 0 : d), y2: y2 + (h ? d : 0), stroke: s.c, sw: t, dash: null, cap: 'butt' })); return; }
          add({ t: 'line', x1, y1, x2, y2, stroke: s.c, sw: s.w, dash: dashOf(s.s, s.w), cap: s.s === 'dotted' ? 'round' : 'butt' });
        };
        if (T) line(T, b.x, b.y + T.w / 2, b.x + b.w, b.y + T.w / 2);
        if (B) line(B, b.x, b.y + b.h - B.w / 2, b.x + b.w, b.y + b.h - B.w / 2);
        if (L) line(L, b.x + L.w / 2, b.y, b.x + L.w / 2, b.y + b.h);
        if (R) line(R, b.x + b.w - R.w / 2, b.y, b.x + b.w - R.w / 2, b.y + b.h);
      }

      // ::before / ::after connectors: absolutely placed boxes with borders.
      function pseudo(e, which, op) {
        const p = getComputedStyle(e, which);
        if (!p.content || p.content === 'none' || p.content === 'normal' || p.display === 'none' || p.position !== 'absolute') return;
        let cb = e; while (cb !== stage && cb.parentElement && getComputedStyle(cb).position === 'static') cb = cb.parentElement;
        const cr = cb.getBoundingClientRect(), ccs = getComputedStyle(cb);
        const ox = cr.left - base.left + px(ccs.borderLeftWidth), oy = cr.top - base.top + px(ccs.borderTopWidth), W = cb.clientWidth, H = cb.clientHeight;
        let pw = px(p.width), ph = px(p.height);
        if (p.boxSizing !== 'border-box') {
          pw += px(p.paddingLeft) + px(p.paddingRight) + px(p.borderLeftWidth) + px(p.borderRightWidth);
          ph += px(p.paddingTop) + px(p.paddingBottom) + px(p.borderTopWidth) + px(p.borderBottomWidth);
        }
        const x = p.left !== 'auto' ? px(p.left) : W - px(p.right) - pw, y = p.top !== 'auto' ? px(p.top) : H - px(p.bottom) - ph;
        paint({ x: ox + x, y: oy + y, w: pw, h: ph }, p, op * (p.opacity === '' ? 1 : +p.opacity));
      }

      const rg = document.createRange();
      function text(node, cs, op) {
        const c = fade(col(cs.color), op); if (!c) return;
        const size = px(cs.fontSize), tt = cs.textTransform;
        const t0 = { style: cs.fontStyle === 'normal' ? 'normal' : 'italic', weight: cs.fontWeight, size, family: cs.fontFamily, ls: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing), fill: c };
        mc.font = fontOf(t0);
        const mt = mc.measureText('Hg'), asc = mt.fontBoundingBoxAscent || size * 0.8, desc = mt.fontBoundingBoxDescent || size * 0.2;
        let line = null;
        const flush = () => { if (line) add(Object.assign({ t: 'text', s: line.s, x: line.l - base.left, y: line.top - base.top + (line.h - asc - desc) / 2 + asc, w: line.r - line.l }, t0)); line = null; };
        const re = /\S+/g; let m;
        while ((m = re.exec(node.data))) {
          rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
          const r = rg.getClientRects()[0]; if (!r || !r.width) continue;
          const word = tt === 'uppercase' ? m[0].toUpperCase() : tt === 'lowercase' ? m[0].toLowerCase() : m[0];
          if (line && Math.abs(r.top - line.top) < size * 0.5) { line.s += ' ' + word; line.r = r.right; }
          else { flush(); line = { s: word, l: r.left, r: r.right, top: r.top, h: r.height }; }
        }
        flush();
      }

      function clipOf(e) {
        const a = e.parentElement; if (!a) return null;
        const acs = getComputedStyle(a); if (acs.overflow === 'visible') return null;
        const b = box(a.getBoundingClientRect()); return { rr: Object.assign(b, { r: radiusOf(acs, b.w, b.h) }) };
      }

      function walk(e, op) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || e.classList.contains('pko-bub') || e.classList.contains('pko-ghost') || e.classList.contains('pko-vh')) return;
        op *= +cs.opacity; if (op <= 0.01) return;
        const b = box(e.getBoundingClientRect());
        if (e.tagName === 'IMG') {
          if (e.complete && e.naturalWidth) add({ t: 'img', x: b.x, y: b.y, w: b.w, h: b.h, el: e, src: e.currentSrc || e.src, fit: cs.objectFit, gray: /grayscale/.test(cs.filter), op, clip: clipOf(e) });
          return;
        }
        if (e !== tree) paint(b, cs, op);
        pseudo(e, '::before', op);
        for (const k of e.childNodes) {
          if (k.nodeType === 3) { if (k.data.trim()) text(k, cs, op); }
          else if (k.nodeType === 1 && !(k instanceof SVGElement)) walk(k, op);
        }
        pseudo(e, '::after', op);
      }

      walk(tree, 1);
      // Dotted-line managers, drawn after the cards so each reads as one line (exports show them all at once).
      const lr = links.getBoundingClientRect(), lx = lr.left - base.left, ly = lr.top - base.top;
      links.querySelectorAll('.pko-dot').forEach(g => {
        const go = +getComputedStyle(g).opacity; if (!(go > 0.01)) return;
        g.querySelectorAll('path').forEach(p => {
          const pc = getComputedStyle(p), nums = (p.getAttribute('d').match(/[MLCZ]|-?[\d.]+(?:e-?\d+)?/gi) || []);
          const segs = []; let cur = null;
          nums.forEach(tk => { if (/[MLCZ]/i.test(tk)) { cur = { c: tk.toUpperCase(), p: [] }; segs.push(cur); } else if (cur) cur.p.push(+tk + (cur.p.length % 2 ? ly : lx)); });
          const da = pc.strokeDasharray && pc.strokeDasharray !== 'none' ? pc.strokeDasharray.split(/[\s,]+/).map(px) : null;
          add({ t: 'path', segs, stroke: fade(col(pc.stroke), go), sw: (px(pc.strokeWidth) || 1.5) * 0.8, dash: da, cap: pc.strokeLinecap });
        });
        g.querySelectorAll('circle').forEach(c => {
          const cc = getComputedStyle(c);
          add({ t: 'rect', x: +c.getAttribute('cx') + lx - +c.getAttribute('r'), y: +c.getAttribute('cy') + ly - +c.getAttribute('r'), w: 2 * c.getAttribute('r'), h: 2 * c.getAttribute('r'), r: +c.getAttribute('r'), fill: fade(col(cc.fill), go) });
        });
      });

      // Bounds, then move everything so the chart starts at the padding, under the optional heading.
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      const grow = (a, b2, c, d) => { x1 = Math.min(x1, a); y1 = Math.min(y1, b2); x2 = Math.max(x2, c); y2 = Math.max(y2, d); };
      items.forEach(it => {
        if (it.t === 'rect' || it.t === 'img') grow(it.x - (it.sw || 0), it.y - (it.sw || 0), it.x + it.w + (it.sw || 0), it.y + it.h + (it.sw || 0));
        else if (it.t === 'line') grow(Math.min(it.x1, it.x2), Math.min(it.y1, it.y2), Math.max(it.x1, it.x2), Math.max(it.y1, it.y2));
        else if (it.t === 'text') grow(it.x, it.y - it.size, it.x + it.w, it.y + it.size * 0.3);
        else if (it.t === 'path') it.segs.forEach(sg => { for (let i = 0; i < sg.p.length; i += 2) grow(sg.p[i], sg.p[i + 1], sg.p[i], sg.p[i + 1]); });
      });
      if (x1 === Infinity) { x1 = y1 = 0; x2 = y2 = 1; }
      const rcs = getComputedStyle(root), family = rcs.fontFamily, ink = col(rcs.color) || { r: 33, g: 37, b: 41, a: 1 };
      const head = [];
      const heading = (s, size, weight, fill) => { const t = { t: 'text', s, size, weight, style: 'normal', family, ls: 0, fill }; mc.font = fontOf(t); t.w = mc.measureText(s).width; head.push(t); };
      if (o.title) heading(o.title, 22, '700', ink);
      // "As of" is the data file's date when known (a chart is only as current as its file), otherwise today.
      if (o.date) heading(fill(chart.words('asOf'), { date: ((chart.updated && chart.updated()) || new Date()).toLocaleDateString(document.documentElement.lang || undefined, { year: 'numeric', month: 'long', day: 'numeric' }) }), 12, '400', Object.assign({}, ink, { a: 0.7 }));
      // A focused branch says where it sits, like the trail above the chart.
      const trail = [...root.querySelectorAll('.pko-crumbs:not([hidden]) li')].slice(1).map(li => li.textContent.trim()).filter(Boolean);
      if (trail.length) heading(trail.join(' › '), 12, '600', Object.assign({}, ink, { a: 0.8 }));
      const pad = 28; let hy = pad;
      head.forEach(t => { hy += t.size; t.x = pad; t.y = hy; hy += t.size * 0.45; });
      // The color key, as swatches and labels, wrapping to the chart's width.
      const key = (chart.legend ? chart.legend() : []).map(k => ({ c: PO.rgbOf(k.color), label: k.label })).filter(k => k.c);
      if (key.length) {
        const maxW = Math.max(420, x2 - x1); let lx = pad, ly = hy + 14;
        key.forEach(k => {
          const t = { t: 'text', s: k.label, size: 12, weight: '400', style: 'normal', family, ls: 0, fill: ink }; mc.font = fontOf(t); t.w = mc.measureText(k.label).width;
          if (lx > pad && lx + 18 + t.w > pad + maxW) { lx = pad; ly += 20; }
          head.push({ t: 'rect', x: lx, y: ly - 10, w: 12, h: 12, r: 6, fill: { r: k.c[0], g: k.c[1], b: k.c[2], a: 1 } });
          t.x = lx + 18; t.y = ly; head.push(t); lx += 18 + t.w + 18;
        });
        hy = ly + 4;
      }
      if (head.length) hy += 14;
      const dx = pad - x1, dy = hy - y1;
      const mv = it => {
        if ('x' in it) { it.x += dx; it.y += dy; }
        if (it.t === 'line') { it.x1 += dx; it.x2 += dx; it.y1 += dy; it.y2 += dy; }
        if (it.t === 'path') it.segs.forEach(sg => { sg.p = sg.p.map((v, i) => v + (i % 2 ? dy : dx)); });
        if (it.clip && it.clip.poly) it.clip.poly = it.clip.poly.map(([a, b2]) => [a + dx, b2 + dy]);
        if (it.clip && it.clip.rr) { it.clip.rr.x += dx; it.clip.rr.y += dy; }
      };
      items.forEach(mv);
      // Background: the chart panel's color as seen, or white.
      let bg = null;
      for (let e = view; e && !bg; e = e.parentElement) { const c = col(getComputedStyle(e).backgroundColor); if (c) bg = c; }
      bg = bg ? { r: bg.r * bg.a + 255 * (1 - bg.a), g: bg.g * bg.a + 255 * (1 - bg.a), b: bg.b * bg.a + 255 * (1 - bg.a), a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
      return { w: Math.ceil(x2 - x1 + pad * 2), h: Math.ceil(y2 - y1 + hy + pad), bg, items: head.concat(items), title: o.title || '' };
    });
  }
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);

  // Same-site image → data: URL, so a saved SVG stands on its own. Anything the browser won't share stays a link.
  function dataUrlOf(it, scale) {
    try {
      const k = scale || 2, cw = Math.max(1, Math.round(it.w * k)), ch = Math.max(1, Math.round(it.h * k));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch);
      drawImg(x, it, 0, 0, cw, ch);
      return c.toDataURL('image/jpeg', 0.9);
    } catch (e) { return null; }
  }
  function cover(it, wd, ht) {
    const nw = it.el.naturalWidth, nh = it.el.naturalHeight;
    if (it.fit !== 'cover') return [0, 0, nw, nh];
    const s = Math.max(wd / nw, ht / nh), sw = wd / s, sh = ht / s;
    return [(nw - sw) / 2, (nh - sh) / 2, sw, sh];
  }
  function drawImg(x, it, dx, dy, wd, ht) {
    const [sx, sy, sw, sh] = cover(it, wd, ht);
    if (it.gray) x.filter = 'grayscale(1)';
    x.drawImage(it.el, sx, sy, sw, sh, dx, dy, wd, ht);
    x.filter = 'none';
  }

  /* ---------- SVG ---------- */
  function toSVG(sc, o) {
    o = o || {};
    let defs = '', body = '', id = 0;
    const uid = 'pkx' + Math.random().toString(36).slice(2, 7);
    const rrPath = (x, y, wd, ht, r) => {
      if (!r) return `M${n2(x)},${n2(y)}h${n2(wd)}v${n2(ht)}h${n2(-wd)}Z`;
      return `M${n2(x + r)},${n2(y)}H${n2(x + wd - r)}A${n2(r)},${n2(r)} 0 0 1 ${n2(x + wd)},${n2(y + r)}V${n2(y + ht - r)}A${n2(r)},${n2(r)} 0 0 1 ${n2(x + wd - r)},${n2(y + ht)}H${n2(x + r)}A${n2(r)},${n2(r)} 0 0 1 ${n2(x)},${n2(y + ht - r)}V${n2(y + r)}A${n2(r)},${n2(r)} 0 0 1 ${n2(x + r)},${n2(y)}Z`;
    };
    const clip = c => {
      if (!c) return '';
      const k = uid + (++id);
      defs += `<clipPath id="${k}">` + (c.poly ? `<polygon points="${c.poly.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ')}"/>` : `<path d="${rrPath(c.rr.x, c.rr.y, c.rr.w, c.rr.h, c.rr.r)}"/>`) + '</clipPath>';
      return ` clip-path="url(#${k})"`;
    };
    const paintA = (k, c) => c ? ` ${k}="${rgb(c)}"` + (c.a < 1 ? ` ${k}-opacity="${n2(c.a)}"` : '') : ` ${k}="none"`;
    const strokeA = it => paintA('stroke', it.stroke) + ` stroke-width="${n2(it.sw)}"` + (it.dash ? ` stroke-dasharray="${it.dash.map(n2).join(' ')}"` : '') + (it.cap && it.cap !== 'butt' ? ` stroke-linecap="${it.cap}"` : '');
    let gray = false;
    sc.items.forEach(it => {
      if (it.t === 'rect') {
        const a = it.stroke ? paintA('fill', null) + strokeA(it) : paintA('fill', it.fill);
        body += it.r ? `<path d="${rrPath(it.x, it.y, it.w, it.h, it.r)}"${a}${clip(it.clip)}/>` : `<rect x="${n2(it.x)}" y="${n2(it.y)}" width="${n2(it.w)}" height="${n2(it.h)}"${a}${clip(it.clip)}/>`;
      } else if (it.t === 'line') body += `<line x1="${n2(it.x1)}" y1="${n2(it.y1)}" x2="${n2(it.x2)}" y2="${n2(it.y2)}"${strokeA(it)}/>`;
      else if (it.t === 'path') body += `<path d="${it.segs.map(sg => sg.c + sg.p.map(n2).join(',')).join('')}" fill="none"${strokeA(it)}/>`;
      else if (it.t === 'text') {
        body += `<text x="${n2(it.x)}" y="${n2(it.y)}" font-family="${esc(it.family)}" font-size="${n2(it.size)}" font-weight="${esc(it.weight)}"` + (it.style !== 'normal' ? ' font-style="italic"' : '') +
          (it.ls ? ` letter-spacing="${n2(it.ls)}"` : '') + paintA('fill', it.fill) + ` textLength="${n2(it.w)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${esc(it.s)}</text>`;
      } else if (it.t === 'img') {
        const href = (o.images && o.images.get(it)) || new URL(it.src, location.href).href;
        if (it.gray) gray = true;
        body += `<image href="${esc(href)}" x="${n2(it.x)}" y="${n2(it.y)}" width="${n2(it.w)}" height="${n2(it.h)}" preserveAspectRatio="${it.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}"` +
          (it.op < 1 ? ` opacity="${n2(it.op)}"` : '') + (it.gray ? ` filter="url(#${uid}g)"` : '') + `${clip(it.clip || { rr: { x: it.x, y: it.y, w: it.w, h: it.h, r: 0 } })}/>`;
      }
    });
    if (gray) defs += `<filter id="${uid}g"><feColorMatrix type="saturate" values="0"/></filter>`;
    const size = o.fluid ? 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"' : `width="${sc.w}" height="${sc.h}"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${sc.w} ${sc.h}" role="img"${sc.title ? ` aria-label="${esc(sc.title)}"` : ''}>` +
      (sc.title ? `<title>${esc(sc.title)}</title>` : '') + (defs ? `<defs>${defs}</defs>` : '') +
      `<rect width="${sc.w}" height="${sc.h}" fill="${rgb(sc.bg)}"/>` + body + '</svg>';
  }

  /* ---------- canvas (PNG, and the picture PDF) ---------- */
  function toCanvas(sc, scale, noImages) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sc.w * scale)); c.height = Math.max(1, Math.round(sc.h * scale));
    const x = c.getContext('2d'); x.scale(scale, scale);
    x.fillStyle = rgb(sc.bg); x.fillRect(0, 0, sc.w, sc.h);
    const css = cl => `rgba(${Math.round(cl.r)},${Math.round(cl.g)},${Math.round(cl.b)},${cl.a})`;
    const rr = (bx, by, wd, ht, r) => { x.beginPath(); if (x.roundRect && r) x.roundRect(bx, by, wd, ht, r); else x.rect(bx, by, wd, ht); };
    const clip = cl => {
      if (!cl) return;
      x.beginPath();
      if (cl.poly) { cl.poly.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); }
      else { rr(cl.rr.x, cl.rr.y, cl.rr.w, cl.rr.h, cl.rr.r); }
      x.clip();
    };
    const stroke = it => { x.strokeStyle = css(it.stroke); x.lineWidth = it.sw; x.setLineDash(it.dash || []); x.lineCap = it.cap || 'butt'; x.stroke(); };
    sc.items.forEach(it => {
      x.save();
      if (it.t === 'rect') { clip(it.clip); rr(it.x, it.y, it.w, it.h, it.r); if (it.stroke) stroke(it); else { x.fillStyle = css(it.fill); x.fill(); } }
      else if (it.t === 'line') { x.beginPath(); x.moveTo(it.x1, it.y1); x.lineTo(it.x2, it.y2); stroke(it); }
      else if (it.t === 'path') {
        x.beginPath();
        it.segs.forEach(sg => { const p = sg.p; if (sg.c === 'M') x.moveTo(p[0], p[1]); else if (sg.c === 'L') x.lineTo(p[0], p[1]); else if (sg.c === 'C') x.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); else if (sg.c === 'Z') x.closePath(); });
        stroke(it);
      } else if (it.t === 'text') {
        x.font = fontOf(it); x.fillStyle = css(it.fill); x.textBaseline = 'alphabetic';
        if ('letterSpacing' in x) x.letterSpacing = (it.ls || 0) + 'px';
        const mw = x.measureText(it.s).width, k = mw > 0 ? it.w / mw : 1;
        x.translate(it.x, it.y); if (k > 0.75 && k < 1.33) x.scale(k, 1);
        x.fillText(it.s, 0, 0);
      } else if (it.t === 'img' && !noImages) {
        clip(it.clip); x.globalAlpha = it.op; drawImg(x, it, it.x, it.y, it.w, it.h);
      }
      x.restore();
    });
    return c;
  }
  // Big charts: stay inside what browsers will draw (about 16k px a side, ~120M pixels).
  const canvasScale = (sc, want) => Math.max(0.1, Math.min(want, 16000 / Math.max(sc.w, sc.h), Math.sqrt(1.2e8 / (sc.w * sc.h))));
  function canvasBlob(sc, scale, type, q) {
    const go = noImg => new Promise((res, rej) => { try { toCanvas(sc, scale, noImg).toBlob(b => b ? res(b) : rej(new Error('canvas')), type, q); } catch (e) { rej(e); } });
    // A photo from another site "taints" the canvas; try again without photos rather than fail.
    return go(false).catch(e => e && e.name === 'SecurityError' ? go(true) : Promise.reject(e));
  }

  /* ---------- PDF ---------- */
  const PAGES = { letter: [612, 792], a4: [595.28, 841.89] };
  const W1252 = { 0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156, 0x017E: 158, 0x0178: 159 };
  const ansi = ch => { const c = ch.codePointAt(0); return (c >= 32 && c < 127) || (c >= 160 && c < 256) ? c : W1252[c] || -1; };
  const pdfText = s => { let o = ''; for (const ch of s) { const c = ansi(ch); o += c === 40 || c === 41 || c === 92 ? '\\' + ch : c < 127 ? ch : '\\' + c.toString(8).padStart(3, '0'); } return '(' + o + ')'; };
  const fitsAnsi = sc => sc.items.every(it => it.t !== 'text' || [...it.s].every(ch => ansi(ch) >= 0));
  const bytes = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
  const b64 = d => { const s = atob(d.slice(d.indexOf(',') + 1)); return bytes(s); };
  async function deflate(b) {
    if (typeof CompressionStream === 'undefined') return null;
    try { return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); } catch (e) { return null; }
  }
  function page(sc, o) {
    const [a, b] = PAGES[o.page] || PAGES.letter, land = o.orient === 'landscape' || (o.orient !== 'portrait' && sc.w > sc.h);
    return land ? [b, a, 'landscape'] : [a, b, 'portrait'];
  }

  async function toPDF(sc, o) {
    o = o || {};
    const [pw, ph] = page(sc, o), m = 36, s = Math.min((pw - m * 2) / sc.w, (ph - m * 2) / sc.h);
    const ox = (pw - sc.w * s) / 2, oy = (ph - sc.h * s) / 2;
    const gs = new Map(), imgs = [], vector = fitsAnsi(sc);
    const alpha = a => { if (a >= 0.999) return ''; const k = n2(a); if (!gs.has(k)) gs.set(k, '/G' + gs.size); return gs.get(k) + ' gs '; };
    const rg = (c, op) => `${n2(c.r / 255)} ${n2(c.g / 255)} ${n2(c.b / 255)} ${op}`;
    const rr = (x, y, wd, ht, r) => {
      if (!r) return `${n2(x)} ${n2(y)} ${n2(wd)} ${n2(ht)} re `;
      const k = r * 0.5523, P = (...v) => v.map(n2).join(' ');
      return `${P(x + r, y)} m ${P(x + wd - r, y)} l ${P(x + wd - r + k, y, x + wd, y + r - k, x + wd, y + r)} c ${P(x + wd, y + ht - r)} l ${P(x + wd, y + ht - r + k, x + wd - r + k, y + ht, x + wd - r, y + ht)} c ` +
        `${P(x + r, y + ht)} l ${P(x + r - k, y + ht, x, y + ht - r + k, x, y + ht - r)} c ${P(x, y + r)} l ${P(x, y + r - k, x + r - k, y, x + r, y)} c h `;
    };
    const clip = c => !c ? '' : (c.poly ? c.poly.map((p, i) => `${n2(p[0])} ${n2(p[1])} ${i ? 'l' : 'm'} `).join('') + 'h ' : rr(c.rr.x, c.rr.y, c.rr.w, c.rr.h, c.rr.r)) + 'W n ';
    const stroke = it => `${alpha(it.stroke.a)}${rg(it.stroke, 'RG')} ${n2(it.sw)} w ${it.cap === 'round' ? 1 : 0} J [${(it.dash || []).map(n2).join(' ')}] 0 d `;
    let out = `q ${n2(s)} 0 0 ${n2(-s)} ${n2(ox)} ${n2(ph - oy)} cm ${rg(sc.bg, 'rg')} 0 0 ${sc.w} ${sc.h} re f `;
    if (!vector) {
      // Characters outside the PDF's built-in font: the whole chart goes in as one picture instead.
      const blob = await canvasBlob(sc, canvasScale(sc, 3), 'image/jpeg', 0.92);
      const d = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
      const im = new Image(); im.src = d; await im.decode();
      imgs.push({ w: im.naturalWidth, h: im.naturalHeight, data: b64(d) });
      out += `q ${sc.w} 0 0 ${-sc.h} 0 ${sc.h} cm /I0 Do Q `;
    } else {
      sc.items.forEach(it => {
        if (it.t === 'rect') {
          out += 'q ' + clip(it.clip);
          out += it.stroke ? stroke(it) + rr(it.x, it.y, it.w, it.h, it.r) + 'S ' : `${alpha(it.fill.a)}${rg(it.fill, 'rg')} ` + rr(it.x, it.y, it.w, it.h, it.r) + 'f ';
          out += 'Q ';
        } else if (it.t === 'line') out += `q ${stroke(it)}${n2(it.x1)} ${n2(it.y1)} m ${n2(it.x2)} ${n2(it.y2)} l S Q `;
        else if (it.t === 'path') {
          out += 'q ' + stroke(it) + it.segs.map(sg => sg.p.map(n2).join(' ') + ' ' + ({ M: 'm', L: 'l', C: 'c', Z: 'h' }[sg.c] || '')).join(' ') + ' S Q ';
        } else if (it.t === 'text') {
          const bold = (+it.weight || (it.weight === 'bold' ? 700 : 400)) >= 600, ital = it.style !== 'normal';
          const f = '/F' + ((bold ? 1 : 0) + (ital ? 2 : 0));
          // Helvetica is not your template's font: measure it (Arial has the same widths) and stretch to the same width.
          mc.font = `${ital ? 'italic' : 'normal'} ${bold ? 700 : 400} ${it.size}px Arial, Helvetica, "Liberation Sans", sans-serif`;
          const n = [...it.s].length, ls = it.ls || 0, hw = mc.measureText(it.s).width, tz = hw > 0 ? Math.max(60, Math.min(140, (it.w - ls * (n - 1)) / hw * 100)) : 100;
          out += `q ${alpha(it.fill.a)}${rg(it.fill, 'rg')} BT ${f} ${n2(it.size)} Tf ${n2(tz)} Tz ${n2(ls)} Tc 1 0 0 -1 ${n2(it.x)} ${n2(it.y)} Tm ${pdfText(it.s)} Tj ET Q `;
        } else if (it.t === 'img') {
          const d = dataUrlOf(it, 3); if (!d) return;
          const k = imgs.length; imgs.push({ w: Math.max(1, Math.round(it.w * 3)), h: Math.max(1, Math.round(it.h * 3)), data: b64(d) });
          out += `q ${alpha(it.op)}${clip(it.clip || { rr: { x: it.x, y: it.y, w: it.w, h: it.h, r: 0 } })}${n2(it.w)} 0 0 ${n2(-it.h)} ${n2(it.x)} ${n2(it.y + it.h)} cm /I${k} Do Q `;
        }
      });
    }
    out += 'Q';

    // Assemble the file.
    const parts = [], offs = [];
    let len = 0;
    const put = b => { if (typeof b === 'string') b = bytes(b); parts.push(b); len += b.length; };
    const objs = [];
    const obj = body => { objs.push(body); return objs.length; };
    const content = bytes(out), packed = await deflate(content);
    const fonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'].map(f => obj(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
    const ims = imgs.map(im => obj({ dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>`, data: im.data }));
    const cont = obj({ dict: `<< /Length ${(packed || content).length}${packed ? ' /Filter /FlateDecode' : ''} >>`, data: packed || content });
    const res = `<< /Font << ${fonts.map((n, i) => `/F${i} ${n} 0 R`).join(' ')} >>` + (ims.length ? ` /XObject << ${ims.map((n, i) => `/I${i} ${n} 0 R`).join(' ')} >>` : '') +
      (gs.size ? ` /ExtGState << ${[...gs].map(([a, k]) => `${k} << /ca ${a} /CA ${a} >>`).join(' ')} >>` : '') + ' >>';
    const pagesN = objs.length + 2;
    const pageN = obj(`<< /Type /Page /Parent ${pagesN} 0 R /MediaBox [0 0 ${n2(pw)} ${n2(ph)}] /Resources ${res} /Contents ${cont} 0 R >>`);
    obj(`<< /Type /Pages /Kids [${pageN} 0 R] /Count 1 >>`);
    const cat = obj(`<< /Type /Catalog /Pages ${pagesN} 0 R >>`);
    const now = new Date(), z = v => String(v).padStart(2, '0');
    const info = obj(`<< /Title ${pdfText(sc.title || 'Org chart')} /Producer (Pecking Order ${PO.version}) /CreationDate (D:${now.getFullYear()}${z(now.getMonth() + 1)}${z(now.getDate())}${z(now.getHours())}${z(now.getMinutes())}${z(now.getSeconds())}) >>`);
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    objs.forEach((b, i) => {
      offs.push(len); put(`${i + 1} 0 obj\n`);
      if (typeof b === 'string') put(b); else { put(b.dict + '\nstream\n'); put(b.data); put('\nendstream'); }
      put('\nendobj\n');
    });
    const xref = len;
    put(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(v => String(v).padStart(10, '0') + ' 00000 n \n').join(''));
    put(`trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return { blob: new Blob(parts, { type: 'application/pdf' }), vector };
  }

  /* ---------- print ---------- */
  function printDoc(sc, o, svg) {
    const [, , orient] = page(sc, o);
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sc.title || '')}</title><style>@page{margin:.5in;size:${o.page === 'a4' ? 'A4' : 'letter'} ${orient}}` +
      `body,html{height:100%;margin:0}svg{display:block;height:100%;width:100%}</style></head><body>${svg}</body></html>`;
  }
  function printScene(sc, o) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'border:0;bottom:0;height:0;position:fixed;right:0;width:0';
    f.srcdoc = printDoc(sc, o, toSVG(sc, { fluid: true }));
    f.onload = () => {
      const fw = f.contentWindow, done = () => setTimeout(() => f.remove(), 500);
      fw.addEventListener('afterprint', done);
      fw.focus(); fw.print();
    };
    document.body.append(f);
  }

  /* ---------- the Export menu ---------- */
  const attached = [];
  let seq = 0;
  function save(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const optsOf = (root, o) => Object.assign({
    enabled: root.dataset.export === '1', name: root.dataset.exportName || 'org-chart', title: root.dataset.exportTitle || '',
    date: root.dataset.exportDate !== '0', page: root.dataset.page || 'letter', orient: root.dataset.orient || 'auto',
    host: root.querySelector('.pko-bar')
  }, o || {});

  async function run(chart, o, fmt, all) {
    const sc = scene(chart, { all, title: o.title, date: o.date });
    const base = (o.name || 'org-chart').replace(/[^\w.-]+/g, '-');
    if (fmt === 'print') { printScene(sc, o); return null; }
    if (fmt === 'svg') {
      const images = new Map(); sc.items.forEach(it => { if (it.t === 'img') { const d = dataUrlOf(it, 2); if (d) images.set(it, d); } });
      save(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + toSVG(sc, { images })], { type: 'image/svg+xml' }), base + '.svg'); return base + '.svg';
    }
    if (fmt === 'png') { save(await canvasBlob(sc, canvasScale(sc, 2), 'image/png'), base + '.png'); return base + '.png'; }
    if (fmt === 'pdf') { const r = await toPDF(sc, o); save(r.blob, base + '.pdf'); return base + '.pdf'; }
    return null;
  }

  function attach(root, chart, o) {
    o = optsOf(root, o);
    const entry = { root, chart, o }; attached.push(entry);
    if (!o.enabled || !o.host || root.querySelector('.pko-exp')) return entry;
    const W = chart.words, k = ++seq, el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const d = el('details', 'pko-exp'), sum = el('summary', 'btn btn-sm btn-outline-secondary', W('exportBtn'));
    const menu = el('div', 'pko-exp-menu'), fs = el('fieldset', 'pko-exp-scope'), msg = el('p', 'pko-exp-msg');
    msg.setAttribute('aria-live', 'polite');
    fs.append(el('legend', null, W('exportScope')));
    [['shown', W('asShown')], ['all', W('everything')]].forEach(([v, t], i) => {
      const l = el('label'), r = el('input'); r.type = 'radio'; r.name = 'pko-exp-' + k; r.value = v; r.checked = !i; l.append(r, ' ' + t); fs.append(l);
    });
    const go = el('div', 'pko-exp-go');
    ['svg', 'png', 'pdf', 'print'].forEach(f => { const b = el('button', 'btn btn-sm btn-outline-secondary', W(f)); b.type = 'button'; b.dataset.fmt = f; go.append(b); });
    menu.append(fs, go, msg); d.append(sum, menu); o.host.append(d);
    d.addEventListener('toggle', () => { if (d.open) { fs.hidden = !root.querySelector('.pko-node.is-collapsed'); msg.textContent = ''; } });
    // Only a real click outside closes it (the download link's own click is not one).
    document.addEventListener('click', e => { if (e.isTrusted && d.open && !d.contains(e.target)) d.open = false; });
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && d.open) { d.open = false; sum.focus(); } });
    go.addEventListener('click', async e => {
      const b = e.target.closest('button[data-fmt]'); if (!b) return;
      const all = (fs.querySelector('input:checked') || {}).value === 'all';
      go.querySelectorAll('button').forEach(x => { x.disabled = true; });
      msg.textContent = chart.getMode() === 'sad' ? W('exportBusySad') : W('exportBusy');
      await new Promise(r => setTimeout(r, 30));
      try {
        const file = await run(chart, o, b.dataset.fmt, all);
        msg.textContent = file ? fill(W('exportDone'), { file }) : '';
        if (b.dataset.fmt === 'print') d.open = false;
      } catch (err) { msg.textContent = fill(W('exportFail'), { msg: (err && err.message) || err }); }
      go.querySelectorAll('button').forEach(x => { x.disabled = false; });
    });
    return entry;
  }

  // Ctrl/⌘+P on the page: print each chart whole, fitted to the paper, instead of the panned panel.
  w.addEventListener('beforeprint', () => {
    attached.forEach(({ root, chart, o }) => {
      if (!root.isConnected || !root.classList.contains('is-ready') || root.querySelector('.pko-print')) return;
      try {
        const box = document.createElement('div'); box.className = 'pko-print';
        box.innerHTML = toSVG(scene(chart, { title: o.title, date: o.date }), {});
        root.append(box);
      } catch (e) { /* print the page as it is */ }
    });
  });
  w.addEventListener('afterprint', () => document.querySelectorAll('.pko-print').forEach(e => e.remove()));

  PO.exporter = { attach, scene, toSVG, toCanvas, toPDF, printDoc, run, PAGES };
})(window);
