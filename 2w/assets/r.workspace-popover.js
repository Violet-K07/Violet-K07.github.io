(function (global) {
    'use strict';

    const SHELL_ID = 'workspaceSwitcher';
    const TRIGGER_ID = 'clientContextButton';
    const TOGGLE_ID = 'workspaceToggleBtn';
    const COLLAPSE_KEY = 'workspaceSwitcherCollapsed';
    let ready = false;
    let resizeFrame = 0;

    function getElements() {
        return {
            shell: document.getElementById(SHELL_ID),
            trigger: document.getElementById(TRIGGER_ID),
            toggle: document.getElementById(TOGGLE_ID)
        };
    }

    function isExpanded(toggle) {
        return toggle?.getAttribute('aria-expanded') === 'true';
    }

    function ensureInteractiveTrigger() {
        const { trigger } = getElements();
        if (!trigger) return;
        const wasLocked = trigger.disabled || trigger.classList.contains('publish-context-locked');
        trigger.disabled = false;
        trigger.tabIndex = 0;
        trigger.classList.remove('publish-context-locked');
        trigger.title = '切换当前团和盘';
        trigger.setAttribute('aria-label', trigger.title);
        if (wasLocked) {
            const lockedIcon = trigger.querySelector('[data-lucide="lock-keyhole"]');
            if (lockedIcon) {
                const contextIcon = document.createElement('i');
                contextIcon.setAttribute('data-lucide', 'layers-3');
                contextIcon.setAttribute('aria-hidden', 'true');
                lockedIcon.replaceWith(contextIcon);
            }
            if (!trigger.querySelector('[data-lucide="chevron-down"]')) {
                const chevron = document.createElement('i');
                chevron.setAttribute('data-lucide', 'chevron-down');
                chevron.setAttribute('aria-hidden', 'true');
                trigger.appendChild(chevron);
            }
            const groupName = document.querySelector('#workspaceGroupSelect option:checked')?.textContent?.trim();
            const plateName = document.querySelector('#workspacePlateSelect option:checked')?.textContent?.trim();
            ['clientTopbarGroup', 'clientSidebarGroup'].forEach(id => {
                const target = document.getElementById(id);
                if (target && groupName) target.textContent = groupName;
            });
            ['clientTopbarPlate', 'clientSidebarPlate'].forEach(id => {
                const target = document.getElementById(id);
                if (target && plateName) target.textContent = plateName;
            });
            global.lucide?.createIcons?.();
        }
    }

    function positionPopover() {
        const { shell, trigger } = getElements();
        if (!shell || !trigger) return;
        const rect = trigger.getBoundingClientRect();
        const gutter = 10;
        const width = Math.min(400, Math.max(280, global.innerWidth - gutter * 2));
        const left = Math.min(
            Math.max(gutter, rect.right - width),
            Math.max(gutter, global.innerWidth - width - gutter)
        );
        shell.style.setProperty('--workspace-popover-left', `${Math.round(left)}px`);
        shell.style.setProperty('--workspace-popover-top', `${Math.round(rect.bottom + 8)}px`);
        shell.style.setProperty('--workspace-popover-width', `${Math.round(width)}px`);
    }

    function syncTrigger() {
        const { shell, trigger, toggle } = getElements();
        if (!shell || !trigger || !toggle) return;
        const expanded = isExpanded(toggle);
        trigger.setAttribute('aria-expanded', String(expanded));
        trigger.classList.toggle('is-open', expanded);
        shell.classList.toggle('popover-open', expanded);
        positionPopover();
    }

    function applyExpanded(nextExpanded) {
        const { shell, toggle } = getElements();
        if (!shell || !toggle) return;
        const panel = shell.querySelector('.workspace-mini-panel');
        const expanded = Boolean(nextExpanded);

        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.textContent = expanded ? '收起' : '展开切换';
        shell.classList.toggle('expanded', expanded);
        shell.classList.toggle('collapsed', !expanded);
        shell.classList.toggle('popover-open', expanded);
        if (panel) {
            panel.style.display = expanded ? 'grid' : 'none';
            panel.setAttribute('aria-hidden', String(!expanded));
        }
        localStorage.setItem(COLLAPSE_KEY, expanded ? 'false' : 'true');
        syncTrigger();
    }

    function handleTriggerClick(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const { toggle } = getElements();
        if (!toggle) {
            global.location.href = 'group.html';
            return;
        }
        applyExpanded(!isExpanded(toggle));
    }

    function handleOutsideClick(event) {
        const { shell, trigger, toggle } = getElements();
        if (!shell || !trigger || !toggle || !isExpanded(toggle)) return;
        if (shell.contains(event.target) || trigger.contains(event.target)) return;
        applyExpanded(false);
    }

    function handleKeydown(event) {
        if (event.key !== 'Escape') return;
        const { trigger, toggle } = getElements();
        if (!toggle || !isExpanded(toggle)) return;
        applyExpanded(false);
        trigger?.focus();
    }

    function schedulePosition() {
        global.cancelAnimationFrame(resizeFrame);
        resizeFrame = global.requestAnimationFrame(positionPopover);
    }

    function setup() {
        if (ready) return;
        const { shell, trigger, toggle } = getElements();
        if (!shell || !trigger || !toggle) return;
        ready = true;

        const activeTrigger = trigger.cloneNode(true);
        const activeToggle = toggle.cloneNode(true);
        trigger.replaceWith(activeTrigger);
        toggle.replaceWith(activeToggle);

        shell.classList.add('workspace-topbar-popover');
        activeTrigger.setAttribute('aria-haspopup', 'dialog');
        activeTrigger.setAttribute('aria-controls', SHELL_ID);
        shell.querySelector('.workspace-mini-panel')?.setAttribute('role', 'dialog');
        shell.querySelector('.workspace-mini-panel')?.setAttribute('aria-label', '切换当前团和盘');

        applyExpanded(false);
        global.setTimeout(ensureInteractiveTrigger, 0);

        activeTrigger.addEventListener('click', handleTriggerClick);
        activeToggle.addEventListener('click', () => applyExpanded(!isExpanded(activeToggle)));
        document.addEventListener('click', handleOutsideClick, true);
        document.addEventListener('keydown', handleKeydown);
        global.addEventListener('resize', schedulePosition, { passive: true });
        global.addEventListener('scroll', schedulePosition, { passive: true });
        global.addEventListener('workspace:changed', () => {
            global.setTimeout(ensureInteractiveTrigger, 0);
        });

        new MutationObserver(syncTrigger).observe(activeToggle, {
            attributes: true,
            attributeFilter: ['aria-expanded']
        });
    }

    function init() {
        setup();
        if (ready) return;
        const observer = new MutationObserver(() => {
            setup();
            if (ready) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})(window);
