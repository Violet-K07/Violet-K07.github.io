(function (global) {
    'use strict';

    const config = Object.freeze({
        groupId: 'group-default',
        defaultPlateId: 'plate-ms0kr6b4-cjozwv',
        plates: Object.freeze([
            Object.freeze({ id: 'plate-ms0kr6b4-cjozwv', name: 'shu2w+盘', shortName: '2w盘' }),
            Object.freeze({ id: 'plate-ms4me7qy-619rjj', name: 'shu 6800+立牌盘', shortName: '6k立牌盘' })
        ])
    });
    const allowedPlateIds = new Set(config.plates.map(plate => plate.id));
    const originalGetWorkspaceMeta = typeof global.getWorkspaceMeta === 'function'
        ? global.getWorkspaceMeta
        : null;
    const originalGetWorkspaceSelection = typeof global.getCurrentWorkspaceSelection === 'function'
        ? global.getCurrentWorkspaceSelection
        : null;

    global.PUBLISHED_WORKSPACE_CONFIG = config;

    function readStoredPlateId() {
        const direct = String(localStorage.getItem('currentPlateId') || '').trim();
        if (allowedPlateIds.has(direct)) return direct;
        try {
            const stored = JSON.parse(localStorage.getItem('workspaceMeta') || 'null');
            const plateId = String(stored?.activePlateId || '').trim();
            return allowedPlateIds.has(plateId) ? plateId : '';
        } catch (error) {
            return '';
        }
    }

    function getMeta(source) {
        if (source?.workspaceMeta?.groups) return source.workspaceMeta;
        if (originalGetWorkspaceMeta) return originalGetWorkspaceMeta.call(global);
        try {
            return JSON.parse(localStorage.getItem('workspaceMeta') || 'null');
        } catch (error) {
            return null;
        }
    }

    function findPublishedContext(meta, preferredPlateId = readStoredPlateId()) {
        if (!meta || !Array.isArray(meta.groups)) return null;
        const group = meta.groups.find(item => item?.id === config.groupId)
            || meta.groups.find(item => item?.plates?.some(plate => allowedPlateIds.has(plate?.id)));
        if (!group || !Array.isArray(group.plates)) return null;

        const availablePlates = config.plates
            .map(descriptor => {
                const plate = group.plates.find(item => item?.id === descriptor.id)
                    || group.plates.find(item => item?.name === descriptor.name);
                return plate ? { descriptor, plate } : null;
            })
            .filter(Boolean);
        if (!availablePlates.length) return null;

        const selected = availablePlates.find(item => item.plate.id === preferredPlateId)
            || availablePlates.find(item => item.plate.id === config.defaultPlateId)
            || availablePlates[0];
        return { group, plate: selected.plate, descriptor: selected.descriptor };
    }

    function getPublishedSelection(meta, preferredPlateId) {
        const context = findPublishedContext(meta, preferredPlateId);
        if (!context) return null;
        return {
            meta: {
                ...meta,
                activeGroupId: context.group.id,
                activePlateId: context.plate.id
            },
            activeGroup: context.group,
            activePlate: context.plate,
            descriptor: context.descriptor
        };
    }

    function applyPublishedContext(source, preferredPlateId) {
        const meta = getMeta(source);
        const selection = getPublishedSelection(meta, preferredPlateId);
        if (!selection) return source;

        const nextMeta = selection.meta;
        global.persistWorkspaceMeta?.(nextMeta);

        if (source && typeof source === 'object') {
            source.workspaceMeta = nextMeta;
            source.groupId = selection.activeGroup.id;
            source.groupName = selection.activeGroup.name;
            source.plateId = selection.activePlate.id;
            source.plateName = selection.activePlate.name;
        }

        const detail = {
            meta: nextMeta,
            group: selection.activeGroup,
            plate: selection.activePlate,
            published: true
        };
        global.dispatchEvent(new CustomEvent('published:workspace-ready', { detail }));
        global.dispatchEvent(new CustomEvent('workspace:changed', { detail }));
        return source;
    }

    global.getPublishedWorkspaceSelection = function () {
        return getPublishedSelection(getMeta(null));
    };
    global.applyPublishedWorkspaceContext = applyPublishedContext;

    if (originalGetWorkspaceMeta) {
        global.getWorkspaceMeta = function (...args) {
            const meta = originalGetWorkspaceMeta.apply(this, args);
            return getPublishedSelection(meta)?.meta || meta;
        };
    }

    if (originalGetWorkspaceSelection) {
        global.getCurrentWorkspaceSelection = function (...args) {
            const selection = originalGetWorkspaceSelection.apply(this, args);
            return getPublishedSelection(selection?.meta || getMeta(null)) || selection;
        };
    }

    if (typeof global.fetchGuziDataFromGist === 'function') {
        const fetchFromCloud = global.fetchGuziDataFromGist;
        global.fetchGuziDataFromGist = async function (...args) {
            const requestedPlateId = readStoredPlateId() || config.defaultPlateId;
            return applyPublishedContext(await fetchFromCloud.apply(this, args), requestedPlateId);
        };
    }

    if (typeof global.setWorkspaceSelection === 'function') {
        const setSelection = global.setWorkspaceSelection;
        global.setWorkspaceSelection = function (groupId, plateId) {
            if (!allowedPlateIds.has(String(plateId || ''))) {
                return global.getCurrentWorkspaceSelection?.()?.meta || null;
            }
            return setSelection.call(this, config.groupId || groupId, plateId);
        };
    }

    function syncPublishedTrigger() {
        const trigger = document.getElementById('clientContextButton');
        if (!trigger) return;
        trigger.disabled = false;
        trigger.tabIndex = 0;
        trigger.classList.remove('publish-context-locked');
        trigger.title = '切换 2w盘 / 6k立牌盘';
        trigger.setAttribute('aria-label', trigger.title);
    }

    function scheduleUiSync() {
        global.setTimeout(syncPublishedTrigger, 0);
    }

    document.addEventListener('DOMContentLoaded', scheduleUiSync);
    global.addEventListener('workspace:changed', scheduleUiSync);
    applyPublishedContext(null);
}(window));
