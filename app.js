(function () {
  'use strict';

  /* ===================== Settings ===================== */
  const MAXP = 12, MINP = 4, MING = 4, MAXG = 20, DEFG = 12, MAX_MEMBERS = 12;
  const DAY = 86400000, KEEP_MS = 7 * DAY;
  const FB = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const CFG = window.PB_FIREBASE || null;
  const ADMIN = String(window.PB_ADMIN_EMAIL || '').trim().toLowerCase();
  const PREVIEW = !!window.PB_PREVIEW;
  const JSPDF_URL = PREVIEW ? 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js' : 'vendor/jspdf.umd.min.js';
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const CLOUD = !PREVIEW && !!(CFG && CFG.apiKey && CFG.projectId &&
    !/^PASTE/i.test(String(CFG.apiKey)) && !/^PASTE/i.test(String(CFG.projectId)) &&
    EMAIL_RE.test(ADMIN) && ADMIN !== 'your.name@gmail.com');
  const DEMO_EMAIL = 'organizer@example.com';
  const FOOTER_TEXT = String(window.PB_FOOTER_TEXT == null ? '' : window.PB_FOOTER_TEXT).trim().slice(0, 160);
  const USERNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]{1,19}$/u;

  /* ===================== Small helpers ===================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s == null ? '' : s).replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim();
  const pct = x => Math.round(x * 100) + '%';
  const firstName = s => (clean(s).split(' ')[0] || s || '');
  const initial = s => (clean(s).charAt(0) || '?').toUpperCase();
  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    logo: '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><circle class="ball" cx="24" cy="24" r="21"/><circle class="hole" cx="24" cy="11.5" r="3"/><circle class="hole" cx="13" cy="18" r="3"/><circle class="hole" cx="35" cy="18" r="3"/><circle class="hole" cx="24" cy="24.5" r="3"/><circle class="hole" cx="15" cy="31.5" r="3"/><circle class="hole" cx="33" cy="31.5" r="3"/><circle class="hole" cx="24" cy="38" r="2.6"/></svg>'
  };
  const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function fmtDay(t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,/g, ''); }
  function fmtShort(t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, ''); }
  function fmtTime(t) { return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function dayKey(t) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function randId(n) {
    const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', u = new Uint8Array(n);
    try { crypto.getRandomValues(u); } catch (e) { for (let i = 0; i < n; i++) u[i] = Math.floor(Math.random() * 256); }
    let s = ''; for (let i = 0; i < n; i++) s += a[u[i] % 62]; return s;
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  /* ---------- Theme: Auto (follows the device), Light or Dark; remembered on this device ---------- */
  const THEME_KEY = 'pb-theme';
  const hostTheme = PREVIEW ? document.documentElement.getAttribute('data-theme') : null;
  function getTheme() {
    try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch (e) { return 'auto'; }
  }
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
  }
  function setTheme(t) {
    try { if (t === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch (e) { /* not saved; still applies now */ }
    applyTheme(t);
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themeSet === t)));
  }
  applyTheme(getTheme());
  function themeHTML() {
    const cur = getTheme();
    return '<div class="menu-theme"><span class="menu-label" id="themeLabel">Theme</span><div class="seg3" role="radiogroup" aria-labelledby="themeLabel">' +
      [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, t]) =>
        '<button type="button" role="radio" data-theme-set="' + v + '" aria-checked="' + (cur === v) + '">' + t + '</button>').join('') + '</div></div>';
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }
  function toTop() { window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); }
  function errText(e) {
    const c = e && e.code;
    if (c === 'permission-denied') return 'You do not have permission to change this. Ask the organizer to check the member list.';
    if (c === 'unavailable') return 'No connection right now. Your change is saved on this phone and will sync.';
    return 'The change was not saved. Check your connection and try again.';
  }

  /* ===================== Data stores ===================== */
  const DEL = { __delete: true };

  function applyPatch(obj, patch) {
    Object.keys(patch).forEach(path => {
      const parts = path.split('.');
      let o = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
        o = o[parts[i]];
      }
      const last = parts[parts.length - 1], v = patch[path];
      if (v === DEL) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v));
    });
  }

  // Demo: everything stays in this browser. Used before Firebase is connected.
  function makeLocalStore() {
    const KEY = PREVIEW ? 'pb-preview-v2' : 'pb-demo-v2';
    let data = lsGet(KEY) || { sessions: {}, members: null, seeded: false };
    if (!data.profiles) data.profiles = {};
    const subsS = new Set(), subsM = new Set(), subsP = new Map();
    const list = () => Object.keys(data.sessions).map(id => Object.assign({ id }, data.sessions[id])).sort((a, b) => b.createdAt - a.createdAt);
    const emit = () => {
      const l = list();
      subsS.forEach(f => f(l, { pending: false, fromCache: false }));
      subsM.forEach(f => f(data.members));
      subsP.forEach((set, em) => set.forEach(f => f(data.profiles[em] || null)));
    };
    const persist = () => lsSet(KEY, data);
    window.addEventListener('storage', e => { if (e.key === KEY) { data = lsGet(KEY) || data; emit(); } });
    return {
      kind: 'local',
      seedOnce(make) {
        if (data.seeded) return;
        data.seeded = true;
        if (!Object.keys(data.sessions).length) data.sessions[randId(20)] = make();
        persist();
      },
      onSessions(cb) { subsS.add(cb); setTimeout(() => cb(list(), { pending: false, fromCache: false }), 0); return () => subsS.delete(cb); },
      onMembers(cb) { subsM.add(cb); setTimeout(() => cb(data.members), 0); return () => subsM.delete(cb); },
      newId() { return randId(20); },
      create(id, obj) { data.sessions[id] = JSON.parse(JSON.stringify(obj)); persist(); emit(); return Promise.resolve(); },
      update(id, patch) {
        const s = data.sessions[id];
        if (!s) return Promise.reject({ code: 'not-found' });
        applyPatch(s, patch); persist(); emit(); return Promise.resolve();
      },
      remove(id) { delete data.sessions[id]; persist(); emit(); return Promise.resolve(); },
      onProfile(email, cb) {
        if (!subsP.has(email)) subsP.set(email, new Set());
        subsP.get(email).add(cb);
        setTimeout(() => cb(data.profiles[email] || null), 0);
        return () => subsP.get(email).delete(cb);
      },
      saveMembers(emails, names, changes) {
        data.members = { emails, names, updatedAt: Date.now() };
        Object.keys(changes || {}).forEach(em => { if (changes[em] == null) delete data.profiles[em]; else data.profiles[em] = { username: changes[em], updatedAt: Date.now() }; });
        persist(); emit(); return Promise.resolve();
      }
    };
  }

  // Live: Firebase (free Spark plan). Gmail login + Cloud Firestore with offline cache.
  async function makeCloudStore() {
    const [appM, authM, fsM] = await Promise.all([
      import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')
    ]);
    const app = appM.initializeApp(CFG);
    const auth = authM.getAuth(app);
    let db;
    try {
      db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) });
    } catch (e) {
      db = fsM.initializeFirestore(app, { localCache: fsM.memoryLocalCache() });
    }
    const col = fsM.collection(db, 'sessions');
    const membersRef = fsM.doc(db, 'config', 'members');
    const conv = patch => {
      const o = {};
      Object.keys(patch).forEach(k => { o[k] = patch[k] === DEL ? fsM.deleteField() : patch[k]; });
      return o;
    };
    return {
      kind: 'cloud',
      signIn() {
        const p = new authM.GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        return authM.signInWithPopup(auth, p);
      },
      signOut() { return authM.signOut(auth); },
      async wipe() {
        try { await fsM.terminate(db); await fsM.clearIndexedDbPersistence(db); } catch (e) { /* nothing cached */ }
      },
      async tokenName(u) {
        try { const r = await u.getIdTokenResult(); return typeof r.claims.name === 'string' ? r.claims.name : ''; } catch (e) { return ''; }
      },
      onAuth(cb) { return authM.onAuthStateChanged(auth, cb); },
      onSessions(cb, err) {
        return fsM.onSnapshot(fsM.query(col, fsM.orderBy('createdAt', 'desc')), { includeMetadataChanges: true },
          snap => cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data())), { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache }),
          err);
      },
      onMembers(cb, err) { return fsM.onSnapshot(membersRef, snap => cb(snap.exists() ? snap.data() : null), err); },
      newId() { return fsM.doc(col).id; },
      create(id, obj) { return fsM.setDoc(fsM.doc(col, id), obj); },
      update(id, patch) { return fsM.updateDoc(fsM.doc(col, id), conv(patch)); },
      remove(id) { return fsM.deleteDoc(fsM.doc(col, id)); },
      onProfile(email, cb, err) { return fsM.onSnapshot(fsM.doc(db, 'profiles', email), snap => cb(snap.exists() ? snap.data() : null), err); },
      // Member list (organizer only) and each member's own profile are written together, all or nothing.
      saveMembers(emails, names, changes) {
        const b = fsM.writeBatch(db), now = Date.now();
        b.set(membersRef, { emails, names, updatedAt: now });
        Object.keys(changes || {}).forEach(em => {
          const ref = fsM.doc(db, 'profiles', em);
          if (changes[em] == null) b.delete(ref); else b.set(ref, { username: changes[em], updatedAt: now });
        });
        return b.commit();
      }
    };
  }

  /* ===================== App state ===================== */
  const S = {
    store: null,
    user: null,            // { email, name }
    access: 'loading',     // loading | signedout | checking | member | noaccess | rules | error
    authError: '',
    isAdmin: false,
    members: [],
    names: {},
    sessions: [],
    loaded: false,
    meta: { pending: false, fromCache: false },
    route: parseHash(),
    online: navigator.onLine !== false
  };
  let unsubS = null, unsubM = null, unsubP = null, cleaned = false;

  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (h === 'new') return { name: 'new' };
    if (h === 'members') return { name: 'members' };
    if (/^s-[A-Za-z0-9]+$/.test(h)) return { name: 'session', id: h.slice(2) };
    return { name: 'home' };
  }
  const isLive = s => s.expiresAt > Date.now();

  const toInt = v => (typeof v === 'number' && isFinite(v) ? Math.floor(v) : NaN);
  const sstr = (v, max) => (typeof v === 'string' ? v : '').slice(0, max);
  function sanitizeSession(raw) {
    try {
      if (!raw || typeof raw !== 'object') return null;
      const id = String(raw.id || '');
      if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
      const players = Array.isArray(raw.players) ? raw.players.map(p => clean(sstr(p, 64)).slice(0, 32)) : [];
      const n = players.length;
      if (n < MINP || n > MAXP || players.some(p => !p)) return null;
      const sc = raw.schedule && typeof raw.schedule === 'object' ? raw.schedule : {};
      const C = toInt(sc.courts), G = toInt(sc.games);
      if (!(C === 1 || C === 2) || !(G >= MING && G <= MAXG) || n < C * 4) return null;
      if (!Array.isArray(sc.rounds) || sc.rounds.length !== G) return null;
      const rounds = sc.rounds.map(r => {
        if (!r || !Array.isArray(r.courts) || r.courts.length !== C || !Array.isArray(r.rest)) throw 0;
        const seen = new Set();
        const take = v => { const i = toInt(v); if (!(i >= 0 && i < n) || seen.has(i)) throw 0; seen.add(i); return i; };
        const courts = r.courts.map(m => {
          if (!m || !Array.isArray(m.A) || !Array.isArray(m.B) || m.A.length !== 2 || m.B.length !== 2) throw 0;
          return { A: m.A.map(take), B: m.B.map(take) };
        });
        const rest = r.rest.map(take);
        if (seen.size !== n) throw 0;
        return { courts, rest };
      });
      const W = {}, D = {};
      const rw = raw.winners && typeof raw.winners === 'object' ? raw.winners : {};
      Object.keys(rw).forEach(k => { const m = /^g(\d{1,2})c([01])$/.exec(k); if (m && +m[1] < G && +m[2] < C && (rw[k] === 'A' || rw[k] === 'B')) W[k] = rw[k]; });
      const rd = raw.done && typeof raw.done === 'object' ? raw.done : {};
      Object.keys(rd).forEach(k => { const m = /^g(\d{1,2})$/.exec(k); if (m && +m[1] < G && rd[k] === true) D[k] = true; });
      const createdAt = toInt(raw.createdAt), expiresAt = toInt(raw.expiresAt);
      if (!(createdAt > 0) || !(expiresAt > 0)) return null;
      return {
        id, example: raw.example === true,
        day: sstr(raw.day, 40) || fmtDay(createdAt),
        dayKey: /^\d{4}-\d{2}-\d{2}$/.test(raw.dayKey) ? raw.dayKey : dayKey(createdAt),
        seq: Math.max(0, Math.min(99, toInt(raw.seq) || 0)),
        name: sstr(raw.name, 80), createdAt, expiresAt,
        createdBy: sstr(raw.createdBy, 128), createdByName: sstr(raw.createdByName, 80),
        updatedAt: toInt(raw.updatedAt) || createdAt, updatedByName: sstr(raw.updatedByName, 80),
        completedAt: toInt(raw.completedAt) || 0,
        status: raw.status === 'completed' ? 'completed' : 'live',
        players, courts: C, games: G,
        schedule: { n, courts: C, games: G, rest: n > C * 4, rounds },
        winners: W, done: D
      };
    } catch (e) { return null; }
  }

  function stopSessions() { if (unsubS) { unsubS(); unsubS = null; } }
  function stopMembers() { if (unsubM) { unsubM(); unsubM = null; } if (unsubP) { unsubP(); unsubP = null; } }

  // The organizer watches the member list (only the organizer may read it), then the sessions.
  // Everyone else reads only their own profile (their username), then the sessions:
  // the database rules refuse anyone not on the list.
  function setMyName(u) {
    S.user.name = typeof u === 'string' ? u : '';
    S.user.label = S.user.name || firstName(S.user.tokenName) || S.user.email.split('@')[0];
  }
  function cleanNames(raw) {
    const out = {};
    if (raw && typeof raw === 'object') Object.keys(raw).forEach(k => { if (typeof raw[k] === 'string' && raw[k]) out[String(k).toLowerCase()] = raw[k].slice(0, 20); });
    return out;
  }
  function defaultUsername(taken) {
    let base = clean(firstName(S.user.tokenName) || S.user.email.split('@')[0]).replace(/[^\p{L}\p{N} ._'-]/gu, '').slice(0, 20);
    if (!USERNAME_RE.test(base)) base = 'Organizer';
    let u = base, i = 2;
    while (taken.has(u.toLocaleLowerCase())) u = base.slice(0, 17) + ' ' + i++;
    return u;
  }
  function startAccess() {
    if (S.isAdmin) { startMembers(); return; }
    let started = false;
    const go = () => { if (!started) { started = true; startSessions(); } };
    unsubP = S.store.onProfile(S.user.email, p => {
      setMyName(p && typeof p.username === 'string' ? p.username : '');
      if (started) renderWho();
      go();
    }, () => { setMyName(''); go(); });
  }

  function startMembers() {
    stopMembers();
    unsubM = S.store.onMembers(data => {
      const me = S.user.email;
      if (!data || !Array.isArray(data.emails)) {
        const u = defaultUsername(new Set());
        S.store.saveMembers([me], { [me]: u }, { [me]: u }).catch(onMembersError);
        return;
      }
      S.members = data.emails.map(e => String(e).toLowerCase());
      S.names = cleanNames(data.names);
      if (!S.names[me]) {
        const taken = new Set(Object.keys(S.names).map(k => S.names[k].toLocaleLowerCase()));
        const u = defaultUsername(taken);
        S.store.saveMembers(memberList(), Object.assign({}, S.names, { [me]: u }), { [me]: u }).catch(onMembersError);
        return;
      }
      setMyName(S.names[me]);
      const was = S.access;
      S.access = 'member';
      if (was !== 'member') { startSessions(); render(); }
      else render(true);
    }, onMembersError);
  }
  function onMembersError(err) {
    stopSessions();
    if (err && err.code === 'permission-denied') S.access = 'rules';
    else { S.access = 'error'; S.authError = (err && err.message) || 'Could not reach the database.'; }
    render();
  }

  function startSessions() {
    stopSessions();
    unsubS = S.store.onSessions((list, meta) => {
      const first = S.access !== 'member';
      S.access = 'member';
      S.sessions = list.map(sanitizeSession).filter(Boolean).filter(isLive);
      S.meta = meta || { pending: false, fromCache: false };
      S.loaded = true;
      if (!cleaned && !S.meta.fromCache) {
        cleaned = true;
        list.filter(s => typeof s.expiresAt === 'number' && s.expiresAt <= Date.now()).forEach(s => S.store.remove(s.id).catch(() => { /* someone else may have removed it */ }));
      }
      if (first) render(); else render(true);
    }, err => {
      if (err && err.code === 'permission-denied') {
        stopSessions();
        S.sessions = []; S.loaded = false;
        S.access = S.isAdmin ? 'rules' : 'noaccess';
        if (S.store.wipe) S.store.wipe();
        render();
      } else toast('Could not load sessions. Check your connection.');
    });
  }

  /* ===================== Top bar ===================== */
  let whoKey = '';
  function renderWho() {
    const key = [S.access, S.user && S.user.email, S.user && S.user.label, S.isAdmin].join('|');
    if (key !== whoKey) {
      whoKey = key;
      let h = '';
      if (CLOUD && S.access === 'member') h += '<span class="conn" id="conn" role="status"></span>';
      if (S.user && (S.access === 'member' || S.access === 'noaccess' || S.access === 'rules')) {
        h += '<details class="menu" id="userMenu"><summary aria-label="Account menu"><span class="avatar" aria-hidden="true">' + esc(initial(S.user.label)) + '</span>' +
          '<span class="uname">' + esc(S.user.label) + '</span></summary><div class="menu-pop">' +
          '<p class="menu-email">' + esc(CLOUD ? S.user.email : 'Demo organizer') + '</p>' + themeHTML() +
          (S.access === 'member' ? (S.isAdmin ? '<a href="#members">Manage members</a>' : '') + '<a href="#home">Sessions</a>' : '') +
          (CLOUD ? '<button type="button" data-act="signout">Sign out</button>' : '') + '</div></details>';
      }
      $('#who').innerHTML = h;
    }
    const c = $('#conn');
    if (c) {
      let cls = '', txt = 'Live';
      if (!S.online) { cls = 'offline'; txt = 'Offline · will sync'; }
      else if (S.meta.pending) { cls = 'saving'; txt = 'Saving…'; }
      c.className = 'conn ' + cls;
      c.textContent = txt;
    }
  }
  function renderBanner() {
    const b = $('#banner');
    if (CLOUD) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = PREVIEW
      ? '<span><strong>Preview.</strong> Sessions are stored on this device only. The GitHub version shares them live with signed-in members.</span>'
      : '<span><strong>Demo mode.</strong> Firebase is not connected, so sessions are stored on this device only. See README.md to connect it.</span>';
  }

  /* ===================== Sign in & access ===================== */
  function renderAuth() {
    const card = $('#authCard');
    let h = ICON.logo;
    if (S.access === 'loading' || S.access === 'checking') {
      h += '<h2>Loading…</h2><p>Getting your sessions ready.</p>';
    } else if (S.access === 'signedout') {
      h += '<h2>Sign in</h2><p>Use the Google account your organizer added to the group.</p>' +
        '<button type="button" class="btn gbtn big" data-act="signin">' + ICON.user + 'Sign in with Google</button>' +
        (S.authError ? '<p class="error auth-err" role="alert">' + esc(S.authError) + '</p>' : '') +
        '<p class="hint">Access is limited to the members on the organizer’s list.</p>';
    } else if (S.access === 'noaccess') {
      h += '<h2>Not on the member list yet</h2><p>You signed in as</p><p class="email">' + esc(S.user ? S.user.email : '') + '</p>' +
        '<p>Ask the organizer to add this Gmail under Members, then tap Try again.</p>' +
        '<button type="button" class="btn primary big" data-act="retry">Try again</button>' +
        '<button type="button" class="btn ghost big" data-act="switch">Use another Google account</button>';
    } else if (S.access === 'rules') {
      h += '<h2>Database rules needed</h2><p>You are the organizer, but the database rules are not published yet, or the Gmail in the rules does not match <strong>' + esc(S.user ? S.user.email : '') + '</strong>.</p>' +
        '<ol class="steps-list"><li>Open the Firebase console, then Firestore Database, then the Rules tab.</li>' +
        '<li>Paste everything from the file <strong>firestore.rules</strong>.</li>' +
        '<li>Put your Gmail on the adminEmail line, exactly as in firebase-config.js.</li>' +
        '<li>Tap Publish, wait a minute, then tap Try again.</li></ol>' +
        '<button type="button" class="btn primary big" data-act="retry">Try again</button>' +
        '<button type="button" class="btn ghost big" data-act="switch">Sign out</button>';
    } else {
      h += '<h2>The app could not start</h2><p>' + esc(S.authError || 'Reload the page to try again.') + '</p>' +
        '<button type="button" class="btn primary big" data-act="reload">Reload</button>';
    }
    card.innerHTML = h;
  }

  function authErrorText(e) {
    const c = (e && e.code) || '';
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
    if (c === 'auth/popup-blocked') return 'Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.';
    if (c === 'auth/unauthorized-domain') return 'This web address is not allowed yet. In Firebase, open Authentication, then Settings, then Authorized domains, and add ' + location.hostname + '.';
    if (c === 'auth/operation-not-allowed') return 'Google sign-in is turned off. In Firebase, open Authentication, then Sign-in method, and enable Google.';
    if (c === 'auth/network-request-failed') return 'No internet connection. Check your connection and try again.';
    return 'Sign-in did not work (' + (c || 'unknown error') + '). Try again.';
  }

  /* ===================== Router ===================== */
  function render(fromData) {
    renderWho();
    renderBanner();
    const member = S.access === 'member';
    $('#view-auth').hidden = member;
    ['home', 'new', 'session', 'members'].forEach(v => { $('#view-' + v).hidden = !member || S.route.name !== v; });
    if (!member) { renderAuth(); return; }
    const r = S.route.name;
    if (r === 'home') renderHome();
    else if (r === 'new') { if (!fromData) renderNew(); else updateStepsNav(); }
    else if (r === 'session') renderSession();
    else if (r === 'members') renderMembers();
  }
  window.addEventListener('hashchange', () => {
    S.route = parseHash();
    sessKey = '';
    sessUI = { names: false, confirm: null };
    membersBuilt = false;
    confirmRemove = '';
    editing = '';
    render();
    toTop();
  });

  /* ===================== Dashboard ===================== */
  const doneCount = s => Object.keys(s.done || {}).filter(k => s.done[k]).length;
  function sessionTitle(s) { return s.example ? 'Example session' : (s.day || fmtDay(s.createdAt)) + ' · Session ' + (s.seq || 1); }

  function renderHome() {
    const hasDraft = !!(draft && draft.touched) || !!(lsGet(DRAFT_KEY) || {}).touched;
    $('#newBtnText').textContent = hasDraft ? 'Continue new session' : 'New session';
    const box = $('#homeList');
    if (!S.loaded) { box.innerHTML = '<p class="note">Loading sessions…</p>'; return; }
    if (!S.sessions.length) {
      box.innerHTML = '<div class="empty">' +
        '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="4" y="10" width="152" height="70" rx="6" fill="var(--court-soft)" stroke="var(--surround)" stroke-width="3"/>' +
        '<rect x="66" y="12" width="28" height="66" fill="var(--kitchen)"/><line x1="80" y1="10" x2="80" y2="80" stroke="var(--net)" stroke-width="2" stroke-dasharray="4 3"/>' +
        '<line x1="6" y1="45" x2="66" y2="45" stroke="var(--court-line)" stroke-width="2"/><line x1="94" y1="45" x2="154" y2="45" stroke="var(--court-line)" stroke-width="2"/>' +
        '<circle cx="118" cy="28" r="9" fill="var(--ball)" stroke="var(--ball-hole)" stroke-width="1.5"/></svg>' +
        '<h3>No sessions in the last 7 days</h3><p>Create a session to generate today’s schedule. Members see it and record winners from their own phones.</p>' +
        '<a class="btn primary" href="#new">' + ICON.plus + 'New session</a></div>';
      return;
    }
    box.innerHTML = '<div class="cards">' + S.sessions.map(s => {
      const G = s.games || (s.schedule && s.schedule.games) || 0;
      const n = (s.players || []).length;
      const isDone = s.status === 'completed';
      const played = isDone ? sessionPlayed(s).length : doneCount(s);
      const chip = s.example ? '<span class="chip-status example">Example</span>'
        : isDone ? '<span class="chip-status completed">Completed</span>' : '<span class="chip-status live">Live</span>';
      const top = s.example ? '<div class="card-date">Example session</div><div class="card-sub">Sample data</div>'
        : '<div class="card-date">' + esc(s.day || fmtDay(s.createdAt)) + '</div><div class="card-sub">Session ' + esc(s.seq || 1) + ' · started ' + esc(fmtTime(s.createdAt)) + '</div>';
      return '<a class="card" href="#s-' + esc(s.id) + '"><div class="card-top"><div>' + top + '</div>' + chip + '</div>' +
        '<p class="card-meta"><strong>' + n + ' players</strong> · ' + (s.courts === 2 ? '2 courts' : '1 court') + ' · ' + G + ' games</p>' +
        '<div class="mini-track" aria-hidden="true"><i style="width:' + (G ? Math.round(played / G * 100) : 0) + '%"></i></div>' +
        '<p class="card-meta">' + (isDone ? 'Finished · ' : '') + played + ' of ' + G + ' games played</p>' +
        '<div class="card-foot"><span>Started by ' + esc(clean(s.createdByName) || 'a member') + '</span><span>Deletes ' + esc(fmtShort(s.expiresAt)) + '</span></div></a>';
    }).join('') + '</div>';
  }

  /* ===================== New session: draft on this device ===================== */
  const DRAFT_KEY = 'pb-draft-v2';
  let draft = null;
  let draftTimer = null;
  function loadDraft() {
    const d = lsGet(DRAFT_KEY);
    return d && Array.isArray(d.raw) && d.savedAt && Date.now() - d.savedAt < KEEP_MS ? d : null;
  }
  function freshDraft() {
    const last = S.sessions.find(s => !s.example) || null;
    const raw = last ? last.players.slice() : [];
    while (raw.length < MINP) raw.push('');
    return { step: 'setup', raw, courts: 2, courtsManual: false, games: last ? (last.games || DEFG) : DEFG, players: [], schedule: null, genSig: '', touched: false, fromLast: !!last, savedAt: Date.now() };
  }
  function saveDraft(now) {
    if (!draft) return;
    draft.savedAt = Date.now();
    clearTimeout(draftTimer);
    const f = () => { if (draft) lsSet(DRAFT_KEY, draft); };
    if (now) f(); else draftTimer = setTimeout(f, 250);
  }
  function touch() { if (draft) { draft.touched = true; draft.fromLast = false; } }

  const filledList = () => draft.raw.map(clean).filter(Boolean);
  const effCourts = n => (n < 8 ? 1 : draft.courts);
  const setupSig = () => JSON.stringify([filledList(), effCourts(filledList().length), draft.games]);

  function updateStepsNav() {
    if (!draft) return;
    const st = draft.step === 'preview' && draft.schedule ? 'preview' : 'setup';
    ['setup', 'preview'].forEach((k, i) => {
      const b = $('#step-' + k);
      if (k === st) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('complete', st === 'preview' && i === 0);
    });
    $('#step-preview').disabled = filledList().length < MINP;
  }

  function renderNew() {
    if (!draft) draft = loadDraft() || freshDraft();
    const st = draft.step === 'preview' && draft.schedule ? 'preview' : 'setup';
    $('#new-setup').hidden = st !== 'setup';
    $('#new-preview').hidden = st !== 'preview';
    $('#setupError').hidden = true;
    updateStepsNav();
    if (st === 'setup') renderPlayers(); else renderPreview();
  }

  function renderPlayers(focusIndex) {
    while (draft.raw.length < MINP) draft.raw.push('');
    if (draft.raw.length > MAXP) draft.raw.length = MAXP;
    $('#playerList').innerHTML = draft.raw.map((v, i) =>
      '<li class="prow" data-i="' + i + '"><span class="pnum" aria-hidden="true">' + (i + 1) + '</span>' +
      '<input id="player-' + i + '" data-i="' + i + '" type="text" autocomplete="off" autocapitalize="words" spellcheck="true" maxlength="32" enterkeyhint="next" placeholder="Player ' + (i + 1) + '" aria-label="Player ' + (i + 1) + ' name" value="' + esc(v) + '">' +
      '<button type="button" class="icon-btn remove" data-i="' + i + '" aria-label="Remove player ' + (i + 1) + '">' + ICON.x + '</button></li>'
    ).join('');
    if (focusIndex != null) { const el = $('#player-' + focusIndex); if (el) el.focus(); }
    updateSetupMeta();
  }

  function updateSetupMeta() {
    const n = filledList().length;
    $('#playerCount').textContent = n + ' of ' + MAXP;
    $('#addPlayer').disabled = draft.raw.length >= MAXP;
    $('#setupNote').textContent = draft.fromLast
      ? 'Names from your last session are filled in. Change them as needed, or paste a list (one per line or comma separated) into any box.'
      : 'One name per box, up to 12. Paste a list into any box to fill many at once. Press Enter to jump to the next box.';
    if (n >= 8 && !draft.courtsManual) draft.courts = 2;
    const c = effCourts(n);
    $('#courts-1').setAttribute('aria-checked', String(c === 1));
    $('#courts-2').setAttribute('aria-checked', String(c === 2));
    $('#courts-2').disabled = n < 8;
    $('#courtHint').textContent = n < 8
      ? '2 courts need at least 8 players (you have ' + n + '), so everyone plays on Court 1.'
      : (c === 2 ? '8 or more players, so Court 1 and Court 2 are booked side by side.' : 'You picked 1 court. More players rest each game.');
    $('#games').value = draft.games;
    $('#gamesOut').textContent = draft.games;
    $$('#gameChips .chip').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === draft.games)));
    $('#gamesMinus').disabled = draft.games <= MING;
    $('#gamesPlus').disabled = draft.games >= MAXG;
    renderLineup(n, c);
    updateStepsNav();
  }

  function renderLineup(n, c) {
    const P = c * 4, Sx = Math.max(0, n - P), g = draft.games;
    let h = '';
    for (let k = 0; k < c; k++) h += '<figure class="lu"><div class="mc"><i></i><i></i><b></b><i></i><i></i></div><figcaption>Court ' + (k + 1) + '</figcaption></figure>';
    if (Sx > 0) h += '<figure class="lu"><div class="bench">' + '<i></i>'.repeat(Sx) + '</div><figcaption>Resting</figcaption></figure>';
    $('#lineup').innerHTML = h;
    let t;
    if (n < MINP) t = 'Add at least ' + MINP + ' players to make a schedule. You have ' + n + '.';
    else if (Sx === 0) t = 'All ' + n + ' players are on court every game. Partners and opponents change each game.';
    else {
      const per = P * g, base = Math.floor(per / n), extra = per % n;
      t = P + ' play each game and ' + Sx + ' rest' + (Sx === 1 ? 's' : '') + '. Everyone plays ' + (extra ? base + ' or ' + (base + 1) : base) + ' of ' + g + ' games, ' +
        (Sx * 2 <= n ? 'and nobody rests two games in a row.' : 'with rests spread as evenly as possible.');
    }
    $('#setupSummary').textContent = t;
  }

  function setGames(g) {
    draft.games = Math.max(MING, Math.min(MAXG, Math.round(Number(g) || DEFG)));
    touch(); updateSetupMeta(); saveDraft();
  }
  function showSetupError(msg) { const e = $('#setupError'); e.textContent = msg; e.hidden = false; }

  function generate() {
    const entries = draft.raw.map((v, ri) => ({ v: clean(v), ri })).filter(x => x.v);
    $$('.prow.dup').forEach(e => e.classList.remove('dup'));
    $('#setupError').hidden = true;
    const toSetup = () => { if (draft.step !== 'setup') { draft.step = 'setup'; renderNew(); } };
    if (entries.length < MINP) { toSetup(); showSetupError('Add at least ' + MINP + ' players. You have ' + entries.length + '.'); return; }
    const seen = new Map(), dups = [];
    entries.forEach(x => { const k = x.v.toLocaleLowerCase(); if (seen.has(k)) dups.push([seen.get(k), x]); else seen.set(k, x); });
    if (dups.length) {
      toSetup();
      dups.forEach(([a, b]) => [a.ri, b.ri].forEach(ri => { const li = $('.prow[data-i="' + ri + '"]'); if (li) li.classList.add('dup'); }));
      const nm = dups[0][1].v;
      showSetupError('“' + nm + '” is entered twice. Add a last initial, like ' + nm + ' K and ' + nm + ' M, so everyone can tell them apart.');
      return;
    }
    const btn = $('#toPreview');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Building schedule…';
    setTimeout(() => {
      const n = entries.length, c = effCourts(n);
      const prev = draft.schedule && draft.schedule.n === n && draft.schedule.courts === c && draft.schedule.games === draft.games ? draft.schedule.sig : null;
      draft.players = entries.map(x => x.v);
      draft.schedule = Engine.build(n, c, draft.games, prev);
      draft.genSig = setupSig();
      draft.step = 'preview';
      touch();
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Generate preview';
      saveDraft(true);
      renderNew();
      toTop();
    }, 30);
  }

  function metaLine(n, courts, games) {
    return n + ' players · ' + (courts === 2 ? 'Court 1 & Court 2' : 'Court 1') + ' · ' + games + ' games';
  }

  function renderPreview() {
    const sch = draft.schedule;
    $('#previewMeta').textContent = metaLine(sch.n, sch.courts, sch.games) + ' · ' + fmtDay(Date.now());
    renderFacts($('#previewFacts'), sch);
    $('#previewSchedule').innerHTML = scheduleHTML(draft.players, sch, 'preview');
    $('#previewStats').innerHTML = fairnessHTML(draft.players, sch);
  }

  function confirmSchedule() {
    if (!draft || !draft.schedule) return;
    if (draft.genSig !== setupSig()) { generate(); return; }
    const now = Date.now(), dk = dayKey(now);
    const seq = S.sessions.filter(s => !s.example && s.dayKey === dk).reduce((m, s) => Math.max(m, s.seq || 0), 0) + 1;
    const sch = draft.schedule;
    const obj = {
      day: fmtDay(now), dayKey: dk, seq, name: fmtDay(now) + ' · Session ' + seq,
      createdAt: now, expiresAt: now + KEEP_MS,
      createdBy: S.user.uid, createdByName: S.user.name,
      status: 'live',
      players: draft.players.slice(), courts: sch.courts, games: sch.games,
      schedule: { n: sch.n, courts: sch.courts, games: sch.games, rest: !!sch.rest, rounds: sch.rounds },
      winners: {}, done: {},
      updatedAt: now, updatedBy: S.user.uid, updatedByName: S.user.name
    };
    const id = S.store.newId();
    S.store.create(id, obj).catch(e => toast(errText(e)));
    draft = null;
    lsDel(DRAFT_KEY);
    location.hash = 's-' + id;
    toast('Session started.');
  }

  /* ===================== Schedule markup ===================== */
  function factItems(sch) {
    const a = Engine.analyze(sch, sch.n), g = sch.games, items = [];
    items.push(['Games per player', a.playMin === a.playMax
      ? (a.playMin === g ? 'Everyone plays all ' + g + ' games' : 'Everyone plays ' + a.playMin + ' of ' + g + ' games')
      : 'Everyone plays ' + a.playMin + ' or ' + a.playMax + ' of ' + g + ' games']);
    if (sch.rest) items.push(['Resting', a.consecRests === 0
      ? 'Nobody rests two games in a row'
      : 'Rests spread evenly (' + (a.restMin === a.restMax ? a.restMin : a.restMin + ' to ' + a.restMax) + ' each)']);
    items.push(['Partners', (a.pairsUsed === a.pairsTotal ? 'All ' + a.pairsTotal + ' pairings used' : a.pairsUsed + ' different pairings') +
      (a.maxPartner <= 1 ? ', no pair repeats' : ', a pair teams up at most ' + a.maxPartner + '×')]);
    return items;
  }
  function factsHTML(items, dl) {
    dl.className = 'facts k' + items.length;
    dl.style.setProperty('--k', items.length);
    dl.innerHTML = items.map(([k, v]) => '<div class="fact"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('');
  }
  function renderFacts(dl, sch) { factsHTML(factItems(sch), dl); }

  // One row per game, courts side by side. mode: 'preview' | 'live' | 'result'
  function scheduleHTML(names, sch, mode, W, D, playedSet) {
    W = W || {}; D = D || {};
    const live = mode === 'live', result = mode === 'result';
    const nm = i => esc(names[i]);
    const C = sch.courts;
    const team = (t, r, c, side) => {
      const sz = i => (names[i].length >= 13 ? ' class="xl"' : names[i].length >= 10 ? ' class="l"' : '');
      const inner = '<span' + sz(t[0]) + ' title="' + nm(t[0]) + '">' + nm(t[0]) + '</span><span' + sz(t[1]) + ' title="' + nm(t[1]) + '">' + nm(t[1]) + '</span>';
      const w = W['g' + r + 'c' + c];
      if (live) {
        return '<button type="button" class="tm" data-r="' + r + '" data-c="' + c + '" data-t="' + side + '" aria-pressed="' + (w === side) +
          '" aria-label="Game ' + (r + 1) + ', Court ' + (c + 1) + ': ' + nm(t[0]) + ' and ' + nm(t[1]) + ' won">' + inner + '</button>';
      }
      return '<div class="tm' + (result && w === side ? ' win' : '') + '">' + inner + '</div>';
    };
    let h = '<div class="sched" style="--c:' + C + '"><div class="sched-head" aria-hidden="true">' +
      Array.from({ length: C }, (_, c) => '<span>Court ' + (c + 1) + '</span>').join('') + '</div>';
    sch.rounds.forEach((r, ri) => {
      const d = live && !!D['g' + ri];
      const unplayed = result && playedSet && !playedSet.has(ri);
      h += '<section class="g' + (d ? ' done' : '') + (unplayed ? ' unplayed' : '') + '" data-r="' + ri + '"' + (live ? ' id="game-' + (ri + 1) + '"' : '') + ' aria-label="Game ' + (ri + 1) + '">' +
        '<div class="g-head"><span class="g-num"><small>Game</small>' + (ri + 1) + '</span>' +
        (live ? '<span class="tag tag-next">Up next</span>' : '') + (unplayed ? '<span class="tag tag-np">Not played</span>' : '') +
        '<span class="g-rest">' + (sch.rest ? '<b>Rest</b>' + r.rest.map(nm).join(', ') : '') + '</span>' +
        (live ? '<button type="button" class="check" data-r="' + ri + '" aria-pressed="' + d + '" aria-label="Game ' + (ri + 1) + ' finished">' + ICON.check + '</button>' : '') +
        '</div><div class="g-courts">' +
        r.courts.map((m, c) => '<div class="ct' + ((live || result) && W['g' + ri + 'c' + c] ? ' decided' : '') + '" role="group" aria-label="Court ' + (c + 1) + '">' +
          team(m.A, ri, c, 'A') + '<i class="nz" aria-hidden="true"></i>' + team(m.B, ri, c, 'B') + '</div>').join('') +
        '</div></section>';
    });
    return h + '</div>';
  }

  function fairnessHTML(names, sch) {
    const a = Engine.analyze(sch, sch.n), n = sch.n;
    const cols = ['Player', 'Plays'];
    if (sch.rest) cols.push('Rests');
    if (sch.courts === 2) cols.push('Court 1', 'Court 2');
    cols.push('Partners');
    const head = '<thead><tr>' + cols.map(c => '<th scope="col">' + c + '</th>').join('') + '</tr></thead>';
    const body = names.map((name, i) => {
      let row = '<td>' + esc(name) + '</td><td>' + a.played[i] + '<span class="minibar" aria-hidden="true"><i style="width:' + Math.round(a.played[i] / sch.games * 100) + '%"></i></span></td>';
      if (sch.rest) row += '<td>' + a.rested[i] + '</td>';
      if (sch.courts === 2) row += '<td>' + a.court[i * 2] + '</td><td>' + a.court[i * 2 + 1] + '</td>';
      row += '<td>' + a.distinct[i] + ' of ' + (n - 1) + '</td>';
      return '<tr>' + row + '</tr>';
    }).join('');
    return '<table class="stats">' + head + '<tbody>' + body + '</tbody></table>';
  }

  /* ===================== Results analysis (no points, no timing) ===================== */
  function sessionPlayed(s) {
    const sch = s.schedule, W = s.winners || {}, D = s.done || {}, out = [];
    sch.rounds.forEach((r, ri) => {
      let any = !!D['g' + ri];
      for (let c = 0; c < sch.courts; c++) if (W['g' + ri + 'c' + c]) any = true;
      if (any) out.push(ri);
    });
    return out;
  }

  function analyzeResults(s) {
    const names = s.players, n = names.length, sch = s.schedule, G = sch.rounds.length, C = sch.courts;
    const W = s.winners || {};
    const played = sessionPlayed(s), playedSet = new Set(played);
    const notPlayed = [];
    for (let r = 0; r < G; r++) if (!playedSet.has(r)) notPlayed.push(r);
    const P = names.map((name, i) => ({ id: i, name, played: 0, rested: 0, won: 0, lost: 0, open: 0, cur: 0, streak: 0 }));
    const pairs = {};
    const pk = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
    const pairOf = (a, b) => pairs[pk(a, b)] || null;
    let courtsPlayed = 0, decided = 0;

    played.forEach(ri => {
      const r = sch.rounds[ri];
      r.rest.forEach(i => { P[i].rested++; });
      r.courts.forEach((m, c) => {
        courtsPlayed++;
        [m.A, m.B].forEach(t => {
          const k = pk(t[0], t[1]);
          if (!pairs[k]) pairs[k] = { a: Math.min(t[0], t[1]), b: Math.max(t[0], t[1]), w: 0, l: 0, g: 0 };
          pairs[k].g++;
        });
        m.A.concat(m.B).forEach(i => { P[i].played++; });
        const w = W['g' + ri + 'c' + c];
        if (!w) { m.A.concat(m.B).forEach(i => { P[i].open++; }); return; }
        decided++;
        const win = w === 'A' ? m.A : m.B, lose = w === 'A' ? m.B : m.A;
        pairs[pk(win[0], win[1])].w++;
        pairs[pk(lose[0], lose[1])].l++;
        win.forEach(i => { P[i].won++; P[i].cur++; if (P[i].cur > P[i].streak) P[i].streak = P[i].cur; });
        lose.forEach(i => { P[i].lost++; P[i].cur = 0; });
      });
    });

    const maxPlayed = Math.max.apply(null, P.map(p => p.played).concat([0]));
    P.forEach(p => {
      const dec = p.won + p.lost;
      p.winPct = dec ? p.won / dec : null;
      p.eligible = dec >= 1 && p.played * 2 >= maxPlayed;
    });

    const cmp = (a, b) => (b.winPct - a.winPct) || (b.won - a.won) || (a.lost - b.lost) || a.name.localeCompare(b.name);
    const ranked = P.filter(p => p.eligible).sort(cmp);
    ranked.forEach((p, i) => {
      const prev = ranked[i - 1];
      p.rank = prev && prev.winPct === p.winPct && prev.won === p.won && prev.lost === p.lost ? prev.rank : i + 1;
    });
    const unranked = P.filter(p => !p.eligible).sort((a, b) => (b.won - a.won) || a.name.localeCompare(b.name));

    const plist = Object.keys(pairs).map(k => pairs[k]);
    const pairName = pr => names[pr.a] + ' & ' + names[pr.b];
    const dayWins = pr => P[pr.a].won + P[pr.b].won;
    const pairOfDay = plist.filter(pr => pr.w >= 1).sort((x, y) => (y.w - x.w) || (x.l - y.l) || (dayWins(y) - dayWins(x)) || pairName(x).localeCompare(pairName(y)))[0] || null;
    const unbeaten = plist.filter(pr => pr.w >= 2 && pr.l === 0).sort((x, y) => (y.w - x.w) || pairName(x).localeCompare(pairName(y)));

    return { G, C, n, names, played, playedSet, notPlayed, courtsPlayed, decided, P, ranked, unranked, pairOf, pairOfDay, unbeaten, pairName };
  }

  function rangeText(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      let j = i;
      while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
      out.push(i === j ? String(list[i] + 1) : (list[i] + 1) + '–' + (list[j] + 1));
      i = j;
    }
    return out.join(', ');
  }

  function analysisHTML(s, R) {
    const names = s.players;
    const top = R.ranked[0];
    const facts = [
      ['Games played', R.played.length + ' of ' + R.G + (R.notPlayed.length ? ' (not played: ' + rangeText(R.notPlayed) + ')' : '')],
      ['Results recorded', R.decided + ' of ' + R.courtsPlayed + ' court games'],
      ['Player of the day', top ? top.name + ' · ' + pct(top.winPct) + ' (' + top.won + '–' + top.lost + ')' : 'Pick winners to see this'],
      ['Pair of the day', R.pairOfDay ? R.pairName(R.pairOfDay) + ' · ' + R.pairOfDay.w + '–' + R.pairOfDay.l : 'Pick winners to see this']
    ];
    let h = '<dl class="facts k4" style="--k:4">' + facts.map(([k, v]) => '<div class="fact"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';

    // Game timeline
    h += '<div class="panel"><div class="panel-head"><h3>Games</h3><span class="count">' + R.played.length + ' of ' + R.G + '</span></div><div class="timeline">';
    for (let r = 0; r < R.G; r++) {
      const on = R.playedSet.has(r);
      h += '<span class="tb ' + (on ? 'on' : 'off') + '" title="Game ' + (r + 1) + (on ? ' played' : ' not played') + '">' + (r + 1) + '</span>';
    }
    h += '</div><div class="legend"><span><i style="background:var(--ball)"></i>Played</span><span><i style="border:2px dashed var(--line-strong)"></i>Not played (left out of the numbers)</span></div></div>';

    // Podium + pairs
    h += '<div class="an-grid"><div class="panel"><h3>Podium</h3>' + podiumHTML(R) + '</div>';
    h += '<div class="panel"><h3>Pairs</h3>' + pairsHTML(R) + '</div></div>';

    // Leaderboard
    h += '<div class="panel"><div class="panel-head"><h3>Leaderboard</h3></div><div class="table-scroll">' + boardHTML(s, R) + '</div>' +
      '<div class="legend"><span><i style="background:var(--surround)"></i>Wins</span><span><i style="background:var(--loss)"></i>Losses</span></div>' +
      (R.unranked.length ? '<p class="hint">Not ranked: players with no result yet, or with fewer than half as many games as the busiest player.</p>' : '') + '</div>';

    // Partner chemistry
    h += '<div class="panel"><div class="panel-head"><h3>Partner chemistry</h3></div><p class="note">Each square shows wins–losses for two players as teammates. Greener means a better record together. Blank means they were never partners.</p>' +
      '<div class="table-scroll" style="margin-top:12px">' + chemHTML(R) + '</div></div>';

    // Results table
    h += '<div class="sec-head"><h3>Results</h3><p class="note"><span class="win-key" aria-hidden="true"></span>Winning team</p></div>';
    h += scheduleHTML(names, s.schedule, 'result', s.winners, s.done, R.playedSet);

    h += '<details class="panel stats-panel howto"><summary>How these numbers are worked out</summary><ol>' +
      '<li><strong>Played games:</strong> a game counts if it was crossed out or any court in it has a winner. Other games are left out of every number.</li>' +
      '<li><strong>Win %</strong> = wins ÷ (wins + losses). A court with no winner picked counts as played, but not as a win or a loss.</li>' +
      '<li><strong>Ranking:</strong> highest win %, then most wins, then fewest losses. To be ranked, a player needs at least one result and at least half as many games as the busiest player.</li>' +
      '<li><strong>Best streak:</strong> most wins in a row. Resting does not break a streak.</li>' +
      '<li><strong>Pair of the day:</strong> the two teammates with the most wins together. Ties go to fewer losses together, then to the pair with more wins that day overall. <strong>Unbeaten pairs</strong> won 2 or more games together and never lost.</li>' +
      '</ol></details>';
    return h;
  }

  function podiumHTML(R) {
    const top = R.ranked.slice(0, 3);
    if (!top.length) return '<p class="note">Pick winners during play to see the podium.</p>';
    return '<div class="podium">' + [1, 0, 2].map(pos => {
      const p = top[pos];
      if (!p) return '<div></div>';
      const m = Math.min(p.rank, 3);
      return '<div class="pod p' + (pos + 1) + '"><div class="medal m' + m + '"><span>' + esc(initial(p.name)) + '</span></div>' +
        '<div class="pname">' + esc(p.name) + '</div><div class="pstat">' + pct(p.winPct) + ' · ' + p.won + '–' + p.lost + '</div>' +
        '<div class="block">' + p.rank + '</div></div>';
    }).join('') + '</div>';
  }

  function pairsHTML(R) {
    let h = '';
    const pd = R.pairOfDay;
    if (pd) {
      h += '<div class="star"><div class="duo" aria-hidden="true"><span>' + esc(initial(R.names[pd.a])) + '</span><span>' + esc(initial(R.names[pd.b])) + '</span></div>' +
        '<div><h4>Pair of the day</h4><p>' + esc(R.pairName(pd)) + '</p><span class="hint">' + pd.w + ' win' + (pd.w === 1 ? '' : 's') + ', ' + pd.l + ' loss' + (pd.l === 1 ? '' : 'es') + ' together</span></div></div>';
    } else {
      h += '<p class="note">Pick winners during play to see the pair of the day.</p>';
    }
    h += '<span class="label" style="margin-top:6px">Unbeaten pairs</span>';
    h += R.unbeaten.length
      ? '<ul class="pairs">' + R.unbeaten.map(pr => '<li><span>' + esc(R.pairName(pr)) + '</span><span>' + pr.w + '–0</span></li>').join('') + '</ul>'
      : '<p class="note">No pair won 2 or more games together without a loss.</p>';
    return h;
  }

  function boardHTML(s, R) {
    const rest = !!s.schedule.rest;
    const maxDec = Math.max(1, Math.max.apply(null, R.P.map(p => p.won + p.lost)));
    let h = '<table class="board"><thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Wins–losses</th><th scope="col" class="num">Win %</th><th scope="col" class="num">Played</th>' +
      (rest ? '<th scope="col" class="num">Rested</th>' : '') + '<th scope="col" class="num">Best streak</th></tr></thead><tbody>';
    R.ranked.concat(R.unranked).forEach(p => {
      const bar = '<span class="wl"><span class="wl-bar" aria-hidden="true"><i class="w" style="width:' + (p.won / maxDec * 100) + '%"></i><i class="l" style="width:' + (p.lost / maxDec * 100) + '%"></i></span><span class="wl-num">' + p.won + '–' + p.lost + '</span></span>';
      h += '<tr' + (p.eligible ? '' : ' class="unranked"') + '><td class="rk">' + (p.eligible ? p.rank : '–') + '</td><td class="pl">' + esc(p.name) + '</td><td>' + bar + '</td>' +
        '<td class="num">' + (p.winPct == null ? '–' : pct(p.winPct)) + '</td><td class="num">' + p.played + '</td>' +
        (rest ? '<td class="num">' + p.rested + '</td>' : '') +
        '<td class="num">' + p.streak + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function chemHTML(R) {
    const names = R.names, n = names.length;
    let h = '<table class="chem"><thead><tr><th></th>' + names.map(nm => '<th class="colh" scope="col" title="' + esc(nm) + '">' + esc(nm) + '</th>').join('') + '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
      h += '<tr><th class="rowh" scope="row" title="' + esc(names[i]) + '">' + esc(names[i]) + '</th>';
      for (let j = 0; j < n; j++) {
        if (i === j) { h += '<td class="self"></td>'; continue; }
        const pr = R.pairOf(i, j);
        if (!pr) { h += '<td class="none"></td>'; continue; }
        if (pr.w + pr.l === 0) { h += '<td class="none" title="Partners, no winner picked">0–0</td>'; continue; }
        const mix = Math.round(12 + (pr.w / (pr.w + pr.l)) * 50);
        h += '<td style="background:var(--surface-2);background:color-mix(in srgb,var(--heat) ' + mix + '%,var(--surface))" title="' + esc(names[i] + ' & ' + names[j]) + ': ' + pr.w + ' won, ' + pr.l + ' lost together">' + pr.w + '–' + pr.l + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }

  /* ===================== Session view ===================== */
  let sessKey = '';
  let sessUI = { names: false, confirm: null };
  const curSession = () => S.sessions.find(x => x.id === S.route.id) || null;
  const canDelete = s => S.isAdmin || s.example || s.createdBy === S.user.uid;

  function renderSession() {
    const s = curSession();
    if (!s) {
      sessKey = '';
      $('#sTitle').textContent = S.loaded ? 'Session not found' : 'Loading…';
      $('#sMeta').textContent = S.loaded ? 'It may have been deleted, or its 7 days are up.' : '';
      $('#sUpdated').textContent = '';
      $('#sActions').innerHTML = '';
      $('#sBody').innerHTML = S.loaded ? '<a class="btn secondary" href="#home">Back to sessions</a>' : '';
      return;
    }
    const done = s.status === 'completed';
    $('#sTitle').innerHTML = esc(sessionTitle(s)) + ' <span class="chip-status ' + (s.example ? 'example">Example' : done ? 'completed">Completed' : 'live">Live') + '</span>';
    $('#sMeta').textContent = metaLine(s.players.length, s.schedule.courts, s.schedule.games) + ' · Deletes ' + fmtShort(s.expiresAt);
    $('#sUpdated').textContent = s.updatedAt && s.updatedAt - s.createdAt > 1000 && s.updatedByName
      ? 'Last change by ' + (clean(s.updatedByName) || 'a member') + ' at ' + fmtTime(s.updatedAt) : 'Started by ' + (clean(s.createdByName) || 'a member') + ' at ' + fmtTime(s.createdAt);

    const key = [s.id, s.status, s.players.join('|'), sessUI.names, sessUI.confirm, done ? JSON.stringify([s.winners, s.done]) : ''].join('#');
    if (key !== sessKey) {
      sessKey = key;
      $('#sActions').innerHTML = done
        ? '<button type="button" class="btn primary" data-act="pdf">' + ICON.down + 'Report PDF</button><button type="button" class="btn ghost" data-act="reopen">' + ICON.undo + 'Reopen</button>'
        : '<button type="button" class="btn ghost" data-act="sched-pdf">' + ICON.down + 'Schedule PDF</button><button type="button" class="btn primary" data-act="complete">' + ICON.flag + 'Complete session</button>';
      $('#sBody').innerHTML = (done ? completedBody(s) : liveBody(s)) + toolsRow(s, done);
    }
    if (!done) paintLive(s);
  }

  function confirmBar() {
    const s = curSession();
    if (!s || !sessUI.confirm) return '';
    if (sessUI.confirm === 'complete') {
      const R = sessionPlayed(s), G = s.schedule.games, missing = [];
      for (let r = 0; r < G; r++) if (R.indexOf(r) < 0) missing.push(r);
      return '<div class="confirm-bar calm" id="confirmBar"><span>Finish this session with <strong>' + R.length + ' of ' + G + '</strong> games played?' +
        (missing.length ? ' Game' + (missing.length > 1 ? 's ' : ' ') + rangeText(missing) + ' will be marked not played and left out of the analysis.' : '') + '</span>' +
        '<button type="button" class="btn primary small" data-act="complete-yes">Complete session</button><button type="button" class="btn ghost small" data-act="cancel">Keep playing</button></div>';
    }
    return '';
  }

  function liveBody(s) {
    let h = confirmBar();
    h += '<div class="progress"><div class="track" role="progressbar" aria-labelledby="progressText" aria-valuemin="0" id="progressBar"><span class="fill" id="progressFill"></span></div>' +
      '<span class="ptext" id="progressText"></span><button type="button" class="btn ghost small" id="jumpNext">Go to next game</button></div>';
    h += '<p class="note"><span class="win-key" aria-hidden="true"></span>Tap a team to record the winner. Tap the circle when a game is finished. A game is marked finished automatically once every court has a winner.</p>';
    if (sessUI.names) {
      h += '<div class="panel" id="namesPanel"><h3>Edit names</h3><p class="note">Fix spelling here. The schedule and results stay the same.</p><div class="names-grid">' +
        s.players.map((p, i) => '<input id="nm-' + i + '" data-i="' + i + '" type="text" value="' + esc(p) + '" maxlength="32" autocapitalize="words" spellcheck="true" aria-label="Player ' + (i + 1) + ' name">').join('') +
        '</div><p class="error" id="namesErr" role="alert" hidden></p><div class="row-actions"><button type="button" class="btn primary small" data-act="names-save">Save names</button><button type="button" class="btn ghost small" data-act="names-cancel">Cancel</button></div></div>';
    }
    h += scheduleHTML(s.players, s.schedule, 'live', s.winners, s.done);
    h += '<details class="panel stats-panel"><summary>Player summary</summary><div class="table-scroll">' + fairnessHTML(s.players, s.schedule) + '</div></details>';
    return h;
  }

  function completedBody(s) {
    return analysisHTML(s, analyzeResults(s));
  }

  function toolsRow(s, done) {
    if (sessUI.confirm === 'delete') {
      return '<div class="confirm-bar" id="deleteBar"><span>Delete this session for everyone? This cannot be undone.</span>' +
        '<button type="button" class="btn danger small" data-act="delete-yes">Delete session</button><button type="button" class="btn ghost small" data-act="cancel">Cancel</button></div>';
    }
    const items = [];
    if (!done) items.push('<button type="button" class="link-btn" data-act="names">Edit player names</button>');
    if (canDelete(s)) items.push('<button type="button" class="danger-link" data-act="delete">Delete this session</button>');
    return items.length ? '<div class="tools">' + items.join('') + '</div>' : '';
  }

  function paintLive(s) {
    const D = s.done || {}, W = s.winners || {};
    const rows = $$('#sBody .g');
    let count = 0, next = -1;
    rows.forEach(tr => {
      const r = +tr.dataset.r, d = !!D['g' + r];
      if (d) count++; else if (next < 0) next = r;
      tr.classList.toggle('done', d);
      const b = $('.check', tr);
      if (b) b.setAttribute('aria-pressed', String(d));
    });
    rows.forEach(tr => tr.classList.toggle('next', +tr.dataset.r === next));
    $$('#sBody button.tm').forEach(b => {
      const w = W['g' + b.dataset.r + 'c' + b.dataset.c];
      b.setAttribute('aria-pressed', String(w === b.dataset.t));
      b.closest('.ct').classList.toggle('decided', !!w);
    });
    const total = rows.length;
    const fill = $('#progressFill');
    if (fill) fill.style.width = (total ? (count / total) * 100 : 0) + '%';
    const bar = $('#progressBar');
    if (bar) { bar.setAttribute('aria-valuemax', String(total)); bar.setAttribute('aria-valuenow', String(count)); }
    const pt = $('#progressText');
    if (pt) pt.textContent = count === total ? 'All ' + total + ' games finished' : count + ' of ' + total + ' games finished';
    const j = $('#jumpNext');
    if (j) { j.hidden = next < 0; j.dataset.r = String(next); j.textContent = 'Go to game ' + (next + 1); }
  }

  function stamp(p) { p.updatedAt = Date.now(); p.updatedBy = S.user.uid; p.updatedByName = S.user.name; return p; }

  function toggleWinner(s, r, c, t) {
    const W = s.winners || {}, key = 'g' + r + 'c' + c, next = W[key] === t ? DEL : t;
    const patch = {};
    patch['winners.' + key] = next;
    if (next !== DEL) {
      let all = true;
      for (let k = 0; k < s.schedule.courts; k++) {
        const kk = 'g' + r + 'c' + k;
        if (!(kk === key ? next : W[kk])) all = false;
      }
      if (all && !(s.done || {})['g' + r]) { patch['done.g' + r] = true; toast('Game ' + (r + 1) + ' finished.'); }
    }
    S.store.update(s.id, stamp(patch)).catch(e => toast(errText(e)));
  }
  function toggleDone(s, r) {
    const patch = {};
    patch['done.g' + r] = (s.done || {})['g' + r] ? DEL : true;
    S.store.update(s.id, stamp(patch)).catch(e => toast(errText(e)));
  }
  function saveNames(s) {
    const vals = s.players.map((_, i) => clean(($('#nm-' + i) || {}).value || ''));
    const err = $('#namesErr');
    if (vals.some(v => !v)) { err.textContent = 'Every player needs a name.'; err.hidden = false; return; }
    const lower = vals.map(v => v.toLocaleLowerCase());
    const dup = vals.find((v, i) => lower.indexOf(lower[i]) !== i);
    if (dup) { err.textContent = '“' + dup + '” is used twice. Add a last initial to tell them apart.'; err.hidden = false; return; }
    sessUI.names = false;
    S.store.update(s.id, stamp({ players: vals })).then(() => toast('Names saved.')).catch(e => toast(errText(e)));
    renderSession();
  }

  $('#view-session').addEventListener('click', e => {
    const s = curSession();
    if (!s) return;
    const sd = e.target.closest('button.tm');
    if (sd && s.status !== 'completed') { toggleWinner(s, +sd.dataset.r, +sd.dataset.c, sd.dataset.t); return; }
    const ck = e.target.closest('.check');
    if (ck && s.status !== 'completed') { toggleDone(s, +ck.dataset.r); return; }
    if (e.target.closest('#jumpNext')) {
      const row = $('#game-' + (+e.target.closest('#jumpNext').dataset.r + 1));
      if (row) row.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'names') {
      sessUI.names = true; sessUI.confirm = null; renderSession();
      const panel = $('#namesPanel');
      if (panel) panel.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      const f = $('#nm-0'); if (f) f.focus({ preventScroll: true });
    }
    else if (act === 'names-cancel') { sessUI.names = false; renderSession(); }
    else if (act === 'names-save') saveNames(s);
    else if (act === 'complete') { sessUI.confirm = 'complete'; sessUI.names = false; renderSession(); toTop(); }
    else if (act === 'complete-yes') {
      sessUI.confirm = null;
      S.store.update(s.id, stamp({ status: 'completed', completedAt: Date.now(), completedByName: S.user.name })).catch(err => toast(errText(err)));
      toTop();
      toast('Session completed.');
    }
    else if (act === 'reopen') {
      S.store.update(s.id, stamp({ status: 'live' })).catch(err => toast(errText(err)));
      toast('Session reopened.');
    }
    else if (act === 'cancel') { sessUI.confirm = null; renderSession(); }
    else if (act === 'delete') { sessUI.confirm = 'delete'; renderSession(); const bar = $('#deleteBar'); if (bar) bar.scrollIntoView({ block: 'center' }); }
    else if (act === 'delete-yes') {
      sessUI.confirm = null;
      S.store.remove(s.id).catch(err => toast(errText(err)));
      location.hash = 'home';
      toast('Session deleted.');
    }
    else if (act === 'pdf') exportPdf(s, b, 'report');
    else if (act === 'sched-pdf') exportPdf(s, b, 'schedule');
  });
  $('#view-session').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('#namesPanel input')) { e.preventDefault(); const s = curSession(); if (s) saveNames(s); }
  });

  /* ===================== Members (up to 12 Google accounts) ===================== */
  let membersBuilt = false, confirmRemove = '', editing = '', listKey = '';
  const ownerEmail = () => (CLOUD ? ADMIN : DEMO_EMAIL);
  function memberList() {
    const owner = ownerEmail();
    return [owner].concat(S.members.filter(e => e !== owner)).slice(0, MAX_MEMBERS);
  }
  function namesFor(list) {
    const out = {};
    list.forEach(em => { if (S.names[em]) out[em] = S.names[em]; });
    return out;
  }
  function usernameError(v, exceptEmail) {
    if (!v) return 'Type a username.';
    if (!USERNAME_RE.test(v)) return 'Use 2 to 20 letters or numbers. Spaces, dots, dashes and underscores are allowed.';
    const low = v.toLocaleLowerCase();
    const clash = memberList().find(em => em !== exceptEmail && S.names[em] && S.names[em].toLocaleLowerCase() === low);
    return clash ? '“' + v + '” is already used by another member.' : '';
  }
  function saveRoster(emails, names, changes, okMsg) {
    S.store.saveMembers(emails, names, changes).then(() => toast(okMsg)).catch(er => toast(errText(er)));
  }
  function renderMembers() {
    const body = $('#mBody');
    if (!S.isAdmin) {
      membersBuilt = false;
      body.innerHTML = '<p class="note">This page is only for the organizer.</p><div class="row-actions"><a class="btn secondary" href="#home">Back to sessions</a></div>';
      return;
    }
    if (!membersBuilt) {
      membersBuilt = true;
      listKey = '';
      body.innerHTML = '<div class="panel-head"><div class="seats"><span class="count" id="seatCount"></span><span class="seat-dots" id="seatDots" aria-hidden="true"></span></div></div>' +
        '<p class="note">Add each person’s Gmail address and a username, up to 12 people including you. The username is shown in the app instead of the email. Removed members lose access straight away. Players in a game do not need an account.</p>' +
        (CLOUD ? '' : '<p class="hint">In demo mode this list is only for practice.</p>') +
        '<ul class="mlist" id="mList"></ul>' +
        '<form class="addrow" id="addMember" novalidate><span class="label" style="flex-basis:100%;margin:0">Add a member</span>' +
        '<input id="memberEmail" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="name@gmail.com" aria-label="Gmail address">' +
        '<input id="memberName" class="uname-in" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Username" aria-label="Username">' +
        '<button type="submit" class="btn primary" id="addMemberBtn">' + ICON.plus + 'Add</button></form><p class="error" id="memberErr" role="alert" hidden></p>';
    }
    const list = memberList();
    const key = JSON.stringify([list, namesFor(list), editing, confirmRemove]);
    $('#seatCount').textContent = list.length + ' of ' + MAX_MEMBERS + ' seats used';
    $('#addMemberBtn').disabled = list.length >= MAX_MEMBERS;
    if (key === listKey) return;   // nothing changed: keep what the organizer is typing
    listKey = key;
    $('#seatDots').innerHTML = Array.from({ length: MAX_MEMBERS }, (_, i) => '<i class="' + (i < list.length ? 'on' : '') + '"></i>').join('');
    const owner = list[0];
    $('#mList').innerHTML = list.map(em => {
      const u = S.names[em] || '';
      const shownEmail = esc(em === DEMO_EMAIL ? 'demo organizer' : em);
      if (em === editing) {
        return '<li class="editing"><form class="erow" data-edit-form="' + esc(em) + '" novalidate>' +
          '<input id="editName" class="uname-in" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" value="' + esc(u) + '" aria-label="Username for ' + shownEmail + '">' +
          '<button type="submit" class="btn primary small">Save</button><button type="button" class="btn ghost small" data-edit-cancel>Cancel</button></form>' +
          '<span class="memail">' + shownEmail + '</span><p class="error" id="editErr" role="alert" hidden></p></li>';
      }
      if (em === confirmRemove) {
        return '<li class="confirming"><span class="memail">Remove <strong>' + esc(u || em) + '</strong> (' + esc(em) + ')? They lose access straight away.</span>' +
          '<span class="mbtns"><button type="button" class="btn danger small" data-remove-yes="' + esc(em) + '">Remove</button>' +
          '<button type="button" class="btn ghost small" data-remove-no>Cancel</button></span></li>';
      }
      return '<li><span class="mwho"><span class="mname">' + (u ? esc(u) : '<span class="soft">No username</span>') + '</span><span class="memail">' + shownEmail + '</span></span>' +
        (em === owner ? '<span class="mtag">Organizer</span>' : '') +
        '<button type="button" class="icon-btn edit" data-edit="' + esc(em) + '" aria-label="Change username for ' + shownEmail + '">' + ICON.pen + '</button>' +
        (em === owner ? '' : '<button type="button" class="icon-btn" data-remove="' + esc(em) + '" aria-label="Remove ' + shownEmail + '">' + ICON.x + '</button>') + '</li>';
    }).join('');
    if (editing) { const f = $('#editName'); if (f) { f.focus(); f.select(); } }
  }
  $('#view-members').addEventListener('submit', e => {
    if (!S.isAdmin) return;
    e.preventDefault();
    if (e.target.id === 'addMember') {
      const err = $('#memberErr');
      const v = clean($('#memberEmail').value).toLowerCase();
      const u = clean($('#memberName').value);
      const list = memberList();
      let msg = '';
      if (!EMAIL_RE.test(v)) msg = 'Type a full Gmail address, like name@gmail.com.';
      else if (list.indexOf(v) >= 0) msg = v + ' is already a member.';
      else if (list.length >= MAX_MEMBERS) msg = 'All 12 seats are used. Remove someone first.';
      else msg = usernameError(u, v);
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      const nextList = list.concat([v]);
      saveRoster(nextList, Object.assign(namesFor(list), { [v]: u }), { [v]: u }, u + ' added.');
      $('#memberEmail').value = ''; $('#memberName').value = '';
      return;
    }
    const ef = e.target.closest('[data-edit-form]');
    if (ef) {
      const em = ef.dataset.editForm, u = clean($('#editName').value), err = $('#editErr');
      const msg = usernameError(u, em);
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      editing = '';
      const list = memberList();
      saveRoster(list, Object.assign(namesFor(list), { [em]: u }), { [em]: u }, 'Username saved.');
      renderMembers();
    }
  });
  $('#view-members').addEventListener('click', e => {
    if (!S.isAdmin) return;
    const ed = e.target.closest('[data-edit]');
    if (ed) { editing = ed.dataset.edit; confirmRemove = ''; renderMembers(); return; }
    if (e.target.closest('[data-edit-cancel]')) { editing = ''; renderMembers(); return; }
    const ask = e.target.closest('[data-remove]');
    if (ask) { confirmRemove = ask.dataset.remove; editing = ''; renderMembers(); return; }
    if (e.target.closest('[data-remove-no]')) { confirmRemove = ''; renderMembers(); return; }
    const yes = e.target.closest('[data-remove-yes]');
    if (yes) {
      const em = yes.dataset.removeYes, gone = S.names[em] || em;
      confirmRemove = '';
      const list = memberList().filter(x => x !== em);
      saveRoster(list, namesFor(list), { [em]: null }, gone + ' removed.');
      renderMembers();
    }
  });

  /* ===================== Footer text (set in firebase-config.js) ===================== */
  function renderCredit() {
    const f = $('#credit');
    if (!f) return;
    f.textContent = '';
    if (FOOTER_TEXT) { const p1 = document.createElement('p'); p1.textContent = FOOTER_TEXT; f.appendChild(p1); }
    f.hidden = !f.childNodes.length;
  }

  /* ===================== PDF (completed sessions only) ===================== */
  let jsPdfPromise = null;
  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (!jsPdfPromise) {
      jsPdfPromise = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = JSPDF_URL;
        sc.onload = () => res();
        sc.onerror = () => { jsPdfPromise = null; rej(new Error('load')); };
        document.head.appendChild(sc);
      });
    }
    return jsPdfPromise;
  }

  let dlApi;
  async function getDownloads() {
    if (dlApi !== undefined) return dlApi;
    dlApi = null;
    if (window.claude && typeof window.claude.use === 'function') {
      try { dlApi = await window.claude.use('downloads'); } catch (e) { dlApi = null; }
    }
    return dlApi;
  }
  async function saveFile(name, data, mime) {
    const api = await getDownloads();
    if (api) {
      try {
        const r = await api.save({ filename: name, data });
        if (!(r && r.status === 'delivered')) toast('PDF saved.');
      } catch (e) {
        const c = e && e.code;
        toast(c === 'declined' ? 'Download cancelled.' : c === 'rate_limited' ? 'A download prompt is already open.' : 'Could not save the file here.');
      }
      return;
    }
    if (PREVIEW) { toast('Downloads are not available in this view.'); return; }
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 5000);
    toast('PDF downloaded.');
  }

  async function exportPdf(s, btn, kind) {
    btn.disabled = true;
    try {
      await ensureJsPdf();
      const buf = kind === 'schedule' ? buildSchedulePdf(s) : buildReportPdf(s, analyzeResults(s));
      const base = 'pickleball-' + (s.dayKey || dayKey(s.createdAt)) + (s.example ? '-example' : '-session-' + (s.seq || 1));
      await saveFile(base + (kind === 'schedule' ? '-schedule' : '-report') + '.pdf', buf, 'application/pdf');
    } catch (e) {
      toast(e && e.message === 'load' ? 'Could not load the PDF tool. Check your connection and try again.' : 'Could not create the PDF. Try again.');
      if (window.console) console.error(e);
    } finally {
      btn.disabled = false;
    }
  }

  // Shared page set-up for both PDFs: A4 portrait, header band, footer with page numbers.
  function pdfKit(s, metaText, subText) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const k = { doc, W: 210, H: 297, M: 12, FOOT: 11, y: 0 };
    k.CW = k.W - 2 * k.M;
    k.C = {
      court: [44, 103, 168], courtSoft: [227, 237, 248], kitchen: [208, 225, 243], ink: [17, 38, 59], ink2: [82, 101, 120],
      line: [219, 227, 227], surround: [34, 129, 93], ball: [216, 238, 62], hole: [175, 196, 37], onBall: [27, 42, 5],
      zebra: [246, 249, 248], white: [255, 255, 255], loss: [224, 120, 107], gold: [217, 165, 32], silver: [154, 168, 181], bronze: [192, 122, 69]
    };
    k.fill = c => doc.setFillColor(c[0], c[1], c[2]);
    k.stroke = c => doc.setDrawColor(c[0], c[1], c[2]);
    k.ink = c => doc.setTextColor(c[0], c[1], c[2]);
    k.font = (w, sz) => { doc.setFont('helvetica', w); doc.setFontSize(sz); };
    k.mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
    k.txt = t => String(t).replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    k.clip = (t, maxW) => {
      t = k.txt(t);
      if (doc.getTextWidth(t) <= maxW) return t;
      let u = t;
      while (u.length > 1 && doc.getTextWidth(u + '...') > maxW) u = u.slice(0, -1);
      return u + '...';
    };
    k.title = k.txt(sessionTitle(s));
    k.meta = metaText;
    k.band = first => {
      const { fill, ink, font, C, W, M } = k;
      if (first) {
        fill(C.court); doc.rect(0, 0, W, 26, 'F');
        fill(C.surround); doc.rect(0, 26, W, 1.4, 'F');
        const bx = W - M - 7.5, by = 13;
        fill(C.ball); doc.circle(bx, by, 7.5, 'F');
        fill(C.hole);
        [[0, -4.4], [-3.9, -1.9], [3.9, -1.9], [0, 0.3], [-3, 3.6], [3, 3.6], [0, 5.7]].forEach(([dx, dy]) => doc.circle(bx + dx, by + dy, 0.95, 'F'));
        ink(C.white); font('bold', 17); doc.text(k.title, M, 11.5);
        font('normal', 9.5); doc.text(k.txt(metaText), M, 18);
        font('normal', 8); doc.text(k.txt(subText), M, 22.6);
        k.y = 34;
      } else {
        fill(C.court); doc.rect(0, 0, W, 11, 'F');
        ink(C.white); font('bold', 10.5); doc.text(k.title, M, 7.3);
        font('normal', 8); doc.text(k.txt(metaText), W - M, 7.3, { align: 'right' });
        k.y = 18;
      }
    };
    k.room = () => k.H - k.M - k.FOOT - k.y;
    k.ensure = h => { if (h > k.room()) { doc.addPage(); k.band(false); return true; } return false; };
    k.heading = (t, need) => {
      k.ensure((need || 0) + 10);
      k.ink(k.C.ink); k.font('bold', 12.5); doc.text(k.txt(t), k.M, k.y + 5);
      k.y += 9;
    };
    k.finish = label => {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        k.ink(k.C.ink2); k.font('normal', 7.5);
        doc.text(k.txt('Pickleball Rotation Planner  |  ' + k.title + '  |  ' + label), k.M, k.H - 7);
        doc.text('Page ' + i + ' of ' + pages, k.W - k.M, k.H - 7, { align: 'right' });
      }
      return doc.output('arraybuffer');
    };
    return k;
  }

  // The game grid used by both PDFs. Rows shrink so that up to 20 games fit on one page.
  function pdfSchedule(k, s, opts) {
    const { doc, fill, stroke, ink, font, C, M, CW } = k;
    const names = s.players, sch = s.schedule, NC = sch.courts, G = sch.rounds.length;
    const W8 = (opts && opts.winners) || null, played = (opts && opts.playedSet) || null;
    const gameW = 14, restW = sch.rest ? (NC === 2 ? 38 : 50) : 0, courtW = (CW - gameW - restW) / NC;
    const head = () => {
      fill(C.ink); doc.roundedRect(M, k.y, CW, 7, 1.2, 1.2, 'F');
      ink(C.white); font('bold', 7.2);
      let x = M; const ty = k.y + 4.6;
      doc.text('GAME', x + gameW / 2, ty, { align: 'center' }); x += gameW;
      for (let c = 0; c < NC; c++) { doc.text('COURT ' + (c + 1), x + courtW / 2, ty, { align: 'center' }); x += courtW; }
      if (sch.rest) doc.text('RESTING', x + 3, ty);
      k.y += 8;
    };
    const fitSize = (list, maxW, maxFs) => {
      let fs = maxFs;
      font('bold', fs);
      while (fs > 6 && !list.every(t => doc.getTextWidth(k.txt(t)) <= maxW)) { fs -= 0.25; doc.setFontSize(fs); }
      return fs;
    };
    const court = (x, yy, w, h, a, b, win, faded) => {
      const kz = Math.min(3.2, w * 0.05), cx = x + w / 2;
      doc.setLineDashPattern([], 0);
      fill(faded ? C.zebra : C.courtSoft); stroke(faded ? C.line : C.surround); doc.setLineWidth(0.45);
      doc.roundedRect(x, yy, w, h, 0.8, 0.8, 'FD');
      if (win === 'A') { fill(C.ball); doc.rect(x + 0.35, yy + 0.35, cx - kz - x - 0.35, h - 0.7, 'F'); }
      if (win === 'B') { fill(C.ball); doc.rect(cx + kz, yy + 0.35, x + w - 0.35 - (cx + kz), h - 0.7, 'F'); }
      fill(faded ? C.line : C.kitchen); doc.rect(cx - kz, yy + 0.3, 2 * kz, h - 0.6, 'F');
      stroke(C.white); doc.setLineWidth(0.4);
      doc.line(cx - kz, yy + 0.3, cx - kz, yy + h - 0.3);
      doc.line(cx + kz, yy + 0.3, cx + kz, yy + h - 0.3);
      doc.line(x + 0.35, yy + h / 2, cx - kz, yy + h / 2);
      doc.line(cx + kz, yy + h / 2, x + w - 0.35, yy + h / 2);
      stroke(C.ink); doc.setLineWidth(0.25); doc.setLineDashPattern([0.7, 0.55], 0);
      doc.line(cx, yy + 0.4, cx, yy + h - 0.4);
      doc.setLineDashPattern([], 0);
      const sw = w / 2 - kz, maxW = sw - 2.2;
      const fs = fitSize(a.concat(b), maxW, Math.min(10, ((h / 2) / 0.3528) * 0.74));
      [[a, x + sw / 2, 'A'], [b, cx + kz + sw / 2, 'B']].forEach(([team, tx, t]) => team.forEach((nmv, i) => {
        font(win && win !== t ? 'normal' : 'bold', fs);
        ink(faded ? C.ink2 : win === t ? C.onBall : win ? C.ink2 : C.ink);
        doc.text(k.clip(nmv, maxW), tx, yy + h * (i === 0 ? 0.26 : 0.74), { align: 'center', baseline: 'middle' });
      }));
    };
    head();
    const rowH = Math.max(9.5, Math.min(14, (k.room() - 1) / G));
    sch.rounds.forEach((r, ri) => {
      const isPlayed = !played || played.has(ri);
      let restLines = [];
      if (sch.rest) { font('normal', 8.2); restLines = doc.splitTextToSize(k.txt(r.rest.map(i => names[i]).join(', ')), restW - 4); }
      const h = Math.max(rowH, restLines.length * 3.4 + 3);
      if (k.ensure(h)) head();
      if (ri % 2 === 1) { fill(C.zebra); doc.rect(M, k.y, CW, h, 'F'); }
      let x = M;
      ink(isPlayed ? C.court : C.ink2); font('bold', 13);
      doc.text(String(ri + 1), x + gameW / 2, k.y + h / 2 - (isPlayed ? 0 : 1.4), { align: 'center', baseline: 'middle' });
      if (!isPlayed) { font('bold', 5); doc.text('NOT PLAYED', x + gameW / 2, k.y + h / 2 + 3.2, { align: 'center', baseline: 'middle' }); }
      x += gameW;
      r.courts.forEach((m, c) => {
        court(x + 0.8, k.y + 1, courtW - 1.6, h - 2, m.A.map(i => names[i]), m.B.map(i => names[i]), W8 && isPlayed ? W8['g' + ri + 'c' + c] : null, !isPlayed);
        x += courtW;
      });
      if (sch.rest) {
        font('normal', 8.2); ink(C.ink2);
        let ty = k.y + h / 2 - (restLines.length - 1) * 1.7;
        restLines.forEach(l => { doc.text(l, x + 3, ty, { baseline: 'middle' }); ty += 3.4; });
      }
      stroke(C.line); doc.setLineWidth(0.2); doc.line(M, k.y + h, M + CW, k.y + h);
      k.y += h;
    });
  }

  // Clean schedule for printing during play: no results, no tick boxes.
  function buildSchedulePdf(s) {
    const sch = s.schedule;
    const k = pdfKit(s, metaLine(s.players.length, sch.courts, sch.games), 'Game schedule');
    k.band(true);
    pdfSchedule(k, s, null);
    return k.finish('Schedule');
  }

  // End-of-session report: summary, podium, leaderboard, partner chemistry, pairs, results.
  function buildReportPdf(s, R) {
    const names = s.players, n = names.length, sch = s.schedule;
    const k = pdfKit(s, n + ' players  |  ' + (sch.courts === 2 ? 'Court 1 & Court 2' : 'Court 1') + '  |  ' + R.played.length + ' of ' + R.G + ' games played', 'Session report');
    const { doc, fill, stroke, ink, font, C, M, CW } = k;
    k.band(true);

    // Summary boxes
    const top = R.ranked[0];
    const facts = [
      ['GAMES PLAYED', R.played.length + ' of ' + R.G + (R.notPlayed.length ? '  (not played: ' + rangeText(R.notPlayed) + ')' : '')],
      ['RESULTS RECORDED', R.decided + ' of ' + R.courtsPlayed + ' court games'],
      ['PLAYER OF THE DAY', top ? top.name + '  ' + pct(top.winPct) + ' (' + top.won + '-' + top.lost + ')' : 'No results recorded'],
      ['PAIR OF THE DAY', R.pairOfDay ? R.pairName(R.pairOfDay) + '  ' + R.pairOfDay.w + '-' + R.pairOfDay.l : 'No results recorded']
    ];
    const fw = (CW - 9) / 4;
    facts.forEach(([t, v], i) => {
      const x = M + i * (fw + 3);
      fill(C.zebra); stroke(C.line); doc.setLineWidth(0.3); doc.roundedRect(x, k.y, fw, 20, 1.5, 1.5, 'FD');
      ink(C.ink2); font('bold', 6.6); doc.text(t, x + 3, k.y + 5.3);
      ink(C.ink); font('bold', 9.2);
      doc.splitTextToSize(k.txt(v), fw - 6).slice(0, 3).forEach((l, li) => doc.text(l, x + 3, k.y + 10.2 + li * 3.9));
    });
    k.y += 26;

    // Podium
    const pod = R.ranked.slice(0, 3);
    if (pod.length) {
      k.heading('Podium', 50);
      const bw = 38, gap = 7, total = bw * 3 + gap * 2, x0 = M + (CW - total) / 2, base = k.y + 48;
      const heights = [26, 19, 13];
      [1, 0, 2].forEach((pos, slot) => {
        const p = pod[pos];
        if (!p) return;
        const x = x0 + slot * (bw + gap), h = heights[pos], topY = base - h;
        if (pos === 0) { fill(C.court); doc.roundedRect(x, topY, bw, h, 1.2, 1.2, 'F'); ink(C.white); }
        else { fill(C.courtSoft); stroke(C.surround); doc.setLineWidth(0.5); doc.roundedRect(x, topY, bw, h, 1.2, 1.2, 'FD'); ink(C.court); }
        font('bold', 16); doc.text(String(p.rank), x + bw / 2, topY + h / 2 + 2, { align: 'center' });
        fill(p.rank === 1 ? C.gold : p.rank === 2 ? C.silver : C.bronze); doc.circle(x + bw / 2, topY - 17, 5.2, 'F');
        ink(C.white); font('bold', 10); doc.text(initial(p.name), x + bw / 2, topY - 15.8, { align: 'center' });
        ink(C.ink); font('bold', 9.5); doc.text(k.clip(p.name, bw), x + bw / 2, topY - 7.8, { align: 'center' });
        ink(C.ink2); font('normal', 8.2); doc.text(pct(p.winPct) + '   ' + p.won + '-' + p.lost, x + bw / 2, topY - 3.4, { align: 'center' });
      });
      k.y = base + 7;
    }

    // Leaderboard (same columns as the app)
    const restCol = !!sch.rest;
    const cols = restCol
      ? [['#', 10, 'l'], ['PLAYER', 48, 'l'], ['WINS-LOSSES', 52, 'l'], ['WIN %', 19, 'c'], ['PLAYED', 19, 'c'], ['RESTED', 19, 'c'], ['BEST STREAK', 19, 'c']]
      : [['#', 10, 'l'], ['PLAYER', 52, 'l'], ['WINS-LOSSES', 58, 'l'], ['WIN %', 22, 'c'], ['PLAYED', 22, 'c'], ['BEST STREAK', 22, 'c']];
    const rh = 6.8;
    const boardHeader = () => {
      fill(C.ink); doc.roundedRect(M, k.y, CW, 7, 1.2, 1.2, 'F');
      ink(C.white); font('bold', 6.8);
      let x = M;
      cols.forEach(([t, w, al]) => { if (al === 'c') doc.text(t, x + w / 2, k.y + 4.6, { align: 'center' }); else doc.text(t, x + 2, k.y + 4.6); x += w; });
      k.y += 7;
    };
    k.heading('Leaderboard', 7 + rh * Math.min(4, n));
    boardHeader();
    const maxDec = Math.max(1, Math.max.apply(null, R.P.map(p => p.won + p.lost)));
    R.ranked.concat(R.unranked).forEach((p, ri) => {
      if (k.ensure(rh)) boardHeader();
      if (ri % 2 === 1) { fill(C.zebra); doc.rect(M, k.y, CW, rh, 'F'); }
      const cy = k.y + rh / 2;
      let x = M;
      ink(p.eligible ? C.court : C.ink2); font('bold', 10.5); doc.text(p.eligible ? String(p.rank) : '-', x + 2, cy, { baseline: 'middle' }); x += cols[0][1];
      ink(C.ink); font('bold', 9.2); doc.text(k.clip(p.name, cols[1][1] - 4), x + 2, cy, { baseline: 'middle' }); x += cols[1][1];
      const bw = cols[2][1] - 16;
      fill(C.line); doc.rect(x + 2, cy - 1.5, bw, 3, 'F');
      if (p.won) { fill(C.surround); doc.rect(x + 2, cy - 1.5, bw * p.won / maxDec, 3, 'F'); }
      if (p.lost) { fill(C.loss); doc.rect(x + 2 + bw * p.won / maxDec, cy - 1.5, bw * p.lost / maxDec, 3, 'F'); }
      ink(C.ink); font('bold', 8.8); doc.text(p.won + '-' + p.lost, x + 4 + bw, cy, { baseline: 'middle' }); x += cols[2][1];
      font('normal', 9.2);
      const vals = [p.winPct == null ? '-' : pct(p.winPct), String(p.played)].concat(restCol ? [String(p.rested)] : [], [String(p.streak)]);
      vals.forEach((v, j) => { const w = cols[3 + j][1]; doc.text(v, x + w / 2, cy, { align: 'center', baseline: 'middle' }); x += w; });
      stroke(C.line); doc.setLineWidth(0.2); doc.line(M, k.y + rh, M + CW, k.y + rh);
      k.y += rh;
    });
    k.y += 2.5;
    ink(C.ink2); font('normal', 7.5);
    doc.text('Green = wins, red = losses. Ranked by win %, then wins, then fewest losses.' + (R.unranked.length ? ' "-" = not ranked.' : ''), M, k.y + 2);
    k.y += 8;

    // Partner chemistry
    const nameCol = 34, cell = Math.min(10.5, (CW - nameCol) / n), headH = 22;
    k.heading('Partner chemistry', headH + cell * n + 8);
    ink(C.ink2); font('bold', 7.5);
    names.forEach((nm, j) => doc.text(k.clip(nm, headH - 2), M + nameCol + j * cell + cell / 2 + 1.2, k.y + headH - 1, { angle: 90 }));
    k.y += headH;
    for (let i = 0; i < n; i++) {
      ink(C.ink); font('bold', 8);
      doc.text(k.clip(names[i], nameCol - 3), M + nameCol - 2, k.y + cell / 2, { align: 'right', baseline: 'middle' });
      for (let j = 0; j < n; j++) {
        const x = M + nameCol + j * cell;
        if (i === j) { stroke(C.line); doc.setLineWidth(0.2); doc.rect(x + 0.4, k.y + 0.4, cell - 0.8, cell - 0.8, 'S'); continue; }
        const pr = R.pairOf(i, j);
        if (!pr) { fill(C.zebra); doc.rect(x + 0.4, k.y + 0.4, cell - 0.8, cell - 0.8, 'F'); continue; }
        const dec = pr.w + pr.l;
        fill(dec ? k.mix(C.white, C.surround, 0.12 + (pr.w / dec) * 0.5) : C.zebra);
        doc.rect(x + 0.4, k.y + 0.4, cell - 0.8, cell - 0.8, 'F');
        ink(C.ink); font('bold', 7);
        doc.text(pr.w + '-' + pr.l, x + cell / 2, k.y + cell / 2, { align: 'center', baseline: 'middle' });
      }
      k.y += cell;
    }
    k.y += 2.5;
    ink(C.ink2); font('normal', 7.5);
    doc.text('Wins-losses as teammates. Greener = better record together. Blank = never partners.', M, k.y + 2);
    k.y += 9;

    // Pairs
    k.heading('Pairs', 14);
    ink(C.ink); font('bold', 9.8);
    doc.text(k.txt('Pair of the day:  ' + (R.pairOfDay ? R.pairName(R.pairOfDay) + '  (' + R.pairOfDay.w + '-' + R.pairOfDay.l + ')' : 'no results recorded')), M, k.y + 3);
    k.y += 7;
    font('normal', 9.2); ink(C.ink2);
    doc.splitTextToSize(k.txt('Unbeaten pairs (2+ wins, no losses):  ' + (R.unbeaten.length ? R.unbeaten.map(pr => R.pairName(pr) + ' (' + pr.w + '-0)').join(',  ') : 'none')), CW)
      .forEach(l => { k.ensure(5); doc.text(l, M, k.y + 3); k.y += 4.4; });

    // Results on their own page, sized to fit
    doc.addPage(); k.band(false);
    k.heading('Results');
    ink(C.ink2); font('normal', 8.2);
    doc.text('Yellow = winning team. Grey rows were not played.', M, k.y - 1.5);
    k.y += 2;
    pdfSchedule(k, s, { winners: s.winners || {}, playedSet: R.playedSet });
    return k.finish('Completed ' + fmtDay(s.completedAt || Date.now()));
  }

  /* ===================== Setup & preview events ===================== */
  const list = $('#playerList');
  list.addEventListener('input', e => {
    const inp = e.target.closest('input');
    if (!inp) return;
    draft.raw[+inp.dataset.i] = inp.value;
    touch();
    inp.closest('.prow').classList.remove('dup');
    $('#setupError').hidden = true;
    updateSetupMeta();
    saveDraft();
  });
  list.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const i = +e.target.dataset.i;
    if (i < draft.raw.length - 1) $('#player-' + (i + 1)).focus();
    else if (draft.raw.length < MAXP) { draft.raw.push(''); renderPlayers(i + 1); }
    else $('#toPreview').focus();
  });
  list.addEventListener('paste', e => {
    const inp = e.target.closest('input');
    if (!inp) return;
    const text = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (!/[,\n;\t]/.test(text)) return;
    e.preventDefault();
    const parts = text.split(/[,\n;\t]+/).map(x => clean(x.replace(/^\s*\d+[.)]\s*/, ''))).filter(Boolean);
    const i = +inp.dataset.i, cur = clean(inp.value);
    let merged = draft.raw.slice(0, i).concat(cur ? [cur] : [], parts, draft.raw.slice(i + 1)).filter(x => clean(x));
    let dropped = 0;
    if (merged.length > MAXP) { dropped = merged.length - MAXP; merged = merged.slice(0, MAXP); }
    draft.raw = merged;
    touch();
    renderPlayers(Math.min(merged.length, MAXP) - 1);
    saveDraft();
    toast(dropped ? 'Added names. ' + dropped + ' did not fit (12 players max).' : 'Added ' + parts.length + ' names.');
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('.remove');
    if (!b) return;
    draft.raw.splice(+b.dataset.i, 1);
    touch();
    renderPlayers();
    saveDraft();
  });
  $('#addPlayer').addEventListener('click', () => {
    if (draft.raw.length >= MAXP) return;
    draft.raw.push('');
    renderPlayers(draft.raw.length - 1);
  });
  $('#clearPlayers').addEventListener('click', () => {
    draft.raw = ['', '', '', ''];
    touch();
    renderPlayers(0);
    saveDraft();
  });
  $$('.seg [data-courts]').forEach(b => b.addEventListener('click', () => {
    draft.courts = +b.dataset.courts;
    draft.courtsManual = true;
    touch(); updateSetupMeta(); saveDraft();
  }));
  $('#games').addEventListener('input', e => setGames(e.target.value));
  $('#gamesMinus').addEventListener('click', () => setGames(draft.games - 1));
  $('#gamesPlus').addEventListener('click', () => setGames(draft.games + 1));
  $('#gameChips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) setGames(+c.dataset.g); });
  $('#toPreview').addEventListener('click', generate);
  $('#step-setup').addEventListener('click', () => { if (draft.step !== 'setup') { draft.step = 'setup'; saveDraft(); renderNew(); } });
  $('#step-preview').addEventListener('click', () => {
    if (draft.step === 'preview') return;
    if (draft.schedule && draft.genSig === setupSig()) { draft.step = 'preview'; saveDraft(); renderNew(); } else generate();
  });
  $('#backToSetup').addEventListener('click', () => { draft.step = 'setup'; saveDraft(); renderNew(); toTop(); });
  $('#confirm').addEventListener('click', confirmSchedule);
  $('#confirm2').addEventListener('click', confirmSchedule);

  /* ===================== Global events ===================== */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.closest('#view-session')) return;
    const act = b.dataset.act;
    if (act === 'signin') {
      S.authError = '';
      b.disabled = true;
      S.store.signIn().catch(err => { S.authError = authErrorText(err); renderAuth(); }).finally(() => { b.disabled = false; });
    } else if (act === 'signout' || act === 'switch') {
      const m = $('#userMenu'); if (m) m.open = false;
      stopSessions(); stopMembers();
      lsDel(DRAFT_KEY);
      S.store.signOut().catch(() => {}).then(() => S.store.wipe()).finally(() => location.reload());
    } else if (act === 'retry') {
      if (CLOUD) { location.reload(); return; }
      S.access = 'checking'; render(); startAccess();
    } else if (act === 'reload') {
      location.reload();
    }
  });
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-theme-set]');
    if (tb) { setTheme(tb.dataset.themeSet); return; }
    const m = $('#userMenu');
    if (m && m.open && !m.contains(e.target)) m.open = false;
    if (e.target.closest('.menu-pop a') && m) m.open = false;
  });
  window.addEventListener('online', () => { S.online = true; renderWho(); });
  window.addEventListener('offline', () => { S.online = false; renderWho(); });
  // Hide sessions whose 7 days ran out while the app stays open
  setInterval(() => {
    const before = S.sessions.length;
    S.sessions = S.sessions.filter(isLive);
    if (S.sessions.length !== before) render(true);
  }, 60 * 1000);

  /* ===================== Example session (demo / preview only) ===================== */
  function makeExample() {
    const names = ['Aarav', 'Priya', 'Michael', 'Sana', 'Kabir', 'Meera', 'Rohan', 'Dev', 'Isha', 'Arjun'];
    const sch = Engine.build(10, 2, 12, null, 120);
    const now = Date.now(), created = now - 2 * 3600000;
    const skill = [0.9, 0.75, 0.6, 0.85, 0.5, 0.65, 0.7, 0.45, 0.55, 0.6];
    let seed = 11;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const winners = {}, done = {};
    for (let r = 0; r < 10; r++) {
      sch.rounds[r].courts.forEach((m, c) => {
        if (r === 6 && c === 1) return;
        const a = skill[m.A[0]] + skill[m.A[1]] + rnd() * 0.7, b = skill[m.B[0]] + skill[m.B[1]] + rnd() * 0.7;
        winners['g' + r + 'c' + c] = a >= b ? 'A' : 'B';
      });
      done['g' + r] = true;
    }
    return {
      example: true, day: fmtDay(created), dayKey: dayKey(created), seq: 0, name: 'Example session',
      createdAt: created, expiresAt: created + KEEP_MS, createdBy: 'example', createdByName: 'Example',
      status: 'completed', players: names, courts: 2, games: 12,
      schedule: { n: 10, courts: 2, games: 12, rest: true, rounds: sch.rounds },
      winners, done, completedAt: now - 600000, updatedAt: now - 600000, updatedByName: 'Example'
    };
  }

  /* ===================== Start ===================== */
  async function init() {
    renderCredit();
    if (!PREVIEW) {
      let framed = true;
      try { framed = window.top !== window.self; } catch (e) { framed = true; }
      if (framed) {
        $('#app').innerHTML = '<div class="panel"><p class="note">For your security this app only runs in its own browser tab.</p><div class="row-actions"><a class="btn primary" target="_top" rel="noopener" href="' + esc(location.href) + '">Open the app</a></div></div>';
        return;
      }
    }
    if (!CLOUD) {
      S.store = makeLocalStore();
      S.store.seedOnce(makeExample);
      S.user = { uid: 'demo-organizer', email: DEMO_EMAIL, tokenName: 'Organizer', name: '', label: 'Organizer' };
      S.isAdmin = true;
      S.access = 'checking';
      render();
      startAccess();
      return;
    }
    S.access = 'loading';
    render();
    try {
      S.store = await makeCloudStore();
    } catch (e) {
      S.access = 'error';
      S.authError = 'Could not load Firebase. Check your internet connection, then reload.';
      render();
      return;
    }
    S.store.onAuth(async u => {
      stopSessions(); stopMembers();
      S.sessions = []; S.loaded = false; S.members = []; S.names = {}; cleaned = false;
      if (!u) { S.user = null; S.isAdmin = false; S.access = 'signedout'; render(); return; }
      const email = String(u.email || '').toLowerCase();
      const name = await S.store.tokenName(u);
      S.user = { uid: u.uid, email, tokenName: name, name: '', label: firstName(name) || email.split('@')[0] };
      S.isAdmin = S.user.email === ADMIN;
      S.access = 'checking';
      S.authError = '';
      render();
      startAccess();
    });
  }
  init();
})();
