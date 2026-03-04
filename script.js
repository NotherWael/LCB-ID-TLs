// ---------- Page header content (update these to change all pages) ----------
const PAGE_HEADER = "LCB Identities - Untranslated Voicelines Translated to English & Unused Voicelines";
const LAST_UPDATED = "Updated Mar 5th, 2026 (UPDATING WEBSITE BEWARE FOR ERRORS FOR NOW!!!!) - Translations are Unofficial and can be wrong at times...<br>Bad Internet May Cause The Site to Load Really Slow... (Translated by NotherWael)";

// ---------- Determine base path (GitHub Pages subdirectory) ----------
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/LCB-ID-TLs/' : '/';
console.log('Base path:', BASE_PATH);

// ---------- Absolute paths for sounds ----------
const hoverSoundTemplate = new Audio(BASE_PATH + 'assets/UI_Hover.wav');
hoverSoundTemplate.volume = 0.7;
const clickSound = new Audio(BASE_PATH + 'assets/UI_Click.wav');
clickSound.volume = 0.8;
let canClickPlay = true;
const cache = new Map();

const gallery = document.querySelector('.image-gallery');
const galleryLinks = document.querySelectorAll('.image-gallery a');
const dynamicContent = document.getElementById('dynamic-content');
const currentBg = document.getElementById('current-bg');

// Build pageMap from the hidden gallery (paths must be absolute, e.g., "/LCB-ID-TLs/pages/Yi_Sang.html")
const pageMap = new Map();
galleryLinks.forEach(link => {
  const href = link.getAttribute('href');
  const bg = link.dataset.background;
  pageMap.set(href, { bg: bg });
  console.log('pageMap entry:', href, 'bg:', bg);
});

// ---------- Helper: ensure path starts with BASE_PATH ----------
function normalizePath(path) {
  if (!path) return path;
  if (path.startsWith(BASE_PATH)) return path;
  if (path.startsWith('/')) return BASE_PATH + path.substring(1);
  return BASE_PATH + path;
}

// ---------- Set background from current path ----------
function setCharacterBackgroundFromPath(path) {
  const entry = pageMap.get(normalizePath(path));
  if (entry && entry.bg) {
    changeBackground(entry.bg);
  } else {
    changeBackground(BASE_PATH + 'assets/background.png');
  }
}

// ---------- Transform relative paths inside a character gallery to absolute ----------
function makePathsAbsolute(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const processAttr = (element, attr) => {
    const oldUrl = element.getAttribute(attr);
    if (!oldUrl) return;
    if (oldUrl.startsWith('http') || oldUrl.startsWith('//') || oldUrl.startsWith('data:')) return;
    if (oldUrl.startsWith('/')) {
      element.setAttribute(attr, BASE_PATH + oldUrl.substring(1));
      return;
    }
    let newUrl = oldUrl;
    while (newUrl.startsWith('../')) newUrl = newUrl.substring(3);
    if (newUrl.startsWith('assets/')) newUrl = BASE_PATH + newUrl;
    element.setAttribute(attr, newUrl);
  };

  doc.querySelectorAll('img[src], audio[src], source[src]').forEach(el => processAttr(el, 'src'));
  doc.querySelectorAll('[data-background]').forEach(el => processAttr(el, 'data-background'));
  
  return doc.body.innerHTML;
}

// ---------- Resolve a URL (already absolute are left untouched) ----------
function resolveUrl(url) {
  if (!url || url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) return url;
  if (url.startsWith(BASE_PATH)) return url;
  if (url.startsWith('/')) return BASE_PATH + url.substring(1);
  let newUrl = url;
  while (newUrl.startsWith('../')) newUrl = newUrl.substring(3);
  if (newUrl.startsWith('assets/')) return BASE_PATH + newUrl;
  return url;
}

// ---------- UI helpers ----------
function changeBackground(bgUrl) {
  currentBg.style.backgroundImage = `url(${bgUrl})`;
}

function showMainGallery() {
  dynamicContent.innerHTML = '';
  dynamicContent.classList.remove('visible');
  gallery.style.display = 'grid';
  changeBackground(BASE_PATH + 'assets/background.png');
  history.replaceState(null, '', BASE_PATH);
}

function showContent(html) {
  gallery.style.display = 'none';
  dynamicContent.innerHTML = html;
  dynamicContent.classList.add('visible');
  // No need to preload here – it's handled separately

  const charGallery = dynamicContent.querySelector('.character-gallery');
  if (charGallery) attachVoicelineListeners();
}

