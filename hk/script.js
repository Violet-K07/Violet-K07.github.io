// ==================== 全局变量 ====================
let guziData = [];          
let claimRecords = [];      
const defaultImgUrl = "https://via.placeholder.com/180";
let currentSearchCN = '';   
let currentStockFilter = 'inStock'; 
let currentStockSearch = '';
let previewedGridData = []; // 存储预览的网格数据
let currentGridSize = '3x3'; // 当前选择的网格尺寸
let currentExportFilter = 'inStock';
let currentExportSearch = '';
let currentClaimDetailsIndex = -1; // 当前查看认领详情的谷子索引

// 登录状态
let isLoggedIn = false;

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', async function() {
    // 加载保存的主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
    
    // 检查登录状态
    await checkLoginStatus();
    
    // 如果已登录，加载数据
    if (isLoggedIn) {
        await loadData();
    }
    
    // 设置事件监听
    setupEventListeners();
    
    // 初始化库存筛选开关
    initStockFilterToggle();
    
    // 初始化返回顶部按钮
    initBackToTopButton();
});

// ==================== 返回顶部按钮功能 ====================
function initBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    if (!backToTopBtn) return;
    
    // 滚动事件监听
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    // 点击事件
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==================== 主题切换功能 ====================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // 更新主题
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // 更新按钮文本
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const themeBtn = document.getElementById('themeBtn');
    if (theme === 'dark') {
        themeBtn.innerHTML = '<span class="theme-icon">☀️</span> 浅色模式';
    } else {
        themeBtn.innerHTML = '<span class="theme-icon">🌙</span> 深色模式';
    }
}

// ==================== 库存筛选三态开关功能 ====================
function initStockFilterToggle() {
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const toggleSlider = document.getElementById('toggleSlider');
    const filterInput = document.getElementById('stockFilterValue');
    
    // 设置初始状态 - 注意：现在顺序变了，inStock是第一个位置
    let initialPosition = 0; // 默认选择"有库存"（第一个位置）
    if (currentStockFilter === 'all') {
        initialPosition = 1;
    } else if (currentStockFilter === 'outOfStock') {
        initialPosition = 2;
    }
    
    updateTogglePosition(initialPosition);
    
    // 为每个选项添加点击事件
    toggleOptions.forEach((option, index) => {
        option.addEventListener('click', function() {
            updateTogglePosition(index);
            applyStockFilter();
        });
    });
}

