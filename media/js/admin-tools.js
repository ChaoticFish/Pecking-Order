/*! Pecking Order admin tools | Chaotic Fish Design | GPL v2 */
(() => {
  'use strict';
  const T = (k, ...args) => {
    let s = (window.Joomla && Joomla.Text && Joomla.Text._(k)) || k;
    args.forEach(a => { s = s.replace('%s', a); });
    return s;
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function setup(box) {
    const result = box.querySelector('.pko-tools-result');
    const privacy = box.querySelector('.pko-tools-privacy');
    const chartBox = box.querySelector('.pko-tools-chart');
    const savedTag = box.querySelector('script.pko-tools-saved');
    let savedText = null;
    try { savedText = savedTag ? JSON.parse(savedTag.textContent) : null; } catch (e) { savedText = null; }
    let chart = null;

    // Which file the form points at right now, following the Data source switch.
    const value = () => {
      const f = document.getElementById(box.dataset.fileField);
      const p = document.getElementById(box.dataset.pathField);
      const src = document.querySelector(`input[name="${box.dataset.sourceName}"]:checked`);
      const media = ((f && f.value) || '').split('#')[0].trim(), path = ((p && p.value) || '').trim();
      if (src && src.value === 'path') return path || media;
      return media || path;
    };
    const urlOf = v => {
      if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
      return box.dataset.root.replace(/\/$/, '') + '/' + v.replace(/^[/\\]+/, '');
    };
    const say = (target, cls, text, items) => {
      const p = el('p', cls, text); target.replaceChildren(p);
      if (items && items.length) { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); target.append(ul); }
      return p;
    };
    const applyLook = () => {
      const get = id => { const e = document.getElementById('jform_params_' + id); return e ? e.value : ''; };
      const s = chartBox.style;
      if (get('line_style')) s.setProperty('--pko-ls', get('line_style'));
      if (get('line_color')) s.setProperty('--pko-line', get('line_color'));
      if (get('accent')) s.setProperty('--pko-base', get('accent'));
      if (+get('card_width')) s.setProperty('--pko-cardw', get('card_width') + 'px');
      if (+get('gap')) s.setProperty('--pko-gap', get('gap') + 'px');
      const bg = get('chart_bg');
      s.setProperty('--pko-viewbg', bg === 'transparent' ? 'transparent' : bg === 'custom' ? get('chart_bg_color') : '');
      s.setProperty('--pko-viewbd', bg === 'transparent' ? 'transparent' : '');
      if (chart) {
        chart.set('dotted', get('dotted_lines') || 'hover');
        chart.set('cardBg', get('card_bg')); chart.set('cardColor', get('card_color'));
        chart.set('wrapAt', get('wrap_at') === '' ? 6 : +get('wrap_at'));
      }
    };

    // The file's text: the server's copy of the saved file (works even when the folder is locked),
    // otherwise read straight from the site.
    async function readFile(v) {
      if (v === box.dataset.saved && savedText != null) return savedText;
      const url = urlOf(v);
      if (!url) throw new Error(T('MOD_PECKINGORDER_TOOLS_URL_ONLY'));
      const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      if (!r.ok) throw new Error(v !== box.dataset.saved ? T('MOD_PECKINGORDER_TOOLS_UNSAVED') : 'HTTP ' + r.status);
      return r.text();
    }

    // Can a visitor download the saved file directly? Offer to lock its folder if so.
    async function checkPrivacy() {
      privacy.replaceChildren();
      const v = box.dataset.saved, url = urlOf(v);
      if (!v || !url) return;
      let open = false;
      try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'omit' }); open = r.ok; } catch (e) { open = false; }
      if (!open) { say(privacy, 'pko-tools-ok', T('MOD_PECKINGORDER_TOOLS_PRIVATE')); return; }
      say(privacy, 'pko-tools-warn', T('MOD_PECKINGORDER_TOOLS_PUBLIC', v));
      if (box.dataset.protect) {
        const a = el('a', 'btn btn-sm btn-warning', T('MOD_PECKINGORDER_TOOLS_PROTECT')); a.href = box.dataset.protect;
        privacy.append(a);
      }
    }

    box.querySelector('[data-pko-check]').addEventListener('click', async () => {
      const v = value();
      if (!v) { say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_NO_FILE')); return; }
      say(result, '', T('MOD_PECKINGORDER_TOOLS_LOADING', v));
      let rows;
      try { rows = window.PeckingOrder.parse(await readFile(v), v); }
      catch (e) { say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_FAILED', v, e.message)); chartBox.hidden = true; return; }
      const model = window.PeckingOrder.build(rows);
      const errs = model.errs.map(e => (e.id ? `"${e.id}" ` : '') + e.msg);
      if (errs.length) say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_PROBLEMS', rows.length, errs.length), errs);
      else say(result, 'pko-tools-ok', T('MOD_PECKINGORDER_TOOLS_OK', rows.length));
      chartBox.hidden = false;
      if (!chart) chart = window.PeckingOrder.init(chartBox, [], { showErrors: false, onPick: () => {} });
      applyLook(); chart.load(rows);
      if (v === box.dataset.saved) checkPrivacy();
    });

    // Studio is on this same site, so the file travels through this browser's storage, never a URL.
    box.querySelector('[data-pko-open]').addEventListener('click', async () => {
      const v = value();
      if (!v) { say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_NO_FILE')); return; }
      let text;
      try { text = await readFile(v); } catch (e) { say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_FAILED', v, e.message)); return; }
      try { localStorage.setItem('pko-studio:incoming', JSON.stringify({ name: v.split('/').pop(), text, t: Date.now() })); }
      catch (e) { say(result, 'pko-tools-bad', T('MOD_PECKINGORDER_TOOLS_FAILED', v, e.message)); return; }
      window.open(box.dataset.studio + '?incoming=1', '_blank', 'noopener');
    });

    if (box.dataset.saved) checkPrivacy();
  }

  /* Browse next to File path: Joomla's full Media Manager in Joomla's own dialog, the way its media field opens it. */
  // "local-files:/orgcharts/chart.json" → "files/orgcharts/chart.json"; anything not on this site's disk → null.
  const pathOf = item => {
    const m = item && item.type !== 'dir' && String(item.path || '').match(/^local-([^:]+):\/?(.*)$/);
    return m ? (m[1].replace(/^\/+|\/+$/g, '') + '/' + m[2].replace(/^\/+/, '')).replace(/\/+$/, '') : null;
  };
  const warn = msg => { if (window.Joomla && Joomla.renderMessages) Joomla.renderMessages({ warning: [msg] }); else window.alert(msg); };
  let browsing = false;
  async function browse(btn) {
    const input = document.getElementById(btn.dataset.input);
    if (!input || browsing) return;
    const JD = customElements.get('joomla-dialog') || await Promise.race([customElements.whenDefined('joomla-dialog'), new Promise(r => setTimeout(() => r(null), 4000))]);
    if (!JD) { warn(T('MOD_PECKINGORDER_BROWSE_NO_DIALOG')); return; }
    browsing = true;
    let picked = null;
    const onPick = e => { picked = e.detail; };
    document.addEventListener('onMediaFileSelected', onPick);
    const use = () => {
      const p = pathOf(picked);
      if (!picked || !picked.path || picked.type === 'dir') { warn(T('MOD_PECKINGORDER_BROWSE_NOT_DATA')); return; }
      if (!p) { warn(T('MOD_PECKINGORDER_BROWSE_NOT_LOCAL')); return; }
      if (!/\.(json|csv)$/i.test(p)) { warn(T('MOD_PECKINGORDER_BROWSE_NOT_DATA')); return; }
      input.value = p;
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      dlg.close();
    };
    const dlg = new JD({
      popupType: 'iframe', src: btn.dataset.url, textHeader: btn.dataset.title, width: '80vw', height: '80vh',
      popupButtons: [
        { label: T('JSELECT'), className: 'button button-success btn btn-success', location: 'header', onClick: use },
        { label: '', ariaLabel: T('JCLOSE'), className: 'button-close btn-close', data: { buttonClose: '', dialogClose: '' }, location: 'header' }
      ]
    });
    // Joomla's own media-select listener skips dialogs with this class, as it does for media fields.
    dlg.classList.add('joomla-dialog-media-field');
    dlg.addEventListener('joomla-dialog:close', () => {
      document.removeEventListener('onMediaFileSelected', onPick);
      if (window.Joomla && Joomla.Modal) Joomla.Modal.setCurrent(null);
      dlg.destroy(); browsing = false; btn.focus();
    });
    dlg.show();
    if (window.Joomla && Joomla.Modal) Joomla.Modal.setCurrent(dlg);
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.pko-browse'); if (b) { e.preventDefault(); browse(b); } });

  const start = () => document.querySelectorAll('.pko-tools').forEach(setup);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
