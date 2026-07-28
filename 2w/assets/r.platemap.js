(function (global) {
    'use strict';

    const originalPreviewStockGrid = global.previewStockGrid;
    const originalResetPreviewZoom = global.resetPreviewZoom;
    const originalZoomPreview = global.zoomPreview;
    const originalGetExportFileBaseName = global.getExportFileBaseName;
    const originalDownloadStockGridPng = global.downloadStockGridPng;
    const DEFAULT_STICKER = '🈚';
    const DEFAULT_STICKER_SIZE = 96;
    const MAX_STICKER_SIZE = 240;
    const DEFAULT_PRICE_LABEL_SIZE = 19;
    const DEFAULT_NAME_LABEL_SIZE = 10;
    const DEFAULT_STOCK_LABEL_SIZE = 10;
    const STICKER_SIZE_SETTINGS_VERSION = 2;
    const SHOW_NAMES_SETTINGS_VERSION = 2;
    const STORAGE_PREFIX = 'guziPlateMapStickers:v1:';
    const SETTINGS_PREFIX = 'guziPlateMapSettings:v1:';
    const LABEL_LAYOUT_PREFIX = 'guziPlateMapLabelLayout:v1:';
    const MIN_LABEL_SCALE = 0.4;
    const MAX_LABEL_SCALE = 3;
    const STICKER_ASSET_DB = 'guziPlateMapAssets';
    const STICKER_ASSET_STORE = 'soldOutStickers';
    const STICKER_ASSET_PREFIX = 'guziPlateMapSoldOutSticker:v1:';
    const COLLAGE_MAX_WIDTH = 4320;
    const COLLAGE_MAX_HEIGHT = 7200;
    const COLLAGE_MAX_PIXELS = 24000000;
    const COLLAGE_JPEG_QUALITY = 0.97;
    const CUSTOM_GRID_STORAGE_KEY = 'guziPlateMapCustomGrid:v1';
    const MAX_CUSTOM_GRID_DIMENSION = 6;
    const MAX_CUSTOM_GRID_ITEMS = 16;

    const state = {
        layout: 'plate',
        exportMode: 'separate',
        customGridColumns: 3,
        customGridRows: 4,
        exportQuality: 'hd',
        multiSaveMode: 'zip',
        previewScale: 1,
        currentSticker: DEFAULT_STICKER,
        defaultSize: DEFAULT_STICKER_SIZE,
        textColor: '#df3f31',
        backgroundColor: '#fff0c7',
        backgroundEnabled: false,
        globalEmojiSize: DEFAULT_STICKER_SIZE,
        priceLabelSize: DEFAULT_PRICE_LABEL_SIZE,
        nameLabelSize: DEFAULT_NAME_LABEL_SIZE,
        stockLabelSize: DEFAULT_STOCK_LABEL_SIZE,
        showProductNames: true,
        soldOutStickerMode: 'emoji',
        soldOutStickerModeStored: false,
        soldOutStickerEmoji: DEFAULT_STICKER,
        soldOutStickerDataUrl: '',
        soldOutStickerName: '',
        soldOutStickerAssetKey: '',
        stickers: [],
        labelAdjustments: {},
        selectedStickerId: '',
        selectedAutoLabelId: '',
        storageKey: '',
        labelStorageKey: '',
        dragging: null,
        initialized: false
    };

    function init() {
        if (state.initialized || typeof originalPreviewStockGrid !== 'function') return;
        state.initialized = true;
        loadCustomGridSize();
        injectLayoutControl();
        bindEditorEvents();
        syncLayoutUi();
    }

    function injectLayoutControl() {
        const optionGroups = document.querySelector('.export-option-groups');
        const controls = document.querySelector('.export-stock-controls');
        if (!optionGroups || !controls || document.getElementById('plateMapLayoutGroup')) return;

        const stockGroup = optionGroups.querySelector('.export-option-group');
        if (stockGroup) stockGroup.id = 'exportStockOptionGroup';
        const priceGroup = optionGroups.querySelectorAll('.export-option-group')[1];
        if (priceGroup) priceGroup.id = 'exportPriceOptionGroup';
        const gridField = document.querySelector('.export-grid-field');
        if (gridField) gridField.id = 'exportGridField';

        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'export-option-group';
        layoutGroup.id = 'plateMapLayoutGroup';
        layoutGroup.innerHTML = `
            <span>余量图版式</span>
            <div class="export-segmented" role="group" aria-label="余量图版式">
                <button class="active" type="button" data-export-layout="plate" aria-pressed="true">整盘标价图</button>
                <button type="button" data-export-layout="cards" aria-pressed="false">卡片图</button>
            </div>`;
        optionGroups.appendChild(layoutGroup);

        const exportGroup = document.createElement('div');
        exportGroup.className = 'export-option-group plate-map-export-group';
        exportGroup.id = 'plateMapExportGroup';
        exportGroup.hidden = true;
        exportGroup.innerHTML = `
            <span>整盘图导出</span>
            <div class="export-segmented plate-map-export-segmented" role="group" aria-label="整盘图导出方式">
                <button class="active" type="button" data-plate-map-export="separate" aria-pressed="true">分张</button>
                <button type="button" data-plate-map-export="grid4" aria-pressed="false">四宫格</button>
                <button type="button" data-plate-map-export="grid9" aria-pressed="false">九宫格</button>
                <button id="plateMapCustomExportButton" type="button" data-plate-map-export="custom" aria-pressed="false">自定义</button>
            </div>`;
        optionGroups.appendChild(exportGroup);

        const customGridDialog = document.createElement('div');
        customGridDialog.className = 'plate-map-custom-dialog-backdrop';
        customGridDialog.id = 'plateMapCustomGridDialog';
        customGridDialog.hidden = true;
        customGridDialog.innerHTML = `
            <section class="plate-map-custom-dialog" role="dialog" aria-modal="true" aria-labelledby="plateMapCustomGridTitle">
                <header class="plate-map-custom-dialog-header">
                    <div>
                        <span>自定义拼图</span>
                        <strong id="plateMapCustomGridTitle">设置每张拼图的列数和行数</strong>
                    </div>
                    <button class="plate-map-custom-dialog-close" type="button" data-custom-grid-action="cancel" aria-label="关闭自定义拼图">×</button>
                </header>
                <div class="plate-map-custom-dialog-body">
                    <div class="plate-map-custom-grid-fields">
                        <label>
                            <span>横向列数</span>
                            <input id="plateMapCustomColumns" type="number" min="1" max="${MAX_CUSTOM_GRID_DIMENSION}" step="1" inputmode="numeric" value="${state.customGridColumns}">
                        </label>
                        <b aria-hidden="true">×</b>
                        <label>
                            <span>纵向行数</span>
                            <input id="plateMapCustomRows" type="number" min="1" max="${MAX_CUSTOM_GRID_DIMENSION}" step="1" inputmode="numeric" value="${state.customGridRows}">
                        </label>
                    </div>
                    <p id="plateMapCustomGridSummary"></p>
                </div>
                <footer class="plate-map-custom-dialog-actions">
                    <button type="button" data-custom-grid-action="cancel">取消</button>
                    <button class="primary" id="plateMapApplyCustomGrid" type="button" data-custom-grid-action="apply">应用 3×4</button>
                </footer>
            </section>`;
        document.body.appendChild(customGridDialog);
        customGridDialog.addEventListener('click', event => {
            const action = event.target.closest('[data-custom-grid-action]')?.dataset.customGridAction;
            if (action === 'apply') applyPlateMapCustomGrid();
            else if (action === 'cancel' || event.target === customGridDialog) closePlateMapCustomGridDialog();
        });
        customGridDialog.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', syncPlateMapCustomGridDialog);
        });
        document.addEventListener('keydown', event => {
            if (customGridDialog.hidden) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closePlateMapCustomGridDialog();
            } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                event.preventDefault();
                applyPlateMapCustomGrid();
            }
        });

        const qualityGroup = document.createElement('div');
        qualityGroup.className = 'export-option-group plate-map-quality-group';
        qualityGroup.id = 'plateMapQualityGroup';
        qualityGroup.hidden = true;
        qualityGroup.innerHTML = `
            <span class="plate-map-quality-label">导出清晰度
                <button class="plate-map-quality-help" id="plateMapQualityHelp" type="button" aria-label="查看 JPG 和 PNG 格式说明" aria-expanded="false" aria-controls="plateMapQualityDialog" title="查看格式说明">?</button>
            </span>
            <div class="export-segmented plate-map-quality-segmented" role="group" aria-label="余量图导出清晰度">
                <button class="active" type="button" data-plate-map-quality="hd" aria-pressed="true">高清 JPG</button>
                <button type="button" data-plate-map-quality="lossless" aria-pressed="false">无损 PNG</button>
            </div>`;
        optionGroups.appendChild(qualityGroup);

        const qualityHelpButton = qualityGroup.querySelector('#plateMapQualityHelp');
        const qualityDialog = document.createElement('div');
        qualityDialog.className = 'plate-map-quality-dialog-backdrop';
        qualityDialog.id = 'plateMapQualityDialog';
        qualityDialog.hidden = true;
        qualityDialog.innerHTML = `
            <section class="plate-map-quality-dialog" role="dialog" aria-modal="true" aria-labelledby="plateMapQualityDialogTitle">
                <header class="plate-map-quality-dialog-header">
                    <div>
                        <span>图片格式</span>
                        <strong id="plateMapQualityDialogTitle">导出格式说明</strong>
                    </div>
                    <button class="plate-map-quality-dialog-close" type="button" data-quality-dialog-close aria-label="关闭格式说明">×</button>
                </header>
                <div class="plate-map-quality-dialog-options">
                    <div>
                        <b>JPG</b>
                        <span>适合发群，文件更小，日常分享加载更快。</span>
                    </div>
                    <div>
                        <b>PNG</b>
                        <span>适合留档或二次编辑，画质无损但文件更大。</span>
                    </div>
                </div>
            </section>`;
        document.body.appendChild(qualityDialog);

        const closeQualityDialog = (restoreFocus = true) => {
            if (qualityDialog.hidden) return;
            qualityDialog.hidden = true;
            qualityHelpButton?.setAttribute('aria-expanded', 'false');
            if (restoreFocus) qualityHelpButton?.focus();
        };
        const openQualityDialog = () => {
            qualityDialog.hidden = false;
            qualityHelpButton?.setAttribute('aria-expanded', 'true');
            qualityDialog.querySelector('[data-quality-dialog-close]')?.focus();
        };
        qualityDialog.addEventListener('click', event => {
            if (event.target === qualityDialog || event.target.closest('[data-quality-dialog-close]')) {
                closeQualityDialog();
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !qualityDialog.hidden) closeQualityDialog();
        });

        const saveGroup = document.createElement('div');
        saveGroup.className = 'export-option-group plate-map-save-group';
        saveGroup.id = 'plateMapSaveGroup';
        saveGroup.innerHTML = `
            <span>多图保存</span>
            <div class="export-segmented plate-map-save-segmented" role="group" aria-label="多张图片保存方式">
                <button class="active" type="button" data-plate-map-save="zip" aria-pressed="true">打包 ZIP</button>
                <button type="button" data-plate-map-save="individual" aria-pressed="false">逐张下载</button>
            </div>`;
        optionGroups.appendChild(saveGroup);
        optionGroups.classList.add('with-layout-picker');

        const cardToolbar = document.createElement('div');
        cardToolbar.className = 'card-export-detail-toolbar';
        cardToolbar.id = 'cardExportDetailToolbar';
        cardToolbar.innerHTML = `
            <div class="card-export-detail-copy">
                <strong>卡片内容</strong>
                <span>设置要显示的商品和价格算法</span>
            </div>
            <div class="card-export-detail-options"></div>`;
        const cardOptions = cardToolbar.querySelector('.card-export-detail-options');
        if (stockGroup) cardOptions.appendChild(stockGroup);
        if (priceGroup) cardOptions.appendChild(priceGroup);
        if (gridField) cardOptions.appendChild(gridField);
        controls.appendChild(cardToolbar);

        const toolbar = document.createElement('div');
        toolbar.className = 'plate-map-sticker-toolbar';
        toolbar.id = 'plateMapStickerToolbar';
        toolbar.hidden = true;
        toolbar.innerHTML = `
            <div class="plate-map-sticker-copy">
                <strong>售罄贴纸</strong>
                <span>自动替换所有 ${DEFAULT_STICKER}；分张预览中可拖动、缩放标签并调整层级</span>
            </div>
            <div class="plate-map-sticker-picker">
                <button class="plate-map-sticker-asset-preview" id="plateMapSoldOutStickerPreview" type="button" data-sticker-action="upload-image" title="上传售罄贴纸图片"><span>${DEFAULT_STICKER}</span></button>
                <div class="plate-map-sticker-asset-meta">
                    <strong id="plateMapSoldOutStickerName">默认 ${DEFAULT_STICKER}</strong>
                    <span id="plateMapSoldOutStickerHint">可输入 emoji，也可上传图片</span>
                </div>
                <label class="plate-map-sticker-emoji-field"><span>emoji</span><input id="plateMapSoldOutStickerEmoji" type="text" value="${DEFAULT_STICKER}" autocomplete="off" aria-label="自定义售罄 emoji"></label>
                <button class="plate-map-tool-button" id="plateMapUseSoldOutEmoji" type="button" data-sticker-action="use-emoji">使用 emoji</button>
                <input id="plateMapSoldOutStickerInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
                <button class="plate-map-tool-button primary" id="plateMapUploadSoldOutSticker" type="button" data-sticker-action="upload-image">上传图片</button>
                <button class="plate-map-tool-button" id="plateMapResetSoldOutSticker" type="button" data-sticker-action="reset-image" disabled>恢复默认 ${DEFAULT_STICKER}</button>
            </div>
            <div class="plate-map-sticker-actions">
                <label class="plate-map-global-size"><span>售罄贴纸大小</span><input id="plateMapGlobalEmojiSize" type="range" min="24" max="${MAX_STICKER_SIZE}" step="1" value="${DEFAULT_STICKER_SIZE}"><span class="plate-map-size-number"><input id="plateMapGlobalEmojiSizeNumber" type="number" min="24" max="${MAX_STICKER_SIZE}" step="1" value="${DEFAULT_STICKER_SIZE}" inputmode="numeric" aria-label="售罄贴纸大小数值"><span>px</span></span></label>
                <label class="plate-map-global-size plate-map-label-size"><span>价格标签大小</span><input id="plateMapPriceLabelSize" type="range" min="10" max="36" step="1" value="${DEFAULT_PRICE_LABEL_SIZE}"><span class="plate-map-size-number"><input id="plateMapPriceLabelSizeNumber" type="number" min="10" max="36" step="1" value="${DEFAULT_PRICE_LABEL_SIZE}" inputmode="numeric" aria-label="价格标签大小数值"><span>px</span></span></label>
                <label class="plate-map-global-size plate-map-label-size"><span>谷名标签大小</span><input id="plateMapNameLabelSize" type="range" min="7" max="24" step="1" value="${DEFAULT_NAME_LABEL_SIZE}"><span class="plate-map-size-number"><input id="plateMapNameLabelSizeNumber" type="number" min="7" max="24" step="1" value="${DEFAULT_NAME_LABEL_SIZE}" inputmode="numeric" aria-label="谷名标签大小数值"><span>px</span></span></label>
                <label class="plate-map-global-size plate-map-label-size"><span>余量标签大小</span><input id="plateMapStockLabelSize" type="range" min="7" max="24" step="1" value="${DEFAULT_STOCK_LABEL_SIZE}"><span class="plate-map-size-number"><input id="plateMapStockLabelSizeNumber" type="number" min="7" max="24" step="1" value="${DEFAULT_STOCK_LABEL_SIZE}" inputmode="numeric" aria-label="余量标签大小数值"><span>px</span></span></label>
                <label class="plate-map-name-toggle"><input id="plateMapShowProductNames" type="checkbox" checked><span>显示谷名</span></label>
            </div>
            <div class="plate-map-label-editor" id="plateMapLabelEditor" hidden>
                <div class="plate-map-label-editor-copy">
                    <strong id="plateMapSelectedLabelName">已选标签</strong>
                    <span id="plateMapSelectedLabelHint">直接拖动改位置，拖右下角圆点改大小</span>
                </div>
                <label class="plate-map-selected-label-size"><span>当前大小</span><input id="plateMapSelectedLabelSize" type="range" min="40" max="300" step="1" value="100"><span class="plate-map-selected-label-size-number"><input id="plateMapSelectedLabelSizeNumber" type="number" min="40" max="300" step="1" value="100" inputmode="numeric"><b id="plateMapSelectedLabelSizeUnit">%</b></span></label>
                <div class="plate-map-label-editor-actions" role="group" aria-label="所选标签调整">
                    <button type="button" data-label-action="smaller" title="缩小标签">缩小</button>
                    <button type="button" data-label-action="larger" title="放大标签">放大</button>
                    <span class="plate-map-label-editor-divider" aria-hidden="true"></span>
                    <button type="button" data-label-action="bottom" title="移到最下面一层">置底</button>
                    <button type="button" data-label-action="down" title="向下一层">下一层</button>
                    <button type="button" data-label-action="up" title="向上一层">上一层</button>
                    <button type="button" data-label-action="top" title="移到最上面一层">置顶</button>
                    <span class="plate-map-label-editor-divider" aria-hidden="true"></span>
                    <button type="button" data-label-action="reset" title="恢复这个标签的位置、大小和层级">恢复默认</button>
                    <button class="danger" id="plateMapDeleteSelectedLabel" type="button" data-label-action="delete" title="删除手动贴纸">删除</button>
                </div>
            </div>`;
        controls.appendChild(toolbar);

        layoutGroup.addEventListener('click', event => {
            const button = event.target.closest('[data-export-layout]');
            if (button) setExportLayoutMode(button.dataset.exportLayout);
        });
        exportGroup.addEventListener('click', event => {
            const button = event.target.closest('[data-plate-map-export]');
            if (!button) return;
            if (button.dataset.plateMapExport === 'custom') openPlateMapCustomGridDialog();
            else setPlateMapExportMode(button.dataset.plateMapExport);
        });
        qualityGroup.addEventListener('click', event => {
            const helpButton = event.target.closest('#plateMapQualityHelp');
            if (helpButton) {
                openQualityDialog();
                return;
            }
            const button = event.target.closest('[data-plate-map-quality]');
            if (button) setPlateMapExportQuality(button.dataset.plateMapQuality);
        });
        saveGroup.addEventListener('click', event => {
            const button = event.target.closest('[data-plate-map-save]');
            if (button) setExportMultiSaveMode(button.dataset.plateMapSave);
        });
        toolbar.addEventListener('click', handleToolbarClick);
        toolbar.querySelector('#plateMapSoldOutStickerInput')?.addEventListener('change', handleSoldOutStickerUpload);
        toolbar.querySelector('#plateMapSoldOutStickerEmoji')?.addEventListener('input', restrictSoldOutEmojiInput);
        toolbar.querySelector('#plateMapSoldOutStickerEmoji')?.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            useCustomSoldOutEmoji();
        });
        toolbar.querySelector('#plateMapGlobalEmojiSize')?.addEventListener('input', updateGlobalEmojiSize);
        toolbar.querySelector('#plateMapGlobalEmojiSizeNumber')?.addEventListener('change', updateGlobalEmojiSize);
        toolbar.querySelector('#plateMapGlobalEmojiSizeNumber')?.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.currentTarget.blur();
        });
        toolbar.querySelector('#plateMapPriceLabelSize')?.addEventListener('input', event => updateLabelSize('price', event));
        toolbar.querySelector('#plateMapPriceLabelSizeNumber')?.addEventListener('change', event => updateLabelSize('price', event));
        toolbar.querySelector('#plateMapNameLabelSize')?.addEventListener('input', event => updateLabelSize('name', event));
        toolbar.querySelector('#plateMapNameLabelSizeNumber')?.addEventListener('change', event => updateLabelSize('name', event));
        toolbar.querySelector('#plateMapStockLabelSize')?.addEventListener('input', event => updateLabelSize('stock', event));
        toolbar.querySelector('#plateMapStockLabelSizeNumber')?.addEventListener('change', event => updateLabelSize('stock', event));
        ['plateMapPriceLabelSizeNumber', 'plateMapNameLabelSizeNumber', 'plateMapStockLabelSizeNumber'].forEach(id => {
            toolbar.querySelector(`#${id}`)?.addEventListener('keydown', event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.currentTarget.blur();
            });
        });
        toolbar.querySelector('#plateMapShowProductNames')?.addEventListener('change', updateProductNameVisibility);
        toolbar.querySelector('#plateMapSelectedLabelSize')?.addEventListener('input', updateSelectedLabelSize);
        toolbar.querySelector('#plateMapSelectedLabelSizeNumber')?.addEventListener('change', updateSelectedLabelSize);
        toolbar.querySelector('#plateMapSelectedLabelSizeNumber')?.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.currentTarget.blur();
        });
    }

    function bindEditorEvents() {
        const preview = document.getElementById('stockPreviewGrid');
        if (!preview) return;
        preview.addEventListener('click', handleBoardClick);
        preview.addEventListener('pointerdown', handleStickerPointerDown);
        preview.addEventListener('pointermove', handleStickerPointerMove);
        preview.addEventListener('pointerup', finishStickerDrag);
        preview.addEventListener('pointercancel', finishStickerDrag);
        document.addEventListener('keydown', event => {
            if (state.layout !== 'plate' || (!state.selectedStickerId && !state.selectedAutoLabelId)) return;
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedStickerId) {
                event.preventDefault();
                deleteSelectedSticker();
                return;
            }
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            nudgeSelectedLabel(event.key, event.shiftKey ? 1 : 0.25);
        });
    }

    function setExportLayoutMode(layout) {
        state.layout = layout === 'plate' ? 'plate' : 'cards';
        state.selectedStickerId = '';
        state.selectedAutoLabelId = '';
        syncLayoutUi();
        if (document.getElementById('previewContainer')?.classList.contains('visible')) {
            global.previewStockGrid();
        }
    }

    function syncLayoutUi() {
        document.querySelectorAll('[data-export-layout]').forEach(button => {
            const active = button.dataset.exportLayout === state.layout;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        const plateMode = state.layout === 'plate';
        const stockGroup = document.getElementById('exportStockOptionGroup');
        const priceGroup = document.getElementById('exportPriceOptionGroup');
        const gridField = document.getElementById('exportGridField');
        const toolbar = document.getElementById('plateMapStickerToolbar');
        const cardToolbar = document.getElementById('cardExportDetailToolbar');
        const exportGroup = document.getElementById('plateMapExportGroup');
        const qualityGroup = document.getElementById('plateMapQualityGroup');
        const saveGroup = document.getElementById('plateMapSaveGroup');
        const optionGroups = document.querySelector('.export-option-groups');
        const cardOptions = document.querySelector('.card-export-detail-options');
        const controls = document.querySelector('.export-stock-controls');
        if (stockGroup) stockGroup.hidden = plateMode;
        if (priceGroup) priceGroup.hidden = plateMode;
        if (gridField) gridField.hidden = plateMode;
        if (toolbar) toolbar.hidden = !plateMode;
        if (cardToolbar) cardToolbar.hidden = plateMode;
        if (exportGroup) exportGroup.hidden = !plateMode;
        if (qualityGroup) {
            if (plateMode) optionGroups?.insertBefore(qualityGroup, saveGroup || null);
            else cardOptions?.appendChild(qualityGroup);
            qualityGroup.hidden = false;
        }
        controls?.classList.toggle('plate-layout-active', plateMode);
        document.getElementById('stockPreviewGrid')?.classList.toggle('sticker-edit-mode', plateMode);
        syncPlateMapExportModeUi();
        updatePlateMapDownloadLabel();
        updateToolbarState();
    }

    function setPlateMapExportMode(mode) {
        state.exportMode = ['grid4', 'grid9', 'custom'].includes(mode) ? mode : 'separate';
        syncPlateMapExportModeUi();
        updatePlateMapDownloadLabel();
        if (state.layout === 'plate' && document.getElementById('previewContainer')?.classList.contains('visible')) {
            global.previewStockGrid();
        }
    }

    function syncPlateMapExportModeUi() {
        document.querySelectorAll('[data-plate-map-export]').forEach(button => {
            const active = button.dataset.plateMapExport === state.exportMode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        const customButton = document.getElementById('plateMapCustomExportButton');
        if (customButton) {
            customButton.textContent = state.exportMode === 'custom'
                ? `${state.customGridColumns}×${state.customGridRows}`
                : '自定义';
            customButton.title = `自定义拼图，当前 ${state.customGridColumns}×${state.customGridRows}`;
        }
    }

    function loadCustomGridSize() {
        try {
            const saved = JSON.parse(localStorage.getItem(CUSTOM_GRID_STORAGE_KEY) || 'null');
            const columns = normalizeCustomGridDimension(saved?.columns, state.customGridColumns);
            const rows = normalizeCustomGridDimension(saved?.rows, state.customGridRows);
            if (columns * rows <= MAX_CUSTOM_GRID_ITEMS) {
                state.customGridColumns = columns;
                state.customGridRows = rows;
            }
        } catch (error) {
            console.warn('读取自定义拼图设置失败:', error);
        }
    }

    function saveCustomGridSize() {
        try {
            localStorage.setItem(CUSTOM_GRID_STORAGE_KEY, JSON.stringify({
                columns: state.customGridColumns,
                rows: state.customGridRows
            }));
        } catch (error) {
            console.warn('保存自定义拼图设置失败:', error);
        }
    }

    function normalizeCustomGridDimension(value, fallback) {
        const number = Math.round(Number(value));
        if (!Number.isFinite(number)) return fallback;
        return Math.min(Math.max(number, 1), MAX_CUSTOM_GRID_DIMENSION);
    }

    function openPlateMapCustomGridDialog() {
        const dialog = document.getElementById('plateMapCustomGridDialog');
        if (!dialog) return;
        const columnsInput = document.getElementById('plateMapCustomColumns');
        const rowsInput = document.getElementById('plateMapCustomRows');
        if (columnsInput) columnsInput.value = String(state.customGridColumns);
        if (rowsInput) rowsInput.value = String(state.customGridRows);
        dialog.hidden = false;
        syncPlateMapCustomGridDialog();
        requestAnimationFrame(() => columnsInput?.focus());
    }

    function closePlateMapCustomGridDialog(restoreFocus = true) {
        const dialog = document.getElementById('plateMapCustomGridDialog');
        if (!dialog || dialog.hidden) return;
        dialog.hidden = true;
        if (restoreFocus) document.getElementById('plateMapCustomExportButton')?.focus();
    }

    function getCustomGridDialogValue() {
        const columns = Number(document.getElementById('plateMapCustomColumns')?.value);
        const rows = Number(document.getElementById('plateMapCustomRows')?.value);
        const valid = Number.isInteger(columns)
            && Number.isInteger(rows)
            && columns >= 1
            && rows >= 1
            && columns <= MAX_CUSTOM_GRID_DIMENSION
            && rows <= MAX_CUSTOM_GRID_DIMENSION
            && columns * rows <= MAX_CUSTOM_GRID_ITEMS;
        return { columns, rows, valid };
    }

    function syncPlateMapCustomGridDialog() {
        const { columns, rows, valid } = getCustomGridDialogValue();
        const summary = document.getElementById('plateMapCustomGridSummary');
        const applyButton = document.getElementById('plateMapApplyCustomGrid');
        if (summary) {
            summary.textContent = valid
                ? `每张最多放 ${columns * rows} 张整图，按 ${columns} 列 × ${rows} 行排列`
                : `列数和行数可填 1–${MAX_CUSTOM_GRID_DIMENSION}，每张最多 ${MAX_CUSTOM_GRID_ITEMS} 张整图`;
            summary.classList.toggle('is-error', !valid);
        }
        if (applyButton) {
            applyButton.disabled = !valid;
            applyButton.textContent = valid ? `应用 ${columns}×${rows}` : '请调整规格';
        }
    }

    function applyPlateMapCustomGrid() {
        const { columns, rows, valid } = getCustomGridDialogValue();
        if (!valid) return;
        state.customGridColumns = columns;
        state.customGridRows = rows;
        saveCustomGridSize();
        closePlateMapCustomGridDialog(false);
        setPlateMapExportMode('custom');
        document.getElementById('plateMapCustomExportButton')?.focus();
    }

    function setPlateMapExportQuality(quality) {
        state.exportQuality = quality === 'lossless' ? 'lossless' : 'hd';
        document.querySelectorAll('[data-plate-map-quality]').forEach(button => {
            const active = button.dataset.plateMapQuality === state.exportQuality;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        document.querySelectorAll('[data-download-plate-page], [data-download-plate-collage]').forEach(button => {
            if (!button.disabled) button.textContent = `下载这张 ${state.exportQuality === 'lossless' ? 'PNG' : 'JPG'}`;
        });
        updatePlateMapDownloadLabel();
    }

    function setExportMultiSaveMode(mode) {
        state.multiSaveMode = mode === 'individual' ? 'individual' : 'zip';
        document.querySelectorAll('[data-plate-map-save]').forEach(button => {
            const active = button.dataset.plateMapSave === state.multiSaveMode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }

    function choosePlateMapMultiSaveMode(fileCount) {
        return new Promise(resolve => {
            document.querySelector('.export-save-dialog-backdrop')?.remove();
            const backdrop = document.createElement('div');
            backdrop.className = 'export-save-dialog-backdrop';
            backdrop.innerHTML = `
                <section class="export-save-dialog" role="dialog" aria-modal="true" aria-labelledby="exportSaveDialogTitle">
                    <div class="export-save-dialog-copy">
                        <span>多图保存</span>
                        <strong id="exportSaveDialogTitle">这次会生成 ${fileCount} 张拼图</strong>
                    </div>
                    <div class="export-save-dialog-actions">
                        <button type="button" data-export-save-choice="individual">逐张下载</button>
                        <button type="button" data-export-save-choice="zip">打包 ZIP</button>
                    </div>
                    <button class="export-save-dialog-cancel" type="button" data-export-save-choice="cancel">取消</button>
                </section>`;
            document.body.appendChild(backdrop);

            const finish = choice => {
                document.removeEventListener('keydown', handleKeydown);
                backdrop.remove();
                if (choice === 'individual' || choice === 'zip') {
                    setExportMultiSaveMode(choice);
                    resolve(choice);
                    return;
                }
                resolve('');
            };
            const handleKeydown = event => {
                if (event.key === 'Escape') finish('');
            };
            backdrop.addEventListener('click', event => {
                const choice = event.target.closest('[data-export-save-choice]')?.dataset.exportSaveChoice;
                if (choice) finish(choice);
                else if (event.target === backdrop) finish('');
            });
            document.addEventListener('keydown', handleKeydown);
            backdrop.querySelector(`[data-export-save-choice="${state.multiSaveMode}"]`)?.focus();
        });
    }

    function updatePlateMapDownloadLabel() {
        const button = document.querySelector('.download-btn');
        if (!button || button.classList.contains('is-loading')) return;
        if (state.layout !== 'plate') {
            button.textContent = `下载 ${state.exportQuality === 'lossless' ? 'PNG' : 'JPG'}`;
            return;
        }
        const formatLabel = state.exportQuality === 'lossless' ? 'PNG' : 'JPG';
        button.textContent = isPlateMapCollageMode()
            ? `下载 ${getPlateMapCollageLabel()} ${formatLabel}`
            : `下载全部 ${formatLabel}`;
    }

    function handleToolbarClick(event) {
        const labelAction = event.target.closest('[data-label-action]')?.dataset.labelAction;
        if (labelAction) {
            handleSelectedLabelAction(labelAction);
            return;
        }
        const action = event.target.closest('[data-sticker-action]')?.dataset.stickerAction;
        if (!action) return;
        if (action === 'upload-image') document.getElementById('plateMapSoldOutStickerInput')?.click();
        if (action === 'use-emoji') useCustomSoldOutEmoji();
        if (action === 'reset-image') resetSoldOutStickerImage();
    }

    function splitGraphemes(value) {
        const text = String(value || '');
        if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
            return [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)].map(part => part.segment);
        }
        return Array.from(text);
    }

    function isEmojiGrapheme(value) {
        const emoji = String(value || '');
        if (!emoji) return false;
        if (/^\p{Regional_Indicator}{2}$/u.test(emoji)) return true;
        if (/^[#*0-9]\uFE0F?\u20E3$/u.test(emoji)) return true;
        return /\p{Extended_Pictographic}/u.test(emoji);
    }

    function extractFirstEmoji(value) {
        return splitGraphemes(String(value || '').trim()).find(isEmojiGrapheme) || '';
    }

    function restrictSoldOutEmojiInput(event) {
        const input = event.currentTarget;
        const emoji = extractFirstEmoji(input.value);
        if (input.value !== emoji) input.value = emoji;
    }

    async function useCustomSoldOutEmoji() {
        const input = document.getElementById('plateMapSoldOutStickerEmoji');
        const rawValue = String(input?.value || '').trim();
        const graphemes = splitGraphemes(rawValue);
        const emoji = graphemes.length === 1 && isEmojiGrapheme(graphemes[0]) ? graphemes[0] : '';
        if (!emoji) {
            alert('这里只能输入一个 emoji。');
            if (input) input.value = extractFirstEmoji(rawValue);
            input?.focus();
            return;
        }
        state.soldOutStickerEmoji = emoji;
        state.soldOutStickerMode = 'emoji';
        state.soldOutStickerModeStored = true;
        state.currentSticker = emoji;
        saveStickerSettings();
        updateToolbarState();
        if (document.getElementById('previewContainer')?.classList.contains('visible')) await global.previewStockGrid();
        global.notifyExport?.(`已使用 ${emoji} 作为当前盘的售罄贴纸`);
    }

    async function handleSoldOutStickerUpload(event) {
        const input = event.currentTarget;
        const file = input?.files?.[0];
        if (!file) return;
        input.value = '';
        if (!String(file.type || '').startsWith('image/')) {
            alert('请选择 PNG、JPG、WebP 或 GIF 图片。');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('贴纸图片不能超过 20MB。');
            return;
        }
        try {
            const dataUrl = await readBlobAsDataUrl(file);
            await verifyStickerImage(dataUrl);
            const key = getSoldOutStickerAssetKey();
            await writeSoldOutStickerRecord(key, {
                blob: file,
                name: file.name || '自定义售罄贴纸',
                updatedAt: Date.now()
            });
            state.soldOutStickerAssetKey = key;
            state.soldOutStickerDataUrl = dataUrl;
            state.soldOutStickerName = file.name || '自定义售罄贴纸';
            state.soldOutStickerMode = 'image';
            state.soldOutStickerModeStored = true;
            saveStickerSettings();
            updateToolbarState();
            if (document.getElementById('previewContainer')?.classList.contains('visible')) await global.previewStockGrid();
            global.notifyExport?.('售罄贴纸已保存并应用到当前盘');
        } catch (error) {
            console.error('售罄贴纸保存失败:', error);
            alert(`贴纸图片保存失败：${error?.message || '浏览器没有完成图片读取'}`);
        }
    }

    async function resetSoldOutStickerImage() {
        try {
            const key = getSoldOutStickerAssetKey();
            await deleteSoldOutStickerRecord(key);
            state.soldOutStickerAssetKey = key;
            state.soldOutStickerDataUrl = '';
            state.soldOutStickerName = '';
            state.soldOutStickerMode = 'emoji';
            state.soldOutStickerModeStored = true;
            state.soldOutStickerEmoji = DEFAULT_STICKER;
            state.currentSticker = DEFAULT_STICKER;
            saveStickerSettings();
            updateToolbarState();
            if (document.getElementById('previewContainer')?.classList.contains('visible')) await global.previewStockGrid();
            global.notifyExport?.(`已恢复默认 ${DEFAULT_STICKER} 售罄标记`);
        } catch (error) {
            console.error('售罄贴纸重置失败:', error);
            alert('恢复默认贴纸失败，请刷新页面后重试。');
        }
    }

    function readBlobAsDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(String(reader.result || '')), { once: true });
            reader.addEventListener('error', () => reject(reader.error || new Error('图片读取失败')), { once: true });
            reader.readAsDataURL(blob);
        });
    }

    function verifyStickerImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', () => reject(new Error('图片格式无法识别')), { once: true });
            image.src = dataUrl;
        });
    }

    function updateToolbarState() {
        const globalSizeInput = document.getElementById('plateMapGlobalEmojiSize');
        const globalSizeNumber = document.getElementById('plateMapGlobalEmojiSizeNumber');
        const priceSizeInput = document.getElementById('plateMapPriceLabelSize');
        const priceSizeNumber = document.getElementById('plateMapPriceLabelSizeNumber');
        const nameSizeInput = document.getElementById('plateMapNameLabelSize');
        const nameSizeNumber = document.getElementById('plateMapNameLabelSizeNumber');
        const stockSizeInput = document.getElementById('plateMapStockLabelSize');
        const stockSizeNumber = document.getElementById('plateMapStockLabelSizeNumber');
        const showNamesInput = document.getElementById('plateMapShowProductNames');
        const emojiInput = document.getElementById('plateMapSoldOutStickerEmoji');
        const preview = document.getElementById('plateMapSoldOutStickerPreview');
        const name = document.getElementById('plateMapSoldOutStickerName');
        const hint = document.getElementById('plateMapSoldOutStickerHint');
        const useEmojiButton = document.getElementById('plateMapUseSoldOutEmoji');
        const uploadButton = document.getElementById('plateMapUploadSoldOutSticker');
        const resetButton = document.getElementById('plateMapResetSoldOutSticker');
        const labelEditor = document.getElementById('plateMapLabelEditor');
        const selectedLabelName = document.getElementById('plateMapSelectedLabelName');
        const selectedLabelHint = document.getElementById('plateMapSelectedLabelHint');
        const deleteSelectedLabelButton = document.getElementById('plateMapDeleteSelectedLabel');
        const selectedSizeInput = document.getElementById('plateMapSelectedLabelSize');
        const selectedSizeNumber = document.getElementById('plateMapSelectedLabelSizeNumber');
        const selectedSizeUnit = document.getElementById('plateMapSelectedLabelSizeUnit');
        const imageActive = isSoldOutImageActive();
        if (globalSizeInput) globalSizeInput.value = String(state.globalEmojiSize);
        if (globalSizeNumber && document.activeElement !== globalSizeNumber) globalSizeNumber.value = String(state.globalEmojiSize);
        if (priceSizeInput) priceSizeInput.value = String(state.priceLabelSize);
        if (priceSizeNumber && document.activeElement !== priceSizeNumber) priceSizeNumber.value = String(state.priceLabelSize);
        if (nameSizeInput) nameSizeInput.value = String(state.nameLabelSize);
        if (nameSizeNumber && document.activeElement !== nameSizeNumber) nameSizeNumber.value = String(state.nameLabelSize);
        if (stockSizeInput) stockSizeInput.value = String(state.stockLabelSize);
        if (stockSizeNumber && document.activeElement !== stockSizeNumber) stockSizeNumber.value = String(state.stockLabelSize);
        if (showNamesInput) showNamesInput.checked = state.showProductNames;
        if (emojiInput && document.activeElement !== emojiInput) emojiInput.value = state.soldOutStickerEmoji;
        if (preview) preview.innerHTML = imageActive
            ? `<img src="${escapeHtml(state.soldOutStickerDataUrl)}" alt="自定义售罄贴纸">`
            : `<span>${escapeHtml(state.soldOutStickerEmoji)}</span>`;
        if (name) name.textContent = imageActive
            ? state.soldOutStickerName || '自定义图片贴纸'
            : state.soldOutStickerEmoji === DEFAULT_STICKER
                ? `默认 ${DEFAULT_STICKER}`
                : `当前 emoji ${state.soldOutStickerEmoji}`;
        if (hint) hint.textContent = imageActive ? '当前使用上传图片' : '当前使用 emoji，可随时改为图片';
        if (useEmojiButton) {
            useEmojiButton.classList.toggle('is-active', !imageActive);
            useEmojiButton.setAttribute('aria-pressed', String(!imageActive));
        }
        if (uploadButton) {
            uploadButton.classList.toggle('is-active', imageActive);
            uploadButton.setAttribute('aria-pressed', String(imageActive));
        }
        if (resetButton) resetButton.disabled = !state.soldOutStickerDataUrl
            && state.soldOutStickerEmoji === DEFAULT_STICKER
            && state.soldOutStickerMode === 'emoji';
        const selectedManual = state.stickers.find(sticker => sticker.id === state.selectedStickerId);
        const selectedAutoElement = state.selectedAutoLabelId
            ? document.querySelector(`.plate-map-auto-label[data-label-id="${escapeSelector(state.selectedAutoLabelId)}"]`)
            : null;
        const hasSelection = !!selectedManual || !!selectedAutoElement;
        if (labelEditor) labelEditor.hidden = !hasSelection;
        if (selectedLabelName) selectedLabelName.textContent = selectedManual
            ? '已选手动贴纸'
            : `已选：${selectedAutoElement?.dataset.labelName || '商品标签'}`;
        if (selectedLabelHint) selectedLabelHint.textContent = selectedManual
            ? `大小 ${Math.round(Number(selectedManual.size || state.globalEmojiSize))}px · 可拖动或用右下角缩放`
            : `大小 ${Math.round(getAutoLabelAdjustment(state.selectedAutoLabelId).scale * 100)}% · 可拖动或用右下角缩放`;
        if (deleteSelectedLabelButton) deleteSelectedLabelButton.hidden = !selectedManual;
        const selectedSize = selectedManual
            ? Math.round(Number(selectedManual.size || state.globalEmojiSize))
            : Math.round(getAutoLabelAdjustment(state.selectedAutoLabelId).scale * 100);
        const sizeMinimum = selectedManual ? 20 : 40;
        const sizeMaximum = selectedManual ? MAX_STICKER_SIZE : 300;
        [selectedSizeInput, selectedSizeNumber].forEach(input => {
            if (!input) return;
            input.min = String(sizeMinimum);
            input.max = String(sizeMaximum);
            input.step = '1';
            if (input !== document.activeElement) input.value = String(selectedSize);
        });
        if (selectedSizeUnit) selectedSizeUnit.textContent = selectedManual ? 'px' : '%';
    }

    function updateStickerStyleSetting() {
        const textColorInput = document.getElementById('plateMapStickerTextColor');
        const backgroundEnabledInput = document.getElementById('plateMapStickerBackgroundEnabled');
        const backgroundColorInput = document.getElementById('plateMapStickerBackgroundColor');
        state.textColor = normalizeColor(textColorInput?.value, state.textColor);
        state.backgroundEnabled = !!backgroundEnabledInput?.checked;
        state.backgroundColor = normalizeColor(backgroundColorInput?.value, state.backgroundColor);
        const selected = state.stickers.find(sticker => sticker.id === state.selectedStickerId);
        if (selected) {
            selected.textColor = state.textColor;
            selected.backgroundColor = state.backgroundColor;
            selected.backgroundEnabled = state.backgroundEnabled;
            saveStickers();
            renderManualStickers();
        }
        updateToolbarState();
    }

    function updateGlobalEmojiSize(event) {
        const input = event?.currentTarget || document.getElementById('plateMapGlobalEmojiSize');
        const value = Number(input?.value);
        if (!Number.isFinite(value)) {
            updateToolbarState();
            return;
        }
        state.globalEmojiSize = clamp(Math.round(value), 24, MAX_STICKER_SIZE);
        state.defaultSize = state.globalEmojiSize;
        state.stickers.forEach(sticker => { sticker.size = state.globalEmojiSize; });
        saveStickerSettings();
        saveStickers();
        applyPlateMapDisplaySettings();
        applyAllAutoLabelStyles();
        renderManualStickers();
        applyLabelSelectionState();
        updateToolbarState();
    }

    function updateProductNameVisibility() {
        state.showProductNames = !!document.getElementById('plateMapShowProductNames')?.checked;
        saveStickerSettings();
        applyPlateMapDisplaySettings();
        updateToolbarState();
    }

    function updateLabelSize(type, event) {
        const value = Number(event?.currentTarget?.value);
        if (!Number.isFinite(value)) {
            updateToolbarState();
            return;
        }
        if (type === 'price') {
            state.priceLabelSize = clamp(Math.round(value), 10, 36);
        } else if (type === 'name') {
            state.nameLabelSize = clamp(Math.round(value), 7, 24);
        } else if (type === 'stock') {
            state.stockLabelSize = clamp(Math.round(value), 7, 24);
        } else {
            return;
        }
        saveStickerSettings();
        applyPlateMapDisplaySettings();
        updateToolbarState();
    }

    function updateSelectedLabelSize(event) {
        const value = Number(event?.currentTarget?.value);
        if (!Number.isFinite(value)) {
            updateToolbarState();
            return;
        }
        if (state.selectedStickerId) {
            const sticker = state.stickers.find(item => item.id === state.selectedStickerId);
            if (!sticker) return;
            sticker.size = clamp(Math.round(value), 20, MAX_STICKER_SIZE);
            saveStickers();
            renderManualStickers();
        } else if (state.selectedAutoLabelId) {
            const adjustment = getAutoLabelAdjustment(state.selectedAutoLabelId);
            adjustment.scale = clamp(value / 100, MIN_LABEL_SCALE, MAX_LABEL_SCALE);
            applyAutoLabelStyle(getSelectedLabelElement(), adjustment);
            saveLabelAdjustments();
        }
        applyLabelSelectionState();
        updateToolbarState();
    }

    function applyPlateMapDisplaySettings() {
        const preview = document.getElementById('stockPreviewGrid');
        if (!preview) return;
        [preview, ...preview.querySelectorAll('.plate-map-preview')].forEach(target => {
            target.style.setProperty('--plate-map-emoji-size', `${state.globalEmojiSize}px`);
            target.style.setProperty('--plate-map-price-size', `${state.priceLabelSize}px`);
            target.style.setProperty('--plate-map-name-size', `${state.nameLabelSize}px`);
            target.style.setProperty('--plate-map-stock-size', `${state.stockLabelSize}px`);
            target.classList.toggle('show-product-names', state.showProductNames);
        });
    }

    function handleBoardClick(event) {
        if (state.layout !== 'plate') return;
        const collageDownloadButton = event.target.closest('[data-download-plate-collage]');
        if (collageDownloadButton) {
            event.preventDefault();
            downloadPlateMapCollage(Number(collageDownloadButton.dataset.downloadPlateCollage), collageDownloadButton);
            return;
        }
        const downloadButton = event.target.closest('[data-download-plate-page]');
        if (downloadButton) {
            event.preventDefault();
            downloadPlateMapPage(Number(downloadButton.dataset.downloadPlatePage), downloadButton);
            return;
        }
        const deleteButton = event.target.closest('[data-delete-sticker]');
        if (deleteButton) {
            event.preventDefault();
            event.stopPropagation();
            deleteStickerById(deleteButton.dataset.deleteSticker);
            return;
        }
        if (event.target.closest('.plate-map-auto-label')) return;
        if (event.target.closest('.plate-map-manual-sticker')) return;
        const board = event.target.closest('.plate-map-board');
        if (!board) return;
        const rect = board.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const sticker = {
            id: `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            sourceIdentity: board.dataset.sourceIdentity || '',
            x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
            y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
            text: DEFAULT_STICKER,
            size: state.globalEmojiSize,
            z: getNextLabelZ(board.dataset.sourceIdentity || '')
        };
        state.stickers.push(sticker);
        state.selectedStickerId = sticker.id;
        state.selectedAutoLabelId = '';
        saveStickers();
        renderManualStickers();
        updateToolbarState();
    }

    function handleStickerPointerDown(event) {
        if (state.layout !== 'plate') return;
        if (event.target.closest('[data-delete-sticker]')) return;
        const manualElement = event.target.closest('.plate-map-manual-sticker');
        const autoElement = event.target.closest('.plate-map-auto-label');
        const labelElement = manualElement || autoElement;
        if (!labelElement) return;
        const board = labelElement.closest('.plate-map-board');
        if (!board) return;
        event.preventDefault();
        event.stopPropagation();
        const kind = manualElement ? 'manual' : 'auto';
        if (kind === 'manual') {
            state.selectedStickerId = manualElement.dataset.stickerId || '';
            state.selectedAutoLabelId = '';
        } else {
            state.selectedStickerId = '';
            state.selectedAutoLabelId = autoElement.dataset.labelId || '';
        }
        const sticker = kind === 'manual'
            ? state.stickers.find(item => item.id === state.selectedStickerId)
            : null;
        const adjustment = kind === 'auto' ? getAutoLabelAdjustment(state.selectedAutoLabelId) : null;
        state.dragging = {
            pointerId: event.pointerId,
            board,
            element: labelElement,
            kind,
            mode: event.target.closest('[data-label-resize]') ? 'resize' : 'move',
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: Number(sticker?.x || 0),
            startY: Number(sticker?.y || 0),
            startSize: Number(sticker?.size || state.globalEmojiSize),
            startOffsetX: Number(adjustment?.offsetX || 0),
            startOffsetY: Number(adjustment?.offsetY || 0),
            startScale: Number(adjustment?.scale || 1),
            startRect: labelElement.getBoundingClientRect()
        };
        labelElement.setPointerCapture?.(event.pointerId);
        applyLabelSelectionState();
        updateToolbarState();
    }

    function handleStickerPointerMove(event) {
        if (!state.dragging || state.dragging.pointerId !== event.pointerId) return;
        event.preventDefault();
        const drag = state.dragging;
        const boardRect = drag.board.getBoundingClientRect();
        if (!boardRect.width || !boardRect.height) return;
        const deltaX = event.clientX - drag.startClientX;
        const deltaY = event.clientY - drag.startClientY;
        if (drag.kind === 'manual') {
            const sticker = state.stickers.find(item => item.id === state.selectedStickerId);
            if (!sticker) return;
            if (drag.mode === 'resize') {
                const logicalRatio = Math.max(drag.board.offsetWidth / boardRect.width, 0.01);
                sticker.size = clamp(drag.startSize + ((deltaX + deltaY) / 2) * logicalRatio, 20, MAX_STICKER_SIZE);
                drag.element.style.setProperty('--manual-sticker-size', `${sticker.size}px`);
            } else {
                sticker.x = clamp(drag.startX + (deltaX / boardRect.width) * 100, 0, 100);
                sticker.y = clamp(drag.startY + (deltaY / boardRect.height) * 100, 0, 100);
                drag.element.style.left = `${sticker.x}%`;
                drag.element.style.top = `${sticker.y}%`;
            }
        } else {
            const adjustment = getAutoLabelAdjustment(state.selectedAutoLabelId);
            if (drag.mode === 'resize') {
                const basis = Math.max(Math.min(drag.startRect.width, drag.startRect.height), 36);
                adjustment.scale = clamp(drag.startScale + ((deltaX + deltaY) / 2) / basis, MIN_LABEL_SCALE, MAX_LABEL_SCALE);
            } else {
                adjustment.offsetX = drag.startOffsetX + (deltaX / boardRect.width) * 100;
                adjustment.offsetY = drag.startOffsetY + (deltaY / boardRect.height) * 100;
            }
            applyAutoLabelStyle(drag.element, adjustment);
        }
        updateToolbarState();
    }

    function finishStickerDrag(event) {
        if (!state.dragging || state.dragging.pointerId !== event.pointerId) return;
        const kind = state.dragging.kind;
        state.dragging = null;
        if (kind === 'manual') saveStickers();
        else saveLabelAdjustments();
    }

    function getAutoLabelAdjustment(labelId) {
        if (!labelId) return { offsetX: 0, offsetY: 0, scale: 1, z: null };
        if (!state.labelAdjustments[labelId]) {
            const legacyId = labelId.replace(/:(name|kunxu|price|stock|sold)$/i, '');
            const legacy = legacyId !== labelId ? state.labelAdjustments[legacyId] : null;
            state.labelAdjustments[labelId] = legacy
                ? { offsetX: Number(legacy.offsetX || 0), offsetY: Number(legacy.offsetY || 0), scale: Number(legacy.scale || 1), z: legacy.z }
                : { offsetX: 0, offsetY: 0, scale: 1, z: null };
        }
        return state.labelAdjustments[labelId];
    }

    function applyAutoLabelStyle(element, adjustment = null) {
        if (!element) return;
        const current = adjustment || getAutoLabelAdjustment(element.dataset.labelId || '');
        const baseLeft = Number(element.dataset.baseLeft || 0);
        const baseTop = Number(element.dataset.baseTop || 0);
        const left = clamp(baseLeft + Number(current.offsetX || 0), 0, 100);
        const top = clamp(baseTop + Number(current.offsetY || 0), 0, 100);
        current.offsetX = left - baseLeft;
        current.offsetY = top - baseTop;
        current.scale = clamp(Number(current.scale || 1), MIN_LABEL_SCALE, MAX_LABEL_SCALE);
        element.style.left = `${left}%`;
        element.style.top = `${top}%`;
        element.style.setProperty('--plate-map-label-scale', String(current.scale));
        element.style.zIndex = String(getStoredLabelZ(current.z, Number(element.dataset.defaultZ || 10)));
    }

    function applyAllAutoLabelStyles() {
        document.querySelectorAll('.plate-map-auto-label[data-label-id]').forEach(element => {
            applyAutoLabelStyle(element);
        });
    }

    function applyLabelSelectionState() {
        document.querySelectorAll('.plate-map-auto-label[data-label-id]').forEach(element => {
            element.classList.toggle('selected', element.dataset.labelId === state.selectedAutoLabelId);
        });
        document.querySelectorAll('.plate-map-manual-sticker[data-sticker-id]').forEach(element => {
            element.classList.toggle('selected', element.dataset.stickerId === state.selectedStickerId);
        });
    }

    function getSelectedLabelElement() {
        if (state.selectedStickerId) {
            return document.querySelector(`.plate-map-manual-sticker[data-sticker-id="${escapeSelector(state.selectedStickerId)}"]`);
        }
        if (state.selectedAutoLabelId) {
            return document.querySelector(`.plate-map-auto-label[data-label-id="${escapeSelector(state.selectedAutoLabelId)}"]`);
        }
        return null;
    }

    function nudgeSelectedLabel(key, amount) {
        const horizontal = key === 'ArrowLeft' ? -amount : key === 'ArrowRight' ? amount : 0;
        const vertical = key === 'ArrowUp' ? -amount : key === 'ArrowDown' ? amount : 0;
        if (state.selectedStickerId) {
            const sticker = state.stickers.find(item => item.id === state.selectedStickerId);
            if (!sticker) return;
            sticker.x = clamp(Number(sticker.x || 0) + horizontal, 0, 100);
            sticker.y = clamp(Number(sticker.y || 0) + vertical, 0, 100);
            saveStickers();
            renderManualStickers();
        } else if (state.selectedAutoLabelId) {
            const adjustment = getAutoLabelAdjustment(state.selectedAutoLabelId);
            adjustment.offsetX = Number(adjustment.offsetX || 0) + horizontal;
            adjustment.offsetY = Number(adjustment.offsetY || 0) + vertical;
            applyAutoLabelStyle(getSelectedLabelElement(), adjustment);
            saveLabelAdjustments();
        }
        applyLabelSelectionState();
        updateToolbarState();
    }

    function handleSelectedLabelAction(action) {
        if (!state.selectedStickerId && !state.selectedAutoLabelId) return;
        if (action === 'delete') {
            if (state.selectedStickerId) deleteSelectedSticker();
            return;
        }
        if (action === 'smaller' || action === 'larger') {
            const direction = action === 'larger' ? 1 : -1;
            if (state.selectedStickerId) {
                const sticker = state.stickers.find(item => item.id === state.selectedStickerId);
                if (!sticker) return;
                sticker.size = clamp(Number(sticker.size || state.globalEmojiSize) + direction * 8, 20, MAX_STICKER_SIZE);
                saveStickers();
                renderManualStickers();
            } else {
                const adjustment = getAutoLabelAdjustment(state.selectedAutoLabelId);
                adjustment.scale = clamp(Number(adjustment.scale || 1) + direction * 0.1, MIN_LABEL_SCALE, MAX_LABEL_SCALE);
                applyAutoLabelStyle(getSelectedLabelElement(), adjustment);
                saveLabelAdjustments();
            }
            applyLabelSelectionState();
            updateToolbarState();
            return;
        }
        if (action === 'reset') {
            if (state.selectedStickerId) {
                const sticker = state.stickers.find(item => item.id === state.selectedStickerId);
                if (sticker) sticker.size = state.globalEmojiSize;
                saveStickers();
                renderManualStickers();
            } else {
                delete state.labelAdjustments[state.selectedAutoLabelId];
                applyAutoLabelStyle(getSelectedLabelElement(), getAutoLabelAdjustment(state.selectedAutoLabelId));
                saveLabelAdjustments();
            }
            applyLabelSelectionState();
            updateToolbarState();
            return;
        }
        if (['bottom', 'down', 'up', 'top'].includes(action)) moveSelectedLabelLayer(action);
    }

    function moveSelectedLabelLayer(action) {
        const selectedElement = getSelectedLabelElement();
        const board = selectedElement?.closest('.plate-map-board');
        if (!board) return;
        const entries = Array.from(board.querySelectorAll('.plate-map-auto-label[data-label-id], .plate-map-manual-sticker[data-sticker-id]'))
            .map((element, index) => {
                const manual = element.classList.contains('plate-map-manual-sticker');
                const id = manual ? element.dataset.stickerId : element.dataset.labelId;
                const sticker = manual ? state.stickers.find(item => item.id === id) : null;
                const adjustment = manual ? null : getAutoLabelAdjustment(id);
                return {
                    element,
                    id,
                    kind: manual ? 'manual' : 'auto',
                    z: getStoredLabelZ(manual ? sticker?.z : adjustment?.z, Number(element.dataset.defaultZ || 10) + index)
                };
            })
            .filter(entry => entry.id)
            .sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
        const selectedId = state.selectedStickerId || state.selectedAutoLabelId;
        let selectedIndex = entries.findIndex(entry => entry.id === selectedId);
        if (selectedIndex < 0 || entries.length < 2) return;
        if (action === 'bottom') {
            entries.unshift(entries.splice(selectedIndex, 1)[0]);
        } else if (action === 'top') {
            entries.push(entries.splice(selectedIndex, 1)[0]);
        } else if (action === 'down' && selectedIndex > 0) {
            [entries[selectedIndex - 1], entries[selectedIndex]] = [entries[selectedIndex], entries[selectedIndex - 1]];
        } else if (action === 'up' && selectedIndex < entries.length - 1) {
            [entries[selectedIndex + 1], entries[selectedIndex]] = [entries[selectedIndex], entries[selectedIndex + 1]];
        }
        entries.forEach((entry, index) => setLabelZ(entry, 10 + index));
        saveStickers();
        saveLabelAdjustments();
        renderManualStickers();
        applyAllAutoLabelStyles();
        applyLabelSelectionState();
        updateToolbarState();
    }

    function setLabelZ(entry, z) {
        if (entry.kind === 'manual') {
            const sticker = state.stickers.find(item => item.id === entry.id);
            if (sticker) sticker.z = z;
        } else {
            getAutoLabelAdjustment(entry.id).z = z;
        }
        entry.element.style.zIndex = String(z);
    }

    function getStoredLabelZ(value, fallback) {
        if (value === null || value === undefined || value === '') {
            return clamp(Math.round(Number(fallback) || 1), 1, 9999);
        }
        const number = Number(value);
        return Number.isFinite(number) ? clamp(Math.round(number), 1, 9999) : clamp(Math.round(fallback), 1, 9999);
    }

    function getNextLabelZ(sourceIdentity) {
        const board = Array.from(document.querySelectorAll('.plate-map-board'))
            .find(item => item.dataset.sourceIdentity === sourceIdentity);
        const values = board
            ? Array.from(board.querySelectorAll('.plate-map-auto-label, .plate-map-manual-sticker')).map(element => Number(getComputedStyle(element).zIndex) || 0)
            : state.stickers.filter(sticker => sticker.sourceIdentity === sourceIdentity).map(sticker => Number(sticker.z) || 0);
        return Math.max(10, ...values) + 1;
    }

    function resizeSelectedSticker(delta) {
        const selected = state.stickers.find(sticker => sticker.id === state.selectedStickerId);
        if (selected) {
            selected.size = clamp(Number(selected.size || DEFAULT_STICKER_SIZE) + delta, 20, MAX_STICKER_SIZE);
            state.defaultSize = selected.size;
            saveStickers();
            renderManualStickers();
        } else {
            state.defaultSize = clamp(state.defaultSize + delta, 20, MAX_STICKER_SIZE);
        }
        updateToolbarState();
    }

    function deleteSelectedSticker() {
        if (!state.selectedStickerId) return;
        deleteStickerById(state.selectedStickerId);
    }

    function deleteStickerById(stickerId) {
        if (!stickerId) return;
        state.stickers = state.stickers.filter(sticker => sticker.id !== stickerId);
        state.selectedStickerId = '';
        saveStickers();
        renderManualStickers();
        updateToolbarState();
    }

    function undoSticker() {
        if (!state.stickers.length) return;
        const removed = state.stickers.pop();
        if (removed?.id === state.selectedStickerId) state.selectedStickerId = '';
        saveStickers();
        renderManualStickers();
        updateToolbarState();
    }

    function clearStickers() {
        state.stickers = [];
        state.selectedStickerId = '';
        saveStickers();
        renderManualStickers();
        updateToolbarState();
    }

    function renderManualStickers() {
        document.querySelectorAll('.plate-map-manual-layer').forEach(layer => {
            const sourceIdentity = layer.closest('.plate-map-board')?.dataset.sourceIdentity || '';
            layer.innerHTML = state.stickers
                .filter(sticker => sticker.sourceIdentity === sourceIdentity)
                .map((sticker, index) => `
                    <div class="plate-map-manual-sticker${sticker.id === state.selectedStickerId ? ' selected' : ''}" role="button" tabindex="0"
                        data-sticker-id="${escapeHtml(sticker.id)}"
                        data-label-kind="manual"
                        style="left:${clamp(sticker.x, 0, 100)}%;top:${clamp(sticker.y, 0, 100)}%;--manual-sticker-size:${clamp(Number(sticker.size || state.globalEmojiSize), 20, MAX_STICKER_SIZE)}px;z-index:${getStoredLabelZ(sticker.z, 1000 + index)}"
                        aria-label="售罄贴纸">
                        ${renderSoldOutStickerMarkup('plate-map-manual-sticker-content')}
                        <button class="plate-map-label-resize-handle" type="button" data-label-resize aria-label="拖动调整贴纸大小" title="拖动调整大小"></button>
                        <button class="plate-map-sticker-delete" type="button" data-delete-sticker="${escapeHtml(sticker.id)}" aria-label="删除这个贴纸" title="删除贴纸">×</button>
                    </div>`)
                .join('');
        });
    }

    function renderSoldOutStickerMarkup(className) {
        return isSoldOutImageActive()
            ? `<img class="${className}" src="${escapeHtml(state.soldOutStickerDataUrl)}" alt="售罄">`
            : `<span class="${className}">${escapeHtml(state.soldOutStickerEmoji)}</span>`;
    }

    function isSoldOutImageActive() {
        return state.soldOutStickerMode === 'image' && !!state.soldOutStickerDataUrl;
    }

    function loadStickers() {
        const key = getStickerStorageKey();
        if (state.storageKey === key) return;
        state.storageKey = key;
        state.labelStorageKey = getLabelLayoutStorageKey();
        state.selectedStickerId = '';
        state.selectedAutoLabelId = '';
        loadStickerSettings();
        loadLabelAdjustments();
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            state.stickers = (Array.isArray(parsed) ? parsed : []).map((sticker, index) => ({
                id: String(sticker.id || `sticker-${Date.now().toString(36)}`),
                sourceIdentity: String(sticker.sourceIdentity || ''),
                x: clamp(Number(sticker.x || 0), 0, 100),
                y: clamp(Number(sticker.y || 0), 0, 100),
                text: String(sticker.text || DEFAULT_STICKER),
                size: clamp(Number(sticker.size || DEFAULT_STICKER_SIZE), 20, MAX_STICKER_SIZE),
                textColor: normalizeColor(sticker.textColor, state.textColor),
                backgroundColor: normalizeColor(sticker.backgroundColor, state.backgroundColor),
                backgroundEnabled: !!sticker.backgroundEnabled,
                z: getStoredLabelZ(sticker.z, 1000 + index)
            }));
        } catch (error) {
            state.stickers = [];
        }
    }

    function loadStickerSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem(getStickerSettingsKey()) || '{}');
            const sizeSettingsCurrent = Number(settings.stickerSizeSettingsVersion) === STICKER_SIZE_SETTINGS_VERSION;
            const storedSize = Number(settings.globalEmojiSize);
            const useNewSizeDefault = !Number.isFinite(storedSize) || (!sizeSettingsCurrent && storedSize === 44);
            state.globalEmojiSize = useNewSizeDefault
                ? DEFAULT_STICKER_SIZE
                : clamp(Math.round(storedSize), 24, MAX_STICKER_SIZE);
            state.defaultSize = state.globalEmojiSize;
            const storedPriceLabelSize = Number(settings.priceLabelSize);
            const storedNameLabelSize = Number(settings.nameLabelSize);
            const storedStockLabelSize = Number(settings.stockLabelSize);
            state.priceLabelSize = Number.isFinite(storedPriceLabelSize)
                ? clamp(Math.round(storedPriceLabelSize), 10, 36)
                : DEFAULT_PRICE_LABEL_SIZE;
            state.nameLabelSize = Number.isFinite(storedNameLabelSize)
                ? clamp(Math.round(storedNameLabelSize), 7, 24)
                : DEFAULT_NAME_LABEL_SIZE;
            state.stockLabelSize = Number.isFinite(storedStockLabelSize)
                ? clamp(Math.round(storedStockLabelSize), 7, 24)
                : DEFAULT_STOCK_LABEL_SIZE;
            const showNamesSettingsCurrent = Number(settings.showNamesSettingsVersion) === SHOW_NAMES_SETTINGS_VERSION;
            state.showProductNames = showNamesSettingsCurrent ? !!settings.showProductNames : true;
            state.soldOutStickerModeStored = settings.soldOutStickerMode === 'image' || settings.soldOutStickerMode === 'emoji';
            state.soldOutStickerMode = settings.soldOutStickerMode === 'image' ? 'image' : 'emoji';
            const storedEmoji = String(settings.soldOutStickerEmoji || DEFAULT_STICKER).trim();
            state.soldOutStickerEmoji = extractFirstEmoji(storedEmoji) || DEFAULT_STICKER;
            state.currentSticker = state.soldOutStickerEmoji;
            if (!sizeSettingsCurrent || !showNamesSettingsCurrent || state.soldOutStickerEmoji !== storedEmoji) {
                saveStickerSettings();
            }
        } catch (error) {
            state.globalEmojiSize = DEFAULT_STICKER_SIZE;
            state.defaultSize = DEFAULT_STICKER_SIZE;
            state.priceLabelSize = DEFAULT_PRICE_LABEL_SIZE;
            state.nameLabelSize = DEFAULT_NAME_LABEL_SIZE;
            state.stockLabelSize = DEFAULT_STOCK_LABEL_SIZE;
            state.showProductNames = true;
            state.soldOutStickerMode = 'emoji';
            state.soldOutStickerModeStored = false;
            state.soldOutStickerEmoji = DEFAULT_STICKER;
            state.currentSticker = DEFAULT_STICKER;
        }
    }

    function saveStickerSettings() {
        try {
            localStorage.setItem(getStickerSettingsKey(), JSON.stringify({
                globalEmojiSize: state.globalEmojiSize,
                stickerSizeSettingsVersion: STICKER_SIZE_SETTINGS_VERSION,
                priceLabelSize: state.priceLabelSize,
                nameLabelSize: state.nameLabelSize,
                stockLabelSize: state.stockLabelSize,
                showProductNames: state.showProductNames,
                showNamesSettingsVersion: SHOW_NAMES_SETTINGS_VERSION,
                soldOutStickerMode: state.soldOutStickerMode,
                soldOutStickerEmoji: state.soldOutStickerEmoji
            }));
        } catch (error) {
            console.warn('plate map settings could not be saved', error);
        }
    }

    function saveStickers() {
        if (!state.storageKey) state.storageKey = getStickerStorageKey();
        try {
            localStorage.setItem(state.storageKey, JSON.stringify(state.stickers));
        } catch (error) {
            console.warn('plate map stickers could not be saved', error);
        }
    }

    function loadLabelAdjustments() {
        try {
            const parsed = JSON.parse(localStorage.getItem(state.labelStorageKey || getLabelLayoutStorageKey()) || '{}');
            state.labelAdjustments = Object.fromEntries(Object.entries(parsed && typeof parsed === 'object' ? parsed : {})
                .map(([id, value]) => [String(id), {
                    offsetX: clamp(Number(value?.offsetX || 0), -100, 100),
                    offsetY: clamp(Number(value?.offsetY || 0), -100, 100),
                    scale: clamp(Number(value?.scale || 1), MIN_LABEL_SCALE, MAX_LABEL_SCALE),
                    z: value?.z === null || value?.z === undefined || value?.z === ''
                        ? null
                        : Number.isFinite(Number(value.z)) ? getStoredLabelZ(value.z, 10) : null
                }]));
        } catch (error) {
            state.labelAdjustments = {};
        }
    }

    function saveLabelAdjustments() {
        if (!state.labelStorageKey) state.labelStorageKey = getLabelLayoutStorageKey();
        try {
            localStorage.setItem(state.labelStorageKey, JSON.stringify(state.labelAdjustments));
        } catch (error) {
            console.warn('plate map label layout could not be saved', error);
        }
    }

    function getStickerStorageKey() {
        const plateId = localStorage.getItem('currentPlateId') || localStorage.getItem('plateName') || 'default';
        return `${STORAGE_PREFIX}${plateId}`;
    }

    function getStickerSettingsKey() {
        const plateId = localStorage.getItem('currentPlateId') || localStorage.getItem('plateName') || 'default';
        return `${SETTINGS_PREFIX}${plateId}`;
    }

    function getLabelLayoutStorageKey() {
        const plateId = localStorage.getItem('currentPlateId') || localStorage.getItem('plateName') || 'default';
        return `${LABEL_LAYOUT_PREFIX}${plateId}`;
    }

    function getSoldOutStickerAssetKey() {
        const plateId = localStorage.getItem('currentPlateId') || localStorage.getItem('plateName') || 'default';
        return `${STICKER_ASSET_PREFIX}${plateId}`;
    }

    function openStickerAssetDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(STICKER_ASSET_DB, 1);
            request.addEventListener('upgradeneeded', () => {
                if (!request.result.objectStoreNames.contains(STICKER_ASSET_STORE)) {
                    request.result.createObjectStore(STICKER_ASSET_STORE);
                }
            });
            request.addEventListener('success', () => resolve(request.result), { once: true });
            request.addEventListener('error', () => reject(request.error || new Error('IndexedDB 打开失败')), { once: true });
        });
    }

    async function readSoldOutStickerRecord(key) {
        const database = await openStickerAssetDatabase();
        try {
            return await new Promise((resolve, reject) => {
                const request = database.transaction(STICKER_ASSET_STORE, 'readonly').objectStore(STICKER_ASSET_STORE).get(key);
                request.addEventListener('success', () => resolve(request.result || null), { once: true });
                request.addEventListener('error', () => reject(request.error || new Error('贴纸读取失败')), { once: true });
            });
        } finally {
            database.close();
        }
    }

    async function writeSoldOutStickerRecord(key, record) {
        const database = await openStickerAssetDatabase();
        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(STICKER_ASSET_STORE, 'readwrite');
                transaction.objectStore(STICKER_ASSET_STORE).put(record, key);
                transaction.addEventListener('complete', resolve, { once: true });
                transaction.addEventListener('error', () => reject(transaction.error || new Error('贴纸保存失败')), { once: true });
                transaction.addEventListener('abort', () => reject(transaction.error || new Error('贴纸保存被中断')), { once: true });
            });
        } finally {
            database.close();
        }
    }

    async function deleteSoldOutStickerRecord(key) {
        const database = await openStickerAssetDatabase();
        try {
            await new Promise((resolve, reject) => {
                const transaction = database.transaction(STICKER_ASSET_STORE, 'readwrite');
                transaction.objectStore(STICKER_ASSET_STORE).delete(key);
                transaction.addEventListener('complete', resolve, { once: true });
                transaction.addEventListener('error', () => reject(transaction.error || new Error('贴纸删除失败')), { once: true });
                transaction.addEventListener('abort', () => reject(transaction.error || new Error('贴纸删除被中断')), { once: true });
            });
        } finally {
            database.close();
        }
    }

    async function loadSoldOutStickerAsset() {
        const key = getSoldOutStickerAssetKey();
        if (state.soldOutStickerAssetKey === key) return;
        state.soldOutStickerAssetKey = key;
        state.soldOutStickerDataUrl = '';
        state.soldOutStickerName = '';
        try {
            const record = await readSoldOutStickerRecord(key);
            if (!record?.blob) {
                if (state.soldOutStickerMode === 'image') {
                    state.soldOutStickerMode = 'emoji';
                    state.soldOutStickerModeStored = true;
                    saveStickerSettings();
                }
                return;
            }
            state.soldOutStickerDataUrl = await readBlobAsDataUrl(record.blob);
            state.soldOutStickerName = String(record.name || '自定义售罄贴纸');
            if (!state.soldOutStickerModeStored) {
                state.soldOutStickerMode = 'image';
                state.soldOutStickerModeStored = true;
                saveStickerSettings();
            }
        } catch (error) {
            console.warn('售罄贴纸读取失败:', error);
        }
    }

    function collectPlateMapSources() {
        const entries = typeof global.getClientPlateEntries === 'function' ? global.getClientPlateEntries() : [];
        const groups = new Map();
        const boundItems = new Set();
        let bindingItems = 0;
        entries.forEach(({ item, index }) => {
            const storedCrop = item?.imageCrop;
            const parsedCrop = typeof global.GroupDeskLocalImages?.parseCropReference === 'function'
                ? global.GroupDeskLocalImages.parseCropReference(item?.imgSrc)
                : null;
            const baseCrop = storedCrop && typeof storedCrop === 'object' ? storedCrop : parsedCrop;
            if (!baseCrop || typeof baseCrop !== 'object') return;
            bindingItems += 1;
            const placements = Array.isArray(baseCrop.placements) && baseCrop.placements.length
                ? baseCrop.placements.map(placement => ({ ...baseCrop, ...placement }))
                : [baseCrop];
            const normalizedPlacements = placements
                .map(crop => normalizeCropDescriptor(item, crop))
                .filter(Boolean);
            const surplus = typeof global.getExportSurplus === 'function' ? global.getExportSurplus(item) : 0;
            const availableCount = Math.min(Math.max(Math.floor(Number(surplus) || 0), 0), normalizedPlacements.length);
            const firstAvailableIndex = normalizedPlacements.length - availableCount;
            normalizedPlacements.forEach((descriptor, placementIndex) => {
                boundItems.add(index);
                if (!groups.has(descriptor.sourceIdentity)) {
                    groups.set(descriptor.sourceIdentity, {
                        sourceIdentity: descriptor.sourceIdentity,
                        sourceUrl: descriptor.sourceUrl,
                        sourceName: descriptor.sourceName,
                        sourceWidth: descriptor.sourceWidth,
                        sourceHeight: descriptor.sourceHeight,
                        markers: []
                    });
                }
                groups.get(descriptor.sourceIdentity).markers.push({
                    item,
                    crop: descriptor,
                    placementAvailable: placementIndex >= firstAvailableIndex,
                    labelId: getAutoMarkerId(item, index, placementIndex, descriptor)
                });
            });
        });
        return {
            groups: [...groups.values()],
            totalItems: entries.length,
            bindingItems,
            boundItems: boundItems.size,
            unboundItems: Math.max(entries.length - boundItems.size, 0)
        };
    }

    async function refreshPlateMapSources(result, previewInfo) {
        if (result.groups.length || typeof global.loadData !== 'function') return result;
        const selection = typeof global.getCurrentWorkspaceSelection === 'function'
            ? global.getCurrentWorkspaceSelection()
            : null;
        const groupId = selection?.activeGroup?.id || '';
        const plateId = selection?.activePlate?.id || '';
        const plateName = selection?.activePlate?.name || global.getExportWorkspaceContext?.().plateName || '当前盘';
        if (previewInfo) previewInfo.textContent = `正在重新核对【${plateName}】的最新云端绑定...`;

        try {
            await global.loadData();
            if (groupId && plateId && typeof global.setWorkspaceSelection === 'function') {
                global.setWorkspaceSelection(groupId, plateId);
            }
            return collectPlateMapSources();
        } catch (error) {
            console.warn('整盘图绑定重新读取失败:', error);
            return result;
        }
    }

    function getEmptyPlateMapMessage(result) {
        const plateName = global.getExportWorkspaceContext?.().plateName || '当前盘';
        if (!result.totalItems) {
            return {
                info: `【${plateName}】没有读取到商品数据，请确认当前盘和云端数据源`,
                title: '当前盘没有商品数据',
                detail: '请确认客户端与管理端使用同一个 Gist，并检查当前选择的盘。'
            };
        }
        if (result.bindingItems) {
            return {
                info: `【${plateName}】读取到 ${result.bindingItems} 条绑定，但原图链接或裁切尺寸不完整`,
                title: '绑定信息无法解析',
                detail: '请在管理端重新应用一次整图裁切，确认原图链接可以公开访问。'
            };
        }
        return {
            info: `【${plateName}】读取到 ${result.totalItems} 条商品，但这份数据中没有整图绑定`,
            title: '当前数据没有整图绑定',
            detail: '页面已重新核对云端；请确认客户端与管理端使用同一个 Gist，并确认绑定应用在这个盘。'
        };
    }

    function normalizeCropDescriptor(item, crop) {
        const rawSource = String(crop.sourceUrl || getSourceFromCropReference(item?.imgSrc) || '').trim();
        const sourceWidth = Number(crop.sourceWidth || 0);
        const sourceHeight = Number(crop.sourceHeight || 0);
        const x = Number(crop.x);
        const y = Number(crop.y);
        const width = Number(crop.width);
        const height = Number(crop.height);
        if (!rawSource || sourceWidth <= 0 || sourceHeight <= 0) return null;
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
        const store = global.GroupDeskLocalImages;
        const isLocalSource = typeof store?.isLocalReference === 'function'
            ? store.isLocalReference(rawSource)
            : rawSource.startsWith('local-image://') && !rawSource.includes('#gd-crop=');
        if (isLocalSource) {
            return {
                sourceUrl: rawSource,
                sourceIdentity: rawSource,
                sourceName: String(crop.sourceName || '本地整盘原图'),
                sourceWidth,
                sourceHeight,
                x,
                y,
                width,
                height
            };
        }
        try {
            const sourceUrl = new URL(rawSource, document.baseURI);
            sourceUrl.hash = '';
            sourceUrl.searchParams.delete('gd_refresh');
            if (crop.updatedAt) sourceUrl.searchParams.set('gd_map', String(new Date(crop.updatedAt).getTime() || crop.updatedAt));
            const identityUrl = new URL(sourceUrl.href);
            ['gd_v', 'gd_map', 'gd_refresh'].forEach(name => identityUrl.searchParams.delete(name));
            return {
                sourceUrl: sourceUrl.href,
                sourceIdentity: identityUrl.href,
                sourceName: String(crop.sourceName || sourceUrl.pathname.split('/').pop() || '整盘原图'),
                sourceWidth,
                sourceHeight,
                x,
                y,
                width,
                height
            };
        } catch (error) {
            return null;
        }
    }

    function getSourceFromCropReference(value) {
        const text = String(value || '');
        const markerIndex = text.lastIndexOf('#gd-crop=');
        return markerIndex >= 0 ? text.slice(0, markerIndex) : '';
    }

    function getAutoMarkerId(item, itemIndex, placementIndex, descriptor) {
        const itemIdentity = String(item?.syncId || item?.id || `item-${itemIndex}`);
        const geometry = [descriptor.sourceIdentity, descriptor.x, descriptor.y, descriptor.width, descriptor.height].join('|');
        return `auto-${hashLabelIdentity(itemIdentity)}-${placementIndex}-${hashLabelIdentity(geometry)}`;
    }

    function hashLabelIdentity(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    async function renderPlateMapPreview() {
        const previewContainer = document.getElementById('previewContainer');
        const previewGrid = document.getElementById('stockPreviewGrid');
        const previewInfo = document.getElementById('previewInfo');
        const downloadButton = document.querySelector('.download-btn');
        const printButton = document.querySelector('.print-btn');
        if (!previewContainer || !previewGrid || !previewInfo || !downloadButton || !printButton) return;

        loadStickers();
        await loadSoldOutStickerAsset();
        updateToolbarState();
        let result = collectPlateMapSources();
        result = await refreshPlateMapSources(result, previewInfo);
        previewGrid.innerHTML = '';
        previewGrid.classList.toggle('plate-map-collage-mode', isPlateMapCollageMode());
        previewContainer.classList.add('visible');
        previewGrid.classList.add('sticker-edit-mode');
        applyPlateMapDisplaySettings();

        if (!result.groups.length) {
            const message = getEmptyPlateMapMessage(result);
            previewInfo.textContent = message.info;
            previewGrid.innerHTML = `<div class="plate-map-empty"><strong>${escapeHtml(message.title)}</strong><span>${escapeHtml(message.detail)}</span></div>`;
            downloadButton.disabled = true;
            printButton.disabled = true;
            document.querySelector('.preview-zoom-controls')?.remove();
            return;
        }

        previewInfo.textContent = `共 ${result.groups.length} 张整盘图 · 自动标注 ${result.boundItems} 个商品${result.unboundItems ? ` · ${result.unboundItems} 个未绑定` : ''}`;

        const pages = result.groups.map((group, pageIndex) => {
            const page = document.createElement('section');
            page.className = 'plate-map-preview-page';
            const sheet = document.createElement('div');
            sheet.className = 'stock-grid-preview plate-map-preview';
            sheet.dataset.sourceName = group.sourceName;
            sheet.innerHTML = `
                <div class="plate-map-board" data-source-identity="${escapeHtml(group.sourceIdentity)}" style="aspect-ratio:${group.sourceWidth} / ${group.sourceHeight}">
                    <img class="plate-map-source-image" src="${escapeHtml(group.sourceUrl)}" crossorigin="anonymous" alt="${escapeHtml(group.sourceName)}" draggable="false" onerror="this.src='${escapeHtml(global.defaultImgUrl || 'ERROR.PNG')}';this.onerror=null;">
                    <div class="plate-map-auto-layer">${group.markers.map(renderAutoMarker).join('')}</div>
                    <div class="plate-map-manual-layer"></div>
                </div>`;
            page.innerHTML = `
                <div class="plate-map-page-toolbar">
                    <span><strong>第 ${pageIndex + 1} 张</strong><small>${escapeHtml(group.sourceName)}</small></span>
                    <button type="button" data-download-plate-page="${pageIndex}">下载这张 ${state.exportQuality === 'lossless' ? 'PNG' : 'JPG'}</button>
                </div>`;
            const viewport = document.createElement('div');
            viewport.className = 'plate-map-preview-viewport';
            const stage = document.createElement('div');
            stage.className = 'plate-map-preview-stage';
            stage.appendChild(sheet);
            viewport.appendChild(stage);
            page.appendChild(viewport);
            return page;
        });
        renderPlateMapPreviewPages(previewGrid, pages);

        applyPlateMapDisplaySettings();
        applyAllAutoLabelStyles();
        renderManualStickers();
        applyLabelSelectionState();
        downloadButton.disabled = false;
        printButton.disabled = false;
        global.createPreviewZoomControls?.();
        global.resetPreviewZoom?.();
        syncPlateMapPageWidths();
        updateToolbarState();
    }

    function showPlateMapPreviewError(error) {
        console.error('整盘标价图预览失败:', error);
        const previewContainer = document.getElementById('previewContainer');
        const previewGrid = document.getElementById('stockPreviewGrid');
        const previewInfo = document.getElementById('previewInfo');
        const reason = String(error?.message || '浏览器没有完成图片解析');
        previewContainer?.classList.add('visible');
        if (previewInfo) previewInfo.textContent = `预览生成失败：${reason}`;
        if (previewGrid) {
            previewGrid.classList.remove('sticker-edit-mode', 'plate-map-collage-mode');
            previewGrid.innerHTML = `<div class="plate-map-empty"><strong>整盘标价图生成失败</strong><span>${escapeHtml(reason)}，请刷新页面后重试。</span></div>`;
        }
        document.querySelector('.download-btn')?.setAttribute('disabled', 'disabled');
        document.querySelector('.print-btn')?.setAttribute('disabled', 'disabled');
        document.querySelector('.preview-zoom-controls')?.remove();
        global.notifyExport?.(`整盘标价图预览失败：${reason}`);
    }

    function isPlateMapCollageMode() {
        return state.exportMode === 'grid4' || state.exportMode === 'grid9' || state.exportMode === 'custom';
    }

    function getPlateMapCollageDimensions() {
        if (state.exportMode === 'grid9') return { columns: 3, rows: 3 };
        if (state.exportMode === 'custom') {
            return { columns: state.customGridColumns, rows: state.customGridRows };
        }
        return { columns: 2, rows: 2 };
    }

    function getPlateMapCollageLabel() {
        if (state.exportMode === 'grid9') return '九宫格';
        if (state.exportMode === 'grid4') return '四宫格';
        const { columns, rows } = getPlateMapCollageDimensions();
        return `${columns}×${rows}拼图`;
    }

    function renderPlateMapPreviewPages(previewGrid, pages) {
        if (!isPlateMapCollageMode()) {
            pages.forEach(page => previewGrid.appendChild(page));
            return;
        }

        const { columns, rows } = getPlateMapCollageDimensions();
        const pageSize = columns * rows;
        const collageLabel = getPlateMapCollageLabel();
        const collageCount = Math.ceil(pages.length / pageSize);
        for (let start = 0; start < pages.length; start += pageSize) {
            const groupPages = pages.slice(start, start + pageSize);
            const collageIndex = Math.floor(start / pageSize);
            const section = document.createElement('section');
            section.className = 'plate-map-collage-preview';
            section.innerHTML = `
                <header class="plate-map-collage-preview-head">
                    <strong>${collageLabel}预览${collageCount > 1 ? ` ${collageIndex + 1}/${collageCount}` : ''}</strong>
                    <div class="plate-map-collage-preview-actions">
                        <span>${groupPages.length} 张</span>
                        <button type="button" data-download-plate-collage="${collageIndex}">下载这张 ${state.exportQuality === 'lossless' ? 'PNG' : 'JPG'}</button>
                    </div>
                </header>
                <div class="plate-map-collage-preview-canvas"></div>`;
            const canvas = section.querySelector('.plate-map-collage-preview-canvas');
            for (let rowStart = 0; rowStart < groupPages.length; rowStart += columns) {
                const row = document.createElement('div');
                row.className = 'plate-map-collage-preview-row';
                groupPages.slice(rowStart, rowStart + columns).forEach(page => row.appendChild(page));
                canvas.appendChild(row);
            }
            previewGrid.appendChild(section);
        }
    }

    function renderAutoMarker({ item, crop, placementAvailable, labelId }, markerIndex) {
        const left = clamp((crop.x / crop.sourceWidth) * 100, 0, 100);
        const top = clamp((crop.y / crop.sourceHeight) * 100, 0, 100);
        const width = clamp((crop.width / crop.sourceWidth) * 100, 0.5, 100 - left);
        const height = clamp((crop.height / crop.sourceHeight) * 100, 0.5, 100 - top);
        const surplus = typeof global.getExportSurplus === 'function' ? global.getExportSurplus(item) : 0;
        const isGift = typeof global.isExportGiftItem === 'function' && global.isExportGiftItem(item);
        const soldOut = placementAvailable === false || surplus <= 0;
        const productNameText = String(item?.category || '商品');
        const productName = escapeHtml(productNameText);
        const labels = [];
        const baseZ = 10 + markerIndex * 10;

        labels.push(renderIndependentAutoLabel({
            id: `${labelId}:name`, type: 'name', labelName: `${productNameText} · 谷名`,
            left, top, anchorX: 0, anchorY: 0, defaultZ: baseZ + 1,
            className: 'plate-map-auto-name', content: productName
        }));

        const kunxuText = String(item?.kunxu || '').trim();
        if (kunxuText && kunxuText !== '不捆') {
            labels.push(renderIndependentAutoLabel({
                id: `${labelId}:kunxu`, type: 'kunxu', labelName: `${productNameText} · 捆序`,
                left: left + width, top, anchorX: 100, anchorY: 0, defaultZ: baseZ + 2,
                className: 'plate-map-auto-kunxu', content: escapeHtml(kunxuText)
            }));
        }

        if (soldOut) {
            labels.push(renderIndependentAutoLabel({
                id: `${labelId}:sold`, type: 'sold', labelName: `${productNameText} · 售罄贴纸`,
                left: left + width / 2, top: top + height / 2, anchorX: 50, anchorY: 50, defaultZ: baseZ + 5,
                className: 'plate-map-auto-sold-label',
                content: renderSoldOutStickerMarkup(isSoldOutImageActive() ? 'plate-map-auto-sticker-image' : 'plate-map-auto-empty')
            }));
        } else {
            let priceContent;
            let priceClass = 'plate-map-auto-price';
            if (isGift) {
                priceContent = '赠';
                priceClass += ' gift';
            } else {
            const priceInfo = typeof global.getExportPriceInfo === 'function' ? global.getExportPriceInfo(item) : { finalPrice: Number(item?.price || 0) };
            const price = typeof global.formatExportMoney === 'function' ? global.formatExportMoney(priceInfo.finalPrice) : String(priceInfo.finalPrice || 0);
            const workspace = typeof global.getExportWorkspaceContext === 'function' ? global.getExportWorkspaceContext() : { priceMode: 'direct' };
            const exportPriceMode = typeof global.getCurrentExportPriceMode === 'function' ? global.getCurrentExportPriceMode() : 'total';
            if (workspace.priceMode === 'balance' && exportPriceMode === 'adjust') {
                const basePrice = typeof global.formatExportMoney === 'function' ? global.formatExportMoney(priceInfo.basePrice) : String(priceInfo.basePrice || 0);
                const adjust = typeof global.formatExportSignedMoney === 'function' ? global.formatExportSignedMoney(priceInfo.adjust) : String(priceInfo.adjust || 0);
                    priceClass += ' is-adjust';
                    priceContent = `<strong>¥${escapeHtml(price)}</strong><small>均 ¥${escapeHtml(basePrice)} · 调 ${escapeHtml(adjust)}</small>`;
            } else {
                    priceContent = `¥${escapeHtml(price)}`;
                }
            }
            labels.push(renderIndependentAutoLabel({
                id: `${labelId}:price`, type: 'price', labelName: `${productNameText} · 价格`,
                left, top: top + height, anchorX: 0, anchorY: 100, defaultZ: baseZ + 3,
                className: priceClass, content: priceContent
            }));
            labels.push(renderIndependentAutoLabel({
                id: `${labelId}:stock`, type: 'stock', labelName: `${productNameText} · 余量`,
                left: left + width, top: top + height, anchorX: 100, anchorY: 100, defaultZ: baseZ + 4,
                className: 'plate-map-auto-stock', content: `余 ${surplus}`
            }));
        }

        return `<div class="plate-map-auto-marker ${soldOut ? 'sold-out' : 'available'}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%" title="${productName}"></div>${labels.join('')}`;
    }

    function renderIndependentAutoLabel({ id, type, labelName, left, top, anchorX, anchorY, defaultZ, className, content }) {
        const adjustment = getAutoLabelAdjustment(id);
        const adjustedLeft = clamp(left + Number(adjustment.offsetX || 0), 0, 100);
        const adjustedTop = clamp(top + Number(adjustment.offsetY || 0), 0, 100);
        const scale = clamp(Number(adjustment.scale || 1), MIN_LABEL_SCALE, MAX_LABEL_SCALE);
        const z = getStoredLabelZ(adjustment.z, defaultZ);
        return `<div class="plate-map-auto-label ${className}${id === state.selectedAutoLabelId ? ' selected' : ''}"
            data-label-kind="auto" data-label-type="${escapeHtml(type)}" data-label-id="${escapeHtml(id)}" data-label-name="${escapeHtml(labelName)}"
            data-base-left="${left}" data-base-top="${top}" data-default-z="${defaultZ}"
            style="left:${adjustedLeft}%;top:${adjustedTop}%;--plate-map-label-anchor-x:-${anchorX}%;--plate-map-label-anchor-y:-${anchorY}%;--plate-map-label-scale:${scale};z-index:${z}" title="${escapeHtml(labelName)}">
            ${content}
            <button class="plate-map-label-resize-handle" type="button" data-label-resize aria-label="拖动调整标签大小" title="拖动调整大小"></button>
        </div>`;
    }

    function resetPlateMapZoom() {
        const previewContainer = document.getElementById('previewContainer');
        const availableWidth = Math.max(320, (previewContainer?.parentElement?.clientWidth || window.innerWidth) - 36);
        if (isPlateMapCollageMode()) {
            state.previewScale = 1;
            applyPlateMapCollageZoom(availableWidth);
            const display = document.querySelector('.zoom-display');
            if (display) display.textContent = '100%';
            return;
        }
        const scale = Math.max(0.3, Math.min(1, availableWidth / 1080));
        state.previewScale = scale;
        document.querySelectorAll('.stock-grid-preview').forEach(sheet => {
            setPlateMapPreviewScale(sheet, scale);
        });
        syncPlateMapPageWidths();
        const display = document.querySelector('.zoom-display');
        if (display) display.textContent = `${Math.round(scale * 100)}%`;
    }

    function syncPlateMapPageWidths() {
        if (isPlateMapCollageMode()) return;
        document.querySelectorAll('.plate-map-preview-page').forEach(page => {
            const sheet = page.querySelector('.plate-map-preview');
            if (!sheet) return;
            const scale = getPlateMapPreviewScale(sheet);
            const size = setPlateMapPreviewScale(sheet, scale);
            page.style.width = `${size.width}px`;
            page.style.height = 'auto';
        });
    }

    function getPlateMapPreviewScale(sheet) {
        const stage = sheet?.closest('.plate-map-preview-stage');
        return Math.max(0.01, Number.parseFloat(stage?.dataset.previewScale) || 1);
    }

    function setPlateMapPreviewScale(sheet, scale) {
        const normalizedScale = Math.max(0.01, Number(scale) || 1);
        const viewport = sheet?.closest('.plate-map-preview-viewport');
        const stage = sheet?.closest('.plate-map-preview-stage');
        const width = Math.max(1, Math.round((sheet?.offsetWidth || 1) * normalizedScale));
        const height = Math.max(1, Math.round((sheet?.offsetHeight || 1) * normalizedScale));
        if (!viewport || !stage) return { width, height };
        sheet.style.zoom = '1';
        stage.dataset.previewScale = String(normalizedScale);
        stage.style.transform = normalizedScale === 1 ? 'none' : `scale(${normalizedScale})`;
        viewport.style.width = `${width}px`;
        viewport.style.height = `${height}px`;
        return { width, height };
    }

    function applyPlateMapCollageZoom(baseAvailableWidth) {
        const previewContainer = document.getElementById('previewContainer');
        const availableWidth = Math.max(280, Number(baseAvailableWidth || ((previewContainer?.parentElement?.clientWidth || window.innerWidth) - 36)));
        const targetWidth = Math.max(280, Math.round(availableWidth * state.previewScale));
        document.querySelectorAll('.plate-map-collage-preview').forEach(section => {
            section.style.width = `${targetWidth}px`;
            section.querySelectorAll('.plate-map-collage-preview-row').forEach(row => {
                const pages = Array.from(row.querySelectorAll(':scope > .plate-map-preview-page'));
                const measurements = pages.map(page => {
                    const sheet = page.querySelector('.plate-map-preview');
                    if (!sheet) return null;
                    page.style.width = 'auto';
                    page.style.height = 'auto';
                    const width = Math.max(sheet.offsetWidth, 1);
                    const height = Math.max(sheet.offsetHeight, 1);
                    return { page, sheet, width, height, aspect: width / height };
                }).filter(Boolean);
                const aspectTotal = measurements.reduce((sum, item) => sum + item.aspect, 0) || 1;
                const rowHeight = targetWidth / aspectTotal;
                let usedWidth = 0;
                measurements.forEach((item, index) => {
                    const scale = rowHeight / item.height;
                    const size = setPlateMapPreviewScale(item.sheet, scale);
                    const pageWidth = index === measurements.length - 1
                        ? Math.max(1, targetWidth - usedWidth)
                        : size.width;
                    item.page.style.width = `${pageWidth}px`;
                    item.page.style.height = `${size.height}px`;
                    usedWidth += pageWidth;
                });
                row.style.width = `${targetWidth}px`;
                row.style.height = `${Math.max(1, Math.round(rowHeight))}px`;
            });
        });
    }

    function getPlateMapSheets() {
        return Array.from(document.querySelectorAll('#stockPreviewGrid .plate-map-preview'));
    }

    function sanitizeFilePart(value, fallback = '') {
        let text = String(value || '');
        try {
            text = decodeURIComponent(text);
        } catch (error) {
            // Keep the original text when a source name is not URI encoded.
        }
        return text
            .replace(/\.[a-z0-9]{2,5}$/i, '')
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim() || fallback;
    }

    function getPlateMapPageFileName(sheet, index, quality = state.exportQuality) {
        const page = String(index + 1).padStart(2, '0');
        const sourceName = sanitizeFilePart(sheet?.dataset.sourceName, `第${page}张`);
        const isLossless = quality === 'lossless';
        return `${getPlateMapFileBaseName()}-${page}-${sourceName}-${isLossless ? '无损' : '高清'}.${isLossless ? 'png' : 'jpg'}`;
    }

    async function renderPlateMapSheetCanvas(sheet, scale = 2, portableOptions = {}) {
        if (typeof global.html2canvas !== 'function') throw new Error('高清图片组件没有加载成功');
        if (typeof global.createExportRenderClone !== 'function') throw new Error('导出组件没有加载完整');
        const { host, clone } = global.createExportRenderClone(sheet);
        try {
            clone.style.zoom = '1';
            const fallbackCount = typeof global.makeExportImagesPortable === 'function'
                ? await global.makeExportImagesPortable(clone, portableOptions)
                : 0;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const rect = clone.getBoundingClientRect();
            const width = Math.ceil(rect.width);
            const height = Math.ceil(rect.height);
            const canvas = await global.html2canvas(clone, {
                scale,
                backgroundColor: null,
                useCORS: true,
                allowTaint: false,
                logging: false,
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                scrollX: 0,
                scrollY: 0
            });
            return { canvas, fallbackCount };
        } finally {
            host.remove();
        }
    }

    async function downloadPlateMapPage(index, button) {
        const sheet = getPlateMapSheets()[index];
        if (!sheet || button?.disabled) return;
        const isLossless = state.exportQuality === 'lossless';
        const format = isLossless ? 'PNG' : 'JPG';
        const originalLabel = button?.textContent || `下载这张 ${format}`;
        if (button) {
            button.disabled = true;
            button.textContent = '正在生成...';
        }
        try {
            const { canvas, fallbackCount } = await renderPlateMapSheetCanvas(sheet, 2, isLossless
                ? { preserveOriginal: true }
                : {
                    maxDimension: 3600,
                    maxPixels: 10000000,
                    maxBytes: 6000000,
                    quality: 0.97
                });
            const outputCanvas = isLossless ? canvas : optimizePlateMapCollageCanvas(canvas);
            const blob = isLossless
                ? await global.canvasToPngBlob(outputCanvas)
                : await canvasToShareJpegBlob(outputCanvas);
            global.triggerExportDownload(blob, getPlateMapPageFileName(sheet, index));
            global.notifyExport?.(`已下载第 ${index + 1} 张整盘标价图${fallbackCount ? '，外链原图读取失败时已使用占位图' : ''}`);
        } catch (error) {
            console.error('单张整盘标价图下载失败:', error);
            alert(`这张整盘标价图生成失败：${error?.message || '浏览器没有完成图片渲染'}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
            document.querySelectorAll('.export-render-host').forEach(host => host.remove());
        }
    }

    async function downloadPlateMapCollage(index, button) {
        const sheets = getPlateMapSheets();
        const { columns, rows } = getPlateMapCollageDimensions();
        const pageSize = columns * rows;
        const label = getPlateMapCollageLabel();
        const collageIndex = Math.max(0, Math.floor(Number(index) || 0));
        const groupSheets = sheets.slice(collageIndex * pageSize, (collageIndex + 1) * pageSize);
        if (!groupSheets.length || button?.disabled) return;

        const isLossless = state.exportQuality === 'lossless';
        const format = isLossless ? 'PNG' : 'JPG';
        const originalLabel = button?.textContent || `下载这张 ${format}`;
        if (button) {
            button.disabled = true;
            button.textContent = '正在生成...';
        }

        try {
            const renderScale = isLossless ? 1 : 4 / 3;
            const portableOptions = isLossless
                ? { preserveOriginal: true }
                : {
                    maxDimension: 3200,
                    maxPixels: 9000000,
                    maxBytes: 5000000,
                    quality: 0.97
                };
            const rendered = [];
            let fallbackCount = 0;
            for (const sheet of groupSheets) {
                const result = await renderPlateMapSheetCanvas(sheet, renderScale, portableOptions);
                rendered.push(result.canvas);
                fallbackCount += result.fallbackCount;
            }

            const composedCanvas = composePlateMapCanvases(rendered, columns);
            const collageCanvas = isLossless ? composedCanvas : optimizePlateMapCollageCanvas(composedCanvas);
            const collageCount = Math.ceil(sheets.length / pageSize);
            const suffix = collageCount > 1 ? `-${String(collageIndex + 1).padStart(2, '0')}` : '';
            const fileName = `${getPlateMapFileBaseName()}-${label}-${isLossless ? '无损' : '高清'}${suffix}.${isLossless ? 'png' : 'jpg'}`;
            const blob = isLossless
                ? await global.canvasToPngBlob(collageCanvas)
                : await canvasToShareJpegBlob(collageCanvas);
            global.triggerExportDownload(blob, fileName);
            global.notifyExport?.(`已下载第 ${collageIndex + 1} 张${label}${fallbackCount ? `，${fallbackCount} 张外链原图读取失败时已使用占位图` : ''}`);
        } catch (error) {
            console.error('单张整盘拼图下载失败:', error);
            alert(`这张拼图生成失败：${error?.message || '浏览器没有完成图片渲染'}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
            document.querySelectorAll('.export-render-host').forEach(host => host.remove());
        }
    }

    function composePlateMapCanvases(canvases, columns) {
        const actualColumns = Math.min(columns, canvases.length);
        const targetWidth = Math.max(...canvases.map(canvas => canvas.width)) * actualColumns;
        const rows = [];
        for (let start = 0; start < canvases.length; start += actualColumns) {
            const rowCanvases = canvases.slice(start, start + actualColumns);
            const aspectTotal = rowCanvases.reduce((sum, canvas) => sum + (canvas.width / canvas.height), 0);
            rows.push({
                canvases: rowCanvases,
                height: Math.max(1, Math.round(targetWidth / aspectTotal))
            });
        }
        const output = document.createElement('canvas');
        output.width = targetWidth;
        output.height = rows.reduce((sum, row) => sum + row.height, 0);
        const context = output.getContext('2d');
        context.clearRect(0, 0, output.width, output.height);
        let y = 0;
        rows.forEach(row => {
            let x = 0;
            row.canvases.forEach((canvas, index) => {
                const width = index === row.canvases.length - 1
                    ? output.width - x
                    : Math.max(1, Math.round((canvas.width / canvas.height) * row.height));
                context.drawImage(canvas, x, y, width, row.height);
                x += width;
            });
            y += row.height;
        });
        return output;
    }

    function optimizePlateMapCollageCanvas(canvas) {
        const width = Math.max(Number(canvas?.width || 0), 1);
        const height = Math.max(Number(canvas?.height || 0), 1);
        const scale = Math.min(
            1,
            COLLAGE_MAX_WIDTH / width,
            COLLAGE_MAX_HEIGHT / height,
            Math.sqrt(COLLAGE_MAX_PIXELS / (width * height))
        );
        const output = document.createElement('canvas');
        output.width = Math.max(1, Math.round(width * scale));
        output.height = Math.max(1, Math.round(height * scale));
        const context = output.getContext('2d', { alpha: false });
        if (!context) throw new Error('浏览器无法创建压缩画布');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, output.width, output.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(canvas, 0, 0, output.width, output.height);
        return output;
    }

    function canvasToShareJpegBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error('浏览器没有生成压缩图片'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', COLLAGE_JPEG_QUALITY);
        });
    }

    async function downloadCardGridSelection() {
        const previewContainer = document.getElementById('previewContainer');
        const previewGrid = document.getElementById('stockPreviewGrid');
        const downloadButton = document.querySelector('.download-btn');
        const sheets = Array.from(previewGrid?.querySelectorAll('.stock-grid-preview') || []);
        if (!previewContainer?.classList.contains('visible') || !sheets.length) {
            alert('请先生成卡片余量图预览。');
            return;
        }
        if (downloadButton?.disabled || typeof global.html2canvas !== 'function') return;

        const isLossless = state.exportQuality === 'lossless';
        const formatLabel = isLossless ? 'PNG' : 'JPG';
        const extension = isLossless ? 'png' : 'jpg';
        const fileBaseName = originalGetExportFileBaseName?.apply(global) || '余量图';
        if (downloadButton) {
            downloadButton.disabled = true;
            downloadButton.classList.add('is-loading');
            downloadButton.textContent = '正在生成...';
        }

        try {
            let fallbackCount = 0;
            const files = [];
            for (let index = 0; index < sheets.length; index++) {
                const { host, clone } = global.createExportRenderClone(sheets[index]);
                try {
                    fallbackCount += await global.makeExportImagesPortable(clone, isLossless
                        ? { preserveOriginal: true }
                        : {
                            maxDimension: 2400,
                            maxPixels: 6000000,
                            maxBytes: 3500000,
                            quality: 0.94
                        });
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    const width = Math.ceil(clone.getBoundingClientRect().width);
                    const height = Math.ceil(clone.getBoundingClientRect().height);
                    const canvas = await global.html2canvas(clone, {
                        scale: 2,
                        backgroundColor: '#f4f7fb',
                        useCORS: true,
                        allowTaint: false,
                        logging: false,
                        width,
                        height,
                        windowWidth: width,
                        windowHeight: height,
                        scrollX: 0,
                        scrollY: 0
                    });
                    const suffix = sheets.length > 1 ? `-${index + 1}` : '';
                    files.push({
                        name: `${fileBaseName}${suffix}.${extension}`,
                        blob: isLossless ? await global.canvasToPngBlob(canvas) : await canvasToShareJpegBlob(canvas)
                    });
                } finally {
                    host.remove();
                }
            }

            const delivery = await global.downloadExportFiles(files, `${fileBaseName}-${files.length}张.zip`);
            const deliveryMessage = delivery.mode === 'zip'
                ? '，已打包为 ZIP'
                : delivery.mode === 'individual'
                    ? '，已逐张开始下载'
                    : '';
            const fallbackMessage = fallbackCount ? `，${fallbackCount} 张外链图片读取失败时已使用占位图` : '';
            global.notifyExport?.(`已生成 ${files.length} 张${isLossless ? '无损' : '高清'} ${formatLabel} 卡片余量图${deliveryMessage}${fallbackMessage}`);
        } catch (error) {
            console.error('卡片余量图下载失败:', error);
            alert(`卡片余量图生成失败：${error?.message || '浏览器没有完成图片渲染'}。`);
        } finally {
            document.querySelectorAll('.export-render-host').forEach(host => host.remove());
            if (downloadButton) {
                downloadButton.disabled = false;
                downloadButton.classList.remove('is-loading');
            }
            updatePlateMapDownloadLabel();
        }
    }

    async function downloadPlateMapSelection() {
        const sheets = getPlateMapSheets();
        const downloadButton = document.querySelector('.download-btn');
        if (!sheets.length) {
            alert('请先生成整盘标价图预览。');
            return;
        }
        if (downloadButton?.disabled || typeof global.html2canvas !== 'function') return;
        const previewIsCollage = isPlateMapCollageMode();
        const previewDimensions = getPlateMapCollageDimensions();
        const expectedFileCount = previewIsCollage
            ? Math.ceil(sheets.length / (previewDimensions.columns * previewDimensions.rows))
            : sheets.length;
        if (previewIsCollage && expectedFileCount > 1) {
            const choice = await choosePlateMapMultiSaveMode(expectedFileCount);
            if (!choice) return;
        }
        const originalLabel = downloadButton?.textContent || '下载全部';
        if (downloadButton) {
            downloadButton.disabled = true;
            downloadButton.classList.add('is-loading');
            downloadButton.textContent = '正在生成...';
        }
        try {
            const isCollage = isPlateMapCollageMode();
            const isLossless = state.exportQuality === 'lossless';
            const { columns, rows } = getPlateMapCollageDimensions();
            const pageSize = columns * rows;
            const renderScale = isCollage ? (isLossless ? 1 : 4 / 3) : 2;
            const portableOptions = isLossless
                ? { preserveOriginal: true }
                : {
                    maxDimension: 3200,
                    maxPixels: 9000000,
                    maxBytes: 5000000,
                    quality: 0.97
                };
            const rendered = [];
            let fallbackCount = 0;
            for (const sheet of sheets) {
                const result = await renderPlateMapSheetCanvas(sheet, renderScale, portableOptions);
                rendered.push(result.canvas);
                fallbackCount += result.fallbackCount;
            }

            const files = [];
            if (isCollage) {
                const label = getPlateMapCollageLabel();
                const pageCount = Math.ceil(rendered.length / pageSize);
                for (let start = 0; start < rendered.length; start += pageSize) {
                    const pageIndex = Math.floor(start / pageSize);
                    const suffix = pageCount > 1 ? `-${String(pageIndex + 1).padStart(2, '0')}` : '';
                    const composedCanvas = composePlateMapCanvases(rendered.slice(start, start + pageSize), columns);
                    const collageCanvas = isLossless ? composedCanvas : optimizePlateMapCollageCanvas(composedCanvas);
                    files.push({
                        name: `${getPlateMapFileBaseName()}-${label}-${isLossless ? '无损' : '高清'}${suffix}.${isLossless ? 'png' : 'jpg'}`,
                        blob: isLossless
                            ? await global.canvasToPngBlob(collageCanvas)
                            : await canvasToShareJpegBlob(collageCanvas)
                    });
                }
            } else {
                for (let index = 0; index < rendered.length; index++) {
                    const outputCanvas = isLossless ? rendered[index] : optimizePlateMapCollageCanvas(rendered[index]);
                    files.push({
                        name: getPlateMapPageFileName(sheets[index], index),
                        blob: isLossless
                            ? await global.canvasToPngBlob(outputCanvas)
                            : await canvasToShareJpegBlob(outputCanvas)
                    });
                }
            }

            const packageLabel = isCollage ? `${getPlateMapCollageLabel()}-${files.length}张` : `${files.length}张`;
            const delivery = await global.downloadExportFiles(files, `${getPlateMapFileBaseName()}-${packageLabel}.zip`);
            const modeLabel = isCollage ? getPlateMapCollageLabel() : '分张图片';
            const shareMessage = isLossless
                ? '，已生成无损 PNG'
                : '，已生成高清 JPG';
            const deliveryMessage = delivery.mode === 'zip'
                ? '，已打包为 ZIP'
                : delivery.mode === 'individual'
                    ? '，已逐张开始下载'
                    : '';
            global.notifyExport?.(`已生成 ${modeLabel}${shareMessage}${deliveryMessage}${fallbackCount ? `，${fallbackCount} 张外链原图读取失败时已使用占位图` : ''}`);
        } catch (error) {
            console.error('整盘标价图下载失败:', error);
            alert(`整盘标价图生成失败：${error?.message || '浏览器没有完成图片渲染'}`);
        } finally {
            document.querySelectorAll('.export-render-host').forEach(host => host.remove());
            if (downloadButton) {
                downloadButton.disabled = false;
                downloadButton.classList.remove('is-loading');
                downloadButton.textContent = originalLabel;
            }
            updatePlateMapDownloadLabel();
        }
    }

    function getPlateMapFileBaseName() {
        const workspace = typeof global.getExportWorkspaceContext === 'function'
            ? global.getExportWorkspaceContext()
            : { groupName: '当前团', plateName: '当前盘' };
        return `${workspace.groupName}-${workspace.plateName}-整盘标价图`
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim() || '整盘标价图';
    }

    function escapeHtml(value) {
        if (typeof global.escapeExportHtml === 'function') return global.escapeExportHtml(value);
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    function escapeSelector(value) {
        const text = String(value || '');
        if (global.CSS?.escape) return global.CSS.escape(text);
        return text.replace(/[\\"]/g, '\\$&');
    }

    function clamp(value, minimum, maximum) {
        return Math.min(Math.max(Number(value) || 0, minimum), maximum);
    }

    function normalizeColor(value, fallback) {
        return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
    }

    global.setExportLayoutMode = setExportLayoutMode;
    global.setPlateMapExportMode = setPlateMapExportMode;
    global.setPlateMapExportQuality = setPlateMapExportQuality;
    global.setExportMultiSaveMode = setExportMultiSaveMode;
    global.getExportMultiSaveMode = () => state.multiSaveMode;
    global.choosePlateMapMultiSaveMode = choosePlateMapMultiSaveMode;
    global.previewStockGrid = function () {
        if (typeof global.syncExportPriceModeForPlate === 'function') global.syncExportPriceModeForPlate();
        if (state.layout === 'plate') {
            return renderPlateMapPreview().catch(error => {
                showPlateMapPreviewError(error);
                return null;
            });
        }
        document.getElementById('stockPreviewGrid')?.classList.remove('sticker-edit-mode');
        return originalPreviewStockGrid.apply(this, arguments);
    };
    global.resetPreviewZoom = function () {
        if (state.layout === 'plate') return resetPlateMapZoom();
        return originalResetPreviewZoom?.apply(this, arguments);
    };
    global.zoomPreview = function () {
        if (state.layout !== 'plate') return originalZoomPreview?.apply(this, arguments);
        if (isPlateMapCollageMode()) {
            state.previewScale = clamp(state.previewScale + Number(arguments[0] || 0), 0.5, 2);
            applyPlateMapCollageZoom();
            const display = document.querySelector('.zoom-display');
            if (display) display.textContent = `${Math.round(state.previewScale * 100)}%`;
            return;
        }
        state.previewScale = clamp(state.previewScale + Number(arguments[0] || 0), 0.3, 2);
        document.querySelectorAll('.plate-map-preview').forEach(sheet => {
            setPlateMapPreviewScale(sheet, state.previewScale);
        });
        syncPlateMapPageWidths();
        const display = document.querySelector('.zoom-display');
        if (display) display.textContent = `${Math.round(state.previewScale * 100)}%`;
    };
    global.getExportFileBaseName = function () {
        if (state.layout === 'plate') return getPlateMapFileBaseName();
        return originalGetExportFileBaseName?.apply(this, arguments) || '余量图';
    };
    global.downloadStockGridPng = function () {
        if (state.layout === 'plate') return downloadPlateMapSelection();
        return downloadCardGridSelection();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})(window);
