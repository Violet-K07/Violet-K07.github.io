(function (global) {
    'use strict';

    const FALLBACK_IMAGE = typeof defaultImgUrl !== 'undefined' ? defaultImgUrl : 'ERROR.PNG';

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function formatMoney(value) {
        return `¥${Number(value || 0).toFixed(2)}`;
    }

    function normalizeCn(value) {
        if (typeof normalizeClaimerName === 'function') return normalizeClaimerName(value);
        const name = String(value || '').trim();
        return name.endsWith('捆') ? name.slice(0, -1).trim() : name;
    }

    function isForced(value) {
        if (typeof isForcedClaimerName === 'function') return isForcedClaimerName(value);
        return String(value || '').trim().endsWith('捆');
    }

    function getPlateEntries() {
        if (typeof getClientPlateEntries === 'function') return getClientPlateEntries();
        const source = typeof guziData !== 'undefined' && Array.isArray(guziData) ? guziData : [];
        return source.map((item, index) => ({ item, index }));
    }

    function getPaymentBatches() {
        return typeof getClientPlateCollectionBatches === 'function'
            ? getClientPlateCollectionBatches()
            : [];
    }

    function getItemType(item) {
        return item?.itemType === 'gift' || item?.isGift === true ? 'gift' : 'normal';
    }

    function getKunxu(item) {
        const value = String(item?.kunxu || '').trim();
        return value && value !== '不捆' ? value : '不捆';
    }

    function collectMatchedCns(keyword, plateEntries) {
        const result = new Set();
        plateEntries.forEach(({ item }) => {
            (item?.claimers || []).forEach(claimer => {
                const cn = normalizeCn(claimer);
                if (cn && cn.toLowerCase().includes(keyword)) result.add(cn);
            });
        });
        getPaymentBatches().forEach(batch => {
            (batch.entries || []).forEach(entry => {
                const cn = String(entry.cn || '').trim();
                if (cn && cn.toLowerCase().includes(keyword)) result.add(cn);
            });
        });
        return Array.from(result).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }));
    }

    function addClaimDetail(bucket, entry, quantity, forced) {
        if (quantity <= 0) return;
        const item = entry.item || {};
        const category = String(item.category || '未命名谷子');
        const price = Number(item.price || 0);
        const itemType = getItemType(item);
        const kunxu = getKunxu(item);
        const itemKey = item.id || item.itemId || entry.index;
        const key = [itemKey, category, price, kunxu, itemType].join('|');
        const existing = bucket.get(key);
        if (existing) {
            existing.quantity += quantity;
            existing.cost = existing.quantity * existing.price;
            return;
        }
        bucket.set(key, {
            category,
            price,
            quantity,
            cost: quantity * price,
            imgSrc: item.imgSrc || FALLBACK_IMAGE,
            isForced: forced,
            itemType,
            kunxu
        });
    }

    function buildSummary(cn, plateEntries) {
        const voluntary = new Map();
        const forced = new Map();
        plateEntries.forEach(entry => {
            const claimers = entry.item?.claimers || [];
            const voluntaryCount = claimers.filter(name => normalizeCn(name) === cn && !isForced(name)).length;
            const forcedCount = claimers.filter(name => normalizeCn(name) === cn && isForced(name)).length;
            addClaimDetail(voluntary, entry, voluntaryCount, false);
            addClaimDetail(forced, entry, forcedCount, true);
        });

        const voluntaryClaims = Array.from(voluntary.values());
        const forcedClaims = Array.from(forced.values());
        const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);
        const voluntaryQuantity = sum(voluntaryClaims, 'quantity');
        const forcedQuantity = sum(forcedClaims, 'quantity');
        const voluntaryCost = sum(voluntaryClaims, 'cost');
        const forcedCost = sum(forcedClaims, 'cost');
        return {
            cn,
            voluntaryClaims,
            forcedClaims,
            voluntaryQuantity,
            forcedQuantity,
            voluntaryCost,
            forcedCost,
            totalQuantity: voluntaryQuantity + forcedQuantity,
            totalCost: voluntaryCost + forcedCost,
            itemKinds: voluntaryClaims.length + forcedClaims.length
        };
    }

    function icon(name) {
        const icons = {
            hand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5-7a2 2 0 0 0-4 0v7-5a2 2 0 0 0-4 0v7l-1.4-1.4a2 2 0 0 0-2.8 2.8l5.4 5.4A4 4 0 0 0 10 21h4a6 6 0 0 0 6-6v-4a2 2 0 0 0-4 0"/></svg>',
            package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16.5 9.4-9-5.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l3-1.7M3.3 7 12 12l8.7-5M12 22V12m7 1v6m3-3h-6"/></svg>',
            chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
            download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>'
        };
        return `<span class="settlement-icon">${icons[name] || ''}</span>`;
    }

    function renderClaimItem(item) {
        const giftTag = item.itemType === 'gift' ? '<span class="settlement-item-tag gift">赠品</span>' : '';
        const kunxuTag = item.kunxu && item.kunxu !== '不捆'
            ? `<span class="settlement-item-tag">${escapeHtml(item.kunxu)}</span>`
            : '<span class="settlement-item-tag">不捆</span>';
        return `
            <article class="settlement-item">
                <button class="settlement-image-button" type="button" aria-label="放大查看 ${escapeHtml(item.category)}">
                    <img src="${escapeHtml(item.imgSrc)}" alt="${escapeHtml(item.category)}" data-local-image-fallback="${escapeHtml(FALLBACK_IMAGE)}" onerror="this.src='${escapeHtml(FALLBACK_IMAGE)}';this.onerror=null;">
                </button>
                <div class="settlement-item-copy">
                    <strong title="${escapeHtml(item.category)}">${escapeHtml(item.category)}</strong>
                    <div class="settlement-item-tags">${kunxuTag}${giftTag}<span class="settlement-item-tag">${formatMoney(item.price)} / 点</span></div>
                </div>
                <div class="settlement-item-money"><strong>${item.quantity} 点</strong><span>${formatMoney(item.cost)}</span></div>
            </article>`;
    }

    function renderClaimSection(title, type, items, points, amount) {
        return `
            <section class="settlement-section ${type}">
                <header class="settlement-section-head">
                    <span>${icon(type === 'forced' ? 'package' : 'hand')}<strong>${title}</strong></span>
                    <b>${points} 点 · ${formatMoney(amount)}</b>
                </header>
                <div class="settlement-item-list">
                    ${items.length ? items.map(renderClaimItem).join('') : '<div class="settlement-section-empty">没有这类认领</div>'}
                </div>
            </section>`;
    }

    function renderCard(summary, index) {
        const detailId = `settlement-detail-${index}`;
        const card = document.createElement('article');
        card.className = 'summary-card settlement-card expanded open';
        card.style.setProperty('--settlement-delay', `${Math.min(index, 12) * 24}ms`);
        card.innerHTML = `
            <button class="summary-toggle-btn settlement-card-toggle" type="button" aria-expanded="true" aria-controls="${detailId}">
                <span class="settlement-identity">
                    <span class="settlement-avatar">${escapeHtml(summary.cn.slice(0, 1).toUpperCase())}</span>
                    <span class="settlement-name"><strong>${escapeHtml(summary.cn)}</strong><small>${summary.itemKinds} 款 · ${summary.totalQuantity} 点</small></span>
                </span>
                <span class="settlement-quick-stats">
                    <span class="settlement-quick-stat voluntary"><span>主动排</span><strong>${summary.voluntaryQuantity} 点 / ${formatMoney(summary.voluntaryCost)}</strong></span>
                    <span class="settlement-quick-stat forced"><span>捆排</span><strong>${summary.forcedQuantity} 点 / ${formatMoney(summary.forcedCost)}</strong></span>
                </span>
                <span class="settlement-total"><span><strong>${formatMoney(summary.totalCost)}</strong><small>合计金额</small></span>${icon('chevron')}</span>
            </button>
            <div class="summary-detail-container settlement-card-body" id="${detailId}" aria-hidden="false">
                <div class="settlement-claim-sections">
                    ${renderClaimSection('主动排的谷', 'voluntary', summary.voluntaryClaims, summary.voluntaryQuantity, summary.voluntaryCost)}
                    ${renderClaimSection('捆排的谷', 'forced', summary.forcedClaims, summary.forcedQuantity, summary.forcedCost)}
                </div>
                ${typeof renderClientPaymentPanel === 'function' ? renderClientPaymentPanel(summary.cn) : ''}
                <footer class="settlement-card-actions">
                    <span>共 ${summary.totalQuantity} 点，合计 ${formatMoney(summary.totalCost)}</span>
                    <button class="btn export-btn settlement-export-button" type="button">${icon('download')}导出 ${escapeHtml(summary.cn)} 的结算单</button>
                </footer>
            </div>`;

        const toggle = card.querySelector('.settlement-card-toggle');
        toggle.addEventListener('click', () => toggleSummaryDetail(detailId, toggle));
        card.querySelectorAll('.settlement-image-button').forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();
                const image = button.querySelector('img');
                if (image && typeof openImgModal === 'function') openImgModal(image.src);
            });
        });
        card.querySelector('.settlement-export-button')?.addEventListener('click', () => {
            if (typeof exportUserSummary === 'function') exportUserSummary(summary.cn, summary);
        });
        return card;
    }

    function renderSummaryPageUpgrade() {
        const query = typeof currentSearchCN !== 'undefined' ? String(currentSearchCN || '').trim() : '';
        if (!query) return;
        const container = document.getElementById('summary-container');
        if (!container) return;
        container.innerHTML = '';
        container.classList.add('settlement-summary-list');

        const plateEntries = getPlateEntries();
        const matchedCns = collectMatchedCns(query.toLowerCase(), plateEntries);
        if (!matchedCns.length) {
            container.innerHTML = `<div class="no-summary-data">未查询到包含【${escapeHtml(query)}】的认领记录</div>`;
            return;
        }

        matchedCns.forEach((cn, index) => container.appendChild(renderCard(buildSummary(cn, plateEntries), index)));
        global.GroupDeskLocalImages?.scan?.(container);
    }

    function toggleSummaryDetailUpgrade(detailId, button) {
        const detail = document.getElementById(detailId);
        if (!detail || !button) return;
        const card = button.closest('.settlement-card');
        const expanded = button.getAttribute('aria-expanded') !== 'false' && getComputedStyle(detail).display !== 'none';
        const nextExpanded = !expanded;
        button.setAttribute('aria-expanded', String(nextExpanded));
        button.classList.toggle('collapsed', !nextExpanded);
        card?.classList.toggle('expanded', nextExpanded);
        card?.classList.toggle('open', nextExpanded);
        if (global.ClientDisclosureMotion?.set) {
            global.ClientDisclosureMotion.set(detail, nextExpanded, { display: 'block' });
        } else {
            detail.style.display = nextExpanded ? 'block' : 'none';
            detail.setAttribute('aria-hidden', String(!nextExpanded));
        }
    }

    global.renderSummaryPage = renderSummaryPageUpgrade;
    global.toggleSummaryDetail = toggleSummaryDetailUpgrade;
})(window);
