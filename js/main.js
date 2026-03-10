/* ===========================
   太陽光発電所ギャラリー - JavaScript
   =========================== */

// ===========================
// データ管理
// ===========================
let allPlants = [];
let filteredPlants = [];
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'ac_output_desc';
let hasStatsAnimated = false;

// ===========================
// 初期化
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlants();
    setupEventListeners();
    renderHeroStats();
    setHeroBg();
    renderStats();
    renderGallery();
});

// ===========================
// API通信
// ===========================
async function loadPlants() {
    try {
        const response = await fetch('data.json');
        const result = await response.json();
        const rawPlants = result.data || [];

        // AC出力に基づくカテゴリの自動判定
        allPlants = rawPlants.map(plant => {
            const ac = plant.ac_output || 0;
            let category = '低圧';
            if (ac >= 2000) {
                category = '特別高圧';
            } else if (ac >= 50) {
                category = '高圧';
            }
            return { ...plant, category };
        });

        filteredPlants = [...allPlants];
    } catch (error) {
        console.error('データの取得に失敗しました:', error);
        allPlants = [];
        filteredPlants = [];
    }
}

// ===========================
// ユーティリティ
// ===========================

/**
 * HTMLエスケープ — XSS対策の基本
 * APIから取得した文字列をinnerHTMLに埋め込む前に必ず通す
 */
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * URL検証 — image_url等の外部URLが安全かチェック
 * https: のみ許可し、javascript: 等を拒否
 */
function sanitizeURL(url) {
    if (!url) return '';
    // 相対パス（images/...など）はそのまま返す
    if (!url.includes('://') && !url.startsWith('//')) {
        return url;
    }
    try {
        const parsed = new URL(url, location.origin);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'file:') {
            return parsed.href;
        }
    } catch (e) { /* 無効なURL */ }
    return '';
}

function formatNumber(num) {
    if (num == null) return '0';
    return Math.floor(num).toLocaleString('ja-JP');
}

function formatPower(kw) {
    if (kw >= 1000) {
        return (kw / 1000).toFixed(3) + ' MW';
    }
    return kw.toLocaleString('ja-JP') + ' kW';
}

function formatArea(sqm) {
    if (sqm >= 10000) {
        return (sqm / 10000).toFixed(3) + ' ha';
    }
    return sqm.toLocaleString('ja-JP') + ' ㎡';
}
function calculateTotals(plants) {
    return plants.reduce((totals, plant) => {
        totals.totalAC += Number(plant.ac_output) || 0;
        totals.totalDC += Number(plant.dc_output) || 0;
        totals.totalPanels += Number(plant.panel_count) || 0;
        return totals;
    }, { totalAC: 0, totalDC: 0, totalPanels: 0 });
}

/**
 * カウントアップアニメーション
 * @param {HTMLElement} el - 対象のエレメント
 * @param {number} target - 目標数値
 * @param {number} duration - アニメーション時間(ms)
 * @param {number} decimals - 小数点以下の桁数
 */
