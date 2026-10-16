/* Атмосфера — вариант D «Горизонт». Общий скрипт для всех страниц.
   Каждый модуль изолирован: ошибка в одном не ломает остальные и не оставляет контент скрытым. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function safe(name, fn) {
    try { fn(); } catch (err) { if (window.console) console.error('[' + name + ']', err); }
  }

  function onMedia(query, handler) {
    var mq = window.matchMedia(query);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  var header = document.querySelector('[data-header]');
  var burger = document.querySelector('[data-burger]');

  /* ---------- Мобильное меню: фокус остаётся внутри, страница под ним недоступна ---------- */
  safe('menu', function () {
    if (!header || !burger) return;
    var nav = header.querySelector('.main-nav');
    var outside = document.querySelectorAll('main, .site-footer, .mobile-bar, .skip-link');

    function setMenu(open) {
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      outside.forEach(function (el) { el.inert = open; });
      header.querySelectorAll('.logo, .header-cta, .header-phone').forEach(function (el) { el.inert = open; });
      if (open) {
        // меню становится видимым с началом перехода — фокус ставим кадром позже
        var first = nav && nav.querySelector('a');
        if (first) setTimeout(function () { first.focus(); }, 60);
      }
    }

    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    header.querySelectorAll('.main-nav a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
      // Tab по кругу: меню → бургер → меню
      if (e.key === 'Tab' && header.classList.contains('is-open') && nav) {
        var items = Array.prototype.slice.call(nav.querySelectorAll('a')).concat(burger);
        var idx = items.indexOf(document.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        var next = (idx + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next].focus();
      }
    });
    onMedia('(min-width: 960px)', function (mq) { if (mq.matches) setMenu(false); });
  });

  /* ---------- Шапка: прозрачная над ночным экраном → тёмная подложка → белая, когда подъезжает панель расчёта ---------- */
  safe('header', function () {
    if (!header) return;
    var card = document.querySelector('.quote-card');
    var ticking = false;
    function update() {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      var solid = true;
      if (card) solid = card.getBoundingClientRect().top <= header.offsetHeight + 24;
      header.classList.toggle('is-solid', solid);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- Нижняя панель на телефоне не закрывает поля, пока в них печатают ---------- */
  safe('mobile-bar', function () {
    document.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches('input, select, textarea')) document.body.classList.add('form-focus');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!a || !a.matches || !a.matches('input, select, textarea')) document.body.classList.remove('form-focus');
      }, 0);
    });
    // «Заявка» ведёт сразу к полю телефона
    document.querySelectorAll('[data-to-phone]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var phone = document.getElementById('calc-phone');
        if (!phone) return;
        e.preventDefault();
        phone.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(function () { phone.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      });
    });
  });

  /* ---------- Предвыбор услуги или документа в форме расчёта ---------- */
  safe('preselect', function () {
    var serviceSelect = document.querySelector('[data-service-select]');
    var docSelect = document.querySelector('[data-doc-select]');
    document.querySelectorAll('[data-service]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (serviceSelect) serviceSelect.value = link.getAttribute('data-service');
      });
    });
    document.querySelectorAll('[data-doc-pick]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (docSelect) docSelect.value = link.getAttribute('data-doc-pick');
      });
    });
  });

  /* ---------- Телефон: маска для российских номеров, иностранные не трогаем ---------- */
  function isForeign(value) { return /^\s*\+\s*([0-689]|$)/.test(value); }

  function formatPhone(value) {
    var d = value.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }

  // Возвращает текст ошибки или '' если номер корректный
  function phoneError(value) {
    var digits = value.replace(/\D/g, '');
    if (!digits.length) return 'Укажите телефон, чтобы мы могли перезвонить.';
    if (isForeign(value)) return digits.length >= 8 && digits.length <= 15 ? '' : 'Проверьте номер: не хватает цифр.';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;
    return /^7\d{10}$/.test(digits) ? '' : 'В номере должно быть 10 цифр после +7.';
  }

  safe('phone-mask', function () {
    document.querySelectorAll('[data-phone]').forEach(function (input) {
      input.addEventListener('input', function (e) {
        if (isForeign(input.value)) return;
        if (e.inputType && e.inputType.indexOf('delete') === 0) return;
        // правку в середине номера не переформатируем — иначе курсор прыгает в конец
        if (input.selectionStart !== null && input.selectionStart < input.value.length) return;
        input.value = formatPhone(input.value);
      });
      input.addEventListener('blur', function () {
        if (input.value.replace(/\D/g, '').length <= 1) { input.value = ''; return; }
        if (!isForeign(input.value)) input.value = formatPhone(input.value);
      });
    });
  });

  /* ---------- Формы: валидация и состояние «Спасибо» ---------- */
  safe('forms', function () {
    function showError(field, errorEl, message) {
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (errorEl) errorEl.textContent = message || '';
    }

    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var phone = form.querySelector('[data-phone]');
      var consent = form.querySelector('[data-consent]');
      var phoneErr = phone ? document.getElementById(phone.id + '-error') : null;
      var consentErr = consent ? document.getElementById(consent.id + '-error') : null;

      if (phone) {
        phone.addEventListener('input', function () {
          if (phone.getAttribute('aria-invalid') === 'true' && !phoneError(phone.value)) showError(phone, phoneErr, '');
        });
      }
      if (consent) {
        consent.addEventListener('change', function () { if (consent.checked) showError(consent, consentErr, ''); });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var firstInvalid = null;

        if (phone) {
          var msg = phoneError(phone.value);
          showError(phone, phoneErr, msg);
          if (msg) firstInvalid = phone;
        }
        if (consent) {
          if (!consent.checked) {
            showError(consent, consentErr, 'Отметьте согласие на обработку персональных данных.');
            firstInvalid = firstInvalid || consent;
          } else {
            showError(consent, consentErr, '');
          }
        }
        if (firstInvalid) { firstInvalid.focus(); return; }

        // TODO: подключить CRM-форму Битрикс24 при переносе
        // Сейчас данные никуда не отправляются — показываем состояние успеха.
        var phoneLink = document.querySelector('.header-phone, .nav-phone');
        var success = document.createElement('div');
        success.className = 'form-success';
        success.setAttribute('role', 'status');
        success.setAttribute('tabindex', '-1');
        success.innerHTML =
          '<span class="form-success-mark" aria-hidden="true"></span>' +
          '<h3>Заявка принята</h3>' +
          '<p>Перезвоним, уточним детали и назовём цену и срок.</p>' +
          (phoneLink ? '<p class="form-success-alt">Если срочно — позвоните: <a href="' + phoneLink.getAttribute('href') + '">' + phoneLink.textContent.trim() + '</a></p>' : '');
        form.replaceWith(success);
        success.focus();
      });
    });
  });

  /* ---------- Аккордеон: в группе открыт один ответ ---------- */
  safe('accordion', function () {
    document.querySelectorAll('[data-accordion]').forEach(function (group) {
      var items = group.querySelectorAll('details');
      items.forEach(function (item) {
        item.addEventListener('toggle', function () {
          if (!item.open) return;
          items.forEach(function (other) { if (other !== item && other.open) other.open = false; });
        });
      });
    });
  });

  /* ---------- Лайтбокс для писем-отзывов (нативный <dialog>) ---------- */
  safe('lightbox', function () {
    var dialog = document.getElementById('lightbox');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    var img = dialog.querySelector('[data-lightbox-img]');
    var caption = dialog.querySelector('[data-lightbox-caption]');
    var closeBtn = dialog.querySelector('[data-lightbox-close]');
    var lastTrigger = null;

    document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        lastTrigger = btn;
        img.src = btn.getAttribute('data-lightbox');
        img.alt = btn.getAttribute('data-alt') || '';
        caption.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
        closeBtn.focus();
      });
    });
    closeBtn.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
  });

  /* ---------- Каталог документов: фильтр по категориям ---------- */
  safe('doc-filter', function () {
    var filters = document.querySelectorAll('[data-doc-filter]');
    if (!filters.length) return;
    var docs = document.querySelectorAll('[data-doc]');
    var countEl = document.querySelector('[data-doc-count]');
    var plural = function (n) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? 'документ' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'документа' : 'документов'); };
    // число документов в каждой категории считаем по разметке, а не вручную
    filters.forEach(function (btn) {
      var cat = btn.getAttribute('data-doc-filter');
      var n = cat === 'all' ? docs.length : document.querySelectorAll('[data-doc="' + cat + '"]').length;
      var badge = btn.querySelector('.n');
      if (badge) badge.textContent = n;
    });
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-doc-filter'), shown = 0;
        filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        docs.forEach(function (d) {
          var match = cat === 'all' || d.getAttribute('data-doc') === cat;
          d.hidden = !match;
          d.classList.remove('is-shown');
          if (match) { shown++; void d.offsetWidth; d.classList.add('is-shown'); }
        });
        if (countEl) countEl.textContent = 'Показано: ' + shown + ' ' + plural(shown);
      });
    });
  });

  /* =================== Движение (только без reduced motion) =================== */
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  /* Заголовок первого экрана проявляется по словам. Неразрывные пробелы сохраняем. */
  safe('split', function () {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var i = 0;
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = document.createDocumentFragment();
            child.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
              if (!part) return;
              if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
              var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            child.parentNode.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            walk(child);
          }
        });
      };
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      walk(el);
      el.classList.add('split');
    });
  });

  /* Анимации прокрутки. Пока посетитель не прокручивал, всё видно (превью, скриншоты, кто не листает).
     С первой прокрутки блоки ниже экрана незаметно прячутся (.pending) и въезжают, когда до них доходят. */
  /* Каждый элемент списков и сеток въезжает отдельно, с задержкой по порядку */
  safe('tag-reveal', function () {
    var groups = ['.problems > li', '.services > .service', '.docs > *', '.team > *', '.quotes > *', '.letters > *',
      '.faq > details', '.pluses > li', '.benefits > *', '.figures > *', '.cert-points > li', '.ticker li'];
    groups.forEach(function (sel) {
      var parents = new Set();
      document.querySelectorAll(sel).forEach(function (el) { parents.add(el.parentElement); });
      parents.forEach(function (parent) {
        var i = 0;
        Array.prototype.forEach.call(parent.children, function (el) {
          if (!el.matches(sel) || el.hasAttribute('data-reveal')) return;
          el.setAttribute('data-reveal', '');
          el.style.setProperty('--d', Math.min(i++, 7) * 90 + 'ms');
        });
      });
    });
    // фото: раскрываются шторкой снизу вверх
    document.querySelectorAll('.person img, .photo-band-media img, .cert-block-media img').forEach(function (img) {
      img.setAttribute('data-reveal', 'img');
    });
    // заголовки секций поднимаются из-под строки
    document.querySelectorAll('.section-head h2, .photo-band h2, .cert-block h2, .final h2').forEach(function (h) {
      h.setAttribute('data-reveal', 'title');
    });
  });

  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], .steps, .flight'));
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  var fmt = function (v, dec) { return v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: v >= 10000 }).replace(/\u00a0/g, ' '); };

  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), from = parseFloat(el.getAttribute('data-from') || '0');
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10), start = null, dur = 1600;
    var tick = function (t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - k, 3);
      var v = from + (to - from) * eased;
      el.textContent = fmt(dec ? v : Math.round(v), dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  safe('scroll-motion', function () {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        var el = e.target;
        if (el.hasAttribute('data-count')) { countUp(el); return; }
        // фото со шторкой (clip-path) отслеживаем через родителя — у скрытой картинки нет видимой площади
        [el].concat(el._revealTargets || []).forEach(function (t) {
          if (!t.classList.contains('pending')) return;
          t.classList.remove('pending');
          t.classList.add('is-in');
        });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    var armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      var vh = window.innerHeight;
      targets.forEach(function (el) {
        if (el.getBoundingClientRect().top <= vh) return;
        el.classList.add('pending');
        if (el.getAttribute('data-reveal') === 'img') {
          var trigger = el.closest('picture') || el.parentElement;
          (trigger._revealTargets = trigger._revealTargets || []).push(el);
          obs.observe(trigger);
        } else {
          obs.observe(el);
        }
      });
      counters.forEach(function (el) {
        if (el.getBoundingClientRect().top > vh) {
          el.textContent = fmt(parseFloat(el.getAttribute('data-from') || '0'), parseInt(el.getAttribute('data-decimals') || '0', 10));
          obs.observe(el);
        }
      });
      window.removeEventListener('scroll', arm);
      window.removeEventListener('wheel', arm);
      window.removeEventListener('touchstart', arm);
    }
    window.addEventListener('scroll', arm, { passive: true });
    window.addEventListener('wheel', arm, { passive: true });
    window.addEventListener('touchstart', arm, { passive: true });
  });

  /* Мягкий параллакс фоновых фото */
  safe('parallax', function () {
    var items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var progress = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        el.style.transform = 'translate3d(0,' + (progress * -8).toFixed(2) + '%,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  });
})();
