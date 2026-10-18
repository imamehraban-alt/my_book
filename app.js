/* ====================================================
   اپلیکیشن توسعه‌یافته (نسخه‌ی نهایی و بدون باگ)
   شامل: موسیقی، ادامه مطلب، شهاب‌سنگ، آمار مطالعه
   و جلوگیری کامل از کپی کردن متن
   ==================================================== */

(function() {
  // ─── تنظیمات و ذخیره‌سازی ───
  const STORAGE_KEYS = {
    lastRead: 'book-last-read',
    musicOn: 'book-music-on',
    stats: 'book-reading-stats'
  };

  const read = (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  };
  const write = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  };
  
  const toFaNum = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  // ─── جلوگیری از کپی و راست کلیک ───
  function preventCopying() {
    // جلوگیری از کپی و برش
    document.addEventListener('copy', e => {
      e.preventDefault();
      if (typeof window.toast === 'function') window.toast('کپی کردن متن امکان‌پذیر نیست');
    });
    
    document.addEventListener('cut', e => {
      e.preventDefault();
    });

    // جلوگیری از کلیدهای میان‌بر کپی
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        if (typeof window.toast === 'function') window.toast('کپی کردن متن امکان‌پذیر نیست');
      }
    });

    // جلوگیری از راست کلیک در صفحه خواندن
    document.addEventListener('contextmenu', e => {
      if (document.querySelector('#readerPage')?.classList.contains('open')) {
        e.preventDefault();
      }
    });
  }

  // ─── ساخت المان‌های UI ───
  function injectUI() {
    const header = document.querySelector('header');
    const mark = header.querySelector('.mark');

    // ۱. دکمه موسیقی
    const musicBtn = document.createElement('button');
    musicBtn.className = 'hdr-btn';
    musicBtn.id = 'musicBtn';
    musicBtn.style.display = 'none';
    musicBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    `;
    musicBtn.onclick = toggleMusic;

    // ۲. دکمه پخش صوتی
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'hdr-btn';
    ttsBtn.id = 'ttsBtn';
    ttsBtn.style.display = 'none';
    ttsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    `;
    ttsBtn.onclick = toggleTTS;

    header.insertBefore(ttsBtn, mark);
    header.insertBefore(musicBtn, ttsBtn);

    // ۳. بنر ادامه مطلب
    const container = document.querySelector('.container');
    const intro = container.querySelector('.book-intro');
    const contBtn = document.createElement('div');
    contBtn.id = 'continueBanner';
    contBtn.style.cssText = `
      display: none;
      background: linear-gradient(135deg, rgba(212,169,90,.15), rgba(212,169,90,.05));
      border: 1px solid rgba(212,169,90,.3);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all .3s;
      align-items: center;
      gap: 12px;
    `;
    contBtn.innerHTML = `
      <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,var(--gold),#d4a95a);color:#0a0d14;display:grid;place-items:center;flex-shrink:0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0;text-align:right;">
        <div style="font-size:10px;color:var(--muted);">ادامه‌ی مطالعه</div>
        <div id="continueTitle" style="font-size:13.5px;font-weight:600;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--muted);flex-shrink:0;">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
    `;
    intro.parentNode.insertBefore(contBtn, intro.nextSibling);

    // ۴. لایه شهاب سنگ
    const shootingStarLayer = document.createElement('div');
    shootingStarLayer.id = 'shootingStarLayer';
    shootingStarLayer.style.cssText = `
      position: fixed; inset: 0; z-index: 401;
      pointer-events: none; overflow: hidden;
      display: none;
    `;
    document.body.appendChild(shootingStarLayer);

    // ۵. المان موسیقی
    if (!document.getElementById('bgMusic')) {
      const audio = document.createElement('audio');
      audio.id = 'bgMusic';
      audio.loop = true;
      audio.volume = 0.15;
      audio.src = 'music.mp3'; // فایل موسیقی باید در پوشه باشد
      document.body.appendChild(audio);
    }

    // ۶. دکمه اشتراک‌گذاری
    const readerPage = document.querySelector('#readerPage');
    if (readerPage) {
      const readerTopbar = readerPage.querySelector('.reader-topbar');
      const shareBtn = document.createElement('button');
      shareBtn.className = 'hdr-btn';
      shareBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      `;
      shareBtn.onclick = shareQuote;
      shareBtn.style.cssText = 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;cursor:pointer;flex-shrink:0;padding:0;position:relative;z-index:2;transition:all .35s';
      readerTopbar.insertBefore(shareBtn, readerTopbar.querySelector('.rt-num'));
    }
  }

  // ─── موسیقی ───
  function toggleMusic() {
    const audio = document.getElementById('bgMusic');
    const btn = document.getElementById('musicBtn');
    if (!audio) return;
    
    if (!audio.paused) {
      audio.pause();
      write(STORAGE_KEYS.musicOn, false);
      btn.style.color = '#fff';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      btn.style.background = 'rgba(255,255,255,.06)';
      if (typeof window.toast === 'function') window.toast('موسیقی خاموش شد');
    } else {
      audio.play().catch(() => {
        if (typeof window.toast === 'function') window.toast('امکان پخش موسیقی نیست');
      });
      write(STORAGE_KEYS.musicOn, true);
      btn.style.color = 'var(--gold)';
      btn.style.borderColor = 'var(--gold)';
      btn.style.background = 'rgba(212,169,90,.15)';
      if (typeof window.toast === 'function') window.toast('موسیقی پخش شد');
    }
  }

  // ─── پخش صوتی (TTS) ───
  let ttsState = 'idle';
  let ttsQueue = [];
  let ttsCurrentIdx = 0;

  function toggleTTS() {
    const btn = document.getElementById('ttsBtn');
    const readerBody = document.querySelector('#readerBody');
    if (!readerBody) return;
    
    if (ttsState === 'speaking') {
      window.speechSynthesis.pause();
      ttsState = 'paused';
      btn.style.color = 'var(--gold)';
      btn.style.borderColor = 'var(--gold)';
      btn.style.background = 'rgba(212,169,90,.15)';
      if (typeof window.toast === 'function') window.toast('خواندن متوقف شد');
      return;
    }
    
    if (ttsState === 'paused') {
      window.speechSynthesis.resume();
      ttsState = 'speaking';
      btn.style.color = 'var(--gold)';
      btn.style.borderColor = 'var(--gold)';
      btn.style.background = 'rgba(212,169,90,.15)';
      return;
    }

    if (!('speechSynthesis' in window)) {
      if (typeof window.toast === 'function') window.toast('مرورگر شما از پخش صوتی پشتیبانی نمی‌کند');
      return;
    }

    const paragraphs = readerBody.querySelectorAll('.paragraph');
    if (!paragraphs.length) return;

    window.speechSynthesis.cancel();
    ttsQueue = Array.from(paragraphs).map(p => p.textContent.trim()).filter(t => t);
    ttsCurrentIdx = 0;
    ttsState = 'speaking';
    btn.style.color = 'var(--gold)';
    btn.style.borderColor = 'var(--gold)';
    btn.style.background = 'rgba(212,169,90,.15)';
    if (typeof window.toast === 'function') window.toast('پخش صوتی شروع شد...');
    
    speakNext();
  }

  function speakNext() {
    if (ttsCurrentIdx >= ttsQueue.length) {
      stopTTS();
      if (typeof window.toast === 'function') window.toast('پخش صوتی تمام شد');
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(ttsQueue[ttsCurrentIdx]);
    utterance.lang = 'fa-IR';
    utterance.rate = 0.95;
    
    const voices = window.speechSynthesis.getVoices();
    const faVoice = voices.find(v => v.lang.startsWith('fa'));
    if (faVoice) utterance.voice = faVoice;
    
    utterance.onend = () => {
      ttsCurrentIdx++;
      if (ttsState === 'speaking') speakNext();
    };
    utterance.onerror = () => {
      ttsCurrentIdx++;
      if (ttsState === 'speaking') speakNext();
    };
    
    window.speechSynthesis.speak(utterance);
  }

  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    ttsState = 'idle';
    ttsQueue = [];
    ttsCurrentIdx = 0;
    const btn = document.getElementById('ttsBtn');
    if (btn) {
      btn.style.color = '#fff';
      btn.style.borderColor = 'rgba(255,255,255,.1)';
      btn.style.background = 'rgba(255,255,255,.06)';
    }
  }

  // ─── شهاب سنگ ───
  function createShootingStars() {
    const layer = document.getElementById('shootingStarLayer');
    if (!layer) return;
    layer.innerHTML = '';
    
    if (!document.getElementById('shootStarKeyframes')) {
      const style = document.createElement('style');
      style.id = 'shootStarKeyframes';
      style.textContent = `
        @keyframes shootStar {
          0% { opacity: 0; transform: translateX(0) translateY(0); }
          5% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-120vw) translateY(40vh); }
        }
      `;
      document.head.appendChild(style);
    }
    
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('div');
      const size = 2 + Math.random() * 2;
      const delay = 0.5 + i * 2.5;
      const duration = 2.5 + Math.random() * 1.5;
      const startY = 10 + Math.random() * 40;
      
      star.style.cssText = `
        position: absolute; top: ${startY}%; right: -50px;
        width: ${size}px; height: ${size}px;
        background: var(--gold); border-radius: 50%;
        box-shadow: 0 0 8px var(--gold), 0 0 16px var(--gold);
        opacity: 0;
        animation: shootStar ${duration}s ease-in ${delay}s infinite;
      `;
      
      const tail = document.createElement('div');
      tail.style.cssText = `
        position: absolute; top: 50%; right: ${size}px;
        transform: translateY(-50%);
        width: ${50 + Math.random() * 40}px; height: 1px;
        background: linear-gradient(to left, var(--gold), transparent);
        opacity: 0.6;
      `;
      star.appendChild(tail);
      layer.appendChild(star);
    }
  }

  function showShootingStars(show) {
    const layer = document.getElementById('shootingStarLayer');
    if (!layer) return;
    layer.style.display = show ? 'block' : 'none';
    if (show) createShootingStars();
  }

  // ─── ادامه مطلب ───
  function saveLastRead(chIndex, titleIndex) {
    write(STORAGE_KEYS.lastRead, { chIndex, titleIndex, timestamp: Date.now() });
  }

  function updateContinueBanner() {
    const banner = document.getElementById('continueBanner');
    if (!banner) return;
    
    const last = read(STORAGE_KEYS.lastRead, null);
    const BOOK = window.BOOK;
    if (!last || !BOOK || !BOOK[last.chIndex] || !BOOK[last.chIndex].titles[last.titleIndex]) {
      banner.style.display = 'none';
      return;
    }
    
    banner.style.display = 'flex';
    const title = BOOK[last.chIndex].titles[last.titleIndex];
    const ch = BOOK[last.chIndex];
    document.getElementById('continueTitle').textContent = `فصل ${ch.num}: ${title}`;
    
    banner.onclick = () => {
      if (typeof window.openTitle === 'function') {
        window.openTitle(last.chIndex, last.titleIndex);
      }
    };
  }

  // ─── اشتراک‌گذاری ───
  function shareQuote() {
    const readerBody = document.querySelector('#readerBody');
    if (!readerBody) return;
    const title = document.querySelector('#readerTitle')?.textContent || '';
    const chName = document.querySelector('#readerChName')?.textContent || '';
    const firstP = readerBody.querySelector('.paragraph');
    let text = firstP ? firstP.textContent.trim() : '';
    if (text.length > 200) text = text.substring(0, 200) + '...';
    const shareText = `«${text}»\n\n— ${chName} · ${title}\n\n📖 در شبی ستاره باران — محمد قائدی بارده`;
    
    if (navigator.share) {
      navigator.share({ title: 'در شبی ستاره باران', text: shareText, url: window.location.href })
        .catch(() => fallbackCopy(shareText));
    } else {
      fallbackCopy(shareText);
    }
  }
  
  function fallbackCopy(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window.toast === 'function') window.toast('متن کپی شد');
    }).catch(() => {});
  }

  // ─── نوار آمار (پایین صفحه) ───
  function createStatsBar() {
    if (document.getElementById('statsCard')) return;

    const style = document.createElement('style');
    style.textContent = `
      .stats-card {
        position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
        background: rgba(19, 24, 34, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border-top: 1px solid var(--border); padding: 8px 4px;
        display: none; justify-content: center; align-items: center; gap: 12px;
        transition: all 0.3s ease;
      }
      .stats-card.show { display: flex; animation: fadeUp 0.4s ease; }
      .stat-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); }
      .stat-value { font-size: 13px; font-weight: 800; color: var(--gold); }
      .stat-label { font-size: 9px; }
      .stat-divider { width: 1px; height: 12px; background: var(--border); }
      body { padding-bottom: 45px; }
    `;
    document.head.appendChild(style);

    const statsCard = document.createElement('div');
    statsCard.className = 'stats-card';
    statsCard.id = 'statsCard';
    statsCard.innerHTML = `
      <div class="stat-item"><span class="stat-value" id="statWords">۰</span><span class="stat-label">کلمه</span></div>
      <div class="stat-divider"></div>
      <div class="stat-item"><span class="stat-value" id="statTime">۰</span><span class="stat-label">دقیقه</span></div>
      <div class="stat-divider"></div>
      <div class="stat-item"><span class="stat-value" id="statHighlights">۰</span><span class="stat-label">هایلایت</span></div>
      <div class="stat-divider"></div>
      <div class="stat-item"><span class="stat-value" id="statSections">۰</span><span class="stat-label">بخش</span></div>
    `;
    document.body.appendChild(statsCard);
  }

  function updateStatsValues() {
    const stats = read(STORAGE_KEYS.stats, { words: 0, seconds: 0, sections: [] });
    const card = document.getElementById('statsCard');
    if (!card) return;

    if ((!stats.words || stats.words === 0) && (!stats.seconds || stats.seconds === 0)) {
      card.classList.remove('show');
      return;
    }

    card.classList.add('show');
    document.getElementById('statWords').textContent = toFaNum(stats.words || 0);
    document.getElementById('statTime').textContent = toFaNum(Math.floor((stats.seconds || 0) / 60));
    document.getElementById('statHighlights').textContent = toFaNum(0); // چون هایلایت حذف شد
    document.getElementById('statSections').textContent = toFaNum((stats.sections || []).length);
  }

  let readingStartTime = null;

  function startReadingTimer() {
    const originalOpenTitle = window.openTitle;
    if (typeof originalOpenTitle === 'function' && !originalOpenTitle._statsHooked) {
      const patched = async function(chIndex, titleIndex) {
        const result = await originalOpenTitle.apply(this, arguments);
        readingStartTime = Date.now();
        
        setTimeout(() => {
          const stats = read(STORAGE_KEYS.stats, { words: 0, seconds: 0, sections: [], counted: [] });
          const key = `${chIndex}-${titleIndex}`;
          
          if (!stats.sections.includes(key)) stats.sections.push(key);
          
          const body = document.querySelector('#readerBody');
          if (body && !stats.counted.includes(key)) {
            const text = body.innerText || '';
            const words = text.trim().split(/\s+/).length;
            stats.words = (stats.words || 0) + words;
            stats.counted.push(key);
          }
          
          write(STORAGE_KEYS.stats, stats);
          updateStatsValues();
        }, 1000);
        
        return result;
      };
      patched._statsHooked = true;
      window.openTitle = patched;
    }

    const originalCloseReader = window.closeReader;
    if (typeof originalCloseReader === 'function' && !originalCloseReader._statsHooked) {
      const patched = function() {
        if (readingStartTime) {
          const elapsed = Math.floor((Date.now() - readingStartTime) / 1000);
          if (elapsed > 5 && elapsed < 3600) {
            const stats = read(STORAGE_KEYS.stats, { words: 0, seconds: 0, sections: [], counted: [] });
            stats.seconds = (stats.seconds || 0) + elapsed;
            write(STORAGE_KEYS.stats, stats);
            updateStatsValues();
          }
          readingStartTime = null;
        }
        return originalCloseReader.apply(this, arguments);
      };
      patched._statsHooked = true;
      window.closeReader = patched;
    }
  }

  // ─── هوک کردن به توابع اصلی ───
  function hookIntoApp() {
    const originalOpenTitle = window.openTitle;
    if (typeof originalOpenTitle === 'function' && !originalOpenTitle._uiHooked) {
      const patched = async function(chIndex, titleIndex) {
        const result = await originalOpenTitle.apply(this, arguments);
        
        const musicBtn = document.getElementById('musicBtn');
        const ttsBtn = document.getElementById('ttsBtn');
        if (musicBtn) musicBtn.style.display = 'grid';
        if (ttsBtn) ttsBtn.style.display = 'grid';
        
        showShootingStars(true);
        setTimeout(() => showShootingStars(false), 6000);
        
        const audio = document.getElementById('bgMusic');
        if (audio && !audio.paused && musicBtn) {
          musicBtn.style.color = 'var(--gold)';
          musicBtn.style.borderColor = 'var(--gold)';
          musicBtn.style.background = 'rgba(212,169,90,.15)';
        }
        
        return result;
      };
      patched._uiHooked = true;
      window.openTitle = patched;
    }
    
    const originalCloseReader = window.closeReader;
    if (typeof originalCloseReader === 'function' && !originalCloseReader._uiHooked) {
      const patched = function() {
        stopTTS();
        showShootingStars(false);
        const musicBtn = document.getElementById('musicBtn');
        const ttsBtn = document.getElementById('ttsBtn');
        if (musicBtn) musicBtn.style.display = 'none';
        if (ttsBtn) ttsBtn.style.display = 'none';
        const result = originalCloseReader.apply(this, arguments);
        setTimeout(updateContinueBanner, 300);
        return result;
      };
      patched._uiHooked = true;
      window.closeReader = patched;
    }
  }

  // ─── شروع به کار ───
  function init() {
    preventCopying();
    injectUI();
    createStatsBar();
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    
    setTimeout(() => {
      hookIntoApp();
      startReadingTimer();
      updateContinueBanner();
      updateStatsValues();
    }, 800);
    
    const musicOn = read(STORAGE_KEYS.musicOn, false);
    if (musicOn) {
      const audio = document.getElementById('bgMusic');
      if (audio) {
        const playOnFirstClick = () => {
          audio.play().then(() => {
            const btn = document.getElementById('musicBtn');
            if (btn) {
              btn.style.color = 'var(--gold)';
              btn.style.borderColor = 'var(--gold)';
              btn.style.background = 'rgba(212,169,90,.15)';
            }
          }).catch(() => {});
          document.removeEventListener('click', playOnFirstClick);
        };
        document.addEventListener('click', playOnFirstClick, { once: true });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
  // ─── جلوگیری از کپی و انتخاب متن ───
function preventCopying() {
  // تزریق استایل برای غیرقابل انتخاب کردن کل صفحه
  if (!document.getElementById('no-select-style')) {
    const style = document.createElement('style');
    style.id = 'no-select-style';
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // جلوگیری از کپی و برش
  document.addEventListener('copy', e => {
    e.preventDefault();
    if (typeof window.toast === 'function') window.toast('کپی کردن متن امکان‌پذیر نیست');
  });
  
  document.addEventListener('cut', e => {
    e.preventDefault();
  });

  // جلوگیری از کلیدهای میان‌بر کپی
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      if (typeof window.toast === 'function') window.toast('کپی کردن متن امکان‌پذیر نیست');
    }
  });

  // جلوگیری از راست کلیک در صفحه خواندن
  document.addEventListener('contextmenu', e => {
    if (document.querySelector('#readerPage')?.classList.contains('open')) {
      e.preventDefault();
    }
  });
}
})();