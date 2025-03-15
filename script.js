// Gerenciamento das abas do cardápio
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe active de todos os botões
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adiciona a classe active ao botão clicado
            this.classList.add('active');
            
            // Esconde todos os conteúdos de abas
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.style.display = 'none');
            
            // Mostra o conteúdo da aba selecionada
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });
    
    // Adiciona efeito de hover aos itens do menu
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
            this.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
            this.style.transition = 'all 0.3s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Animação suave ao scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Efeito de destaque ao carregar a página para o cardápio de Páscoa
    const easterCard = document.querySelector('.easter-card');
    
    if (easterCard) {
        setTimeout(() => {
            easterCard.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
            easterCard.style.transform = 'scale(1.02)';
            easterCard.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
            
            setTimeout(() => {
                easterCard.style.transform = 'scale(1)';
                easterCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
            }, 700);
        }, 300);
    }
});