function updateTogglePosition(position) {
    const toggleSlider = document.getElementById('toggleSlider');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const filterInput = document.getElementById('stockFilterValue');
    
    // 更新滑块位置
    toggleSlider.setAttribute('data-position', position);
    
    // 更新选项激活状态
    toggleOptions.forEach((option, index) => {
        if (index === position) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // 更新筛选值 - 注意：现在顺序变了
    if (position === 0) {
        filterInput.value = 'inStock'; // 有库存
    } else if (position === 1) {
        filterInput.value = 'all'; // 全部
    } else {
        filterInput.value = 'outOfStock'; // 售罄
    }
}

function applyStockFilter() {
    const filterValue = document.getElementById('stockFilterValue').value;
    currentStockFilter = filterValue;
    renderStockPage();
}

// ==================== 登录相关功能 ====================
async function checkLoginStatus() {
    const token = getGistToken();
    if (!token) {
        // 没有token，显示登录框
        showLoginModal();
        return;
    }
    
    // 验证token有效性
    try {
        const isValid = await validateToken(token);
        if (!isValid) {
            // Token无效，清除并提示重新登录
            clearGistToken();
            alert('密钥无效或已过期，请重新登录');
            showLoginModal();
            return;
        }
        
        // Token有效，显示登录按钮
        isLoggedIn = true;
        document.getElementById('authButtons').style.display = 'flex';
    } catch (error) {
        console.error('验证密钥失败:', error);
        alert('验证密钥失败，请检查网络连接');
        showLoginModal();
    }
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('authButtons').style.display = 'none';
    isLoggedIn = false;
    
    // 清空输入框
    document.getElementById('tokenInput').value = '';
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

async function submitToken() {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('请输入密钥');
        tokenInput.focus();
        return;
    }
    
    // 验证Token格式
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        if (!confirm('密钥格式似乎不正确。标准的密钥以"ghp_"开头。\n\n是否继续使用这个Token？')) {
            tokenInput.focus();
            return;
        }
    }
    
    try {
        // 验证Token有效性
        const isValid = await validateToken(token);
        if (!isValid) {
            alert('密钥无效，请检查是否正确');
            return;
        }
        
        // 保存Token
        setGistToken(token);
        isLoggedIn = true;
        
        // 隐藏登录框，显示登录按钮
        hideLoginModal();
        document.getElementById('authButtons').style.display = 'flex';
        
        // 加载数据
        await loadData();
        
        // 显示成功提示
        showSyncTip('登录成功！数据已加载');
    } catch (error) {
        console.error('提交密钥失败:', error);
        alert('登录失败：' + error.message);
    }
}

function logoutToken() {
    if (!confirm('确定要退出登录吗？这将清除你的登录记录，下次需要重新输入密钥，但不会删除云端数据。')) {
        return;
    }
    
    // 清除Token
    clearGistToken();
    isLoggedIn = false;
    
    // 清空页面数据
    guziData = [];
    claimRecords = [];
    
    // 清空页面显示
    document.getElementById('stock-container').innerHTML = '';
    document.getElementById('summary-container').innerHTML = '';
    document.querySelector('.stock-total-amount').innerText = '¥0.00';
    
    // 隐藏登录按钮，显示登录框
    document.getElementById('authButtons').style.display = 'none';
    showLoginModal();
    
    showSyncTip('已退出登录');
}

// ==================== 数据加载 ====================
async function loadData() {
    try {
        const data = await fetchGuziDataFromGist();
        guziData = data.guziData;
        claimRecords = data.claimRecords;
        
        renderStockPage();
        renderSummaryPage();
        
        showSyncTip('数据加载成功');
    } catch (error) {
        console.error('加载数据失败:', error);
        
        if (error.message.includes('Token') || error.message.includes('401') || error.message.includes('403')) {
            alert('密钥无效或已过期，请重新尝试或联系管理员');
            logoutToken();
        } else {
            alert('加载数据失败：' + error.message);
        }
    }
}

function setupEventListeners() {
    // 监听网格尺寸选择变化
    const gridSizeSelect = document.getElementById('gridSize');
    if (gridSizeSelect) {
        gridSizeSelect.addEventListener('change', function() {
            currentGridSize = this.value;
        });
    }
    
    // 结算页面搜索框支持回车搜索
    const cnSearchInput = document.getElementById('cnSearchInput');
    if (cnSearchInput) {
        cnSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCN();
        });
    }
    
    // 库存主页面搜索框支持回车搜索
    const stockSearchInput = document.getElementById('stockSearchInput');
    if (stockSearchInput) {
        stockSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchStock();
        });
    }
    
    // 登录框输入框支持回车提交
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') submitToken();
        });
    }
    
    // 点击登录框外部关闭
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideLoginModal();
            }
        });
    }
    
    // 点击认领详情模态框外部关闭
    const claimsModal = document.getElementById('claimsModal');
    if (claimsModal) {
        claimsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeClaimsModal();
            }
        });
    }
    
    // 图片放大弹窗点击外部关闭
    const imgModal = document.getElementById('imgModal');
    if (imgModal) {
        imgModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeImgModal();
            }
        });
    }
}

// ==================== 数据同步函数 ====================
function saveDataToLocalStorage() {
    if (!isLoggedIn) {
        alert('请先登录才能保存数据');
        showLoginModal();
        return;
    }
    
    syncGuziDataToGist(guziData, claimRecords);
    showSyncTip();
}

// ==================== 辅助函数 ====================
function showSyncTip(message = '数据已同步到云端！') {
    const tip = document.getElementById('syncTip');
    if (!tip) return;
    
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 3000);
}

