/* ─────────────────────────────────────────────────────────────────────────
   Consent-Management · Autoaufbereitung Studio Holovko
   ─────────────────────────────────────────────────────────────────────────
   Rechtlicher Rahmen (Deutschland, Stand 09/2026):
   · § 25 Abs. 1 TDDDG   – Zugriff auf Endgerät (Cookies/Storage) nur mit
                           vorheriger Einwilligung → gtag.js wird erst NACH
                           Opt-in geladen (Vorab-Blockierung, kein "load then ask")
   · § 25 Abs. 2 Nr. 2   – die Speicherung der Einwilligung selbst ist
                           unbedingt erforderlich und einwilligungsfrei
   · Art. 6 Abs. 1 a,
     Art. 7 DSGVO        – freiwillig, informiert, granular, kein Pre-Check
                           (EuGH Planet49, BGH Cookie-Einwilligung II),
                           Ablehnen gleichwertig zu Akzeptieren (DSK OH Telemedien),
                           Widerruf so einfach wie Erteilung (Art. 7 Abs. 3),
                           Nachweispflicht (Art. 7 Abs. 1) → Consent-Datensatz
                           mit ID, Zeitstempel, Banner-Version, Auswahl, Weg
   · Google Consent Mode v2 – Default "denied" vor jedem Google-Tag,
                           "update" nach Entscheidung (Basic-Modus: ohne
                           Einwilligung wird kein Google-Skript geladen,
                           auch keine "cookielosen Pings")
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ─── KONFIGURATION ─────────────────────────────────────────────────── */
  var CONFIG = {
    gaId: 'G-L5L65CJ4M8',
    // Bei jeder inhaltlichen Änderung an Banner-Text, Kategorien oder
    // Diensten erhöhen → Besucher werden erneut gefragt, alte Nachweise
    // bleiben der alten Version zuordenbar.
    version: '2026-09-19.1',
    storageKey: 'sh_consent',
    logEndpoint: '/consent-log',
    // Nach dieser Frist wird die Einwilligung erneut abgefragt.
    maxAgeDays: 365,
    privacyUrl: 'datenschutz.html',
    imprintUrl: 'impressum.html'
  };

  /* Kategorien. "necessary" ist immer aktiv und nicht abwählbar.
     Eine Kategorie ohne Dienste wird im Banner nicht angezeigt – sobald
     z. B. Google Ads hinzukommt, hier unter "marketing" eintragen. */
  var CATEGORIES = [
    {
      key: 'necessary',
      label: 'Notwendig',
      locked: true,
      desc: 'Erforderlich für den Betrieb der Website und die Speicherung Ihrer Cookie-Entscheidung. Es findet kein Tracking statt.',
      services: [
        {
          name: 'Consent-Speicherung',
          provider: 'Autoaufbereitung Studio Holovko (Websitebetreiber)',
          purpose: 'Speichert Ihre Auswahl im Cookie-Banner, damit sie nicht bei jedem Aufruf erneut abgefragt wird.',
          storage: 'localStorage „sh_consent“ (Fallback: Cookie „sh_consent“)',
          duration: '12 Monate',
          legal: '§ 25 Abs. 2 Nr. 2 TDDDG'
        }
      ]
    },
    {
      key: 'statistics',
      label: 'Statistik',
      desc: 'Hilft uns zu verstehen, wie Besucher unsere Website nutzen (z. B. welche Seiten aufgerufen werden). Die Daten werden pseudonymisiert ausgewertet.',
      services: [
        {
          name: 'Google Analytics 4',
          provider: 'Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland',
          purpose: 'Google Analytics verwendet Cookies, die eine Analyse der Benutzung unserer Webseiten durch Sie ermöglichen. Die mittels der Cookies erhobenen Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert.',
          storage: 'Cookies „_ga“, „_ga_L5L65CJ4M8“',
          duration: '2 Jahre',
          legal: 'Art. 6 Abs. 1 S. 1 lit. a DSGVO und § 25 Abs. 1 S. 1 TDDDG',
          link: 'https://policies.google.com/privacy?hl=de'
        }
      ]
    },
    {
      key: 'marketing',
      label: 'Marketing',
      desc: 'Dienste zur Anzeige und Erfolgsmessung von Werbung. Derzeit nicht im Einsatz.',
      services: []
    }
  ];

  var CATEGORY_CONSENT_MAP = {
    statistics: ['analytics_storage'],
    marketing: ['ad_storage', 'ad_user_data', 'ad_personalization']
  };

  /* ─── GOOGLE CONSENT MODE v2 – Default VOR jedem Google-Tag ─────────── */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });

  /* ─── HILFSFUNKTIONEN ───────────────────────────────────────────────── */
  var gaLoaded = false;

  function activeCategories() {
    return CATEGORIES.filter(function (c) { return c.locked || c.services.length > 0; });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    a[6] = (a[6] & 0x0f) | 0x40; a[8] = (a[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function readStorage() {
    var raw = null;
    try { raw = localStorage.getItem(CONFIG.storageKey); } catch (e) {}
    if (!raw) {
      var m = document.cookie.match(new RegExp('(?:^|; )' + CONFIG.storageKey + '=([^;]*)'));
      if (m) { try { raw = decodeURIComponent(m[1]); } catch (e) {} }
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeStorage(record) {
    var raw = JSON.stringify(record);
    var ok = false;
    try { localStorage.setItem(CONFIG.storageKey, raw); ok = true; } catch (e) {}
    if (!ok) {
      var exp = new Date(Date.now() + CONFIG.maxAgeDays * 864e5).toUTCString();
      document.cookie = CONFIG.storageKey + '=' + encodeURIComponent(raw) + '; expires=' + exp + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    }
  }

  function clearStorage() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
    document.cookie = CONFIG.storageKey + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }

  function isValid(record) {
    if (!record || record.version !== CONFIG.version || !record.ts || !record.choices) return false;
    var age = Date.now() - Date.parse(record.ts);
    return isFinite(age) && age >= 0 && age < CONFIG.maxAgeDays * 864e5;
  }

  /* Löscht alle Cookies eines Namens über alle in Frage kommenden Domains/Pfade. */
  function deleteCookie(name) {
    var host = location.hostname, parts = host.split('.'), domains = [null, host];
    for (var i = 1; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    domains.push('.' + host);
    domains.forEach(function (d) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
    });
  }

  function deleteGoogleCookies() {
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gat|_gcl)/.test(n)) deleteCookie(n);
    });
  }

  /* ─── DIENSTE LADEN / STOPPEN ───────────────────────────────────────── */
  function loadGoogleAnalytics() {
    if (gaLoaded) return;
    gaLoaded = true;
    window['ga-disable-' + CONFIG.gaId] = false;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.gaId);
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.gaId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function applyConsent(choices) {
    var update = {};
    Object.keys(CATEGORY_CONSENT_MAP).forEach(function (cat) {
      CATEGORY_CONSENT_MAP[cat].forEach(function (param) {
        update[param] = choices[cat] ? 'granted' : 'denied';
      });
    });
    window.gtag('consent', 'update', update);

    if (choices.statistics) {
      loadGoogleAnalytics();
    } else {
      // Bereits geladenes GA stilllegen + gesetzte Cookies entfernen
      window['ga-disable-' + CONFIG.gaId] = true;
      deleteGoogleCookies();
    }
  }

  /* ─── NACHWEIS (Art. 7 Abs. 1 DSGVO) ───────────────────────────────── */
  function logConsent(record) {
    var q = '?id=' + encodeURIComponent(record.id) +
            '&v=' + encodeURIComponent(record.version) +
            '&ts=' + encodeURIComponent(record.ts) +
            '&m=' + encodeURIComponent(record.method) +
            '&c=' + encodeURIComponent(Object.keys(record.choices).map(function (k) {
              return k + ':' + (record.choices[k] ? 1 : 0);
            }).join(','));
    var url = CONFIG.logEndpoint + q;
    try {
      if (navigator.sendBeacon) { navigator.sendBeacon(url); return; }
      if (window.fetch) { fetch(url, { method: 'POST', keepalive: true, credentials: 'omit' }).catch(function () {}); return; }
      new Image().src = url;
    } catch (e) {}
  }

  function saveDecision(choices, method) {
    var prev = readStorage();
    var record = {
      id: (prev && prev.id) || uuid(),
      version: CONFIG.version,
      ts: new Date().toISOString(),
      method: method,
      choices: {}
    };
    CATEGORIES.forEach(function (c) {
      if (c.locked) return;
      record.choices[c.key] = !!choices[c.key];
    });
    writeStorage(record);
    logConsent(record);
    applyConsent(record.choices);
    refreshStatusBoxes(record);
    return record;
  }

  /* ─── UI ────────────────────────────────────────────────────────────── */
  var els = {};

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function buildBanner() {
    var banner = el('div', { class: 'cc-banner', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'cc-banner-title', 'aria-describedby': 'cc-banner-desc' }, [
      el('div', { class: 'cc-banner-inner' }, [
        el('div', { class: 'cc-banner-text' }, [
          el('div', { class: 'cc-eyebrow', text: 'Datenschutz' }),
          el('h2', { id: 'cc-banner-title', class: 'cc-title', text: 'Cookies & Einwilligung' }),
          el('p', { id: 'cc-banner-desc', class: 'cc-desc', html:
            'Wir verwenden auf dieser Webseite Cookies. Diese verarbeiten auch personenbezogene Daten. ' +
            'Zum Einsatz kommen auf unserer Seite: <strong>technisch notwendige Cookies</strong> und – nur mit Ihrer Einwilligung – <strong>Statistik-Cookies</strong> (Google Analytics, Datenübermittlung in die USA möglich). ' +
            'Indem Sie auf „Cookie-Einstellungen“ klicken, erhalten Sie genauere Informationen zu unseren Cookies und können diese nach Ihren eigenen Bedürfnissen anpassen. ' +
            'Diese Einwilligung ist freiwillig, sie stellt keine Bedingung für die Nutzung dieser Website dar und kann jederzeit widerrufen werden, indem Sie die „Cookie-Einstellungen“ im Footer aufrufen. ' +
            '<a href="' + CONFIG.privacyUrl + '">Datenschutzerklärung</a> · <a href="' + CONFIG.imprintUrl + '">Impressum</a>'
          })
        ]),
        el('div', { class: 'cc-actions' }, [
          el('button', { type: 'button', class: 'cc-btn', text: 'Alle akzeptieren', onclick: function () { decide('accept_all'); } }),
          el('button', { type: 'button', class: 'cc-btn', text: 'Nur notwendige Cookies', onclick: function () { decide('reject_all'); } }),
          el('button', { type: 'button', class: 'cc-link', text: 'Cookie-Einstellungen', onclick: function () { openModal(); } })
        ])
      ])
    ]);
    return banner;
  }

  function buildToggle(cat, checked) {
    var input = el('input', { type: 'checkbox', id: 'cc-cat-' + cat.key, 'data-cat': cat.key });
    input.checked = cat.locked ? true : !!checked;
    if (cat.locked) { input.disabled = true; input.setAttribute('aria-disabled', 'true'); }
    return el('label', { class: 'cc-switch', for: 'cc-cat-' + cat.key }, [
      input,
      el('span', { class: 'cc-switch-track', 'aria-hidden': 'true' }),
      el('span', { class: 'cc-sr', text: cat.label + (cat.locked ? ' (immer aktiv)' : '') })
    ]);
  }

  function buildServiceList(cat) {
    if (!cat.services.length) return null;
    var rows = cat.services.map(function (s) {
      var dl = el('dl', { class: 'cc-service' }, [
        el('dt', { text: 'Anbieter' }), el('dd', { text: s.provider }),
        el('dt', { text: 'Zweck' }), el('dd', { text: s.purpose }),
        el('dt', { text: 'Speicherung' }), el('dd', { text: s.storage }),
        el('dt', { text: 'Dauer' }), el('dd', { text: s.duration }),
        el('dt', { text: 'Rechtsgrundlage' }), el('dd', { text: s.legal })
      ]);
      if (s.link) {
        dl.appendChild(el('dt', { text: 'Datenschutz' }));
        dl.appendChild(el('dd', {}, [el('a', { href: s.link, target: '_blank', rel: 'noopener noreferrer', text: s.link })]));
      }
      return el('div', { class: 'cc-service-wrap' }, [el('div', { class: 'cc-service-name', text: s.name }), dl]);
    });
    return el('details', { class: 'cc-details' }, [
      el('summary', { text: 'Details anzeigen' })
    ].concat(rows));
  }

  function buildModal() {
    var stored = readStorage();
    var choices = (stored && stored.choices) || {};

    var cats = activeCategories().map(function (cat) {
      return el('div', { class: 'cc-cat' + (cat.locked ? ' cc-cat--locked' : '') }, [
        el('div', { class: 'cc-cat-head' }, [
          el('div', {}, [
            el('div', { class: 'cc-cat-label', text: cat.label }),
            el('p', { class: 'cc-cat-desc', text: cat.desc })
          ]),
          buildToggle(cat, choices[cat.key])
        ]),
        buildServiceList(cat)
      ]);
    });

    var modal = el('div', { class: 'cc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cc-modal-title' }, [
      el('div', { class: 'cc-modal-backdrop', onclick: function () { closeModal(); } }),
      el('div', { class: 'cc-modal-panel' }, [
        el('button', { type: 'button', class: 'cc-close', 'aria-label': 'Schließen', html: '&times;', onclick: function () { closeModal(); } }),
        el('div', { class: 'cc-eyebrow', text: 'Datenschutz-Einstellungen' }),
        el('h2', { id: 'cc-modal-title', class: 'cc-title', text: 'Cookie-Einstellungen' }),
        el('p', { class: 'cc-desc', html:
          'Wir ermöglichen Ihnen im Rahmen unseres Consent-Managements, eine individuelle Einstellung Ihrer Einwilligungen vorzunehmen. ' +
          'Ein Widerruf Ihrer Einwilligungen ist jederzeit möglich, indem Sie diese Einstellungen erneut aufrufen und den Schalter der jeweiligen Kategorie deaktivieren. ' +
          'Weitere Informationen: <a href="' + CONFIG.privacyUrl + '">Datenschutzerklärung</a>.'
        }),
        el('div', { class: 'cc-cats' }, cats),
        el('div', { class: 'cc-actions cc-actions--modal' }, [
          el('button', { type: 'button', class: 'cc-btn cc-btn--fill', text: 'Auswahl speichern', onclick: function () { decide('custom'); } }),
          el('button', { type: 'button', class: 'cc-btn', text: 'Alle akzeptieren', onclick: function () { decide('accept_all'); } }),
          el('button', { type: 'button', class: 'cc-btn', text: 'Alle ablehnen', onclick: function () { decide('reject_all'); } })
        ]),
        el('div', { class: 'cc-meta', id: 'cc-modal-meta' })
      ])
    ]);
    return modal;
  }

  function buildFab() {
    return el('button', {
      type: 'button', class: 'cc-fab', 'aria-label': 'Cookie-Einstellungen öffnen', title: 'Cookie-Einstellungen',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-4 4 4 0 0 1-4-5 3 3 0 0 1-1-1z"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="16" cy="12.5" r="1"/></svg>',
      onclick: function () { openModal(); }
    });
  }

  function metaText(record) {
    if (!record) return 'Noch keine Entscheidung gespeichert.';
    var d = new Date(record.ts);
    var when = isNaN(d) ? record.ts : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
    var chosen = Object.keys(record.choices).filter(function (k) { return record.choices[k]; });
    return 'Letzte Entscheidung: ' + when + ' Uhr · Auswahl: Notwendig' + (chosen.length ? ', ' + chosen.map(function (k) {
      var c = CATEGORIES.filter(function (x) { return x.key === k; })[0];
      return c ? c.label : k;
    }).join(', ') : '') + ' · Banner-Version ' + record.version + ' · Nachweis-ID ' + record.id;
  }

  function refreshStatusBoxes(record) {
    var meta = document.getElementById('cc-modal-meta');
    if (meta) meta.textContent = metaText(record);
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent-status]'), function (box) {
      box.textContent = metaText(record);
    });
  }

  /* ─── STEUERUNG ─────────────────────────────────────────────────────── */
  var lastFocus = null;

  function showBanner() {
    if (els.banner) return;
    els.banner = buildBanner();
    document.body.appendChild(els.banner);
    requestAnimationFrame(function () { els.banner.classList.add('is-visible'); });
  }

  function hideBanner() {
    if (!els.banner) return;
    var b = els.banner; els.banner = null;
    b.classList.remove('is-visible');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
  }

  function showFab() {
    if (els.fab) return;
    els.fab = buildFab();
    document.body.appendChild(els.fab);
  }

  function openModal() {
    if (els.modal) return;
    lastFocus = document.activeElement;
    els.modal = buildModal();
    document.body.appendChild(els.modal);
    document.body.classList.add('cc-lock');
    refreshStatusBoxes(readStorage());
    requestAnimationFrame(function () {
      els.modal.classList.add('is-visible');
      var first = els.modal.querySelector('.cc-close');
      if (first) first.focus();
    });
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    if (!els.modal) return;
    var m = els.modal; els.modal = null;
    document.removeEventListener('keydown', onKeydown);
    document.body.classList.remove('cc-lock');
    m.classList.remove('is-visible');
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKeydown(e) {
    if (!els.modal) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      var f = els.modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), summary');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function decide(method) {
    var choices = {};
    activeCategories().forEach(function (cat) {
      if (cat.locked) return;
      if (method === 'accept_all') choices[cat.key] = true;
      else if (method === 'reject_all') choices[cat.key] = false;
      else {
        var input = els.modal && els.modal.querySelector('[data-cat="' + cat.key + '"]');
        choices[cat.key] = !!(input && input.checked);
      }
    });
    saveDecision(choices, method);
    closeModal();
    hideBanner();
    showFab();
  }

  function revoke() {
    var choices = {};
    CATEGORIES.forEach(function (c) { if (!c.locked) choices[c.key] = false; });
    saveDecision(choices, 'revoke');
    closeModal();
    hideBanner();
    showFab();
  }

  function bindTriggers() {
    document.addEventListener('click', function (e) {
      var open = e.target.closest && e.target.closest('[data-consent-open]');
      if (open) { e.preventDefault(); openModal(); return; }
      var rev = e.target.closest && e.target.closest('[data-consent-revoke]');
      if (rev) { e.preventDefault(); revoke(); }
    });
  }

  /* ─── START ─────────────────────────────────────────────────────────── */
  function init() {
    bindTriggers();
    var record = readStorage();
    if (isValid(record)) {
      applyConsent(record.choices);
      refreshStatusBoxes(record);
      showFab();
    } else {
      if (record) clearStorage();
      refreshStatusBoxes(null);
      showBanner();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Öffentliche API (z. B. für Konsole oder Datenschutzseite) */
  window.shConsent = {
    open: openModal,
    revoke: revoke,
    get: readStorage,
    version: CONFIG.version,
    reset: function () { clearStorage(); deleteGoogleCookies(); location.reload(); }
  };
})();
