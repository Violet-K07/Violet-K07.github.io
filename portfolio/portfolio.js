// 作品集页面专用脚本

document.addEventListener('DOMContentLoaded', function() {
    // 初始化复制链接功能
    initCopyLinks();
    
    // 初始化模态框
    initModals();
    
    // 添加平滑滚动
    initSmoothScroll();
    
    // 添加向下滚动功能
    initScrollIndicator();
    
    // 添加技能条动画
    initSkillBars();
    
    // 初始化视频播放功能
    initVideoPlayers();
    
    // 初始化回到顶部按钮
    initBackToTop();
});

// 初始化复制链接功能
function initCopyLinks() {
    const copyButtons = document.querySelectorAll('.copy-link');
    const copyTextButtons = document.querySelectorAll('.copy-text');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            if (url) {
                copyToClipboard(url);
                showNotification('链接已复制到剪贴板！');
            }
        });
    });
    
    copyTextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const text = this.getAttribute('data-text');
            if (text) {
                copyToClipboard(text);
                showNotification('文本已复制到剪贴板！');
            }
        });
    });
}

// 复制到剪贴板
function copyToClipboard(text) {
    // 创建临时textarea元素
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    // 选择并复制文本
    textarea.select();
    textarea.setSelectionRange(0, 99999); // 移动设备支持
    
    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('复制失败');
        }
    } catch (err) {
        console.error('复制失败:', err);
        // 尝试使用新的 Clipboard API
        navigator.clipboard.writeText(text).catch(function(err) {
            console.error('Clipboard API 复制失败:', err);
        });
    }
    
    // 清理
    document.body.removeChild(textarea);
}