// ==================== 页面切换函数 ====================
function switchPage(pageId) {
    // 获取所有页面和标签
    const pages = document.querySelectorAll('.page');
    const tabs = document.querySelectorAll('.tab');
    
    // 移除所有active类
    pages.forEach(page => page.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // 添加active类到目标页面和标签
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function switchSubPage(subPageId) {
    // 获取所有子页面和子标签
    const subPages = document.querySelectorAll('.sub-page');
    const subTabs = document.querySelectorAll('.sub-tab');
    
    // 移除所有active类
    subPages.forEach(page => page.classList.remove('active'));
    subTabs.forEach(tab => tab.classList.remove('active'));
    
    // 添加active类到目标子页面和子标签
    const targetSubPage = document.getElementById(subPageId);
    if (targetSubPage) {
        targetSubPage.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ==================== 库存主页面功能 ====================
function renderStockPage() {
    const stockContainer = document.getElementById('stock-container');
    const totalAmountElement = document.querySelector('.stock-total-amount');
    
    if (!stockContainer || !totalAmountElement) return;
    
    stockContainer.innerHTML = '';
    
    // 计算库存总金额
    let totalAmount = 0;
    guziData.forEach(item => {
        totalAmount += item.price * item.stock;
    });
    totalAmountElement.innerText = `¥${totalAmount.toFixed(2)}`;
    
    // 渲染库存卡片
    guziData.forEach((item, index) => {
        const isOutOfStock = item.stock <= 0;
        const card = document.createElement('div');
        card.className = `stock-card ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.dataset.index = index;
        
        // 筛选逻辑
        let isVisible = true;
        if (currentStockFilter === 'inStock' && isOutOfStock) isVisible = false;
        if (currentStockFilter === 'outOfStock' && !isOutOfStock) isVisible = false;
        // 如果currentStockFilter是'all'，则显示全部，不做过滤
        if (currentStockSearch && !item.category.toLowerCase().includes(currentStockSearch.toLowerCase()) && 
            !item.kunxu.toLowerCase().includes(currentStockSearch.toLowerCase())) {
            isVisible = false;
        }
        
        if (isVisible) card.classList.add('visible');
        
        // 获取谷子图片地址
        const imgSrc = item.imgSrc || defaultImgUrl;
        
        // 构建卡片内容
        let cardBackContent = '';
        if (isOutOfStock) {
            // 已售罄卡片：展示认领人列表
            const claimersMap = {};
            item.claimers.forEach(claimerName => {
                claimersMap[claimerName] = (claimersMap[claimerName] || 0) + 1;
            });
            const claimersList = Object.entries(claimersMap).map(([claimerName, count]) => 
                `<div class="claimers-item">${claimerName}：${count}个</div>`
            ).join('');
            
            cardBackContent = `
                <h3>${item.category} 认领记录</h3>
                <div class="claimers-list">
                    <h4>认领人列表（共${item.claimers.length}个）</h4>
                    ${claimersList || '<div class="claimers-item">暂无认领记录</div>'}
                </div>
                <div class="claimers-stat">
                    总认领数量：${item.claimers.length} 个
                </div>
            `;
        } else {
            // 有库存卡片：展示认领表单
            cardBackContent = `
                <button class="claim-title-btn" onclick="showClaimDetails(${index})">
                    ${item.category} 认领详情
                </button>
                <div class="claim-form-group">
                    <label for="claimer-name-${index}">认领人CN</label>
                    <input type="text" id="claimer-name-${index}" class="claim-input" placeholder="请输入你的CN">
                </div>
                <div class="claim-form-group">
                    <label for="claim-quantity-${index}">认领数量</label>
                    <input type="number" id="claim-quantity-${index}" class="quantity-input" min="1" max="${item.stock}" value="1">
                    <div class="quantity-tip">剩余可认领：${item.stock} 个</div>
                </div>
                <button class="claim-btn" onclick="submitClaim(${index})">确认认领</button>
            `;
        }
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    ${item.kunxu !== '不捆' ? `<div class="kunxu-tag">${item.kunxu}</div>` : ''}
                    <img src="${imgSrc}" alt="${item.category}">
                    <div class="category-name">${item.category}</div>
                    <div class="stock-num">${item.stock}</div>
                    <div class="stock-status">${isOutOfStock ? '已售罄' : '可认领'}</div>
                    <div class="price-info">单价：¥${item.price.toFixed(2)}</div>
                </div>
                <div class="card-back" style="--bg-img: url('${imgSrc}')">
                    <style>
                        .card-back[data-index="${index}"]::before {
                            background-image: var(--bg-img);
                        }
                    </style>
                    <button class="close-btn" onclick="flipStockCard(${index})">×</button>
                    ${cardBackContent}
                </div>
            </div>
        `;
        
        // 给卡片背面添加data-index属性，用于定位背景图
        const cardBack = card.querySelector('.card-back');
        if (cardBack) {
            cardBack.setAttribute('data-index', index);
        }
        
        // 修复卡片点击反转bug：仅点击正面非按钮区域才翻转
        const cardFront = card.querySelector('.card-front');
        if (cardFront) {
            cardFront.addEventListener('click', function(e) {
                if (!e.target.closest('.close-btn') && !e.target.closest('.claim-btn') && !e.target.closest('.claim-title-btn')) {
                    card.classList.add('flipped');
                }
            });
        }
        
        // 阻止背面内容点击触发翻转
        if (cardBack) {
            cardBack.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        stockContainer.appendChild(card);
    });
}

// 显示认领详情模态框
function showClaimDetails(index) {
    if (event) event.stopPropagation(); // 防止触发卡片翻转
    
    currentClaimDetailsIndex = index;
    const item = guziData[index];
    
    // 更新模态框标题
    const modalTitle = document.getElementById('claimsModalTitle');
    if (modalTitle) {
        modalTitle.textContent = `${item.category} 认领详情`;
    }
    
    // 计算统计信息
    const totalStock = item.stock + item.claimers.length; // 总库存 = 剩余库存 + 已认领数量
    const remainingStock = item.stock;
    const claimedCount = item.claimers.length;
    
    // 统计认领人数量
    const claimersMap = {};
    item.claimers.forEach(claimerName => {
        claimersMap[claimerName] = (claimersMap[claimerName] || 0) + 1;
    });
    const claimersCount = Object.keys(claimersMap).length;
    
    // 更新统计信息
    const totalStockEl = document.getElementById('totalStock');
    const remainingStockEl = document.getElementById('remainingStock');
    const claimedCountEl = document.getElementById('claimedCount');
    const claimersCountEl = document.getElementById('claimersCount');
    
    if (totalStockEl) totalStockEl.textContent = totalStock;
    if (remainingStockEl) remainingStockEl.textContent = remainingStock;
    if (claimedCountEl) claimedCountEl.textContent = claimedCount;
    if (claimersCountEl) claimersCountEl.textContent = claimersCount;
    
    // 更新认领记录表格
    const claimsTableBody = document.getElementById('claimsTableBody');
    const noClaimsMessage = document.getElementById('noClaimsMessage');
    
    if (claimedCount > 0) {
        // 有认领记录，显示表格
        if (claimsTableBody) {
            claimsTableBody.innerHTML = '';
            
            Object.entries(claimersMap).forEach(([claimerName, count]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${claimerName}</td>
                    <td>${count} 个</td>
                `;
                claimsTableBody.appendChild(row);
            });
            
            claimsTableBody.style.display = 'table-row-group';
        }
        
        if (noClaimsMessage) {
            noClaimsMessage.style.display = 'none';
        }
    } else {
        // 无认领记录，显示提示信息
        if (claimsTableBody) {
            claimsTableBody.style.display = 'none';
        }
        
        if (noClaimsMessage) {
            noClaimsMessage.style.display = 'block';
        }
    }
    
    // 显示模态框
    const claimsModal = document.getElementById('claimsModal');
    if (claimsModal) {
        claimsModal.style.display = 'flex';
    }
}

// 关闭认领详情模态框
function closeClaimsModal() {
    const claimsModal = document.getElementById('claimsModal');
    if (claimsModal) {
        claimsModal.style.display = 'none';
    }
    currentClaimDetailsIndex = -1;
}

function flipStockCard(index) {
    if (event) event.stopPropagation(); // 防止触发卡片翻转
    
    const card = document.querySelector(`.stock-card[data-index="${index}"]`);
    if (card) {
        card.classList.remove('flipped');
    }
}

function submitClaim(index) {
    if (event) event.stopPropagation(); // 防止触发卡片翻转
    
    if (!isLoggedIn) {
        alert('请先登录才能认领谷子');
        showLoginModal();
        return;
    }
    
    const claimerNameInput = document.getElementById(`claimer-name-${index}`);
    const claimQuantityInput = document.getElementById(`claim-quantity-${index}`);
    
    if (!claimerNameInput || !claimQuantityInput) {
        alert('无法找到认领表单元素');
        return;
    }
    
    const claimerName = claimerNameInput.value.trim();
    const claimQuantity = parseInt(claimQuantityInput.value);
    
    if (!claimerName) {
        alert('请输入认领人CN！');
        return;
    }
    
    if (isNaN(claimQuantity) || claimQuantity < 1 || claimQuantity > guziData[index].stock) {
        alert(`认领数量必须在1-${guziData[index].stock}之间！`);
        return;
    }
    
    if (confirm(`确认由【${claimerName}】认领【${guziData[index].category}】${claimQuantity}个吗？无特殊原因不允许撤排，请确认认领该谷子的话点击确认，否则点击取消`)) {
        // 添加认领记录
        for (let i = 0; i < claimQuantity; i++) {
            guziData[index].claimers.push(claimerName);
        }
        // 更新库存
        guziData[index].stock -= claimQuantity;
        // 保存到Gist
        saveDataToLocalStorage();
        // 刷新页面
        renderStockPage();
        renderSummaryPage();
        alert('认领成功！');
        flipStockCard(index);
    }
}

function searchStock() {
    const stockSearchInput = document.getElementById('stockSearchInput');
    if (stockSearchInput) {
        currentStockSearch = stockSearchInput.value.trim();
        renderStockPage();
    }
}

function resetStockSearch() {
    const stockSearchInput = document.getElementById('stockSearchInput');
    if (stockSearchInput) {
        stockSearchInput.value = '';
        currentStockSearch = '';
        renderStockPage();
    }
}

// ==================== 网格布局导出余量图功能 ====================
function previewStockGrid() {
    const previewContainer = document.getElementById('previewContainer');
    const stockPreviewGrid = document.getElementById('stockPreviewGrid');
    const previewInfoElement = document.getElementById('previewInfo');
    const printBtn = document.querySelector('.print-btn');
    
    if (!previewContainer || !stockPreviewGrid || !previewInfoElement || !printBtn) {
        return;
    }
    
    const gridSize = currentGridSize;
    const [cols, rows] = gridSize.split('x').map(Number);
    const itemsPerPage = cols * rows;

    // 筛选需要展示的谷子数据
    let filteredData = guziData.filter(item => {
        if (currentExportFilter === 'inStock' && item.stock <= 0) return false;
        if (currentExportFilter === 'outOfStock' && item.stock > 0) return false;
        if (currentExportSearch && !item.category.toLowerCase().includes(currentExportSearch.toLowerCase()) && 
            !item.kunxu.toLowerCase().includes(currentExportSearch.toLowerCase())) {
            return false;
        }
        return true;
    });

    // 清空预览容器
    stockPreviewGrid.innerHTML = '';
    previewedGridData = [];

    // 计算总页数和最后一页的品类数
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const lastPageItems = totalItems % itemsPerPage || itemsPerPage; // 如果余数为0，最后一页也是满的
    
    // 生成提示信息
    let previewInfo = '';
    if (totalPages === 0) {
        previewInfo = '没有符合条件的谷子';
    } else if (totalPages === 1) {
        previewInfo = `共${totalItems}种谷子，生成1张图`;
    } else {
        if (lastPageItems === itemsPerPage) {
            previewInfo = `共${totalItems}种谷子。将会生成${totalPages}张图，每张包含${itemsPerPage}种谷子`;
        } else {
            previewInfo = `共${totalItems}种谷子。将会生成${totalPages}张图，每张包含${itemsPerPage}种谷子（最后一张${lastPageItems}个）`;
        }
    }
    
    previewInfoElement.innerText = previewInfo;

    // 生成每页的网格
    for (let page = 0; page < totalPages; page++) {
        const pageData = filteredData.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
        previewedGridData.push(pageData);

        const pageGrid = document.createElement('div');
        pageGrid.className = `stock-grid-preview grid-${gridSize}`;
        pageGrid.style.marginBottom = '20px';

        // 生成当前页的每个卡片 - 固定尺寸确保一致性
        pageData.forEach(item => {
            const gridItem = document.createElement('div');
            const isOutOfStock = item.stock <= 0;
            gridItem.className = `export-card-front ${isOutOfStock ? 'out-of-stock' : ''}`;
            
            // 获取谷子图片地址
            const imgSrc = item.imgSrc || defaultImgUrl;
            
            // 创建卡片内容 - 固定尺寸确保一致性
            gridItem.innerHTML = `
                ${item.kunxu !== '不捆' ? `<div class="kunxu-tag">${item.kunxu}</div>` : ''}
                <div class="export-card-image-container">
                    <img src="${imgSrc}" alt="${item.category}" class="export-card-img">
                    <div class="stock-num-overlay">${item.stock}</div>
                </div>
                <div class="export-card-content">
                    <div class="category-name">${item.category}</div>
                    <div class="price-info">单价：¥${item.price.toFixed(2)}</div>
                </div>
            `;
            
            pageGrid.appendChild(gridItem);
        });

        stockPreviewGrid.appendChild(pageGrid);
    }

    // 显示预览容器，启用打印按钮
    previewContainer.classList.add('visible');
    printBtn.disabled = false;
}

// ==================== 打印功能 ====================
function printPreview() {
    const previewContainer = document.getElementById('previewContainer');
    const stockPreviewGrid = document.getElementById('stockPreviewGrid');
    const previewInfoElement = document.getElementById('previewInfo');
    
    // 检查是否有预览内容
    if (!previewContainer || !previewContainer.classList.contains('visible') || !stockPreviewGrid || stockPreviewGrid.children.length === 0) {
        alert('请先确认要打印的规格！');
        return;
    }
    
    // 获取预览标题信息
    const previewInfo = previewInfoElement ? previewInfoElement.textContent : '余量图打印';
    
    // 创建打印专用的HTML
    let printHTML = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>库存余量图 - 打印预览</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: white;
                }
                
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                
                .print-header h1 {
                    font-size: 28px;
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                }
                
                .print-header .info {
                    font-size: 16px;
                    color: #666;
                }
                
                .print-grid-container {
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                }
                
                .print-page {
                    page-break-after: always;
                    padding-bottom: 40px;
                }
                
                .print-page:last-child {
                    page-break-after: auto;
                }
                
                .print-grid {
                    display: grid;
                    gap: 20px;
                    justify-content: center;
                    margin: 0 auto;
                }
                
                .grid-3x3 {
                    grid-template-columns: repeat(3, 280px);
                }
                
                .grid-4x4 {
                    grid-template-columns: repeat(4, 240px);
                }
                
                .grid-5x5 {
                    grid-template-columns: repeat(5, 220px);
                }
                
                .print-card {
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border: 2px solid #333;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    height: 400px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                
                .print-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 4px;
                    background: linear-gradient(90deg, #007bff, #28a745);
                }
                
                .print-card.out-of-stock::before {
                    background: linear-gradient(90deg, #dc3545, #ffc107);
                }
                
                .print-card img {
                    width: 180px;
                    height: 180px;
                    object-fit: cover;
                    border-radius: 8px;
                    margin: 15px auto;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    position: relative;
                }
                
                .print-card .stock-num-overlay {
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                    background-color: rgba(255, 255, 255, 0.85);
                    border-radius: 50%;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    font-weight: 800;
                    color: #28a745;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    border: 2px solid #fff;
                }
                
                .print-card.out-of-stock .stock-num-overlay {
                    color: #dc3545;
                    text-decoration: line-through;
                }
                
                .print-card .category-name {
                    font-weight: 700;
                    font-size: 16px;
                    color: #2c3e50;
                    margin-bottom: 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 90%;
                }
                
                .print-card .price-info {
                    margin-top: 10px;
                    font-size: 22px;
                    color: #007bff;
                    font-weight: 700;
                }
                
                .print-card .kunxu-tag {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    font-size: 12px;
                    padding: 2px 8px;
                    background-color: #007bff;
                    color: white;
                    border-radius: 12px;
                }
                
                .print-footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    
                    body {
                        padding: 0;
                    }
                    
                    .print-page {
                        margin-bottom: 40px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>库存余量图</h1>
                <div class="info">${previewInfo} - 打印时间：${new Date().toLocaleString('zh-CN')}</div>
            </div>
            <div class="print-grid-container">
    `;
    
    // 添加每个网格页面
    const gridPages = stockPreviewGrid.querySelectorAll('.stock-grid-preview');
    gridPages.forEach((page, pageIndex) => {
        printHTML += `<div class="print-page">`;
        
        // 获取网格尺寸类
        const gridClass = Array.from(page.classList).find(cls => cls.startsWith('grid-'));
        const printGridClass = gridClass || 'grid-3x3';
        
        printHTML += `<div class="print-grid ${printGridClass}">`;
        
        // 复制每个网格项目
        const gridItems = page.querySelectorAll('.export-card-front');
        gridItems.forEach(gridItem => {
            // 获取图片URL
            const imgEl = gridItem.querySelector('.export-card-img');
            const imgSrc = imgEl ? imgEl.src : '';
            
            // 获取文本内容
            const kunxuEl = gridItem.querySelector('.kunxu-tag');
            const nameEl = gridItem.querySelector('.category-name');
            const stockNumEl = gridItem.querySelector('.stock-num-overlay');
            const priceEl = gridItem.querySelector('.price-info');
            
            const kunxu = kunxuEl ? kunxuEl.textContent : '';
            const name = nameEl ? nameEl.textContent : '';
            const stockNum = stockNumEl ? stockNumEl.textContent : '';
            const price = priceEl ? priceEl.textContent : '';
            
            // 检查是否为已售罄
            const isOutOfStock = gridItem.classList.contains('out-of-stock');
            
            printHTML += `
                <div class="print-card ${isOutOfStock ? 'out-of-stock' : ''}">
                    ${kunxu ? `<div class="kunxu-tag">${kunxu}</div>` : ''}
                    ${imgSrc ? `<img src="${imgSrc}" alt="${name}"><div class="stock-num-overlay">${stockNum}</div>` : ''}
                    <div class="category-name">${name}</div>
                    <div class="price-info">${price}</div>
                </div>
            `;
        });
        
        printHTML += `</div></div>`;
    });
    
    printHTML += `
            </div>
            <div class="print-footer">
                智能排谷管理系统 - 余量图打印版
            </div>
        </body>
        </html>
    `;
    
    // 打开新窗口并打印
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // 等待内容加载完成后打印
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    }
}

// ==================== 结算统计页面功能 ====================
function renderSummaryPage() {
    if (!currentSearchCN) return;
    
    const summaryContainer = document.getElementById('summary-container');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = '';
    
    // 第一步：收集所有包含搜索关键词的CN名称（去重）
    const searchKeyword = currentSearchCN.toLowerCase();
    const matchedCNs = new Set();
    
    guziData.forEach(item => {
        item.claimers.forEach(claimerName => {
            if (claimerName.toLowerCase().includes(searchKeyword)) {
                matchedCNs.add(claimerName);
            }
        });
    });
    
    // 没有匹配的CN
    if (matchedCNs.size === 0) {
        summaryContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: #666; background: var(--light-bg); border-radius: 8px;">未查询到包含【' + currentSearchCN + '】的认领记录</div>';
        return;
    }
    
    // 第二步：为每个匹配的CN单独生成统计卡片
    Array.from(matchedCNs).forEach(cn => {
        const userClaims = [];
        let totalCost = 0;
        let totalQuantity = 0;
        
        // 统计当前CN的所有认领记录
        guziData.forEach(item => {
            const claimCount = item.claimers.filter(claimerName => claimerName === cn).length;
            if (claimCount > 0) {
                const cost = claimCount * item.price;
                totalCost += cost;
                totalQuantity += claimCount;
                userClaims.push({
                    category: item.category,
                    price: item.price,
                    quantity: claimCount,
                    cost: cost,
                    imgSrc: item.imgSrc || defaultImgUrl
                });
            }
        });
        
        // 生成当前CN的统计卡片
        const summaryCard = document.createElement('div');
        summaryCard.className = 'summary-card';
        summaryCard.innerHTML = `
            <h3>${cn} 的排谷统计</h3>
            <div class="summary-header">
                <div class="img-col">图片</div>
                <div class="category-col">谷子（单价）</div>
                <div class="quantity-col">数量</div>
                <div class="cost-col">金额</div>
            </div>
            ${userClaims.map(item => `
                <div class="summary-item">
                    <div class="img-col">
                        <img src="${item.imgSrc}" alt="${item.category}" onclick="openImgModal('${item.imgSrc}')">
                    </div>
                    <div class="category-col">${item.category}（¥${item.price.toFixed(2)}/个）</div>
                    <div class="quantity-col">${item.quantity} 个</div>
                    <div class="cost-col">¥${item.cost.toFixed(2)}</div>
                </div>
            `).join('')}
            <div class="summary-total">
                <div class="total-label">总计</div>
                <div class="total-values">
                    <div>总谷子个数：${totalQuantity} 个</div>
                    <div>总金额：¥${totalCost.toFixed(2)}</div>
                </div>
            </div>
        `;
        
        // 添加导出按钮（每个CN独立导出）
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn export-btn';
        exportBtn.innerText = `导出${cn}的结算单`;
        exportBtn.style.marginTop = '15px';
        exportBtn.onclick = () => exportUserSummary(cn, userClaims, totalCost, totalQuantity);
        summaryCard.appendChild(exportBtn);
        
        summaryContainer.appendChild(summaryCard);
    });
}

// 图片放大弹窗功能
function openImgModal(imgUrl) {
    const modal = document.getElementById('imgModal');
    const modalImg = document.getElementById('modalImg');
    
    if (!modal || !modalImg) return;
    
    modal.style.display = "flex";
    modalImg.src = imgUrl;
}

function closeImgModal() {
    const modal = document.getElementById('imgModal');
    if (modal) {
        modal.style.display = "none";
    }
}

function searchCN() {
    const cnSearchInput = document.getElementById('cnSearchInput');
    if (cnSearchInput) {
        currentSearchCN = cnSearchInput.value.trim();
        if (!currentSearchCN) {
            alert('请输入要查询的CN！');
            return;
        }
        renderSummaryPage();
    }
}

function resetSearch() {
    const cnSearchInput = document.getElementById('cnSearchInput');
    const summaryContainer = document.getElementById('summary-container');
    
    if (cnSearchInput) {
        cnSearchInput.value = '';
    }
    
    currentSearchCN = '';
    
    if (summaryContainer) {
        summaryContainer.innerHTML = '';
    }
}

function exportUserSummary(cn, claims, totalCost, totalQuantity) {
    // 导出时排除图片列
    const wsData = claims.map(item => [
        item.category,
        item.price.toFixed(2),
        item.quantity,
        item.cost.toFixed(2)
    ]);
    wsData.unshift(['谷子', '单价', '认领数量', '金额']);
    wsData.push(['', '', '总计', '']);
    wsData.push(['', '', `总谷子个数：${totalQuantity} 个`, `总金额：¥${totalCost.toFixed(2)}`]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${cn}结算单`);
    XLSX.writeFile(wb, `${cn}_排谷结算单_${new Date().toLocaleDateString()}.xlsx`);
}