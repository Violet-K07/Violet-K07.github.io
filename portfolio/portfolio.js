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
    
    // 初始化滚动到视频部分的回到顶部按钮
    initSectionBackToTop();
    
    // 添加技能条动画
    initSkillBars();
});

// 初始化复制链接功能
function initCopyLinks() {
    const copyButtons = document.querySelectorAll('.copy-link');
    const notification = document.getElementById('copy-notification');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            if (url) {
                copyToClipboard(url);
                showNotification('链接已复制到剪贴板！');
            }
        });
    });
    
    // 初始化复制文本按钮
    const copyTextButtons = document.querySelectorAll('.copy-text');
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
            // 滚动到视频剪辑部分
            const videoSection = document.getElementById('video-editing');
            if (videoSection) {
                window.scrollTo({
                    top: videoSection.offsetTop - 80,
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

// 初始化滚动到视频部分显示回到顶部按钮
function initSectionBackToTop() {
    const button = document.querySelector('.section-back-to-top');
    
    // 添加点击事件
    if (button) {
        button.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // 监听滚动事件
    window.addEventListener('scroll', function() {
        const videoSection = document.getElementById('video-editing');
        
        if (videoSection && button) {
            const videoSectionTop = videoSection.offsetTop;
            const currentScroll = window.pageYOffset;
            
            // 当滚动到视频部分时显示按钮
            if (currentScroll >= videoSectionTop - 200) {
                button.classList.add('show');
            } else {
                button.classList.remove('show');
            }
        }
    });
}

// 初始化技能条动画
function initSkillBars() {
    // 检查技能条是否在视图中，如果在则触发动画
    const skillBars = document.querySelectorAll('.skill-level');
    
    // 创建Intersection Observer来检测技能条是否进入视图
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 技能条已经进入视图，宽度已经在CSS中设置
                // 这里可以添加额外的动画效果
                entry.target.style.opacity = '1';
                entry.target.style.transition = 'width 1s ease-in-out, opacity 0.5s ease';
            }
        });
    }, { threshold: 0.5 });
    
    // 观察每个技能条
    skillBars.forEach(bar => {
        bar.style.opacity = '0.8';
        observer.observe(bar);
    });
}

// 全局函数供HTML调用
window.showDocumentaryInfo = showDocumentaryInfo;
window.closeDocumentaryModal = closeDocumentaryModalFunc;
window.showUniversityVideoInfo = showUniversityVideoInfo;
window.closeUniversityModal = closeUniversityModalFunc;