function loadContent(absolutePath) {
  const normalizedPath = normalizePath(absolutePath);
  if (cache.has(normalizedPath)) {
    showContent(cache.get(normalizedPath));
    history.replaceState({ type: 'character_gallery', galleryHTML: cache.get(normalizedPath) }, '', normalizedPath);
    setCharacterBackgroundFromPath(normalizedPath);
  } else {
    fetch(normalizedPath)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const galleryDiv = doc.querySelector('.character-gallery');
        if (!galleryDiv) throw new Error('No character gallery found');
        const galleryHtml = galleryDiv.outerHTML;
        const transformedHtml = makePathsAbsolute(galleryHtml);
        cache.set(normalizedPath, transformedHtml);
        showContent(transformedHtml);
        history.replaceState({ type: 'character_gallery', galleryHTML: transformedHtml }, '', normalizedPath);
        setCharacterBackgroundFromPath(normalizedPath);
      })
      .catch(err => {
        dynamicContent.innerHTML = "<p>Error loading content.</p>";
        console.error(err);
      });
  }
}

// ---------- Compute fallback page class from current URL ----------
function getPageClassFromURL() {
  const path = window.location.pathname;
  const parts = path.split('/');
  const fileName = parts[parts.length - 1]; // e.g., "Faust.html"
  const name = fileName.replace('.html', ''); // e.g., "Faust"
  // Special handling for Ryōshū (already matches) and Don_Quixote (already matches)
  return name + '-page';
}

// Attach click listeners to voiceline images
function attachVoicelineListeners() {
  dynamicContent.querySelectorAll('.character-voice img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.preventDefault();
      if (canClickPlay) {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
        canClickPlay = false;
        setTimeout(() => { canClickPlay = true; }, 300);
      }

      const parentLink = img.closest('.character-voice');
      const currentGalleryHTML = dynamicContent.innerHTML;

      // Use data-page if present, otherwise fallback to URL-based class
      let pageClass = parentLink.dataset.page;
      if (!pageClass) {
        pageClass = getPageClassFromURL();
        console.log('Using fallback page class:', pageClass);
      } else {
        console.log('Using data-page attribute:', pageClass);
      }

      const detailState = {
        type: 'voiceline',
        characterGalleryHTML: currentGalleryHTML,
        imgSrc: img.src,
        imgAlt: img.alt,
        charTitle: parentLink.dataset.characterTitle,
        charIcon: resolveUrl(parentLink.dataset.characterIcon),
        translationLink: parentLink.dataset.translationLink,
        voicelines: parentLink.dataset.voiceline,
        translations: parentLink.dataset.translation,
        audios: parentLink.dataset.audio,
        notes: parentLink.dataset.notes,
        background: resolveUrl(parentLink.dataset.background),
        pageClass: pageClass
      };

      history.pushState(detailState, '', normalizePath(window.location.pathname));
      showVoicelineDetailFromData(detailState);
    });
  });
}

// Rebuild voiceline detail view
function showVoicelineDetailFromData(data) {
  const voicelines = (data.voicelines || "").split('|').map(v => v.trim());
  const translations = (data.translations || "").split('|').map(v => v.trim());
  const audios = (data.audios || "").split('|').map(v => v.trim());
  const notes = (data.notes || "").split('|').map(v => v.trim());
  const pageClass = data.pageClass || '';

  let rows = [];
  for (let i = 0; i < translations.length; i++) {
    const audioEntry = audios[i] || '';
    const [mainSection, unusedSection] = audioEntry.split(';').map(s => s.trim());
    
    const mainAudio = mainSection ? mainSection.split(',').filter(url => url.trim()).map(url => resolveUrl(url)) : [];
    const mainElements = mainAudio.map(url => `<audio controls class="audio-stack"><source src="${url}"></audio>`).join('');

    const unusedAudio = unusedSection ? unusedSection.split(',').filter(url => url.trim()).map(url => resolveUrl(url)) : [];
    const unusedElements = unusedAudio.map(url => `<audio controls class="audio-stack unused"><source src="${url}"></audio>`).join('');

    let audioColumn = '—';
    if (mainElements || unusedElements) {
      audioColumn = `${mainElements}${unusedElements ? `<div class="unused-section">UNUSED:${unusedElements}</div>` : ''}`;
    }

    rows.push(`
      <tr>
        <td>${voicelines[i] || '—'}</td>
        <td>${translations[i] || '—'}</td>
        <td>${audioColumn}</td>
        <td>${notes[i] || '—'}</td>
      </tr>
    `);
  }

  if (data.background) changeBackground(data.background);

  const detailHTML = `
    <div class="voiceline-detail ${pageClass}">
      <a href="${data.translationLink || '#'}" class="translation-link" target="_blank">Link to Already Translated Voicelines</a>
      <div class="detail-header">
        <img src="${data.charIcon}" alt="${data.charTitle} Icon">
        <h2>${data.charTitle}</h2>
      </div>
      <img src="${data.imgSrc}" alt="${data.imgAlt}" class="detail-image">
      <div class="spreadsheet">
        <table>
          <thead><tr><th>Voiceline</th><th>Translation</th><th>Audio</th><th>Notes</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    </div>
  `;
  dynamicContent.innerHTML = detailHTML;
}

