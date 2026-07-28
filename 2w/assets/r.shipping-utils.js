const SHIPPING_STATUS = {
    PENDING: 'pending',
    SHIPPED: 'shipped',
    RECEIVED: 'received',
    REJECTED: 'rejected',
    CANCELED: 'canceled'
};

const SHIPPING_METHOD = {
    EXPRESS: 'express',
    FACE_TO_FACE: 'face_to_face'
};

const CLIENT_SHIPPING_SCOPE = 'plate';

function normalizeShippingClaimerName(claimer) {
    const value = typeof claimer === 'string' ? claimer.trim() : '';
    return value.endsWith('捆') ? value.slice(0, -1).trim() : value;
}

function isShippingGiftItem(item) {
    return !!item && item.itemType === 'gift';
}

function getShippingArrivedQuantity(item) {
    const manual = Math.max(parseInt(item && item.arrivedQuantity, 10) || 0, 0);
    const splitFactor = Math.max(parseInt(item && item.arrivalSplitFactor, 10) || 1, 1);
    const checks = Array.isArray(item && item.arrivalChecks) ? item.arrivalChecks : [];
    const checked = Math.floor(checks.filter(Boolean).length / splitFactor);
    return Math.max(manual, checked);
}

function getShippingClaimerQuantity(item, cn) {
    const baseCn = normalizeShippingClaimerName(cn);
    if (!baseCn || !Array.isArray(item && item.claimers)) return 0;
    return item.claimers.filter(claimer => normalizeShippingClaimerName(claimer) === baseCn).length;
}

function getShippingRequestItems(request) {
    return Array.isArray(request && request.items) ? request.items : [];
}

function getShippingWorkspaceRequests(scope = CLIENT_SHIPPING_SCOPE) {
    const source = typeof shippingRequests !== 'undefined' && Array.isArray(shippingRequests) ? shippingRequests : [];
    if (typeof filterWorkspaceCollection === 'function') {
        return filterWorkspaceCollection(source, { scope });
    }
    return source;
}

function getShippingWorkspaceEntries(items, scope = CLIENT_SHIPPING_SCOPE) {
    const source = Array.isArray(items) ? items : [];
    if (typeof getWorkspaceIndexedEntries === 'function') {
        return getWorkspaceIndexedEntries(source, { scope });
    }
    return source.map((item, index) => ({ item, index }));
}

function getShippingRequestWorkspaceContext(items) {
    const source = Array.isArray(items) ? items : [];
    const firstItem = source[0] || {};
    const plateIds = [...new Set(source.map(item => String(item?.plateId || '').trim()).filter(Boolean))];
    const plateNames = [...new Set(source.map(item => String(item?.plateName || '').trim()).filter(Boolean))];
    return {
        groupId: String(firstItem.groupId || '').trim(),
        groupName: String(firstItem.groupName || '').trim(),
        plateId: plateIds.length === 1 ? plateIds[0] : '',
        plateName: plateNames.length === 1 ? plateNames[0] : '跨盘排发',
        plateIds,
        plateNames
    };
}

function normalizeShippingItemStatus(status) {
    if (status === 'available') return SHIPPING_STATUS.CANCELED;
    const value = typeof status === 'string' ? status.trim() : '';
    return Object.values(SHIPPING_STATUS).includes(value) ? value : '';
}

function normalizeShippingRequestStatus(status) {
    return normalizeShippingItemStatus(status) || SHIPPING_STATUS.PENDING;
}

function getShippingRequestItemStatus(request, item) {
    return normalizeShippingItemStatus(item && item.status)
        || normalizeShippingItemStatus(request && request.status)
        || SHIPPING_STATUS.PENDING;
}

