// 作品集页面专用脚本

document.addEventListener('DOMContentLoaded', function() {
    // 初始化复制链接功能
    initCopyLinks();
    
    // 初始化模态框
    initModals();
    
    // 添加平滑滚动
    initSmoothScroll();
    initMainSectionNav();
    initAccountCaseNav();
    
    // 添加向下滚动功能
    initScrollIndicator();
    
    // 添加技能条动画
    initSkillBars();
    
    // 初始化视频播放功能
    initInlineVideoEmbeds();
    initVideoPlayers();

    // 初始化截图大图预览
    initImageLightbox();

    // 初始化 AIGC 图片轮播
    initMarketingCarousels();
    
    // 初始化回到顶部按钮
    initBackToTop();

    // 初始化作品集滚动动效
    initMotionReveals();
});

// 初始化滚动进入动效
function initMotionReveals() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const revealSelectors = [
        '.section-title',
        '.compact-title',
        '.category-title',
        '.role-focus-card',
        '.aigc-scene-title',
        '.aigc-step-card',
        '.aigc-video-case',
        '.video-card',
        '.web-project-card',
        '.project-case-points > div',
        '.project-before-after figure',
        '.project-screenshot-wall figure',
        '.account-cover-rail',
        '.account-result-slip',
        '.account-section-mark',
        '.account-position-statement',
        '.account-position-notes article',
        '.account-breakthrough-brief',
        '.account-keyword-notes article',
        '.account-single-editor',
        '.account-workflow-list article',
        '.account-ai-note',
        '.account-distribution-board article',
        '.account-platform-ledger > div',
        '.account-career-translation',
        '.account-boundary-card'
    ];

    const elements = Array.from(document.querySelectorAll(revealSelectors.join(',')));
    if (!elements.length) return;

    document.documentElement.classList.add('motion-ready');

    elements.forEach((element, index) => {
        element.classList.add('motion-reveal');

        const groupParent = element.closest('.portfolio-grid, .role-focus-grid, .aigc-workflow-grid, .project-case-points, .project-before-after') || element.parentElement;
        const siblings = groupParent ? Array.from(groupParent.children).filter(child => child.matches?.(revealSelectors.join(','))) : [];
        const siblingIndex = Math.max(0, siblings.indexOf(element));
        const delay = Math.min(siblingIndex * 70, 280);

        element.style.setProperty('--motion-delay', `${delay}ms`);

        if (index % 5 === 1) element.classList.add('motion-drift-left');
        if (index % 5 === 3) element.classList.add('motion-drift-right');
    });

    if (!('IntersectionObserver' in window)) {
        elements.forEach(element => element.classList.add('motion-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('motion-visible');
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12
    });

    elements.forEach(element => observer.observe(element));
}