function animateCount(el, target, duration = 1500, decimals = 0) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // イージング関数 (Cubic Out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = easeProgress * target;

        if (decimals > 0) {
            el.innerHTML = current.toFixed(decimals);
        } else {
            el.innerHTML = Math.floor(current).toLocaleString('ja-JP');
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function getCategoryBadgeClass(category) {
    switch (category) {
        case '特別高圧': return 'extra-high';
        case '高圧': return 'high';
        case '低圧': return 'low';
        default: return 'extra-high';
    }
}

// ===========================
// ヒーロー統計
// ===========================
function renderHeroStats() {
    const totalPlants = allPlants.length;
    const { totalAC, totalDC, totalPanels } = calculateTotals(allPlants);

    const heroFigures = document.getElementById('heroFigures');

    // まず枠組みだけを描画
    heroFigures.innerHTML = `
        <div class="hero-fig">
            <span class="hero-fig-label">Sites</span>
            <span class="hero-fig-value"><span id="count-sites">0</span><span class="hero-fig-unit">カ所</span></span>
        </div>
        <div class="hero-fig">
            <span class="hero-fig-label">Total AC</span>
            <span class="hero-fig-value"><span id="count-ac">0</span><span class="hero-fig-unit">MW</span></span>
        </div>
        <div class="hero-fig">
            <span class="hero-fig-label">Total DC</span>
            <span class="hero-fig-value"><span id="count-dc">0</span><span class="hero-fig-unit">MW</span></span>
        </div>
        <div class="hero-fig">
            <span class="hero-fig-label">Panels</span>
            <span class="hero-fig-value"><span id="count-panels">0</span><span class="hero-fig-unit">枚</span></span>
        </div>
    `;

    // アニメーションを開始 (0.1秒待ってから開始することで、より「動き出し」を感じやすくする)
    setTimeout(() => {
        animateCount(document.getElementById('count-sites'), totalPlants, 1500, 0);
        animateCount(document.getElementById('count-ac'), totalAC / 1000, 1800, 2);
        animateCount(document.getElementById('count-dc'), totalDC / 1000, 2000, 2);
        animateCount(document.getElementById('count-panels'), totalPanels, 2200, 0);
    }, 100);
}

// ===========================
// ヒーロー背景画像
// ===========================
function setHeroBg() {
    const safeUrl = 'images/wake1.jpg';
    document.querySelector('.hero-bg').style.setProperty('--hero-bg-url', `url(${safeUrl})`);
}

// ===========================
// 統計セクション
// ===========================
function renderStats() {
    const { totalAC, totalDC, totalPanels } = calculateTotals(allPlants);

    const cats = [
        { key: '特別高圧', cls: 'extra-high' },
        { key: '高圧', cls: 'high' },
        { key: '低圧', cls: 'low' }
    ].map(c => {
        const items = allPlants.filter(p => p.category === c.key);
        return {
            ...c,
            count: items.length,
            ac: items.reduce((s, p) => s + (p.ac_output || 0), 0),
            dc: items.reduce((s, p) => s + (p.dc_output || 0), 0),
        };
    });

    // --- KPI ---
    document.getElementById('kpiRow').innerHTML = `
        <div class="kpi-item">
            <span class="kpi-label">総AC出力</span>
            <span class="kpi-value"><span id="stat-kpi-ac">0</span><span class="kpi-sub">MW</span></span>
        </div>
        <div class="kpi-item">
            <span class="kpi-label">総DC出力</span>
            <span class="kpi-value"><span id="stat-kpi-dc">0</span><span class="kpi-sub">MW</span></span>
        </div>
        <div class="kpi-item">
            <span class="kpi-label">総パネル枚数</span>
            <span class="kpi-value"><span id="stat-kpi-panels">0</span><span class="kpi-sub">枚</span></span>
        </div>
    `;

    // --- 横バーチャート（AC出力上位5） ---
    const top5 = [...allPlants].sort((a, b) => (b.ac_output || 0) - (a.ac_output || 0)).slice(0, 5);
    const maxAC = top5.length ? top5[0].ac_output : 1;

    document.getElementById('barChart').innerHTML = top5.map((p, i) => {
        const pct = Math.round((p.ac_output / maxAC) * 100);
        const safeName = escapeHTML(p.name);
        return `
            <div class="bar-row">
                <div class="bar-label-line">
                    <span class="bar-rank">${i + 1}</span>
                    <span class="bar-name" title="${safeName}">${safeName}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:0%" data-target-width="${pct}%"></div></div>
                </div>
                <span class="bar-val" id="stat-bar-val-${i}">0</span>
            </div>`;
    }).join('');

    // --- 構成比バー ---
    const total = allPlants.length || 1;
    document.getElementById('compositionBar').innerHTML = `
        <div class="composition-bar">
            ${cats.map(c => {
        const pct = ((c.count / total) * 100).toFixed(2);
        return `<div class="comp-seg ${c.cls}" style="width:0%" data-target-width="${pct}%">${pct > 12 ? pct + '%' : ''}</div>`;
    }).join('')}
        </div>
        <div class="comp-legend">
            ${cats.map(c => `
                <span class="comp-legend-item">
                    <span class="comp-dot ${c.cls}"></span>${escapeHTML(c.key)}（<span id="stat-cat-count-${c.cls}">0</span>件）
                </span>
            `).join('')}
        </div>
    `;

    // --- テーブル ---
    document.getElementById('statsTableBody').innerHTML =
        cats.map(c => `
            <tr>
                <td><span class="cat-indicator ${c.cls}"></span>${escapeHTML(c.key)}</td>
                <td class="num"><span id="stat-tab-count-${c.cls}">0</span></td>
                <td class="num"><span id="stat-tab-ac-${c.cls}">0</span> MW</td>
                <td class="num"><span id="stat-tab-dc-${c.cls}">0</span> MW</td>
            </tr>
        `).join('') + `
            <tr>
                <td>合計</td>
                <td class="num"><span id="stat-tab-total-count">0</span></td>
                <td class="num"><span id="stat-tab-total-ac">0</span> MW</td>
                <td class="num"><span id="stat-tab-total-dc">0</span> MW</td>
            </tr>
        `;

    // アニメーション実行用の関数として独立
    hasStatsAnimated = false; // 二重実行防止
    const statsTarget = document.getElementById('stats');
    if (statsTarget) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !hasStatsAnimated) {
                    hasStatsAnimated = true;
                    startStatsAnimation(totalAC, totalDC, totalPanels, top5, cats);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 }); // 10%見えたら開始
        statsObserver.observe(statsTarget);
    }
}

