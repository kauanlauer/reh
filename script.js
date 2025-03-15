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




// Order System Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const cartButton = document.querySelector('.cart-button');
    const cartCount = document.querySelector('.cart-count');
    const orderModal = document.getElementById('orderModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cartEmpty = document.querySelector('.cart-empty');
    const cartList = document.querySelector('.cart-list');
    const totalItems = document.querySelector('.total-items');
    const orderForm = document.getElementById('orderForm');
    
    // Add "Add to Cart" buttons to menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        // Check if button doesn't already exist
        if (!item.querySelector('.add-to-cart-btn')) {
            const addButton = document.createElement('button');
            addButton.className = 'add-to-cart-btn';
            addButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar ao Pedido';
            item.appendChild(addButton);
        }
    });
    
    // Cart data
    let cart = [];
    
    // Bind events
    bindEvents();
    
    function bindEvents() {
        // Add to cart buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const menuItem = this.closest('.menu-item');
                addToCart(menuItem);
            });
        });
        
        // Cart button
        cartButton.addEventListener('click', function() {
            openModal();
        });
        
        // Close modal
        closeModalBtn.addEventListener('click', function() {
            closeModal();
        });
        
        // Close modal on background click
        orderModal.addEventListener('click', function(e) {
            if (e.target === orderModal) {
                closeModal();
            }
        });
        
        // Submit order
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendOrder();
        });
        
        // Keyboard support
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }
    
    function addToCart(menuItem) {
        const title = menuItem.querySelector('.item-title').textContent;
        const section = menuItem.closest('.menu-category').querySelector('.category-title').textContent;
        
        // Check if the product is already in the cart
        const existingItem = cart.find(item => item.title === title && item.section === section);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                title: title,
                section: section,
                quantity: 1
            });
        }
        
        // Update UI
        updateCartCount();
        updateCartItems();
        
        // Visual feedback
        const button = menuItem.querySelector('.add-to-cart-btn');
        button.innerHTML = '<i class="fas fa-check"></i> Adicionado';
        button.style.backgroundColor = '#5cb85c';
        
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-plus"></i> Adicionar ao Pedido';
            button.style.backgroundColor = '';
        }, 1500);
    }
    
    function updateCartCount() {
        const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
        
        totalItems.textContent = itemCount;
        cartCount.textContent = itemCount;
        
        if (itemCount > 0) {
            cartCount.classList.add('active');
            cartEmpty.style.display = 'none';
            cartList.classList.add('active');
        } else {
            cartCount.classList.remove('active');
            cartEmpty.style.display = 'block';
            cartList.classList.remove('active');
        }
    }
    
    function updateCartItems() {
        cartList.innerHTML = '';
        
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.dataset.id = item.id;
            
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${item.section}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease-btn"><i class="fas fa-minus"></i></button>
                    <div class="item-quantity">${item.quantity}</div>
                    <button class="quantity-btn increase-btn"><i class="fas fa-plus"></i></button>
                    <button class="remove-item"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            
            cartList.appendChild(cartItem);
            
            // Bind item events
            const decreaseBtn = cartItem.querySelector('.decrease-btn');
            const increaseBtn = cartItem.querySelector('.increase-btn');
            const removeBtn = cartItem.querySelector('.remove-item');
            
            decreaseBtn.addEventListener('click', () => {
                decreaseQuantity(item.id);
            });
            
            increaseBtn.addEventListener('click', () => {
                increaseQuantity(item.id);
            });
            
            removeBtn.addEventListener('click', () => {
                removeFromCart(item.id);
            });
        });
    }
    
    function decreaseQuantity(id) {
        const itemIndex = cart.findIndex(item => item.id === id);
        
        if (itemIndex !== -1) {
            if (cart[itemIndex].quantity > 1) {
                cart[itemIndex].quantity -= 1;
            } else {
                cart.splice(itemIndex, 1);
            }
            
            updateCartCount();
            updateCartItems();
        }
    }
    
    function increaseQuantity(id) {
        const itemIndex = cart.findIndex(item => item.id === id);
        
        if (itemIndex !== -1) {
            cart[itemIndex].quantity += 1;
            updateCartCount();
            updateCartItems();
        }
    }
    
    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        updateCartCount();
        updateCartItems();
    }
    
    function openModal() {
        orderModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        orderModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function sendOrder() {
        if (cart.length === 0) {
            alert('Por favor, adicione produtos ao seu pedido antes de continuar.');
            return;
        }
        
        // Get form data
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const address = document.getElementById('customerAddress').value;
        const reference = document.getElementById('customerReference').value;
        const notes = document.getElementById('customerNotes').value;
        
        // Prepare message
        let message = `*NOVO PEDIDO - DELÍCIA D'BROWNIE*\n\n`;
        message += `*Cliente:* ${name}\n`;
        message += `*Telefone:* ${phone}\n`;
        message += `*Endereço:* ${address}\n`;
        
        if (reference) {
            message += `*Ponto de Referência:* ${reference}\n`;
        }
        
        message += `\n*ITENS DO PEDIDO:*\n`;
        
        // Group items by section
        const groupedItems = {};
        
        cart.forEach(item => {
            if (!groupedItems[item.section]) {
                groupedItems[item.section] = [];
            }
            
            groupedItems[item.section].push(item);
        });
        
        // Add items to message by section
        for (const section in groupedItems) {
            message += `\n*${section}:*\n`;
            
            groupedItems[section].forEach(item => {
                message += `• ${item.quantity}x ${item.title}\n`;
            });
        }
        
        // Add notes if any
        if (notes) {
            message += `\n*Observações:* ${notes}\n`;
        }
        
        // Total items
        const totalItemCount = cart.reduce((total, item) => total + item.quantity, 0);
        message += `\n*Total de Itens:* ${totalItemCount}`;
        
        // Encode the message for WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/5541992480604?text=${encodedMessage}`;
        
        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
    }
});