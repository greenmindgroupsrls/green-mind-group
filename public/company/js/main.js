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

  /* ---------- Custom cursor + magnetic buttons (fine pointer only) ---------- */
  if(window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    root.classList.add('has-fine-cursor');
    var cursorDot = document.querySelector('.cursor-dot');
    var cursorRing = document.querySelector('.cursor-ring');
    var ringX = 0, ringY = 0, mouseX = 0, mouseY = 0;

    window.addEventListener('mousemove', function(e){
      mouseX = e.clientX; mouseY = e.clientY;
      root.classList.add('cursor-active');
      cursorDot.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px) translate(-50%,-50%)';
      root.style.setProperty('--glow-x', mouseX);
      root.style.setProperty('--glow-y', mouseY);
    });
    window.addEventListener('mouseleave', function(){ root.classList.remove('cursor-active'); });

    function ringLoop(){
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';
      requestAnimationFrame(ringLoop);
    }
    requestAnimationFrame(ringLoop);

    var hoverables = document.querySelectorAll('a, button, summary, .audience-card, .benefit-card');
    hoverables.forEach(function(el){
      el.addEventListener('mouseenter', function(){ root.classList.add('cursor-hover'); });
      el.addEventListener('mouseleave', function(){ root.classList.remove('cursor-hover'); });
    });

    var magnets = document.querySelectorAll('.btn-primary');
    magnets.forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) * 0.35;
        var my = (e.clientY - r.top - r.height / 2) * 0.5;
        el.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
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

    var SUPABASE_URL = 'https://yybswupvlpexnnsnuakc.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_riGniHSWn1Z5YxHqNRv6zg_DF3fHHoM';
    var sb = (window.supabase && window.supabase.createClient)
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;

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

      if(!sb){ renderTimes(); return; }

      sb.from('booking_slots')
        .select('booking_time')
        .eq('booking_date', toISODate(date))
        .then(function(res){
          if(thisRequest !== timesRequestId) return; // stale response, a newer date was picked meanwhile
          if(!res.error && res.data){
            takenTimes = res.data.map(function(row){ return row.booking_time; });
          }
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

    function goToStep(n){
      bookingSteps.forEach(function(s){
        s.hidden = (parseInt(s.getAttribute('data-step'), 10) !== n);
      });
      bookingDots.forEach(function(dot){
        dot.classList.toggle('active', parseInt(dot.getAttribute('data-step-dot'), 10) <= n);
      });
    }

    step1Next.addEventListener('click', function(){
      recapEl.textContent = formatSelectedDate() + ' · ' + selectedTime;
      goToStep(2);
    });
    step2Back.addEventListener('click', function(){ goToStep(1); });

    function checkStep2Valid(){
      var name = document.getElementById('bk-name').value.trim();
      var phone = document.getElementById('bk-phone').value.trim();
      var email = document.getElementById('bk-email').value.trim();
      var address = document.getElementById('bk-address').value.trim();
      var consent = document.getElementById('bk-consent').checked;
      step2Next.disabled = !(name && phone && /\S+@\S+\.\S+/.test(email) && address && consent);
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

      if(!sb){
        showBookingError('Servizio di prenotazione non disponibile al momento. Riprova più tardi o contattaci direttamente.');
        return;
      }

      var payload = {
        name: document.getElementById('bk-name').value.trim(),
        phone: document.getElementById('bk-phone').value.trim(),
        email: document.getElementById('bk-email').value.trim(),
        address: document.getElementById('bk-address').value.trim(),
        notes: document.getElementById('bk-notes').value.trim() || null,
        booking_date: toISODate(selectedDate),
        booking_time: selectedTime
      };

      var originalLabel = step2Next.textContent;
      step2Next.disabled = true;
      step2Next.textContent = 'Invio in corso…';

      sb.from('bookings').insert(payload).then(function(res){
        step2Next.disabled = false;
        step2Next.textContent = originalLabel;

        if(res.error){
          if(res.error.code === '23505'){
            showBookingError('Questo orario è appena stato prenotato da qualcun altro. Torna al passo 1 e scegline un altro.');
          } else {
            showBookingError('Non siamo riusciti a salvare la prenotazione. Riprova tra poco.');
          }
          return;
        }

        finalRecapEl.textContent = 'Ti contatteremo entro 24 ore per confermare l\'appuntamento di ' + formatSelectedDate() + ' alle ' + selectedTime + '.';
        goToStep(3);
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
