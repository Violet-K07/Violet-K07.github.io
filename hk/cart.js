// ==================== 购物车全局变量 ====================
let guziData = [];
let claimRecords = [];
const defaultImgUrl = "ERROR.PNG";
let cartItems = {}; // 购物车数据 {index: quantity}
let currentCartFilter = 'inStock';
let currentCartSearch = '';
let currentPriceFilter = 'all'; // 新增：价格筛选
let isLoggedIn = false;
let targetAmount = 0; // 目标金额

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
    initCartFilterToggle();
    
    // 初始化返回顶部按钮
    initBackToTopButton();
    
    // 初始化金额筛选
    initPriceFilter();
    
    // 加载购物车数据
    loadCartFromStorage();
    
    // 加载目标金额
    loadTargetAmount();
    
    // 添加滚动监听
    window.addEventListener('scroll', handleScrollForFixedSummary);
    
    // 初始检查
    handleScrollForFixedSummary();
});

// ==================== 滚动处理函数 ====================
function handleScrollForFixedSummary() {
    const fixedSummary = document.getElementById('cartSummaryFixed');
    const mainSummary = document.querySelector('.cart-summary-container');
    
    if (!fixedSummary || !mainSummary) return;
    
    const mainSummaryRect = mainSummary.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 当主汇总容器滚动出视口时显示固定栏
    if (mainSummaryRect.bottom < 0) {
        fixedSummary.classList.add('show');
        document.body.classList.add('fixed-summary-visible');
    } else {
        fixedSummary.classList.remove('show');
        document.body.classList.remove('fixed-summary-visible');
    }
}

// 在 window.resize 时也触发
window.addEventListener('resize', handleScrollForFixedSummary);

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

// ==================== 返回顶部按钮功能 ====================
function initBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    if (!backToTopBtn) return;
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ==================== 购物车筛选三态开关功能 ====================
function initCartFilterToggle() {
    const toggleOptions = document.querySelectorAll('.cart-filter-toggle .toggle-option');
    const toggleSlider = document.getElementById('cartToggleSlider');
    const filterInput = document.getElementById('cartFilterValue');
    
    // 设置初始状态
    let initialPosition = 0; // 默认选择"有库存"（第一个位置）
    if (currentCartFilter === 'all') {
        initialPosition = 1;
    } else if (currentCartFilter === 'outOfStock') {
        initialPosition = 2;
    }
    
    updateCartTogglePosition(initialPosition);
    
    // 为每个选项添加点击事件
    toggleOptions.forEach((option, index) => {
        option.addEventListener('click', function() {
            updateCartTogglePosition(index);
            applyCartFilter();
        });
    });
}

function updateCartTogglePosition(position) {
    const toggleSlider = document.getElementById('cartToggleSlider');
    const toggleOptions = document.querySelectorAll('.cart-filter-toggle .toggle-option');
    const filterInput = document.getElementById('cartFilterValue');
    
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
    
    // 更新筛选值
    if (position === 0) {
        filterInput.value = 'inStock'; // 有库存
    } else if (position === 1) {
        filterInput.value = 'all'; // 全部
    } else {
        filterInput.value = 'outOfStock'; // 售罄
    }
}

function applyCartFilter() {
    const filterValue = document.getElementById('cartFilterValue').value;
    currentCartFilter = filterValue;
    renderCartPage();
}

// ==================== 金额筛选功能 ====================
function initPriceFilter() {
    const priceFilterSelect = document.getElementById('priceFilter');
    const customPriceContainer = document.getElementById('customPriceContainer');
    
    if (priceFilterSelect) {
        priceFilterSelect.value = currentPriceFilter;
        priceFilterSelect.addEventListener('change', function() {
            currentPriceFilter = this.value;
            
            // 显示/隐藏自定义价格区间输入框
            if (this.value === 'custom') {
                customPriceContainer.style.display = 'flex';
            } else {
                customPriceContainer.style.display = 'none';
                renderCartPage();
            }
        });
    }
}

function applyCustomPriceFilter() {
    const minPriceInput = document.getElementById('customPriceMin');
    const maxPriceInput = document.getElementById('customPriceMax');
    
    const minPrice = parseFloat(minPriceInput.value) || 0;
    const maxPrice = parseFloat(maxPriceInput.value) || Infinity;
    
    if (minPrice < 0 || maxPrice < 0) {
        alert('价格不能为负数');
        return;
    }
    
    if (minPrice > maxPrice) {
        alert('最低价格不能大于最高价格');
        return;
    }
    
    currentPriceFilter = 'custom';
    renderCartPage();
}

function applyPriceFilter(item) {
    if (currentPriceFilter === 'all') {
        return true;
    }
    
    const price = item.price;
    
    switch(currentPriceFilter) {
        case '0-100':
            return price >= 0 && price <= 100;
        case '101-500':
            return price > 100 && price <= 500;
        case '501-1000':
            return price > 500 && price <= 1000;
        case '1000+':
            return price > 1000;
        case 'custom':
            const minPrice = parseFloat(document.getElementById('customPriceMin').value) || 0;
            const maxPrice = parseFloat(document.getElementById('customPriceMax').value) || Infinity;
            return price >= minPrice && price <= maxPrice;
        default:
            return true;
    }
}

// ==================== 目标金额功能 ====================
function loadTargetAmount() {
    const savedTargetAmount = localStorage.getItem('cart_target_amount');
    if (savedTargetAmount) {
        targetAmount = parseFloat(savedTargetAmount);
        document.getElementById('targetAmountInput').value = targetAmount;
        updateTargetAmountDisplay();
    }
}