// 初始化 AIGC 营销图例轮播
function initMarketingCarousels() {
    const carousels = Array.from(document.querySelectorAll('[data-carousel]'));
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
        const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
        const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
        const prevButton = carousel.querySelector('[data-carousel-prev]');
        const nextButton = carousel.querySelector('[data-carousel-next]');
        const status = carousel.querySelector('[data-carousel-status]');
        const caption = carousel.querySelector('[data-carousel-caption]');
        let activeIndex = 0;
        let dragStartX = null;
        let autoplayTimer = null;
        let isPaused = false;

        if (!slides.length) return;

        const formatIndex = (index) => String(index + 1).padStart(2, '0');
        const formatTotal = () => String(slides.length).padStart(2, '0');

        const setActiveSlide = (nextIndex) => {
            activeIndex = (nextIndex + slides.length) % slides.length;

            slides.forEach((slide, index) => {
                const isActive = index === activeIndex;
                slide.classList.toggle('is-active', isActive);
                slide.setAttribute('aria-hidden', String(!isActive));

                const image = slide.querySelector('img');
                if (image) {
                    image.tabIndex = isActive ? 0 : -1;
                }
            });

            dots.forEach((dot, index) => {
                dot.classList.toggle('is-active', index === activeIndex);
                dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
            });

            if (status) {
                status.textContent = `${formatIndex(activeIndex)} / ${formatTotal()}`;
            }

            if (caption) {
                caption.textContent = slides[activeIndex].querySelector('figcaption')?.textContent?.trim() || '';
            }
        };

        const stopAutoplay = () => {
            if (!autoplayTimer) return;
            window.clearInterval(autoplayTimer);
            autoplayTimer = null;
        };

        const startAutoplay = () => {
            if (slides.length <= 1 || isPaused || document.hidden || autoplayTimer) return;

            autoplayTimer = window.setInterval(() => {
                setActiveSlide(activeIndex + 1);
            }, 4600);
        };

        const restartAutoplay = () => {
            stopAutoplay();
            startAutoplay();
        };

        const goToSlide = (nextIndex) => {
            setActiveSlide(nextIndex);
            restartAutoplay();
        };

        prevButton?.addEventListener('click', () => goToSlide(activeIndex - 1));
        nextButton?.addEventListener('click', () => goToSlide(activeIndex + 1));

        dots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const nextIndex = Number(dot.dataset.carouselDot);
                if (Number.isFinite(nextIndex)) goToSlide(nextIndex);
            });
        });

        carousel.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToSlide(activeIndex - 1);
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToSlide(activeIndex + 1);
            }
        });

        carousel.addEventListener('mouseenter', () => {
            isPaused = true;
            stopAutoplay();
        });

        carousel.addEventListener('mouseleave', () => {
            isPaused = false;
            startAutoplay();
        });

        carousel.addEventListener('focusin', () => {
            isPaused = true;
            stopAutoplay();
        });

        carousel.addEventListener('focusout', (event) => {
            if (carousel.contains(event.relatedTarget)) return;
            isPaused = false;
            startAutoplay();
        });

        carousel.addEventListener('pointerdown', (event) => {
            dragStartX = event.clientX;
        });

        carousel.addEventListener('pointerup', (event) => {
            if (dragStartX === null) return;

            const dragDistance = event.clientX - dragStartX;
            dragStartX = null;

            if (Math.abs(dragDistance) < 48) return;
            carousel.dataset.dragging = 'true';
            goToSlide(activeIndex + (dragDistance < 0 ? 1 : -1));
            window.setTimeout(() => {
                delete carousel.dataset.dragging;
            }, 0);
        });

        carousel.addEventListener('pointercancel', () => {
            dragStartX = null;
        });

        carousel.addEventListener('click', (event) => {
            if (carousel.dataset.dragging !== 'true') return;
            event.preventDefault();
            event.stopPropagation();
        }, true);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoplay();
                return;
            }
            startAutoplay();
        });

        setActiveSlide(0);
        startAutoplay();
    });
}