function getShippingRequestSummaryStatus(request) {
    const items = getShippingRequestItems(request);
    if (!items.length) return normalizeShippingRequestStatus(request && request.status);

    const statuses = items.map(item => getShippingRequestItemStatus(request, item));
    if (statuses.every(status => status === SHIPPING_STATUS.RECEIVED)) return SHIPPING_STATUS.RECEIVED;
    if (statuses.every(status => status === SHIPPING_STATUS.CANCELED)) return SHIPPING_STATUS.CANCELED;
    if (statuses.every(status => status === SHIPPING_STATUS.REJECTED)) return SHIPPING_STATUS.REJECTED;
    if (statuses.some(status => status === SHIPPING_STATUS.PENDING)) return SHIPPING_STATUS.PENDING;
    if (statuses.some(status => status === SHIPPING_STATUS.SHIPPED)) return SHIPPING_STATUS.SHIPPED;
    return normalizeShippingRequestStatus(request && request.status);
}

function getShippingRequestItemQuantity(request, itemIndex, status = '') {
    const targetStatus = normalizeShippingItemStatus(status);
    return getShippingRequestItems(request)
        .filter(item => Number(item.itemIndex) === Number(itemIndex))
        .filter(item => !targetStatus || getShippingRequestItemStatus(request, item) === targetStatus)
        .reduce((sum, item) => sum + Math.max(parseInt(item.quantity, 10) || 0, 0), 0);
}

function getShippingGlobalUsedQuantity(itemIndex, options = {}) {
    const includePending = options.includePending !== false;
    const requests = getShippingWorkspaceRequests(options.scope || CLIENT_SHIPPING_SCOPE);
    const statuses = [SHIPPING_STATUS.SHIPPED, SHIPPING_STATUS.RECEIVED];
    if (includePending) statuses.push(SHIPPING_STATUS.PENDING);

    return requests
        .reduce((sum, request) => {
            return sum + statuses.reduce((statusSum, status) => statusSum + getShippingRequestItemQuantity(request, itemIndex, status), 0);
        }, 0);
}

function getShippingUsedQuantity(itemIndex, cn, options = {}) {
    const baseCn = normalizeShippingClaimerName(cn);
    const includePending = options.includePending !== false;
    const requests = getShippingWorkspaceRequests(options.scope || CLIENT_SHIPPING_SCOPE);
    const statuses = [SHIPPING_STATUS.SHIPPED, SHIPPING_STATUS.RECEIVED];
    if (includePending) statuses.push(SHIPPING_STATUS.PENDING);

    return requests
        .filter(request => normalizeShippingClaimerName(request.cn) === baseCn)
        .reduce((sum, request) => {
            return sum + statuses.reduce((statusSum, status) => statusSum + getShippingRequestItemQuantity(request, itemIndex, status), 0);
        }, 0);
}

function getShippingStatusQuantity(itemIndex, cn, status) {
    const baseCn = normalizeShippingClaimerName(cn);
    const targetStatus = normalizeShippingItemStatus(status);
    if (!targetStatus) return 0;
    const requests = getShippingWorkspaceRequests(CLIENT_SHIPPING_SCOPE);
    return requests
        .filter(request => normalizeShippingClaimerName(request.cn) === baseCn)
        .reduce((sum, request) => sum + getShippingRequestItemQuantity(request, itemIndex, targetStatus), 0);
}

function getShippingAvailableQuantity(item, itemIndex, cn, options = {}) {
    const claimed = getShippingClaimerQuantity(item, cn);
    const arrived = getShippingArrivedQuantity(item);
    const ownUsed = getShippingUsedQuantity(itemIndex, cn, options);
    const globalUsed = getShippingGlobalUsedQuantity(itemIndex, options);
    const ownRemaining = Math.max(claimed - ownUsed, 0);
    const arrivalRemaining = Math.max(arrived - globalUsed, 0);
    return Math.max(Math.min(ownRemaining, arrivalRemaining), 0);
}

