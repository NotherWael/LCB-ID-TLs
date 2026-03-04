// ---------- Page header content (update these to change all pages) ----------
const PAGE_HEADER = "LCB Identities - Untranslated Voicelines Translated to English & Unused Voicelines";
const LAST_UPDATED = "Updated Mar 5th, 2026 (UPDATING WEBSITE BEWARE FOR ERRORS FOR NOW!!!!) - Translations are Unofficial and can be wrong at times...<br>Bad Internet May Cause The Site to Load Really Slow... (Translated by NotherWael)";

// ---------- Determine base path for assets (for internal use) ----------
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/LCB-ID-TLs/' : '/';
console.log('Base path:', BASE_PATH);

// ---------- Helper to normalize a path: ensure it starts with BASE_PATH and has no double slashes ----------
function normalizePath(path) {
  if (!path) return path;
  // Remove any duplicate BASE_PATH
  if (path.startsWith(BASE_PATH + BASE_PATH)) {
    path = path.substring(BASE_PATH.length);
  }
  // If it starts with BASE_PATH, return it
  if (path.startsWith(BASE_PATH)) {
    return path;
  }
  // If it starts with '/', prepend BASE_PATH (removing the leading slash)
  if (path.startsWith('/')) {
    return BASE_PATH + path.substring(1);
  }
  // Otherwise, assume it's relative and resolve against BASE_PATH
  return BASE_PATH + path;
}

// ---------- Determine base path for sounds ----------
const getAssetPath = (relativePath) => {
  if (window.location.pathname.includes('/pages/')) {
    return '../' + relativePath;
  } else {
    return relativePath;
  }
};

const hoverSoundTemplate = new Audio(getAssetPath('assets/UI_Hover.wav'));
hoverSoundTemplate.volume = 0.7;
const clickSound = new Audio(getAssetPath('assets/UI_Click.wav'));
clickSound.volume = 0.8;
let canClickPlay = true;
const cache = new Map();

const gallery = document.querySelector('.image-gallery');
const galleryLinks = document.querySelectorAll('.image-gallery a');
const dynamicContent = document.getElementById('dynamic-content');
const currentBg = document.getElementById('current-bg');

// Build pageMap from the hidden gallery in the layout
const pageMap = new Map();
galleryLinks.forEach(link => {
  let href = link.getAttribute('href'); // should be full path like "/LCB-ID-TLs/pages/Yi_Sang.html"
  href = normalizePath(href);
  const bg = link.dataset.background;
  const bgNormalized = normalizePath(bg);
  pageMap.set(href, { bg: bgNormalized });
  console.log('pageMap entry:', href, 'bg:', bgNormalized);
});

// ---------- Helper: set background based on current character path ----------
function setCharacterBackgroundFromPath(path) {
  const normalizedPath = normalizePath(path);
  const entry = pageMap.get(normalizedPath);
  if (entry && entry.bg) {
    changeBackground(entry.bg);
  } else {
    // Fallback to default background
    changeBackground(getAssetPath('assets/background.png'));
  }
}

// ---------- Helper: make all asset paths absolute using BASE_PATH ----------
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
    while (newUrl.startsWith('../')) {
      newUrl = newUrl.substring(3);
    }
    if (newUrl.startsWith('assets/')) {
      newUrl = BASE_PATH + newUrl;
    }
    element.setAttribute(attr, newUrl);
  };

  doc.querySelectorAll('img[src], audio[src], source[src]').forEach(el => processAttr(el, 'src'));
  doc.querySelectorAll('[data-background]').forEach(el => processAttr(el, 'data-background'));
  
  return doc.body.innerHTML;
}

// ---------- Helper: resolve a relative URL using BASE_PATH, but leave already-absolute URLs untouched ----------
function resolveUrl(url) {
  if (!url || url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) return url;
  // If it already starts with BASE_PATH, it's already absolute – return as is
  if (url.startsWith(BASE_PATH)) {
    return url;
  }
  if (url.startsWith('/')) {
    return BASE_PATH + url.substring(1);
  }
  let newUrl = url;
  while (newUrl.startsWith('../')) {
    newUrl = newUrl.substring(3);
  }
  if (newUrl.startsWith('assets/')) {
    return BASE_PATH + newUrl;
  }
  return url;
}

// ---------- UI helpers ----------
function changeBackground(bgUrl) {
  console.log('Changing background to:', bgUrl);
  currentBg.style.backgroundImage = `url(${bgUrl})`;
}

function showMainGallery() {
  dynamicContent.innerHTML = '';
  dynamicContent.classList.remove('visible');
  gallery.style.display = 'grid';
  changeBackground(getAssetPath('assets/background.png'));
  history.replaceState(null, '', BASE_PATH);
}

