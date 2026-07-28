let currentShippingSearch = '';
let currentShippingItemFilter = 'available';
let currentShippingItemTypeFilter = 'all';
let currentShippingArrivalSearch = '';
let currentShippingArrivalFilter = 'all';
let currentShippingArrivalPlateFilter = 'all';

const SHIPPING_ITEM_TYPE_FILTER_VALUES = new Set(['all', 'regular', 'gift']);
const SHIPPING_ARRIVAL_FILTER_VALUES = new Set(['all', 'regular', 'gift', 'ready', 'pending', 'unclaimed']);

function initShippingPage() {
    const input = document.getElementById('shippingCnInput');
    if (input) {
        input.addEventListener('keypress', event => {
            if (event.key === 'Enter') searchShippingCN();
        });
    }
    const arrivalInput = document.getElementById('shippingArrivalSearchInput');
    if (arrivalInput) {
        arrivalInput.addEventListener('keypress', event => {
            if (event.key === 'Enter') searchShippingArrival();
        });
    }
    renderShippingPage();
}

function renderShippingPage() {
    const container = document.getElementById('shipping-container');
    const requestList = document.getElementById('shipping-request-list');
    if (!container || !requestList) return;
    renderShippingArrivalPage();

    if (!currentShippingSearch) {
        container.innerHTML = '<div class="shipping-empty">请输入 CN 后查看你的到货和排发状态。</div>';
        requestList.innerHTML = '';
        updateShippingStats([]);
        return;
    }

    const matchedCNs = getMatchedShippingCNs(currentShippingSearch);
    if (!matchedCNs.length) {
        container.innerHTML = `<div class="shipping-empty">没有查询到包含【${currentShippingSearch}】的认领记录。</div>`;
        requestList.innerHTML = '';
        updateShippingStats([]);
        return;
    }

    const allItems = matchedCNs.flatMap(cn => buildShippingItemsForCn(cn));
    updateShippingStats(allItems);
    container.innerHTML = matchedCNs.map(cn => renderShippingCnPanel(cn)).join('');
    renderShippingRequests(matchedCNs);
}

