(function(){
  "use strict";

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');
  var stored = localStorage.getItem('vortix-theme');
  var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  var initial = stored || (prefersLight ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  function setTheme(t){
    root.setAttribute('data-theme', t);
    localStorage.setItem('vortix-theme', t);
    window.dispatchEvent(new CustomEvent('vortix:theme', { detail: t }));
  }
  if(toggle){
    toggle.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('site-header');
  function onScroll(){
    if(window.scrollY > 8){ header.classList.add('scrolled'); }
    else{ header.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var burger = document.getElementById('nav-burger');
  var links = document.querySelector('.links');
  if(burger && links){
    burger.addEventListener('click', function(){
      var open = links.classList.toggle('open');
      if(open){
        links.style.display = 'flex';
        links.style.flexDirection = 'column';
        links.style.position = 'absolute';
        links.style.top = '100%';
        links.style.left = '0';
        links.style.right = '0';
        links.style.background = 'var(--surface)';
        links.style.padding = '20px 32px';
        links.style.borderBottom = '1px solid var(--hairline)';
        links.style.gap = '18px';
      } else {
        links.style.display = 'none';
      }
    });
    links.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        links.classList.remove('open');
        links.style.display = 'none';
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    reveals.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- RPM dial: animated counter + ring ---------- */
  var dial = document.querySelector('.dial');
  if(dial){
    var numEl = dial.querySelector('.dial-num');
    var target = parseInt(dial.getAttribute('data-target'), 10);
    var animated = false;

    function animateCount(){
      var start = null;
      var duration = 1700;
      function step(ts){
        if(!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.floor(eased * target);
        numEl.textContent = value.toLocaleString('it-IT');
        if(progress < 1){ requestAnimationFrame(step); }
        else { numEl.textContent = target.toLocaleString('it-IT'); }
      }
      requestAnimationFrame(step);
    }

    var dialIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting && !animated){
          animated = true;
          dial.classList.add('in-view');
          animateCount();
          dialIo.unobserve(dial);
        }
      });
    }, { threshold: 0.4 });
    dialIo.observe(dial);
  }

  /* ---------- Aurora background (hero canvas) ---------- */
  var auroraCanvas = document.getElementById('aurora-canvas');
  if(auroraCanvas){
    var actx = auroraCanvas.getContext('2d');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Brand palette only — Vortix petrol + sand, no foreign hues. Each layer: [core, mid, edge]. */
    var PALETTES = {
      dark: [
        ['rgba(34,160,175,0.20)', 'rgba(34,160,175,0.04)', 'transparent'],
        ['rgba(232,220,200,0.16)', 'rgba(232,220,200,0.03)', 'transparent'],
        ['rgba(20,96,104,0.14)', 'transparent', 'transparent']
      ],
      light: [
        ['rgba(14,46,51,0.14)', 'rgba(14,46,51,0.03)', 'transparent'],
        ['rgba(178,155,114,0.11)', 'rgba(178,155,114,0.02)', 'transparent'],
        ['rgba(8,32,36,0.09)', 'transparent', 'transparent']
      ]
    };

    var blobCount = 4;
    var speed = 0.5;
    var t = 0;
    var raf = null;
    var running = false;

    function currentPalette(){
      return PALETTES[root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'];
    }

    function resize(){
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      auroraCanvas.width = auroraCanvas.offsetWidth * dpr;
      auroraCanvas.height = auroraCanvas.offsetHeight * dpr;
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame(){
      var w = auroraCanvas.offsetWidth;
      var h = auroraCanvas.offsetHeight;
      var palette = currentPalette();
      actx.clearRect(0, 0, w, h);

      for(var i = 0; i < blobCount; i++){
        var layer = palette[i % palette.length];
        var phase = (i / blobCount) * Math.PI * 2 + t;
        var x = w / 2 + Math.sin(phase) * (w * 0.24) + Math.cos(t * 0.5) * (w * 0.08);
        var y = h / 2 + Math.cos(phase * 0.7) * (h * 0.22) + Math.sin(t * 0.3) * (h * 0.08);
        var grad = actx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.3);
        grad.addColorStop(0, layer[0]);
        grad.addColorStop(0.5, layer[1]);
        grad.addColorStop(1, layer[2]);
        actx.fillStyle = grad;
        actx.fillRect(0, 0, w, h);
      }

      actx.globalCompositeOperation = 'screen';
      for(var j = 0; j < Math.min(2, palette.length); j++){
        var l2 = palette[j];
        var phase2 = (j / 2) * Math.PI + t * 0.8;
        var x2 = w / 2 + Math.sin(phase2 * 1.2) * (w * 0.18);
        var y2 = h / 2 + Math.cos(phase2 * 0.9) * (h * 0.18);
        var grad2 = actx.createRadialGradient(x2, y2, 0, x2, y2, Math.max(w, h) * 0.22);
        grad2.addColorStop(0, l2[0]);
        grad2.addColorStop(1, 'transparent');
        actx.fillStyle = grad2;
        actx.fillRect(0, 0, w, h);
      }
      actx.globalCompositeOperation = 'source-over';
    }

    function animate(){
      t += 0.01 * speed;
      drawFrame();
      raf = requestAnimationFrame(animate);
    }

    function start(){
      if(running) return;
      running = true;
      if(reducedMotion){ drawFrame(); return; }
      raf = requestAnimationFrame(animate);
    }
    function stop(){
      running = false;
      if(raf) cancelAnimationFrame(raf);
    }

    resize();
    drawFrame();
    window.addEventListener('resize', resize, { passive:true });
    window.addEventListener('vortix:theme', drawFrame);

    if('IntersectionObserver' in window){
      var heroIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){ start(); } else { stop(); }
        });
      }, { threshold: 0 });
      heroIo.observe(auroraCanvas);
    } else {
      start();
    }
  }

  /* ---------- Bagliore che segue il mouse sulle schede ----------
     Qui c'era anche un cursore disegnato (puntino + anello) che sostituiva
     quello di sistema, piu' i pulsanti magnetici: tolti su richiesta, si e'
     tornati al cursore normale del computer. Resta solo il tracciamento
     della posizione, che serve al bagliore delle schede (vedi la regola
     'Card spotlight glow' nel foglio di stile). */
  if(window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    window.addEventListener('mousemove', function(e){
      root.style.setProperty('--glow-x', e.clientX);
      root.style.setProperty('--glow-y', e.clientY);
    });
  }

  /* ---------- Tilt on tech media ---------- */
  var tiltEl = document.querySelector('.tilt');
  if(tiltEl && window.matchMedia('(pointer: fine)').matches){
    tiltEl.addEventListener('mousemove', function(e){
      var r = tiltEl.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tiltEl.style.transform = 'perspective(900px) rotateY(' + (x * 6) + 'deg) rotateX(' + (y * -6) + 'deg)';
    });
    tiltEl.addEventListener('mouseleave', function(){
      tiltEl.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
    });
  }

  /* ---------- Booking modal (Prenota una dimostrazione) ---------- */
  var bookingOverlay = document.getElementById('booking-overlay');
  if(bookingOverlay){
    var bookingClose = document.getElementById('booking-close');
    var bookingSteps = bookingOverlay.querySelectorAll('.booking-step');
    var bookingDots = bookingOverlay.querySelectorAll('.booking-dot');
    var calGrid = document.getElementById('cal-grid');
    var calMonthLabel = document.getElementById('cal-month-label');
    var calPrev = document.getElementById('cal-prev');
    var calNext = document.getElementById('cal-next');
    var timesWrap = document.getElementById('booking-times');
    var timesGrid = document.getElementById('times-grid');
    var step1Next = document.getElementById('step1-next');
    var step2Back = document.getElementById('step2-back');
    var step2Next = document.getElementById('step2-next');
    var bookingDoneBtn = document.getElementById('booking-done');
    var recapEl = document.getElementById('booking-recap');
    var finalRecapEl = document.getElementById('booking-final-recap');
    var bookingForm = document.getElementById('booking-form');
    var bookingError = document.getElementById('booking-error');

    var MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    var WEEKDAYS_IT = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    var TIME_SLOTS = ['09:00','10:30','12:00','14:30','16:00','17:30'];

    // Le prenotazioni passano dal back office, sullo stesso dominio: non
    // serve piu' nessun client di database ne' nessuna chiave dentro la
    // pagina. Prima qui c'era l'indirizzo e la chiave pubblica di un
    // progetto Supabase separato.
    var API_PRENOTAZIONI = '/api/prenotazioni';

    function toISODate(date){
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d = String(date.getDate()).padStart(2, '0');
      return date.getFullYear() + '-' + m + '-' + d;
    }

    var todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    var viewYear = todayDate.getFullYear();
    var viewMonth = todayDate.getMonth();
    var selectedDate = null;
    var selectedTime = null;
    var lastFocused = null;

    function isSelectableDay(date){
      if(date.getTime() < todayDate.getTime()) return false;
      return date.getDay() !== 0; // closed Sundays
    }

    function renderCalendar(){
      calMonthLabel.textContent = MONTHS_IT[viewMonth] + ' ' + viewYear;
      calGrid.innerHTML = '';
      var firstOfMonth = new Date(viewYear, viewMonth, 1);
      var startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first index
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      for(var i = 0; i < startOffset; i++){
        var empty = document.createElement('span');
        empty.className = 'booking-cal-cell empty';
        calGrid.appendChild(empty);
      }
      for(var d = 1; d <= daysInMonth; d++){
        (function(d){
          var date = new Date(viewYear, viewMonth, d);
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'booking-cal-cell';
          btn.textContent = String(d);
          if(!isSelectableDay(date)){
            btn.disabled = true;
            btn.classList.add('disabled');
          } else {
            btn.addEventListener('click', function(){
              selectedDate = date;
              selectedTime = null;
              renderCalendar();
              loadTimesForDate(date);
              updateStep1Nav();
            });
          }
          if(date.getTime() === todayDate.getTime()) btn.classList.add('today');
          if(selectedDate && date.getTime() === selectedDate.getTime()) btn.classList.add('selected');
          calGrid.appendChild(btn);
        })(d);
      }
      calPrev.disabled = (viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth());
    }

    var takenTimes = [];
    var timesRequestId = 0;

    function renderTimes(){
      if(!selectedDate){ timesWrap.hidden = true; return; }
      timesWrap.hidden = false;
      timesGrid.innerHTML = '';
      TIME_SLOTS.forEach(function(t){
        var isTaken = takenTimes.indexOf(t) !== -1;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'booking-time-chip' + (selectedTime === t ? ' selected' : '') + (isTaken ? ' disabled' : '');
        btn.textContent = t + (isTaken ? ' · occupato' : '');
        if(isTaken){
          btn.disabled = true;
        } else {
          btn.addEventListener('click', function(){
            selectedTime = t;
            renderTimes();
            updateStep1Nav();
          });
        }
        timesGrid.appendChild(btn);
      });
    }

    function loadTimesForDate(date){
      takenTimes = [];
      timesWrap.hidden = false;
      timesGrid.innerHTML = '<div class="booking-times-loading">Verifica disponibilità…</div>';
      var thisRequest = ++timesRequestId;

      fetch(API_PRENOTAZIONI + '?data=' + encodeURIComponent(toISODate(date)))
        .then(function(res){ return res.ok ? res.json() : { occupati: [] }; })
        .then(function(dati){
          if(thisRequest !== timesRequestId) return; // risposta vecchia: nel frattempo e' stata scelta un'altra data
          takenTimes = (dati && dati.occupati) ? dati.occupati : [];
          renderTimes();
        })
        .catch(function(){
          if(thisRequest !== timesRequestId) return;
          // Se la verifica non riesce si mostrano tutti gli orari: a fermare
          // un doppione ci pensa comunque il controllo al momento dell'invio.
          takenTimes = [];
          renderTimes();
        });
    }

    function updateStep1Nav(){
      step1Next.disabled = !(selectedDate && selectedTime);
    }

    function formatSelectedDate(){
      return WEEKDAYS_IT[selectedDate.getDay()] + ' ' + selectedDate.getDate() + ' ' + MONTHS_IT[selectedDate.getMonth()];
    }

    calPrev.addEventListener('click', function(){
      viewMonth--;
      if(viewMonth < 0){ viewMonth = 11; viewYear--; }
      renderCalendar();
    });
    calNext.addEventListener('click', function(){
      viewMonth++;
      if(viewMonth > 11){ viewMonth = 0; viewYear++; }
      renderCalendar();
    });

    var bookingModal = bookingOverlay.querySelector('.booking-modal');

    function goToStep(n){
      bookingSteps.forEach(function(s){
        s.hidden = (parseInt(s.getAttribute('data-step'), 10) !== n);
      });
      // Il passo dei dati ha molti campi: sta su due colonne solo se la
      // finestra e' piu' larga, altrimenti tornerebbe a essere una colonna
      // lunghissima da scorrere.
      bookingModal.classList.toggle('wide', n === 2);
      bookingDots.forEach(function(dot){
        dot.classList.toggle('active', parseInt(dot.getAttribute('data-step-dot'), 10) <= n);
      });
    }

    step1Next.addEventListener('click', function(){
      recapEl.textContent = formatSelectedDate() + ' · ' + selectedTime;
      goToStep(2);
    });
    step2Back.addEventListener('click', function(){ goToStep(1); });

    // ---- Indirizzo: regione -> provincia -> comune -> CAP ----------------
    // Gli elenchi arrivano dal back office (/api/comuni) invece di essere
    // dentro la pagina: il file completo dei comuni italiani pesa 271 KB e
    // non ha senso scaricarlo tutto per farne scegliere uno.
    var selRegione  = document.getElementById('bk-regione');
    var selProvincia= document.getElementById('bk-provincia');
    var selComune   = document.getElementById('bk-comune');
    var selCap      = document.getElementById('bk-cap');
    var geo = null;          // { regioni: {nome: [sigle]}, province: {sigla: nome} }
    var comuniCache = {};    // sigla provincia -> elenco comuni

    function svuota(sel, testo){
      sel.innerHTML = '<option value="">' + testo + '</option>';
      sel.disabled = true;
    }

    function caricaGeografia(){
      if(geo) return Promise.resolve(geo);
      return fetch('/api/comuni')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){
          if(!d) return null;
          geo = d;
          var nomi = Object.keys(d.regioni).sort();
          selRegione.innerHTML = '<option value="">Seleziona…</option>';
          nomi.forEach(function(nome){
            var o = document.createElement('option');
            o.value = nome; o.textContent = nome;
            selRegione.appendChild(o);
          });
          return d;
        })
        .catch(function(){ return null; });
    }

    selRegione.addEventListener('change', function(){
      svuota(selComune, '—'); svuota(selCap, '—');
      var sigle = geo && geo.regioni[selRegione.value];
      if(!sigle){ svuota(selProvincia, '—'); checkStep2Valid(); return; }
      selProvincia.innerHTML = '<option value="">Seleziona…</option>';
      sigle.slice().sort(function(a,b){
        return geo.province[a].localeCompare(geo.province[b], 'it');
      }).forEach(function(sigla){
        var o = document.createElement('option');
        o.value = sigla; o.textContent = geo.province[sigla] + ' (' + sigla + ')';
        selProvincia.appendChild(o);
      });
      selProvincia.disabled = false;
      checkStep2Valid();
    });

    selProvincia.addEventListener('change', function(){
      svuota(selComune, 'Caricamento…'); svuota(selCap, '—');
      var sigla = selProvincia.value;
      if(!sigla){ svuota(selComune, '—'); checkStep2Valid(); return; }

      var riempi = function(elenco){
        comuniCache[sigla] = elenco;
        selComune.innerHTML = '<option value="">Seleziona…</option>';
        elenco.forEach(function(c){
          var o = document.createElement('option');
          o.value = c.n; o.textContent = c.n;
          selComune.appendChild(o);
        });
        selComune.disabled = false;
        checkStep2Valid();
      };

      if(comuniCache[sigla]) { riempi(comuniCache[sigla]); return; }
      fetch('/api/comuni?provincia=' + encodeURIComponent(sigla))
        .then(function(r){ return r.ok ? r.json() : { comuni: [] }; })
        .then(function(d){ riempi(d.comuni || []); })
        .catch(function(){ svuota(selComune, 'Non disponibile'); checkStep2Valid(); });
    });

    selComune.addEventListener('change', function(){
      var elenco = comuniCache[selProvincia.value] || [];
      var trovato = elenco.filter(function(c){ return c.n === selComune.value; })[0];
      var caps = trovato ? trovato.c : [];

      if(caps.length === 0){ svuota(selCap, '—'); checkStep2Valid(); return; }

      selCap.innerHTML = '';
      // Un comune solo ha quasi sempre un CAP: si compila da se'. Le citta'
      // grandi ne hanno decine (Verona 22) e li' il CAP dipende dalla via,
      // quindi si sceglie.
      if(caps.length > 1){
        var vuoto = document.createElement('option');
        vuoto.value = ''; vuoto.textContent = 'Seleziona…';
        selCap.appendChild(vuoto);
      }
      caps.forEach(function(cap){
        var o = document.createElement('option');
        o.value = cap; o.textContent = cap;
        selCap.appendChild(o);
      });
      selCap.disabled = false;
      checkStep2Valid();
    });

    // ---- Controlli campo per campo ---------------------------------------
    // Il telefono italiano: si accettano spazi, punti, trattini e prefisso
    // internazionale, perche' ognuno lo scrive a modo suo. Conta che resti
    // un numero di lunghezza plausibile.
    function telefonoValido(v){
      var pulito = v.replace(/[\s.\-()]/g, '');
      if(pulito.indexOf('+') === 0) pulito = pulito.slice(1);
      return /^[0-9]{8,15}$/.test(pulito);
    }
    function emailValida(v){
      return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
    }

    var CONTROLLI = {
      'bk-name':   { ok: function(v){ return v.trim().length >= 2; },
                     msg: 'Inserisci nome e cognome.' },
      'bk-phone':  { ok: telefonoValido,
                     msg: 'Numero non valido: servono almeno 8 cifre.' },
      'bk-email':  { ok: emailValida,
                     msg: 'Email non valida: controlla che ci sia la chiocciola e il punto.' },
      'bk-via':    { ok: function(v){ return v.trim().length >= 3; },
                     msg: 'Inserisci la via o la piazza.' },
      'bk-civico': { ok: function(v){ return v.trim().length >= 1; },
                     msg: 'Inserisci il numero civico.' }
    };

    function segnala(id, mostraErrore){
      var campo = document.getElementById(id);
      var regola = CONTROLLI[id];
      var valido = regola.ok(campo.value);
      var avviso = bookingForm.querySelector('.bk-hint[data-for="' + id + '"]');
      // Il rosso solo se il campo e' stato compilato e lasciato: mentre uno
      // scrive non si segnala nulla.
      var errore = mostraErrore && campo.value.trim() !== '' && !valido;
      campo.classList.toggle('invalid', errore);
      if(avviso) avviso.textContent = errore ? regola.msg : '';
      return valido;
    }

    Object.keys(CONTROLLI).forEach(function(id){
      var campo = document.getElementById(id);
      campo.addEventListener('blur', function(){ segnala(id, true); });
      campo.addEventListener('input', function(){
        if(campo.classList.contains('invalid')) segnala(id, true);
        checkStep2Valid();
      });
    });

    function checkStep2Valid(){
      var tuttiOk = Object.keys(CONTROLLI).every(function(id){
        return CONTROLLI[id].ok(document.getElementById(id).value);
      });
      var indirizzoOk = selRegione.value && selProvincia.value && selComune.value && selCap.value;
      var consent = document.getElementById('bk-consent').checked;
      step2Next.disabled = !(tuttiOk && indirizzoOk && consent);
    }
    bookingForm.addEventListener('input', checkStep2Valid);
    bookingForm.addEventListener('change', checkStep2Valid);

    function showBookingError(msg){
      bookingError.textContent = msg;
      bookingError.hidden = false;
    }
    function hideBookingError(){
      bookingError.hidden = true;
    }

    step2Next.addEventListener('click', function(){
      hideBookingError();

      // L'indirizzo viaggia a pezzi: e' il back office a ricomporlo, cosi'
      // la forma della riga e' decisa in un posto solo.
      var payload = {
        name: document.getElementById('bk-name').value.trim(),
        phone: document.getElementById('bk-phone').value.trim(),
        email: document.getElementById('bk-email').value.trim(),
        via: document.getElementById('bk-via').value.trim(),
        civico: document.getElementById('bk-civico').value.trim(),
        comune: selComune.value,
        provincia: selProvincia.value,
        cap: selCap.value,
        regione: selRegione.value,
        notes: document.getElementById('bk-notes').value.trim() || null,
        booking_date: toISODate(selectedDate),
        booking_time: selectedTime
      };

      var originalLabel = step2Next.textContent;
      step2Next.disabled = true;
      step2Next.textContent = 'Invio in corso…';

      fetch(API_PRENOTAZIONI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(dati){
          return { status: res.status, ok: res.ok, dati: dati };
        });
      }).then(function(esito){
        step2Next.disabled = false;
        step2Next.textContent = originalLabel;

        if(!esito.ok){
          if(esito.status === 409){
            showBookingError('Questo orario è appena stato prenotato da qualcun altro. Torna al passo 1 e scegline un altro.');
          } else {
            showBookingError((esito.dati && esito.dati.error && esito.status === 400)
              ? esito.dati.error
              : 'Non siamo riusciti a salvare la prenotazione. Riprova tra poco.');
          }
          return;
        }

        finalRecapEl.textContent = 'Ti contatteremo entro 24 ore per confermare l\'appuntamento di ' + formatSelectedDate() + ' alle ' + selectedTime + '.';
        goToStep(3);
      }).catch(function(){
        step2Next.disabled = false;
        step2Next.textContent = originalLabel;
        showBookingError('Non siamo riusciti a salvare la prenotazione. Controlla la connessione e riprova.');
      });
    });

    function openBookingModal(){
      lastFocused = document.activeElement;
      bookingOverlay.classList.add('open');
      bookingOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      viewYear = todayDate.getFullYear();
      viewMonth = todayDate.getMonth();
      selectedDate = null;
      selectedTime = null;
      renderCalendar();
      renderTimes();
      updateStep1Nav();
      bookingForm.reset();
      caricaGeografia();
      svuota(selProvincia, '—'); svuota(selComune, '—'); svuota(selCap, '—');
      bookingForm.querySelectorAll('.invalid').forEach(function(el){ el.classList.remove('invalid'); });
      bookingForm.querySelectorAll('.bk-hint').forEach(function(el){ el.textContent = ''; });
      checkStep2Valid();
      hideBookingError();
      goToStep(1);
      bookingClose.focus();
    }
    function closeBookingModal(){
      bookingOverlay.classList.remove('open');
      bookingOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if(lastFocused && lastFocused.focus) lastFocused.focus();
    }

    document.querySelectorAll('.js-book-demo').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        openBookingModal();
      });
    });
    bookingClose.addEventListener('click', closeBookingModal);
    bookingDoneBtn.addEventListener('click', closeBookingModal);
    bookingOverlay.addEventListener('click', function(e){
      if(e.target === bookingOverlay) closeBookingModal();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && bookingOverlay.classList.contains('open')) closeBookingModal();
    });
  }

  /* ---------- Survey iframe: auto-height to fit current question ---------- */
  var surveyIframe = document.getElementById('survey-iframe');
  if(surveyIframe){
    surveyIframe.addEventListener('load', function(){
      var doc;
      try{ doc = surveyIframe.contentDocument; }catch(e){ return; }
      if(!doc) return;

      function resizeToContent(){
        var h = doc.body ? doc.body.scrollHeight : 0;
        if(h > 0) surveyIframe.style.height = h + 'px';
      }

      resizeToContent();
      var observer = new MutationObserver(resizeToContent);
      observer.observe(doc.body, { childList:true, subtree:true, attributes:true });
      window.addEventListener('resize', resizeToContent);
    });
  }

})();