function showContent(html) {
  gallery.style.display = 'none';
  dynamicContent.innerHTML = html;
  dynamicContent.classList.add('visible');
  preloadAllGalleryAssets();

  const charGallery = dynamicContent.querySelector('.character-gallery');
  if (charGallery) {
    attachVoicelineListeners();
  }
}

// Load a character page using its absolute path
function loadContent(absolutePath) {
  console.log('loadContent called with:', absolutePath);
  const normalizedPath = normalizePath(absolutePath);
  console.log('normalizedPath:', normalizedPath);
  if (cache.has(normalizedPath)) {
    const galleryHtml = cache.get(normalizedPath);
    showContent(galleryHtml);
    // Replace current history state with one that contains the gallery HTML for back navigation
    history.replaceState({ type: 'character_gallery', galleryHTML: galleryHtml }, '', normalizedPath);
    // Set the main character background
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
        // Set the main character background
        setCharacterBackgroundFromPath(normalizedPath);
      })
      .catch(err => {
        dynamicContent.innerHTML = "<p>Error loading content.</p>";
        console.error(err);
      });
  }
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

      console.log('Background attribute:', parentLink.dataset.background);
      console.log('data-page attribute:', parentLink.dataset.page); // Critical for coloring

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
        pageClass: parentLink.dataset.page || '' // Add page class for coloring
      };

      console.log('Detail background after resolveUrl:', detailState.background);
      console.log('Page class to apply:', detailState.pageClass);

      const currentPath = normalizePath(window.location.pathname);
      history.pushState(detailState, '', currentPath);
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
  const pageClass = data.pageClass || ''; // e.g., "Sinclair-page"

  console.log('Rendering voiceline detail with pageClass:', pageClass);

  let rows = [];
  for (let i = 0; i < translations.length; i++) {
    const audioEntry = audios[i] || '';
    const [mainSection, unusedSection] = audioEntry.split(';').map(s => s.trim());
    
    const mainAudio = mainSection ? mainSection.split(',').filter(url => url.trim()).map(url => resolveUrl(url)) : [];
    const mainElements = mainAudio.map(url => 
      `<audio controls class="audio-stack"><source src="${url}"></audio>`
    ).join('');

    const unusedAudio = unusedSection ? unusedSection.split(',').filter(url => url.trim()).map(url => resolveUrl(url)) : [];
    const unusedElements = unusedAudio.map(url => 
      `<audio controls class="audio-stack unused"><source src="${url}"></audio>`
    ).join('');

    let audioColumn = '—';
    if (mainElements || unusedElements) {
      audioColumn = `
        ${mainElements}
        ${unusedElements ? `<div class="unused-section">UNUSED:${unusedElements}</div>` : ''}
      `;
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

  if (data.background) {
    console.log('Setting background from voiceline detail:', data.background);
    changeBackground(data.background);
  }

  const detailHTML = `
    <div class="voiceline-detail ${pageClass}">
      <a href="${data.translationLink || '#'}" class="translation-link" target="_blank">
        Link to Already Translated Voicelines
      </a>
      <div class="detail-header">
        <img src="${data.charIcon}" alt="${data.charTitle} Icon">
        <h2>${data.charTitle}</h2>
      </div>
      <img src="${data.imgSrc}" alt="${data.imgAlt}" class="detail-image">
      <div class="spreadsheet">
        <table>
          <thead>
            <tr><th>Voiceline</th><th>Translation</th><th>Audio</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    </div>
  `;
  dynamicContent.innerHTML = detailHTML;

  // After inserting, log the resulting element's class list to verify
  const detailEl = document.querySelector('.voiceline-detail');
  console.log('Detail element classes after render:', detailEl ? detailEl.className : 'not found');
}

// ---------- History handling ----------
window.addEventListener('popstate', (event) => {
  const path = window.location.pathname;
  const state = event.state;
  console.log('popstate - path:', path, 'state:', state);

  if (!state) {
    showMainGallery();
    return;
  }

  if (state.type === 'voiceline') {
    showVoicelineDetailFromData(state);
    gallery.style.display = 'none';
    return;
  }

  if (state.type === 'character_gallery') {
    console.log('Restoring character gallery from state');
    showContent(state.galleryHTML);
    // Reset background to the character's main background
    setCharacterBackgroundFromPath(path);
    return;
  }

  // Fallback for old character state (should not happen)
  if (state.type === 'character') {
    const normalizedPath = normalizePath(path);
    const entry = pageMap.get(normalizedPath);
    if (entry) {
      changeBackground(entry.bg);
      loadContent(normalizedPath);
    } else {
      console.warn('Character page not found, going to main gallery');
      showMainGallery();
    }
    return;
  }

  showMainGallery();
});

// ---------- Intercept character link clicks ----------
galleryLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Gallery link clicked');

    if (canClickPlay) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
      canClickPlay = false;
      setTimeout(() => { canClickPlay = true; }, 300);
    }

    let href = link.getAttribute('href');
    const bgImage = link.dataset.background;

    const normalizedHref = normalizePath(href);
    const normalizedBg = normalizePath(bgImage);

    console.log('Navigating to:', normalizedHref);

    if (normalizedBg) changeBackground(normalizedBg);
    history.pushState({ type: 'character' }, '', normalizedHref);
    loadContent(normalizedHref);
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
  console.log('loadInitialPage - original path:', path, 'normalized:', normalizedPath);

  if (history.state) {
    const state = history.state;
    if (state.type === 'voiceline') {
      showVoicelineDetailFromData(state);
      gallery.style.display = 'none';
      return;
    }
    if (state.type === 'character_gallery') {
      showContent(state.galleryHTML);
      // Set the main character background
      setCharacterBackgroundFromPath(normalizedPath);
      return;
    }
  }

  if (dynamicContent.innerHTML.trim() !== '') {
    console.log('Initial content already present, transforming paths');
    const existingHtml = dynamicContent.innerHTML;
    const transformed = makePathsAbsolute(existingHtml);
    dynamicContent.innerHTML = transformed;
    gallery.style.display = 'none';
    dynamicContent.classList.add('visible');
    attachVoicelineListeners();
    history.replaceState({ type: 'character_gallery', galleryHTML: transformed }, '', normalizedPath);
    // Set the main character background (inline style already present, but just in case)
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
      console.warn('Unknown page, going to main gallery. Path not in pageMap:', normalizedPath);
      showMainGallery();
    }
  }
}