// 初始化作品截图大图预览
function initImageLightbox() {
    const imageSelectors = [
        '.project-screenshot-wall img',
        '.project-before-after img',
        '.aigc-marketing-gallery img'
    ];
    const images = Array.from(document.querySelectorAll(imageSelectors.join(',')));
    if (!images.length) return;

    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', '截图大图预览');
    lightbox.innerHTML = `
        <button class="image-lightbox-close" type="button" aria-label="关闭大图预览">&times;</button>
        <button class="image-lightbox-nav image-lightbox-prev" type="button" aria-label="上一张大图">
            <i class="fas fa-chevron-left"></i>
        </button>
        <button class="image-lightbox-nav image-lightbox-next" type="button" aria-label="下一张大图">
            <i class="fas fa-chevron-right"></i>
        </button>
        <div class="image-lightbox-content">
            <div class="image-lightbox-stage" aria-label="滚轮或双指缩放图片">
                <img class="image-lightbox-img" alt="" draggable="false">
            </div>
            <div class="image-lightbox-controls" aria-label="大图缩放控制">
                <span class="image-lightbox-zoom-label">缩放</span>
                <button class="image-lightbox-zoom-step" type="button" data-zoom-step="-1" aria-label="缩小图片">
                    <i class="fas fa-search-minus"></i>
                </button>
                <input class="image-lightbox-zoom" type="range" min="100" max="320" step="5" value="100" aria-label="图片缩放比例">
                <button class="image-lightbox-zoom-step" type="button" data-zoom-step="1" aria-label="放大图片">
                    <i class="fas fa-search-plus"></i>
                </button>
                <span class="image-lightbox-zoom-value">100%</span>
                <span class="image-lightbox-count">01 / 01</span>
                <button class="image-lightbox-reset" type="button">复位</button>
            </div>
            <p class="image-lightbox-caption"></p>
        </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxStage = lightbox.querySelector('.image-lightbox-stage');
    const lightboxImg = lightbox.querySelector('.image-lightbox-img');
    const lightboxCaption = lightbox.querySelector('.image-lightbox-caption');
    const closeButton = lightbox.querySelector('.image-lightbox-close');
    const zoomRange = lightbox.querySelector('.image-lightbox-zoom');
    const zoomValue = lightbox.querySelector('.image-lightbox-zoom-value');
    const zoomStepButtons = Array.from(lightbox.querySelectorAll('[data-zoom-step]'));
    const resetButton = lightbox.querySelector('.image-lightbox-reset');
    const prevLightboxButton = lightbox.querySelector('.image-lightbox-prev');
    const nextLightboxButton = lightbox.querySelector('.image-lightbox-next');
    const lightboxCount = lightbox.querySelector('.image-lightbox-count');

    const minScale = 1;
    const maxScale = 3.2;
    const pointers = new Map();
    let lightboxGroup = images;
    let lightboxIndex = 0;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let dragStart = null;
    let pinchStart = null;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const getPointerDistance = (pointA, pointB) => Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
    const getPointerMidpoint = (pointA, pointB) => ({
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
    });

    const clampPan = (nextX = panX, nextY = panY, nextScale = scale) => {
        if (nextScale <= minScale + 0.01) {
            return { x: 0, y: 0 };
        }

        const stageRect = lightboxStage.getBoundingClientRect();
        const baseWidth = lightboxImg.offsetWidth || 0;
        const baseHeight = lightboxImg.offsetHeight || 0;
        const maxX = Math.max(0, ((baseWidth * nextScale) - stageRect.width) / 2 + 28);
        const maxY = Math.max(0, ((baseHeight * nextScale) - stageRect.height) / 2 + 28);

        return {
            x: clamp(nextX, -maxX, maxX),
            y: clamp(nextY, -maxY, maxY)
        };
    };

    const renderTransform = () => {
        const clampedPan = clampPan();
        panX = clampedPan.x;
        panY = clampedPan.y;

        lightboxImg.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
        lightbox.classList.toggle('is-zoomed', scale > 1.02);
        zoomRange.value = String(Math.round(scale * 100));
        zoomValue.textContent = `${Math.round(scale * 100)}%`;
    };

    const setScale = (nextScale, originX, originY) => {
        const clampedScale = clamp(nextScale, minScale, maxScale);
        if (!Number.isFinite(clampedScale)) return;

        if (originX !== undefined && originY !== undefined) {
            const stageRect = lightboxStage.getBoundingClientRect();
            const centerX = stageRect.left + stageRect.width / 2;
            const centerY = stageRect.top + stageRect.height / 2;
            const ratio = clampedScale / scale;
            panX = originX - centerX - ((originX - centerX - panX) * ratio);
            panY = originY - centerY - ((originY - centerY - panY) * ratio);
        } else if (clampedScale <= minScale + 0.01) {
            panX = 0;
            panY = 0;
        } else {
            const ratio = clampedScale / scale;
            panX *= ratio;
            panY *= ratio;
        }

        scale = clampedScale;
        renderTransform();
    };

    const resetTransform = () => {
        scale = 1;
        panX = 0;
        panY = 0;
        renderTransform();
    };

    const getLightboxGroup = (image) => {
        const groupRoot = image.closest('[data-carousel], .project-screenshot-wall, .project-before-after');
        if (!groupRoot) return [image];

        return images.filter((candidate) => groupRoot.contains(candidate));
    };

    const updateLightboxNav = () => {
        const hasMultipleImages = lightboxGroup.length > 1;
        prevLightboxButton.hidden = !hasMultipleImages;
        nextLightboxButton.hidden = !hasMultipleImages;
        lightboxCount.hidden = !hasMultipleImages;
        lightboxCount.textContent = `${String(lightboxIndex + 1).padStart(2, '0')} / ${String(lightboxGroup.length).padStart(2, '0')}`;
    };

    const setLightboxImage = (image) => {
        const figure = image.closest('figure');
        const caption = figure?.querySelector('figcaption')?.textContent?.trim() || image.alt || '作品截图';

        lightboxIndex = Math.max(0, lightboxGroup.indexOf(image));
        resetTransform();
        lightboxImg.src = image.currentSrc || image.src;
        lightboxImg.alt = image.alt || caption;
        lightboxCaption.textContent = caption;
        updateLightboxNav();
        requestAnimationFrame(renderTransform);
    };

    const showLightboxImageAt = (nextIndex) => {
        if (lightboxGroup.length <= 1) return;
        lightboxIndex = (nextIndex + lightboxGroup.length) % lightboxGroup.length;
        setLightboxImage(lightboxGroup[lightboxIndex]);
    };

    const closeLightbox = () => {
        lightbox.classList.remove('show');
        document.body.style.overflow = '';
        pointers.clear();
        dragStart = null;
        pinchStart = null;
        resetTransform();
        lightboxImg.removeAttribute('src');
    };

    const openLightbox = (image) => {
        lightboxGroup = getLightboxGroup(image);
        setLightboxImage(image);
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
        closeButton.focus();
    };

    lightboxImg.addEventListener('load', renderTransform);

    images.forEach((image) => {
        image.classList.add('is-lightbox-enabled');
        image.setAttribute('tabindex', '0');
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', `${image.alt || '作品截图'}，点击查看大图`);

        image.addEventListener('click', () => openLightbox(image));
        image.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openLightbox(image);
            }
        });
    });

    closeButton.addEventListener('click', closeLightbox);
    prevLightboxButton.addEventListener('click', () => showLightboxImageAt(lightboxIndex - 1));
    nextLightboxButton.addEventListener('click', () => showLightboxImageAt(lightboxIndex + 1));
    resetButton.addEventListener('click', resetTransform);
    zoomStepButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setScale(scale + Number(button.dataset.zoomStep) * 0.2);
        });
    });
    zoomRange.addEventListener('input', (event) => {
        setScale(Number(event.target.value) / 100);
    });
    lightboxStage.addEventListener('wheel', (event) => {
        if (!lightbox.classList.contains('show')) return;
        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        setScale(scale * zoomFactor, event.clientX, event.clientY);
    }, { passive: false });
    lightboxStage.addEventListener('dblclick', (event) => {
        if (scale > 1.05) {
            resetTransform();
        } else {
            setScale(2, event.clientX, event.clientY);
        }
    });
    lightboxStage.addEventListener('pointerdown', (event) => {
        if (!lightbox.classList.contains('show')) return;

        lightboxStage.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointers.size === 1) {
            dragStart = { x: event.clientX, y: event.clientY, panX, panY };
            pinchStart = null;
        }

        if (pointers.size === 2) {
            const [pointA, pointB] = Array.from(pointers.values());
            pinchStart = {
                distance: getPointerDistance(pointA, pointB),
                midpoint: getPointerMidpoint(pointA, pointB),
                scale,
                panX,
                panY
            };
            dragStart = null;
        }
    });
    lightboxStage.addEventListener('pointermove', (event) => {
        if (!pointers.has(event.pointerId)) return;

        event.preventDefault();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointers.size >= 2 && pinchStart) {
            const [pointA, pointB] = Array.from(pointers.values());
            const distance = getPointerDistance(pointA, pointB);
            if (!distance || !pinchStart.distance) return;

            const midpoint = getPointerMidpoint(pointA, pointB);
            const nextScale = clamp(pinchStart.scale * (distance / pinchStart.distance), minScale, maxScale);
            const stageRect = lightboxStage.getBoundingClientRect();
            const centerX = stageRect.left + stageRect.width / 2;
            const centerY = stageRect.top + stageRect.height / 2;
            const ratio = nextScale / pinchStart.scale;

            scale = nextScale;
            panX = midpoint.x - centerX - ((pinchStart.midpoint.x - centerX - pinchStart.panX) * ratio);
            panY = midpoint.y - centerY - ((pinchStart.midpoint.y - centerY - pinchStart.panY) * ratio);
            renderTransform();
            return;
        }

        if (pointers.size === 1 && dragStart && scale > 1.02) {
            panX = dragStart.panX + event.clientX - dragStart.x;
            panY = dragStart.panY + event.clientY - dragStart.y;
            renderTransform();
        }
    });

    const endPointerGesture = (event) => {
        if (!pointers.has(event.pointerId)) return;

        pointers.delete(event.pointerId);
        if (lightboxStage.hasPointerCapture?.(event.pointerId)) {
            lightboxStage.releasePointerCapture(event.pointerId);
        }

        if (pointers.size === 1) {
            const [remainingPoint] = Array.from(pointers.values());
            dragStart = { x: remainingPoint.x, y: remainingPoint.y, panX, panY };
            pinchStart = null;
            return;
        }

        dragStart = null;
        pinchStart = null;
    };

    lightboxStage.addEventListener('pointerup', endPointerGesture);
    lightboxStage.addEventListener('pointercancel', endPointerGesture);
    lightboxStage.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'touch') endPointerGesture(event);
    });
    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox || event.target.classList.contains('image-lightbox-content')) {
            closeLightbox();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (!lightbox.classList.contains('show')) return;

        if (event.key === 'Escape') {
            closeLightbox();
        }
        if (event.key === 'ArrowLeft' && event.target !== zoomRange) {
            event.preventDefault();
            showLightboxImageAt(lightboxIndex - 1);
        }
        if (event.key === 'ArrowRight' && event.target !== zoomRange) {
            event.preventDefault();
            showLightboxImageAt(lightboxIndex + 1);
        }
        if (event.key === '+' || event.key === '=') {
            setScale(scale + 0.2);
        }
        if (event.key === '-' || event.key === '_') {
            setScale(scale - 0.2);
        }
        if (event.key === '0') {
            resetTransform();
        }
    });
    window.addEventListener('resize', () => {
        if (lightbox.classList.contains('show')) {
            renderTransform();
        }
    });
}

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

function initMainSectionNav() {
    initScrollSpyNav('header .nav-links:not(.account-case-nav) a[href^="#"]', {
        headerOffset: 120
    });
}

function initAccountCaseNav() {
    initScrollSpyNav('.account-case-nav a[href^="#"]', {
        headerOffset: 110
    });
}

function initScrollSpyNav(selector, options = {}) {
    const navLinks = Array.from(document.querySelectorAll(selector));
    if (!navLinks.length) return;

    const navItems = navLinks
        .map(link => {
            const id = link.getAttribute('href').slice(1);
            return {
                link,
                section: document.getElementById(id)
            };
        })
        .filter(item => item.section);

    if (!navItems.length) return;

    const setActive = (activeLink) => {
        navLinks.forEach(link => {
            const isActive = link === activeLink;
            link.classList.toggle('is-active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'true');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    };

    const updateActiveNav = () => {
        const headerOffset = options.headerOffset ?? 110;
        const currentY = window.scrollY + headerOffset;
        const positionedItems = navItems
            .map(item => ({
                ...item,
                top: item.section.getBoundingClientRect().top + window.scrollY
            }))
            .sort((a, b) => a.top - b.top);

        let activeItem = positionedItems[0];
        positionedItems.forEach(item => {
            if (item.top <= currentY) {
                activeItem = item;
            }
        });

        const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
        setActive(nearBottom ? positionedItems[positionedItems.length - 1].link : activeItem.link);
    };

    let ticking = false;
    const requestUpdate = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            updateActiveNav();
            ticking = false;
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', () => setActive(link));
    });

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateActiveNav();
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
    
    if (!backToTopBtn) return;

    const getShowThreshold = () => {
        if (videoEditingSection) {
            return Math.max(0, videoEditingSection.offsetTop - 100);
        }

        return 420;
    };

    const updateBackToTopVisibility = () => {
        if (window.scrollY >= getShowThreshold()) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    };
    
    // 监听滚动事件
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    window.addEventListener('resize', updateBackToTopVisibility);
    updateBackToTopVisibility();
    
    // 点击回到顶部
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

function getDouyinExternalUrl(videoId) {
    return `https://v.douyin.com/${videoId}/`;
}

