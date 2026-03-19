// ---------- Page header content (update these to change all pages) ----------
const PAGE_HEADER = "LCB Identities - Untranslated Voicelines Translated to English & Unused Voicelines";
const LAST_UPDATED = "Updated Mar 19th, 2026 (Fixed FA&S Ryoshu Lines, Added LCE E.G.O::AEDD Gregor!) - Translations are Unofficial and can be wrong at times...<br>Bad Internet May Cause The Site to Load Really Slow... (Translated by NotherWael)";

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

// Store the last character gallery HTML for back navigation from detail
let lastCharacterGalleryHTML = null;

const gallery = document.querySelector('.image-gallery');
const galleryLinks = document.querySelectorAll('.image-gallery a');
const dynamicContent = document.getElementById('dynamic-content');
const backButton = document.getElementById('back-button');
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

// ---------- Preload all character backgrounds and main background on page load ----------
function preloadAllBackgrounds() {
  // Preload character backgrounds
  galleryLinks.forEach(link => {
    const bg = link.dataset.background;
    if (bg) {
      const img = new Image();
      img.src = bg;
    }
  });
  // Preload main background
  const mainBg = new Image();
  mainBg.onload = () => console.log('Main background loaded successfully');
  mainBg.onerror = () => console.error('Failed to load main background:', BASE_PATH + 'assets/background.png');
  mainBg.src = BASE_PATH + 'assets/background.png';
}

// ---------- Set background from current path, with fallback construction ----------
function setCharacterBackgroundFromPath(path) {
  const normalized = normalizePath(path);
  let entry = pageMap.get(normalized);
  let newBgUrl;
  if (!entry) {
    // Fallback: construct background URL from the filename
    const parts = normalized.split('/');
    const fileName = parts[parts.length - 1]; // e.g., "Faust.html"
    const charName = fileName.replace('.html', ''); // e.g., "Faust"
    newBgUrl = BASE_PATH + 'assets/' + charName + '/LCB_' + charName + '.png';
    console.log('Using fallback background for', charName, newBgUrl);
  } else if (entry && entry.bg) {
    newBgUrl = entry.bg;
  } else {
    newBgUrl = BASE_PATH + 'assets/background.png';
  }
  changeBackground(newBgUrl);
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
  console.log('Changing background to:', bgUrl);
  currentBg.style.backgroundImage = `url(${bgUrl})`;
}

function showMainGallery() {
  dynamicContent.innerHTML = '';
  dynamicContent.classList.remove('visible');
  gallery.style.display = 'grid';
  backButton.style.display = 'none';
  changeBackground(BASE_PATH + 'assets/background.png');
  history.replaceState(null, '', BASE_PATH);
}

function showContent(html) {
  gallery.style.display = 'none';
  dynamicContent.innerHTML = html;
  dynamicContent.classList.add('visible');
  backButton.style.display = 'block';
  // If this is a character gallery (not a voiceline detail), update lastCharacterGalleryHTML
  if (html.includes('character-gallery') && !html.includes('voiceline-detail')) {
    lastCharacterGalleryHTML = html;
    console.log('Stored character gallery HTML');
  }
  attachImageHoverSounds(); // for dynamic content images
  const charGallery = dynamicContent.querySelector('.character-gallery');
  if (charGallery) attachVoicelineListeners();
}

// Attach hover sounds to all images in dynamic content
function attachImageHoverSounds() {
  dynamicContent.querySelectorAll('img').forEach(img => {
    img.removeEventListener('mouseenter', hoverHandler);
    img.addEventListener('mouseenter', hoverHandler);
  });
}

// Hover handler for all images
function hoverHandler(e) {
  const hoverSound = hoverSoundTemplate.cloneNode();
  hoverSound.play().catch(() => {});
}

// Attach hover sounds to main gallery images (static)
function attachMainGalleryHoverSounds() {
  document.querySelectorAll('.image-gallery img').forEach(img => {
    img.removeEventListener('mouseenter', hoverHandler);
    img.addEventListener('mouseenter', hoverHandler);
  });
}

// Load a character page using its absolute path
function loadContent(absolutePath) {
  const normalizedPath = normalizePath(absolutePath);
  console.log('loadContent, normalizedPath:', normalizedPath);
  if (cache.has(normalizedPath)) {
    showContent(cache.get(normalizedPath));
    history.replaceState({ type: 'character_gallery', galleryHTML: cache.get(normalizedPath) }, '', normalizedPath);
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
  const name = fileName.replace('.html', '');
  return name + '-page';
}

// Attach click listeners to voiceline images inside the gallery
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

  console.log('Rendering voiceline detail with class:', pageClass);

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

  if (data.background) {
    changeBackground(data.background);
  }

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
  attachImageHoverSounds();
}

// ---------- Back button click handler: up‑one‑level navigation ----------
backButton.addEventListener('click', () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(console.warn);

  if (dynamicContent.querySelector('.voiceline-detail')) {
    // Currently in a voiceline detail: go back to the character gallery
    console.log('Back: from detail to gallery');
    if (lastCharacterGalleryHTML) {
      showContent(lastCharacterGalleryHTML);
      // Update background from the current URL (which hasn't changed)
      setCharacterBackgroundFromPath(window.location.pathname);
    } else {
      console.log('No stored gallery, going to main index');
      showMainGallery();
    }
  } else {
    // On a character gallery or main gallery: go to main index
    console.log('Back: from gallery to main index');
    showMainGallery();
  }
});

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
    backButton.style.display = 'block';
    return;
  }

  if (state.type === 'character_gallery') {
    showContent(state.galleryHTML);
    setCharacterBackgroundFromPath(path);
    return;
  }

  // Fallback for old character state (should not happen)
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

    // Set background immediately (images are preloaded, so it's instant)
    if (bgImage) changeBackground(bgImage);

    history.pushState({ type: 'character' }, '', href);
    loadContent(href);
  });
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
      backButton.style.display = 'block';
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
    backButton.style.display = 'block';
    attachImageHoverSounds();
    attachVoicelineListeners();
    // If this is a character gallery, store it
    if (transformed.includes('character-gallery') && !transformed.includes('voiceline-detail')) {
      lastCharacterGalleryHTML = transformed;
      console.log('Stored initial character gallery');
    }
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
      backButton.style.display = 'block';
      history.replaceState({ type: 'character' }, '', normalizedPath);
      loadContent(normalizedPath);
    } else {
      // Fallback: construct background from path
      setCharacterBackgroundFromPath(normalizedPath);
      backButton.style.display = 'block';
      history.replaceState({ type: 'character' }, '', normalizedPath);
      loadContent(normalizedPath);
    }
  }
}

// ---------- Preload assets (absolute paths only) ----------
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

  preloadAllBackgrounds(); // Preload all character backgrounds and main background
  preloadMainGalleryIcons();
  attachMainGalleryHoverSounds(); // Add hover sounds to main gallery
  loadInitialPage();
});