/**
 * 統計セクションのアニメーション開始
 */
function startStatsAnimation(totalAC, totalDC, totalPanels, top5, cats) {
    // KPI
    animateCount(document.getElementById('stat-kpi-ac'), totalAC / 1000, 1800, 2);
    animateCount(document.getElementById('stat-kpi-dc'), totalDC / 1000, 2000, 2);
    animateCount(document.getElementById('stat-kpi-panels'), totalPanels, 2200, 0);

    // バーチャート
    top5.forEach((p, i) => {
        const rows = document.querySelectorAll('#barChart .bar-row');
        if (rows[i]) {
            const fill = rows[i].querySelector('.bar-fill');
            fill.style.width = fill.dataset.targetWidth;
            animateCount(document.getElementById(`stat-bar-val-${i}`), p.ac_output / 1000, 1500 + i * 200, 2);
        }
    });

    // 構成比
    document.querySelectorAll('.composition-bar .comp-seg').forEach(seg => {
        seg.style.width = seg.dataset.targetWidth;
    });
    cats.forEach(c => {
        const countEl = document.getElementById(`stat-cat-count-${c.cls}`);
        const tabCountEl = document.getElementById(`stat-tab-count-${c.cls}`);
        const tabAcEl = document.getElementById(`stat-tab-ac-${c.cls}`);
        const tabDcEl = document.getElementById(`stat-tab-dc-${c.cls}`);

        if (countEl) animateCount(countEl, c.count, 1500, 0);
        if (tabCountEl) animateCount(tabCountEl, c.count, 1500, 0);
        if (tabAcEl) animateCount(tabAcEl, c.ac / 1000, 1800, 2);
        if (tabDcEl) animateCount(tabDcEl, c.dc / 1000, 2000, 2);
    });

    // テーブル合計
    animateCount(document.getElementById('stat-tab-total-count'), allPlants.length, 1500, 0);
    animateCount(document.getElementById('stat-tab-total-ac'), totalAC / 1000, 1800, 2);
    animateCount(document.getElementById('stat-tab-total-dc'), totalDC / 1000, 2000, 2);
}


