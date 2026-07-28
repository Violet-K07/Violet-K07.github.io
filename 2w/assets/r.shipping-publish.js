(function (global) {
    'use strict';

    const LOCKED_PLATE_ID = 'plate-ms0kr6b4-cjozwv';
    const getOverviewItems = global.getShippingArrivalOverviewItems;

    if (typeof getOverviewItems !== 'function') return;

    global.getShippingArrivalOverviewItems = function (keyword = '') {
        return getOverviewItems(keyword).filter(item => item?.plateId === LOCKED_PLATE_ID);
    };
})(window);
