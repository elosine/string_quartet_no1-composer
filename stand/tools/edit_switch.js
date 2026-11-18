// PORTED 2026-11-18 from paperSubmissions/papers/edit.js for the PLAYERS' PAGE of the quartet's film stand (stand/notation/app/help.html,
// served with this switch by stand/tools/edit_server.js, on the composer's computer only). Two changes: the page's name in the route is its
// path on that server, and the one message that named the paper server.
// Everything below is that file, whose own heading follows.
// PORTED 2026-10-13 from decibel_TENOR_2026/docs/notation_instructions/edit.js (his performance notes' edit switch) for the paper pages of this
// repo (CONCEPT_NOTES PS-60). Two changes only: the route (/api/page?f=<this page>, tools/serve.js) and the one message that named the
// score server. Everything below is that file.
// THE EDIT SWITCH of the performance instructions page (RUNNING_LOG §435, 2026-10-11 — his word: a format "where I can see it
// just like I see it now, and you can edit it, but I can also edit myself … I can click and type").
//
// The page IS the document: a small bar at the top right, Edit → every line of text is click-and-type in place → Save writes
// docs/notation_instructions/index.html through the score server (POST /api/instructions, score/server.js).
//
// HOW A SAVE IS MADE — the file is never rebuilt from what the browser shows. The file's own text is read (GET /api/instructions),
// parsed beside the page into a second, hidden document, and ONLY THE LINES HE CHANGED are written into that document; its <body>
// then replaces the file's <body>, the <head> kept character for character. So the comments between the sections (the record of
// what each image is and how to remake it), the order and the indentation all survive, and nothing a browser extension adds to
// the visible page can reach the file.
//
// WHAT HE CAN DO: type in any line · CTRL+I italic · CTRL+B bold · ENTER in a paragraph = a new paragraph (split at the caret) ·
// SHIFT+ENTER = a line break · BACKSPACE in an empty paragraph removes it · CTRL+S = Save. A paste comes in as plain text.
// WHAT STAYS THE AI's: a new heading, a new section, an image, a change of layout.
//
// TWO WRITERS, ONE FILE: the save carries the sha of the file as it was read. If the file has changed on disk since (the AI
// edited it), the server refuses (409) and the bar says to reload — neither writes over the other. The same check is made when
// Edit is pressed: a page older than its file is told to reload first.
//
// Loaded from the <head> of index.html (tools/export_print.js takes only the <body>, so the print score never sees it).
(function () {
  'use strict';
  if (!/^https?:$/.test(location.protocol)) return;            // a file:// copy: no server, no switch

  const API = '/api/page?f=' + encodeURIComponent(location.pathname);   // this repo's server (tools/serve.js): the route takes the page's own path
  const BLOCKS = 'h1,h2,h3,h4,p,li,figcaption,dt,dd,.piece-title,.piece-for,.piece-by';   // a "line": the innermost of these
  const SPLIT = { P: 1, LI: 1 };                                // ENTER makes another one of these; elsewhere it does nothing
  const D = new Map();                                          // a line on the page -> its element in the file's document (null = new)
  const ORIG = new Map();                                       // a line on the page -> its cleaned HTML at the last read or save
  let src = null, base = null, doc = null, docBlocks = [], editing = false, dirty = false, busy = false;

  // ── the bar ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent =
    '#ins-edit-ui{position:fixed;top:10px;right:14px;z-index:50;font:14px/1.3 Lato,sans-serif;display:flex;gap:8px;align-items:center;' +
    'background:rgba(255,255,255,.94);border:1px solid #ccc;border-radius:6px;padding:6px 8px;box-shadow:0 1px 4px rgba(0,0,0,.12);max-width:70vw}' +
    '#ins-edit-ui button{font:inherit;padding:4px 14px;border:1px solid #888;border-radius:4px;background:#fff;color:#222;cursor:pointer}' +
    '#ins-edit-ui button.primary{background:#2d3748;color:#fff;border-color:#2d3748}' +
    '#ins-edit-ui button[hidden]{display:none}' +
    '#ins-edit-ui .msg{color:#555}#ins-edit-ui .msg.bad{color:#b00020;font-weight:700}' +
    'body.ins-editing [contenteditable]{outline:1px dashed transparent;outline-offset:4px;border-radius:2px;min-height:1em}' +
    'body.ins-editing [contenteditable]:hover{outline-color:#bbb}' +
    'body.ins-editing [contenteditable]:focus{outline:1px dashed #5b9bf5;background:rgba(91,155,245,.07)}' +
    '@media print{#ins-edit-ui{display:none}}';
  const bar = document.createElement('div');
  bar.id = 'ins-edit-ui';
  bar.innerHTML = '<span class="msg"></span><button type="button" data-a="edit">Edit</button>' +
    '<button type="button" data-a="save" class="primary" hidden>Save</button><button type="button" data-a="done" hidden>Done</button>';
  const msg = bar.querySelector('.msg');
  const btn = a => bar.querySelector('[data-a="' + a + '"]');
  const say = (text, bad) => { msg.textContent = text || ''; msg.classList.toggle('bad', !!bad); };

  function mount() {
    document.head.appendChild(css);
    document.body.appendChild(bar);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const norm = s => String(s).replace(/[\s\u00a0]+/g, ' ').trim();
  const blocksOf = root => Array.from(root.querySelectorAll(BLOCKS)).filter(el => !el.closest('#ins-edit-ui') && !el.querySelector(BLOCKS));
  const liveLines = () => Array.from(document.body.querySelectorAll('[contenteditable]')).filter(el => D.has(el));   // document order
  const isEmpty = el => norm(el.textContent) === '' && !el.querySelector('svg,img');
  function lineOf(node) {
    let el = node && (node.nodeType === 1 ? node : node.parentElement);
    while (el && !D.has(el)) el = el.parentElement;
    return el || null;
  }
  function caretTo(el, atEnd) {
    const r = document.createRange();
    r.selectNodeContents(el); r.collapse(!atEnd);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    el.focus();
  }

  // A LINE'S HTML AS THE FILE SHOULD HOLD IT: his text and its italics / bold / links / inline glyphs — nothing of the browser's own
  // editing (style attributes, wrapper spans, non-breaking spaces typed as spaces, a trailing line break) and nothing an extension adds.
  function clean(el) {
    const out = doc.createElement('div');
    (function walk(from, to) {
      Array.from(from.childNodes).forEach(n => {
        if (n.nodeType === 3) { to.appendChild(doc.createTextNode(n.nodeValue.replace(/\u00a0/g, ' '))); return; }
        if (n.nodeType === 8) { to.appendChild(doc.createComment(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        if (n.namespaceURI !== 'http://www.w3.org/1999/xhtml') { to.appendChild(doc.importNode(n, true)); return; }   // an inline svg glyph: whole
        const tag = n.tagName.toLowerCase();
        if (tag.indexOf('-') >= 0) return;                                                 // an extension's own element
        const attrs = Array.from(n.attributes).filter(a => !/^(style|contenteditable|spellcheck|data-.*)$/i.test(a.name));
        if (tag === 'font' || (tag === 'span' && !attrs.length)) { walk(n, to); return; }  // the editor's wrappers: their text only
        const e = doc.createElement(tag === 'i' ? 'em' : tag === 'b' ? 'strong' : tag);
        attrs.forEach(a => e.setAttribute(a.name, a.value));
        to.appendChild(e);
        walk(n, e);
      });
    })(el, out);
    while (out.lastChild && out.lastChild.nodeName === 'BR') out.removeChild(out.lastChild);
    return out.innerHTML;
  }

  function arm(el, d) {
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    D.set(el, d);
    if (d) ORIG.set(el, clean(el));
  }
  function setDirty(v) {
    dirty = v;
    if (v) say('unsaved changes');
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  async function start() {
    if (editing || busy) return;
    busy = true; say('reading the file …');
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) { say('The edit server is not answering: start it (node stand/tools/edit_server.js), then reload.', true); return; }
      const j = await r.json();
      src = j.html; base = j.sha;
      if (!/<body>[\s\S]*<\/body>/.test(src)) { say('The file has no plain <body> … </body> — not editable from here.', true); return; }
      doc = new DOMParser().parseFromString(src, 'text/html');
      const live = blocksOf(document.body), filed = blocksOf(doc.body);
      const same = live.length === filed.length &&
        live.every((el, i) => el.tagName === filed[i].tagName && norm(el.textContent) === norm(filed[i].textContent));
      if (!same) { say('This page is older than its file. Reload it (F5), then Edit.', true); return; }
      D.clear(); ORIG.clear();
      live.forEach((el, i) => arm(el, filed[i]));
      docBlocks = filed.slice();
      editing = true; dirty = false;
      document.body.classList.add('ins-editing');
      btn('edit').hidden = true; btn('save').hidden = false; btn('done').hidden = false;
      say('click any text and type');
    } catch (e) {
      say('Could not read the file: ' + e.message, true);
    } finally { busy = false; }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  async function save() {
    if (!editing || busy) return false;
    busy = true; say('saving …');
    try {
      // 1 · his lines into the file's document — only the changed ones; a new paragraph goes after the line before it, with that
      //     line's own indentation; a paragraph left empty is taken out.
      const seen = new Set();
      let last = null;
      liveLines().forEach(el => {
        let d = D.get(el);
        const h = clean(el);
        if (SPLIT[el.tagName] && isEmpty(el)) { D.set(el, null); ORIG.delete(el); return; }   // empty: not in the file (it comes back if he types)
        if (d) {
          if (h !== ORIG.get(el)) d.innerHTML = h;
        } else {
          d = doc.createElement(el.tagName.toLowerCase());
          if (el.className) d.className = el.className;
          d.innerHTML = h;
          const before = last && last.previousSibling;
          const ws = before && before.nodeType === 3 && /^\s*\n\s*$/.test(before.nodeValue) ? before.nodeValue : '\n';
          if (last) last.after(doc.createTextNode(ws), d); else doc.body.insertBefore(d, doc.body.firstChild);
          D.set(el, d);
        }
        ORIG.set(el, h); seen.add(d); last = d;
      });
      docBlocks.forEach(d => {
        if (seen.has(d) || !d.parentNode) return;
        const p = d.previousSibling;
        if (p && p.nodeType === 3 && !p.nodeValue.trim()) p.remove();
        d.remove();
      });
      docBlocks = Array.from(seen);

      // 2 · the file's <body> replaced, its <head> and its line endings kept
      const m = /<body>([\s\S]*)<\/body>/.exec(src);
      const tail = /\s*$/.exec(m[1])[0].replace(/\r\n/g, '\n');
      let inner = doc.body.innerHTML.replace(/\s*$/, '') + tail;
      if (src.indexOf('\r\n') >= 0) inner = inner.replace(/\r?\n/g, '\r\n');
      const out = src.slice(0, m.index) + '<body>' + inner + '</body>' + src.slice(m.index + m[0].length);

      // 3 · to the server, with the sha of the file as it was read
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: out, base: base }) });
      if (r.status === 409) { say('NOT SAVED — the file was changed since you opened it. Your text is still on the page: copy what you need, reload (F5), Edit again.', true); return false; }
      if (!r.ok) { say('NOT SAVED — the server answered ' + r.status + '.', true); return false; }
      const j = await r.json();
      src = out; base = j.sha; dirty = false;
      const t = new Date();
      say('saved ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0'));
      return true;
    } catch (e) {
      say('NOT SAVED — ' + e.message, true);
      return false;
    } finally { busy = false; }
  }

  // ── Done: saves what is unsaved, then the page is a page again ───────────────────────────────────────────────────────────
  async function done() {
    if (!editing) return;
    if (dirty && !(await save())) return;
    liveLines().forEach(el => {
      if (SPLIT[el.tagName] && isEmpty(el)) { el.remove(); return; }
      el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck');
    });
    D.clear(); ORIG.clear();
    editing = false;
    document.body.classList.remove('ins-editing');
    btn('edit').hidden = false; btn('save').hidden = true; btn('done').hidden = true;
    if (!msg.classList.contains('bad') && !/^saved/.test(msg.textContent)) say('');
  }

  // ── typing ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (!editing) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    const b = lineOf(e.target);
    if (!b) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!SPLIT[b.tagName]) return;
      const sel = getSelection();
      if (!sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const rest = document.createRange();
      rest.setStart(r.endContainer, r.endOffset);
      rest.setEnd(b, b.childNodes.length);
      const nb = document.createElement(b.tagName.toLowerCase());
      if (b.className) nb.className = b.className;
      nb.appendChild(rest.extractContents());
      b.after(nb);
      arm(nb, null);
      caretTo(nb, false);
      setDirty(true);
      return;
    }
    if (e.key === 'Backspace' && SPLIT[b.tagName] && isEmpty(b)) {
      const lines = liveLines(), i = lines.indexOf(b);
      if (i <= 0) return;
      e.preventDefault();
      D.delete(b); ORIG.delete(b); b.remove();
      caretTo(lines[i - 1], true);
      setDirty(true);
    }
  });
  document.addEventListener('input', e => { if (editing && lineOf(e.target)) setDirty(true); });
  document.addEventListener('paste', e => {
    if (!editing || !lineOf(e.target)) return;
    e.preventDefault();
    const t = ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').replace(/\s*\r?\n\s*/g, ' ');
    if (t) document.execCommand('insertText', false, t);
  });
  window.addEventListener('beforeunload', e => { if (editing && dirty) { e.preventDefault(); e.returnValue = ''; } });

  bar.addEventListener('click', e => {
    const a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
    if (a === 'edit') start(); else if (a === 'save') save(); else if (a === 'done') done();
  });

  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
