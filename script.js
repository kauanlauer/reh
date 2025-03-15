document.addEventListener('DOMContentLoaded', function() {
    // Fade-in animations
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        element.classList.add('active');
    });
    
    // Staggered animations for menu items
    const staggerItems = document.querySelectorAll('.stagger-item');
    staggerItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100 * index);
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Scroll animations
    function checkScroll() {
        const staggerItems = document.querySelectorAll('.stagger-item');
        staggerItems.forEach((item, index) => {
            const itemTop = item.getBoundingClientRect().top;
            const itemBottom = item.getBoundingClientRect().bottom;
            const isVisible = (itemTop < window.innerHeight - 100) && (itemBottom > 0);
            
            if (isVisible) {
                setTimeout(() => {
                    item.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 50 * index);
            }
        });
    }
    
    // Initial check
    checkScroll();
    
    // Check on scroll
    window.addEventListener('scroll', checkScroll);
});