function getBilibiliPlayerSrc(videoId) {
    return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(videoId)}&page=1&high_quality=1&autoplay=0&t=0`;
}

function createVideoIframe(src, title, platform) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title || '内嵌视频播放器';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('referrerpolicy', platform === 'douyin' ? 'unsafe-url' : 'no-referrer-when-downgrade');

    if (platform === 'bilibili') {
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('border', '0');
        iframe.setAttribute('frameborder', 'no');
        iframe.setAttribute('framespacing', '0');
    }

    return iframe;
}

function initInlineVideoEmbeds() {
    const inlineTargets = document.querySelectorAll('.video-preview[data-platform="bilibili"]');

    inlineTargets.forEach(preview => {
        // B站视频不在页面加载时自动创建 iframe，避免自动播放或恢复上次播放状态。
        preview.removeAttribute('data-inline-embedded');
        preview.classList.remove('inline-video-embed', 'inline-video-embed-bilibili');
        preview.setAttribute('aria-label', '点击打开 Bilibili 播放器，播放器加载后需手动播放');
    });

    const clickPlayers = document.querySelectorAll('.bilibili-click-player[data-video-id]');
    clickPlayers.forEach(player => {
        const loadPlayer = () => {
            if (player.classList.contains('is-loaded')) return;

            const videoId = player.getAttribute('data-video-id');
            const title = player.getAttribute('data-title') || 'Bilibili 视频';
            if (!videoId) return;

            player.classList.add('is-loaded');
            player.innerHTML = '';
            player.appendChild(createVideoIframe(getBilibiliPlayerSrc(videoId), title, 'bilibili'));
        };

        player.addEventListener('click', loadPlayer);
        player.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                loadPlayer();
            }
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
                externalUrl = getDouyinExternalUrl(videoId);
                embedCode = `
                    <div class="platform-notice">
                        <div class="notice-icon">
                            <i class="fab fa-tiktok"></i>
                        </div>
                        <h3>抖音视频播放提示</h3>
                        <p>抖音视频需在抖音 App 或网页原链接中观看，以避免内嵌播放失败。</p>
                        <div class="notice-actions">
                            <a href="${externalUrl}" target="_blank" class="notice-btn">
                                <i class="fas fa-external-link-alt"></i> 前往抖音观看
                            </a>
                            <button class="notice-btn secondary" onclick="copyToClipboard('${externalUrl}'); showNotification('链接已复制到剪贴板！')">
                                <i class="fas fa-copy"></i> 复制链接
                            </button>
                        </div>
                        <p class="notice-tip"><i class="fas fa-lightbulb"></i> 提示：复制链接后打开抖音也可以观看</p>
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
                // 每次点击都重新创建 B站 iframe，autoplay=0 保持未播放状态。
                embedCode = `<iframe src="${getBilibiliPlayerSrc(videoId)}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`;
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
        
        container.className = 'video-embed-container';
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
            if (preview.hasAttribute('data-inline-embedded')) return;

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