// ---------- Preload assets (fixed to avoid 404s) ----------
function preloadAllGalleryAssets() {
  document.querySelectorAll('.image-gallery a').forEach(link => {
    // Use data-background for background images (already normalized)
    const bg = normalizePath(link.dataset.background);
    new Image().src = bg;
    // For the main character icons, use the normalized data-background or fallback to src
    const iconImg = link.querySelector('img');
    if (iconImg) {
      // Use the src attribute directly – it should be absolute
      const iconSrc = iconImg.src;
      console.log('Preloading icon:', iconSrc);
      new Image().src = iconSrc;
    }
  });

  const characterPages = Array.from(pageMap.keys());
  characterPages.forEach(page => {
    if (!cache.has(page)) {
      fetch(page)
        .then(r => r.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const galleryDiv = doc.querySelector('.character-gallery');
          if (!galleryDiv) return;
          const galleryHtml = galleryDiv.outerHTML;
          const transformed = makePathsAbsolute(galleryHtml);
          cache.set(page, transformed);
          const imgParser = new DOMParser();
          const imgDoc = imgParser.parseFromString(transformed, 'text/html');
          imgDoc.querySelectorAll('.character-voice img, [data-background]').forEach(el => {
            if (el.src) new Image().src = el.src;
            if (el.dataset.background) new Image().src = resolveUrl(el.dataset.background);
          });
        })
        .catch(() => {});
    } else {
      const transformed = cache.get(page);
      const parser = new DOMParser();
      const doc = parser.parseFromString(transformed, 'text/html');
      doc.querySelectorAll('.character-voice img, [data-background]').forEach(el => {
        if (el.src) new Image().src = el.src;
        if (el.dataset.background) new Image().src = resolveUrl(el.dataset.background);
      });
    }
  });
}

function preloadCharacterBackgrounds() {
  document.querySelectorAll('[data-background]').forEach(link => {
    const url = normalizePath(link.dataset.background);
    new Image().src = url;
  });
}

function preloadCriticalAssets() {
  const assets = [
    'assets/Yi_Sang.png', 'assets/Faust.png', 'assets/Don_Quixote.png',
    'assets/Ryōshū.png', 'assets/Meursault.png', 'assets/Hong_Lu.png',
    'assets/Heathcliff.png', 'assets/Ishmael.png', 'assets/Rodion.png',
    'assets/Sinclair.png', 'assets/Outis.png', 'assets/Gregor.png'
  ];
  assets.forEach(src => {
    new Image().src = getAssetPath(src);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const headerEl = document.getElementById('page-header');
  const updatedEl = document.getElementById('last-updated');
  if (headerEl) headerEl.innerHTML = PAGE_HEADER;
  if (updatedEl) updatedEl.innerHTML = LAST_UPDATED;

  preloadCriticalAssets();
  preloadCharacterBackgrounds();
  preloadAllGalleryAssets();
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/LCB-ID-TLs/sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}