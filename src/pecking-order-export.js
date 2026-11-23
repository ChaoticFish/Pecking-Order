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
