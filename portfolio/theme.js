// 深色模式切换脚本

document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    // 检查本地存储的主题偏好
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // 切换主题
    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // 更新HTML属性
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // 更新图标
        updateThemeIcon(newTheme);
        
        // 保存到本地存储
        localStorage.setItem('theme', newTheme);
        
        // 添加切换动画效果
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        
        // 显示主题切换提示
        showThemeNotification(newTheme);
    });
    
    // 更新主题图标
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeToggleBtn.title = '切换到浅色模式';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeToggleBtn.title = '切换到深色模式';
        }
    }
    
    // 显示主题切换通知
    function showThemeNotification(theme) {
        // 检查是否已有通知
        let notification = document.querySelector('.theme-notification');
        if (notification) {
            notification.remove();
        }
        
        // 创建新通知
        notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.textContent = theme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: fadeInOut 2s ease;
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
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
    
    // 监听系统主题变化
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 如果没有手动设置过主题，跟随系统主题
    if (!localStorage.getItem('theme')) {
        if (prefersDarkScheme.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon('dark');
        }
    }
    
    // 监听系统主题变化
    prefersDarkScheme.addEventListener('change', function(e) {
        // 只有用户没有手动设置过主题时才跟随系统变化
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
});