function setTargetAmount() {
    const targetAmountInput = document.getElementById('targetAmountInput');
    const amount = parseFloat(targetAmountInput.value);
    
    if (isNaN(amount) || amount < 0) {
        alert('请输入有效的目标金额（大于等于0）');
        targetAmountInput.focus();
        return;
    }
    
    targetAmount = amount;
    localStorage.setItem('cart_target_amount', targetAmount);
    
    updateTargetAmountDisplay();
    updateCartSummary();
    
    if (targetAmount === 0) {
        showSyncTip('目标金额已清除');
    } else {
        showSyncTip(`目标金额已设置为 ¥${targetAmount.toFixed(2)}`);
    }
}

function updateTargetAmountDisplay() {
    const currentAmountValue = document.getElementById('currentAmountValue');
    const targetAmountDiff = document.getElementById('targetAmountDiff');
    const currentAmount = calculateTotalAmount();
    const autoFillContainer = document.getElementById('autoFillContainer');
    const remainingAmountElement = document.getElementById('remainingAmount');
    
    if (currentAmountValue) {
        currentAmountValue.textContent = `¥${currentAmount.toFixed(2)}`;
    }
    
    if (targetAmountDiff) {
        if (targetAmount === 0) {
            targetAmountDiff.textContent = `目标金额: 未设置`;
            targetAmountDiff.className = 'target-amount-diff neutral';
            
            // 隐藏一键补齐容器
            if (autoFillContainer) {
                autoFillContainer.style.display = 'none';
            }
        } else {
            const diff = currentAmount - targetAmount;
            
            // 显示或隐藏一键补齐容器
            if (autoFillContainer) {
                if (diff < 0) {
                    // 当前金额小于目标金额，显示一键补齐
                    autoFillContainer.style.display = 'block';
                    const remainingAmount = targetAmount - currentAmount;
                    if (remainingAmountElement) {
                        remainingAmountElement.textContent = `¥${remainingAmount.toFixed(2)}`;
                    }
                } else {
                    // 当前金额大于等于目标金额，隐藏一键补齐
                    autoFillContainer.style.display = 'none';
                }
            }
            
            if (diff > 0) {
                targetAmountDiff.textContent = `超支: +¥${diff.toFixed(2)}`;
                targetAmountDiff.className = 'target-amount-diff positive';
            } else if (diff < 0) {
                targetAmountDiff.textContent = `剩余: ¥${Math.abs(diff).toFixed(2)}`;
                targetAmountDiff.className = 'target-amount-diff negative';
            } else {
                targetAmountDiff.textContent = `达成目标!`;
                targetAmountDiff.className = 'target-amount-diff neutral';
            }
        }
    }
}

function calculateTotalAmount() {
    let totalAmount = 0;
    
    Object.keys(cartItems).forEach(index => {
        const itemIndex = parseInt(index);
        const item = guziData[itemIndex];
        const quantity = cartItems[index];
        
        if (item && quantity > 0) {
            totalAmount += quantity * item.price;
        }
    });
    
    return totalAmount;
}

