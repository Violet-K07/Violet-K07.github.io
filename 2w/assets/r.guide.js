(function () {
    'use strict';

    function updateGuide(selector, markup) {
        const panel = document.querySelector(selector);
        if (panel) panel.innerHTML = markup;
    }

    const stockTab = document.querySelector('[onclick*="stock-main"]');
    const stockSearch = document.getElementById('stockSearchInput');
    const stockFilterLabel = document.querySelector('.stock-filter-toggle .toggle-label');
    if (stockTab) stockTab.textContent = '排谷认领';
    if (stockSearch) stockSearch.placeholder = '搜索谷子名 / 捆序';
    if (stockFilterLabel) stockFilterLabel.textContent = '库存';

    updateGuide('.pai-gu-tips', `
        <p class="help-lead"><span class="help-lead-icon">🧭</span><span>按下面 4 步完成认领</span></p>
        <ul>
            <li><span class="help-tag help-purple">找谷子</span> 默认显示<span class="help-good">有库存</span>，可搜索谷子名或捆序，也可切换全部或已售罄。</li>
            <li><span class="help-tag help-green">单个认领</span> 点卡片空白处翻面，填写 <strong>CN</strong> 和数量后直接认领。</li>
            <li><span class="help-tag help-orange">批量认领</span> 点<span class="help-action">+ 加入购物车</span>并调整数量，再在上方填写 CN 后确认。</li>
            <li><span class="help-tag help-red">查看详情</span> 点图片放大；售罄卡片翻面可查看认领记录。</li>
        </ul>
        <p class="help-tip">💡 提交前核对 CN 和数量。图片用于放大，卡片其他位置用于翻面。</p>
    `);

    updateGuide('.export-tips', `
        <p class="help-lead"><span class="help-lead-icon">🖼️</span><span>选好版式，生成预览后再调整并下载</span></p>
        <ul>
            <li><span class="help-tag help-blue">① 选版式</span> 默认是<span class="help-action">整盘标价图</span>，也可以切换到卡片图，并选择显示范围和价格。</li>
            <li><span class="help-tag help-orange">② 改贴纸</span> 售罄位置会自动加贴纸；可以换成一个 emoji 或上传图片，并调整大小和谷名显示。</li>
            <li><span class="help-tag help-purple">③ 调标签</span> 生成预览后，点选谷名、价格、余量、捆序或贴纸，可以分别拖动、改大小和调整上下层级。</li>
            <li><span class="help-tag help-green">④ 下载</span> 可以分张、四宫格、九宫格或自定义“列 × 行”（如 3×4）；每张可单独下载，也可以下载全部或直接打印。</li>
        </ul>
        <p class="help-tip">💡 预览中调整好的位置、大小和层级会按当前效果下载和打印；修改生成设置后请重新生成预览。</p>
    `);
})();