function buildShippingItemsForCn(cn, options = {}) {
    const source = typeof guziData !== 'undefined' && Array.isArray(guziData) ? guziData : [];
    const entries = getShippingWorkspaceEntries(source, options.scope || CLIENT_SHIPPING_SCOPE);
    return entries
        .map(({ item, index }) => {
            if (!item) return null;
            const isGift = isShippingGiftItem(item);
            const claimedQuantity = getShippingClaimerQuantity(item, cn);
            if (claimedQuantity <= 0) return null;
            const arrivedQuantity = getShippingArrivedQuantity(item);
            const receivedQuantity = getShippingStatusQuantity(index, cn, SHIPPING_STATUS.RECEIVED);
            const shippedQuantity = getShippingStatusQuantity(index, cn, SHIPPING_STATUS.SHIPPED);
            const pendingQuantity = getShippingStatusQuantity(index, cn, SHIPPING_STATUS.PENDING);
            const availableQuantity = getShippingAvailableQuantity(item, index, cn, options);
            return {
                itemIndex: index,
                itemId: item.syncId || item.itemId || item.id || '',
                category: item.category || '',
                price: Number(item.price || 0),
                kunxu: item.kunxu || '不捆',
                imgSrc: item.imgSrc || defaultImgUrl,
                groupId: item.groupId || '',
                groupName: item.groupName || '',
                plateId: item.plateId || '',
                plateName: item.plateName || '',
                itemType: isGift ? 'gift' : 'normal',
                isGift,
                claimedQuantity,
                arrivedQuantity,
                shippedQuantity,
                receivedQuantity,
                pendingQuantity,
                availableQuantity
            };
        })
        .filter(Boolean);
}

function getShippingRequestStatusText(status) {
    if (status === 'available') return '已取消';
    if (status === SHIPPING_STATUS.SHIPPED) return '排发中';
    if (status === SHIPPING_STATUS.RECEIVED) return '已收货';
    if (status === SHIPPING_STATUS.REJECTED) return '已驳回';
    if (status === SHIPPING_STATUS.CANCELED) return '已取消';
    return '已申请';
}

function getShippingRequestStatusClass(status) {
    if (status === 'available') return 'canceled';
    if (status === SHIPPING_STATUS.SHIPPED) return 'shipped';
    if (status === SHIPPING_STATUS.RECEIVED) return 'received';
    if (status === SHIPPING_STATUS.REJECTED) return 'rejected';
    if (status === SHIPPING_STATUS.CANCELED) return 'canceled';
    return 'pending';
}

function normalizeShippingMethod(method) {
    const value = typeof method === 'string' ? method.trim().toLowerCase() : '';
    if (!value) return '';
    if (value.includes('面交') || value.includes('face') || value.includes('self') || value.includes('pickup')) return SHIPPING_METHOD.FACE_TO_FACE;
    return SHIPPING_METHOD.EXPRESS;
}

function getShippingMethodText(method) {
    const normalized = normalizeShippingMethod(method);
    if (normalized === SHIPPING_METHOD.FACE_TO_FACE) return '面交';
    if (normalized === SHIPPING_METHOD.EXPRESS) return '快递';
    return '未确认';
}

function isShippingRequestExpress(request) {
    return normalizeShippingMethod(request && request.shippingMethod) === SHIPPING_METHOD.EXPRESS;
}

function isShippingRequestFaceToFace(request) {
    return normalizeShippingMethod(request && request.shippingMethod) === SHIPPING_METHOD.FACE_TO_FACE;
}

function getShippingPaymentSummaryText(request) {
    if (!isShippingRequestExpress(request)) return '面交无需邮费';
    return `运费 ${formatShippingMoney(request && request.shippingPostageFee)}，打包费 ${formatShippingMoney(request && request.shippingPackingFee)}，合计 ${formatShippingMoney(getShippingPaymentAmount(request))}`;
}

function getShippingPaymentStatusText(request) {
    if (!isShippingRequestExpress(request)) return '面交无需收邮费';
    if (request && request.paymentReceivedAt) return '邮费已确认';
    if (request && request.paymentProofUrl) return '客户已有付款凭证';
    if (request && request.customerFeeConfirmedAt) return '等待管理端确认邮费';
    if (request && request.paymentQrCodeUrl) return '等待客户确认平铺图后付款';
    return '等待补充邮费信息';
}

function isShippingRequestDeletable(request) {
    const status = getShippingRequestSummaryStatus(request);
    return !!request && (status === SHIPPING_STATUS.REJECTED || status === SHIPPING_STATUS.CANCELED);
}

