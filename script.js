// ---------- Page header content (update these to change all pages) ----------
const PAGE_HEADER = "LCB Identities - Untranslated Voicelines Translated to English & Unused Voicelines";
const LAST_UPDATED = "Updated Mar 4th, 2026 (UPDATING WEBSITE BEWARE FOR ERRORS FOR NOW!!!!) - Translations are Unofficial and can be wrong at times...<br>Bad Internet May Cause The Site to Load Really Slow... (Translated by NotherWael)";

// ---------- Determine base path for assets (for internal use) ----------
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/LCB-ID-TLs/' : '/';
console.log('Base path:', BASE_PATH);

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
  const href = link.getAttribute('href'); // full path like "/LCB-ID-TLs/pages/Yi_Sang.html"
  const bg = link.dataset.background;     // full path too
  pageMap.set(href, { bg: bg });
});
console.log('pageMap keys:', Array.from(pageMap.keys()));

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

// ---------- Helper: resolve a relative URL using BASE_PATH ----------
function resolveUrl(url) {
  if (!url || url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return BASE_PATH + url.substring(1);
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

function loadContent(absolutePath) {
  if (cache.has(absolutePath)) {
    showContent(cache.get(absolutePath));
  } else {
    fetch(absolutePath)
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const galleryDiv = doc.querySelector('.character-gallery');
        if (!galleryDiv) throw new Error('No character gallery found');
        const galleryHtml = galleryDiv.outerHTML;
        const transformedHtml = makePathsAbsolute(galleryHtml);
        cache.set(absolutePath, transformedHtml);
        showContent(transformedHtml);
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
      const currentGalleryHTML = dynamicContent.innerHTML; // save for back navigation

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
        background: resolveUrl(parentLink.dataset.background)
      };

      history.pushState(detailState, '', location.pathname);
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

  if (data.background) changeBackground(data.background);

  const detailHTML = `
    <div class="voiceline-detail">
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
}

// ---------- History handling with logging and fallback ----------
window.addEventListener('popstate', (event) => {
  const path = window.location.pathname;
  const state = event.state;
  console.log('popstate - path:', path, 'state:', state);

  // If we have a voiceline state, restore it
  if (state && state.type === 'voiceline') {
    console.log('Restoring voiceline detail');
    showVoicelineDetailFromData(state);
    gallery.style.display = 'none';
    return;
  }

  // If we have a state with gallery HTML, restore it (back from voiceline)
  if (state && state.characterGalleryHTML) {
    console.log('Restoring character gallery from saved HTML');
    showContent(state.characterGalleryHTML);
    return;
  }

  // Check if we are at the main gallery
  if (path === BASE_PATH || path === BASE_PATH + 'index.html') {
    console.log('Going to main gallery');
    showMainGallery();
    return;
  }

  // Try to find the character page in pageMap
  let entry = pageMap.get(path);
  
  // Fallback: if path starts with /pages/ but missing repo, prepend BASE_PATH
  if (!entry && path.startsWith('/pages/')) {
    const fullPath = BASE_PATH + path.substring(1);
    console.log('Path not found, trying with BASE_PATH:', fullPath);
    entry = pageMap.get(fullPath);
  }

  if (entry) {
    console.log('Loading character page from map:', path);
    changeBackground(entry.bg);
    loadContent(path);
  } else {
    console.warn('Unknown page, going to main gallery. Path not in pageMap:', path);
    showMainGallery();
    history.replaceState(null, '', BASE_PATH);
  }
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

    const href = link.getAttribute('href'); // full path
    const bgImage = link.dataset.background; // full path

    console.log('Navigating to:', href);

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
  console.log('loadInitialPage - path:', path);

  if (history.state && history.state.type === 'voiceline') {
    showVoicelineDetailFromData(history.state);
    gallery.style.display = 'none';
    return;
  }

  if (dynamicContent.innerHTML.trim() !== '') {
    console.log('Initial content already present, transforming paths');
    const existingHtml = dynamicContent.innerHTML;
    const transformed = makePathsAbsolute(existingHtml);
    dynamicContent.innerHTML = transformed;
    gallery.style.display = 'none';
    dynamicContent.classList.add('visible');
    attachVoicelineListeners();
    return;
  }

  if (path === BASE_PATH || path === BASE_PATH + 'index.html') {
    showMainGallery();
  } else {
    let entry = pageMap.get(path);
    if (!entry && path.startsWith('/pages/')) {
      const fullPath = BASE_PATH + path.substring(1);
      entry = pageMap.get(fullPath);
    }
    if (entry) {
      changeBackground(entry.bg);
      loadContent(path);
    } else {
      // If still not found, default to main gallery
      showMainGallery();
    }
  }
}

// ---------- Preload assets ----------
function preloadAllGalleryAssets() {
  document.querySelectorAll('.image-gallery a').forEach(link => {
    new Image().src = link.dataset.background;
    new Image().src = link.querySelector('img').src;
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
    new Image().src = link.dataset.background;
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