// ==================== 一键补齐功能 ====================
function autoFillCart() {
    const currentAmount = calculateTotalAmount();
    
    // 检查目标金额是否设置
    if (targetAmount === 0) {
        alert('请先设置目标金额');
        document.getElementById('targetAmountInput').focus();
        return;
    }
    
    // 检查当前金额是否小于目标金额
    if (currentAmount >= targetAmount) {
        alert('当前购物车金额已达到或超过目标金额，无需补齐');
        return;
    }
    
    const strategy = document.getElementById('autoFillStrategy').value;
    const remainingAmount = targetAmount - currentAmount;
    
    // 获取可用谷子列表（有库存且不在购物车中或购物车数量未达上限）
    let availableItems = [];
    
    guziData.forEach((item, index) => {
        if (item.stock > 0) {
            // 检查是否满足当前筛选条件
            let isVisible = true;
            const isOutOfStock = item.stock <= 0;
            
            if (currentCartFilter === 'inStock' && isOutOfStock) isVisible = false;
            if (currentCartFilter === 'outOfStock' && !isOutOfStock) isVisible = false;
            if (currentCartSearch && 
                !item.category.toLowerCase().includes(currentCartSearch.toLowerCase()) && 
                !item.kunxu.toLowerCase().includes(currentCartSearch.toLowerCase())) {
                isVisible = false;
            }
            if (!applyPriceFilter(item)) isVisible = false;
            
            if (isVisible) {
                const currentQuantity = cartItems[index] || 0;
                const availableQuantity = item.stock - currentQuantity;
                
                if (availableQuantity > 0) {
                    availableItems.push({
                        index: index,
                        item: item,
                        availableQuantity: availableQuantity,
                        currentQuantity: currentQuantity
                    });
                }
            }
        }
    });
    
    if (availableItems.length === 0) {
        alert('没有可用的谷子可以添加');
        return;
    }
    
    // 根据策略排序
    switch(strategy) {
        case 'points_min':
            // 点数最少优先（按单价升序）
            availableItems.sort((a, b) => a.item.price - b.item.price);
            break;
        case 'points_max':
            // 点数最多优先（按单价降序）
            availableItems.sort((a, b) => b.item.price - a.item.price);
            break;
        case 'price_min':
            // 单价最低优先（按单价升序）
            availableItems.sort((a, b) => a.item.price - b.item.price);
            break;
        case 'price_max':
            // 单价最高优先（按单价降序）
            availableItems.sort((a, b) => b.item.price - a.item.price);
            break;
    }
    
    // 开始补齐
    let addedAmount = 0;
    let addedItems = [];
    
    for (let i = 0; i < availableItems.length && addedAmount < remainingAmount; i++) {
        const { index, item, availableQuantity } = availableItems[i];
        const price = item.price;
        
        // 计算最多可以添加多少个该谷子
        const maxCanAdd = Math.min(
            availableQuantity,
            Math.ceil((remainingAmount - addedAmount) / price)
        );
        
        if (maxCanAdd > 0) {
            // 添加到购物车
            const currentQuantity = cartItems[index] || 0;
            cartItems[index] = currentQuantity + maxCanAdd;
            addedAmount += maxCanAdd * price;
            addedItems.push({
                name: item.category,
                quantity: maxCanAdd,
                amount: maxCanAdd * price
            });
        }
    }
    
    // 保存到本地存储
    saveCartToStorage();
    
    // 更新界面
    updateCartSummary();
    renderCartPage();
    
    // 显示结果
    if (addedItems.length > 0) {
        let message = `已成功添加 ${addedItems.length} 种谷子，增加金额 ¥${addedAmount.toFixed(2)}:\n\n`;
        addedItems.forEach(item => {
            message += `• ${item.name} ×${item.quantity} (¥${item.amount.toFixed(2)})\n`;
        });
        
        if (addedAmount < remainingAmount) {
            message += `\n注意：由于库存限制，仅补齐了 ¥${addedAmount.toFixed(2)}，还需 ¥${(remainingAmount - addedAmount).toFixed(2)}`;
        } else {
            message += `\n✅ 已成功达到目标金额！`;
        }
        
        alert(message);
        showSyncTip('一键补齐完成');
    } else {
        alert('无法添加任何谷子，请检查筛选条件或谷子库存');
    }
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
    cartItems = {};
    
    // 清空页面显示
    document.getElementById('cartStockContainer').innerHTML = '';
    updateCartSummary();
    
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
        
        renderCartPage();
        
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
    // 购物车搜索框支持回车搜索
    const cartSearchInput = document.getElementById('cartSearchInput');
    if (cartSearchInput) {
        cartSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCartItems();
        });
    }
    
    // 登录框输入框支持回车提交
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') submitToken();
        });
    }
    
    // 目标金额输入框支持回车设置
    const targetAmountInput = document.getElementById('targetAmountInput');
    if (targetAmountInput) {
        targetAmountInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') setTargetAmount();
        });
    }
    
    // 自定义价格区间输入框支持回车筛选
    const customPriceInputs = document.querySelectorAll('.custom-price-input');
    customPriceInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') applyCustomPriceFilter();
        });
    });
    
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
    
    // 粘贴模态框点击外部关闭
    const pasteModal = document.getElementById('pasteModal');
    if (pasteModal) {
        pasteModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePasteModal();
            }
        });
    }
    
    // CN输入框支持回车确认认领
    const cartCNInput = document.getElementById('cartCNInput');
    if (cartCNInput) {
        cartCNInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') checkoutCart();
        });
    }
}

// ==================== 购物车数据存储 ====================
function saveCartToStorage() {
    localStorage.setItem('guzi_cart', JSON.stringify(cartItems));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('guzi_cart');
    if (savedCart) {
        try {
            cartItems = JSON.parse(savedCart);
            updateCartSummary();
        } catch (e) {
            console.error('加载购物车数据失败:', e);
            cartItems = {};
        }
    }
}

function clearCart() {
    if (Object.keys(cartItems).length === 0) {
        showSyncTip('购物车已经是空的');
        return;
    }
    
    if (!confirm('确定要清空购物车吗？这将移除所有已选择的谷子。')) {
        return;
    }
    
    cartItems = {};
    saveCartToStorage();
    updateCartSummary();
    renderCartPage();
    showSyncTip('购物车已清空');
}

// ==================== 购物车功能 ====================
function addToCart(index, quantity = 1) {
    const item = guziData[index];
    
    if (!item || item.stock <= 0) {
        alert('该谷子已售罄，无法加入购物车');
        return;
    }
    
    const currentQuantity = cartItems[index] || 0;
    const newQuantity = currentQuantity + quantity;
    
    // 检查库存是否足够
    if (newQuantity > item.stock) {
        alert(`库存不足！该谷子仅剩 ${item.stock} 点，无法添加 ${quantity} 点`);
        return;
    }
    
    // 更新购物车
    if (newQuantity <= 0) {
        delete cartItems[index];
    } else {
        cartItems[index] = newQuantity;
    }
    
    // 保存到本地存储
    saveCartToStorage();
    
    // 更新界面
    updateCartSummary();
    updateCartCardQuantity(index);
    
    showSyncTip('已添加到购物车');
}

function removeFromCart(index, quantity = 1) {
    if (!cartItems[index]) return;
    
    const currentQuantity = cartItems[index];
    const newQuantity = currentQuantity - quantity;
    
    // 更新购物车
    if (newQuantity <= 0) {
        delete cartItems[index];
    } else {
        cartItems[index] = newQuantity;
    }
    
    // 保存到本地存储
    saveCartToStorage();
    
    // 更新界面
    updateCartSummary();
    updateCartCardQuantity(index);
    
    showSyncTip('已从购物车移除');
}

