/* Portal kit: shared helpers for the inventory and planning tools, plus sub-tabs across the top of a page.
   Everything you enter is saved in this browser (localStorage). Use Backup to save a copy into OneDrive. */
window.PK = (function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[$,]/g, '')); return isFinite(x) ? x : 0; }
  function db(prefix) {
    return {
      get: function (k, d) { try { var r = localStorage.getItem(prefix + k); return r ? JSON.parse(r) : d; } catch (e) { return d; } },
      set: function (k, v) { try { localStorage.setItem(prefix + k, JSON.stringify(v)); } catch (e) { alert('Could not save in this browser. Use Backup to keep a copy.'); } }
    };
  }
  function uid(p) { return (p || '') + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5); }
  function toCSV(rows, cols) {
    function q(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    return [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(','); })).join('\r\n');
  }
  function parseCSV(text) {
    var rows = [], row = [], f = '', i = 0, inQ = false; text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) {
      var c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
      else if (c === '"') inQ = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || '').trim(); }); return o; });
  }
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function pickFile(accept, cb) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = function () { var f = i.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { cb(String(r.result), f.name); }; r.readAsText(f); };
    i.click();
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function say(msg) {
    var el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400);
  }
  /* Backup/restore every key that starts with a prefix */
  function backup(prefix, name) {
    var out = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(prefix) === 0) out[k] = localStorage.getItem(k); }
    download(name + '-backup-' + today() + '.json', JSON.stringify({ prefix: prefix, saved: new Date().toISOString(), data: out }, null, 1), 'application/json');
  }
  function restore(prefix, done) {
    pickFile('.json', function (txt) {
      try { var b = JSON.parse(txt); if (b.prefix !== prefix) { alert('This backup is for a different portal.'); return; }
        if (!confirm('Replace what is saved in this browser with the backup from ' + (b.saved || 'the file') + '?')) return;
        Object.keys(b.data).forEach(function (k) { localStorage.setItem(k, b.data[k]); }); done && done(); say('Backup restored');
      } catch (e) { alert('That file is not a portal backup.'); }
    });
  }

  /* Sub-tabs: groups = [{label:'Production', subs:[['stock','Batches & stock'],['ingredients','Ingredients']]}]
     The first sub keeps its left-panel button (renamed to the group label); the others move to the top row. */
  function subtabs(groups) {
    var groupOf = {}, last = {};
    groups.forEach(function (g, gi) {
      g.subs.forEach(function (s, i) {
        groupOf[s[0]] = gi;
        var btn = document.querySelector('.tab[data-v="' + s[0] + '"]');
        if (btn && i > 0) btn.classList.add('sub-hidden');
        var sec = document.querySelector('.view[data-view="' + s[0] + '"]'); if (!sec || sec.querySelector(':scope>.subtabs')) return;
        var nav = document.createElement('nav'); nav.className = 'subtabs'; nav.setAttribute('aria-label', g.label + ' pages');
        nav.innerHTML = g.subs.map(function (t) { return '<button type="button" class="subtab" data-to="' + t[0] + '"' + (t[0] === s[0] ? ' aria-current="page"' : '') + '>' + esc(t[1]) + '</button>'; }).join('');
        sec.insertBefore(nav, sec.firstChild);
      });
      var mb = document.querySelector('.tab[data-v="' + g.subs[0][0] + '"]');
      if (mb) { mb.dataset.group = gi; if (g.label) mb.textContent = g.label;
        /* Main button reopens the sub-page used last in this group */
        mb.addEventListener('click', function (e) { var l = last[gi]; if (l && l !== g.subs[0][0] && !mb._redirect) { e.stopImmediatePropagation(); go(l); } }, true);
      }
    });
    function go(v) { var t = document.querySelector('.tab[data-v="' + v + '"]'); if (!t) return; t._redirect = true; t.click(); t._redirect = false; sync(); }
    function sync() {
      var v = document.querySelector('.view:not([hidden])'); if (!v) return;
      var gi = groupOf[v.dataset.view]; if (gi === undefined) return;
      last[gi] = v.dataset.view;
      var mb = document.querySelector('.tab[data-v="' + groups[gi].subs[0][0] + '"]');
      document.querySelectorAll('header .tab').forEach(function (t) { t.setAttribute('aria-selected', t === mb ? 'true' : 'false'); });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.subtab'); if (b) { go(b.dataset.to); window.scrollTo({ top: 0 }); return; }
      if (e.target.closest && e.target.closest('.tab')) setTimeout(sync, 0);
    });
    sync();
    return { go: go, sync: sync };
  }

  /* Left menu: each portal's own pages sit nested under that portal's name, so nothing looks like it
     belongs to the portal listed below it. On phones the pages stay in the top bar. */
  (function markPortal() { var p = location.pathname; var code = /madam-allure/.test(p) ? 'ma' : /allure-fusions/.test(p) ? 'af' : /ai-authoritech/.test(p) ? 'at' : /skool/.test(p) ? 'sk' : ''; if (code) document.documentElement.setAttribute('data-portal', code); })();
  function nestNav() {
    var tabs = document.querySelector('header nav.tabs'), sw = document.querySelector('header .portal-switch'), cur = sw && sw.querySelector('a[aria-current="page"]');
    if (!tabs || !sw || !cur) return;
    var home = tabs.parentNode, mark = document.createComment('tabs-home'); home.insertBefore(mark, tabs);
    var mq = window.matchMedia('(min-width:760px)');
    function place() { if (mq.matches) { cur.insertAdjacentElement('afterend', tabs); tabs.classList.add('nested'); sw.classList.add('with-pages'); } else { mark.parentNode.insertBefore(tabs, mark.nextSibling); tabs.classList.remove('nested'); sw.classList.remove('with-pages'); } }
    place(); if (mq.addEventListener) mq.addEventListener('change', place);
  }
  nestNav();

  return { esc: esc, num: num, db: db, uid: uid, toCSV: toCSV, parseCSV: parseCSV, download: download, pickFile: pickFile, today: today, say: say, backup: backup, restore: restore, subtabs: subtabs };
})();
