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
        if (typeof global.getWorkspaceMeta === 'function') return global.getWorkspaceMeta();
        try {
            return JSON.parse(localStorage.getItem('workspaceMeta') || 'null');
        } catch (error) {
            return null;
        }
    }

    function findPublishedContext(meta) {
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

        const preferredId = readStoredPlateId();
        const selected = availablePlates.find(item => item.plate.id === preferredId)
            || availablePlates.find(item => item.plate.id === config.defaultPlateId)
            || availablePlates[0];
        return { group, plate: selected.plate, descriptor: selected.descriptor };
    }

    function applyPublishedContext(source) {
        const meta = getMeta(source);
        const context = findPublishedContext(meta);
        if (!context) return source;

        const nextMeta = {
            ...meta,
            activeGroupId: context.group.id,
            activePlateId: context.plate.id
        };
        global.persistWorkspaceMeta?.(nextMeta);
        global.dispatchEvent(new CustomEvent('published:workspace-ready', { detail: { meta: nextMeta } }));

        if (source && typeof source === 'object') {
            source.workspaceMeta = nextMeta;
            source.groupId = context.group.id;
            source.groupName = context.group.name;
            source.plateId = context.plate.id;
            source.plateName = context.plate.name;
        }
        return source;
    }

    if (typeof global.fetchGuziDataFromGist === 'function') {
        const fetchFromCloud = global.fetchGuziDataFromGist;
        global.fetchGuziDataFromGist = async function (...args) {
            return applyPublishedContext(await fetchFromCloud.apply(this, args));
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
