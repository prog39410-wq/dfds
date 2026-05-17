(function () {
    'use strict';

    const DATA = window.DATA || [];
    const CFG = window.CONFIG || {};

    // Aplicar configuración
    (function applyConfig() {
        const name = CFG.appName || 'ANiGo';
        document.title = name;

        // Header & Sidebar: logo imagen o texto
        const logos = document.querySelectorAll('.logo');
        logos.forEach(logoEl => {
            if (CFG.headerLogoUrl) {
                logoEl.innerHTML = `<img src="${CFG.headerLogoUrl}" alt="${name}" style="height:32px;object-fit:contain;vertical-align:middle">`;
            } else {
                logoEl.textContent = name;
            }
        });

        // Banner hero
        if (CFG.bannerUrl) {
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.classList.add('lazy-bg');
                hero.dataset.bg = `url('${CFG.bannerUrl}')`;
                hero.style.backgroundSize = 'cover';
                hero.style.backgroundPosition = 'center';
            }
        }

        // Hero configurable
        const h = CFG.hero || {};
        const heroBg = document.getElementById('hero-bg');
        if (heroBg) {
            if (h.backgroundUrl) {
                heroBg.classList.add('lazy-bg');
                heroBg.dataset.bg = `url('${h.backgroundUrl}')`;
            }
        }
        const heroBadgeEl = document.getElementById('hero-badge');
        if (heroBadgeEl) {
            if (h.badge) { heroBadgeEl.textContent = h.badge; heroBadgeEl.style.display = ''; }
            else heroBadgeEl.style.display = 'none';
        }
        const heroTitleEl = document.getElementById('hero-title');
        if (heroTitleEl) heroTitleEl.textContent = h.title || '';
        const heroSubEl = document.getElementById('hero-subtitle');
        if (heroSubEl) heroSubEl.textContent = h.subtitle || '';
        const heroCta = document.getElementById('hero-cta-primary');
        const heroCtaLabel = document.getElementById('hero-cta-label');
        if (heroCtaLabel) heroCtaLabel.textContent = h.ctaLabel || 'Explorar';
        if (heroCta) {
            heroCta.dataset.heroNav = h.ctaNav || 'search';
            heroCta.style.display = h.ctaLabel ? '' : 'none';
        }
        const heroCta2 = document.getElementById('hero-cta-secondary');
        const heroCta2Label = document.getElementById('hero-cta2-label');
        if (heroCta2Label) heroCta2Label.textContent = h.cta2Label || '';
        if (heroCta2) {
            heroCta2.dataset.heroNav = h.cta2Nav || 'categories';
            heroCta2.style.display = h.cta2Label ? '' : 'none';
        }

        // Banner de perfil
        const profileBanner = document.getElementById('profile-banner');
        if (profileBanner) {
            if (CFG.profileBannerUrl) {
                profileBanner.classList.add('lazy-bg');
                profileBanner.dataset.bg = `url('${CFG.profileBannerUrl}')`;
            }
        }

        // Foto y nombre de perfil
        const avatar = document.getElementById('profile-avatar');
        if (avatar) {
            if (CFG.profilePhotoUrl) {
                avatar.innerHTML = `<img src="${CFG.profilePhotoUrl}" alt="perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            } else {
                avatar.textContent = (CFG.profileName || name).charAt(0).toUpperCase();
            }
        }
        const profileNameEl = document.querySelector('.profile-hero h2');
        if (profileNameEl) profileNameEl.textContent = CFG.profileName || 'Otaku User';

        const memberLabel = document.getElementById('profile-member-label');
        if (memberLabel) memberLabel.textContent = `Miembro de ${name}`;
    })();
    const FAVS_KEY = 'favorites_v1';
    const WATCH_STATUS_KEY = 'watch_status_v1';
    let favs = JSON.parse(localStorage.getItem(FAVS_KEY) || '[]');
    // watchStatus: { [id]: 'Viendo' | 'Completado' | 'Pendiente' }
    let watchStatus = JSON.parse(localStorage.getItem(WATCH_STATUS_KEY) || '{}');
    const APP_STATE_KEY = 'wolfanime_last_state';
    let state = { view: null, prev: null, detail: null, catFilter: null, searchQ: '', favFilter: 'all' };

    // --- Lazy Loading Hybrid System ---
    function forceLoadImage(el) {
        if (el.dataset.loading === '1') return;
        el.dataset.loading = '1';
        
        const bgStr = el.dataset.bg;
        if (!bgStr || bgStr === 'undefined') return;

        const match = bgStr.match(/url\(['"]?([^'"\)]+)['"]?\)/);
        if (match && match[1]) {
            const img = new Image();
            const applyBg = () => {
                el.style.backgroundImage = `url('${match[1]}')`;
                // Always force cover/center for premium components that might lack it in shorthand
                el.style.backgroundSize = bgStr.includes('cover') ? 'cover' : 'cover';
                el.style.backgroundPosition = bgStr.includes('center') ? 'center' : 'center';
                el.style.backgroundRepeat = 'no-repeat';
                
                // Remove shimmer animation while keeping entrance animation (like slideUpFade)
                const currentAnim = el.style.animation || '';
                if (currentAnim.includes('shimmer')) {
                    el.style.animation = currentAnim.split(',').filter(a => !a.includes('shimmer')).join(',').trim() || 'none';
                } else if (!el.style.animation) {
                    el.style.animation = 'none';
                }
                
                el.classList.add('loaded');
            };
            img.onload = applyBg;
            img.onerror = applyBg;
            img.src = match[1];
            
            if (img.complete) {
                applyBg();
            } else {
                setTimeout(applyBg, 3000); // Failsafe
            }
        } else {
            el.style.setProperty('background-color', bgStr, 'important');
            el.classList.add('loaded');
        }
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                forceLoadImage(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '1000px' });

    function unstickImagesInView(view) {
        if (!view) return;
        const els = view.querySelectorAll('.lazy-bg:not(.loaded):not([data-loading])');
        let processed = 0;
        els.forEach(el => {
            // Eagerly force the first 30 assets in an activated view, skipping unpredictable CSS translation bounds
            if (processed < 30) {
                forceLoadImage(el);
                processed++;
            }
        });
    }

    function observeImages() {
        document.querySelectorAll('.lazy-bg:not(.loaded)').forEach(el => {
            imageObserver.observe(el);
        });
        unstickImagesInView(document.querySelector('.view.active'));
    }

    const domObserver = new MutationObserver(() => {
        observeImages();
    });

    const saveWatchStatus = () => localStorage.setItem(WATCH_STATUS_KEY, JSON.stringify(watchStatus));
    const getWatchStatus = id => watchStatus[id] || null;
    const setWatchStatus = (id, status) => {
        if (status) watchStatus[id] = status;
        else delete watchStatus[id];
        saveWatchStatus();
    };



    // ── Historial de búsqueda ──────────────────────────────────
    const SEARCH_HISTORY_KEY = 'search_history_v1';
    const SEARCH_HISTORY_MAX = 10;
    let searchHistory = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');

    function saveSearchHistory() {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    }

    function addToSearchHistory(query) {
        const q = query.trim();
        if (!q || q.length < 2) return;
        searchHistory = searchHistory.filter(h => h !== q);
        searchHistory.unshift(q);
        if (searchHistory.length > SEARCH_HISTORY_MAX) searchHistory = searchHistory.slice(0, SEARCH_HISTORY_MAX);
        saveSearchHistory();
    }

    let _pendingHistoryDeleteQuery = null;

    function clearSearchHistory() {
        searchHistory = [];
        saveSearchHistory();
        renderSearchHistory();
        showToast('Historial de búsqueda borrado');
        closeHistoryClearModal();
    }

    function removeFromSearchHistory(query) {
        searchHistory = searchHistory.filter(h => h !== query);
        saveSearchHistory();
        renderSearchHistory();
    }

    function openHistoryClearModal() {
        const overlay = $('history-clear-confirm-overlay');
        if (overlay) {
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeHistoryClearModal() {
        const overlay = $('history-clear-confirm-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openSingleHistoryDeleteModal(query) {
        _pendingHistoryDeleteQuery = query;
        const textEl = $('history-single-confirm-query-text');
        if (textEl) textEl.textContent = `¿Deseas eliminar "${query}" de tu historial?`;
        
        const overlay = $('history-single-confirm-overlay');
        if (overlay) {
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeSingleHistoryDeleteModal() {
        _pendingHistoryDeleteQuery = null;
        const overlay = $('history-single-confirm-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function updateSearchHistoryCountLabel() {
        const lbl = $('search-history-count-label');
        if (!lbl) return;
        const n = searchHistory.length;
        lbl.textContent = n > 0 ? `${n} búsqueda${n !== 1 ? 's' : ''} guardada${n !== 1 ? 's' : ''}` : 'Historial vacío';
    }

    function renderSearchHistory() {
        const list = $('search-history-list');
        const empty = $('search-history-empty');
        if (!list || !empty) return;
        
        if (!searchHistory.length) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }
        
        empty.style.display = 'none';
        list.innerHTML = searchHistory.map(q => `
            <div class="history-item" data-history-q="${q}">
                <div class="history-item-left">
                    <div class="history-item-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                    </div>
                    <span class="history-item-text">${q}</span>
                </div>
                <button class="history-item-remove" data-history-remove="${q}" aria-label="Quitar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                    </svg>
                </button>
            </div>
        `).join('');

        list.onclick = (e) => {
            const removeBtn = e.target.closest('.history-item-remove');
            if (removeBtn) {
                e.stopPropagation();
                openSingleHistoryDeleteModal(removeBtn.dataset.historyRemove);
                return;
            }

            const row = e.target.closest('.history-item');
            if (row) {
                const q = row.dataset.historyQ;
                $('search-input').value = q;
                navigateTo('search');
                renderSearch(q, state.catFilter);
            }
        };
    }
    // ────────────────────────────────────────────────────────────

    const $ = id => document.getElementById(id);
    const saveFavs = () => localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
    const isFav = id => favs.includes(id);


    function showToast(msg, iconHTML = '') {
        const toast = $('toast');
        if (!toast) return;
        toast.innerHTML = (iconHTML || `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`) + `<span>${msg}</span>`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    const openModal = id => {
        const modal = $(id);
        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }
    };

    const closeModal = id => {
        const modal = $(id);
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    function generateTextBackup() {
        try {
            const data = {
                favs: favs,
                watchStatus: watchStatus,
                history: searchHistory,
                settings: { h: hCatEnabled },
                v: '1.1',
                app: 'WolfAnime'
            };
            const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
            const area = $('backup-text-area');
            if (area) area.value = b64;
            openModal('backup-text-overlay');
        } catch (e) {
            showToast('Error al generar respaldo', '<span style="color:#ff4d6d">!</span>');
        }
    }

    function restoreFromTextBackup() {
        const area = $('restore-text-area');
        if (!area || !area.value.trim()) {
            showToast('Pega el código primero', '<span style="color:#ff4d6d">!</span>');
            return;
        }
        try {
            const json = decodeURIComponent(escape(atob(area.value.trim())));
            const data = JSON.parse(json);
            if (data.favs) { favs = data.favs; saveFavs(); }
            if (data.watchStatus) { watchStatus = data.watchStatus; saveWatchStatus(); }
            if (data.history) { searchHistory = data.history; saveSearchHistory(); }
            if (data.settings) {
                if (data.settings.h !== undefined) localStorage.setItem('h_enabled', data.settings.h ? '1' : '0');
                if (data.settings.aw !== undefined) localStorage.setItem('auto_watched', data.settings.aw ? '1' : '0');
            }
            showToast('Restauración completada');
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            showToast('Código de respaldo inválido', '<span style="color:#ff4d6d">!</span>');
        }
    }

    function clearFavorites() {
        if (confirm('¿Estás seguro de que deseas borrar todos tus favoritos?')) {
            favs = [];
            saveFavs();
            renderFavorites();
            renderProfile();
            renderHome();
            showToast('Favoritos borrados');
        }
    }

    function clearWatchHistory() {
        if (confirm('¿Estás seguro de que deseas borrar todo tu historial de visto?')) {
            watchStatus = {};
            saveWatchStatus();
            renderHome();
            renderSearch();
            renderProfile();
            showToast('Historial borrado');
        }
    }

    function exportUserData() {
        try {
            const data = {
                favorites: favs,
                watchStatus: watchStatus,
                searchHistory: searchHistory,
                settings: {
                    hCatEnabled: hCatEnabled,

                },
                exportDate: new Date().toISOString(),
                app: 'WolfAnime'
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wolfanime_data_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Datos exportados');
        } catch (e) {
            showToast('Error al exportar', '<span style="color:#ff4d6d">!</span>');
        }
    }

    function importUserData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.favorites) {
                        favs = data.favorites;
                        saveFavs();
                    }
                    if (data.watchStatus) {
                        watchStatus = data.watchStatus;
                        saveWatchStatus();
                    }
                    if (data.settings) {
                        if (data.settings.hCatEnabled !== undefined) {
                            localStorage.setItem('h_enabled', data.settings.hCatEnabled ? '1' : '0');
                        }

                    }
                    if (data.searchHistory) {
                        searchHistory = data.searchHistory;
                        saveSearchHistory();
                    }
                    showToast('Datos importados correctamente');
                    setTimeout(() => location.reload(), 1500);
                } catch (err) {
                    showToast('Error al importar', '<span style="color:#ff4d6d">!</span>');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    const toggleFav = id => {
        favs = isFav(id) ? favs.filter(f => f !== id) : [...favs, id];
        saveFavs();
    };

    function debounce(fn, ms) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    function getURLParams() {
        const params = new URLSearchParams(window.location.search);
        return Object.fromEntries(params.entries());
    }

    function updateURL(newParams = {}) {
        const url = new URL(window.location.href);
        const params = new URLSearchParams();

        // Preserve some persistent state if needed, or just clear and set new ones
        Object.entries(newParams).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') params.set(k, v);
        });

        const newUrl = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
        window.history.replaceState({}, '', newUrl);

        // Save to localStorage too
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(newParams));
    }

    function handleURLParams() {
        let p = getURLParams();
        const hasRelevantParams = p.id || p.cat || p.q || p.view;

        // If no relevant URL params, try localStorage
        if (!hasRelevantParams) {
            const saved = localStorage.getItem(APP_STATE_KEY);
            if (saved) {
                try {
                    const sp = JSON.parse(saved);
                    if (sp && Object.keys(sp).length > 0) p = sp;
                } catch (e) { }
            }
        }

        if (p.id) {
            openDetail(+p.id);
            return true;
        }
        if (p.cat) {
            state.catFilter = p.cat;
            renderCatLibrary(p.cat);
            navigateTo('cat-library');
            return true;
        }
        if (p.q) {
            if ($('search-input')) $('search-input').value = p.q;
            renderSearch(p.q, p.cat || null);
            navigateTo('search');
            return true;
        }
        if (p.view) {
            navigateTo(p.view);
            return true;
        }
        return false;
    }

    const CATS_CFG = window.CATEGORIES_CONFIG || [];
    const CATEGORIES = CATS_CFG.filter(c => !c.isH).map(c => c.name);
    const CAT_COLORS = Object.fromEntries(CATS_CFG.map(c => [c.name, c.color]));
    const CAT_ACCENT = Object.fromEntries(CATS_CFG.map(c => [c.name, c.accent]));
    const CAT_ICONS_MAP = Object.fromEntries(CATS_CFG.map(c => [c.name, c.icon]));

    let hCatEnabled = localStorage.getItem('h_enabled') === '1';


    const isH = item => {
        if (!item || !item.category) return false;
        return item.category.split(/,\s*/).map(c => c.trim()).includes('H');
    };

    const visibleDATA = () => hCatEnabled ? DATA : DATA.filter(d => {
        const cats = d.category ? d.category.split(/,\s*/).map(c => c.trim()) : [];
        return !cats.includes('H');
    });
    const saveHEnabled = () => localStorage.setItem('h_enabled', hCatEnabled ? '1' : '0');

    function formatAdded(d) {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
    }

    function getStatusClass(s) {
        if (!s) return 'status-off';
        if (s === 'En emisión') return 'status-on';
        if (s === 'En pausa') return 'status-pause';
        return 'status-off';
    }

    // Helpers para imágenes: usan poster/backdrop si existen, sino el gradiente image
    function posterBg(item) {
        if (item.poster) return `url('${item.poster}') center/cover no-repeat`;
        if (item.image && (item.image.startsWith('http') || item.image.startsWith('//'))) {
            return `url('${item.image}') center/cover no-repeat`;
        }
        return item.image || 'var(--card-bg)';
    }
    function backdropBg(item) {
        const url = item.backdrop || item.poster || item.image;
        if (url && (url.startsWith('http') || url.startsWith('//'))) {
            return `url('${url}') center/cover no-repeat`;
        }
        return url || 'var(--card-bg)';
    }

    function cardHTML(item, mini = false) {
        const fav = isFav(item.id);
        const h = isH(item);
        if (mini) {
            return `<div class="mini-card${h ? ' scard-h' : ''}" data-id="${item.id}">
      <div class="mini-card-img lazy-bg" data-bg="${posterBg(item)}"></div>
      <div class="mini-card-body">
        <div class="mini-card-title">${item.title}</div>
        <div style="font-size:11px;color:var(--text3)">${item.episodes} eps</div>
      </div>
    </div>`;
        }
        return `<div class="card${h ? ' card-h' : ''}" data-id="${item.id}">
    <div class="card-img lazy-bg" data-bg="${posterBg(item)}">
      <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);border-radius:20px;padding:3px 8px;font-size:11px;font-weight:600;color:#fff">${item.status}</div>
      ${item.addedDate ? `<div style="position:absolute;bottom:8px;left:8px;background:rgba(0,230,118,0.18);border:1px solid rgba(0,230,118,0.35);border-radius:20px;padding:3px 8px;font-size:10px;font-weight:600;color:#00E676">+ ${formatAdded(item.addedDate)}</div>` : ''}
      ${h ? '<span class="h-badge">18+</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${item.title}</div>
      <div class="card-meta">
        <div class="meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${item.readTime}</div>
        <div class="meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>${item.episodes} eps</div>
        <div class="meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>${item.source}</div>
      </div>
      <div class="card-desc">${item.description}</div>
      <div class="card-actions">
        <button class="cta-btn" data-cta="${item.id}">Ver anime</button>
        <button class="mylist-add-btn${(isFav(item.id) || getWatchStatus(item.id)) ? ' in-list' : ''}" data-mylist="${item.id}" aria-label="Agregar a Mi Lista">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>${(isFav(item.id) || getWatchStatus(item.id)) ? 'En Mi Lista' : 'Mi Lista'}</span>
        </button>
      </div>
    </div>
  </div>`;
    }

    function renderHome() {
        const featured = visibleDATA().filter(d => d.featured);
        const airing = visibleDATA().filter(d => d.status === 'En emisión').slice(0, 10);

        initSlider('featured-track', 'featured-dots', featured, true, 'horizontal', true);
        initSlider('popular-track', 'popular-dots', airing, false, 'vertical', false);

        const grid = $('home-grid');
        if (!grid) return;
        const sorted = [...visibleDATA()].sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || '')).slice(0, 5);
        grid.innerHTML = sorted.map((d, i) => recentCardHTML(d, i + 1, i)).join('');
        renderHomeFavs();
    }

    function initSlider(trackId, dotsId, data, isAutoPlay, layout = 'horizontal', showPagination = true) {
        const track = $(trackId);
        const dotsEl = $(dotsId);
        if (!track || !dotsEl || !data.length) return;

        if (!showPagination) {
            dotsEl.style.display = 'none';
        } else {
            dotsEl.style.display = '';
        }

        track.innerHTML = '';
        const frag = document.createDocumentFragment();
        data.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `slider-card ${layout}`;
            div.dataset.id = item.id;
            div.onclick = () => openDetail(item.id);
            const statusColor = item.status === 'En emisión' ? '#00e676' : item.status === 'En pausa' ? '#ffb300' : '#aaa';
            const year = item.date ? item.date.substring(0, 4) : '';
            const bg = layout === 'horizontal' ? backdropBg(item) : posterBg(item);
            const badgeText = isAutoPlay ? 'DESTACADO' : (layout === 'vertical' ? 'EN EMISIÓN' : 'TENDENCIA');
            
            const staggerDelay = index * 0.08;
            div.innerHTML = `<div class="slider-poster" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${staggerDelay}s; opacity: 0;">
                <div class="slider-poster-bg lazy-bg" data-bg="${bg}"></div>
                <div class="slider-poster-overlay"></div>
                <div class="slider-poster-badge">${badgeText}</div>
                ${layout === 'vertical' ? '' : `<span class="slider-poster-eps">${item.episodes} eps</span>`}
                <div class="slider-poster-info">
                    <div class="slider-poster-title">${item.title}</div>
                    <div class="slider-poster-meta">
                        <span class="slider-poster-status" style="color:${statusColor}">${item.status}</span>
                        <span class="slider-poster-dot">•</span>
                        <span class="slider-poster-year">${year}</span>
                    </div>
                </div>
            </div>`;
            frag.appendChild(div);
        });
        track.appendChild(frag);

        dotsEl.innerHTML = `
            <div class="slider-counter ${showPagination ? '' : 'hidden'}">
                <span class="slider-counter-current">01</span>
                <span class="slider-counter-sep">/</span>
                <span class="slider-counter-total">${String(data.length).padStart(2, '0')}</span>
            </div>
            <div class="slider-progress-bar"><div class="slider-progress-fill"></div></div>
            <div class="slider-dots-row">${data.map((_, i) => `<div class="dot${i === 0 ? ' active' : ''}" data-dot="${i}"></div>`).join('')}</div>
        `;

        let autoIdx = 0;
        let timer = null;

        function updateUI(idx) {
            const dots = dotsEl.querySelectorAll('.dot');
            dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            const current = dotsEl.querySelector('.slider-counter-current');
            if (current) {
                current.textContent = String(idx + 1).padStart(2, '0');
                current.classList.remove('animating');
                void current.offsetWidth;
                current.classList.add('animating');
            }
            const fill = dotsEl.querySelector('.slider-progress-fill');
            if (fill) fill.style.width = ((idx + 1) / data.length * 100) + '%';
        }

        function scrollToIndex(idx) {
            const cards = track.querySelectorAll('.slider-card');
            if (!cards[idx]) return;
            const card = cards[idx];
            const scrollLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
            track.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            updateUI(idx);
            autoIdx = idx;
        }

        let isScrolling = false;
        track.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            setTimeout(() => {
                const card = track.querySelector('.slider-card');
                const cardW = card?.offsetWidth || 200;
                const idx = Math.round(track.scrollLeft / (cardW + 12));
                if (idx !== autoIdx && idx >= 0 && idx < data.length) {
                    autoIdx = idx;
                    updateUI(idx);
                }
                isScrolling = false;
            }, 150);
        }, {passive: true});

        dotsEl.onclick = (e) => {
            const dot = e.target.closest('.dot');
            if (dot) scrollToIndex(parseInt(dot.dataset.dot));
        };

        if (isAutoPlay) {
            const startAuto = () => {
                clearInterval(timer);
                timer = setInterval(() => {
                    autoIdx = (autoIdx + 1) % data.length;
                    scrollToIndex(autoIdx);
                }, 5000);
            };
            startAuto();
            track.addEventListener('touchstart', () => clearInterval(timer), {passive: true});
            track.addEventListener('touchend', startAuto, {passive: true});
        }
    }

    function renderClassics() {
        const track = $('classics-track');
        if (!track) return;
        const classics = visibleDATA().filter(d => {
            if (!d.date) return false;
            const year = parseInt(d.date.substring(0, 4));
            return year <= 2010;
        }).sort((a, b) => b.date.localeCompare(a.date));

        if (classics.length === 0) {
            track.closest('.section-header')?.style.setProperty('display', 'none');
            track.closest('.featured-slider')?.style.setProperty('display', 'none');
            return;
        }

        track.innerHTML = classics.map((item, i) => `
            <div class="slider-card" data-id="${item.id}">
                <div class="slider-poster" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${i * 0.08}s; opacity: 0;">
                    <div class="slider-poster-bg lazy-bg" data-bg="${posterBg(item)}"></div>
                    <div class="slider-poster-overlay" style="background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)"></div>
                    <span class="slider-poster-eps" style="background:var(--accent);color:#000;font-weight:900;border-radius:6px;padding:2px 6px">${item.date ? item.date.substring(0, 4) : 'OLD'}</span>
                    <div class="slider-poster-info" style="padding:10px">
                        <div class="slider-poster-title" style="font-size:13px;line-height:1.2;font-weight:700">${item.title}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function recentCardHTML(item, num, index = 0) {
        const h = isH(item);
        return `<div class="recent-card${h ? ' recent-card-h' : ''}" data-id="${item.id}" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.08}s; opacity: 0;">
    <div class="recent-poster">
      <div class="recent-poster-img lazy-bg" data-bg="${posterBg(item)}"></div>
      <div class="recent-poster-num">#${num}</div>
      ${h ? '<span class="h-badge">18+</span>' : ''}
    </div>
    <div class="recent-body">
      <div class="recent-title">${item.title}</div>
      <div class="recent-meta">
        <span class="recent-pill">${item.episodes} eps</span>
      </div>
      <div class="recent-date">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${formatAdded(item.addedDate)}
      </div>
    </div>
  </div>`;
    }

    function renderHomeFavs() {
        const container = $('home-favs');
        if (!container) return;
        const favItems = visibleDATA().filter(d => isFav(d.id));
        if (!favItems.length) {
            container.innerHTML = '<div style="padding:8px 0;font-size:13px;color:var(--text3)">Aún no tienes favoritos</div>';
            return;
        }
        container.innerHTML = favItems.map(d => cardHTML(d, true)).join('');
    }



    function searchCardHTML(item, purple = false, index = 0) {
        const h = purple || isH(item);
        return `<div class="scard${h ? ' scard-h' : ''}" data-id="${item.id}" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.08}s; opacity: 0;">
    <div class="scard-poster lazy-bg" data-bg="${posterBg(item)}">
      <div class="scard-status ${getStatusClass(item.status)}">${item.status}</div>
      ${h ? '<span class="h-badge">18+</span>' : ''}
    </div>
    <div class="scard-body">
      <div class="scard-title">${item.title}</div>
      <div class="scard-pills">
        <span class="scard-pill">${item.episodes} eps</span>
        <span class="scard-pill">${item.readTime}</span>
        <span class="scard-pill">${item.date ? item.date.slice(0, 4) : ''}</span>
      </div>
    </div>
  </div>`;
    }

    function renderSearch(q = '', cat = null) {
        const lower = q.toLowerCase();
        let results = visibleDATA();
        if (q) results = results.filter(d =>
            d.title.toLowerCase().includes(lower) ||
            d.description.toLowerCase().includes(lower) ||
            d.tags.some(t => t.toLowerCase().includes(lower)) ||
            d.category.toLowerCase().includes(lower)
        );
        if (cat) results = results.filter(d => {
            const cats = d.category ? d.category.split(/,\s*/).map(c => c.trim()) : [];
            return cats.includes(cat);
        });
        const grid = $('search-grid');
        const empty = $('search-empty');
        const meta = $('search-meta');
        if (!results.length) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            meta.textContent = '';
        } else {
            empty.style.display = 'none';
            grid.innerHTML = results.map((d, i) => searchCardHTML(d, false, i)).join('');
            meta.textContent = `${results.length} resultado${results.length !== 1 ? 's' : ''}${q ? ' para "' + q + '"' : ''}`;
        }
    }

    function renderCategories() {
        const catGrid = $('cat-grid');
        if (!catGrid) return;
        const visibleCats = hCatEnabled ? [...CATEGORIES, 'H'] : CATEGORIES;
        catGrid.innerHTML = visibleCats.map((cat, index) => {
            const count = visibleDATA().filter(d => d.category && d.category.split(/,\s*/).map(c => c.trim()).includes(cat)).length;
            const cfg = (window.CATEGORIES_CONFIG || []).find(x => x.name.toLowerCase().replace(':', '') === cat.toLowerCase().replace(':', '')) || { name: cat };
            const bgString = cfg.backdrop ? `url('${cfg.backdrop}')` : '#1a1a1a';
            const extraStyle = cfg.backdrop ? 'background-size: cover !important;' : '';
            const icon = cfg.icon || '';
            const accent = cfg.accent || 'var(--accent)';
            const staggerDelay = index * 0.08; // 80ms offset per card
            // Combine entrance and shimmer. Entrance must finish to reach opacity 1.
            const animations = `slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, shimmer 1.5s infinite linear`;
            return `
                <div class="cat-card lazy-bg" data-cat="${cat}" data-bg="${bgString}" style="${extraStyle} animation: ${animations}; animation-delay: ${staggerDelay}s, 0s; opacity: 0;">
                    <div class="cat-card-icon" style="color:${accent}; border-color:${accent}44; background: ${accent}11; backdrop-filter: blur(10px);">${icon}</div>
                    <div class="cat-card-info">
                        <h3>${cat}</h3>
                        <div class="cat-card-count" style="background:${accent}22; color:${accent}">${count} serie${count !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderCatLibrary(cat) {
        $('cat-library-title').textContent = cat === 'H' ? 'Contenido H' : cat;
        const items = visibleDATA().filter(d => d.category === cat || (d.category && d.category.split(/,\s*/).map(c => c.trim()).includes(cat)));
        if (items.length === 0) {
            $('cat-library-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;padding:60px 20px;text-align:center">
        <span style="font-size:48px">📭</span>
        <p style="margin-top:12px;font-size:16px;font-weight:700;color:var(--text2)">Sin contenido aún</p>
        <small style="color:var(--text3);font-size:13px">No hay series en esta categoría todavía</small>
      </div>`;
        } else {
            $('cat-library-grid').innerHTML = items.map((d, i) => searchCardHTML(d, cat === 'H', i)).join('');
        }
    }

    function renderAllLibrary() {
        let items = visibleDATA();
        let title = 'Últimos agregados';
        const grid = $('all-library-grid');
        if (!grid) return;

        grid.classList.remove('layout-horizontal');
        
        if (state.filterType === 'featured') {
            items = items.filter(d => d.featured);
            title = 'Todos los Destacados';
        } else if (state.filterType === 'airing') {
            items = items.filter(d => d.status === 'En emisión');
            title = 'En Emisión';
        }

        const sorted = [...items].sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
        const titleEl = document.querySelector('#view-all-library .cat-library-title');
        if (titleEl) titleEl.textContent = title;

        const countEl = $('all-library-count');
        if (countEl) countEl.textContent = `${items.length} títulos`;
        
        grid.innerHTML = sorted.map((d, i) => searchCardHTML(d, false, i)).join('');
    }

    function myListCardHTML(item, index = 0) {
        const ws = getWatchStatus(item.id);
        const fav = isFav(item.id);
        const h = isH(item);
        return `<div class="scard${h ? ' scard-h' : ''}" data-id="${item.id}" style="animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.08}s; opacity: 0;">
    <div class="scard-poster lazy-bg" data-bg="${posterBg(item)}">
      <div class="scard-status ${getStatusClass(item.status)}">${item.status}</div>
      ${h ? '<span class="h-badge">18+</span>' : ''}
    </div>
    <div class="scard-body">
      <div class="scard-title">${item.title}</div>
      <div class="scard-pills">
        <span class="scard-pill">${item.episodes} eps</span>
        <span class="scard-pill">${item.readTime}</span>
        <span class="scard-pill">${item.date ? item.date.slice(0, 4) : ''}</span>
      </div>
      <div class="fav-watch-btns">
        <button class="ws-btn${ws === 'Viendo' ? ' active' : ''}" data-ws="Viendo" data-ws-item="${item.id}">▶ Viendo</button>
        <button class="ws-btn${ws === 'Completado' ? ' active' : ''}" data-ws="Completado" data-ws-item="${item.id}">✓ Completado</button>
        <button class="ws-btn${ws === 'Pendiente' ? ' active' : ''}" data-ws="Pendiente" data-ws-item="${item.id}">⏳ Pendiente</button>
      </div>
    </div>
    <button class="mylist-remove-btn" data-remove="${item.id}" aria-label="Eliminar de Mi Lista">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    </button>
  </div>`;
    }

    function renderFavorites() {
        const grid = $('fav-grid');
        const empty = $('fav-empty');
        const countEl = $('mylist-count');

        // Un item aparece en Mi Lista si tiene favorito O tiene estado de seguimiento
        let items = visibleDATA().filter(d => isFav(d.id) || getWatchStatus(d.id));

        const filter = state.favFilter;
        if (filter === 'fav') {
            items = items.filter(d => isFav(d.id));
        } else if (filter === 'Viendo' || filter === 'Completado' || filter === 'Pendiente') {
            items = items.filter(d => getWatchStatus(d.id) === filter);
        }

        if (countEl) countEl.textContent = items.length ? `${items.length} serie${items.length !== 1 ? 's' : ''}` : '';

        if (!items.length) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
        } else {
            empty.style.display = 'none';
            grid.innerHTML = items.map((d, i) => myListCardHTML(d, i)).join('');
        }
    }

    function renderProfile() {
        const favCount = favs.length;
        const badge = $('fav-badge-profile');
        if (badge) badge.textContent = favCount;

        // Contar categorías visibles (incluir H solo si está habilitado)
        const visibleCategories = hCatEnabled
            ? CATS_CFG.map(c => c.name)
            : CATS_CFG.filter(c => !c.isH).map(c => c.name);

        const stats = $('profile-stats');
        if (stats) {
            stats.innerHTML = `
                <div class="stat-item"><div class="stat-num">${visibleDATA().length}</div><div class="stat-label">Series</div></div>
                <div class="stat-item"><div class="stat-num">${favCount}</div><div class="stat-label">Favoritos</div></div>
                <div class="stat-item"><div class="stat-num">${visibleCategories.length}</div><div class="stat-label">Géneros</div></div>
            `;
        }
        const pill = $('h-toggle-pill');
        if (pill) pill.classList.toggle('active', hCatEnabled);

        const versionEl = $('profile-version');
        if (versionEl) versionEl.textContent = CFG.version || '1.0.0';
        // Botón solicitar contenido
        const reqBtn = $('request-content-btn');
        const reqGrp = $('request-content-group');
        if (reqBtn) {
            if (CFG.requestContentUrl) {
                if (reqGrp) reqGrp.style.display = 'block';
                reqBtn.style.display = '';
                reqBtn.onclick = () => location.href = CFG.requestContentUrl;
            } else {
                if (reqGrp) reqGrp.style.display = 'none';
                reqBtn.style.display = 'none';
            }
        }
    }

    function renderAboutInfo() {
        const appName = CFG.appName || 'WolfAnime';
        const version = CFG.version || '1.0.0';

        const titleEl = $('info-app-name');
        const versionEl = $('info-app-version');
        const descEl = $('info-description');
        const iconEl = $('info-app-icon');
        const featuresEl = $('info-features-list');
        const versionTextEl = $('info-version-text');
        const developerTextEl = $('info-developer-text');

        if (titleEl) titleEl.textContent = appName;
        if (versionEl) versionEl.textContent = `v${version}`;
        if (versionTextEl) versionTextEl.textContent = version;
        if (developerTextEl) developerTextEl.textContent = CFG.developerName || 'WolfAnime Team';
        if (descEl) descEl.textContent = CFG.aboutDescription || `${appName} es tu plataforma personal para descubrir y seguir el anime que más te gusta.`;

        if (iconEl) {
            if (CFG.aboutLogoUrl) {
                iconEl.innerHTML = `<img src="${CFG.aboutLogoUrl}" alt="${appName}" style="height:36px;object-fit:contain">`;
                iconEl.style.background = 'none';
            } else {
                iconEl.innerHTML = `<span style="font-size:24px;font-weight:900;background:linear-gradient(90deg,var(--accent),#69ffb4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${appName.charAt(0)}</span>`;
            }
        }

        if (featuresEl && CFG.aboutFeatures && CFG.aboutFeatures.length) {
            featuresEl.innerHTML = CFG.aboutFeatures.map(f =>
                `<div class="about-feature">${f.icon || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`}<span>${f.text || f}</span></div>`
            ).join('');
        }
    }

    function renderDetail(item) {
        const fav = isFav(item.id);
        const castHTML = item.cast && item.cast.length
            ? item.cast.map(c => {
                const [name, role] = c.split('(');
                return `<div class="cast-item">
          <div class="cast-avatar">${name.trim().charAt(0)}</div>
          <div class="cast-info">
            <div class="cast-name">${name.trim()}</div>
            ${role ? `<div class="cast-role">${role.replace(')', '')}</div>` : ''}
          </div>
        </div>`;
            }).join('')
            : `<div class="detail-cast-empty"><span>🎭</span><p>Sin reparto disponible</p></div>`;

        $('detail-inner').innerHTML = `
    <div class="cat-library-header">
      <button class="detail-back" id="detail-back-btn" aria-label="Volver">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
    </div>
    <div class="detail-img lazy-bg" data-bg="${backdropBg(item)}">
      <div class="detail-poster lazy-bg" data-bg="${posterBg(item)}"></div>
      <button class="detail-fav-btn${fav ? ' active' : ''}" id="detail-fav-btn" aria-label="Favorito">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="detail-content">
      <div class="detail-badges">
        ${isH(item) ? '<span class="detail-h-badge">🔞 18+</span>' : ''}
        <span class="detail-badge ${getStatusClass(item.status)}">${item.status}</span>
        <span class="detail-badge status-off">${item.date ? item.date.slice(0, 4) : ''}</span>
      </div>
      <h1 class="detail-title">${item.title}</h1>
      <div class="detail-cta">
        <button class="detail-cta-main" id="detail-cta-main">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Reproducir
        </button>
        <button class="detail-mylist-btn${getWatchStatus(item.id) ? ' in-list' : ''}" id="detail-mylist-btn" data-mylist="${item.id}" aria-label="Añadir a Mi Lista">
          ${getWatchStatus(item.id)
                ? `${{ Viendo: '▶', Completado: '✓', Pendiente: '⏳' }[getWatchStatus(item.id)] || ''} ${getWatchStatus(item.id)}`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Añadir a Mi Lista`}
        </button>
      </div>

      <div class="detail-tabs">
        <button class="detail-tab active" data-tab="synopsis">Sinopsis</button>
        <button class="detail-tab" data-tab="cast">Reparto</button>
        <button class="detail-tab" data-tab="info">Información</button>
      </div>

      <div class="detail-tab-panel" id="tab-synopsis">
        <div class="detail-tags">${(() => {
                const maxTags = 5;
                const visibleTags = item.tags.slice(0, maxTags);
                const hiddenTags = item.tags.slice(maxTags);
                let html = visibleTags.map(t => `<span class="tag">${t}</span>`).join('');
                if (hiddenTags.length > 0) {
                    html += hiddenTags.map(t => `<span class="tag tag-hidden">${t}</span>`).join('');
                    html += `<button class="tag-show-more" data-show-tags>Ver más (${hiddenTags.length})</button>`;
                }
                return html;
            })()}</div>
        <p class="detail-desc">${item.description}</p>
      </div>

      <div class="detail-tab-panel" id="tab-cast" style="display:none">
        <div class="cast-list">${castHTML}</div>
      </div>

      <div class="detail-tab-panel" id="tab-info" style="display:none">
        <div class="detail-meta-grid">
          <div class="detail-meta-item"><div class="val">${item.episodes}</div><div class="lbl">Episodios</div></div>
          <div class="detail-meta-item"><div class="val">${item.readTime}</div><div class="lbl">Duración</div></div>
          <div class="detail-meta-item"><div class="val">${item.date ? item.date.slice(0, 4) : '—'}</div><div class="lbl">Año</div></div>
        </div>
        <div class="detail-info-list">
          <div class="detail-info-row detail-info-genres">
            <span>Géneros</span>
            <div class="detail-genres-tags">
              ${(() => {
                // Separar el campo genre por diferentes separadores posibles
                let genres = [];
                if (item.genre.includes(' / ')) {
                    genres = item.genre.split(' / ').map(g => g.trim());
                } else if (item.genre.includes('/')) {
                    genres = item.genre.split('/').map(g => g.trim());
                } else if (item.genre.includes(',')) {
                    genres = item.genre.split(',').map(g => g.trim());
                } else {
                    // Si no hay separador, es un solo género
                    genres = [item.genre];
                }

                const maxGenres = 3;
                const visibleGenres = genres.slice(0, maxGenres);
                const hiddenGenres = genres.slice(maxGenres);

                let html = visibleGenres.map(g => `<span class="tag">${g}</span>`).join('');
                if (hiddenGenres.length > 0) {
                    html += hiddenGenres.map(g => `<span class="tag tag-hidden">${g}</span>`).join('');
                    html += `<button class="tag-show-more" data-show-genres>Ver más (${hiddenGenres.length})</button>`;
                }
                return html;
            })()}
            </div>
          </div>
          <div class="detail-info-row"><span>Estado</span><span>${item.status}</span></div>
          <div class="detail-info-row"><span>Estreno</span><span>${item.date}</span></div>
          <div class="detail-info-row"><span>Fuente</span><span>${item.source}</span></div>
        </div>
      </div>
    </div>`;

        $('detail-inner').querySelectorAll('.detail-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $('detail-inner').querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
                $('detail-inner').querySelectorAll('.detail-tab-panel').forEach(p => p.style.display = 'none');
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).style.display = '';
            });
        });

        document.getElementById('detail-back-btn').addEventListener('click', () => navigateTo(state.prev || 'home', true));
        document.getElementById('detail-cta-main').addEventListener('click', () => { location.href = item.url; });

        document.getElementById('detail-fav-btn').addEventListener('click', () => {
            toggleFav(item.id);
            const btn = document.getElementById('detail-fav-btn');
            const active = isFav(item.id);
            btn.classList.toggle('active', active);
            btn.querySelector('svg').setAttribute('fill', active ? 'currentColor' : 'none');
        });

        document.getElementById('detail-mylist-btn').addEventListener('click', () => {
            openMyListModal(item.id);
        });

        // Event listeners para botones "Ver más" de tags y géneros
        const showTagsBtn = $('detail-inner').querySelector('[data-show-tags]');
        if (showTagsBtn) {
            showTagsBtn.addEventListener('click', (e) => {
                const btn = e.target;
                const container = btn.parentElement;
                const allTags = Array.from(container.querySelectorAll('.tag')).filter(t => !t.classList.contains('tag-show-more'));
                const maxVisible = 5;
                const isExpanded = btn.dataset.expanded === 'true';

                if (isExpanded) {
                    // Colapsar: ocultar tags después del máximo
                    allTags.forEach((tag, index) => {
                        if (index >= maxVisible) {
                            tag.classList.add('tag-hidden');
                        }
                    });
                    btn.textContent = `Ver más (${allTags.length - maxVisible})`;
                    btn.dataset.expanded = 'false';
                } else {
                    // Expandir: mostrar todos los tags
                    allTags.forEach(tag => tag.classList.remove('tag-hidden'));
                    btn.textContent = 'Ver menos';
                    btn.dataset.expanded = 'true';
                }
            });
        }

        const showGenresBtn = $('detail-inner').querySelector('[data-show-genres]');
        if (showGenresBtn) {
            showGenresBtn.addEventListener('click', (e) => {
                const btn = e.target;
                const container = btn.parentElement;
                const allTags = Array.from(container.querySelectorAll('.tag')).filter(t => !t.classList.contains('tag-show-more'));
                const maxVisible = 3;
                const isExpanded = btn.dataset.expanded === 'true';

                if (isExpanded) {
                    // Colapsar: ocultar géneros después del máximo
                    allTags.forEach((tag, index) => {
                        if (index >= maxVisible) {
                            tag.classList.add('tag-hidden');
                        }
                    });
                    btn.textContent = `Ver más (${allTags.length - maxVisible})`;
                    btn.dataset.expanded = 'false';
                } else {
                    // Expandir: mostrar todos los géneros
                    allTags.forEach(tag => tag.classList.remove('tag-hidden'));
                    btn.textContent = 'Ver menos';
                    btn.dataset.expanded = 'true';
                }
            });
        }
    }

    function navigateTo(view, back = false) {
        if (view === 'featured-all') {
            state.filterType = 'featured';
            view = 'all-library';
        } else if (view === 'airing-all') {
            state.filterType = 'airing';
            view = 'all-library';
        } else if (view === 'all-library') {
            state.filterType = null;
        }
        const views = document.querySelectorAll('.view');
        const current = state.view ? document.getElementById('view-' + state.view) : null;
        const next = document.getElementById('view-' + view);
        if (!next || (state.view === view && next.classList.contains('active'))) return;

        if (current) {
            if (back) {
                current.classList.remove('active');
                current.classList.add('slide-left');
                setTimeout(() => { current.classList.remove('slide-left'); }, 300);
            } else {
                current.classList.remove('active');
            }
        }

        state.prev = state.view;
        state.view = view;
        next.classList.add('active');
        next.scrollTop = 0;

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === view || (view === 'cat-library' && b.dataset.nav === 'categories') || (view === 'all-library' && b.dataset.nav === 'home')));

        if (view === 'settings-info') renderAboutInfo();
        if (view === 'settings-data') updateSearchHistoryCountLabel();

        const header = document.getElementById('header');
        const main = document.getElementById('main');
        const isFullscreenView = ['search', 'search-history', 'categories', 'cat-library', 'all-library', 'detail', 'favorites'].includes(view) || view.startsWith('settings');
        
        if (isFullscreenView) {
            header.style.display = 'none';
            main.style.marginTop = '0';
        } else {
            header.style.display = '';
            main.style.marginTop = '';
        }

        if (view === 'home') renderHomeFavs();
        if (view === 'search') { renderSearch($('search-input').value, state.catFilter); updateSearchHistoryCountLabel(); }
        if (view === 'search-history') renderSearchHistory();
        if (view === 'categories') renderCategories();
        if (view === 'all-library') renderAllLibrary();
        if (view === 'favorites') renderFavorites();
        if (view === 'profile') {
            renderProfile();
            const pb = document.getElementById('profile-banner');
            if (pb) forceLoadImage(pb);
        }

        // Bypass IntersectionObserver translation bugs via manual bounding rescue
        setTimeout(() => unstickImagesInView(document.getElementById(`view-${view}`)), 50);
        setTimeout(() => unstickImagesInView(document.getElementById(`view-${view}`)), 300);

        // Update URL
        const params = { view: view };
        if (view === 'search' && $('search-input')?.value) params.q = $('search-input').value;
        if (view === 'cat-library') params.cat = state.catFilter;
        if (view === 'detail' && state.detail) params.id = state.detail.id;
        updateURL(params);
    }
    window.navigateTo = navigateTo;

    function openDetail(id) {
        const item = DATA.find(d => d.id === id);
        if (!item) return;
        state.detail = item;
        renderDetail(item);
        navigateTo('detail');
        setTimeout(() => unstickImagesInView(document.getElementById('view-detail')), 50);
        setTimeout(() => unstickImagesInView(document.getElementById('view-detail')), 300);
    }

    // ── Modal Mi Lista ──────────────────────────────────────────
    let modalItemId = null;
    let modalPendingStatus = undefined; // undefined = sin cambio, null = quitar, string = nuevo estado

    function openMyListModal(id) {
        const item = DATA.find(d => d.id === id);
        if (!item) return;
        modalItemId = id;
        modalPendingStatus = undefined;

        document.getElementById('modal-poster').style.background = posterBg(item);
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-genre').textContent = item.genre;

        updateModalChecks();

        const overlay = $('mylist-modal-overlay');
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function updateModalChecks() {
        const ws = modalPendingStatus !== undefined ? modalPendingStatus : getWatchStatus(modalItemId);
        const keys = ['Viendo', 'Completado', 'Pendiente'];
        keys.forEach(key => {
            const btn = document.querySelector(`[data-modal-ws="${key}"]`);
            const radio = document.getElementById(`modal-check-${key}`);
            if (!btn || !radio) return;
            const active = ws === key;
            btn.classList.toggle('active', active);
            radio.classList.toggle('checked', active);
        });
        // Habilitar confirmar solo si hay un cambio respecto al estado guardado
        const saved = getWatchStatus(modalItemId);
        const confirmBtn = $('modal-confirm-btn');
        if (confirmBtn) {
            const hasChange = modalPendingStatus !== undefined && modalPendingStatus !== saved;
            confirmBtn.disabled = !hasChange;
        }
    }

    function closeMyListModal() {
        const overlay = $('mylist-modal-overlay');
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (state.view === 'favorites') renderFavorites();
        if (state.view === 'home') renderHome();
        if (state.view === 'search') renderSearch($('search-input').value, state.catFilter);
        renderProfile();
        // Actualizar botón de Mi Lista en la vista de detalle si está abierta
        if (state.view === 'detail' && state.detail) {
            const btn = document.getElementById('detail-mylist-btn');
            if (btn) {
                const ws = getWatchStatus(state.detail.id);
                const statusIcons = { Viendo: '▶', Completado: '✓', Pendiente: '⏳' };
                btn.classList.toggle('in-list', !!ws);
                btn.innerHTML = ws
                    ? `${statusIcons[ws] || ''} ${ws}`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Añadir a Mi Lista`;
            }
        }
        modalItemId = null;
        modalPendingStatus = undefined;
    }

    $('mylist-modal-overlay').addEventListener('click', e => {
        if (e.target === $('mylist-modal-overlay')) closeMyListModal();
    });
    $('modal-close-btn').addEventListener('click', closeMyListModal);

    document.getElementById('mylist-modal').addEventListener('click', e => {
        const opt = e.target.closest('[data-modal-ws]');
        if (!opt || modalItemId === null) return;
        const key = opt.dataset.modalWs;
        const saved = getWatchStatus(modalItemId);
        // Si ya está seleccionado (pendiente o guardado), deseleccionar
        const current = modalPendingStatus !== undefined ? modalPendingStatus : saved;
        modalPendingStatus = current === key ? null : key;
        updateModalChecks();
    });

    $('modal-confirm-btn').addEventListener('click', () => {
        if (modalItemId === null || modalPendingStatus === undefined) return;
        setWatchStatus(modalItemId, modalPendingStatus || null);
        closeMyListModal();
    });
    // ────────────────────────────────────────────────────────────

    function renderFilterChips() {
        const chips = $('filter-chips');
        const visibleCats = hCatEnabled ? [...CATEGORIES, 'H'] : CATEGORIES;
        // Si el filtro activo era H y se desactivó, resetear
        if (!hCatEnabled && state.catFilter === 'H') state.catFilter = null;
        chips.innerHTML = `<div class="chip${!state.catFilter ? ' active' : ''}" data-chip="">Todos</div>` +
            visibleCats.map(c => {
                const cfg = CATS_CFG.find(x => x.name === c);
                const accent = cfg ? cfg.accent : '#fff';
                const active = state.catFilter === c ? ' active' : '';
                return `<div class="chip${active}" data-chip="${c}" style="--chip-accent:${accent}">${c}</div>`;
            }).join('');
    }

    // ── Modal Confirmar Eliminación (declaración adelantada) ──
    let _removeTargetId = null;
    let _removeSelFav = false;
    let _removeSelWs = false;

    function _updateRemoveAcceptBtn() {
        const btn = document.getElementById('remove-confirm-accept');
        if (btn) btn.disabled = !_removeSelFav && !_removeSelWs;
    }

    function openRemoveConfirm(id) {
        const item = DATA.find(d => d.id === id);
        if (!item) return;
        _removeTargetId = id;
        const hasFav = isFav(id);
        const hasWs = !!getWatchStatus(id);
        const filter = state.favFilter;

        const desc = document.getElementById('remove-confirm-desc');
        if (desc) desc.textContent = item.title;

        const title = document.querySelector('.remove-confirm-title');
        const optFav = document.getElementById('remove-opt-fav');
        const optWs = document.getElementById('remove-opt-ws');
        const wsLabel = document.getElementById('remove-opt-ws-label');
        const acceptBtn = document.getElementById('remove-confirm-accept');
        const options = document.getElementById('remove-confirm-options');

        const tabNames = { fav: 'Favoritos', Viendo: 'Viendo', Completado: 'Completado', Pendiente: 'Pendiente' };

        if (filter !== 'all') {
            // Tab específico: título directo, sin opciones
            if (title) title.textContent = `¿Eliminar de ${tabNames[filter] || filter}?`;
            if (options) options.style.display = 'none';
            if (acceptBtn) { acceptBtn.textContent = 'Eliminar'; acceptBtn.disabled = false; }
            _removeSelFav = filter === 'fav';
            _removeSelWs = filter !== 'fav';
        } else {
            // Tab "Todos": opciones con checkboxes
            if (title) title.textContent = '¿Qué deseas eliminar?';
            if (options) options.style.display = '';
            if (optFav) optFav.style.display = hasFav ? '' : 'none';
            if (optWs) optWs.style.display = hasWs ? '' : 'none';
            if (wsLabel && hasWs) wsLabel.textContent = `Quitar estado "${getWatchStatus(id)}"`;
            _removeSelFav = hasFav;
            _removeSelWs = hasWs;
            const chkFav = document.getElementById('remove-chk-fav');
            const chkWs = document.getElementById('remove-chk-ws');
            if (chkFav) chkFav.classList.toggle('checked', _removeSelFav);
            if (chkWs) chkWs.classList.toggle('checked', _removeSelWs);
            if (acceptBtn) acceptBtn.textContent = 'Eliminar';
            _updateRemoveAcceptBtn();
        }

        const o = document.getElementById('remove-confirm-overlay');
        o.classList.add('open');
        o.setAttribute('aria-hidden', 'false');
    }
    function closeRemoveConfirm() {
        const o = document.getElementById('remove-confirm-overlay');
        o.classList.remove('open');
        o.setAttribute('aria-hidden', 'true');
        _removeTargetId = null;
        _removeSelFav = false;
        _removeSelWs = false;
    }

    document.addEventListener('click', e => {
        const heroBtn = e.target.closest('[data-hero-nav]');
        if (heroBtn) { navigateTo(heroBtn.dataset.heroNav); return; }

        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) { navigateTo(navBtn.dataset.nav); return; }

        const seeAll = e.target.closest('.see-all');
        if (seeAll) {
            navigateTo(seeAll.dataset.nav);
            return;
        }

        const mylistBtn = e.target.closest('[data-mylist]');
        if (mylistBtn) {
            e.stopPropagation();
            openMyListModal(+mylistBtn.dataset.mylist);
            return;
        }

        const favBtn = e.target.closest('[data-fav]');
        if (favBtn) {
            e.stopPropagation();
            const id = +favBtn.dataset.fav;
            toggleFav(id);
            const active = isFav(id);
            favBtn.classList.toggle('active', active);
            favBtn.querySelector('svg').setAttribute('fill', active ? 'currentColor' : 'none');
            if (state.view === 'favorites') renderFavorites();
            renderProfile();
            return;
        }

        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) {
            e.stopPropagation();
            openRemoveConfirm(+removeBtn.dataset.remove);
            return;
        }

        const ctaBtn = e.target.closest('[data-cta]');
        if (ctaBtn) {
            e.stopPropagation();
            const item = DATA.find(d => d.id === +ctaBtn.dataset.cta);
            if (item) openDetail(item.id);
            return;
        }

        const card = e.target.closest('.card, .slider-card, .mini-card, .recent-card, .scard');
        if (card && card.dataset.id) { openDetail(+card.dataset.id); return; }

        const catCard = e.target.closest('.cat-card');
        if (catCard) {
            state.catFilter = catCard.dataset.cat;
            renderCatLibrary(state.catFilter);
            navigateTo('cat-library');
            return;
        }

        const chip = e.target.closest('[data-chip]');
        if (chip) {
            state.catFilter = chip.dataset.chip || null;
            document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.chip === (chip.dataset.chip)));
            renderSearch($('search-input').value, state.catFilter);
            return;
        }

        const favChip = e.target.closest('[data-fav-filter]');
        if (favChip) {
            state.favFilter = favChip.dataset.favFilter || 'all';
            document.querySelectorAll('[data-fav-filter]').forEach(c => c.classList.toggle('active', c.dataset.favFilter === favChip.dataset.favFilter));
            renderFavorites();
            return;
        }

        const wsBtn = e.target.closest('[data-ws]');
        if (wsBtn) {
            e.stopPropagation();
            const id = +wsBtn.dataset.wsItem;
            const newStatus = wsBtn.dataset.ws;
            const current = getWatchStatus(id);
            setWatchStatus(id, current === newStatus ? null : newStatus);
            // Si ya no tiene ni fav ni estado, sale de Mi Lista — re-render
            renderFavorites();
            renderProfile();
            return;
        }

        const dot = e.target.closest('[data-dot]');
        if (dot) {
            const idx = +dot.dataset.dot;
            const track = $('slider-track');
            if (track._sliderGoTo) track._sliderGoTo(idx);
            return;
        }

        const tag = e.target.closest('.tag');
        if (tag && !tag.classList.contains('tag-show-more')) {
            const q = tag.textContent.trim();
            const input = $('search-input');
            const clear = $('search-clear');
            if (input) input.value = q;
            if (clear) clear.classList.add('visible');
            state.catFilter = null;
            renderSearch(q, null);
            renderFilterChips(); // Update chips to show "Todos" active
            navigateTo('search');
            return;
        }
    });


    function init() {
        renderFilterChips();
        renderHome();
        renderSearch();
        renderCategories();
        renderFavorites();
        renderProfile();
        renderSearchHistory();

        // Default view if no params handle it
        if (!handleURLParams()) {
            navigateTo('home');
        }

        document.getElementById('cat-library-back').addEventListener('click', () => navigateTo('categories', true));
        document.getElementById('all-library-back').addEventListener('click', () => navigateTo('home', true));

        const historyBtn = $('search-history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                navigateTo('search-history');
            });
        }

        // ── Buscador ──
        const searchInputEl = $('search-input');
        const searchClearEl = $('search-clear');

        if (searchInputEl && searchClearEl) {
            searchInputEl.setAttribute('type', 'text');
            searchInputEl.addEventListener('search', (e) => e.preventDefault());

            searchInputEl.addEventListener('input', debounce(e => {
                const q = e.target.value;
                searchClearEl.classList.toggle('visible', q.length > 0);
                
                if (q.length > 0 && state.catFilter) {
                    state.catFilter = null;
                    renderFilterChips();
                }

                renderSearch(q, state.catFilter);
                if (state.view === 'search-history') navigateTo('search');
                if (state.view === 'search') {
                    updateURL({ view: 'search', q: q, cat: state.catFilter });
                }
            }, 300));

            searchInputEl.addEventListener('blur', () => {
                const q = searchInputEl.value.trim();
                if (q.length >= 2) addToSearchHistory(q);
            });

            searchInputEl.addEventListener('focus', () => {
                if (!searchInputEl.value.trim()) renderSearchHistory();
            });

            searchClearEl.addEventListener('click', () => {
                searchInputEl.value = '';
                searchClearEl.classList.remove('visible');
                renderSearch('', state.catFilter);
                renderSearchHistory();
                if (state.view === 'search') {
                    updateURL({ view: 'search', q: '', cat: state.catFilter });
                }
                searchInputEl.focus();
            });
        }

        const clearHistoryDedicated = $('search-history-clear-dedicated');
        if (clearHistoryDedicated) {
            clearHistoryDedicated.addEventListener('click', () => {
                if (searchHistory.length === 0) return;
                openHistoryClearModal();
            });
        }

        const hClearCancel = $('history-clear-cancel');
        if (hClearCancel) hClearCancel.addEventListener('click', closeHistoryClearModal);

        const hClearConfirm = $('history-clear-confirm');
        if (hClearConfirm) hClearConfirm.addEventListener('click', clearSearchHistory);

        const hClearOverlay = $('history-clear-confirm-overlay');
        if (hClearOverlay) {
            hClearOverlay.addEventListener('click', (e) => {
                if (e.target === hClearOverlay) closeHistoryClearModal();
            });
        }

        // Modal eliminación individual
        const hSingleCancel = $('history-single-cancel');
        if (hSingleCancel) hSingleCancel.addEventListener('click', closeSingleHistoryDeleteModal);

        const hSingleConfirm = $('history-single-confirm');
        if (hSingleConfirm) {
            hSingleConfirm.addEventListener('click', () => {
                if (_pendingHistoryDeleteQuery) {
                    removeFromSearchHistory(_pendingHistoryDeleteQuery);
                    closeSingleHistoryDeleteModal();
                }
            });
        }

        const hSingleOverlay = $('history-single-confirm-overlay');
        if (hSingleOverlay) {
            hSingleOverlay.addEventListener('click', (e) => {
                if (e.target === hSingleOverlay) closeSingleHistoryDeleteModal();
            });
        }

        // Toggle H desde perfil — con modal de confirmación
        function applyHToggle() {
            saveHEnabled();
            renderProfile();
            renderCategories();
            renderFilterChips();
            renderHome();
            renderSearch($('search-input').value, state.catFilter);
            renderFavorites();
            // Si la vista actual es cat-library de H y se desactivó, volver a categorías
            if (!hCatEnabled && state.view === 'cat-library' && state.catFilter === 'H') {
                navigateTo('categories', true);
            }
            // Si la vista actual es all-library, refrescar
            if (state.view === 'all-library') renderAllLibrary();
        }

        document.getElementById('h-toggle-item').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (hCatEnabled) {
                hCatEnabled = false;
                applyHToggle();
            } else {
                const o = $('h-confirm-overlay');
                o.classList.add('open');
                o.setAttribute('aria-hidden', 'false');
            }

            return false;
        });

        document.getElementById('h-confirm-accept').addEventListener('click', () => {
            hCatEnabled = true;
            const o = $('h-confirm-overlay');
            o.classList.remove('open');
            o.setAttribute('aria-hidden', 'true');
            applyHToggle();
        });

        document.getElementById('h-confirm-cancel').addEventListener('click', () => {
            const o = $('h-confirm-overlay');
            o.classList.remove('open');
            o.setAttribute('aria-hidden', 'true');
        });

        $('h-confirm-overlay').addEventListener('click', e => {
            if (e.target === $('h-confirm-overlay')) {
                $('h-confirm-overlay').classList.remove('open');
                $('h-confirm-overlay').setAttribute('aria-hidden', 'true');
            }
        });

        // ── Modal Confirmar Eliminación ──────────────────────────
        $('remove-confirm-cancel').addEventListener('click', closeRemoveConfirm);
        $('remove-confirm-overlay').addEventListener('click', e => {
            if (e.target === $('remove-confirm-overlay')) closeRemoveConfirm();
        });

        // Checkboxes del modal de eliminación
        document.getElementById('remove-opt-fav').addEventListener('click', () => {
            _removeSelFav = !_removeSelFav;
            document.getElementById('remove-chk-fav').classList.toggle('checked', _removeSelFav);
            _updateRemoveAcceptBtn();
        });
        document.getElementById('remove-opt-ws').addEventListener('click', () => {
            _removeSelWs = !_removeSelWs;
            document.getElementById('remove-chk-ws').classList.toggle('checked', _removeSelWs);
            _updateRemoveAcceptBtn();
        });

        $('remove-confirm-accept').addEventListener('click', () => {
            if (_removeTargetId === null) return;
            if (_removeSelFav) {
                favs = favs.filter(f => f !== _removeTargetId);
                saveFavs();
            }
            if (_removeSelWs) {
                delete watchStatus[_removeTargetId];
                saveWatchStatus();
            }
            closeRemoveConfirm();
            renderFavorites();
            renderProfile();
        });
        // ────────────────────────────────────────────────────────



        // Trigger secreto: 5 taps en el título "Explorar"
        let hTaps = 0, hTimer;
        const catTitle = document.getElementById('cat-page-title');
        if (catTitle) {
            catTitle.addEventListener('click', () => {
                hTaps++;
                clearTimeout(hTimer);
                hTimer = setTimeout(() => { hTaps = 0; }, 1500);
                if (hTaps >= 5) {
                    hTaps = 0;
                    hCatEnabled = !hCatEnabled;
                    applyHToggle();
                }
            });
        }

        // Toggles en perfil
        const hToggle = $('h-toggle-item');
        if (hToggle) {
            hToggle.addEventListener('click', () => {
                hCatEnabled = !hCatEnabled;
                applyHToggle();
            });
        }


        // Administración de datos
        const clearFavsBtn = $('clear-favs-btn');
        if (clearFavsBtn) clearFavsBtn.addEventListener('click', clearFavorites);

        const clearWatchedBtn = $('clear-watched-btn');
        if (clearWatchedBtn) clearWatchedBtn.addEventListener('click', clearWatchHistory);

        const exportDataBtn = $('export-data-btn');
        if (exportDataBtn) exportDataBtn.addEventListener('click', exportUserData);

        const importDataBtn = $('import-data-btn');
        if (importDataBtn) importDataBtn.addEventListener('click', importUserData);

        // Backup por texto
        const bkCreateBtn = $('backup-create-btn');
        if (bkCreateBtn) bkCreateBtn.addEventListener('click', generateTextBackup);

        const bkRestoreBtn = $('backup-restore-btn');
        if (bkRestoreBtn) bkRestoreBtn.addEventListener('click', () => openModal('restore-text-overlay'));

        // Historial de búsqueda en ajustes


        const bkCloseBtn = $('backup-close-btn');
        if (bkCloseBtn) bkCloseBtn.addEventListener('click', () => closeModal('backup-text-overlay'));

        const rsCloseBtn = $('restore-close-btn');
        if (rsCloseBtn) rsCloseBtn.addEventListener('click', () => closeModal('restore-text-overlay'));

        const bkCopyBtn = $('backup-copy-btn');
        if (bkCopyBtn) {
            bkCopyBtn.addEventListener('click', () => {
                const area = $('backup-text-area');
                if (area) {
                    area.select();
                    document.execCommand('copy');
                    showToast('Copiado al portapapeles');
                }
            });
        }

        const rsSubmitBtn = $('restore-submit-btn');
        if (rsSubmitBtn) rsSubmitBtn.addEventListener('click', restoreFromTextBackup);

        // Categorías - Click en cards
        const catGrid = $('cat-grid');
        if (catGrid) {
            catGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.cat-card');
                if (card) {
                    const cat = card.dataset.cat;
                    navigateTo('cat-library', { cat });
                }
            });
        }

        // Sidebar Help -> Tutorial Sub-view
        const helpBtn = $('help-backup-btn');
        if (helpBtn) helpBtn.addEventListener('click', () => navigateTo('settings-help'));

        // Cerrar modales al hacer clic fuera
        ['backup-text-overlay', 'restore-text-overlay', 'h-confirm-overlay'].forEach(id => {
            const o = $(id);
            if (o) o.addEventListener('click', e => { if (e.target === o) closeModal(id); });
        });

        // Garantizar carga perezosa inicial
        setTimeout(observeImages, 300);
    }

    init();
})();