function createShippingRequestId() {
    return `ship_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeShippingHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function parseShippingMoney(value) {
    const normalized = String(value ?? '').replace(/[￥,\s元]/g, '').trim();
    if (!normalized) return NaN;
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount >= 0 ? amount : NaN;
}

function formatShippingMoney(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return '0';
    const rounded = Math.round(amount * 100) / 100;
    return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function getShippingImageLinkError(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^data:image\//i.test(text)) {
        return '内嵌图片不能直接写入云端，请改成图片链接。';
    }
    return '';
}

function getShippingPaymentAmount(request) {
    return Math.max((Number(request && request.shippingPostageFee) || 0) + (Number(request && request.shippingPackingFee) || 0), 0);
}

function shippingFilePrompt(message, defaultValue = '', options = {}) {
    return showShippingDialog({
        title: options.title || '填写图片链接',
        message,
        variant: options.variant || 'info',
        confirmVariant: options.confirmVariant || options.variant || 'info',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        showCancel: true,
        input: true,
        defaultValue,
        placeholder: options.placeholder || 'https://...',
        required: !!options.required,
        requiredText: options.requiredText,
        imageUrlOnly: true,
        fileInput: false
    });
}

function getShippingDialogIcon(variant) {
    if (variant === 'success') return '✓';
    if (variant === 'danger') return '!';
    if (variant === 'warning') return '!';
    return 'i';
}

function showShippingDialog(options = {}) {
    if (typeof document === 'undefined') return Promise.resolve(null);

    const settings = {
        title: '提示',
        message: '',
        variant: 'info',
        confirmText: '确定',
        cancelText: '取消',
        showCancel: false,
        required: false,
        multiline: false,
        defaultValue: '',
        placeholder: '',
        choices: [],
        fileInput: false,
        fileAccept: 'image/*',
        fileButtonText: '选择图片',
        fileHelpText: '支持本地图片或图片地址。',
        imageUrlOnly: false,
        ...options
    };

    if (settings.fileInput) {
        settings.fileInput = false;
        settings.input = true;
        settings.imageUrlOnly = true;
        settings.placeholder = settings.placeholder || 'https://...';
        const currentMessage = String(settings.message || '').trim();
        const linkOnlyNotice = '当前仅支持图片链接，不支持本地图片上传。';
        settings.message = currentMessage ? `${currentMessage}\n${linkOnlyNotice}` : linkOnlyNotice;
    }

    return new Promise(resolve => {
        const oldDialog = document.querySelector('.shipping-dialog-overlay');
        if (oldDialog) oldDialog.remove();

        const overlay = document.createElement('div');
        overlay.className = 'shipping-dialog-overlay';

        const card = document.createElement('div');
        card.className = `shipping-dialog-card ${settings.variant}`;
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');

        const accent = document.createElement('div');
        accent.className = 'shipping-dialog-accent';
        card.appendChild(accent);

        const content = document.createElement('div');
        content.className = 'shipping-dialog-content';

        const head = document.createElement('div');
        head.className = 'shipping-dialog-head';

        const icon = document.createElement('div');
        icon.className = 'shipping-dialog-icon';
        icon.textContent = getShippingDialogIcon(settings.variant);

        const titleWrap = document.createElement('div');
        titleWrap.className = 'shipping-dialog-title-wrap';

        const title = document.createElement('h3');
        title.className = 'shipping-dialog-title';
        title.textContent = settings.title;

        const message = document.createElement('div');
        message.className = 'shipping-dialog-message';
        String(settings.message || '').split('\n').filter(Boolean).forEach(line => {
            const paragraph = document.createElement('p');
            paragraph.textContent = line;
            message.appendChild(paragraph);
        });

        titleWrap.appendChild(title);
        titleWrap.appendChild(message);
        head.appendChild(icon);
        head.appendChild(titleWrap);
        content.appendChild(head);

        let inputEl = null;
        let fileInputEl = null;
        let fileValue = '';
        let filePreviewEl = null;
        let fileNameEl = null;
        if (settings.input) {
            inputEl = document.createElement(settings.multiline ? 'textarea' : 'input');
            inputEl.className = 'shipping-dialog-input';
            inputEl.value = settings.defaultValue || '';
            inputEl.placeholder = settings.placeholder || '';
            if (!settings.multiline) inputEl.type = 'text';
            content.appendChild(inputEl);
        }

        if (settings.fileInput) {
            const fileWrap = document.createElement('div');
            fileWrap.className = 'shipping-dialog-file';

            const fileHead = document.createElement('div');
            fileHead.className = 'shipping-dialog-file-head';

            const fileButton = document.createElement('button');
            fileButton.type = 'button';
            fileButton.className = 'shipping-dialog-file-btn';
            fileButton.textContent = settings.fileButtonText || '选择图片';

            const fileHelp = document.createElement('div');
            fileHelp.className = 'shipping-dialog-file-meta';
            fileHelp.textContent = settings.fileHelpText || '支持本地图片或图片地址。';

            fileHead.appendChild(fileButton);
            fileHead.appendChild(fileHelp);

            fileNameEl = document.createElement('div');
            fileNameEl.className = 'shipping-dialog-file-name';
            fileNameEl.textContent = settings.defaultValue ? '已加载当前图片' : '尚未选择图片';

            filePreviewEl = document.createElement('img');
            filePreviewEl.className = 'shipping-dialog-file-preview';
            filePreviewEl.alt = '图片预览';
            filePreviewEl.src = settings.defaultValue || '';
            filePreviewEl.style.display = settings.defaultValue ? 'block' : 'none';
            filePreviewEl.onerror = () => {
                if (!fileValue) {
                    filePreviewEl.style.display = 'none';
                }
            };

            fileInputEl = document.createElement('input');
            fileInputEl.type = 'file';
            fileInputEl.accept = settings.fileAccept || 'image/*';
            fileInputEl.style.display = 'none';
            fileInputEl.addEventListener('change', () => {
                const file = fileInputEl.files && fileInputEl.files[0];
                if (!file) {
                    fileValue = '';
                    fileNameEl.textContent = settings.defaultValue ? '已加载当前图片' : '尚未选择图片';
                    if (settings.defaultValue) {
                        filePreviewEl.src = settings.defaultValue;
                        filePreviewEl.style.display = 'block';
                    } else {
                        filePreviewEl.style.display = 'none';
                    }
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    fileValue = String(reader.result || '');
                    fileNameEl.textContent = `已选择：${file.name}`;
                    filePreviewEl.src = fileValue;
                    filePreviewEl.style.display = 'block';
                };
                reader.readAsDataURL(file);
            });

            fileButton.addEventListener('click', () => fileInputEl.click());

            fileWrap.appendChild(fileHead);
            fileWrap.appendChild(fileNameEl);
            fileWrap.appendChild(filePreviewEl);
            fileWrap.appendChild(fileInputEl);
            content.appendChild(fileWrap);
        }

        let selectedChoice = settings.defaultValue || (settings.choices[0] && settings.choices[0].value) || '';
        if (settings.choices.length) {
            const choiceWrap = document.createElement('div');
            choiceWrap.className = 'shipping-dialog-choices';
            settings.choices.forEach(choice => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `shipping-dialog-choice${choice.value === selectedChoice ? ' active' : ''}`;
                button.dataset.value = choice.value;

                const choiceTitle = document.createElement('span');
                choiceTitle.className = 'shipping-dialog-choice-title';
                choiceTitle.textContent = choice.label;
                button.appendChild(choiceTitle);

                if (choice.description) {
                    const description = document.createElement('small');
                    description.textContent = choice.description;
                    button.appendChild(description);
                }

                button.addEventListener('click', () => {
                    selectedChoice = choice.value;
                    choiceWrap.querySelectorAll('.shipping-dialog-choice').forEach(item => item.classList.remove('active'));
                    button.classList.add('active');
                });
                choiceWrap.appendChild(button);
            });
            content.appendChild(choiceWrap);
        }

        const error = document.createElement('div');
        error.className = 'shipping-dialog-error';
        content.appendChild(error);

        const actions = document.createElement('div');
        actions.className = 'shipping-dialog-actions';

        const closeDialog = value => {
            document.removeEventListener('keydown', onKeyDown);
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 120);
            resolve(value);
        };

        if (settings.showCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'shipping-dialog-btn secondary';
            cancelBtn.textContent = settings.cancelText;
            cancelBtn.addEventListener('click', () => closeDialog(null));
            actions.appendChild(cancelBtn);
        }

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = `shipping-dialog-btn ${settings.confirmVariant || settings.variant || 'info'}`;
        confirmBtn.textContent = settings.confirmText;
        confirmBtn.addEventListener('click', () => {
            error.textContent = '';
            const fileTextValue = fileValue || String(settings.defaultValue || '').trim();
            if (inputEl) {
                const value = String(inputEl.value || '').trim();
                const resolvedValue = value;
                if (settings.required && !resolvedValue) {
                    error.textContent = settings.requiredText || '这里需要填写后才能继续。';
                    inputEl.focus();
                    return;
                }
                if (resolvedValue && settings.imageUrlOnly) {
                    const imageError = getShippingImageLinkError(resolvedValue);
                    if (imageError) {
                        error.textContent = imageError;
                        inputEl.focus();
                        return;
                    }
                }
                closeDialog(resolvedValue);
                return;
            }
            if (settings.fileInput) {
                if (settings.required && !fileTextValue) {
                    error.textContent = settings.requiredText || '这里需要选择图片后才能继续。';
                    if (fileInputEl) fileInputEl.focus();
                    return;
                }
                closeDialog(fileTextValue);
                return;
            }
            if (settings.choices.length) {
                if (settings.required && !selectedChoice) {
                    error.textContent = settings.requiredText || '请选择一个选项后继续。';
                    return;
                }
                closeDialog(selectedChoice);
                return;
            }
            closeDialog(true);
        });
        actions.appendChild(confirmBtn);

        function onKeyDown(event) {
            if (event.key === 'Escape' && settings.showCancel) {
                event.preventDefault();
                closeDialog(null);
                return;
            }
            if (event.key === 'Enter' && !settings.multiline) {
                event.preventDefault();
                confirmBtn.click();
            }
        }

        card.appendChild(content);
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeyDown);

        setTimeout(() => {
            if (inputEl) {
                inputEl.focus();
                inputEl.select();
            } else {
                confirmBtn.focus();
            }
        }, 0);
    });
}

function shippingAlert(message, options = {}) {
    return showShippingDialog({
        title: options.title || '提示',
        message,
        variant: options.variant || 'info',
        confirmText: options.confirmText || '知道了'
    });
}

function shippingConfirm(message, options = {}) {
    return showShippingDialog({
        title: options.title || '请确认',
        message,
        variant: options.variant || 'warning',
        confirmVariant: options.confirmVariant || options.variant || 'warning',
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '再想想',
        showCancel: true
    }).then(Boolean);
}

function shippingPrompt(message, defaultValue = '', options = {}) {
    return showShippingDialog({
        title: options.title || '填写信息',
        message,
        variant: options.variant || 'info',
        confirmVariant: options.confirmVariant || options.variant || 'info',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        showCancel: true,
        input: options.input !== false,
        multiline: !!options.multiline,
        defaultValue,
        placeholder: options.placeholder || '',
        required: !!options.required,
        requiredText: options.requiredText,
        fileInput: !!options.fileInput,
        fileAccept: options.fileAccept || 'image/*',
        fileButtonText: options.fileButtonText || '选择图片',
        fileHelpText: options.fileHelpText || '支持本地图片或图片地址。',
        imageUrlOnly: !!options.imageUrlOnly || !!options.fileInput
    });
}

function shippingChoice(message, choices, options = {}) {
    return showShippingDialog({
        title: options.title || '选择方式',
        message,
        variant: options.variant || 'info',
        confirmVariant: options.confirmVariant || options.variant || 'info',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        showCancel: true,
        choices,
        defaultValue: options.defaultValue || '',
        required: true
    });
}