// ---------- History handling ----------
window.addEventListener('popstate', (event) => {
  const path = window.location.pathname;
  const state = event.state;

  if (!state) { showMainGallery(); return; }

  if (state.type === 'voiceline') {
    showVoicelineDetailFromData(state);
    gallery.style.display = 'none';
    return;
  }

  if (state.type === 'character_gallery') {
    showContent(state.galleryHTML);
    setCharacterBackgroundFromPath(path);
    return;
  }

  // Fallback
  const normalizedPath = normalizePath(path);
  const entry = pageMap.get(normalizedPath);
  if (entry) {
    changeBackground(entry.bg);
    loadContent(normalizedPath);
  } else {
    showMainGallery();
  }
});

// ---------- Intercept character link clicks ----------
galleryLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    if (canClickPlay) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
      canClickPlay = false;
      setTimeout(() => { canClickPlay = true; }, 300);
    }

    const href = link.getAttribute('href');
    const bgImage = link.dataset.background;

    if (bgImage) changeBackground(bgImage);
    history.pushState({ type: 'character' }, '', href);
    loadContent(href);
  });

  const img = link.querySelector('img');
  if (img) {
    img.addEventListener('mouseenter', () => {
      const hoverSound = hoverSoundTemplate.cloneNode();
      hoverSound.play().catch(() => {});
    });
  }
});

// ---------- Initial load ----------
function loadInitialPage() {
  const path = window.location.pathname;
  const normalizedPath = normalizePath(path);

  if (history.state) {
    const state = history.state;
    if (state.type === 'voiceline') {
      showVoicelineDetailFromData(state);
      gallery.style.display = 'none';
      return;
    }
    if (state.type === 'character_gallery') {
      showContent(state.galleryHTML);
      setCharacterBackgroundFromPath(normalizedPath);
      return;
    }
  }

  if (dynamicContent.innerHTML.trim() !== '') {
    const existingHtml = dynamicContent.innerHTML;
    const transformed = makePathsAbsolute(existingHtml);
    dynamicContent.innerHTML = transformed;
    gallery.style.display = 'none';
    dynamicContent.classList.add('visible');
    attachVoicelineListeners();
    history.replaceState({ type: 'character_gallery', galleryHTML: transformed }, '', normalizedPath);
    setCharacterBackgroundFromPath(normalizedPath);
    return;
  }

  if (normalizedPath === BASE_PATH || normalizedPath === BASE_PATH + 'index.html') {
    showMainGallery();
  } else {
    const entry = pageMap.get(normalizedPath);
    if (entry) {
      changeBackground(entry.bg);
      history.replaceState({ type: 'character' }, '', normalizedPath);
      loadContent(normalizedPath);
    } else {
      showMainGallery();
    }
  }
}

// ---------- Preload assets (absolute paths only, no 404s) ----------
function preloadMainGalleryIcons() {
  document.querySelectorAll('.image-gallery a').forEach(link => {
    const bg = link.dataset.background; // absolute
    new Image().src = bg;
    const icon = link.querySelector('img').src; // absolute
    new Image().src = icon;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const headerEl = document.getElementById('page-header');
  const updatedEl = document.getElementById('last-updated');
  if (headerEl) headerEl.innerHTML = PAGE_HEADER;
  if (updatedEl) updatedEl.innerHTML = LAST_UPDATED;

  preloadMainGalleryIcons();
  loadInitialPage();
});

// Dynamic hover for voicelines
dynamicContent.addEventListener('mouseenter', (e) => {
  const galleryImg = e.target.closest('.character-gallery img');
  if (galleryImg) {
    const hoverSound = hoverSoundTemplate.cloneNode();
    hoverSound.play().catch(() => {});
  }
}, true);