// 显示通知
function showNotification(message) {
    const notification = document.getElementById('copy-notification');
    if (notification) {
        notification.textContent = message;
        notification.style.display = 'block';
        
        // 3秒后隐藏
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// 初始化模态框
function initModals() {
    const documentaryModal = document.getElementById('documentary-modal');
    const closeDocumentaryModal = document.getElementById('close-documentary-modal');
    const universityModal = document.getElementById('university-modal');
    const closeUniversityModal = document.getElementById('close-university-modal');
    
    // 点击模态框外部关闭
    if (documentaryModal) {
        documentaryModal.addEventListener('click', function(e) {
            if (e.target === documentaryModal) {
                closeDocumentaryModalFunc();
            }
        });
    }
    
    // 点击关闭按钮
    if (closeDocumentaryModal) {
        closeDocumentaryModal.addEventListener('click', closeDocumentaryModalFunc);
    }
    
    // 点击模态框外部关闭 - 大学视频
    if (universityModal) {
        universityModal.addEventListener('click', function(e) {
            if (e.target === universityModal) {
                closeUniversityModalFunc();
            }
        });
    }
    
    // 点击关闭按钮 - 大学视频
    if (closeUniversityModal) {
        closeUniversityModal.addEventListener('click', closeUniversityModalFunc);
    }
}

// 显示纪录片信息模态框
function showDocumentaryInfo() {
    const modal = document.getElementById('documentary-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 关闭纪录片信息模态框
function closeDocumentaryModalFunc() {
    const modal = document.getElementById('documentary-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 显示我和我的大学视频信息模态框
function showUniversityVideoInfo() {
    const modal = document.getElementById('university-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 关闭我和我的大学视频信息模态框
function closeUniversityModalFunc() {
    const modal = document.getElementById('university-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 初始化向下滚动指示器
function initScrollIndicator() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function() {
            const targetId = this.getAttribute('data-scroll-target') || 'video-editing';
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    }
}

// 初始化平滑滚动
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 初始化技能条动画增强版
function initSkillBars() {
    // 获取所有技能条
    const skillBars = document.querySelectorAll('.skill-bar');
    
    // 创建Intersection Observer来检测技能条是否进入视图
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 技能条进入视图，触发动画
                const skillBar = entry.target;
                const skillLevel = skillBar.querySelector('.skill-level');
                
                if (skillLevel) {
                    const targetWidth = skillLevel.style.width;
                    
                    // 重置状态
                    skillBar.style.opacity = '0.8';
                    skillBar.style.transform = 'scaleY(0.8)';
                    skillLevel.style.width = '0%';
                    skillLevel.style.opacity = '0';
                    skillLevel.style.transform = 'scaleX(0)';
                    
                    // 添加进入动画类
                    skillBar.classList.add('skill-bar-animate-in');
                    
                    // 延迟后开始动画
                    setTimeout(() => {
                        skillBar.style.opacity = '1';
                        skillBar.style.transform = 'scaleY(1)';
                        skillLevel.style.width = targetWidth;
                        skillLevel.style.opacity = '1';
                        skillLevel.classList.add('animated');
                        
                        // 添加波纹效果
                        skillLevel.style.transform = 'scaleX(1)';
                        
                        // 触发背景条动画
                        skillBar.style.animation = 'skillBarPulse 2s ease-in-out';
                        
                        // 动画完成后的效果
                        setTimeout(() => {
                            skillBar.style.animation = '';
                            skillBar.classList.remove('skill-bar-animate-in');
                            skillBar.classList.add('skill-bar-animated');
                        }, 2000);
                        
                    }, 300);
                    
                    // 停止观察此元素
                    observer.unobserve(skillBar);
                }
            }
        });
    }, { 
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px' // 提前触发
    });
    
    // 观察每个技能条容器
    skillBars.forEach(bar => {
        // 初始状态
        bar.style.opacity = '0.6';
        bar.style.transform = 'scaleY(0.8)';
        bar.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        // 开始观察
        observer.observe(bar);
    });
    
    // 为技能项添加悬停效果
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const skillLevel = item.querySelector('.skill-level');
            const skillBar = item.querySelector('.skill-bar');
            
            if (skillLevel && skillBar) {
                skillLevel.style.transform = 'scaleX(1.05)';
                skillLevel.style.filter = 'brightness(1.2)';
                skillLevel.style.transition = 'transform 0.3s ease, filter 0.3s ease';
                
                skillBar.style.transform = 'scaleY(1.3)';
                skillBar.style.boxShadow = '0 0 20px rgba(74, 110, 224, 0.4)';
                skillBar.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            const skillLevel = item.querySelector('.skill-level');
            const skillBar = item.querySelector('.skill-bar');
            
            if (skillLevel && skillBar) {
                skillLevel.style.transform = 'scaleX(1)';
                skillLevel.style.filter = 'brightness(1)';
                
                skillBar.style.transform = 'scaleY(1)';
                skillBar.style.boxShadow = '';
                
                // 如果已经完成动画，保持动画类
                if (skillBar.classList.contains('skill-bar-animated')) {
                    skillBar.style.opacity = '1';
                }
            }
        });
    });
}

// 初始化回到顶部按钮
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    const videoEditingSection = document.getElementById('video-editing');
    
    if (!backToTopBtn || !videoEditingSection) return;
    
    // 监听滚动事件
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const videoSectionTop = videoEditingSection.offsetTop;
        const videoSectionHeight = videoEditingSection.offsetHeight;
        
        // 如果滚动到视频剪辑部分或更下方，显示按钮
        if (scrollPosition >= videoSectionTop - 100) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    // 点击回到顶部
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// 初始化视频播放功能
function initVideoPlayers() {
    const videoPreviews = document.querySelectorAll('.video-preview');
    const watchButtons = document.querySelectorAll('.watch-video-btn');
    
    // 创建视频模态框
    const videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML = `
        <div class="video-modal-content">
            <div class="video-modal-header">
                <div class="video-modal-title">视频播放</div>
                <button class="video-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="video-modal-body">
                <div class="video-embed-container" id="videoEmbedContainer">
                    <!-- 视频将动态嵌入到这里 -->
                </div>
                <div class="video-description-modal" id="videoDescriptionModal">
                    <!-- 视频描述将动态添加到这里 -->
                </div>
            </div>
            <div class="video-modal-footer">
                <a href="#" class="video-link" id="externalVideoLink" target="_blank">
                    <i class="fas fa-external-link-alt"></i> 在原始平台观看
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(videoModal);
    
    // 关闭模态框
    const closeModal = () => {
        videoModal.style.display = 'none';
        const container = document.getElementById('videoEmbedContainer');
        const descriptionContainer = document.getElementById('videoDescriptionModal');
        container.innerHTML = ''; // 清除嵌入的视频
        descriptionContainer.innerHTML = ''; // 清除描述
        document.body.style.overflow = 'auto';
    };
    
    videoModal.querySelector('.video-modal-close').addEventListener('click', closeModal);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) closeModal();
    });
    
    // 按ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal.style.display === 'flex') {
            closeModal();
        }
    });
    
    // 播放视频函数
    const playVideo = (videoId, platform, videoCard) => {
        const container = document.getElementById('videoEmbedContainer');
        const descriptionContainer = document.getElementById('videoDescriptionModal');
        const externalLink = document.getElementById('externalVideoLink');
        const modalTitle = videoModal.querySelector('.video-modal-title');
        
        let embedCode = '';
        let externalUrl = '';
        let description = '';
        
        // 获取视频信息
        const videoTitle = videoCard ? videoCard.querySelector('.video-title').textContent : '';
        const videoHighlights = videoCard ? videoCard.querySelector('.highlight-content')?.textContent : '';
        const videoTech = videoCard ? Array.from(videoCard.querySelectorAll('.tech-tag')).map(tag => tag.textContent).join(', ') : '';
        
        // 根据不同平台生成不同的嵌入代码
        switch(platform) {
            case 'douyin':
                externalUrl = `https://v.douyin.com/${videoId}/`;
                embedCode = `
                    <div class="platform-notice">
                        <div class="notice-icon">
                            <i class="fab fa-tiktok"></i>
                        </div>
                        <h3>抖音视频播放提示</h3>
                        <p>抖音视频需在抖音APP内观看以获得最佳体验</p>
                        <div class="notice-actions">
                            <a href="${externalUrl}" target="_blank" class="notice-btn">
                                <i class="fas fa-external-link-alt"></i> 前往抖音观看
                            </a>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${externalUrl}'); showNotification('链接已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制链接
                            </button>
                        </div>
                        <p class="notice-tip"><i class="fas fa-lightbulb"></i> 提示：复制链接后打开抖音APP即可观看</p>
                    </div>
                `;
                break;
                
            case 'kuaishou':
                externalUrl = `https://v.kuaishou.com/${videoId}`;
                embedCode = `
                    <div class="platform-notice">
                        <div class="notice-icon">
                            <i class="fas fa-video"></i>
                        </div>
                        <h3>快手视频播放提示</h3>
                        <p>快手视频需在快手APP内观看以获得最佳体验</p>
                        <div class="notice-actions">
                            <a href="${externalUrl}" target="_blank" class="notice-btn">
                                <i class="fas fa-external-link-alt"></i> 前往快手观看
                            </a>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${externalUrl}'); showNotification('链接已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制链接
                            </button>
                        </div>
                        <p class="notice-tip"><i class="fas fa-lightbulb"></i> 提示：复制链接后打开快手APP即可观看</p>
                    </div>
                `;
                break;
                
            case 'bilibili':
                // B站支持iframe嵌入 - 实际使用时需要替换为正确的BVID
                // 例如：BV1KF411a7s3 需要转换为 player.bilibili.com/player.html?bvid=BV1KF411a7s3
                embedCode = `<iframe src="//player.bilibili.com/player.html?bvid=${videoId}&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`;
                externalUrl = `https://www.bilibili.com/video/${videoId}`;
                break;
                
            case 'drive':
                const driveUrl = videoId; // 这里videoId实际上是URL
                embedCode = `
                    <div class="platform-notice">
                        <div class="notice-icon">
                            <i class="fab fa-google-drive"></i>
                        </div>
                        <h3>Google Drive视频</h3>
                        <p>视频存储在Google Drive中，需要访问链接观看</p>
                        <div class="notice-actions">
                            <a href="${driveUrl}" target="_blank" class="notice-btn">
                                <i class="fas fa-external-link-alt"></i> 前往Google Drive观看
                            </a>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${driveUrl}'); showNotification('链接已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制链接
                            </button>
                        </div>
                    </div>
                `;
                externalUrl = driveUrl;
                break;
                
            case 'baidu':
                const baiduUrl = videoId; // 这里videoId实际上是URL
                const extractCode = videoCard.getAttribute('data-extract-code') || '';
                embedCode = `
                    <div class="platform-notice">
                        <div class="notice-icon">
                            <i class="fas fa-cloud"></i>
                        </div>
                        <h3>百度网盘视频</h3>
                        <p>视频存储在百度网盘中，需要访问链接并输入提取码观看</p>
                        <div class="notice-info">
                            <p><strong>链接:</strong> ${baiduUrl}</p>
                            <p><strong>提取码:</strong> ${extractCode}</p>
                        </div>
                        <div class="notice-actions">
                            <a href="${baiduUrl}" target="_blank" class="notice-btn">
                                <i class="fas fa-external-link-alt"></i> 前往百度网盘
                            </a>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${baiduUrl}'); showNotification('链接已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制链接
                            </button>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${extractCode}'); showNotification('提取码已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制提取码
                            </button>
                        </div>
                        <p class="notice-tip"><i class="fas fa-lightbulb"></i> 提示：复制链接和提取码到百度网盘APP即可观看</p>
                    </div>
                `;
                externalUrl = baiduUrl;
                break;
        }
        
        // 生成视频描述
        description = `
            <h4>${videoTitle}</h4>
            ${videoHighlights ? `<p><strong>创作亮点:</strong> ${videoHighlights}</p>` : ''}
            ${videoTech ? `<p><strong>技术特点:</strong> ${videoTech}</p>` : ''}
        `;
        
        container.innerHTML = embedCode;
        descriptionContainer.innerHTML = description;
        externalLink.href = externalUrl;
        modalTitle.textContent = videoTitle;
        videoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    
    // 为所有预览和按钮添加点击事件
    videoPreviews.forEach(preview => {
        preview.addEventListener('click', () => {
            const videoId = preview.getAttribute('data-video-id');
            const platform = preview.getAttribute('data-platform');
            const videoType = preview.getAttribute('data-video-type');
            const videoUrl = preview.getAttribute('data-video-url');
            const baiduUrl = preview.getAttribute('data-baidu-url');
            const extractCode = preview.getAttribute('data-extract-code');
            
            let finalVideoId = videoId;
            let finalPlatform = platform;
            
            if (videoType === 'drive') {
                finalVideoId = videoUrl;
                finalPlatform = 'drive';
            } else if (videoType === 'baidu') {
                finalVideoId = baiduUrl;
                finalPlatform = 'baidu';
                // 将提取码添加到预览元素上，供playVideo函数使用
                preview.setAttribute('data-extract-code', extractCode);
            }
            
            playVideo(finalVideoId, finalPlatform, preview.closest('.video-card'));
        });
    });
    
    watchButtons.forEach(button => {
        button.addEventListener('click', () => {
            const videoId = button.getAttribute('data-video-id');
            const platform = button.getAttribute('data-platform');
            const videoType = button.getAttribute('data-video-type');
            const videoUrl = button.getAttribute('data-video-url');
            
            let finalVideoId = videoId;
            let finalPlatform = platform;
            
            if (videoType === 'drive') {
                finalVideoId = videoUrl;
                finalPlatform = 'drive';
            }
            
            playVideo(finalVideoId, finalPlatform, button.closest('.video-card'));
        });
    });
    
    // 添加平台通知的CSS样式（如果尚未添加）
    if (!document.querySelector('#platform-notice-styles')) {
        const style = document.createElement('style');
        style.id = 'platform-notice-styles';
        style.textContent = `
            .platform-notice {
                padding: 40px 20px;
                text-align: center;
                background: var(--card-bg);
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }
            
            .notice-icon {
                font-size: 48px;
                color: var(--primary-color);
                margin-bottom: 20px;
            }
            
            .platform-notice h3 {
                color: var(--text-color);
                margin-bottom: 10px;
            }
            
            .platform-notice p {
                color: var(--text-secondary);
                margin-bottom: 25px;
                line-height: 1.5;
            }
            
            .notice-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .notice-btn {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: var(--primary-color);
                color: white;
                border-radius: 5px;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                font-size: 0.95rem;
            }
            
            .notice-btn:hover {
                background: var(--secondary-color);
                transform: translateY(-2px);
            }
            
            .notice-btn.secondary {
                background: rgba(0, 0, 0, 0.1);
                color: var(--text-color);
            }
            
            .notice-btn.secondary:hover {
                background: rgba(0, 0, 0, 0.2);
            }
            
            .notice-btn i {
                margin-right: 8px;
            }
            
            .notice-tip {
                font-size: 0.9rem;
                color: var(--accent-color);
                margin-top: 20px;
            }
            
            .notice-tip i {
                margin-right: 5px;
            }
            
            .notice-info {
                background: rgba(0, 0, 0, 0.05);
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                text-align: left;
            }
            
            .notice-info p {
                margin-bottom: 5px;
            }
        `;
        document.head.appendChild(style);
    }
}

// 全局函数供HTML调用
window.showDocumentaryInfo = showDocumentaryInfo;
window.closeDocumentaryModal = closeDocumentaryModalFunc;
window.showUniversityVideoInfo = showUniversityVideoInfo;
window.closeUniversityModal = closeUniversityModalFunc;
window.copyToClipboard = copyToClipboard;
window.showNotification = showNotification;