function setCartQuantity(index, quantity) {
    const item = guziData[index];
    
    if (!item) return;
    
    // 检查库存是否足够
    if (quantity > item.stock) {
        alert(`库存不足！该谷子仅剩 ${item.stock} 点`);
        quantity = item.stock;
    }
    
    // 更新购物车
    if (quantity <= 0) {
        delete cartItems[index];
    } else {
        cartItems[index] = quantity;
    }
    
    // 保存到本地存储
    saveCartToStorage();
    
    // 更新界面
    updateCartSummary();
    updateCartCardQuantity(index);
    
    // 更新详情中的数量显示
    updateCartDetailsQuantity(index, quantity);
}

function updateCartCardQuantity(index) {
    const card = document.querySelector(`.cart-card[data-index="${index}"]`);
    if (!card) return;
    
    const quantityInput = card.querySelector('.quantity-input');
    const quantity = cartItems[index] || 0;
    
    if (quantityInput) {
        quantityInput.value = quantity;
    }
    
    // 更新按钮状态
    const minusBtn = card.querySelector('.quantity-btn.minus-btn');
    if (minusBtn) {
        minusBtn.disabled = quantity <= 0;
    }
    
    const plusBtn = card.querySelector('.quantity-btn.plus-btn');
    if (plusBtn) {
        plusBtn.disabled = quantity >= guziData[index].stock;
    }
}

function updateCartDetailsQuantity(index, quantity) {
    const detailItems = document.querySelectorAll('.cart-detail-item');
    detailItems.forEach(detailItem => {
        const quantityInput = detailItem.querySelector('.cart-detail-quantity-input');
        if (quantityInput && detailItem.querySelector(`[data-index="${index}"]`)) {
            quantityInput.value = quantity || 0;
        }
    });
}

// ==================== 购物车页面渲染 ====================
function renderCartPage() {
    const cartStockContainer = document.getElementById('cartStockContainer');
    
    if (!cartStockContainer || !guziData.length) return;
    
    // 先隐藏所有卡片
    const allCards = cartStockContainer.querySelectorAll('.cart-card');
    allCards.forEach(card => {
        card.classList.remove('visible');
        card.classList.add('hiding');
    });
    
    // 延迟一小段时间后重新渲染，确保动画效果
    setTimeout(() => {
        // 清空容器
        cartStockContainer.innerHTML = '';
        
        // 筛选并排序可见的卡片
        const visibleCards = [];
        
        guziData.forEach((item, index) => {
            const isOutOfStock = item.stock <= 0;
            let isVisible = true;
            
            // 筛选逻辑
            if (currentCartFilter === 'inStock' && isOutOfStock) isVisible = false;
            if (currentCartFilter === 'outOfStock' && !isOutOfStock) isVisible = false;
            if (currentCartSearch && 
                !item.category.toLowerCase().includes(currentCartSearch.toLowerCase()) && 
                !item.kunxu.toLowerCase().includes(currentCartSearch.toLowerCase())) {
                isVisible = false;
            }
            
            // 价格筛选
            if (!applyPriceFilter(item)) isVisible = false;
            
            if (isVisible) {
                visibleCards.push({ item, index, isOutOfStock });
            }
        });
        
        // 渲染可见卡片
        visibleCards.forEach(({ item, index, isOutOfStock }) => {
            const card = document.createElement('div');
            card.className = `cart-card ${isOutOfStock ? 'out-of-stock' : ''}`;
            card.dataset.index = index;
            
            // 获取谷子图片地址
            const imgSrc = item.imgSrc || defaultImgUrl;
            const cartQuantity = cartItems[index] || 0;
            
            // 构建卡片内容
            const cartQuantityControls = isOutOfStock ? '' : `
                <div class="cart-quantity-controls">
                    <button class="quantity-btn minus-btn" onclick="removeFromCart(${index}, 1); event.stopPropagation();" ${cartQuantity <= 0 ? 'disabled' : ''}>-</button>
                    <input type="number" class="quantity-input" value="${cartQuantity}" min="0" max="${item.stock}" 
                           onchange="setCartQuantity(${index}, parseInt(this.value)); event.stopPropagation();"
                           onclick="event.stopPropagation();">
                    <button class="quantity-btn plus-btn" onclick="addToCart(${index}, 1); event.stopPropagation();" ${cartQuantity >= item.stock ? 'disabled' : ''}>+</button>
                </div>
            `;
            
            // 构建完整卡片 - 修复背面布局问题
            card.innerHTML = `
                <div class="cart-card-inner">
                    <div class="cart-card-front">
                        ${item.kunxu !== '不捆' ? `<div class="kunxu-tag">${item.kunxu}</div>` : ''}
                        <div class="cart-card-img-container">
                            <img src="${imgSrc}" alt="${item.category}" class="cart-card-img"
                                 onerror="this.src='${defaultImgUrl}'; this.onerror=null;" 
                                 onclick="openImgModal(this.src); event.stopPropagation();">
                        </div>
                        <div class="cart-card-content">
                            <div class="cart-card-name">${item.category}</div>
                            <div class="cart-card-info">
                                <div class="cart-card-price-stock">
                                    <div class="cart-card-price">
                                        <div class="cart-card-price-value">¥${item.price.toFixed(2)}</div>
                                        <div class="cart-card-price-label">单价</div>
                                    </div>
                                    <div class="cart-card-stock">
                                        <div class="cart-card-stock-value">${item.stock}</div>
                                        <div class="cart-card-stock-label">库存</div>
                                    </div>
                                </div>
                            </div>
                            ${cartQuantityControls}
                        </div>
                    </div>
                    <div class="cart-card-back">
                        <button class="cart-card-close-btn" onclick="flipCartCard(${index}); event.stopPropagation();">×</button>
                        ${isOutOfStock ? renderOutOfStockBack(item) : renderInStockBack(item, index, cartQuantity)}
                    </div>
                </div>
            `;
            
            cartStockContainer.appendChild(card);
            
            // 延迟显示以触发动画
            setTimeout(() => {
                card.classList.add('visible');
                card.classList.remove('hiding');
            }, 10);
            
            // 为卡片添加点击事件以触发翻转
            card.addEventListener('click', function(e) {
                // 检查点击的不是特定元素（按钮、输入框、图片等）
                if (!e.target.closest('.cart-card-close-btn') && 
                    !e.target.closest('.cart-claim-title-btn') &&
                    !e.target.closest('.quantity-btn') &&
                    !e.target.closest('.quantity-input') &&
                    !e.target.closest('.cart-card-img')) {
                    // 翻转卡片
                    card.classList.toggle('flipped');
                }
            });
        });
    }, 50); // 50ms延迟确保动画效果
}

