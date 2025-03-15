document.addEventListener("DOMContentLoaded", function () {
  // Fade-in animations
  const fadeElements = document.querySelectorAll(".fade-in");
  fadeElements.forEach((element) => {
    element.classList.add("active");
  });

  // Staggered animations for menu items
  const staggerItems = document.querySelectorAll(".stagger-item");
  staggerItems.forEach((item, index) => {
    setTimeout(() => {
      item.style.transition = "opacity 0.8s ease, transform 0.8s ease";
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    }, 100 * index);
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 70,
          behavior: "smooth",
        });
      }
    });
  });

  // Scroll animations
  function checkScroll() {
    const staggerItems = document.querySelectorAll(".stagger-item");
    staggerItems.forEach((item, index) => {
      const itemTop = item.getBoundingClientRect().top;
      const itemBottom = item.getBoundingClientRect().bottom;
      const isVisible = itemTop < window.innerHeight - 100 && itemBottom > 0;

      if (isVisible) {
        setTimeout(() => {
          item.style.transition = "opacity 0.8s ease, transform 0.8s ease";
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
        }, 50 * index);
      }
    });
  }

  // Initial check
  checkScroll();

  // Check on scroll
  window.addEventListener("scroll", checkScroll);
});

// Order System Functionality
document.addEventListener("DOMContentLoaded", async function () {
  // Elements
  const cartButton = document.querySelector(".cart-button");
  const cartCount = document.querySelector(".cart-count");
  const orderModal = document.getElementById("orderModal");
  const closeModalBtn = document.querySelector(".close-modal");
  const cartEmpty = document.querySelector(".cart-empty");
  const cartList = document.querySelector(".cart-list");
  const totalItems = document.querySelector(".total-items");
  const orderForm = document.getElementById("orderForm");

  // Carregar produtos do banco de dados
  await loadProductsFromDatabase();

  // Add "Add to Cart" buttons to menu items
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    // Check if button doesn't already exist
    if (!item.querySelector(".add-to-cart-btn")) {
      const addButton = document.createElement("button");
      addButton.className = "add-to-cart-btn";
      addButton.innerHTML = '<i class="fas fa-plus"></i> Carrinho';
      item.appendChild(addButton);
    }
  });

  // Cart data
  let cart = [];

  // Bind events
  bindEvents();

  // Função para carregar produtos do banco de dados
  async function loadProductsFromDatabase() {
    try {
      // Carregar categorias
      const categories = await window.dbFunctions.getCategorias();

      for (const category of categories) {
        // Buscar produtos da categoria
        const products = await window.dbFunctions.getProdutosPorCategoria(
          category.slug
        );

        // Selecionar o container da categoria
        const categorySection = document.getElementById(category.slug);
        if (!categorySection) continue;

        const menuItemsContainer = categorySection.querySelector(".menu-items");
        if (!menuItemsContainer) continue;

        // Limpar itens existentes
        menuItemsContainer.innerHTML = "";

        // Adicionar produtos
        products.forEach((product) => {
          const specs = product.especificacoes || {};
          let specsHtml = "";

          if (category.slug === "bolos") {
            specsHtml = `
                                    <div class="item-specs">
                                        <div class="spec-item">
                                            <span class="spec-label">Massa</span>
                                            <span class="spec-value">${
                                              specs.massa || ""
                                            }</span>
                                        </div>
                                        <div class="spec-item">
                                            <span class="spec-label">Recheio</span>
                                            <span class="spec-value">${
                                              specs.recheio || ""
                                            }</span>
                                        </div>
                                        <div class="spec-item">
                                            <span class="spec-label">Finalização</span>
                                            <span class="spec-value">${
                                              specs.finalizacao || ""
                                            }</span>
                                        </div>
                                    </div>
                                `;
          } else if (category.slug === "brownies" && specs.sabores) {
            specsHtml = `
                                    <div class="item-specs">
                                        <div class="spec-item">
                                            <span class="spec-label">Sabores</span>
                                            <span class="spec-value">${
                                              specs.sabores[0] || ""
                                            }</span>
                                        </div>
                                `;

            if (specs.sabores[1]) {
              specsHtml += `
                                        <div class="spec-item">
                                            <span class="spec-label"></span>
                                            <span class="spec-value">${specs.sabores[1]}</span>
                                        </div>
                                    `;
            }

            if (specs.sabores[2]) {
              specsHtml += `
                                        <div class="spec-item">
                                            <span class="spec-label"></span>
                                            <span class="spec-value">${specs.sabores[2]}</span>
                                        </div>
                                    `;
            }

            specsHtml += `</div>`;
          }

          const productHtml = `
                                <div class="menu-item stagger-item" data-id="${
                                  product.id
                                }" data-price="${product.preco}">
                                    <div class="item-decoration"></div>
                                    <div class="item-content">
                                        <div class="item-header">
                                            <h3 class="item-title">${
                                              product.nome
                                            }</h3>
                                            <span class="item-price">R$ ${parseFloat(
                                              product.preco
                                            ).toFixed(2)}</span>
                                        </div>
                                        <p class="item-description">${
                                          product.descricao
                                        }</p>
                                        ${specsHtml}
                                    </div>
                                    <button class="add-to-cart-btn">
                                        <i class="fas fa-plus"></i> <span class="btn-text">Adicionar ao Pedido</span>
                                    </button>
                                    <div class="highlight-dot dot-1"></div>
                                    <div class="highlight-dot dot-2"></div>
                                </div>
                            `;

          menuItemsContainer.innerHTML += productHtml;
        });

        // Aplicar efeito stagger nos novos itens
        const staggerItems =
          menuItemsContainer.querySelectorAll(".stagger-item");
        staggerItems.forEach((item, index) => {
          setTimeout(() => {
            item.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
          }, 100 * index);
        });
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  }

  function bindEvents() {
    // Add to cart buttons
    document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation();
        const menuItem = this.closest(".menu-item");
        addToCart(menuItem);
      });
    });

    // Cart button
    cartButton.addEventListener("click", function () {
      openModal();
    });

    // Close modal
    closeModalBtn.addEventListener("click", function () {
      closeModal();
    });

    // Close modal on background click
    orderModal.addEventListener("click", function (e) {
      if (e.target === orderModal) {
        closeModal();
      }
    });

    // Submit order
    orderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      sendOrder();
    });

    // Keyboard support
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeModal();
      }
    });
  }

  function addToCart(menuItem) {
    const title = menuItem.querySelector(".item-title").textContent;
    const section = menuItem
      .closest(".menu-category")
      .querySelector(".category-title").textContent;
    const price = parseFloat(menuItem.dataset.price) || 0;

    // Check if the product is already in the cart
    const existingItem = cart.find(
      (item) => item.title === title && item.section === section
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        title: title,
        section: section,
        price: price,
        quantity: 1,
      });
    }

    // Update UI
    updateCartCount();
    updateCartItems();
    updateCartTotal(); // Adicionada esta função

    // Visual feedback
    const button = menuItem.querySelector(".add-to-cart-btn");
    button.innerHTML = '<i class="fas fa-check"></i> Adicionado';
    button.style.backgroundColor = "#5cb85c";

    setTimeout(() => {
      button.innerHTML = '<i class="fas fa-plus"></i> Adicionar ao Pedido';
      button.style.backgroundColor = "";
    }, 1500);
  }

  function updateCartCount() {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

    totalItems.textContent = itemCount;
    cartCount.textContent = itemCount;

    if (itemCount > 0) {
      cartCount.classList.add("active");
      cartEmpty.style.display = "none";
      cartList.classList.add("active");
    } else {
      cartCount.classList.remove("active");
      cartEmpty.style.display = "block";
      cartList.classList.remove("active");
    }
  }

  function updateCartItems() {
    cartList.innerHTML = "";

    cart.forEach((item) => {
      const cartItem = document.createElement("div");
      cartItem.className = "cart-item";
      cartItem.dataset.id = item.id;

      const itemTotal = (item.price * item.quantity).toFixed(2);

      cartItem.innerHTML = `
                        <div class="cart-item-info">
                            <div class="cart-item-title">${item.title}</div>
                            <div class="cart-item-category">${
                              item.section
                            }</div>
                            <div class="cart-item-price">R$ ${item.price.toFixed(
                              2
                            )} un.</div>
                            <div class="cart-item-total">Subtotal: R$ ${itemTotal}</div>
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
      const decreaseBtn = cartItem.querySelector(".decrease-btn");
      const increaseBtn = cartItem.querySelector(".increase-btn");
      const removeBtn = cartItem.querySelector(".remove-item");

      decreaseBtn.addEventListener("click", () => {
        decreaseQuantity(item.id);
      });

      increaseBtn.addEventListener("click", () => {
        increaseQuantity(item.id);
      });

      removeBtn.addEventListener("click", () => {
        removeFromCart(item.id);
      });
    });

    // Atualizar o total do carrinho
    updateCartTotal();
  }

  function updateCartTotal() {
    const totalAmount = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    // Verificar se o elemento para o total existe, se não, criar
    let cartTotalElement = document.querySelector(".cart-total-amount");
    if (!cartTotalElement) {
      const cartTotalDiv = document.createElement("div");
      cartTotalDiv.className = "cart-total-container";
      cartTotalDiv.innerHTML = `
                        <div class="cart-total-label">Valor Total:</div>
                        <div class="cart-total-amount">R$ ${totalAmount.toFixed(
                          2
                        )}</div>
                    `;

      // Inserir antes do formulário de pedido
      const orderForm = document.getElementById("orderForm");
      if (orderForm && orderForm.parentNode) {
        orderForm.parentNode.insertBefore(cartTotalDiv, orderForm);
      }
    } else {
      // Atualizar valor
      cartTotalElement.textContent = `R$ ${totalAmount.toFixed(2)}`;
    }
  }

  function increaseQuantity(id) {
    const itemIndex = cart.findIndex((item) => item.id === id);

    if (itemIndex !== -1) {
      cart[itemIndex].quantity += 1;
      updateCartCount();
      updateCartItems();
    }
  }

  function removeFromCart(id) {
    cart = cart.filter((item) => item.id !== id);
    updateCartCount();
    updateCartItems();
  }

  function openModal() {
    orderModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    orderModal.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Modifique a função sendOrder() no script.js, especificamente a parte onde
  // o link de rastreamento é gerado e aberto

  async function sendOrder() {
    if (cart.length === 0) {
      alert("Por favor, adicione produtos ao seu pedido antes de continuar.");
      return;
    }

    // Get form data
    const name = document.getElementById("customerName").value;
    const phone = document.getElementById("customerPhone").value;
    const notes = document.getElementById("customerNotes").value;

    // Validate required fields
    if (!name || !phone) {
      alert(
        "Por favor, preencha todos os campos obrigatórios (nome e telefone)."
      );
      return;
    }

    // Calcular valor total
    const totalAmount = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const totalItemCount = cart.reduce(
      (total, item) => total + item.quantity,
      0
    );

    // Mostrar loading
    document.body.style.cursor = "wait";
    orderModal.style.pointerEvents = "none";

    try {
      // Dados para salvar no banco de dados
      const pedido = {
        cliente: name,
        telefone: phone,
        itens: JSON.stringify(cart),
        total_itens: totalItemCount,
        valor_total: totalAmount,
        status: "novo",
        data_pedido: new Date().toISOString(),
      };

      // Salvar pedido no banco de dados
      const savedOrder = await window.dbFunctions.adicionarPedido(pedido);

      if (!savedOrder) {
        throw new Error("Erro ao salvar o pedido no banco de dados.");
      }

      // Obter nome do repositório a partir da URL atual
      const currentUrl = window.location.href;
      const repoBaseUrl = currentUrl.substring(
        0,
        currentUrl.lastIndexOf("/") + 1
      );
      const trackingUrl = `${repoBaseUrl}tracking.html?id=${savedOrder.id}`;

      // Prepare message for WhatsApp
      let message = `*✨ NOVO PEDIDO - DELÍCIA D'BROWNIE ✨*\n\n`;
      message += `*👤 Cliente:* ${name}\n`;
      message += `*📱 Telefone:* ${phone}\n\n`;

      message += `*🛒 ITENS DO PEDIDO:*\n`;

      // Group items by section
      const groupedItems = {};

      cart.forEach((item) => {
        if (!groupedItems[item.section]) {
          groupedItems[item.section] = [];
        }

        groupedItems[item.section].push(item);
      });

      // Add items to message by section
      for (const section in groupedItems) {
        message += `\n*${section}:*\n`;

        groupedItems[section].forEach((item) => {
          const itemTotal = (item.price * item.quantity).toFixed(2);
          message += `• ${item.quantity}x ${item.title} - R$ ${itemTotal}\n`;
        });
      }

      // Add notes if any
      if (notes) {
        message += `\n*📝 Observações:* ${notes}\n`;
      }

      // Total items and amount
      message += `\n*🔢 Total de Itens:* ${totalItemCount}`;
      message += `\n*💰 Valor Total:* R$ ${totalAmount.toFixed(2)}`;

      // Add pickup information
      message += `\n\n*📍 LOCAL DE RETIRADA:*`;
      message += `\nCoronel João Rodrigues da Silva, 202 - Lapa`;
      message += `\n⚠️ A retirada do pedido é por conta do cliente.`;

      // Add tracking link
      message += `\n\n*🔎 Rastreie seu pedido:*\n${trackingUrl}`;

      // Atualizar a mensagem no banco de dados
      await window.dbFunctions.atualizarPedido(savedOrder.id, {
        mensagem: message,
      });

      // Encode the message for WhatsApp
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/5541992480604?text=${encodedMessage}`;

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, "_blank");

      // Abrir página de rastreamento em uma nova aba
      window.open(trackingUrl, "_blank");

      // Limpar carrinho após o pedido bem-sucedido
      cart = [];
      updateCartCount();
      updateCartItems();
      orderForm.reset();
      closeModal();

      // Mostrar mensagem de sucesso
      alert(
        "Pedido enviado com sucesso! Você pode acompanhar o status do seu pedido pelo link enviado."
      );
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      alert(
        "Houve um erro ao processar seu pedido. Por favor, tente novamente."
      );
    } finally {
      // Resetar cursor e habilitar interação
      document.body.style.cursor = "default";
      orderModal.style.pointerEvents = "auto";
    }
}
});
