/*! Pecking Order Studio by Chaotic Fish Design | GPL v2 */
(function () {
  'use strict';
  const PO = window.PeckingOrder;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
  const CAN_PICK = typeof window.showOpenFilePicker === 'function';
  const CAN_SAVE_AS = typeof window.showSaveFilePicker === 'function';
  const ID_OK = /^[A-Za-z0-9_-]+$/;

  /* ---------- state ---------- */
  let rows = [], file = { name: 'untitled.json', handle: null, format: 'json' }, dirty = false;
  let picked = new Set(), cmp = null; // bulk-edit selection; the file being compared against
  let undo = [], redo = [], editing = null, fieldBefore = null, renderTimer = 0, draftTimer = 0, tab = 'edit';
  const snap = () => JSON.stringify(rows);
  const rowOf = id => rows.find(r => r.id === id);
  const label = r => r ? (r.name || r.title || r.unit || r.id) : '';
  const upOf = r => r && (r.deputy_of || r.parent);

  /* ---------- chart ---------- */
  const chart = PO.init($('#pks-chart'), [], {
    showErrors: false,
    onPick: id => { editing = id; if (picked.size) { picked.clear(); markPicked(); } showTab('edit'); showEditor(); },
    onDrop: (src, target) => rehome(src, target),
    onRender: model => { showProblems(model); markPicked(); if (cmp) { cmp.d = diffRows(cmp.before, rows); markDiff(); if (tab === 'compare') showCompare(); } }
  });
  // Export menu in the toolbar; its settings live on the Look tab.
  const exp = PO.exporter ? PO.exporter.attach($('#pks-chart'), chart, { enabled: true, host: $('.pks-tools') }) : { o: {} };
  function render(now) {
    clearTimeout(renderTimer);
    const go = () => chart.load(rows, { keep: true });
    if (now) go(); else renderTimer = setTimeout(go, 220);
    saveDraftSoon();
  }

  /* ---------- changes, undo ---------- */
  function change(fn, opts) {
    const before = snap();
    fn();
    if (snap() !== before) { undo.push(before); if (undo.length > 150) undo.shift(); redo = []; setDirty(true); }
    render(true);
    if (!opts || opts.editor !== false) showEditor();
    syncButtons();
  }
  function restore(from, to) {
    if (!from.length) return;
    to.push(snap()); rows = JSON.parse(from.pop());
    if (editing && !rowOf(editing)) editing = null;
    setDirty(true); render(true); showEditor(); syncButtons(); refreshRaw();
  }
  function setDirty(d) { dirty = d; $('#pks-dirty').hidden = !d; document.title = (d ? '• ' : '') + file.name + ' — Pecking Order Studio'; }
  function syncButtons() { $('#pks-undo').disabled = !undo.length; $('#pks-redo').disabled = !redo.length; }

  /* ---------- tree helpers ---------- */
  function isUnder(id, ancestor) {
    const seen = new Set();
    for (let r = rowOf(id); r && !seen.has(r.id); r = rowOf(upOf(r))) { seen.add(r.id); if (upOf(r) === ancestor) return true; }
    return false;
  }
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 24) || 'p';
  function uniqueId(base) { let id = slug(base), n = 2; const b = id; while (rowOf(id)) id = `${b}-${n++}`; return id; }
  const groupKey = r => r.deputy_of ? 'd:' + r.deputy_of : 'p:' + (r.parent || '') + '|' + (r.placement || '');

  /* ---------- actions ---------- */
  function addRow(kind) {
    const s = rowOf(editing);
    const inTeam = kind === 'deputy' && s && String(s.placement || '').toLowerCase() === 'team';
    const titles = { top: 'Director', child: 'New position', side: 'Staff', assistant: 'Assistant', deputy: inTeam ? 'Team member' : 'Deputy', team: '' };
    const r = { id: '', name: kind === 'team' ? 'New team' : '', title: titles[kind] };
    if (kind !== 'top' && s) {
      r.parent = s.id;
      if (kind === 'side' || kind === 'assistant') r.placement = kind;
      if (kind === 'deputy' || kind === 'team') r.deputy_of = s.id;
      if (kind === 'team') r.placement = 'team';
    }
    r.id = uniqueId(r.title || r.name);
    change(() => { rows.push(r); editing = r.id; });
    chart.select(r.id, { center: true });
    focusField('name');
    toast(kind === 'team' ? 'Added a team inside this card — name it, then add its people with + Member.' : `Added ${r.title.toLowerCase()} — give them a name.`);
  }
  function removeRow() {
    const s = rowOf(editing); if (!s) return;
    const kids = rows.filter(r => r.parent === s.id || r.deputy_of === s.id);
    const up = rowOf(s.parent);
    const msg = kids.length ? `Delete ${label(s)}? Their ${kids.length} report${kids.length > 1 ? 's' : ''} will move up to ${up ? label(up) : 'the top of the chart'}.` : `Delete ${label(s)}?`;
    if (!confirm(msg)) return;
    change(() => {
      kids.forEach(k => { if (k.deputy_of === s.id) k.deputy_of = ''; k.parent = s.parent || ''; });
      rows.forEach(r => { if (r.also_reports_to) r.also_reports_to = r.also_reports_to.split(/[;|]/).map(x => x.trim()).filter(x => x && x !== s.id).join(';'); });
      rows = rows.filter(r => r !== s);
      editing = up ? up.id : null;
    });
    if (editing) chart.select(editing);
  }
  function move(dir) {
    const s = rowOf(editing); if (!s) return;
    const sibs = rows.map((r, i) => [r, i]).filter(([r]) => groupKey(r) === groupKey(s));
    const at = sibs.findIndex(([r]) => r === s), to = sibs[at + dir];
    if (!to) return;
    change(() => { const i = sibs[at][1], j = to[1]; [rows[i], rows[j]] = [rows[j], rows[i]]; });
    chart.select(s.id);
  }
  function rehome(srcId, targetId) {
    const s = rowOf(srcId); let t = rowOf(targetId);
    if (!s || !t) return;
    if (t.deputy_of) t = rowOf(t.deputy_of) || t;
    if (t.id === s.id || t.id === upOf(s) && !s.deputy_of) { toast(`${label(s)} already reports to ${label(t)}.`); return; }
    if (isUnder(t.id, s.id)) { toast(`Can't move ${label(s)} under ${label(t)}: ${label(t)} reports to them.`); return; }
    editing = s.id;
    change(() => { s.parent = t.id; s.deputy_of = ''; });
    chart.select(s.id);
    toast(`${label(s)} now reports to ${label(t)}. Change placement in the editor if needed.`);
  }
  function renameId(r, next) {
    const old = r.id;
    rows.forEach(x => {
      if (x.parent === old) x.parent = next;
      if (x.deputy_of === old) x.deputy_of = next;
      if (x.also_reports_to) x.also_reports_to = x.also_reports_to.split(/[;|]/).map(v => v.trim() === old ? next : v.trim()).join(';');
    });
    r.id = next; editing = next;
  }

  /* ---------- editor ---------- */
  const FORM = [
    ['Card', [
      { k: 'name', l: 'Name', h: 'Leave empty for an open role.' },
      { k: 'title', l: 'Title' },
      { k: 'unit', l: 'Unit name', h: 'Makes this a unit card, e.g. "Office" or "Group 3". Put it on the unit\'s leader.' },
      { k: 'roles', l: 'Roles', h: 'Shown as chips. Separate with ;' },
      { k: 'vacant', l: 'Open role (vacant)', t: 'check' },
      { k: 'link', l: 'Job posting link', h: 'For an open role: adds a Help wanted tag and a link in the details. A web address or site path.' },
      { k: 'start_date', l: 'Start date', t: 'date', h: 'Gets a New tag for a while (Look → New-hire tag).' },
      { k: 'description', l: 'Description', t: 'area', h: 'Shown on unit cards and teams, and in the details panel.' }
    ]],
    ['Inside the card', [
      { k: 'columns', l: 'People per row', t: 'cols', h: 'How many deputies or team members sit side by side inside this card. A team uses its own setting, or else its leader\'s.' },
      { k: 'group_titles', l: 'Share titles', t: 'check', h: 'People next to each other with the same title show the title once, with their names under it.' },
      { k: 'stack', l: 'Their reports', t: 'stack', h: 'Two per row stacks this person\'s reports down the trunk in pairs (top to bottom charts only).' }
    ]],
    ['Card look', [
      { k: 'width', l: 'Width', t: 'number', h: 'Pixels (120 to 900). Empty uses the chart\'s card width.' },
      { k: 'background', l: 'Background', t: 'color', h: 'Empty uses the chart\'s card background.' },
      { k: 'color', l: 'Text color', t: 'color', h: 'Leave empty for automatic, which always passes WCAG AA. Your own color is used only if it passes too.' },
      { k: 'class', l: 'CSS class', h: 'Your own class names for this card (space-separated) to style in your template. pko- and is- names are ours and are ignored.' },
      { k: 'accent', l: 'Accent color', t: 'color', h: 'Top stripe and avatar color.' }
    ]],
    ['Place in the chart', [
      { k: 'parent', l: 'Reports to', t: 'who' },
      { k: 'placement', l: 'Placement', t: 'placement' },
      { k: 'deputy_of', l: 'Deputy of', t: 'who', h: 'Deputies show inside their leader\'s card, beside it, or on the line under it (Look → Deputies). With Beside, placement Side, right puts a deputy on the right.' },
      { k: 'deputy_style', l: 'This leader\'s deputies', t: 'dstyle', h: 'Only for someone with deputies. Empty uses the chart\'s setting.' },
      { k: 'also_reports_to', l: 'Also reports to', h: 'Dotted-line managers, by id. Separate with ;' }
    ]],
    ['Contact and extras', [
      { k: 'department', l: 'Department' }, { k: 'office', l: 'Office' }, { k: 'location', l: 'Location' },
      { k: 'email', l: 'Email', t: 'email' }, { k: 'phone', l: 'Phone' },
      { k: 'photo', l: 'Photo', h: 'Path or URL, e.g. images/org/pat.jpg' }
    ]],
    ['ID', [{ k: 'id', l: 'ID', h: 'Unique. Letters, numbers, - and _. Renaming updates every reference.' }]]
  ];
  const openSecs = new Set(['Card', 'Place in the chart']);

  function whoSelect(r, k) {
    const s = el('select'); const blocked = new Set([r.id, ...rows.filter(x => isUnder(x.id, r.id)).map(x => x.id)]);
    s.append(new Option(k === 'parent' ? '(top of the chart)' : '(not a deputy)', ''));
    rows.forEach(x => { if (!blocked.has(x.id)) s.append(new Option(`${label(x)}${x.title && x.name ? ' — ' + x.title : ''} (${x.id})`, x.id)); });
    s.value = r[k] || '';
    if (r[k] && s.value !== r[k]) { s.append(new Option(`⚠ ${r[k]} (missing)`, r[k])); s.value = r[k]; }
    return s;
  }
  function field(r, f) {
    const wrap = el('div', 'pks-f' + (f.t === 'check' ? ' is-check' : '')), id = 'pks-f-' + f.k;
    let input;
    if (f.t === 'area') input = el('textarea');
    else if (f.t === 'who') input = whoSelect(r, f.k);
    else if (f.t === 'placement') { input = el('select'); [['', 'Normal card below'], ['side', 'Side (staff column, right)'], ['side-left', 'Side, left'], ['side-right', 'Side, right'], ['assistant', 'Assistant (on the trunk, auto side)'], ['assistant-left', 'Assistant, left'], ['assistant-right', 'Assistant, right'], ['team', 'Team (a section in the Deputy of card)']].forEach(([v, t]) => input.append(new Option(t, v))); }
    else if (f.t === 'cols') { input = el('select'); input.append(new Option('All in one row', '')); for (let i = 1; i <= 6; i++) input.append(new Option(String(i), String(i))); }
    else if (f.t === 'stack') { input = el('select'); [['', 'Chart setting'], ['yes', 'Two per row down the trunk'], ['no', 'One row']].forEach(([v, t]) => input.append(new Option(t, v))); }
    else if (f.t === 'dstyle') { input = el('select'); [['', 'Chart setting'], ['inside', 'Inside the card'], ['beside', 'Beside'], ['stem', 'Shared stem (under)']].forEach(([v, t]) => input.append(new Option(t, v))); }
    else { input = el('input'); input.type = f.t === 'check' ? 'checkbox' : f.t === 'email' ? 'email' : f.t === 'date' ? 'date' : 'text'; if (f.t === 'number') { input.inputMode = 'numeric'; input.placeholder = 'Chart default'; } }
    input.id = id; input.dataset.k = f.k;
    if (f.t === 'check') input.checked = /^(1|y|yes|true|x)$/i.test(r[f.k] || '');
    else if (f.t !== 'who') input.value = r[f.k] || '';
    const lab = el('label', null, f.l); lab.htmlFor = id;
    if (f.t === 'check') wrap.append(input, lab);
    else if (f.t === 'color') {
      const row = el('div', 'pks-color'), pick = el('input'); pick.type = 'color'; pick.dataset.k = f.k; pick.dataset.pick = '1';
      const defaults = { accent: '#05b5c3', background: '#ffffff', color: '#1b1f23' };
      pick.value = /^#[0-9a-f]{6}$/i.test(r[f.k] || '') ? r[f.k] : defaults[f.k] || '#000000'; pick.setAttribute('aria-label', 'Pick ' + f.l.toLowerCase());
      input.placeholder = f.k === 'color' ? 'Automatic' : 'Chart default';
      input.title = 'Hex, rgb()/rgba(), hsl(), a color name, or var(--name) if your template defines it';
      const rgbNow = PO.rgbOf(r[f.k]); if (rgbNow) pick.value = '#' + rgbNow.map(v => v.toString(16).padStart(2, '0')).join('');
      const clr = el('button', 'btn', 'Clear'); clr.type = 'button'; clr.dataset.clear = f.k;
      row.append(pick, input, clr); wrap.append(lab, row);
    } else wrap.append(lab, input);
    if (f.h) wrap.append(el('p', 'pks-hint', f.h));
    return wrap;
  }
  function goPicker() {
    const wrap = el('div', 'pks-f'), s = el('select'), lab = el('label', null, 'Go to');
    s.id = 'pks-goto'; lab.htmlFor = s.id;
    s.append(new Option(rows.length ? `Anyone (${rows.length})…` : 'No one yet', ''));
    [...rows].sort((a, b) => label(a).localeCompare(label(b))).forEach(x => s.append(new Option(`${label(x)}${x.title && x.name ? ' — ' + x.title : ''} (${x.id})`, x.id)));
    s.value = editing && rowOf(editing) ? editing : '';
    s.addEventListener('change', () => { if (!s.value) return; editing = s.value; showEditor(); chart.select(editing, { center: true }); });
    wrap.append(lab, s); return wrap;
  }
  function showEditor() {
    const box = $('#pks-edit'), r = rowOf(editing);
    if (picked.size > 1) { showBulk(box); return; }
    if (!r) {
      editing = null;
      const p = el('p', 'pks-empty', rows.length ? 'Click a card to edit it. Drag a person onto someone else to change who they report to.' : 'This chart is empty. Start with the person at the top.');
      const b = el('button', 'btn', '+ Add a top-level person'); b.type = 'button'; b.dataset.add = 'top';
      box.replaceChildren(goPicker(), p, el('div', 'pks-acts')); box.lastChild.append(b);
      return;
    }
    const who = el('div', 'pks-who'); who.append(el('h2', null, label(r) || '(no name)'), el('span', 'pks-id', r.id));
    const acts = el('div', 'pks-acts');
    const btn = (t, data, cls, title) => { const b = el('button', 'btn' + (cls ? ' ' + cls : ''), t); b.type = 'button'; Object.assign(b.dataset, data); if (title) b.title = title; acts.append(b); return b; };
    const isDep = !!r.deputy_of;
    btn('+ Report', { add: 'child' }, '', 'Add someone below').disabled = isDep;
    btn('+ Side', { add: 'side' }, '', 'Add a staff card beside').disabled = isDep;
    btn('+ Assistant', { add: 'assistant' }, '', 'Add a card on the trunk below').disabled = isDep;
    const isTeam = String(r.placement || '').toLowerCase() === 'team' && isDep;
    if (isTeam) btn('+ Member', { add: 'deputy' }, '', 'Add someone to this team');
    else btn('+ Deputy', { add: 'deputy' }, '', 'Add a deputy inside this card').disabled = isDep;
    btn('+ Team', { add: 'team' }, '', 'Add a team section (its own heading and email) inside this card').disabled = isDep;
    const sibs = rows.filter(x => groupKey(x) === groupKey(r)), at = sibs.indexOf(r);
    btn('← Earlier', { move: '-1' }, '', 'Move before the previous sibling').disabled = at <= 0;
    btn('Later →', { move: '1' }, '', 'Move after the next sibling').disabled = at >= sibs.length - 1;
    const pl = String(r.placement || '').toLowerCase(), base = pl.startsWith('side') ? 'side' : pl.startsWith('assistant') ? 'assistant' : '';
    if (base) {
      btn('← Left', { side: base + '-left' }, '', 'Put this card on the left').disabled = pl.endsWith('-left');
      btn('Right →', { side: base + '-right' }, '', 'Put this card on the right').disabled = pl.endsWith('-right') || pl === 'side';
    }
    btn('Duplicate', { dup: '1' }, '', 'Add a copy of this card next to it');
    const direct = rows.filter(x => x.parent === r.id && !x.deputy_of);
    if (direct.length > 1) btn('Sort A–Z', { sort: '1' }, '', 'Order their direct reports by name (row order is left-to-right order)');
    if (direct.length || rows.some(x => x.deputy_of === r.id)) btn('Select branch', { branch: '1' }, '', 'Select them and everyone under them, to edit together');
    btn('Delete', { del: '1' }, 'btn-danger');
    const parts = [goPicker(), who, acts];
    requestAnimationFrame(() => {
      if (rowOf(editing) === r && !document.querySelector(`#pks-chart .pko-person[data-id="${CSS.escape(r.id)}"]`)) {
        const n = el('p', 'pks-warn', 'This card isn\'t drawn in the chart right now (see Problems). You can still edit it here, or change Reports to / Placement to bring it back.');
        who.after(n);
      }
    });
    FORM.forEach(([title, fields]) => {
      const d = el('details', 'pks-sec'); d.open = openSecs.has(title); d.dataset.sec = title;
      d.append(el('summary', null, title));
      const g = el('div', 'pks-grid'); fields.forEach(f => g.append(field(r, f)));
      if (title === 'Card look') { const c = el('p', 'pks-contrast'); c.id = 'pks-contrast'; c.setAttribute('aria-live', 'polite'); g.append(c); }
      d.append(g); parts.push(d);
    });
    const extra = Object.keys(r).filter(k => !PO.COLS.includes(k) && k[0] !== '_');
    if (extra.length) {
      const d = el('details', 'pks-sec'); d.append(el('summary', null, 'Other columns'));
      const g = el('div', 'pks-grid'); extra.forEach(k => g.append(field(r, { k, l: k, h: 'Not used by Pecking Order; kept in exports.' }))); d.append(g); parts.push(d);
    }
    box.replaceChildren(...parts);
    showContrast();
  }
  function showContrast() {
    const out = $('#pks-contrast'), r = rowOf(editing); if (!out || !r) return;
    const bg = r.background || look.cardBg;
    if (!bg) { out.className = 'pks-contrast' + (r.color ? ' is-bad' : ''); out.textContent = r.color ? 'Text color only applies when the card has a background. Add one above.' : 'Default card colors: text passes WCAG AA.'; return; }
    const k = PO.inkFor(bg, r.background ? r.color : look.cardColor);
    if (!k) { const v = /^\s*var\(/i.test(bg); out.className = 'pks-contrast' + (v ? '' : ' is-bad'); out.textContent = v ? `${bg} is used as-is on your site (it works when your template defines it). Studio can't preview or check it.` : `"${bg}" isn't a color the chart can read.`; return; }
    const lvl = k.ratio >= PO.AAA ? 'passes AA and AAA' : 'passes AA';
    const seen = /^\s*var\(/i.test(bg) || /rgba|hsla|\//i.test(bg) ? ` (${bg} looks like ${k.seen} here)` : '';
    const mine = r.background && r.color;
    out.className = 'pks-contrast' + (mine && k.auto ? ' is-bad' : '');
    out.textContent = mine && k.auto
      ? `Your text color is only ${k.wantedRatio}:1 on this background (AA needs 4.5:1), so the chart uses ${k.ink} instead: ${k.ratio}:1, ${lvl}.`
      : `Text contrast ${k.ratio}:1, ${lvl}${k.auto ? ' (automatic color)' : ''}${seen}. Softer text is kept at 4.5:1 or more too.`;
  }
  function focusField(k) { setTimeout(() => { const i = $(`#pks-edit [data-k="${k}"]:not([data-pick])`); if (i) { i.focus(); if (i.select) i.select(); } }, 30); }

  const edit = $('#pks-edit');
  edit.addEventListener('toggle', e => { const s = e.target.dataset && e.target.dataset.sec; if (s) { if (e.target.open) openSecs.add(s); else openSecs.delete(s); } }, true);
  edit.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) addRow(b.dataset.add);
    else if (b.dataset.move) move(+b.dataset.move);
    else if (b.dataset.del) removeRow();
    else if (b.dataset.dup) duplicate();
    else if (b.dataset.sort) sortReports();
    else if (b.dataset.branch) { const r = rowOf(editing); picked = new Set([r.id, ...rows.filter(x => isUnder(x.id, r.id)).map(x => x.id)]); markPicked(); showEditor(); }
    else if (b.dataset.bulk) bulkAction(b.dataset.bulk);
    else if (b.dataset.side) { const r = rowOf(editing), v = b.dataset.side; change(() => { r.placement = v; }); chart.select(r.id); }
    else if (b.dataset.clear) { const r = rowOf(editing), k = b.dataset.clear; change(() => { r[k] = ''; }); }
  });
  edit.addEventListener('focusin', e => { if (e.target.dataset.k) fieldBefore = snap(); });
  edit.addEventListener('input', e => {
    const i = e.target, k = i.dataset.k, r = rowOf(editing); if (!k || !r || k === 'id') return;
    if (i.type === 'checkbox' || i.tagName === 'SELECT') return;
    r[k] = i.value; if (i.dataset.pick) { const t = edit.querySelector(`[data-k="${k}"]:not([data-pick])`); if (t) t.value = i.value; }
    if (!i.dataset.pick) { const sw = edit.querySelector(`[data-k="${k}"][data-pick]`), rgb = sw && PO.rgbOf(i.value); if (rgb) sw.value = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''); }
    if (k === 'background' || k === 'color') showContrast();
    setDirty(true); render();
    if (k === 'name' || k === 'title') { const h = edit.querySelector('.pks-who h2'); if (h) h.textContent = label(r) || '(no name)'; }
  });
  edit.addEventListener('change', e => {
    const i = e.target, k = i.dataset.k, r = rowOf(editing); if (!k || !r) return;
    const before = fieldBefore || snap(); fieldBefore = null;
    if (k === 'id') {
      const next = i.value.trim();
      if (next === r.id) return;
      if (!ID_OK.test(next) || rowOf(next)) { i.classList.add('is-invalid'); toast(!ID_OK.test(next) ? 'IDs can only use letters, numbers, - and _.' : `"${next}" is already used.`); i.value = r.id; setTimeout(() => i.classList.remove('is-invalid'), 1600); return; }
      renameId(r, next);
    } else if (i.type === 'checkbox') r[k] = i.checked ? '1' : '';
    else {
      r[k] = i.value;
      if (k === 'deputy_of' && i.value) { r.parent = i.value; if (String(r.placement || '').toLowerCase() !== 'team') r.placement = ''; }
      if (k === 'parent' && r.deputy_of && r.deputy_of !== i.value) r.deputy_of = '';
    }
    if (snap() !== before) { undo.push(before); redo = []; setDirty(true); }
    render(true); syncButtons();
    if (['id', 'parent', 'deputy_of', 'placement', 'columns', 'group_titles', 'stack'].includes(k)) { showEditor(); chart.select(r.id); }
  });

  /* ---------- problems ---------- */
  function showProblems(model) {
    const list = $('#pks-probs'), n = model.errs.length, badge = $('#pks-badge');
    badge.hidden = !n; badge.textContent = n;
    $('#pks-count').textContent = `${rows.length} ${rows.length === 1 ? 'card' : 'cards'} · ${n ? n + (n === 1 ? ' problem' : ' problems') : 'no problems'}`;
    if (!n) { list.replaceChildren(el('li', 'pks-ok', '✓ No problems. This file will render the same in Joomla.')); return; }
    list.replaceChildren(...model.errs.map(e => {
      const li = el('li'), b = el('button', null, (e.id ? `"${e.id}" ` : '') + e.msg); b.type = 'button';
      if (e.id && rowOf(e.id)) b.onclick = () => { editing = e.id; chart.select(e.id, { center: true }); showTab('edit'); showEditor(); };
      li.append(b); return li;
    }));
  }

  /* ---------- raw ---------- */
  function refreshRaw() { if (tab !== 'raw') return; $('#pks-raw').value = $('#pks-rawfmt').value === 'csv' ? PO.toCSV(rows) : PO.toJSON(rows); $('#pks-rawerr').hidden = true; }
  $('#pks-rawfmt').addEventListener('change', refreshRaw);
  $('#pks-rawreload').addEventListener('click', refreshRaw);
  $('#pks-rawapply').addEventListener('click', () => {
    const err = $('#pks-rawerr');
    try {
      const next = $('#pks-rawfmt').value === 'csv' ? PO.parseCSV($('#pks-raw').value) : PO.parseJSON($('#pks-raw').value);
      if (!next.length) throw new Error('No rows found.');
      change(() => { rows = next; if (!rowOf(editing)) editing = null; });
      err.hidden = true; toast('Applied.');
    } catch (x) { err.textContent = 'Not applied: ' + x.message; err.hidden = false; }
  });

  /* ---------- look ---------- */
  const LOOK_DEF = { startDepth: 0, wrapAt: 6, lines: 'solid', lineColor: '#8a99a3', cardw: 250, gap: 28, accent: '#05b5c3', cardBg: '', cardColor: '', bg: 'default', bgColor: '#f4f7f8', dotted: 'hover', mode: 'sparkle', unitDesc: true, dir: 'down', deputyStyle: 'inside', legend: '', filters: true, newDays: 90, fxSchool: true, fxSwim: true, fxPing: true, fxTrail: true, fxReel: true, fxDepth: true, fxRooster: true, fxKonami: true, fxTags: true, expTitle: '', expDate: true, expName: 'org-chart', page: 'letter', orient: 'auto' };
  let look = Object.assign({}, LOOK_DEF, store.get('pko-studio:look') || {});
  const FXL = { school: 'School formation intro', swim: 'Fish on search jumps', ping: 'Sonar ping', trail: 'Bubble trail', reel: 'Reel in / cast out', depth: 'Depth shading', rooster: 'Rooster', konami: 'Konami fish', tags: 'Tag shine and bob' };
  const FXK = PO.FX.map(k => ['fx' + k[0].toUpperCase() + k.slice(1), k]);
  function applyLook(save) {
    const r = $('#pks-chart').style;
    r.setProperty('--pko-ls', look.lines); r.setProperty('--pko-line', look.lineColor);
    r.setProperty('--pko-cardw', look.cardw + 'px'); r.setProperty('--pko-gap', look.gap + 'px'); r.setProperty('--pko-base', look.accent);
    r.setProperty('--pko-viewbg', look.bg === 'transparent' ? 'transparent' : look.bg === 'custom' ? look.bgColor : '');
    r.setProperty('--pko-viewbd', look.bg === 'transparent' ? 'transparent' : '');
    $('#pks-look-bgwrap').hidden = look.bg !== 'custom';
    chart.set('startDepth', look.startDepth); chart.set('wrapAt', look.wrapAt);
    chart.set('dir', look.dir); chart.set('deputyStyle', look.deputyStyle); chart.set('legend', look.legend); chart.set('filters', look.filters); chart.set('newDays', look.newDays);
    chart.set('fxOff', FXK.filter(([lk]) => !look[lk]).map(([, k]) => k));
    $('#pks-look-wrapAt').disabled = look.dir === 'right';
    chart.set('unitDesc', look.unitDesc); chart.set('dotted', look.dotted); chart.set('cardBg', look.cardBg); chart.set('cardColor', look.cardColor);
    const hexOf = (v, d) => { const c = PO.rgbOf(v); return c ? '#' + c.map(x => x.toString(16).padStart(2, '0')).join('') : d; };
    $('#pks-look-cardBgPick').value = hexOf(look.cardBg, '#ffffff');
    $('#pks-look-cardColorPick').value = hexOf(look.cardColor, '#1b1f23');
    const lk = look.cardBg && PO.inkFor(look.cardBg, look.cardColor);
    $('#pks-look-contrast').textContent = !look.cardBg ? 'Default card colors.' : !lk ? 'Not a color the chart can read.' : (look.cardColor && lk.auto ? `Your text color is only ${lk.wantedRatio}:1 here, so cards use ${lk.ink} (${lk.ratio}:1).` : `Text contrast ${lk.ratio}:1, ${lk.ratio >= PO.AAA ? 'passes AA and AAA' : 'passes AA'}.`);
    showContrast();
    ['startDepth', 'wrapAt', 'lines', 'lineColor', 'cardw', 'gap', 'accent', 'cardBg', 'cardColor', 'bg', 'bgColor', 'dotted', 'mode'].forEach(k => { const i = $('#pks-look-' + k); if (i && document.activeElement !== i) i.value = look[k]; });
    $('#pks-look-unitDesc').checked = look.unitDesc; $('#pks-look-expDate').checked = look.expDate; $('#pks-look-filters').checked = look.filters;
    FXK.forEach(([lk]) => { $('#pks-look-' + lk).checked = look[lk]; });
    ['expTitle', 'expName', 'page', 'orient', 'dir', 'deputyStyle', 'legend', 'newDays'].forEach(k => { const i = $('#pks-look-' + k); if (document.activeElement !== i) i.value = look[k]; });
    Object.assign(exp.o, { title: look.expTitle, date: look.expDate, name: look.expName || 'org-chart', page: look.page, orient: look.orient });
    $('#pks-look-cardw-out').value = look.cardw + ' px'; $('#pks-look-gap-out').value = look.gap + ' px';
    const yes = v => v ? 'Yes' : 'No', cap = s => s[0].toUpperCase() + s.slice(1);
    $('#pks-look-startDepth-out').value = look.startDepth ? look.startDepth + (look.startDepth === 1 ? ' level' : ' levels') : 'All';
    $('#pks-look-wrapAt-out').value = look.wrapAt ? look.wrapAt + ' cards' : 'Never';
    $('#pks-look-out').textContent = [
      `Levels open at start .. ${look.startDepth || 0}${look.startDepth ? '' : ' (all)'}`,
      `Stack rows wider than . ${look.wrapAt || 0}${look.wrapAt ? '' : ' (never)'}`,
      `Line style ............ ${cap(look.lines)}`,
      `Line color ............ ${look.lineColor}`,
      `Card width ............ ${look.cardw}`,
      `Spacing ............... ${look.gap}`,
      `Accent color .......... ${look.accent}`,
      `Card background ....... ${look.cardBg || '(empty)'}`,
      `Card text color ....... ${look.cardColor || '(empty: automatic)'}`,
      `Chart background ...... ${{ default: 'Default (soft panel)', transparent: 'Transparent', custom: 'Custom color ' + look.bgColor }[look.bg]}`,
      `Dotted-line managers .. ${{ hover: 'On hover', always: 'Always', off: 'Off (details panel only)' }[look.dotted]}`,
      `Start in .............. ${look.mode === 'sad' ? 'Sad mode' : 'Sparkle'}`,
      `Unit descriptions on cards ... ${yes(look.unitDesc)}`,
      `Chart direction ....... ${look.dir === 'right' ? 'Left to right' : 'Top to bottom'}`,
      `Deputies .............. ${{ inside: 'Inside the leader\'s card', beside: 'Beside the leader', stem: 'Shared stem (under the leader)' }[look.deputyStyle]}`,
      `Color key ............. ${look.legend.trim() ? '\n  ' + look.legend.trim().split(/\r?\n/).join('\n  ') : '(empty)'}`,
      `Filters (Controls tab)  ${look.filters ? 'Show' : 'Hide'}`,
      `New-hire tag for ...... ${look.newDays} days${look.newDays ? '' : ' (off)'}`,
      '',
      'Sparkle extras',
      ...FXK.map(([lk, k]) => `${(FXL[k] + ' ').padEnd(23, '.')} ${look[lk] ? 'Yes' : 'No'}`),
      '',
      'Export tab',
      `Title on exports ...... ${look.expTitle || '(empty)'}`,
      `'As of' date .......... ${look.expDate ? 'Show' : 'Hide'}`,
      `File name ............. ${look.expName || 'org-chart'}`,
      `Paper ................. ${look.page === 'a4' ? 'A4' : 'US Letter'}`,
      `Orientation ........... ${cap(look.orient === 'auto' ? 'automatic' : look.orient)}`
    ].join('\n');
    if (save) { store.set('pko-studio:look', look); render(true); }
  }
  $('#pks-look').addEventListener('input', e => {
    if (e.target.id === 'pks-look-cardBgPick') { look.cardBg = e.target.value; applyLook(true); return; }
    if (e.target.id === 'pks-look-cardColorPick') { look.cardColor = e.target.value; applyLook(true); return; }
    const k = e.target.id.replace('pks-look-', ''); if (!(k in LOOK_DEF)) return;
    look[k] = e.target.type === 'checkbox' ? e.target.checked : ['cardw', 'gap', 'startDepth', 'wrapAt', 'newDays'].includes(k) ? +e.target.value : e.target.value;
    if (k === 'startDepth') { applyLook(true); chart.load(rows); return; }
    if (k === 'mode') chart.setMode(look.mode, false);
    applyLook(true);
    if (k === 'dir' || k === 'deputyStyle') chart.fit();
  });
  $('#pks-look').addEventListener('click', e => { const c = e.target.closest('[data-lookclear]'); if (!c) return; look[c.dataset.lookclear] = ''; applyLook(true); });
  $('#pks-look-reset').addEventListener('click', () => { look = Object.assign({}, LOOK_DEF); chart.setMode(look.mode, false); applyLook(true); });

  /* ---------- tabs ---------- */
  function showTab(t) {
    tab = t;
    document.querySelectorAll('.pks-tab').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('.pks-panel').forEach(p => { p.hidden = p.dataset.panel !== t; });
    if (t === 'raw') refreshRaw();
    if (t === 'compare' && cmp) { cmp.d = diffRows(cmp.before, rows); showCompare(); }
  }
  $('.pks-tabs').addEventListener('click', e => { const b = e.target.closest('.pks-tab'); if (b) showTab(b.dataset.tab); });
  $('.pks-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...document.querySelectorAll('.pks-tab')], i = tabs.findIndex(b => b.dataset.tab === tab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; showTab(next.dataset.tab); next.focus();
  });

  /* ---------- files ---------- */
  const fmtOf = name => /\.csv$/i.test(name) ? 'csv' : 'json';
  const TYPES = { json: { description: 'Pecking Order JSON', accept: { 'application/json': ['.json'] } }, csv: { description: 'Pecking Order CSV', accept: { 'text/csv': ['.csv'] } } };
  function loadText(text, name, handle, quiet) {
    let next;
    try { next = PO.parse(text, name); } catch (x) { toast(`Couldn't read ${name}: ${x.message}`); return false; }
    if (!next.length) { toast(`${name} has no rows. Is the first line the column names?`); return false; }
    // Not a Pecking Order file (an HR export, say)? Match its columns first.
    const heads = [...new Set(next.flatMap(r => Object.keys(r)))];
    if (needsMap(heads)) { openMap(next, heads, name); return true; }
    useRows(next, { name, handle: handle || null, format: fmtOf(name) }, false);
    if (!quiet) toast(`Opened ${name}: ${rows.length} cards.`);
    return true;
  }
  function useRows(next, f, isDirty) {
    rows = next; file = f;
    undo = []; redo = []; editing = null; setDirty(isDirty); syncButtons();
    $('#pks-file').textContent = f.name; $('#pks-banner').hidden = true;
    chart.load(rows); showEditor(); refreshRaw(); saveDraftSoon(); updateSaveNote();
  }

  /* ---------- duplicate, sort ---------- */
  function duplicate() {
    const s = rowOf(editing); if (!s) return;
    const c = Object.assign({}, s, { id: uniqueId(s.name || s.title || s.id), name: s.name ? s.name + ' (copy)' : '' });
    change(() => { rows.splice(rows.indexOf(s) + 1, 0, c); editing = c.id; });
    chart.select(c.id, { center: true }); focusField('name');
    toast(`Copied ${label(s)}. Rename the copy.`);
  }
  function sortReports() {
    const s = rowOf(editing); if (!s) return;
    // Each kind sorts among itself (reports, staff, assistants), keeping the slots they already use.
    const kids = rows.filter(x => x.parent === s.id && !x.deputy_of), groups = new Map();
    kids.forEach(k => { const g = groupKey(k); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(k); });
    change(() => groups.forEach(list => {
      const at = list.map(k => rows.indexOf(k)), sorted = [...list].sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }));
      at.forEach((i, j) => { rows[i] = sorted[j]; });
    }));
    chart.select(s.id); toast(`Sorted ${label(s)}'s ${kids.length} reports A–Z.`);
  }

  /* ---------- bulk edit: Ctrl/⌘ or Shift + click to pick several ---------- */
  function markPicked() {
    document.querySelectorAll('#pks-chart .pks-picked').forEach(e => e.classList.remove('pks-picked'));
    picked.forEach(id => { const p = document.querySelector(`#pks-chart .pko-person[data-id="${CSS.escape(id)}"]`); if (p) p.classList.add('pks-picked'); });
  }
  $('#pks-chart').addEventListener('click', e => {
    if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;
    const p = e.target.closest('.pko-person'); if (!p) return;
    e.preventDefault(); e.stopPropagation();
    if (!picked.size && editing) picked.add(editing);
    if (picked.has(p.dataset.id)) picked.delete(p.dataset.id); else picked.add(p.dataset.id);
    if (picked.size === 1) { editing = [...picked][0]; picked.clear(); }
    markPicked(); showTab('edit'); showEditor();
  }, true);
  const BULK = [['department', 'Department'], ['location', 'Location'], ['office', 'Office'], ['roles', 'Roles'], ['accent', 'Accent color'], ['background', 'Card background'], ['color', 'Card text color'], ['class', 'CSS class']];
  function showBulk(box) {
    const ppl = [...picked].map(rowOf).filter(Boolean);
    const h = el('div', 'pks-who'); h.append(el('h2', null, `${ppl.length} people selected`));
    const names = el('p', 'pks-hint', ppl.map(label).join(', '));
    const tip = el('p', 'pks-hint', 'Fill in only what should change; empty fields are left as they are. Ctrl/⌘ or Shift + click adds or removes people.');
    const g = el('div', 'pks-grid');
    BULK.forEach(([k, l]) => {
      const w = el('div', 'pks-f'), lab = el('label', null, l), i = el('input'); i.type = 'text'; i.id = 'pks-bulk-' + k; i.dataset.bk = k; lab.htmlFor = i.id;
      const vals = [...new Set(ppl.map(p => p[k] || ''))]; i.placeholder = vals.length === 1 && vals[0] ? vals[0] + ' (all)' : '(leave as is)';
      w.append(lab, i); g.append(w);
    });
    const mw = el('div', 'pks-f'), ml = el('label', null, 'Move all to report to'), ms = el('select'); ms.id = 'pks-bulk-parent'; ml.htmlFor = ms.id;
    ms.append(new Option('(leave as is)', ''), ...rows.filter(x => !x.deputy_of && !picked.has(x.id)).map(x => new Option(label(x) + (x.title && x.name ? ` (${x.title})` : ''), x.id)));
    mw.append(ml, ms); g.append(mw);
    const acts = el('div', 'pks-acts');
    [['Apply to ' + ppl.length + ' people', 'apply', 'btn-primary'], ['Clear selection', 'clear', ''], [`Delete ${ppl.length} people`, 'delete', 'btn-danger']].forEach(([t, a, c]) => { const b = el('button', 'btn' + (c ? ' ' + c : ''), t); b.type = 'button'; b.dataset.bulk = a; acts.append(b); });
    box.replaceChildren(h, names, tip, g, acts);
  }
  function bulkAction(a) {
    const ppl = [...picked].map(rowOf).filter(Boolean);
    if (a === 'clear') { picked.clear(); markPicked(); showEditor(); return; }
    if (a === 'delete') {
      if (!confirm(`Delete ${ppl.length} people? Anyone reporting to them moves up to the nearest boss who stays.`)) return;
      const gone = new Set(ppl.map(p => p.id)), keepUp = id => { let r = rowOf(id); while (r && gone.has(r.id)) r = rowOf(r.parent); return r ? r.id : ''; };
      change(() => {
        rows.forEach(r => { if (gone.has(r.id)) return; if (gone.has(r.deputy_of)) r.deputy_of = ''; if (gone.has(r.parent)) r.parent = keepUp(r.parent); if (r.also_reports_to) r.also_reports_to = r.also_reports_to.split(/[;|]/).map(x => x.trim()).filter(x => x && !gone.has(x)).join(';'); });
        rows = rows.filter(r => !gone.has(r.id)); editing = null;
      });
      picked.clear(); markPicked(); showEditor(); toast(`Deleted ${ppl.length} people.`); return;
    }
    const set = {}; document.querySelectorAll('#pks-edit [data-bk]').forEach(i => { if (i.value.trim()) set[i.dataset.bk] = i.value.trim(); });
    const to = $('#pks-bulk-parent').value; let skipped = 0;
    if (!Object.keys(set).length && !to) { toast('Nothing to change: fill in a field first.'); return; }
    change(() => ppl.forEach(p => {
      Object.assign(p, set);
      if (to) { if (to === p.id || isUnder(to, p.id)) skipped++; else { p.parent = to; p.deputy_of = ''; } }
    }), { editor: false });
    showEditor();
    toast(`Updated ${ppl.length} people.` + (skipped ? ` ${skipped} couldn't move under someone who reports to them.` : ''));
  }

  /* ---------- compare two files ---------- */
  const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
  function diffRows(before, after) {
    const B = new Map(before.map(r => [r.id, r])), A = new Map(after.map(r => [r.id, r]));
    const boss = x => x.deputy_of ? 'deputy of ' + x.deputy_of : (x.parent || '');
    const out = { added: after.filter(r => !B.has(r.id)), removed: before.filter(r => !A.has(r.id)), moved: [], changed: [] };
    after.forEach(r => {
      const o = B.get(r.id); if (!o) return;
      if (boss(o) !== boss(r) || !same(o.placement, r.placement)) out.moved.push({ r, o });
      const keys = [...new Set([...Object.keys(o), ...Object.keys(r)])].filter(k => k[0] !== '_' && !['id', 'parent', 'deputy_of', 'placement'].includes(k) && !same(o[k], r[k]));
      if (keys.length) out.changed.push({ r, o, keys });
    });
    return out;
  }
  function markDiff() {
    const root = $('#pks-chart'); root.querySelectorAll('.pks-d-add, .pks-d-move, .pks-d-chg').forEach(e => e.classList.remove('pks-d-add', 'pks-d-move', 'pks-d-chg'));
    root.classList.toggle('pks-diff', !!cmp); if (!cmp) return;
    const mark = (list, cls) => list.forEach(x => { const id = (x.r || x).id, p = root.querySelector(`.pko-person[data-id="${CSS.escape(id)}"]`); if (p) p.classList.add(cls); });
    mark(cmp.d.changed, 'pks-d-chg'); mark(cmp.d.moved, 'pks-d-move'); mark(cmp.d.added, 'pks-d-add');
  }
  function showCompare() {
    const out = $('#pks-cmp-out'); if (!cmp) { out.replaceChildren(); $('#pks-cmp-stop').hidden = true; return; }
    $('#pks-cmp-stop').hidden = false;
    const d = cmp.d, nm = id => { const r = rowOf(id) || cmp.before.find(x => x.id === id); return r ? (r.unit && !r.name ? r.unit : label(r)) : id || 'the top'; };
    const parts = [el('p', 'pks-cmp-sum', `Since ${cmp.name}: ${d.added.length} added · ${d.removed.length} removed · ${d.moved.length} moved · ${d.changed.length} changed`)];
    const sec = (title, cls, list, line) => {
      if (!list.length) return;
      parts.push(el('h2', 'pks-cmp-h ' + cls, `${title} (${list.length})`));
      const ul = el('ul', 'pks-cmp-list');
      list.forEach(x => {
        const r = x.r || x, li = el('li'), gone = title === 'Removed';
        const b = el(gone ? 'span' : 'button', gone ? 'pks-cmp-name' : 'pks-cmp-name pks-linkbtn', label(r) + (r.title && r.name ? ` (${r.title})` : ''));
        if (!gone) { b.type = 'button'; b.dataset.go = r.id; }
        li.append(b); const t = line && line(x); if (t) li.append(el('span', 'pks-cmp-what', t)); ul.append(li);
      });
      parts.push(ul);
    };
    const short = v => { v = String(v ?? '').trim(); return v ? (v.length > 40 ? v.slice(0, 39) + '…' : v) : '(empty)'; };
    sec('Added', 'is-add', d.added, r => r.parent ? 'reports to ' + nm(r.parent) : '');
    sec('Moved', 'is-move', d.moved, x => {
      const was = x.o.deputy_of ? 'deputy of ' + nm(x.o.deputy_of) : 'reported to ' + nm(x.o.parent), now = x.r.deputy_of ? 'deputy of ' + nm(x.r.deputy_of) : 'reports to ' + nm(x.r.parent);
      return was === now.replace('reports', 'reported') ? `placement ${short(x.o.placement)} → ${short(x.r.placement)}` : `${now} (${was})`;
    });
    sec('Changed', 'is-chg', d.changed, x => x.keys.slice(0, 3).map(k => `${k}: ${short(x.o[k])} → ${short(x.r[k])}`).join(' · ') + (x.keys.length > 3 ? ` · +${x.keys.length - 3} more` : ''));
    sec('Removed', 'is-del', d.removed, r => r.parent ? 'reported to ' + nm(r.parent) : '');
    if (!d.added.length && !d.removed.length && !d.moved.length && !d.changed.length) parts.push(el('p', 'pks-hint', 'No differences. These two files hold the same chart.'));
    out.replaceChildren(...parts);
  }
  async function readCompare(f) {
    let r; try { r = PO.parse(await f.text(), f.name); } catch (x) { toast(`Couldn't read ${f.name}: ${x.message}`); return; }
    if (!r.length) { toast(`${f.name} has no rows.`); return; }
    if (needsMap([...new Set(r.flatMap(x => Object.keys(x)))])) { toast(`${f.name} isn't in Pecking Order columns. Open it first to match its columns, save it, then compare.`); return; }
    cmp = { name: f.name, before: r, d: diffRows(r, rows) }; markDiff(); showCompare();
  }
  $('#pks-cmp-open').addEventListener('click', async () => {
    if (CAN_PICK) { try { const [h] = await window.showOpenFilePicker({ types: [{ description: 'Org chart data', accept: { 'application/json': ['.json'], 'text/csv': ['.csv'] } }] }); readCompare(await h.getFile()); return; } catch (x) { if (x.name === 'AbortError') return; } }
    $('#pks-cmp-input').click();
  });
  $('#pks-cmp-input').addEventListener('change', e => { const f = e.target.files[0]; if (f) readCompare(f); e.target.value = ''; });
  $('#pks-cmp-stop').addEventListener('click', () => { cmp = null; markDiff(); showCompare(); });
  $('#pks-cmp-out').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; editing = b.dataset.go; chart.select(editing, { center: true }); showTab('edit'); showEditor(); });

  /* ---------- HR exports: match their columns to ours ---------- */
  const OURS = [
    ['id', 'ID', ['id', 'employee id', 'employee number', 'employee no', 'emp id', 'emp no', 'person id', 'worker id', 'staff id', 'personnel number', 'badge']],
    ['parent', 'Reports to (their manager)', ['parent', 'manager id', 'supervisor id', 'reports to id', 'manager employee id', 'mgr id', 'manager number', 'reports to', 'manager', 'supervisor', 'line manager', 'manager name', 'supervisor name']],
    ['name', 'Name', ['name', 'full name', 'employee name', 'display name', 'preferred name', 'worker name']],
    ['title', 'Title', ['title', 'job title', 'position', 'position title', 'job', 'job name', 'role']],
    ['department', 'Department', ['department', 'dept', 'department name', 'division', 'team', 'org unit', 'business unit', 'organization']],
    ['location', 'Location', ['location', 'work location', 'site', 'city', 'location name', 'work site']],
    ['office', 'Office or room', ['office', 'building', 'room', 'office location', 'desk']],
    ['email', 'Email', ['email', 'e mail', 'work email', 'email address', 'business email']],
    ['phone', 'Phone', ['phone', 'work phone', 'phone number', 'telephone', 'mobile', 'business phone', 'extension']],
    ['start_date', 'Start date', ['start date', 'hire date', 'date of hire', 'start', 'original hire date', 'date hired', 'seniority date']],
    ['vacant', 'Open role (vacant)', ['vacant', 'vacancy', 'is vacant', 'open', 'position status']],
    ['photo', 'Photo', ['photo', 'picture', 'image', 'photo url']]
  ];
  const normH = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const needsMap = heads => !(heads.includes('id') && (heads.includes('name') || heads.includes('title')));
  function guessMap(heads) {
    const map = {}, used = new Set(), nh = heads.map(h => [h, normH(h)]);
    // Exact names first, then headers that contain a specific name ("Primary Work Email").
    [0, 1].forEach(pass => OURS.forEach(([k, , syn]) => {
      if (map[k]) return;
      const hit = nh.find(([h, n]) => !used.has(h) && syn.some(s => pass ? s.length > 4 && n.includes(s) : n === s));
      if (hit) { map[k] = hit[0]; used.add(hit[0]); }
    }));
    if (!map.name) {
      const f = nh.find(([h, n]) => !used.has(h) && /\b(first|given)\b/.test(n)), l = nh.find(([h, n]) => !used.has(h) && /\b(last|surname|family)\b/.test(n));
      if (f && l) map.name = '+' + f[0] + '+' + l[0];
    }
    return map;
  }
  const mval = (r, src) => !src ? '' : src.startsWith('+') ? src.slice(1).split('+').map(h => String(r[h] || '').trim()).filter(Boolean).join(' ') : String(r[src] || '').trim();
  const swapName = s => { const m = s.match(/^\s*([^,]+),\s*(.+)$/); return m ? `${m[2]} ${m[1]}` : s; };
  function toISO(v, how) {
    v = String(v || '').trim(); if (!v) return '';
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) return v.slice(0, 10).replace(/-(\d)(?=-|$)/g, '-0$1');
    const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (!m) return '';
    let [a, b, y] = [+m[1], +m[2], +m[3]]; if (y < 100) y += 2000;
    const [mo, d] = how === 'dmy' ? [b, a] : [a, b];
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  }
  function applyMap(raw, map, o) {
    const out = raw.map(r => { const p = {}; OURS.forEach(([k]) => { if (k === 'parent') return; const v = mval(r, map[k]); if (v) p[k] = v; }); return p; });
    const seen = new Set(), byOld = new Map(), byName = new Map();
    out.forEach((p, i) => {
      const old = mval(raw[i], map.id);
      let id = old ? old.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') : slug(p.name || p.title || 'p');
      if (!id) id = 'p';
      const base = id; let n = 2; while (seen.has(id)) id = `${base}-${n++}`;
      seen.add(id); p.id = id; if (old) byOld.set(old, id);
      if (p.name) { const k = normH(p.name); byName.set(k, byName.has(k) ? null : id); }
      if (p.start_date) p.start_date = toISO(p.start_date, o.dates);
      if (p.vacant) p.vacant = /^(1|y|yes|true|open|vacant)$/i.test(p.vacant) ? '1' : '';
      if (!p.start_date) delete p.start_date; if (!p.vacant) delete p.vacant;
    });
    let missing = 0;
    out.forEach((p, i) => {
      const m = mval(raw[i], map.parent); if (!m) return;
      const t = o.mgr === 'name' ? (byName.get(normH(m)) || byName.get(normH(swapName(m)))) : byOld.get(m);
      if (t && t !== p.id) p.parent = t; else missing++;
    });
    // Ours go first in the column order; parent right after id.
    return { rows: out.map(p => { const q = { id: p.id }; if (p.parent) q.parent = p.parent; Object.assign(q, p); return q; }), missing };
  }
  function openMap(raw, heads, name) {
    const dlg = $('#pks-map'), grid = $('#pks-map-grid'), key = 'pko-studio:map:' + [...heads].sort().join('|');
    const saved = store.get(key), map = (saved && saved.map) || guessMap(heads);
    // Manager column: IDs or names? Whichever matches more people. Dates: day first if any first part is over 12.
    const guessMgr = () => {
      const ids = new Set(raw.map(r => mval(r, map.id)).filter(Boolean)), names = new Set(raw.map(r => normH(mval(r, map.name))).filter(Boolean));
      let a = 0, b = 0; raw.forEach(r => { const m = mval(r, map.parent); if (!m) return; if (ids.has(m)) a++; if (names.has(normH(m)) || names.has(normH(swapName(m)))) b++; });
      return b > a ? 'name' : 'id';
    };
    const guessDates = () => raw.some(r => { const m = mval(r, map.start_date).match(/^(\d{1,2})[/.-](\d{1,2})[/.-]/); return m && +m[1] > 12; }) ? 'dmy' : 'mdy';
    grid.replaceChildren();
    const pairs = [];
    heads.forEach(h => { const n = normH(h); if (/\b(first|given)\b/.test(n)) heads.forEach(h2 => { if (/\b(last|surname|family)\b/.test(normH(h2))) pairs.push('+' + h + '+' + h2); }); });
    OURS.forEach(([k, lab]) => {
      const id = 'pks-map-' + k, l = el('label', null, lab); l.htmlFor = id;
      const s = el('select'); s.id = id; s.dataset.k = k;
      s.append(new Option('(not in this file)', ''), ...heads.map(h => new Option(h, h, false, map[k] === h)));
      if (k === 'name') pairs.forEach(p => s.append(new Option(p.slice(1).split('+').join(' + '), p, false, map.name === p)));
      if (k === 'id') s.options[0].text = '(none: make IDs from names)';
      grid.append(l, s);
    });
    $('#pks-map-mgr').value = (saved && saved.mgr) || guessMgr();
    $('#pks-map-dates').value = (saved && saved.dates) || guessDates();
    const read = () => { const m = {}; grid.querySelectorAll('select').forEach(s => { if (s.value) m[s.dataset.k] = s.value; }); return m; };
    const preview = () => {
      const m = read(), o = { mgr: $('#pks-map-mgr').value, dates: $('#pks-map-dates').value };
      $('#pks-map-dates-row').hidden = $('#pks-map-dates-row-l').hidden = !m.start_date;
      if (!m.name && !m.title) { $('#pks-map-sum').textContent = 'Pick at least a Name or a Title column.'; $('#pks-map-ok').disabled = true; return null; }
      const r = applyMap(raw, m, o), model = PO.build(r.rows);
      const bits = [`${r.rows.length} people`, `${model.roots.length} at the top`];
      if (r.missing) bits.push(`${r.missing} manager${r.missing > 1 ? 's' : ''} not found in the file`);
      if (model.errs.length) bits.push(`${model.errs.length} problem${model.errs.length > 1 ? 's' : ''} (see Problems after)`);
      $('#pks-map-sum').textContent = bits.join(' · ') + (model.roots.length > 3 ? '. Many people at the top usually means the Reports to column or its IDs/Names choice is off.' : '.');
      $('#pks-map-ok').disabled = false;
      return { r, m, o };
    };
    dlg.oninput = dlg.onchange = preview;
    preview();
    dlg.onclose = () => {
      if (dlg.returnValue !== 'ok') { toast(`Left ${name} closed.`); return; }
      const p = preview(); if (!p) return;
      store.set(key, { map: p.m, mgr: p.o.mgr, dates: p.o.dates });
      const base = name.replace(/\.[^.]+$/, '');
      useRows(p.r.rows, { name: base + '-pecking-order.json', handle: null, format: 'json' }, true);
      toast(`Matched ${p.r.rows.length} people from ${name}. Save keeps a Pecking Order copy; your original file isn't changed.`);
    };
    dlg.returnValue = ''; dlg.showModal();
  }
  const okToLeave = () => !dirty || confirm('You have unsaved changes. Continue without saving them?');
  async function openFile() {
    if (!okToLeave()) return;
    if (CAN_PICK) {
      try {
        const [h] = await window.showOpenFilePicker({ types: [{ description: 'Org chart data', accept: { 'application/json': ['.json'], 'text/csv': ['.csv'] } }] });
        const f = await h.getFile(); loadText(await f.text(), f.name, h); return;
      } catch (x) { if (x.name === 'AbortError') return; }
    }
    $('#pks-input').click();
  }
  $('#pks-input').addEventListener('change', async e => { const f = e.target.files[0]; if (f) loadText(await f.text(), f.name, null); e.target.value = ''; });
  function textFor(fmt) { return fmt === 'csv' ? PO.toCSV(rows) : PO.toJSON(rows); }
  function download(text, name, fmt) {
    const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: fmt === 'csv' ? 'text/csv' : 'application/json' }));
    a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function write(handle, text) {
    if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permission to save was not given.');
    }
    const w = await handle.createWritable(); await w.write(text); await w.close();
  }
  async function save() {
    if (file.handle && file.handle.createWritable) {
      try { await write(file.handle, textFor(file.format)); setDirty(false); toast(`Saved ${file.name}.`); return; }
      catch (x) { if (x.name === 'AbortError') return; toast(`Couldn't save in place (${x.message}). Choose where to save instead.`); }
    }
    saveAs(file.format);
  }
  async function saveAs(fmt) {
    const base = file.name.replace(/\.(json|csv)$/i, '') || 'org-chart', name = `${base}.${fmt}`, text = textFor(fmt);
    if (CAN_SAVE_AS) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: name, types: [TYPES[fmt]] });
        await write(h, text);
        file = { name: h.name, handle: h, format: fmtOf(h.name) }; $('#pks-file').textContent = h.name;
        setDirty(false); updateSaveNote(); toast(`Saved ${h.name}.`); return;
      } catch (x) { if (x.name === 'AbortError') return; }
    }
    download(text, name, fmt);
    if (fmt === file.format) setDirty(false);
    toast(`Downloaded ${name}.`);
  }
  function updateSaveNote() {
    $('#pks-savenote').textContent = !CAN_SAVE_AS ? 'This browser saves by downloading a copy.' : file.handle ? `Save writes straight to ${file.name}.` : 'Save asks where to put the file the first time.';
  }
  function newChart() {
    if (!okToLeave()) return;
    rows = []; file = { name: 'untitled.json', handle: null, format: 'json' };
    undo = []; redo = []; editing = null; setDirty(false); syncButtons(); $('#pks-file').textContent = file.name;
    chart.load(rows); showEditor(); updateSaveNote(); saveDraftSoon();
  }
  function loadSample() {
    if (!okToLeave()) return;
    loadText($('#pks-sample').textContent.trim(), 'pecking-order-sample.csv', null, true);
    file.name = 'pecking-order-sample.json'; file.format = 'json'; $('#pks-file').textContent = file.name; setDirty(false);
  }

  /* drag a file onto the page */
  window.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('is-dropping'); } });
  window.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('is-dropping'); });
  window.addEventListener('drop', async e => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault(); document.body.classList.remove('is-dropping');
    if (!okToLeave()) return;
    const item = e.dataTransfer.items && e.dataTransfer.items[0];
    let handle = null;
    if (item && item.getAsFileSystemHandle) { try { handle = await item.getAsFileSystemHandle(); } catch (x) { handle = null; } }
    const f = handle && handle.kind === 'file' ? await handle.getFile() : e.dataTransfer.files[0];
    if (f) loadText(await f.text(), f.name, handle && handle.kind === 'file' ? handle : null);
  });

  /* ---------- draft autosave ---------- */
  function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(() => store.set('pko-studio:draft', { rows, name: file.name, dirty, t: Date.now() }), 600); }

  /* ---------- toolbar + keys ---------- */
  $('#pks-new').onclick = newChart; $('#pks-open').onclick = openFile; $('#pks-save').onclick = save;
  $('#pks-savejson').onclick = () => saveAs('json'); $('#pks-savecsv').onclick = () => saveAs('csv');
  $('#pks-undo').onclick = () => restore(undo, redo); $('#pks-redo').onclick = () => restore(redo, undo);
  $('#pks-sample-btn').onclick = loadSample;
  $('#pks-copyprompt').onclick = async () => {
    const t = $('#pks-prompt').textContent;
    try { await navigator.clipboard.writeText(t); toast('Prompt copied.'); }
    catch (x) { const r = document.createRange(); r.selectNodeContents($('#pks-prompt')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Press Ctrl+C to copy.'); }
  };
  $('#pks-aiex-save').onclick = () => download($('#pks-aiex').textContent.trim() + '\n', 'pecking-order-ai-example.json', 'json');
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); if (e.shiftKey) saveAs(file.format); else save(); }
    else if (k === 'o') { e.preventDefault(); openFile(); }
    else if (!typing && k === 'z') { e.preventDefault(); if (e.shiftKey) restore(redo, undo); else restore(undo, redo); }
    else if (!typing && k === 'y') { e.preventDefault(); restore(redo, undo); }
  });
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) { const t = $('#pks-toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200); }

  /* ---------- start ---------- */
  chart.setMode(look.mode, false);
  applyLook(false);
  updateSaveNote();
  const draft = store.get('pko-studio:draft');
  // Opened from the module's Data tools: the file arrives through this browser's storage (works for locked folders too).
  let incoming = null;
  if (new URLSearchParams(location.search).get('incoming')) {
    incoming = store.get('pko-studio:incoming');
    try { localStorage.removeItem('pko-studio:incoming'); } catch (x) { /* storage blocked */ }
    if (!incoming || !incoming.text || Date.now() - (incoming.t || 0) > 600000) incoming = null;
    try { history.replaceState(null, '', location.pathname); } catch (x) { /* file:// */ }
  }
  const src = new URLSearchParams(location.search).get('src');
  let srcUrl = null;
  try { if (src) { const u = new URL(src, location.href); if (u.origin === location.origin && /\.(json|csv)$/i.test(u.pathname)) srcUrl = u; } } catch (x) { srcUrl = null; }
  if (incoming) {
    loadSample();
    if (!(draft && draft.dirty) || confirm(`Studio has an unsaved draft (${draft.name}). Replace it with ${incoming.name}?`)) {
      if (loadText(incoming.text, incoming.name || 'chart.json', null)) toast('Opened from your site. Save downloads a copy; upload it to replace the file.');
    }
  } else if (srcUrl) {
    // Opened from the module settings: load that site file (Save downloads a copy you then re-upload).
    loadSample();
    fetch(srcUrl.href, { cache: 'no-store', credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(t => {
        if (draft && draft.dirty && !confirm(`Studio has an unsaved draft (${draft.name}). Replace it with ${decodeURIComponent(srcUrl.pathname.split('/').pop())}?`)) return;
        if (loadText(t, decodeURIComponent(srcUrl.pathname.split('/').pop()), null)) toast('Opened from your site. Save downloads a copy; upload it to replace the file.');
      })
      .catch(x => toast(`Couldn't load ${src}: ${x.message}`));
  } else if (draft && Array.isArray(draft.rows) && draft.rows.length) {
    rows = draft.rows; file = { name: draft.name || 'untitled.json', handle: null, format: fmtOf(draft.name || '') };
    $('#pks-file').textContent = file.name; setDirty(!!draft.dirty); chart.load(rows); showEditor();
    $('#pks-banner-text').textContent = `Picked up where you left off: ${file.name}, last edited ${new Date(draft.t).toLocaleString()}.` + (draft.dirty ? ' It had unsaved changes.' : '');
    $('#pks-banner').hidden = false;
  } else {
    loadSample();
  }
  $('#pks-banner-dismiss').onclick = () => { $('#pks-banner').hidden = true; };
  $('#pks-banner-sample').onclick = () => { $('#pks-banner').hidden = true; setDirty(false); loadSample(); };
  syncButtons();
})();
