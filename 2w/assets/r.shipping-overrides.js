function getShippingOverrideItemType(item) {
    let isGift = !!item && (!!item.isGift || item.itemType === 'gift');
    if (!isGift && item && Number.isFinite(Number(item.itemIndex)) && Array.isArray(guziData)) {
        const sourceItem = guziData[Number(item.itemIndex)];
        isGift = !!sourceItem && (sourceItem.itemType === 'gift' || String(sourceItem.category || '').includes('赠品'));
    }
    if (!isGift && item && String(item.category || '').includes('赠品')) {
        isGift = true;
    }
    return {
        isGift,
        typeClass: isGift ? 'gift' : 'regular',
        typeLabel: isGift ? '赠品' : '普通'
    };
}

function renderShippingItemCard(cn, item) {
    const disabled = item.availableQuantity <= 0 ? 'disabled' : '';
    const status = getShippingItemStatus(item);
    const statusText = status.text;
    const statusClass = status.className;
    const displayQuantity = getShippingItemDisplayQuantity(item);
    const typeInfo = getShippingOverrideItemType(item);
    const plateName = escapeShippingHtml(item.plateName || '未分盘');

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
                        <span class="shipping-card-type ${typeInfo.typeClass}">${typeInfo.typeLabel}</span>
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

function renderClientShippingRequestItemGrid(request) {
    const items = getShippingRequestItems(request);
    if (!items.length) return '';

    return `
        <div class="shipping-request-item-grid">
            ${items.map(item => {
                const imgSrc = escapeShippingHtml(item.imgSrc || defaultImgUrl);
                const category = escapeShippingHtml(item.category || '-');
                const quantity = Math.max(parseInt(item.quantity, 10) || 0, 0);
                const typeInfo = getShippingOverrideItemType(item);
                const plateName = escapeShippingHtml(item.plateName || '未分盘');
                return `
                    <div class="shipping-request-item-card">
                        <div class="shipping-request-item-image" onclick="openImgModal(this.querySelector('img').src)">
                            <img src="${imgSrc}" alt="${category}" onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
                            <span class="shipping-request-item-qty">${quantity} 点</span>
                        </div>
                        <div class="shipping-request-item-type ${typeInfo.typeClass}">${typeInfo.typeLabel} · ${plateName}</div>
                        <div class="shipping-request-item-name">${category}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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
        .map(item => {
            const typeInfo = getShippingOverrideItemType(item);
            return {
                itemIndex: item.itemIndex,
                itemId: item.itemId || '',
                category: item.category,
                quantity: item.availableQuantity,
                price: item.price,
                imgSrc: item.imgSrc,
                kunxu: item.kunxu,
                groupId: item.groupId || '',
                groupName: item.groupName || '',
                plateId: item.plateId || '',
                plateName: item.plateName || '',
                itemType: typeInfo.isGift ? 'gift' : 'normal',
                isGift: typeInfo.isGift,
                status: SHIPPING_STATUS.PENDING,
                statusAt: new Date().toISOString()
            };
        });

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
    const request = {
        id: createShippingRequestId(),
        cn,
        ...getShippingRequestWorkspaceContext(requestItems),
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
