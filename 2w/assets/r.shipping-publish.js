(function (global) {
    'use strict';

    const getOverviewItems = global.getShippingArrivalOverviewItems;

    if (typeof getOverviewItems !== 'function') return;

    global.getShippingArrivalOverviewItems = function (keyword = '') {
        const selection = global.getCurrentWorkspaceSelection?.();
        const plateId = selection?.activePlate?.id || selection?.meta?.activePlateId || '';
        return getOverviewItems(keyword).filter(item => !plateId || item?.plateId === plateId);
    };
})(window);
