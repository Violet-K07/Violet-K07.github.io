// 深色模式切换脚本

document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    // 默认深色；首次升级到深色默认时，覆盖旧版遗留的浅色本地值。
    const darkDefaultVersion = '2026-06-dark-default';
    if (localStorage.getItem('themeDefaultVersion') !== darkDefaultVersion) {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('themeDefaultVersion', darkDefaultVersion);
    }

    // 检查本地存储的主题偏好
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // 添加主题切换按钮的动画效果
    themeToggleBtn.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // 切换主题
    themeToggleBtn.addEventListener('click', function() {
        // 添加点击动画
        this.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // 添加主题切换过渡效果
        document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
        document.querySelectorAll('header, footer, .card, .modal-content, .skills-card').forEach(el => {
            el.style.transition = 'background-color 0.5s ease, color 0.5s ease';
        });
        
        // 更新HTML属性
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // 更新图标 - 添加旋转动画
        themeIcon.style.transition = 'transform 0.5s ease, opacity 0.3s ease';
        themeIcon.style.transform = 'rotate(180deg)';
        themeIcon.style.opacity = '0.5';
        
        setTimeout(() => {
            updateThemeIcon(newTheme);
            themeIcon.style.transform = 'rotate(0deg)';
            themeIcon.style.opacity = '1';
        }, 250);
        
        // 保存到本地存储
        localStorage.setItem('theme', newTheme);
        
        // 显示主题切换提示（单行提示）
        showThemeNotification(newTheme);
        
        // 移除过渡效果
        setTimeout(() => {
            document.body.style.transition = '';
            document.querySelectorAll('header, footer, .card, .modal-content, .skills-card').forEach(el => {
                el.style.transition = '';
            });
        }, 500);
    });
    
    // 更新主题图标
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeIcon.style.color = '#FFD700'; // 金色太阳
            themeToggleBtn.title = '切换到浅色模式';
            themeToggleBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeIcon.style.color = '#FFFFFF'; // 白色月亮
            themeToggleBtn.title = '切换到深色模式';
            themeToggleBtn.style.boxShadow = 'var(--shadow)';
        }
    }
    
    // 显示主题切换通知（单行版本）
    function showThemeNotification(theme) {
        // 检查是否已有通知
        let notification = document.querySelector('.theme-notification');
        if (notification) {
            notification.remove();
        }
        
        // 获取按钮位置
        const buttonRect = themeToggleBtn.getBoundingClientRect();
        const buttonTop = buttonRect.top + window.scrollY;
        const buttonLeft = buttonRect.left + window.scrollX;
        
        // 创建新通知 - 调整位置到按钮下方
        notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.textContent = theme === 'dark' ? '🌙 已切换到深色模式' : '☀️ 已切换到浅色模式';
        notification.style.cssText = `
            position: fixed;
            top: ${buttonTop + 70}px; /* 按钮下方70px */
            right: 20px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            z-index: 1002;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            animation: slideInOut 2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            font-weight: 500;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
            font-size: 0.9rem;
        `;
        
        document.body.appendChild(notification);
        
        // 2秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInOut {
            0% { 
                opacity: 0; 
                transform: translateY(-20px) scale(0.8);
            }
            20% { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
            80% { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
            100% { 
                opacity: 0; 
                transform: translateY(-20px) scale(0.8);
            }
        }
        
        /* 主题切换按钮的悬停效果 */
        .theme-toggle-btn {
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
        }
        
        .theme-toggle-btn:hover {
            transform: rotate(15deg) scale(1.1) !important;
            box-shadow: 0 0 20px rgba(74, 110, 224, 0.4) !important;
        }
        
        /* 深色模式下的按钮特殊效果 */
        [data-theme="dark"] .theme-toggle-btn {
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.3) !important;
        }
        
        [data-theme="dark"] .theme-toggle-btn:hover {
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.5) !important;
        }
        
        /* 主题通知样式 */
        .theme-notification {
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
    
    // 初始更新图标样式
    updateThemeIcon(currentTheme);
});
