// 主交互脚本

document.addEventListener('DOMContentLoaded', function() {
    // 作品集筛选功能
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 为当前点击的按钮添加active类
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            
            portfolioItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                    // 添加淡入动画
                    item.style.animation = 'fadeInUp 0.6s forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 滚动时导航栏效果
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.05)';
        }
    });
    
    // 延迟加载作品项动画
    setTimeout(() => {
        portfolioItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
        });
    }, 300);
    
    // 联系方式模态框
    const showContactBtn = document.getElementById('show-contact-btn');
    const closeContactModal = document.getElementById('close-contact-modal');
    const contactModal = document.getElementById('contact-modal');
    const downloadResumeBtn = document.getElementById('download-resume-btn');
    
    // 显示联系方式模态框
    if (showContactBtn) {
        showContactBtn.addEventListener('click', function() {
            contactModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        });
    }
    
    // 关闭联系方式模态框
    if (closeContactModal) {
        closeContactModal.addEventListener('click', function() {
            contactModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
    
    // 点击模态框外部关闭
    if (contactModal) {
        contactModal.addEventListener('click', function(e) {
            if (e.target === contactModal) {
                contactModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // 下载简历功能
    if (downloadResumeBtn) {
        downloadResumeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 创建隐藏的下载链接
            const link = document.createElement('a');
            link.href = 'resume.pdf'; // 确保您的简历文件名为resume.pdf
            link.download = '个人简历.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 显示下载提示
            showNotification('简历下载开始，请检查您的下载文件夹');
        });
    }
    
    // 复制联系方式功能
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-clipboard-target');
            const textElement = document.querySelector(targetId);
            
            if (textElement) {
                const textToCopy = textElement.textContent;
                
                // 使用Clipboard API复制文本
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        // 显示复制成功提示
                        const originalText = this.textContent;
                        this.textContent = '已复制!';
                        this.style.backgroundColor = '#28a745';
                        
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.style.backgroundColor = '';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('复制失败: ', err);
                        showNotification('复制失败，请手动复制');
                    });
            }
        });
    });
    
    // 显示通知函数
    function showNotification(message) {
        // 检查是否已有通知
        let notification = document.querySelector('.notification');
        if (notification) {
            notification.remove();
        }
        
        // 创建新通知
        notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});