// 渲染已售罄卡片背面
function renderOutOfStockBack(item) {
    // 已售罄卡片：展示认领人列表
    const claimersMap = {};
    item.claimers.forEach(claimerName => {
        claimersMap[claimerName] = (claimersMap[claimerName] || 0) + 1;
    });
    const claimersList = Object.entries(claimersMap).map(([claimerName, count]) => 
        `<div class="cart-claimers-item">${claimerName}：${count}点</div>`
    ).join('');
    
    return `
        <div class="cart-out-of-stock-back">
            <div class="out-of-stock-title">${item.category} 认领详情</div>
            <div class="cart-claimers-list">
                <h4>认领人列表（共${item.claimers.length}点）</h4>
                ${claimersList || '<div class="cart-claimers-item">暂无认领记录</div>'}
            </div>
            <div class="cart-claimers-stat">
                总认领数量：${item.claimers.length} 点
            </div>
        </div>
    `;
}

// 渲染有库存卡片背面
function renderInStockBack(item, index, cartQuantity) {
    return `
        <div class="cart-in-stock-back">
            <button class="cart-claim-title-btn" onclick="showClaimDetails(${index}); event.stopPropagation();">
                ${item.category} 认领详情
            </button>
            <div class="cart-back-quantity-controls">
                <button class="quantity-btn minus-btn" onclick="removeFromCart(${index}, 1); event.stopPropagation();" ${cartQuantity <= 0 ? 'disabled' : ''}>-</button>
                <input type="number" class="quantity-input" value="${cartQuantity}" min="0" max="${item.stock}" 
                       onchange="setCartQuantity(${index}, parseInt(this.value)); event.stopPropagation();"
                       onclick="event.stopPropagation();">
                <button class="quantity-btn plus-btn" onclick="addToCart(${index}, 1); event.stopPropagation();" ${cartQuantity >= item.stock ? 'disabled' : ''}>+</button>
            </div>
            <div class="cart-back-stock-info">
                剩余可认领：${item.stock} 点
            </div>
        </div>
    `;
}

function flipCartCard(index) {
    const card = document.querySelector(`.cart-card[data-index="${index}"]`);
    if (card) {
        card.classList.remove('flipped');
    }
}