// ===========================
// ギャラリー描画
// ===========================
function renderGallery() {
    applyFilters();

    const grid = document.getElementById('galleryGrid');
    const noResults = document.getElementById('noResults');
    const resultCount = document.getElementById('resultCount');

    resultCount.textContent = filteredPlants.length;

    if (filteredPlants.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    grid.innerHTML = filteredPlants.map((plant, index) => {
        const safeId = escapeHTML(plant.id);
        const safeName = escapeHTML(plant.name);
        const safeLocation = escapeHTML(plant.location);
        const safeCategory = escapeHTML(plant.category);
        const safeImage = sanitizeURL(plant.image_url);

        return `
        <div class="plant-card" data-plant-id="${safeId}" style="animation-delay: ${index * 0.05}s">
            <div class="card-image-wrapper">
                <img src="${safeImage}" alt="${safeName}" class="card-image" loading="lazy">
                    <div class="card-overlay"></div>
                    <span class="card-badge ${getCategoryBadgeClass(plant.category)}">${safeCategory}</span>
                    <div class="card-click-hint">
                        <i class="fas fa-expand"></i>
                    </div>
                    <div class="card-info-overlay">
                        <h3 class="card-name">${safeName}</h3>
                        <p class="card-location">
                            <i class="fas fa-map-marker-alt"></i> ${safeLocation}
                        </p>
                        <div class="card-specs">
                            <div class="card-spec">
                                <span class="card-spec-label">AC出力</span>
                                <span class="card-spec-value">${escapeHTML(formatPower(plant.ac_output))}</span>
                            </div>
                            <div class="card-spec">
                                <span class="card-spec-label">DC出力</span>
                                <span class="card-spec-value">${escapeHTML(formatPower(plant.dc_output))}</span>
                            </div>
                            <div class="card-spec">
                                <span class="card-spec-label">パネル</span>
                                <span class="card-spec-value">${escapeHTML(formatNumber(plant.panel_count))}枚</span>
                            </div>
                        </div>
                    </div>
            </div>
        </div>`;
    }).join('');
}

// ===========================
// フィルター・ソート
// ===========================
function applyFilters() {
    filteredPlants = allPlants.filter(plant => {
        // カテゴリフィルター
        if (currentFilter !== 'all' && plant.category !== currentFilter) {
            return false;
        }
        // 検索フィルター
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            return (
                (plant.name || '').toLowerCase().includes(query) ||
                (plant.location || '').toLowerCase().includes(query) ||
                (plant.description || '').toLowerCase().includes(query)
            );
        }
        return true;
    });

    // ソート
    const categoryOrder = { '特別高圧': 0, '高圧': 1, '低圧': 2 };
    filteredPlants.sort((a, b) => {
        switch (currentSort) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '', 'ja');
            case 'category_desc': {
                const diff = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
                return diff !== 0 ? diff : (b.ac_output || 0) - (a.ac_output || 0);
            }
            case 'category_asc': {
                const diff = (categoryOrder[b.category] ?? -1) - (categoryOrder[a.category] ?? -1);
                return diff !== 0 ? diff : (a.ac_output || 0) - (b.ac_output || 0);
            }
            case 'ac_output_desc':
                return (b.ac_output || 0) - (a.ac_output || 0);
            case 'ac_output_asc':
                return (a.ac_output || 0) - (b.ac_output || 0);
            case 'completion_date':
                return (b.completion_date || '').localeCompare(a.completion_date || '');
            default:
                return 0;
        }
    });
}

// ===========================
// モーダル
// ===========================
function openModal(plantId) {
    const plant = allPlants.find(p => p.id === plantId);
    if (!plant) return;

    const ratio = plant.ac_output > 0
        ? (plant.dc_output / plant.ac_output).toFixed(3)
        : '-';

    const safeImage = sanitizeURL(plant.image_url);
    document.getElementById('modalImage').src = safeImage;
    document.getElementById('modalImage').alt = escapeHTML(plant.name);
    document.getElementById('modalTitle').textContent = plant.name;
    document.getElementById('modalLocation').querySelector('span').textContent = plant.location;
    document.getElementById('modalAC').textContent = formatPower(plant.ac_output);
    document.getElementById('modalDC').textContent = formatPower(plant.dc_output);
    document.getElementById('modalPanels').textContent = formatNumber(plant.panel_count) + '枚';
    document.getElementById('modalDate').textContent = plant.completion_date;
    document.getElementById('modalRatio').textContent = ratio;
    document.getElementById('modalDescription').textContent = plant.description;

    const badge = document.getElementById('modalBadge');
    badge.textContent = plant.category;
    badge.className = `modal-badge ${getCategoryBadgeClass(plant.category)}`;

    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ===========================
// イベントリスナー
// ===========================
function setupEventListeners() {
    // フィルターボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGallery();
        });
    });

    // 検索
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            renderGallery();
        }, 300);
    });

    // ソート
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderGallery();
    });

    // ギャラリーカードのクリック（イベント委譲）
    document.getElementById('galleryGrid').addEventListener('click', (e) => {
        const card = e.target.closest('.plant-card');
        if (card && card.dataset.plantId) {
            openModal(card.dataset.plantId);
        }
    });

    // モーダル閉じる
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            closeModal();
        }
    });

    // ESCキー
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // スムーズスクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}
