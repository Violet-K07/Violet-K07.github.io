(function installClientGistSyncGuard(global) {
    'use strict';

    if (!global || global.__clientGistSyncGuardInstalled) return;
    global.__clientGistSyncGuardInstalled = true;

    const doc = global.document;
    const activity = { loading: 0, syncing: 0, switching: 0 };
    const guardId = 'clientGistSyncGuard';
    const styleId = 'clientGistSyncGuardStyle';
    let plateSwitchTimer = null;

    function isCloudBusy() {
        return activity.loading > 0 || activity.syncing > 0;
    }

    function isBusy() {
        return isCloudBusy() || activity.switching > 0;
    }

    function isGistCloudRequest(input) {
        const url = typeof input === 'string' ? input : input && input.url;
        if (!url) return false;
        try {
            const parsed = new URL(url, global.location && global.location.href);
            const isApiGist = parsed.hostname === 'api.github.com'
                && /^\/gists(?:\/|$)/i.test(parsed.pathname);
            const isRawGist = /(^|\.)gist\.githubusercontent\.com$/i.test(parsed.hostname);
            return isApiGist || isRawGist;
        } catch (error) {
            return false;
        }
    }

    function requestMethod(input, init) {
        return String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    }

    function ensureGuard() {
        if (!doc || !doc.body) return null;

        if (!doc.getElementById(styleId)) {
            const style = doc.createElement('style');
            style.id = styleId;
            style.textContent = [
                '#' + guardId + '{position:fixed;top:12px;left:50%;z-index:100000;display:flex;width:min(560px,calc(100vw - 24px));padding:13px 16px;color:#fff;background:linear-gradient(135deg,#0f3d56,#147d92 58%,#0f9a8a);border:1px solid rgba(204,251,241,.7);border-radius:14px;box-shadow:0 16px 42px rgba(15,61,86,.3),0 0 0 5px rgba(20,125,146,.12);transform:translate(-50%,-12px);opacity:0;pointer-events:none;transition:opacity 180ms ease,transform 180ms ease}',
                '#' + guardId + '[hidden]{display:none}',
                '#' + guardId + ':not([hidden]){transform:translate(-50%,0);opacity:1}',
                '#' + guardId + ' .client-gist-sync-inner{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:11px;width:100%}',
                '#' + guardId + ' .client-gist-sync-spinner{width:20px;height:20px;border:3px solid rgba(255,255,255,.34);border-top-color:#fff;border-radius:50%;animation:client-gist-sync-spin 800ms linear infinite}',
                '#' + guardId + ' strong,#' + guardId + ' small{display:block}',
                '#' + guardId + ' strong{font-size:13px;line-height:1.35}',
                '#' + guardId + ' small{margin-top:2px;color:rgba(236,253,245,.9);font-size:11px;line-height:1.4}',
                '#' + guardId + ' .client-gist-sync-badge{padding:4px 7px;color:#ccfbf1;background:rgba(15,23,42,.22);border:1px solid rgba(204,251,241,.28);border-radius:999px;font-size:10px;white-space:nowrap}',
                '@keyframes client-gist-sync-spin{to{transform:rotate(360deg)}}',
                '@media (max-width:520px){#' + guardId + '{top:8px;width:calc(100vw - 16px);padding:11px 12px;border-radius:11px}#' + guardId + ' .client-gist-sync-inner{grid-template-columns:22px minmax(0,1fr);gap:9px}#' + guardId + ' .client-gist-sync-badge{grid-column:2;justify-self:start;margin-top:-4px}}',
                '@media (prefers-reduced-motion:reduce){#' + guardId + '{transition:none}#' + guardId + ' .client-gist-sync-spinner{animation:none}}'
            ].join('');
            if (doc.head) doc.head.appendChild(style);
        }

        let guard = doc.getElementById(guardId);
        if (!guard) {
            guard = doc.createElement('div');
            guard.id = guardId;
            guard.hidden = true;
            guard.setAttribute('role', 'status');
            guard.setAttribute('aria-live', 'polite');
            guard.innerHTML = '<div class="client-gist-sync-inner"><span class="client-gist-sync-spinner" aria-hidden="true"></span><div><strong></strong><small></small></div><span class="client-gist-sync-badge"></span></div>';
            doc.body.appendChild(guard);
        }
        return guard;
    }

    function renderGuard() {
        const guard = ensureGuard();
        if (!guard) return;
        const syncing = activity.syncing > 0;
        const loading = activity.loading > 0;
        const switching = activity.switching > 0;
        if (!syncing && !loading && !switching) {
            guard.hidden = true;
            return;
        }
        const title = guard.querySelector('strong');
        const detail = guard.querySelector('small');
        const badge = guard.querySelector('.client-gist-sync-badge');
        if (syncing) {
            if (title) title.textContent = '\u6b63\u5728\u540c\u6b65\u4e91\u7aef\u6570\u636e';
            if (detail) detail.textContent = '\u8bf7\u6682\u65f6\u4e0d\u8981\u5207\u6362\u9875\u9762\u3001\u56e2\u76d8\u3001\u5237\u65b0\u6216\u5173\u95ed\u7a97\u53e3';
            if (badge) badge.textContent = '\u540c\u6b65\u4e2d';
        } else if (loading) {
            if (title) title.textContent = '\u6b63\u5728\u52a0\u8f7d\u4e91\u7aef\u6570\u636e';
            if (detail) detail.textContent = '\u6b63\u5728\u8bfb\u53d6\u6700\u65b0\u6570\u636e\uff0c\u8bf7\u7a0d\u540e\u518d\u5207\u6362\u9875\u9762\u6216\u56e2\u76d8';
            if (badge) badge.textContent = '\u52a0\u8f7d\u4e2d';
        } else {
            if (title) title.textContent = '\u6b63\u5728\u5207\u6362\u76d8';
            if (detail) detail.textContent = '\u6b63\u5728\u8f7d\u5165\u65b0\u76d8\u7684\u6570\u636e\uff0c\u8bf7\u7a0d\u5019';
            if (badge) badge.textContent = '\u5207\u6362\u4e2d';
        }
        guard.hidden = false;
    }

    function showBlockedMessage(isWorkspace) {
        const guard = ensureGuard();
        if (!guard) return;
        const detail = guard.querySelector('small');
        if (detail) detail.textContent = isWorkspace
            ? '\u4e91\u7aef\u6570\u636e\u6b63\u5728\u5904\u7406\u4e2d\uff0c\u8bf7\u7b49\u5f85\u5b8c\u6210\u540e\u518d\u5207\u6362\u56e2\u76d8\u3002'
            : '\u4e91\u7aef\u6570\u636e\u6b63\u5728\u5904\u7406\u4e2d\uff0c\u8bf7\u7b49\u5f85\u5b8c\u6210\u540e\u518d\u5207\u6362\u9875\u9762\u3002';
        guard.hidden = false;
    }

    function startActivity(kind) {
        activity[kind] += 1;
        renderGuard();
    }

    function finishActivity(kind) {
        activity[kind] = Math.max(0, activity[kind] - 1);
        renderGuard();
    }

    function finishPlateSwitch() {
        activity.switching = 0;
        if (plateSwitchTimer) global.clearTimeout(plateSwitchTimer);
        plateSwitchTimer = null;
        renderGuard();
    }

    function startPlateSwitch() {
        if (activity.switching > 0) return;
        activity.switching = 1;
        renderGuard();
        if (plateSwitchTimer) global.clearTimeout(plateSwitchTimer);
        plateSwitchTimer = global.setTimeout(finishPlateSwitch, 12000);
    }

    function installInteractionGuards() {
        doc.addEventListener('click', event => {
            const plateButton = event.target.closest && event.target.closest('[data-published-plate-id]');
            if (!isBusy() && plateButton && !plateButton.disabled && plateButton.getAttribute('aria-pressed') !== 'true') {
                startPlateSwitch();
                return;
            }
            if (!isBusy()) return;
            const target = event.target.closest && event.target.closest('a[href], [data-route], .tab, .sub-tab, [data-page], [data-sub-page], #clientContextButton, #workspaceGroupSelect, #workspacePlateSelect, [data-published-plate-id]');
            if (!target || target.closest('#' + guardId)) return;
            const href = target.getAttribute('href') || '';
            if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('blob:') || href.startsWith('data:')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            showBlockedMessage(target.matches && target.matches('#clientContextButton, #workspaceGroupSelect, #workspacePlateSelect, [data-published-plate-id]'));
        }, true);

        doc.addEventListener('focusin', event => {
            if (!isBusy()) return;
            const select = event.target.closest && event.target.closest('#workspaceGroupSelect, #workspacePlateSelect');
            if (select) select.dataset.clientSyncGuardValue = select.value;
        }, true);

        doc.addEventListener('change', event => {
            const select = event.target.closest && event.target.closest('#workspaceGroupSelect, #workspacePlateSelect');
            if (!select) return;
            if (!isBusy() && select.id === 'workspacePlateSelect') {
                startPlateSwitch();
                return;
            }
            if (!isBusy()) return;
            if (select.dataset.clientSyncGuardValue !== undefined) select.value = select.dataset.clientSyncGuardValue;
            event.preventDefault();
            event.stopImmediatePropagation();
            showBlockedMessage(true);
        }, true);

        global.addEventListener('beforeunload', event => {
            if (!isCloudBusy()) return;
            event.preventDefault();
            event.returnValue = '\u4e91\u7aef\u6570\u636e\u6b63\u5728\u5904\u7406\u4e2d\uff0c\u5207\u6362\u6216\u5173\u95ed\u9875\u9762\u53ef\u80fd\u5bfc\u81f4\u6570\u636e\u540c\u6b65\u5931\u8d25\u3002';
        });

        global.addEventListener('workspace:changed', () => {
            if (activity.switching > 0) global.setTimeout(finishPlateSwitch, 900);
        });
    }

    const nativeFetch = typeof global.fetch === 'function' ? global.fetch.bind(global) : null;
    if (nativeFetch) {
        global.fetch = function guardedFetch(input, init) {
            if (!isGistCloudRequest(input)) return nativeFetch(input, init);
            const kind = requestMethod(input, init) === 'PATCH' ? 'syncing' : 'loading';
            startActivity(kind);
            let request;
            try {
                request = nativeFetch(input, init);
            } catch (error) {
                finishActivity(kind);
                throw error;
            }
            return Promise.resolve(request).then(
                response => {
                    finishActivity(kind);
                    return response;
                },
                error => {
                    finishActivity(kind);
                    throw error;
                }
            );
        };
    }

    function ready() {
        ensureGuard();
        installInteractionGuards();
        renderGuard();
    }

    if (doc && doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', ready, { once: true });
    } else {
        ready();
    }

    global.getClientGistActivityState = function () {
        return {
            loading: activity.loading,
            syncing: activity.syncing,
            switching: activity.switching,
            busy: isBusy()
        };
    };
}(window));