// ==================== 购物车汇总更新 ====================
function updateCartSummary() {
    let totalPoints = 0;
    let totalAmount = 0;
    let itemCount = 0;
    
    // 计算购物车汇总
    Object.keys(cartItems).forEach(index => {
        const itemIndex = parseInt(index);
        const item = guziData[itemIndex];
        const quantity = cartItems[index];
        
        if (item && quantity > 0) {
            totalPoints += quantity;
            totalAmount += quantity * item.price;
            itemCount++;
        }
    });
    
    // 更新常规统计显示
    document.getElementById('cartTotalPoints').textContent = totalPoints;
    document.getElementById('cartTotalAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    document.getElementById('cartItemCount').textContent = itemCount;
    
    // 计算金额差
    const amountDiff = targetAmount > 0 ? totalAmount - targetAmount : 0;
    const amountDiffElement = document.getElementById('cartAmountDiff');
    const amountDiffFixedElement = document.getElementById('cartFixedAmountDiff');
    
    if (targetAmount === 0) {
        // 目标金额为0，不显示差值或显示为0
        amountDiffElement.textContent = `¥0.00`;
        amountDiffElement.style.color = 'var(--text-color)';
        amountDiffFixedElement.textContent = `¥0.00`;
        amountDiffFixedElement.style.color = 'var(--text-color)';
    } else {
        // 目标金额大于0，显示差值
        if (amountDiff > 0) {
            amountDiffElement.textContent = `+¥${amountDiff.toFixed(2)}`;
            amountDiffElement.style.color = 'var(--danger-color)';
            amountDiffFixedElement.textContent = `+¥${amountDiff.toFixed(2)}`;
            amountDiffFixedElement.style.color = 'var(--danger-color)';
        } else if (amountDiff < 0) {
            amountDiffElement.textContent = `¥${amountDiff.toFixed(2)}`;
            amountDiffElement.style.color = 'var(--success-color)';
            amountDiffFixedElement.textContent = `¥${amountDiff.toFixed(2)}`;
            amountDiffFixedElement.style.color = 'var(--success-color)';
        } else {
            amountDiffElement.textContent = `¥${amountDiff.toFixed(2)}`;
            amountDiffElement.style.color = 'var(--primary-color)';
            amountDiffFixedElement.textContent = `¥${amountDiff.toFixed(2)}`;
            amountDiffFixedElement.style.color = 'var(--primary-color)';
        }
    }
    
    // 更新固定顶部栏统计
    document.getElementById('cartFixedTotalPoints').textContent = totalPoints;
    document.getElementById('cartFixedTotalAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    document.getElementById('cartFixedItemCount').textContent = itemCount;
    
    // 更新摘要文本
    const summaryText = document.getElementById('cartSummaryText');
    if (itemCount === 0) {
        summaryText.textContent = '购物车为空';
        summaryText.style.color = 'var(--text-secondary)';
        summaryText.style.fontStyle = 'italic';
    } else {
        // 生成格式：【谷子名*点数、谷子名*点数】
        let summaryParts = [];
        Object.keys(cartItems).forEach(index => {
            const itemIndex = parseInt(index);
            const item = guziData[itemIndex];
            const quantity = cartItems[index];
            
            if (item && quantity > 0) {
                summaryParts.push(`${item.category}*${quantity}`);
            }
        });
        
        const summary = `【${summaryParts.join('、')}】`;
        summaryText.textContent = summary;
        summaryText.style.color = 'var(--text-color)';
        summaryText.style.fontStyle = 'normal';
    }
    
    // 更新目标金额显示
    updateTargetAmountDisplay();
    
    // 更新购物车详情
    updateCartDetails();
}

function updateCartDetails() {
    const cartDetailContent = document.getElementById('cartDetailContent');
    if (!cartDetailContent) return;
    
    cartDetailContent.innerHTML = '';
    
    // 如果没有商品
    if (Object.keys(cartItems).length === 0) {
        cartDetailContent.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">购物车为空</div>';
        return;
    }
    
    // 生成详情列表
    let totalPoints = 0;
    let totalAmount = 0;
    
    Object.keys(cartItems).forEach(index => {
        const itemIndex = parseInt(index);
        const item = guziData[itemIndex];
        const quantity = cartItems[index];
        
        if (item && quantity > 0) {
            const itemAmount = quantity * item.price;
            totalPoints += quantity;
            totalAmount += itemAmount;
            
            const detailItem = document.createElement('div');
            detailItem.className = 'cart-detail-item';
            detailItem.dataset.index = itemIndex;
            
            // 获取谷子图片地址
            const imgSrc = item.imgSrc || defaultImgUrl;
            
            detailItem.innerHTML = `
                <div class="cart-detail-img-container" onclick="openImgModal('${imgSrc}'); event.stopPropagation();">
                    <img src="${imgSrc}" alt="${item.category}" class="cart-detail-img" 
                         onerror="this.src='${defaultImgUrl}'; this.onerror=null;">
                </div>
                <div class="cart-detail-info">
                    <div class="cart-detail-name">${item.category}</div>
                    <div class="cart-detail-price">单价：<strong>¥${item.price.toFixed(2)}</strong>/点</div>
                </div>
                <div class="cart-detail-controls">
                    <div class="cart-detail-quantity-controls">
                        <button class="cart-detail-quantity-btn minus-btn" onclick="removeFromCart(${itemIndex}, 1); event.stopPropagation();">-</button>
                        <input type="number" class="cart-detail-quantity-input" value="${quantity}" min="0" max="${item.stock}" 
                               onchange="setCartQuantity(${itemIndex}, parseInt(this.value)); event.stopPropagation();">
                        <button class="cart-detail-quantity-btn plus-btn" onclick="addToCart(${itemIndex}, 1); event.stopPropagation();">+</button>
                    </div>
                    <div class="cart-detail-total">小计：¥${itemAmount.toFixed(2)}</div>
                </div>
            `;
            
            cartDetailContent.appendChild(detailItem);
        }
    });
    
    // 添加总计行 - 总金额和总点数在同一行
    const totalItem = document.createElement('div');
    totalItem.className = 'cart-detail-total-item';
    
    // 计算与目标金额的差值
    let diffText = '';
    if (targetAmount > 0) {
        const diffAmount = totalAmount - targetAmount;
        if (diffAmount > 0) {
            diffText = `<span style="font-size: 12px; opacity: 0.9;">(超支: +¥${diffAmount.toFixed(2)})</span>`;
        } else if (diffAmount < 0) {
            diffText = `<span style="font-size: 12px; opacity: 0.9;">(剩余: ¥${Math.abs(diffAmount).toFixed(2)})</span>`;
        } else {
            diffText = `<span style="font-size: 12px; opacity: 0.9;">(达成目标!)</span>`;
        }
    }
    
    totalItem.innerHTML = `
        <div class="cart-detail-total-label">
            <span>总计 ${diffText}</span>
            <span class="cart-detail-total-points">共 ${totalPoints} 点</span>
        </div>
        <div class="cart-detail-total-amount">¥${totalAmount.toFixed(2)}</div>
    `;
    
    cartDetailContent.appendChild(totalItem);
}

function toggleCartDetails() {
    const toggleBtn = document.getElementById('cartDetailToggle');
    const detailContainer = document.getElementById('cartDetailContainer');
    const toggleArrow = toggleBtn.querySelector('.toggle-arrow');
    
    if (!toggleBtn || !detailContainer) return;
    
    const isExpanded = toggleBtn.classList.contains('collapsed');
    
    if (isExpanded) {
        // 收起详情
        detailContainer.classList.remove('expanded');
        toggleBtn.classList.remove('collapsed');
        toggleArrow.textContent = '▼';
    } else {
        // 展开详情
        detailContainer.classList.add('expanded');
        toggleBtn.classList.add('collapsed');
        toggleArrow.textContent = '▲';
    }
}

// ==================== 购物车摘要复制和粘贴 ====================
function copyCartSummary() {
    const summaryText = document.getElementById('cartSummaryText');
    const text = summaryText.textContent;
    
    if (text === '购物车为空') {
        showSyncTip('购物车为空，无法复制');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showSyncTip('购物车摘要已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showSyncTip('购物车摘要已复制到剪贴板');
        } catch (e) {
            alert('复制失败，请手动复制：' + text);
        }
        document.body.removeChild(textArea);
    });
}

function openPasteModal() {
    document.getElementById('pasteModal').style.display = 'flex';
    document.getElementById('pasteCNInput').value = '';
    document.getElementById('pasteInput').value = '';
    document.getElementById('pasteInput').focus();
}

function closePasteModal() {
    document.getElementById('pasteModal').style.display = 'none';
}

function parsePastedSummary() {
    const pasteInput = document.getElementById('pasteInput');
    const pasteCNInput = document.getElementById('pasteCNInput');
    const text = pasteInput.value.trim();
    
    if (!text) {
        alert('请输入购物车摘要');
        pasteInput.focus();
        return;
    }
    
    // 如果填写了CN，则自动填充到认领人CN输入框
    const cn = pasteCNInput.value.trim();
    if (cn) {
        document.getElementById('cartCNInput').value = cn;
    }
    
    // 解析摘要文本，格式如：【谷子A*2、谷子B*1】
    let matches = [];
    
    // 尝试多种格式
    if (text.startsWith('【') && text.endsWith('】')) {
        // 格式1: 【谷子A*2、谷子B*1】
        const content = text.substring(1, text.length - 1);
        matches = content.split('、').map(item => item.trim());
    } else if (text.includes('*')) {
        // 格式2: 谷子A*2、谷子B*1
        matches = text.split('、').map(item => item.trim());
    } else {
        // 尝试按换行符分割
        matches = text.split('\n').map(item => item.trim()).filter(item => item);
    }
    
    // 解析每个项目
    let parsedItems = {};
    let hasError = false;
    let errorMsg = '';
    
    for (let match of matches) {
        if (!match) continue;
        
        // 处理多种可能的格式
        let itemName, quantity;
        
        if (match.includes('*')) {
            // 格式: 谷子名*点数
            const parts = match.split('*');
            if (parts.length !== 2) {
                errorMsg = `项目格式错误: "${match}"，应为"谷子名*点数"`;
                hasError = true;
                break;
            }
            itemName = parts[0].trim();
            quantity = parseInt(parts[1].trim());
        } else if (match.includes('×')) {
            // 格式: 谷子名 × 点数
            const parts = match.split('×');
            if (parts.length !== 2) {
                errorMsg = `项目格式错误: "${match}"，应为"谷子名 × 点数"`;
                hasError = true;
                break;
            }
            itemName = parts[0].trim();
            quantity = parseInt(parts[1].trim());
        } else if (match.includes('】')) {
            // 格式: 【谷子名】点数
            const nameMatch = match.match(/【(.*?)】/);
            if (!nameMatch) {
                errorMsg = `项目格式错误: "${match}"`;
                hasError = true;
                break;
            }
            itemName = nameMatch[1];
            const quantityMatch = match.match(/】(\d+)/);
            quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
        } else {
            // 尝试提取数字
            const quantityMatch = match.match(/\d+/);
            if (quantityMatch) {
                itemName = match.replace(quantityMatch[0], '').trim();
                quantity = parseInt(quantityMatch[0]);
            } else {
                itemName = match;
                quantity = 1;
            }
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            errorMsg = `数量错误: "${match}"，数量必须是正整数`;
            hasError = true;
            break;
        }
        
        // 查找谷子
        const itemIndex = guziData.findIndex(item => item.category === itemName);
        if (itemIndex === -1) {
            // 尝试模糊匹配
            const similarItems = guziData.filter(item => 
                item.category.includes(itemName) || itemName.includes(item.category)
            );
            if (similarItems.length === 1) {
                const foundIndex = guziData.findIndex(item => item.category === similarItems[0].category);
                itemName = similarItems[0].category;
                parsedItems[foundIndex] = quantity;
            } else {
                errorMsg = `找不到谷子: "${itemName}"`;
                hasError = true;
                break;
            }
        } else {
            parsedItems[itemIndex] = quantity;
        }
    }
    
    if (hasError) {
        alert(errorMsg);
        pasteInput.focus();
        return;
    }
    
    // 清空当前购物车
    cartItems = {};
    
    // 添加解析的项
    Object.keys(parsedItems).forEach(index => {
        const itemIndex = parseInt(index);
        const quantity = parsedItems[index];
        
        // 检查库存是否足够
        const item = guziData[itemIndex];
        if (item.stock >= quantity) {
            cartItems[itemIndex] = quantity;
        } else {
            alert(`"${item.category}" 库存不足！仅剩 ${item.stock} 点，无法添加 ${quantity} 点`);
        }
    });
    
    // 保存到本地存储
    saveCartToStorage();
    
    // 更新界面
    updateCartSummary();
    renderCartPage();
    
    closePasteModal();
    showSyncTip('购物车摘要已导入');
}

// ==================== 搜索功能 ====================
function searchCartItems() {
    const cartSearchInput = document.getElementById('cartSearchInput');
    if (cartSearchInput) {
        currentCartSearch = cartSearchInput.value.trim();
        renderCartPage();
    }
}

function resetCartSearch() {
    const cartSearchInput = document.getElementById('cartSearchInput');
    const priceFilter = document.getElementById('priceFilter');
    const customPriceContainer = document.getElementById('customPriceContainer');
    const customPriceMin = document.getElementById('customPriceMin');
    const customPriceMax = document.getElementById('customPriceMax');
    
    if (cartSearchInput) {
        cartSearchInput.value = '';
        currentCartSearch = '';
    }
    
    if (priceFilter) {
        priceFilter.value = 'all';
        currentPriceFilter = 'all';
        customPriceContainer.style.display = 'none';
    }
    
    if (customPriceMin) customPriceMin.value = '';
    if (customPriceMax) customPriceMax.value = '';
    
    renderCartPage();
}

// ==================== 购物车确认认领功能 ====================
async function checkoutCart() {
    // 这里需要实现购物车批量认领的逻辑
    // 由于这部分逻辑依赖于具体的后端API，这里只提供框架
    const cnInput = document.getElementById('cartCNInput');
    const cn = cnInput.value.trim();
    
    if (!cn) {
        alert('请输入认领人CN');
        cnInput.focus();
        return;
    }
    
    if (Object.keys(cartItems).length === 0) {
        alert('购物车为空，请先添加谷子到购物车');
        return;
    }
    
    // 检查库存是否足够
    let stockCheckPassed = true;
    let stockErrorMessage = '';
    
    Object.keys(cartItems).forEach(index => {
        const itemIndex = parseInt(index);
        const item = guziData[itemIndex];
        const quantity = cartItems[index];
        
        if (item && quantity > 0 && quantity > item.stock) {
            stockCheckPassed = false;
            stockErrorMessage = `"${item.category}" 库存不足！仅剩 ${item.stock} 点，但购物车中有 ${quantity} 点`;
        }
    });
    
    if (!stockCheckPassed) {
        alert(stockErrorMessage);
        return;
    }
    
    // 确认认领
    if (!confirm(`确认以 "${cn}" 的CN认领购物车中的所有谷子吗？\n\n总点数: ${document.getElementById('cartTotalPoints').textContent}\n总金额: ${document.getElementById('cartTotalAmount').textContent}`)) {
        return;
    }
    
    // 这里应该调用API进行批量认领
    // 由于缺少具体的API，这里只显示提示
    showSyncTip('购物车认领功能暂未实现，请等待后续更新');
    
    // 以下是示例代码，实际使用时需要根据您的API进行修改
    /*
    try {
        const response = await fetch('/api/cart/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cn: cn,
                items: cartItems
            })
        });
        
        if (response.ok) {
            showSyncTip('认领成功！');
            // 清空购物车
            cartItems = {};
            saveCartToStorage();
            updateCartSummary();
            renderCartPage();
        } else {
            alert('认领失败，请重试');
        }
    } catch (error) {
        console.error('认领失败:', error);
        alert('认领失败，请检查网络连接');
    }
    */
}

// ==================== 共享功能（从原script.js复制） ====================
function showSyncTip(message = '数据已同步到云端！') {
    const tip = document.getElementById('syncTip');
    if (!tip) return;
    
    tip.textContent = message;
    tip.style.display = "block";
    setTimeout(() => {
        tip.style.display = "none";
    }, 3000);
}

// 图片放大弹窗功能
function openImgModal(imgUrl) {
    const modal = document.getElementById('imgModal');
    const modalImg = document.getElementById('modalImg');
    
    if (!modal || !modalImg) return;
    
    modalImg.onerror = function() {
        console.warn('放大图片加载失败，使用默认图片:', imgUrl);
        this.src = defaultImgUrl;
        this.onerror = null;
    };
    
    modal.style.display = "flex";
    modalImg.src = imgUrl;
}

function closeImgModal() {
    const modal = document.getElementById('imgModal');
    if (modal) {
        modal.style.display = "none";
    }
}

// 认领详情模态框功能
function showClaimDetails(index) {
    if (event) event.stopPropagation();
    
    const item = guziData[index];
    
    // 更新模态框标题
    const modalTitle = document.getElementById('claimsModalTitle');
    if (modalTitle) {
        modalTitle.textContent = `${item.category} 认领详情`;
    }
    
    // 计算统计信息
    const totalStock = item.stock + item.claimers.length;
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
        if (claimsTableBody) {
            claimsTableBody.innerHTML = '';
            
            Object.entries(claimersMap).forEach(([claimerName, count]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${claimerName}</td>
                    <td>${count} 点</td>
                `;
                claimsTableBody.appendChild(row);
            });
            
            claimsTableBody.style.display = 'table-row-group';
        }
        
        if (noClaimsMessage) {
            noClaimsMessage.style.display = 'none';
        }
    } else {
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

function closeClaimsModal() {
    const claimsModal = document.getElementById('claimsModal');
    if (claimsModal) {
        claimsModal.style.display = 'none';
    }
}