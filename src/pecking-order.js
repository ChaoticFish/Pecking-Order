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