function getMatchedShippingCNs(keyword) {
    const normalizedKeyword = normalizeShippingClaimerName(keyword).toLowerCase();
    const matched = new Set();
    const entries = typeof getWorkspaceIndexedEntries === 'function'
        ? getWorkspaceIndexedEntries(guziData || [], { scope: CLIENT_SHIPPING_SCOPE })
        : (guziData || []).map((item, index) => ({ item, index }));
    entries.forEach(entry => {
        const item = entry.item;
        (item.claimers || []).forEach(claimer => {
            const baseCn = normalizeShippingClaimerName(claimer);
            if (baseCn && baseCn.toLowerCase().includes(normalizedKeyword)) {
                matched.add(baseCn);
            }
        });
    });
    return Array.from(matched).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function updateShippingStats(items) {
    const claimed = items.reduce((sum, item) => sum + item.claimedQuantity, 0);
    const arrived = items.reduce((sum, item) => sum + Math.min(item.claimedQuantity, item.arrivedQuantity), 0);
    const available = items.reduce((sum, item) => sum + item.availableQuantity, 0);
    const shipped = items.reduce((sum, item) => sum + item.shippedQuantity, 0);

    setShippingText('shippingClaimedCount', claimed);
    setShippingText('shippingArrivedCount', arrived);
    setShippingText('shippingAvailableCount', available);
    setShippingText('shippingShippedCount', shipped);
}

function setShippingText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setShippingItemFilter(filter) {
    currentShippingItemFilter = filter === 'arrived' ? 'available' : filter;
    renderShippingPage();
}

function setShippingItemTypeFilter(filter) {
    currentShippingItemTypeFilter = SHIPPING_ITEM_TYPE_FILTER_VALUES.has(filter) ? filter : 'all';
    renderShippingPage();
}

function setShippingArrivalFilter(filter) {
    currentShippingArrivalFilter = SHIPPING_ARRIVAL_FILTER_VALUES.has(filter) ? filter : 'all';
    renderShippingArrivalPage();
}

function setShippingArrivalPlateFilter(filter) {
    currentShippingArrivalPlateFilter = String(filter || '').trim() || 'all';
    renderShippingArrivalPage();
}

function getShippingItemArrivedForCn(item) {
    return Math.max(Math.min(Number(item.claimedQuantity || 0), Number(item.arrivedQuantity || 0)), 0);
}

function getShippingItemStatus(item) {
    const arrivedForCn = getShippingItemArrivedForCn(item);
    if (item.availableQuantity > 0) {
        return {
            className: 'ready',
            text: '可申请'
        };
    }
    if (item.pendingQuantity > 0) {
        return {
            className: 'pending',
            text: '已申请'
        };
    }
    if (item.receivedQuantity > 0) {
        return {
            className: 'received',
            text: '已收货'
        };
    }
    if (item.shippedQuantity > 0) {
        return {
            className: 'shipped',
            text: '排发中'
        };
    }
    if (arrivedForCn > 0) {
        return {
            className: 'ready',
            text: '已到货'
        };
    }
    return {
        className: 'waiting',
        text: '未到货'
    };
}

function getShippingItemDisplayQuantity(item) {
    const arrivedForCn = getShippingItemArrivedForCn(item);
    if (item.availableQuantity > 0) return item.availableQuantity;
    if (item.pendingQuantity > 0) return item.pendingQuantity;
    if (item.receivedQuantity > 0) return item.receivedQuantity;
    if (item.shippedQuantity > 0) return item.shippedQuantity;
    if (arrivedForCn > 0) return arrivedForCn;
    return Math.max(Number(item.claimedQuantity || 0), 0);
}

function getShippingItemTypeFilterValue(item) {
    let isGift = !!item && (!!item.isGift || item.itemType === 'gift' || String(item.category || '').includes('赠品'));
    if (!isGift && item && Number.isFinite(Number(item.itemIndex)) && typeof guziData !== 'undefined' && Array.isArray(guziData)) {
        const sourceItem = guziData[Number(item.itemIndex)];
        isGift = !!sourceItem && (sourceItem.itemType === 'gift' || String(sourceItem.category || '').includes('赠品'));
    }
    return isGift ? 'gift' : 'regular';
}

function applyShippingItemStatusFilter(items, filter = currentShippingItemFilter) {
    const source = Array.isArray(items) ? items : [];
    const normalizedFilter = filter === 'arrived' ? 'available' : filter;
    if (normalizedFilter === 'available') {
        return source.filter(item => item.availableQuantity > 0);
    }
    if (normalizedFilter === 'unarrived') {
        return source.filter(item => getShippingItemArrivedForCn(item) <= 0);
    }
    if (normalizedFilter === 'pending') {
        return source.filter(item => item.pendingQuantity > 0);
    }
    if (normalizedFilter === 'shipped') {
        return source.filter(item => item.shippedQuantity > 0);
    }
    if (normalizedFilter === 'received') {
        return source.filter(item => item.receivedQuantity > 0);
    }
    return source;
}

function applyShippingItemTypeFilter(items, filter = currentShippingItemTypeFilter) {
    const source = Array.isArray(items) ? items : [];
    if (filter === 'regular' || filter === 'gift') {
        return source.filter(item => getShippingItemTypeFilterValue(item) === filter);
    }
    return source;
}

function getShippingVisibleItems(items) {
    return applyShippingItemTypeFilter(applyShippingItemStatusFilter(items));
}

function renderShippingItemFilters(items) {
    const source = Array.isArray(items) ? items : [];
    const typeFilteredSource = applyShippingItemTypeFilter(source);
    const statusFilteredSource = applyShippingItemStatusFilter(source);
    const filters = [
        { value: 'all', label: '全部', count: typeFilteredSource.length },
        { value: 'available', label: '可申请', count: applyShippingItemStatusFilter(typeFilteredSource, 'available').length },
        { value: 'unarrived', label: '未到货', count: applyShippingItemStatusFilter(typeFilteredSource, 'unarrived').length },
        { value: 'pending', label: '已申请', count: applyShippingItemStatusFilter(typeFilteredSource, 'pending').length },
        { value: 'shipped', label: '排发中', count: applyShippingItemStatusFilter(typeFilteredSource, 'shipped').length },
        { value: 'received', label: '已收货', count: applyShippingItemStatusFilter(typeFilteredSource, 'received').length }
    ];
    const typeFilters = [
        { value: 'all', label: '全部类型', count: statusFilteredSource.length },
        { value: 'regular', label: '普通', count: applyShippingItemTypeFilter(statusFilteredSource, 'regular').length },
        { value: 'gift', label: '赠品', count: applyShippingItemTypeFilter(statusFilteredSource, 'gift').length }
    ];

    return `
        <div class="shipping-filter-stack">
            <div class="shipping-filter-group">
                <span class="shipping-filter-label">状态</span>
                <div class="shipping-filter-toolbar">
                    ${filters.map(filter => `
                        <button type="button" class="shipping-filter-chip ${currentShippingItemFilter === filter.value ? 'active' : ''}" onclick="setShippingItemFilter('${filter.value}')">
                            <span>${filter.label}</span>
                            <em>${filter.count}</em>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="shipping-filter-group">
                <span class="shipping-filter-label">类型</span>
                <div class="shipping-filter-toolbar shipping-type-filter-toolbar">
                    ${typeFilters.map(filter => `
                        <button type="button" class="shipping-filter-chip ${currentShippingItemTypeFilter === filter.value ? 'active' : ''}" onclick="setShippingItemTypeFilter('${filter.value}')">
                            <span>${filter.label}</span>
                            <em>${filter.count}</em>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderShippingCnPanel(cn) {
    const items = buildShippingItemsForCn(cn);
    const claimed = items.reduce((sum, item) => sum + item.claimedQuantity, 0);
    const available = items.reduce((sum, item) => sum + item.availableQuantity, 0);
    const pending = items.reduce((sum, item) => sum + item.pendingQuantity, 0);
    const shipped = items.reduce((sum, item) => sum + item.shippedQuantity, 0);

    return `
        <section class="shipping-cn-panel" data-shipping-cn="${cn}">
            <div class="shipping-panel-head">
                <div>
                    <div class="shipping-panel-kicker">排发对象</div>
                    <h3>${cn}</h3>
                </div>
                <div class="shipping-panel-summary">
                    <span>认领 ${claimed}</span>
                    <span>可申请 ${available}</span>
                    <span>待处理 ${pending}</span>
                    <span>已排 ${shipped}</span>
                </div>
            </div>
            ${renderShippingItems(cn, items)}
        </section>
    `;
}

function renderShippingItems(cn, items) {
    if (!items.length) {
        return `<div class="shipping-empty compact">没有查询到【${cn}】的认领记录。</div>`;
    }

    const visibleItems = getShippingVisibleItems(items);

    return `
        <div class="shipping-toolbar">
            <label class="shipping-check-all">
                <input type="checkbox" onchange="toggleShippingSelectAll('${cn}', this.checked)">
                勾选【${cn}】全部可申请排发的谷子
            </label>
            <button class="btn shipping-submit-btn" onclick="submitShippingRequest('${cn}')">提交 ${cn} 的排发申请</button>
        </div>
        ${renderShippingItemFilters(items)}
        <div class="shipping-grid">
            ${visibleItems.length ? visibleItems.map(item => renderShippingItemCard(cn, item)).join('') : '<div class="shipping-empty compact">当前筛选下没有符合条件的谷子。</div>'}
        </div>
    `;
}

function renderShippingItemCard(cn, item) {
    const disabled = item.availableQuantity <= 0 ? 'disabled' : '';
    const status = getShippingItemStatus(item);
    const statusText = status.text;
    const statusClass = status.className;
    const displayQuantity = getShippingItemDisplayQuantity(item);
    const typeLabel = item.isGift || item.itemType === 'gift' ? '赠品' : '普通';
    const plateName = escapeShippingHtml(item.plateName || '未分盘');
    const typeStyle = item.isGift || item.itemType === 'gift'
        ? 'background:color-mix(in srgb, var(--warning-color) 16%, var(--container-bg) 84%);color:var(--warning-color);'
        : 'background:var(--secondary-bg);color:var(--text-secondary);';

    return `
        <label class="shipping-card ${statusClass}">
            <input type="checkbox" class="shipping-item-check" data-shipping-cn="${cn}" value="${item.itemIndex}" ${disabled}>
            <span class="shipping-card-select" aria-hidden="true"></span>
            <div class="shipping-img">
                <img src="${item.imgSrc}" alt="${item.category}" onclick="event.preventDefault(); openImgModal(this.src)" onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
            </div>
            <div class="shipping-card-body">
                <div class="shipping-card-copy">
                    <div class="shipping-card-tags">
                        <span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;line-height:1.2;${typeStyle}">${typeLabel}</span>
                        <span class="shipping-card-plate">${plateName}</span>
                    </div>
                    <div class="shipping-card-title">${item.category}</div>
                    <div class="shipping-card-state ${statusClass}" aria-label="状态：${statusText}">
                        <span class="shipping-card-state-dot" aria-hidden="true"></span>
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="shipping-available" aria-label="${statusText} ${displayQuantity} 点">
                    <strong>${displayQuantity}</strong>
                    <span>点</span>
                </div>
            </div>
        </label>
    `;
}

function getShippingArrivalOverviewItems(keyword = '') {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    const entries = typeof getWorkspaceIndexedEntries === 'function'
        ? getWorkspaceIndexedEntries(guziData || [], { scope: 'group' })
        : (guziData || []).map((item, index) => ({ item, index }));
    return entries
        .map(({ item, index }) => {
            if (!item) return null;
            const isGift = isShippingGiftItem(item);
            const typeLabel = isGift ? '赠品' : '普通';
            const plateName = String(item.plateName || '').trim() || '未分盘';
            const plateId = String(item.plateId || '').trim() || `plate-name:${plateName}`;
            const claimers = Array.isArray(item.claimers) ? item.claimers : [];
            const claimerSummaryMap = {};
            claimers.forEach(claimer => {
                const name = normalizeShippingClaimerName(claimer);
                if (!name) return;
                claimerSummaryMap[name] = (claimerSummaryMap[name] || 0) + 1;
            });
            const claimerSummary = Object.entries(claimerSummaryMap)
                .map(([name, count]) => {
                    const receivedQuantity = getShippingStatusQuantity(index, name, SHIPPING_STATUS.RECEIVED);
                    const shippedQuantity = getShippingStatusQuantity(index, name, SHIPPING_STATUS.SHIPPED);
                    const pendingQuantity = getShippingStatusQuantity(index, name, SHIPPING_STATUS.PENDING);
                    let stateClass = 'regular';
                    let stateText = '';
                    if (receivedQuantity > 0) {
                        stateClass = 'received';
                        stateText = '已收货';
                    } else if (shippedQuantity > 0) {
                        stateClass = 'shipped';
                        stateText = '排发中';
                    } else if (pendingQuantity > 0) {
                        stateClass = 'pending';
                        stateText = '已申请';
                    }
                    return {
                        name,
                        count,
                        shippedQuantity,
                        receivedQuantity,
                        pendingQuantity,
                        stateClass,
                        stateText
                    };
                })
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
            const claimedQuantity = claimers.length;
            const arrivedQuantity = getShippingArrivedQuantity(item);
            const shippedQuantity = getShippingGlobalUsedQuantity(index, { includePending: false });
            const pendingQuantity = Math.max(claimedQuantity - arrivedQuantity, 0);
            const arrivalRate = claimedQuantity > 0
                ? Math.min(100, Math.round((arrivedQuantity / claimedQuantity) * 100))
                : (arrivedQuantity > 0 ? 100 : 0);
            const progressPercent = arrivalRate;
            let statusClass = 'waiting';
            let statusText = '未到货';

            if (claimedQuantity <= 0) {
                statusText = arrivedQuantity > 0 ? '已到货' : '未认领';
                statusClass = arrivedQuantity > 0 ? 'ready' : 'waiting';
            } else if (pendingQuantity <= 0) {
                statusClass = 'ready';
                statusText = '已到货';
            } else if (arrivedQuantity > 0) {
                statusClass = 'pending';
                statusText = '到货中';
            }

            const searchText = [
                item.category || '',
                item.kunxu || '',
                plateName,
                typeLabel,
                Array.isArray(item.claimers) ? item.claimers.map(claimer => normalizeShippingClaimerName(claimer)).join(' ') : ''
            ].join(' ').toLowerCase();

            return {
                itemIndex: index,
                category: item.category || '',
                kunxu: item.kunxu || '',
                plateId,
                plateName,
                imgSrc: item.imgSrc || defaultImgUrl,
                isGift,
                typeLabel,
                claimedQuantity,
                arrivedQuantity,
                shippedQuantity,
                pendingQuantity,
                arrivalRate,
                progressPercent,
                statusClass,
                statusText,
                claimerSummary,
                searchText
            };
        })
        .filter(Boolean)
        .filter(item => !normalizedKeyword || item.searchText.includes(normalizedKeyword));
}

function updateShippingArrivalStats(items) {
    const groups = {
        regular: items.filter(item => !item.isGift),
        gift: items.filter(item => item.isGift)
    };
    const updateGroup = (prefix, source) => {
        setShippingText(`${prefix}Total`, source.length);
        setShippingText(`${prefix}Done`, source.filter(item => item.statusClass === 'ready').length);
        setShippingText(`${prefix}Progress`, source.filter(item => item.statusClass === 'pending').length);
        setShippingText(`${prefix}Unclaimed`, source.filter(item => Number(item.claimedQuantity || 0) <= 0).length);
    };

    updateGroup('shippingArrivalRegular', groups.regular);
    updateGroup('shippingArrivalGift', groups.gift);
}

function getShippingArrivalFilterConfigs(items) {
    const source = Array.isArray(items) ? items : [];
    return [
        { value: 'all', label: '全部', count: source.length },
        { value: 'regular', label: '普通', count: source.filter(item => !item.isGift).length },
        { value: 'gift', label: '赠品', count: source.filter(item => item.isGift).length },
        { value: 'ready', label: '已到货', count: source.filter(item => item.statusClass === 'ready').length },
        { value: 'pending', label: '到货中', count: source.filter(item => item.statusClass === 'pending').length },
        { value: 'unclaimed', label: '未认领', count: source.filter(item => Number(item.claimedQuantity || 0) <= 0).length }
    ];
}

function getShippingArrivalVisibleItems(items) {
    const source = Array.isArray(items) ? items : [];
    if (currentShippingArrivalFilter === 'regular') {
        return source.filter(item => !item.isGift);
    }
    if (currentShippingArrivalFilter === 'gift') {
        return source.filter(item => item.isGift);
    }
    if (currentShippingArrivalFilter === 'ready') {
        return source.filter(item => item.statusClass === 'ready');
    }
    if (currentShippingArrivalFilter === 'pending') {
        return source.filter(item => item.statusClass === 'pending');
    }
    if (currentShippingArrivalFilter === 'unclaimed') {
        return source.filter(item => Number(item.claimedQuantity || 0) <= 0);
    }
    return source;
}

function getShippingArrivalPlateFilterConfigs(items) {
    const source = Array.isArray(items) ? items : [];
    const plates = new Map();
    source.forEach(item => {
        const value = String(item.plateId || '').trim() || `plate-name:${item.plateName || '未分盘'}`;
        if (!plates.has(value)) {
            plates.set(value, {
                value,
                label: String(item.plateName || '').trim() || '未分盘',
                count: 0
            });
        }
        plates.get(value).count += 1;
    });
    return [
        { value: 'all', label: '全部盘', count: source.length },
        ...Array.from(plates.values())
    ];
}

function applyShippingArrivalPlateFilter(items) {
    const source = Array.isArray(items) ? items : [];
    if (currentShippingArrivalPlateFilter === 'all') return source;
    return source.filter(item => item.plateId === currentShippingArrivalPlateFilter);
}

function renderShippingArrivalPlateFilters(items) {
    const toolbar = document.getElementById('shipping-arrival-plate-filter-toolbar');
    if (!toolbar) return;
    const filters = getShippingArrivalPlateFilterConfigs(items);
    if (currentShippingArrivalPlateFilter !== 'all' && !filters.some(filter => filter.value === currentShippingArrivalPlateFilter)) {
        currentShippingArrivalPlateFilter = 'all';
    }
    toolbar.innerHTML = filters.map(filter => {
        const encodedValue = encodeURIComponent(filter.value);
        return `
            <button type="button" class="shipping-filter-chip ${currentShippingArrivalPlateFilter === filter.value ? 'active' : ''}" aria-pressed="${currentShippingArrivalPlateFilter === filter.value}" onclick="setShippingArrivalPlateFilter(decodeURIComponent('${encodedValue}'))">
                <span>${escapeShippingHtml(filter.label)}</span>
                <em>${filter.count}</em>
            </button>
        `;
    }).join('');
}

function renderShippingArrivalFilters(items) {
    const toolbar = document.getElementById('shipping-arrival-filter-toolbar');
    if (!toolbar) return;
    toolbar.innerHTML = getShippingArrivalFilterConfigs(items).map(filter => `
        <button type="button" class="shipping-filter-chip ${currentShippingArrivalFilter === filter.value ? 'active' : ''}" aria-pressed="${currentShippingArrivalFilter === filter.value}" onclick="setShippingArrivalFilter('${filter.value}')">
            <span>${filter.label}</span>
            <em>${filter.count}</em>
        </button>
    `).join('');
}

function renderShippingArrivalPage() {
    const container = document.getElementById('shipping-arrival-container');
    if (!container) return;

    const allItems = getShippingArrivalOverviewItems();
    const items = getShippingArrivalOverviewItems(currentShippingArrivalSearch);
    renderShippingArrivalPlateFilters(allItems);
    const plateItems = applyShippingArrivalPlateFilter(items);
    updateShippingArrivalStats(plateItems);
    renderShippingArrivalFilters(plateItems);
    const visibleItems = getShippingArrivalVisibleItems(plateItems);

    if (!items.length) {
        container.innerHTML = currentShippingArrivalSearch
            ? '<div class="shipping-empty compact">没有找到符合条件的谷子到货记录。</div>'
            : '<div class="shipping-empty compact">暂无谷子到货记录。</div>';
        return;
    }

    if (!visibleItems.length) {
        container.innerHTML = '<div class="shipping-empty compact">当前筛选下没有符合条件的谷子。</div>';
        return;
    }

    container.innerHTML = `
        <div class="shipping-arrival-grid">
            ${visibleItems.map((item, index) => renderShippingArrivalFlipCard(item, index)).join('')}
        </div>
    `;
}

function renderShippingArrivalCard(item, order = 0) {
    const badgeText = `${item.arrivalRate}%`;
    const typeClass = item.isGift ? 'gift' : 'regular';
    const kunxuText = String(item.kunxu || '').trim();
    const kunxuClass = kunxuText && kunxuText !== '不捆' ? 'kunxu-bound' : 'kunxu-free';
    const kunxuLabel = kunxuText || '不捆';
    const plateName = String(item.plateName || '').trim() || '未分盘';
    const tagItems = [
        `<span class="shipping-arrival-kind ${typeClass}">${escapeShippingHtml(item.typeLabel)}</span>`,
        `<span class="shipping-arrival-kunxu ${kunxuClass}">${escapeShippingHtml(kunxuLabel)}</span>`,
        `<span class="shipping-arrival-plate" title="所属盘：${escapeShippingHtml(plateName)}">盘 · ${escapeShippingHtml(plateName)}</span>`
    ].filter(Boolean).join('');
    const metaItems = [
        `<span>认领 ${item.claimedQuantity}</span>`,
        `<span>到货 ${item.arrivedQuantity}</span>`,
        `<span>排发中 ${item.shippedQuantity}</span>`,
        `<span>待到货 ${item.pendingQuantity}</span>`,
        `<span>到货率 ${item.arrivalRate}%</span>`
    ];

    return `
        <article class="shipping-arrival-card ${item.statusClass}" style="--shipping-arrival-delay:${Math.min(order, 12) * 24}ms">
            <div class="shipping-arrival-image" onclick="openImgModal(this.querySelector('img').src)">
                <img src="${item.imgSrc}" alt="${escapeShippingHtml(item.category)}" onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
                <span class="shipping-arrival-badge">${escapeShippingHtml(badgeText)}</span>
            </div>
            <div class="shipping-arrival-body">
                <div class="shipping-arrival-head">
                    <div class="shipping-arrival-head-copy">
                        <div class="shipping-arrival-title">${escapeShippingHtml(item.category)}</div>
                        <div class="shipping-arrival-tags">${tagItems}</div>
                    </div>
                    <span class="shipping-arrival-status ${item.statusClass}">${escapeShippingHtml(item.statusText)}</span>
                </div>
                <div class="shipping-arrival-meta">
                    ${metaItems.join('')}
                </div>
                <div class="shipping-arrival-progress" aria-label="到货进度 ${item.progressPercent}%">
                    <span style="width: ${item.progressPercent}%"></span>
                </div>
            </div>
        </article>
    `;
}

function renderShippingArrivalFlipCard(item, order = 0) {
    const badgeText = `${item.arrivalRate}%`;
    const typeClass = item.isGift ? 'gift' : 'regular';
    const kunxuText = String(item.kunxu || '').trim();
    const kunxuClass = kunxuText && kunxuText !== '不捆' ? 'kunxu-bound' : 'kunxu-free';
    const kunxuLabel = kunxuText || '不捆';
    const plateName = String(item.plateName || '').trim() || '未分盘';
    const tagItems = [
        `<span class="shipping-arrival-kind ${typeClass}">${escapeShippingHtml(item.typeLabel)}</span>`,
        `<span class="shipping-arrival-kunxu ${kunxuClass}">${escapeShippingHtml(kunxuLabel)}</span>`,
        `<span class="shipping-arrival-plate" title="所属盘：${escapeShippingHtml(plateName)}">盘 · ${escapeShippingHtml(plateName)}</span>`
    ].filter(Boolean).join('');
    const claimerList = item.claimerSummary && item.claimerSummary.length
        ? item.claimerSummary.map(claimer => `
            <div class="shipping-arrival-claimer-item ${claimer.stateClass}">
                <span class="shipping-arrival-claimer-name">${escapeShippingHtml(claimer.name)}</span>
                <span class="shipping-arrival-claimer-count">${escapeShippingHtml(String(claimer.count))}点</span>
                ${claimer.stateText ? `<span class="shipping-arrival-claimer-state">${escapeShippingHtml(claimer.stateText)}</span>` : ''}
            </div>
        `).join('')
        : '<div class="shipping-arrival-claimer-empty">暂无认领记录</div>';
    const metaItems = [
        `<span>认领 ${item.claimedQuantity}</span>`,
        `<span>到货 ${item.arrivedQuantity}</span>`,
        `<span>排发中 ${item.shippedQuantity}</span>`,
        `<span>待到货 ${item.pendingQuantity}</span>`,
        `<span>到货率 ${item.arrivalRate}%</span>`
    ];

    return `
        <article class="shipping-arrival-card ${item.statusClass}" style="--shipping-arrival-delay:${Math.min(order, 12) * 24}ms" onclick="toggleShippingArrivalCard(this, event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); toggleShippingArrivalCard(this, event);}" tabindex="0" role="button" aria-label="${escapeShippingHtml(item.category)} 到货卡片，点击翻转查看认领人">
            <div class="shipping-arrival-card-inner">
                <div class="shipping-arrival-card-face shipping-arrival-card-front">
                    <div class="shipping-arrival-image" onclick="event.stopPropagation(); openImgModal(this.querySelector('img').src)">
                        <img src="${item.imgSrc}" alt="${escapeShippingHtml(item.category)}" onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
                        <span class="shipping-arrival-badge">${escapeShippingHtml(badgeText)}</span>
                    </div>
                    <div class="shipping-arrival-body">
                        <div class="shipping-arrival-head">
                            <div class="shipping-arrival-head-copy">
                                <div class="shipping-arrival-title">${escapeShippingHtml(item.category)}</div>
                                <div class="shipping-arrival-tags">${tagItems}</div>
                            </div>
                            <span class="shipping-arrival-status ${item.statusClass}">${escapeShippingHtml(item.statusText)}</span>
                        </div>
                        <div class="shipping-arrival-meta">
                            ${metaItems.join('')}
                        </div>
                        <div class="shipping-arrival-progress" aria-label="到货进度 ${item.progressPercent}%">
                            <span style="width: ${item.progressPercent}%"></span>
                        </div>
                        <div class="shipping-arrival-flip-tip">认领明细</div>
                    </div>
                </div>
                <div class="shipping-arrival-card-face shipping-arrival-card-back">
                    <div class="shipping-arrival-back-head">
                        <div>
                            <div class="shipping-arrival-back-kicker">认领人列表 · ${escapeShippingHtml(plateName)}</div>
                            <div class="shipping-arrival-back-title">${escapeShippingHtml(item.category)}</div>
                        </div>
                        <span class="shipping-arrival-status ${item.statusClass}">${escapeShippingHtml(item.statusText)}</span>
                    </div>
                    <div class="shipping-arrival-back-summary">
                        <span>认领 ${item.claimedQuantity}</span>
                        <span>到货 ${item.arrivedQuantity}</span>
                        <span>排发中 ${item.shippedQuantity}</span>
                        <span>到货率 ${item.arrivalRate}%</span>
                    </div>
                    <div class="shipping-arrival-claimer-list">
                        ${claimerList}
                    </div>
                </div>
            </div>
        </article>
    `;
}

function toggleShippingArrivalCard(card, event) {
    if (!card) return;
    if (event && event.target && event.target.closest('.shipping-arrival-image')) return;
    card.classList.toggle('flipped');
}

function findClientShippingRequest(requestId) {
    const source = typeof filterWorkspaceCollection === 'function'
        ? filterWorkspaceCollection(shippingRequests || [], { scope: CLIENT_SHIPPING_SCOPE })
        : (shippingRequests || []);
    return source.find(item => item.id === requestId);
}

function renderShippingRequests(matchedCNs) {
    const list = document.getElementById('shipping-request-list');
    if (!list) return;
    const cnSet = new Set(matchedCNs);

    const requestsSource = typeof filterWorkspaceCollection === 'function'
        ? filterWorkspaceCollection(shippingRequests || [], { scope: CLIENT_SHIPPING_SCOPE })
        : (shippingRequests || []);
    const requests = requestsSource
        .filter(request => cnSet.has(normalizeShippingClaimerName(request.cn)))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    if (!requests.length) {
        list.innerHTML = '<div class="shipping-empty compact">暂无排发申请记录。</div>';
        return;
    }

    list.innerHTML = requests.map(request => renderClientShippingRequestCard(request)).join('');
}

function renderClientShippingRequestCard(request) {
    const items = getShippingRequestItems(request);
    const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const summaryStatus = getShippingRequestSummaryStatus(request);
    const statusClass = getShippingRequestStatusClass(summaryStatus);
    const statusText = getShippingRequestStatusText(summaryStatus);
    const createdText = new Date(request.createdAt || Date.now()).toLocaleString();
    const itemGrid = renderClientShippingRequestItemGrid(request);
    const flatPanel = renderClientShippingFlatPanel(request);
    const paymentPanel = renderClientShippingPaymentPanel(request);
    const metaPanel = renderClientShippingMetaPanel(request);
    const actions = renderClientShippingActions(request);

    return `
        <div class="shipping-request-card ${statusClass}">
            <div class="shipping-request-head">
                <span class="shipping-request-status ${statusClass}">${statusText}</span>
                <span>${createdText}</span>
            </div>
            <div class="shipping-request-title">${escapeShippingHtml(request.cn || '-')}｜${count} 点</div>
            ${itemGrid}
            ${metaPanel}
            ${flatPanel}
            ${paymentPanel}
            ${actions}
        </div>
    `;
}

function renderClientShippingRequestItemGrid(request) {
    const items = getShippingRequestItems(request);
    if (!items.length) return '';

    return `
        <div class="shipping-request-item-grid">
            ${items.map(item => {
                const imgSrc = escapeShippingHtml(item.imgSrc || defaultImgUrl);
                const category = escapeShippingHtml(item.category || '-');
                const quantity = Math.max(parseInt(item.quantity, 10) || 0, 0);
                const typeLabel = item.isGift || item.itemType === 'gift' ? '赠品' : '普通';
                const plateName = escapeShippingHtml(item.plateName || '未分盘');
                return `
                    <div class="shipping-request-item-card">
                        <div class="shipping-request-item-image" onclick="openImgModal(this.querySelector('img').src)">
                            <img src="${imgSrc}" alt="${category}" onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
                            <span class="shipping-request-item-qty">${quantity} 点</span>
                        </div>
                        <div class="shipping-request-item-type">${typeLabel} · ${plateName}</div>
                        <div class="shipping-request-item-name">${category}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderClientShippingMetaPanel(request) {
    const metaItems = [
        request.note ? `备注：${escapeShippingHtml(request.note)}` : '',
        request.adminNote ? `管理端备注：${escapeShippingHtml(request.adminNote)}` : '',
        request.shippingMethod ? `排发方式：${escapeShippingHtml(getShippingMethodText(request.shippingMethod))}` : '',
        isShippingRequestExpress(request) && request.shippingAddress ? `收件地址：${escapeShippingHtml(request.shippingAddress)}` : '',
        request.flatImageSentAt ? `平铺图发送：${new Date(request.flatImageSentAt).toLocaleString()}` : '',
        request.customerFeeConfirmedAt ? `已确认平铺图：${new Date(request.customerFeeConfirmedAt).toLocaleString()}` : '',
        request.flatFeedbackAt ? `已反馈平铺图问题：${new Date(request.flatFeedbackAt).toLocaleString()}` : '',
        isShippingRequestExpress(request) && (request.shippingPostageFee || request.shippingPackingFee || request.paymentQrCodeUrl || request.paymentProofUrl || request.paymentReceivedAt)
            ? `邮费：${escapeShippingHtml(getShippingPaymentSummaryText(request))}`
            : '',
        isShippingRequestExpress(request) ? `邮费状态：${escapeShippingHtml(getShippingPaymentStatusText(request))}` : '面交：无需邮费',
        request.paymentSubmittedAt ? `客户付款时间：${new Date(request.paymentSubmittedAt).toLocaleString()}` : '',
        request.paymentReceivedAt ? `邮费已确认：${new Date(request.paymentReceivedAt).toLocaleString()}` : '',
        request.trackingNumber ? `单号：${escapeShippingHtml(request.trackingNumber)}` : '',
        request.shippedAt ? `排发时间：${new Date(request.shippedAt).toLocaleString()}` : '',
        request.receivedAt ? `确认收货：${new Date(request.receivedAt).toLocaleString()}` : '',
        request.rejectedAt ? `驳回时间：${new Date(request.rejectedAt).toLocaleString()}` : '',
        request.canceledAt ? `取消时间：${new Date(request.canceledAt).toLocaleString()}` : ''
    ].filter(Boolean);

    if (!metaItems.length) return '';
    return `<div class="shipping-request-meta">${metaItems.map(item => `<span>${item}</span>`).join('')}</div>`;
}

function renderClientShippingFlatPanel(request) {
    const summaryStatus = getShippingRequestSummaryStatus(request);
    if (!request.flatImageUrl && summaryStatus !== SHIPPING_STATUS.PENDING) return '';

    if (!request.flatImageUrl) {
        return `
            <div class="shipping-request-flat notice">
                <div class="shipping-request-flat-info">
                    <div class="shipping-request-flat-title">等待管理端发送平铺图</div>
                    <div class="shipping-request-flat-note">收到平铺图后，请先确认无误。快递订单在确认后会显示收款码，面交订单无需邮费。</div>
                </div>
            </div>
        `;
    }

    const note = request.customerFeeConfirmedAt
        ? (isShippingRequestExpress(request)
            ? '你已确认平铺图，收款码会在下方显示。支付邮费后等待管理端确认即可。'
            : '你已确认平铺图，面交订单无需邮费，等待管理端安排。')
        : (request.flatFeedback ? '你已反馈平铺图问题，等待管理端处理或更新平铺图。若还需要补充，可以继续反馈。' : '请先核对平铺图；确认后再继续后面的排发流程。');
    const feedbackPanel = request.flatFeedback
        ? `<div class="shipping-request-flat-feedback"><strong>已反馈：</strong><span>${escapeShippingHtml(request.flatFeedback)}</span></div>`
        : '';
    return `
        <div class="shipping-request-flat">
            <img src="${escapeShippingHtml(request.flatImageUrl)}" alt="平铺图" onclick="openImgModal(this.src)" onerror="this.style.display='none';">
            <div class="shipping-request-flat-info">
                <div class="shipping-request-flat-title">平铺图</div>
                <div class="shipping-request-flat-note">${note}</div>
                ${feedbackPanel}
            </div>
        </div>
    `;
}

function renderClientShippingPaymentPanel(request) {
    if (!isShippingRequestExpress(request) || !request.customerFeeConfirmedAt) return '';

    const paymentSummary = getShippingPaymentSummaryText(request);
    const paymentStatus = getShippingPaymentStatusText(request);
    const qrBlock = request.paymentQrCodeUrl
        ? `
            <div class="shipping-request-payment-box">
                <div class="shipping-request-payment-box-title">收款码</div>
                <img class="shipping-request-payment-image" src="${escapeShippingHtml(request.paymentQrCodeUrl)}" alt="收款码" onclick="openImgModal(this.src)" onerror="this.style.display='none';">
            </div>
        `
        : `
            <div class="shipping-request-payment-box empty">
                <div class="shipping-request-payment-box-title">收款码</div>
                <div class="shipping-request-payment-empty">管理端还没有上传收款码，请稍等。</div>
            </div>
        `;
    const proofBlock = request.paymentProofUrl
        ? `
            <div class="shipping-request-payment-box">
                <div class="shipping-request-payment-box-title">邮费截图</div>
                <img class="shipping-request-payment-image" src="${escapeShippingHtml(request.paymentProofUrl)}" alt="邮费截图" onclick="openImgModal(this.src)" onerror="this.style.display='none';">
            </div>
        `
        : '';

    return `
        <div class="shipping-request-payment-panel ${request.paymentReceivedAt ? 'confirmed' : ''}">
            <div class="shipping-request-payment-head">
                <div>
                    <div class="shipping-request-payment-title">邮费处理</div>
                    <div class="shipping-request-payment-note">${request.paymentReceivedAt ? '管理端已经确认收到邮费。' : '请按收款码支付邮费，付款后等待管理端确认即可。'}</div>
                </div>
                <span class="shipping-request-payment-badge">${escapeShippingHtml(paymentStatus)}</span>
            </div>
            <div class="shipping-request-payment-summary">
                <span>运费 ${escapeShippingHtml(formatShippingMoney(request.shippingPostageFee))}</span>
                <span>打包费 ${escapeShippingHtml(formatShippingMoney(request.shippingPackingFee))}</span>
                <span>合计 ${escapeShippingHtml(formatShippingMoney(getShippingPaymentAmount(request)))}</span>
            </div>
            <div class="shipping-request-payment-grid">
                ${qrBlock}
                ${proofBlock}
            </div>
            <div class="shipping-request-payment-footer">
                <span>${escapeShippingHtml(paymentSummary)}</span>
                ${request.paymentSubmittedAt ? `<span>客户付款时间：${new Date(request.paymentSubmittedAt).toLocaleString()}</span>` : ''}
                ${request.paymentReceivedAt ? `<span>邮费已确认于 ${new Date(request.paymentReceivedAt).toLocaleString()}</span>` : ''}
            </div>
        </div>
    `;
}

function renderClientShippingActions(request) {
    const actions = [];
    const summaryStatus = getShippingRequestSummaryStatus(request);

    if (summaryStatus === SHIPPING_STATUS.PENDING) {
        if (request.flatImageUrl && !request.customerFeeConfirmedAt) {
            actions.push(`<button class="btn shipping-confirm-btn" onclick="confirmShippingFlatAndFee('${request.id}')">确认平铺图</button>`);
            actions.push(`<button class="btn shipping-feedback-btn" onclick="feedbackShippingFlatIssue('${request.id}')">${request.flatFeedback ? '补充反馈' : '反馈问题'}</button>`);
        }
        actions.push(`<button class="btn shipping-cancel-btn" onclick="cancelShippingRequest('${request.id}')">取消申请</button>`);
    }

    if (summaryStatus === SHIPPING_STATUS.SHIPPED) {
        actions.push(`<button class="btn shipping-receive-btn" onclick="confirmShippingReceipt('${request.id}')">确认收货</button>`);
    }

    if (isShippingRequestDeletable(request)) {
        actions.push(`<button class="btn shipping-delete-btn" onclick="deleteShippingRequestClient('${request.id}')">删除记录</button>`);
    }

    if (!actions.length) return '';
    return `<div class="shipping-request-actions">${actions.join('')}</div>`;
}

async function searchShippingCN() {
    const input = document.getElementById('shippingCnInput');
    currentShippingSearch = normalizeShippingClaimerName(input ? input.value : '');
    if (!currentShippingSearch) {
        await shippingAlert('请输入要查询的 CN。', {
            title: '先填一下 CN',
            variant: 'warning'
        });
        return;
    }
    renderShippingPage();
}

function resetShippingSearch() {
    currentShippingSearch = '';
    currentShippingItemFilter = 'available';
    const input = document.getElementById('shippingCnInput');
    if (input) input.value = '';
    renderShippingPage();
}

function searchShippingArrival() {
    const input = document.getElementById('shippingArrivalSearchInput');
    currentShippingArrivalSearch = input ? input.value.trim() : '';
    renderShippingArrivalPage();
}

function resetShippingArrivalSearch() {
    currentShippingArrivalSearch = '';
    currentShippingArrivalFilter = 'all';
    currentShippingArrivalPlateFilter = 'all';
    const input = document.getElementById('shippingArrivalSearchInput');
    if (input) input.value = '';
    renderShippingArrivalPage();
}

function toggleShippingSelectAll(cn, checked) {
    document.querySelectorAll(`.shipping-item-check[data-shipping-cn="${cn}"]:not(:disabled)`).forEach(input => {
        input.checked = checked;
    });
}

async function submitShippingRequest(cn) {
    const selectedIndexes = Array.from(document.querySelectorAll(`.shipping-item-check[data-shipping-cn="${cn}"]:checked`))
        .map(input => Number(input.value));
    if (!selectedIndexes.length) {
        await shippingAlert('请至少勾选一个可排发的谷子。', {
            title: '还没有选择谷子',
            variant: 'warning'
        });
        return;
    }

    const availableItems = buildShippingItemsForCn(cn);
    const requestItems = availableItems
        .filter(item => selectedIndexes.includes(Number(item.itemIndex)) && item.availableQuantity > 0)
        .map(item => ({
            itemIndex: item.itemIndex,
            itemId: item.itemId || '',
            category: item.category,
            quantity: item.availableQuantity,
            price: item.price,
            imgSrc: item.imgSrc,
            groupId: item.groupId,
            groupName: item.groupName,
            plateId: item.plateId,
            plateName: item.plateName,
            status: SHIPPING_STATUS.PENDING,
            statusAt: new Date().toISOString()
        }));

    if (!requestItems.length) {
        await shippingAlert('当前勾选内容没有可排发数量，可能已经提交过申请。', {
            title: '暂时不能提交',
            variant: 'warning'
        });
        renderShippingPage();
        return;
    }

    const shippingMethod = await shippingChoice('先选一下这次排发是面交还是快递。', [
        {
            label: '快递',
            value: SHIPPING_METHOD.EXPRESS,
            description: '需要填写收件地址，管理端会在发送平铺图后提供收款码。'
        },
        {
            label: '面交',
            value: SHIPPING_METHOD.FACE_TO_FACE,
            description: '不需要收件地址，也不需要邮费截图。'
        }
    ], {
        title: '选择排发方式',
        confirmText: '继续',
        defaultValue: SHIPPING_METHOD.EXPRESS
    });
    if (!shippingMethod) return;

    let shippingAddress = '';
    if (shippingMethod === SHIPPING_METHOD.EXPRESS) {
        shippingAddress = await shippingPrompt('请填写快递收件地址、联系人和电话。管理端会按这个地址发出。', '', {
            title: '填写收件地址',
            multiline: true,
            placeholder: '例如：张三，13800000000，浙江省杭州市...',
            required: true,
            requiredText: '快递排发需要先填写收件地址。'
        });
        if (shippingAddress === null) return;
        shippingAddress = shippingAddress.trim();
        if (!shippingAddress) {
            await shippingAlert('快递排发需要填写收件地址。', {
                title: '缺少收件地址',
                variant: 'warning'
            });
            return;
        }
    }

    const noteInput = document.getElementById('shippingNoteInput');
    const context = typeof stampClientWorkspaceContext === 'function'
        ? stampClientWorkspaceContext({})
        : {};
    const request = {
        ...context,
        ...getShippingRequestWorkspaceContext(requestItems),
        id: createShippingRequestId(),
        cn,
        status: SHIPPING_STATUS.PENDING,
        items: requestItems,
        shippingMethod,
        shippingAddress,
        note: noteInput ? noteInput.value.trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    shippingRequests.push(request);

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('排发申请已提交');
        if (noteInput) noteInput.value = '';
        renderShippingPage();
    } catch (error) {
        shippingRequests = shippingRequests.filter(item => item.id !== request.id);
        await shippingAlert('排发申请提交失败：' + error.message, {
            title: '提交失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}

async function cancelShippingRequest(requestId) {
    const request = findClientShippingRequest(requestId);
    if (!request) {
        await shippingAlert('未找到这条排发申请，请刷新后重试。', {
            title: '没有找到记录',
            variant: 'warning'
        });
        return;
    }
    if (getShippingRequestSummaryStatus(request) !== SHIPPING_STATUS.PENDING) {
        await shippingAlert('只有已申请可以由客户端取消。', {
            title: '暂时不能取消',
            variant: 'warning'
        });
        return;
    }
    const confirmed = await shippingConfirm(`确认取消【${request.cn}】这条排发申请吗？`, {
        title: '取消排发申请',
        confirmText: '确认取消',
        variant: 'warning'
    });
    if (!confirmed) return;

    const previous = JSON.parse(JSON.stringify(request));
    request.status = SHIPPING_STATUS.CANCELED;
    request.canceledBy = 'client';
    request.canceledAt = new Date().toISOString();
    getShippingRequestItems(request).forEach(item => {
        item.status = SHIPPING_STATUS.CANCELED;
        item.statusAt = request.canceledAt;
    });
    request.updatedAt = new Date().toISOString();

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('排发申请已取消');
        renderShippingPage();
    } catch (error) {
        Object.keys(request).forEach(key => delete request[key]);
        Object.assign(request, previous);
        await shippingAlert('取消排发申请失败：' + error.message, {
            title: '取消失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}

async function confirmShippingFlatAndFee(requestId) {
    const request = findClientShippingRequest(requestId);
    if (!request) {
        await shippingAlert('未找到这条排发申请，请刷新后重试。', {
            title: '没有找到记录',
            variant: 'warning'
        });
        return;
    }
    if (getShippingRequestSummaryStatus(request) !== SHIPPING_STATUS.PENDING || !request.flatImageUrl) {
        await shippingAlert('当前申请还不能确认平铺图。', {
            title: '暂时不能确认',
            variant: 'warning'
        });
        return;
    }
    const confirmed = await shippingConfirm(`确认【${request.cn}】的平铺图无误吗？`, {
        title: '确认平铺图',
        confirmText: '确认无误',
        variant: 'info'
    });
    if (!confirmed) return;

    const previous = JSON.parse(JSON.stringify(request));
    request.customerFeeConfirmedAt = new Date().toISOString();
    request.flatFeedback = '';
    request.flatFeedbackAt = '';
    request.updatedAt = new Date().toISOString();

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('已确认平铺图');
        renderShippingPage();
    } catch (error) {
        Object.keys(request).forEach(key => delete request[key]);
        Object.assign(request, previous);
        await shippingAlert('确认平铺图失败：' + error.message, {
            title: '确认失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}

async function submitShippingPaymentProof(requestId) {
    await shippingAlert('现在暂时不需要提交邮费截图。请按收款码付款后，等待管理端确认收款即可。', {
        title: '当前无需截图',
        variant: 'info'
    });
}

async function feedbackShippingFlatIssue(requestId) {
    const request = findClientShippingRequest(requestId);
    if (!request) {
        await shippingAlert('未找到这条排发申请，请刷新后重试。', {
            title: '没有找到记录',
            variant: 'warning'
        });
        return;
    }
    if (getShippingRequestSummaryStatus(request) !== SHIPPING_STATUS.PENDING || !request.flatImageUrl || request.customerFeeConfirmedAt) {
        await shippingAlert('当前申请暂时不能反馈平铺图问题。', {
            title: '暂时不能反馈',
            variant: 'warning'
        });
        return;
    }

    const feedback = await shippingPrompt('请写下平铺图哪里有问题，管理端会在申请里看到。', request.flatFeedback || '', {
        title: request.flatFeedback ? '补充平铺图反馈' : '反馈平铺图问题',
        multiline: true,
        placeholder: '例如：少了某个谷子、数量不对、图片不清楚、不是我的谷子等',
        required: true,
        requiredText: '请先写下具体问题，方便管理端处理。'
    });
    if (feedback === null) return;

    const previous = JSON.parse(JSON.stringify(request));
    request.flatFeedback = feedback.trim();
    request.flatFeedbackAt = new Date().toISOString();
    request.customerFeeConfirmedAt = '';
    request.updatedAt = new Date().toISOString();

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('已反馈平铺图问题');
        renderShippingPage();
    } catch (error) {
        Object.keys(request).forEach(key => delete request[key]);
        Object.assign(request, previous);
        await shippingAlert('反馈平铺图问题失败：' + error.message, {
            title: '反馈失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}

async function confirmShippingReceipt(requestId) {
    const request = findClientShippingRequest(requestId);
    if (!request) {
        await shippingAlert('未找到这条排发申请，请刷新后重试。', {
            title: '没有找到记录',
            variant: 'warning'
        });
        return;
    }
    if (getShippingRequestSummaryStatus(request) !== SHIPPING_STATUS.SHIPPED) {
        await shippingAlert('只有排发中的申请可以确认收货。', {
            title: '暂时不能确认收货',
            variant: 'warning'
        });
        return;
    }
    const confirmed = await shippingConfirm(`确认已经收到【${request.cn}】这批谷子了吗？确认后流程将结束。`, {
        title: '确认收货',
        confirmText: '确认已收到',
        variant: 'success'
    });
    if (!confirmed) return;

    const previous = JSON.parse(JSON.stringify(request));
    request.status = SHIPPING_STATUS.RECEIVED;
    request.receivedAt = new Date().toISOString();
    getShippingRequestItems(request).forEach(item => {
        item.status = SHIPPING_STATUS.RECEIVED;
        item.statusAt = request.receivedAt;
    });
    request.updatedAt = new Date().toISOString();

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('已确认收货');
        renderShippingPage();
    } catch (error) {
        Object.keys(request).forEach(key => delete request[key]);
        Object.assign(request, previous);
        await shippingAlert('确认收货失败：' + error.message, {
            title: '确认失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}

async function deleteShippingRequestClient(requestId) {
    const request = findClientShippingRequest(requestId);
    if (!request) {
        await shippingAlert('未找到这条排发申请，请刷新后重试。', {
            title: '没有找到记录',
            variant: 'warning'
        });
        return;
    }
    if (!isShippingRequestDeletable(request)) {
        await shippingAlert('只有已驳回或已取消的申请记录可以删除。', {
            title: '暂时不能删除',
            variant: 'warning'
        });
        return;
    }
    const confirmed = await shippingConfirm(`确认删除【${request.cn}】这条${getShippingRequestStatusText(getShippingRequestSummaryStatus(request))}记录吗？删除后无法恢复。`, {
        title: '删除排发记录',
        confirmText: '确认删除',
        variant: 'danger'
    });
    if (!confirmed) return;

    const previousRequests = Array.isArray(shippingRequests) ? [...shippingRequests] : [];
    shippingRequests = previousRequests.filter(item => item.id !== requestId);

    try {
        await saveGuziDataToGist({ guziData, claimRecords, shippingRequests });
        showSyncTip('已删除排发记录');
        renderShippingPage();
    } catch (error) {
        shippingRequests = previousRequests;
        await shippingAlert('删除排发记录失败：' + error.message, {
            title: '删除失败',
            variant: 'danger'
        });
        renderShippingPage();
    }
}
