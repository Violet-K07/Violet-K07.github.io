(function () {
    const SWITCHER_ID = 'workspaceSwitcher';
    const STYLE_ID = 'workspaceSwitcherStyle';
    const COLLAPSE_KEY = 'workspaceSwitcherCollapsed';
    const DEFAULT_GROUP = '当前默认团';
    const DEFAULT_PLATE = '1w3shu hk盘';

    const modeCopy = {
        client: {
            manage: '我的团',
            pageScopeTitle: '本页范围',
            plateScope: '当前盘',
            groupScope: '当前团',
            descPlate: '浏览、认领、到货查询会跟随当前盘。',
            descGroup: '排发申请会按当前团汇总可排发内容。',
            groupLabel: '先选团',
            plateLabel: '再选这个团里的盘',
            createGroup: '加入新团',
            createPlate: '新建盘',
            ownerEntry: '我要开团'
        },
        admin: {
            manage: '团盘管理',
            pageScopeTitle: '本页范围',
            plateScope: '当前盘',
            groupScope: '当前团',
            descPlate: '录入、肾表、到货、调价会跟随当前盘。',
            descGroup: '排发管理、全团查询会按当前团跨盘汇总。',
            groupLabel: '先选团',
            plateLabel: '再选这个团里的盘',
            createGroup: '新建团',
            createPlate: '新建盘',
            ownerEntry: '我要开团'
        }
    };

    let state = {
        meta: null,
        saving: false
    };

    function getPublishedConfig() {
        const config = window.PUBLISHED_WORKSPACE_CONFIG;
        if (!config || !Array.isArray(config.plates) || !config.plates.length) return null;
        return config;
    }

    function getPublishedPlateIds() {
        return new Set((getPublishedConfig()?.plates || []).map(plate => String(plate.id || '')));
    }

    function getPublishedGroup(meta) {
        const config = getPublishedConfig();
        if (!config) return null;
        const allowedIds = getPublishedPlateIds();
        return (meta?.groups || []).find(group => group.id === config.groupId)
            || (meta?.groups || []).find(group => (group.plates || []).some(plate => allowedIds.has(plate.id)))
            || null;
    }

    function getPublishedPlates(group) {
        const config = getPublishedConfig();
        if (!config || !group) return [];
        return config.plates.map(descriptor => {
            const plate = (group.plates || []).find(item => item.id === descriptor.id)
                || (group.plates || []).find(item => item.name === descriptor.name);
            return plate ? { ...plate, publishLabel: descriptor.shortName || descriptor.name || plate.name } : null;
        }).filter(Boolean);
    }

    function getPublishedActivePlate(meta, plates) {
        if (!plates.length) return null;
        const selectedId = window.getPublishedWorkspaceSelection?.()?.activePlate?.id
            || String(localStorage.getItem('currentPlateId') || '').trim()
            || meta?.activePlateId;
        return plates.find(plate => plate.id === selectedId) || null;
    }

    function getMode() {
        const bodyMode = document.body?.dataset?.groupMode;
        if (bodyMode === 'admin' || bodyMode === 'client') return bodyMode;
        return location.pathname.includes('/admin/') ? 'admin' : 'client';
    }

    function getCopy() {
        return modeCopy[getMode()] || modeCopy.client;
    }

    function getTool(name) {
        return typeof window[name] === 'function' ? window[name] : null;
    }

    function getDefaultGroupName() {
        return window.DEFAULT_GROUP_NAME || DEFAULT_GROUP;
    }

    function getDefaultPlateName() {
        return window.DEFAULT_PLATE_NAME || DEFAULT_PLATE;
    }

    function createId(prefix) {
        const factory = getTool('createWorkspaceId');
        return factory ? factory(prefix) : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function createDefaultMeta(groupName = getDefaultGroupName(), plateName = getDefaultPlateName()) {
        const factory = getTool('createDefaultWorkspaceMeta');
        if (factory) return factory(groupName, plateName);
        return {
            version: 1,
            groups: [{
                id: 'group-default',
                name: groupName || getDefaultGroupName(),
                plates: [{ id: 'plate-default', name: plateName || getDefaultPlateName() }]
            }],
            activeGroupId: 'group-default',
            activePlateId: 'plate-default'
        };
    }

    function normalizeMeta(meta) {
        const normalizer = getTool('normalizeWorkspaceMeta');
        if (normalizer) return normalizer(meta || createDefaultMeta());

        const source = meta && typeof meta === 'object' ? meta : createDefaultMeta();
        const groups = Array.isArray(source.groups) && source.groups.length ? source.groups : createDefaultMeta().groups;
        const activeGroup = groups.find(group => group.id === source.activeGroupId) || groups[0];
        if (!Array.isArray(activeGroup.plates) || !activeGroup.plates.length) {
            activeGroup.plates = [{ id: createId('plate'), name: getDefaultPlateName() }];
        }
        const activePlate = activeGroup.plates.find(plate => plate.id === source.activePlateId) || activeGroup.plates[0];
        return {
            version: Number(source.version || 1) || 1,
            groups,
            activeGroupId: activeGroup.id,
            activePlateId: activePlate.id
        };
    }

    function readMeta() {
        const getter = getTool('getWorkspaceMeta');
        if (getter) return normalizeMeta(getter());
        try {
            return normalizeMeta(JSON.parse(localStorage.getItem('workspaceMeta') || 'null'));
        } catch (error) {
            return normalizeMeta(createDefaultMeta());
        }
    }

    function getActiveGroup(meta = state.meta) {
        return (meta?.groups || []).find(group => group.id === meta.activeGroupId) || meta?.groups?.[0] || null;
    }

    function getActivePlate(meta = state.meta, group = getActiveGroup(meta)) {
        if (!group) return null;
        return (group.plates || []).find(plate => plate.id === meta.activePlateId) || group.plates?.[0] || null;
    }

    function persistMeta(meta) {
        const normalized = normalizeMeta(meta);
        const persister = getTool('persistWorkspaceMeta');
        if (persister) return persister(normalized);

        const group = getActiveGroup(normalized);
        const plate = getActivePlate(normalized, group);
        localStorage.setItem('workspaceMeta', JSON.stringify(normalized));
        localStorage.setItem('groupName', group?.name || getDefaultGroupName());
        localStorage.setItem('plateName', plate?.name || getDefaultPlateName());
        localStorage.setItem('currentGroupId', normalized.activeGroupId);
        localStorage.setItem('currentPlateId', normalized.activePlateId);
        return normalized;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function isGroupManagerPage() {
        return /\/group\.html$/i.test(location.pathname.replace(/\\/g, '/'));
    }

    function getPageScope() {
        const file = location.pathname.split('/').pop() || '';
        if (file === 'shipping.html') return 'group';
        return 'plate';
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .workspace-mini {
                width: min(1180px, calc(100% - 32px));
                margin: 14px auto 0;
                border: 1px solid var(--border-color, #dfe7f3);
                border-radius: 16px;
                background: var(--container-bg, #fff);
                box-shadow: var(--card-shadow, 0 10px 28px rgba(31, 45, 61, .08));
                overflow: hidden;
            }
            .workspace-mini-bar {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 12px;
                align-items: center;
                padding: 12px 14px;
            }
            .workspace-mini-main {
                min-width: 0;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 9px;
                color: var(--text-color, #1f2937);
            }
            .workspace-mini-label {
                color: var(--text-secondary, #667085);
                font-size: 12px;
                font-weight: 900;
                letter-spacing: .04em;
            }
            .workspace-breadcrumb {
                display: inline-flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 7px;
                min-width: 0;
                font-size: 15px;
                font-weight: 900;
            }
            .workspace-breadcrumb .group-name,
            .workspace-breadcrumb .plate-name {
                max-width: 240px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .workspace-breadcrumb .plate-name {
                color: var(--primary-color, #4a90e2);
            }
            .workspace-breadcrumb .sep {
                color: var(--text-secondary, #667085);
                font-weight: 800;
            }
            .workspace-scope-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 9px;
                border-radius: 999px;
                background: var(--light-bg, #eef4fb);
                color: var(--text-secondary, #667085);
                border: 1px solid var(--border-color, #dfe7f3);
                font-size: 12px;
                font-weight: 800;
            }
            .workspace-mini-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
            }
            .workspace-mini-btn,
            .workspace-mini-link {
                min-height: 34px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                padding: 0 12px;
                border: 1px solid var(--border-color, #dfe7f3);
                background: var(--light-bg, #f8fafc);
                color: var(--text-color, #1f2937);
                font-size: 12px;
                font-weight: 900;
                text-decoration: none;
                cursor: pointer;
                white-space: nowrap;
            }
            .workspace-mini-btn.primary {
                border-color: var(--primary-color, #4a90e2);
                color: #fff;
                background: var(--primary-color, #4a90e2);
            }
            .workspace-mini-panel {
                display: grid;
                max-height: 0;
                visibility: hidden;
                opacity: 0;
                overflow: hidden;
                transform: translateY(-5px);
                gap: 0;
                border-top: 1px solid var(--border-color, #dfe7f3);
                padding: 0 14px;
                background: var(--light-bg, #f8fafc);
                transition: max-height .24s cubic-bezier(.22, 1, .36, 1),
                    grid-template-rows .24s cubic-bezier(.22, 1, .36, 1),
                    padding .24s cubic-bezier(.22, 1, .36, 1),
                    opacity .18s ease, transform .24s cubic-bezier(.22, 1, .36, 1),
                    visibility 0s linear .24s;
            }
            .workspace-mini.expanded .workspace-mini-panel {
                max-height: 460px;
                visibility: visible;
                opacity: 1;
                transform: translateY(0);
                gap: 12px;
                padding: 14px;
                transition-delay: 0s;
            }
            .workspace-hierarchy {
                display: grid;
                grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
                gap: 10px;
                align-items: end;
            }
            .workspace-field {
                display: grid;
                gap: 6px;
            }
            .workspace-field span {
                color: var(--text-secondary, #667085);
                font-size: 12px;
                font-weight: 900;
            }
            .workspace-field select {
                width: 100%;
                min-height: 40px;
                border: 1px solid var(--border-color, #dfe7f3);
                border-radius: 12px;
                background: var(--container-bg, #fff);
                color: var(--text-color, #1f2937);
                padding: 0 11px;
                font-weight: 800;
                outline: none;
            }
            .workspace-field select:focus {
                border-color: var(--primary-color, #4a90e2);
                box-shadow: 0 0 0 3px rgba(74, 144, 226, .13);
            }
            .workspace-contains {
                align-self: center;
                justify-self: center;
                color: var(--text-secondary, #667085);
                font-size: 12px;
                font-weight: 900;
            }
            .workspace-panel-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
            }
            .workspace-note {
                color: var(--text-secondary, #667085);
                font-size: 12px;
                line-height: 1.55;
            }
            .workspace-status {
                min-height: 16px;
                color: var(--text-secondary, #667085);
                font-size: 12px;
                font-weight: 700;
            }
            .workspace-status.success { color: var(--success-color, #2f9e44); }
            .workspace-status.error { color: var(--danger-color, #d64545); }
            .workspace-modal-mask {
                position: fixed;
                inset: 0;
                z-index: 10000;
                background: rgba(15, 23, 42, .38);
                display: grid;
                place-items: center;
                padding: 18px;
            }
            .workspace-modal {
                width: min(420px, 100%);
                padding: 18px;
                border-radius: 20px;
                background: var(--container-bg, #fff);
                border: 1px solid var(--border-color, #dfe7f3);
                box-shadow: 0 20px 60px rgba(15, 23, 42, .22);
            }
            .workspace-modal-title {
                font-size: 18px;
                font-weight: 900;
                color: var(--text-color, #1f2937);
            }
            .workspace-modal input {
                margin-top: 14px;
                width: 100%;
                min-height: 44px;
                box-sizing: border-box;
                border: 1px solid var(--border-color, #dfe7f3);
                border-radius: 13px;
                padding: 0 12px;
                background: var(--light-bg, #f8fafc);
                color: var(--text-color, #1f2937);
                font-weight: 800;
                outline: none;
            }
            .workspace-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 16px;
            }
            [data-theme="dark"] .workspace-mini {
                border-color: var(--border-color, #333);
                background: var(--container-bg, #1e1e1e);
                box-shadow: var(--card-shadow, 0 10px 28px rgba(0, 0, 0, .35));
            }
            [data-theme="dark"] .workspace-mini-bar,
            [data-theme="dark"] .workspace-mini-main,
            [data-theme="dark"] .workspace-breadcrumb {
                color: var(--text-color, #e0e0e0);
            }
            [data-theme="dark"] .workspace-mini-label,
            [data-theme="dark"] .workspace-breadcrumb .sep,
            [data-theme="dark"] .workspace-scope-pill,
            [data-theme="dark"] .workspace-note,
            [data-theme="dark"] .workspace-status,
            [data-theme="dark"] .workspace-field span,
            [data-theme="dark"] .workspace-contains {
                color: var(--text-secondary, #b0b0b0);
            }
            [data-theme="dark"] .workspace-scope-pill,
            [data-theme="dark"] .workspace-mini-btn,
            [data-theme="dark"] .workspace-mini-link,
            [data-theme="dark"] .workspace-mini-panel,
            [data-theme="dark"] .workspace-field select,
            [data-theme="dark"] .workspace-modal input {
                border-color: var(--border-color, #333);
                background: var(--light-bg, #2d2d2d);
                color: var(--text-color, #e0e0e0);
            }
            [data-theme="dark"] .workspace-mini-btn:hover,
            [data-theme="dark"] .workspace-mini-link:hover {
                border-color: var(--primary-color, #4dabf7);
                color: var(--primary-color, #4dabf7);
            }
            [data-theme="dark"] .workspace-mini-btn.primary {
                border-color: var(--primary-color, #4dabf7);
                background: var(--primary-color, #4dabf7);
                color: #08111f;
            }
            [data-theme="dark"] .workspace-mini-panel {
                border-top-color: var(--border-color, #333);
            }
            @media (prefers-reduced-motion: reduce) {
                .workspace-mini-panel { transition: none; }
            }
            [data-theme="dark"] .workspace-modal {
                border-color: var(--border-color, #333);
                background: var(--container-bg, #1e1e1e);
            }
            [data-theme="dark"] .workspace-modal-title {
                color: var(--text-color, #e0e0e0);
            }
            @media (max-width: 760px) {
                .workspace-mini {
                    width: min(100% - 20px, 1180px);
                    margin-top: 10px;
                }
                .workspace-mini-bar {
                    grid-template-columns: 1fr;
                }
                .workspace-mini-actions {
                    justify-content: flex-start;
                    flex-wrap: wrap;
                }
                .workspace-hierarchy {
                    grid-template-columns: 1fr;
                }
                .workspace-contains {
                    justify-self: start;
                }
                .workspace-breadcrumb .group-name,
                .workspace-breadcrumb .plate-name {
                    max-width: 170px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureShell() {
        if (document.getElementById(SWITCHER_ID)) return;
        ensureStyles();
        const copy = getCopy();
        const collapsed = localStorage.getItem(COLLAPSE_KEY) !== 'false';
        const scope = getPageScope();
        const isClient = getMode() === 'client';
        const publishedConfig = getPublishedConfig();
        const panelActions = publishedConfig
            ? ''
            : isClient
            ? `
                <button type="button" class="workspace-mini-btn primary" id="workspaceJoinGroupBtn">${escapeHtml(copy.createGroup)}</button>
                <a class="workspace-mini-link" href="../admin/group.html">${escapeHtml(copy.ownerEntry)}</a>
                <button type="button" class="workspace-mini-btn" id="workspaceDemoBtn">载入模拟团盘</button>
            `
            : `
                <button type="button" class="workspace-mini-btn primary" id="workspaceCreateGroupBtn">${escapeHtml(copy.createGroup)}</button>
                <button type="button" class="workspace-mini-btn" id="workspaceCreatePlateBtn">${escapeHtml(copy.createPlate)}</button>
                <button type="button" class="workspace-mini-btn" id="workspaceDemoBtn">载入模拟团盘</button>
            `;
        const panelNote = publishedConfig
            ? '浏览、购物车、结算和到货查询都会跟随当前选择的盘。'
            : (scope === 'group' ? copy.descGroup : copy.descPlate);
        const hierarchy = publishedConfig
            ? `
                <div class="workspace-published-picker">
                    <div class="workspace-published-picker-copy">
                        <span>切换数据</span>
                        <strong>选择要查看的盘</strong>
                    </div>
                    <div class="workspace-published-options" id="workspacePublishedPlateOptions" role="group" aria-label="选择要查看的盘"></div>
                </div>
                <div class="workspace-published-compat" hidden>
                    <select id="workspaceGroupSelect" aria-hidden="true" tabindex="-1"></select>
                    <select id="workspacePlateSelect" aria-hidden="true" tabindex="-1"></select>
                </div>
            `
            : `
                <div class="workspace-hierarchy">
                    <label class="workspace-field">
                        <span>${escapeHtml(copy.groupLabel)}</span>
                        <select id="workspaceGroupSelect"></select>
                    </label>
                    <div class="workspace-contains">包含</div>
                    <label class="workspace-field">
                        <span>${escapeHtml(copy.plateLabel)}</span>
                        <select id="workspacePlateSelect"></select>
                    </label>
                </div>
            `;
        const manageLink = publishedConfig ? '' : `<a class="workspace-mini-link" href="group.html">${escapeHtml(copy.manage)}</a>`;
        const shell = document.createElement('section');
        shell.id = SWITCHER_ID;
        shell.className = `workspace-mini ${publishedConfig ? 'workspace-published' : ''} ${collapsed ? 'collapsed' : 'expanded'}`;
        shell.innerHTML = `
            <div class="workspace-mini-bar">
                <div class="workspace-mini-main">
                    <span class="workspace-mini-label">当前</span>
                    <span class="workspace-breadcrumb" id="workspaceBreadcrumb"></span>
                    <span class="workspace-scope-pill">
                        <span>${escapeHtml(copy.pageScopeTitle)}</span>
                        <strong id="workspaceScopeText">${scope === 'group' ? copy.groupScope : copy.plateScope}</strong>
                    </span>
                </div>
                <div class="workspace-mini-actions">
                    <button type="button" class="workspace-mini-btn" id="workspaceToggleBtn" aria-expanded="${String(!collapsed)}">${collapsed ? '展开切换' : '收起'}</button>
                    ${manageLink}
                </div>
            </div>
            <div class="workspace-mini-panel">
                ${hierarchy}
                <div class="workspace-panel-actions">
                    ${panelActions}
                    <span class="workspace-note">${escapeHtml(panelNote)}</span>
                </div>
                <div class="workspace-status" id="workspaceSwitcherStatus"></div>
            </div>
        `;

        const container = document.querySelector('.container');
        if (container?.parentNode) {
            container.parentNode.insertBefore(shell, container);
        } else {
            document.body.insertBefore(shell, document.body.firstChild);
        }

        document.getElementById('workspaceToggleBtn')?.addEventListener('click', togglePanel);
        document.getElementById('workspaceGroupSelect')?.addEventListener('change', event => selectGroup(event.target.value));
        document.getElementById('workspacePlateSelect')?.addEventListener('change', event => selectPlate(event.target.value));
        document.getElementById('workspacePublishedPlateOptions')?.addEventListener('click', event => {
            const button = event.target.closest('[data-published-plate-id]');
            if (button && !button.disabled) selectPlate(button.dataset.publishedPlateId);
        });
        document.getElementById('workspaceJoinGroupBtn')?.addEventListener('click', openJoinGroupModal);
        document.getElementById('workspaceCreateGroupBtn')?.addEventListener('click', openCreateGroupModal);
        document.getElementById('workspaceCreatePlateBtn')?.addEventListener('click', openCreatePlateModal);
        document.getElementById('workspaceDemoBtn')?.addEventListener('click', () => {
            seedWorkspaceDemoData({ rerender: true });
        });
    }

    function togglePanel() {
        const shell = document.getElementById(SWITCHER_ID);
        const btn = document.getElementById('workspaceToggleBtn');
        if (!shell || !btn) return;
        const panel = shell.querySelector('.workspace-mini-panel');
        const isExpanded = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(isExpanded));
        localStorage.setItem(COLLAPSE_KEY, isExpanded ? 'false' : 'true');
        btn.textContent = isExpanded ? '收起' : '展开切换';

        if (window.ClientDisclosureMotion?.set && panel) {
            if (isExpanded) {
                shell.classList.add('expanded');
                shell.classList.remove('collapsed');
            }
            window.ClientDisclosureMotion.set(panel, isExpanded, { display: 'grid' }).then(() => {
                if (btn.getAttribute('aria-expanded') === 'false') {
                    shell.classList.remove('expanded');
                    shell.classList.add('collapsed');
                }
            });
            return;
        }

        shell.classList.toggle('expanded', isExpanded);
        shell.classList.toggle('collapsed', !isExpanded);
    }

    function setStatus(message, type = '') {
        const el = document.getElementById('workspaceSwitcherStatus');
        if (!el) return;
        el.textContent = message || '';
        el.className = `workspace-status ${type}`.trim();
    }

    function renderSwitcher() {
        ensureShell();
        state.meta = normalizeMeta(state.meta || readMeta());
        const publishedConfig = getPublishedConfig();
        let activeGroup = publishedConfig ? getPublishedGroup(state.meta) : getActiveGroup(state.meta);
        let publishedPlates = publishedConfig ? getPublishedPlates(activeGroup) : [];
        let activePlate = publishedConfig
            ? getPublishedActivePlate(state.meta, publishedPlates)
            : getActivePlate(state.meta, activeGroup);
        if (publishedConfig && publishedPlates.length && !publishedPlates.some(plate => plate.id === activePlate?.id)) {
            activePlate = publishedPlates.find(plate => plate.id === publishedConfig.defaultPlateId) || publishedPlates[0];
            state.meta.activeGroupId = activeGroup.id;
            state.meta.activePlateId = activePlate.id;
            state.meta = persistMeta(state.meta);
        }
        const groupSelect = document.getElementById('workspaceGroupSelect');
        const plateSelect = document.getElementById('workspacePlateSelect');
        const breadcrumb = document.getElementById('workspaceBreadcrumb');
        const publishedOptions = document.getElementById('workspacePublishedPlateOptions');

        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <span class="group-name">${escapeHtml(activeGroup?.name || '未选择团')}</span>
                <span class="sep">›</span>
                <span class="plate-name">${escapeHtml(activePlate?.name || '未选择盘')}</span>
            `;
        }

        if (!groupSelect || !plateSelect) return;
        const visibleGroups = publishedConfig && activeGroup ? [activeGroup] : state.meta.groups;
        groupSelect.innerHTML = visibleGroups.map(group => (
            `<option value="${escapeHtml(group.id)}"${group.id === state.meta.activeGroupId ? ' selected' : ''}>${escapeHtml(group.name)}</option>`
        )).join('');

        const plates = publishedConfig ? publishedPlates : (Array.isArray(activeGroup?.plates) ? activeGroup.plates : []);
        plateSelect.innerHTML = plates.map(plate => (
            `<option value="${escapeHtml(plate.id)}"${plate.id === activePlate?.id ? ' selected' : ''}>${escapeHtml(plate.name)}</option>`
        )).join('');
        if (publishedOptions) {
            publishedOptions.innerHTML = plates.map(plate => `
                <button type="button" data-published-plate-id="${escapeHtml(plate.id)}" class="${plate.id === activePlate?.id ? 'active' : ''}" aria-pressed="${String(plate.id === activePlate?.id)}">
                    <span>${escapeHtml(plate.publishLabel || plate.name)}</span>
                    <small>${escapeHtml(plate.name)}</small>
                </button>
            `).join('');
        }
    }

    function openNameModal(title, placeholder, onSubmit) {
        ensureStyles();
        const mask = document.createElement('div');
        mask.className = 'workspace-modal-mask';
        mask.innerHTML = `
            <div class="workspace-modal" role="dialog" aria-modal="true">
                <div class="workspace-modal-title">${escapeHtml(title)}</div>
                <input type="text" id="workspaceModalInput" placeholder="${escapeHtml(placeholder)}">
                <div class="workspace-modal-actions">
                    <button type="button" class="workspace-mini-btn" id="workspaceModalCancel">取消</button>
                    <button type="button" class="workspace-mini-btn primary" id="workspaceModalConfirm">确认</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const input = mask.querySelector('#workspaceModalInput');
        const close = () => mask.remove();
        const confirm = async () => {
            const value = input.value.trim();
            if (!value) {
                input.focus();
                return;
            }
            await onSubmit(value);
            close();
        };
        mask.querySelector('#workspaceModalCancel').addEventListener('click', close);
        mask.querySelector('#workspaceModalConfirm').addEventListener('click', confirm);
        mask.addEventListener('click', event => {
            if (event.target === mask) close();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirm();
            }
            if (event.key === 'Escape') close();
        });
        setTimeout(() => input.focus(), 0);
    }

    function openCreateGroupModal() {
        const copy = getCopy();
        openNameModal(copy.createGroup, '输入团名', async name => {
            const meta = normalizeMeta(state.meta || readMeta());
            const group = {
                id: createId('group'),
                name,
                plates: [{ id: createId('plate'), name: getDefaultPlateName() }],
                archived: false,
                createdAt: new Date().toISOString()
            };
            meta.groups.push(group);
            meta.activeGroupId = group.id;
            meta.activePlateId = group.plates[0].id;
            await saveMeta(meta, '新团已创建');
        });
    }

    function openJoinGroupModal() {
        openNameModal('加入新团', '输入邀请码 / 团链接', async value => {
            setStatus(`已收到加入信息：${value}。邀请链接接入前，可先用“载入模拟团盘”预览多团效果。`);
        });
    }

    function openCreatePlateModal() {
        const copy = getCopy();
        openNameModal(copy.createPlate, '输入盘名', async name => {
            const meta = normalizeMeta(state.meta || readMeta());
            const group = meta.groups.find(item => item.id === meta.activeGroupId) || meta.groups[0];
            if (!group) return;
            const plate = {
                id: createId('plate'),
                name,
                createdAt: new Date().toISOString()
            };
            if (!Array.isArray(group.plates)) group.plates = [];
            group.plates.push(plate);
            meta.activeGroupId = group.id;
            meta.activePlateId = plate.id;
            await saveMeta(meta, '新盘已创建');
        });
    }

    async function selectGroup(groupId) {
        if (getPublishedConfig()) return;
        const meta = normalizeMeta(state.meta || readMeta());
        const group = meta.groups.find(item => item.id === groupId);
        if (!group) return;
        meta.activeGroupId = group.id;
        const plate = (group.plates || []).find(item => item.id === meta.activePlateId) || group.plates?.[0];
        if (plate) meta.activePlateId = plate.id;
        await saveMeta(meta, `已切换到 ${group.name}`);
    }

    async function selectPlate(plateId) {
        const meta = normalizeMeta(state.meta || readMeta());
        const publishedConfig = getPublishedConfig();
        const group = publishedConfig ? getPublishedGroup(meta) : (meta.groups.find(item => item.id === meta.activeGroupId) || meta.groups[0]);
        const plate = (group?.plates || []).find(item => item.id === plateId);
        if (!group || !plate) return;
        if (publishedConfig && !getPublishedPlateIds().has(plate.id)) return;
        meta.activeGroupId = group.id;
        meta.activePlateId = plate.id;
        if (publishedConfig) {
            const selectedMeta = typeof window.setWorkspaceSelection === 'function'
                ? window.setWorkspaceSelection(group.id, plate.id)
                : persistMeta(meta);
            state.meta = normalizeMeta(selectedMeta || meta);
            renderSwitcher();
            setStatus(`已切换到 ${plate.name}`, 'success');
            window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { meta: state.meta } }));
            if (shouldReloadAfterChange()) setTimeout(() => location.reload(), 120);
            return;
        }
        await saveMeta(meta, `已切换到 ${group.name} / ${plate.name}`);
    }

    function shouldReloadAfterChange() {
        return !isGroupManagerPage();
    }

    function readLocalArray(keys) {
        for (const key of keys) {
            try {
                const parsed = JSON.parse(localStorage.getItem(key) || 'null');
                if (Array.isArray(parsed)) return parsed;
            } catch (error) {
                console.warn(`workspace switcher ignored invalid ${key}:`, error);
            }
        }
        return [];
    }

    async function loadDataForSave() {
        const fetcher = typeof fetchGuziDataFromGist === 'function' ? fetchGuziDataFromGist : null;
        if (fetcher) {
            try {
                return await fetcher();
            } catch (error) {
                console.warn('workspace switcher cloud fetch failed, using local backup:', error);
            }
        }
        const fallbackGetter = getMode() === 'admin' ? getTool('getAdminLocalFallbackData') : getTool('getClientLocalFallbackData');
        if (fallbackGetter) return fallbackGetter('workspace-switcher', '使用本机备份保存团盘信息。');
        return {
            guziData: readLocalArray(['guziData_backup', 'guziData']),
            claimRecords: readLocalArray(['claimRecords_backup', 'claimRecords']),
            shippingRequests: readLocalArray(['shippingRequests_backup', 'shippingRequests'])
        };
    }

    async function syncMetaToCloud(meta) {
        const saver = typeof saveGuziDataToGist === 'function' ? saveGuziDataToGist : null;
        if (!saver) return false;
        if (getMode() === 'client' && typeof getGistToken === 'function' && !getGistToken()) return false;

        const group = getActiveGroup(meta);
        const plate = getActivePlate(meta, group);
        const data = await loadDataForSave();
        await saver({
            ...data,
            workspaceMeta: meta,
            groupId: group?.id || meta.activeGroupId,
            groupName: group?.name || getDefaultGroupName(),
            plateId: plate?.id || meta.activePlateId,
            plateName: plate?.name || getDefaultPlateName()
        });
        return true;
    }

    async function saveMeta(meta, message) {
        if (state.saving) return;
        state.saving = true;
        state.meta = persistMeta(meta);
        renderSwitcher();
        setStatus(`${message || '已更新'}，正在保存...`);

        try {
            const synced = await syncMetaToCloud(state.meta);
            setStatus(synced ? '已同步到云端' : '已保存在本机', synced ? 'success' : '');
        } catch (error) {
            console.error('workspace switcher save failed:', error);
            setStatus(`已保存在本机，云端同步失败：${error.message || '未知错误'}`, 'error');
        } finally {
            state.saving = false;
            window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { meta: state.meta } }));
            if (shouldReloadAfterChange()) {
                setTimeout(() => location.reload(), 500);
            }
        }
    }

    function createDemoWorkspaceMeta() {
        return normalizeMeta({
            version: 1,
            groups: [
                {
                    id: 'group-default',
                    name: getDefaultGroupName(),
                    plates: [
                        { id: 'plate-default', name: getDefaultPlateName() },
                        { id: 'plate-hk-second', name: '1w3shu hk二盘' },
                        { id: 'plate-hk-mini', name: '1w3shu hk小余量盘' }
                    ],
                    archived: false,
                    createdAt: '2026-05-16T00:00:00.000Z'
                },
                {
                    id: 'group-birthday',
                    name: '生贺谷团',
                    plates: [
                        { id: 'plate-birthday-01', name: '生贺吧唧盘' },
                        { id: 'plate-birthday-02', name: '生贺拍立得盘' },
                        { id: 'plate-birthday-gift', name: '生贺赠品盘' }
                    ],
                    archived: false,
                    createdAt: '2026-05-16T00:00:00.000Z'
                },
                {
                    id: 'group-stock',
                    name: '现货余量团',
                    plates: [
                        { id: 'plate-stock-ready', name: '现货可排盘' },
                        { id: 'plate-stock-restock', name: '补款后余量盘' }
                    ],
                    archived: false,
                    createdAt: '2026-05-16T00:00:00.000Z'
                }
            ],
            activeGroupId: 'group-default',
            activePlateId: 'plate-default'
        });
    }

    function seedWorkspaceDemoData(options = {}) {
        const meta = createDemoWorkspaceMeta();
        state.meta = persistMeta(meta);
        renderSwitcher();
        setStatus('已载入本机模拟团盘。模拟数据只用于预览 UI。', 'success');
        window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { meta: state.meta, demo: true } }));
        if (options.reload) location.reload();
        return state.meta;
    }

    function init() {
        window.createDemoWorkspaceMeta = createDemoWorkspaceMeta;
        window.seedWorkspaceDemoData = seedWorkspaceDemoData;
        if (isGroupManagerPage()) return;
        state.meta = readMeta();
        renderSwitcher();
    }

    window.addEventListener('published:workspace-ready', event => {
        if (isGroupManagerPage()) return;
        state.meta = normalizeMeta(event.detail?.meta || readMeta());
        renderSwitcher();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
