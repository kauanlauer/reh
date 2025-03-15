    document.addEventListener('DOMContentLoaded', function() {
        // Elementos do DOM
        const productList = document.getElementById('productList');
        const ordersList = document.getElementById('ordersList');
        const addProductForm = document.getElementById('addProductForm');
        const addProductBtn = document.getElementById('addProductBtn');
        const cancelAddProductBtn = document.getElementById('cancelAddProduct');
        const productForm = document.getElementById('productForm');
        const adminTabs = document.querySelectorAll('.admin-tab');
        const adminSections = document.querySelectorAll('.admin-section');
        const editProductForm = document.getElementById('editProductForm');
        const saveEditProductBtn = document.getElementById('saveEditProductBtn');
        const editProductModal = document.getElementById('editProductModal');
        const specificationFields = document.getElementById('specificationFields');
        const editSpecificationFields = document.getElementById('editSpecificationFields');
        const productCategory = document.getElementById('productCategory');
        const refreshDataBtn = document.getElementById('refreshDataBtn');
        const modalCloseBtns = document.querySelectorAll('.admin-modal-close, .modal-close-btn');
        const loginModal = document.getElementById('loginModal');
        
        // Esconder o modal de login - acesso livre conforme solicitado
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        // Inicializar
        initializeTabs();
        loadProducts();
        loadOrders();
        
        // Event Listeners
        addProductBtn.addEventListener('click', showAddProductForm);
        cancelAddProductBtn.addEventListener('click', hideAddProductForm);
        productForm.addEventListener('submit', handleProductSubmit);
        saveEditProductBtn.addEventListener('click', handleEditProductSubmit);
        refreshDataBtn.addEventListener('click', refreshData);
        
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-overlay');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        productCategory.addEventListener('change', function() {
            updateSpecificationFields(this.value, specificationFields);
        });
        
        // Funções
        function initializeTabs() {
            adminTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const target = this.dataset.target;
                    
                    // Atualizar tabs
                    adminTabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Atualizar seções
                    adminSections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === target) {
                            section.classList.add('active');
                        }
                    });
                });
            });
        }
        
        async function loadProducts() {
            productList.innerHTML = '<div class="loading">Carregando produtos...</div>';
            
            try {
                const products = await window.dbFunctions.getProdutos();
                
                if (products.length === 0) {
                    productList.innerHTML = '<div class="no-data">Nenhum produto cadastrado.</div>';
                    return;
                }
                
                let html = '';
                
                products.forEach(product => {
                    html += `
                        <div class="product-card" data-id="${product.id}">
                            <h3>${product.nome} <span class="product-card-price">R$ ${parseFloat(product.preco).toFixed(2)}</span></h3>
                            <div class="product-card-category">${product.categoria.nome}</div>
                            <p>${product.descricao}</p>
                            
                            <div class="product-specs">
                                ${formatSpecifications(product.especificacoes)}
                            </div>
                            
                            <div class="product-card-actions">
                                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">
                                    <i class="fas fa-trash-alt"></i> Excluir
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                productList.innerHTML = html;
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                productList.innerHTML = '<div class="error">Erro ao carregar produtos. Tente novamente.</div>';
            }
        }
        
        async function loadOrders() {
            ordersList.innerHTML = '<div class="loading">Carregando pedidos...</div>';
            
            try {
                const orders = await window.dbFunctions.getPedidos();
                
                if (orders.length === 0) {
                    ordersList.innerHTML = '<div class="no-data">Nenhum pedido registrado.</div>';
                    return;
                }
                
                let html = '';
                
                orders.forEach(order => {
                    const date = new Date(order.data_pedido).toLocaleString('pt-BR');
                    
                    html += `
                        <div class="order-card" data-id="${order.id}">
                            <div class="order-header">
                                <span class="order-id">#${order.id}</span>
                                <span class="order-date">${date}</span>
                                <span class="order-status status-${order.status}">${formatStatus(order.status)}</span>
                            </div>
                            
                            <div class="order-customer">
                                <p><strong>Cliente:</strong> <span>${order.cliente}</span></p>
                                <p><strong>Telefone:</strong> <span>${order.telefone}</span></p>
                                <p><strong>Total de Itens:</strong> <span>${order.total_itens}</span></p>
                            </div>
                            
                            <div class="order-actions">
                                <button class="admin-btn" onclick="viewOrder(${order.id})">
                                    <i class="fas fa-eye"></i> Ver Detalhes
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                ordersList.innerHTML = html;
            } catch (error) {
                console.error('Erro ao carregar pedidos:', error);
                ordersList.innerHTML = '<div class="error">Erro ao carregar pedidos. Tente novamente.</div>';
            }
        }
        
        function showAddProductForm() {
            loadCategories();
            addProductForm.style.display = 'block';
            addProductBtn.style.display = 'none';
        }
        
        function hideAddProductForm() {
            addProductForm.style.display = 'none';
            addProductBtn.style.display = 'block';
            productForm.reset();
            specificationFields.innerHTML = '';
        }
        
        async function loadCategories() {
            try {
                const categories = await window.dbFunctions.getCategorias();
                
                let optionsHtml = '<option value="">Selecione uma categoria</option>';
                
                categories.forEach(category => {
                    optionsHtml += `<option value="${category.slug}">${category.nome}</option>`;
                });
                
                productCategory.innerHTML = optionsHtml;
            } catch (error) {
                console.error('Erro ao carregar categorias:', error);
            }
        }
        
        function updateSpecificationFields(categorySlug, container) {
            container.innerHTML = '';
            
            if (!categorySlug) return;
            
            let fieldsHtml = '';
            
            switch (categorySlug) {
                case 'bolos':
                    fieldsHtml = `
                        <h4>Especificações do Bolo Vulcão</h4>
                        <div class="form-group">
                            <label for="specMassa">Massa</label>
                            <input type="text" id="specMassa" class="form-control" placeholder="Ex: Chocolate">
                        </div>
                        <div class="form-group">
                            <label for="specRecheio">Recheio</label>
                            <input type="text" id="specRecheio" class="form-control" placeholder="Ex: Brigadeiro">
                        </div>
                        <div class="form-group">
                            <label for="specFinalizacao">Finalização</label>
                            <input type="text" id="specFinalizacao" class="form-control" placeholder="Ex: Granulado">
                        </div>
                    `;
                    break;
                    
                case 'brownies':
                    fieldsHtml = `
                        <h4>Sabores Disponíveis</h4>
                        <div class="form-group">
                            <label for="specSabor1">Sabor 1</label>
                            <input type="text" id="specSabor1" class="form-control" placeholder="Ex: Chocolate">
                        </div>
                        <div class="form-group">
                            <label for="specSabor2">Sabor 2</label>
                            <input type="text" id="specSabor2" class="form-control" placeholder="Ex: Doce de leite">
                        </div>
                        <div class="form-group">
                            <label for="specSabor3">Sabor 3</label>
                            <input type="text" id="specSabor3" class="form-control" placeholder="Ex: Chocolate branco">
                        </div>
                    `;
                    break;
                    
                case 'copos':
                    // Copos da Felicidade não têm especificações adicionais
                    fieldsHtml = `
                        <p class="form-note">Não há especificações adicionais para Copos da Felicidade.</p>
                    `;
                    break;
            }
            
            container.innerHTML = fieldsHtml;
        }
        
        async function handleProductSubmit(e) {
            e.preventDefault();
            
            const productName = document.getElementById('productName').value;
            const categorySlug = document.getElementById('productCategory').value;
            const productPrice = parseFloat(document.getElementById('productPrice').value);
            const productDescription = document.getElementById('productDescription').value;
            
            // Validar campos
            if (!productName || !categorySlug || isNaN(productPrice) || !productDescription) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            
            try {
                // Buscar ID da categoria
                const categories = await window.dbFunctions.getCategorias();
                const category = categories.find(cat => cat.slug === categorySlug);
                
                if (!category) {
                    alert('Categoria não encontrada.');
                    return;
                }
                
                // Construir especificações
                let specifications = {};
                
                switch (categorySlug) {
                    case 'bolos':
                        specifications = {
                            massa: document.getElementById('specMassa')?.value || '',
                            recheio: document.getElementById('specRecheio')?.value || '',
                            finalizacao: document.getElementById('specFinalizacao')?.value || ''
                        };
                        break;
                        
                    case 'brownies':
                        const sabores = [];
                        const sabor1 = document.getElementById('specSabor1')?.value;
                        const sabor2 = document.getElementById('specSabor2')?.value;
                        const sabor3 = document.getElementById('specSabor3')?.value;
                        
                        if (sabor1) sabores.push(sabor1);
                        if (sabor2) sabores.push(sabor2);
                        if (sabor3) sabores.push(sabor3);
                        
                        specifications = { sabores };
                        break;
                        
                    case 'copos':
                        specifications = {};
                        break;
                }
                
                // Criar produto
                const newProduct = {
                    nome: productName,
                    categoria_id: category.id,
                    descricao: productDescription,
                    preco: productPrice,
                    especificacoes: specifications
                };
                
                const product = await window.dbFunctions.adicionarProduto(newProduct);
                
                if (product) {
                    alert('Produto adicionado com sucesso!');
                    hideAddProductForm();
                    loadProducts();
                }
            } catch (error) {
                console.error('Erro ao adicionar produto:', error);
                alert('Erro ao adicionar produto. Tente novamente.');
            }
        }
        
        function formatSpecifications(specs) {
            if (!specs || Object.keys(specs).length === 0) {
                return '';
            }
            
            let html = '<div class="specs-list">';
            
            if (specs.massa) {
                html += `<div class="spec-item"><strong>Massa:</strong> ${specs.massa}</div>`;
            }
            
            if (specs.recheio) {
                html += `<div class="spec-item"><strong>Recheio:</strong> ${specs.recheio}</div>`;
            }
            
            if (specs.finalizacao) {
                html += `<div class="spec-item"><strong>Finalização:</strong> ${specs.finalizacao}</div>`;
            }
            
            if (specs.sabores && Array.isArray(specs.sabores)) {
                html += `<div class="spec-item"><strong>Sabores:</strong> ${specs.sabores.join(', ')}</div>`;
            }
            
            html += '</div>';
            
            return html;
        }
        
        function formatStatus(status) {
            const statusMap = {
                'novo': 'Novo',
                'preparo': 'Em Preparo',
                'entrega': 'Em Entrega',
                'concluido': 'Concluído',
                'cancelado': 'Cancelado'
            };
            
            return statusMap[status] || status;
        }
        
        async function refreshData() {
            loadProducts();
            loadOrders();
        }
        
        // Funções globais para acesso nos botões
        window.editProduct = async function(id) {
            try {
                const products = await window.dbFunctions.getProdutos();
                const product = products.find(p => p.id === id);
                
                if (!product) {
                    alert('Produto não encontrado.');
                    return;
                }
                
                document.getElementById('editProductId').value = product.id;
                document.getElementById('editProductName').value = product.nome;
                document.getElementById('editProductPrice').value = product.preco;
                document.getElementById('editProductDescription').value = product.descricao;
                
                // Configurar campos de especificação
                const categorySlug = product.categoria.slug;
                updateSpecificationFields(categorySlug, editSpecificationFields);
                
                // Preencher os campos de especificação
                if (categorySlug === 'bolos') {
                    setTimeout(() => {
                        if (document.getElementById('specMassa')) {
                            document.getElementById('specMassa').value = product.especificacoes.massa || '';
                        }
                        if (document.getElementById('specRecheio')) {
                            document.getElementById('specRecheio').value = product.especificacoes.recheio || '';
                        }
                        if (document.getElementById('specFinalizacao')) {
                            document.getElementById('specFinalizacao').value = product.especificacoes.finalizacao || '';
                        }
                    }, 100);
                } else if (categorySlug === 'brownies' && product.especificacoes.sabores) {
                    setTimeout(() => {
                        const sabores = product.especificacoes.sabores;
                        if (document.getElementById('specSabor1')) {
                            document.getElementById('specSabor1').value = sabores[0] || '';
                        }
                        if (document.getElementById('specSabor2')) {
                            document.getElementById('specSabor2').value = sabores[1] || '';
                        }
                        if (document.getElementById('specSabor3')) {
                            document.getElementById('specSabor3').value = sabores[2] || '';
                        }
                    }, 100);
                }
                
                // Mostrar modal
                editProductModal.classList.add('active');
            } catch (error) {
                console.error('Erro ao editar produto:', error);
                alert('Erro ao editar produto. Tente novamente.');
            }
        };
        
        window.deleteProduct = async function(id) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                try {
                    const success = await window.dbFunctions.excluirProduto(id);
                    
                    if (success) {
                        alert('Produto excluído com sucesso!');
                        loadProducts();
                    }
                } catch (error) {
                    console.error('Erro ao excluir produto:', error);
                    alert('Erro ao excluir produto. Tente novamente.');
                }
            }
        };
        
        window.viewOrder = async function(id) {
            try {
                const order = await window.dbFunctions.getPedidoPorId(id);
                
                if (!order) {
                    alert('Pedido não encontrado.');
                    return;
                }
                
                const orderDetails = document.getElementById('orderDetails');
                const date = new Date(order.data_pedido).toLocaleString('pt-BR');
                const itens = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens;
                
                let itemsHtml = '';
                let totalValue = 0;
                
                if (Array.isArray(itens)) {
                    itens.forEach(item => {
                        const itemPrice = item.price || 0;
                        const itemQuantity = item.quantity || 0;
                        const itemTotal = itemPrice * itemQuantity;
                        totalValue += itemTotal;
                        
                        itemsHtml += `
                            <div class="order-item">
                                <div class="item-name">${item.title}</div>
                                <div class="item-category">${item.section}</div>
                                <div class="item-price">R$ ${itemPrice.toFixed(2)} un.</div>
                                <div class="item-quantity">${itemQuantity}x</div>
                                <div class="item-total">R$ ${itemTotal.toFixed(2)}</div>
                            </div>
                        `;
                    });
                }
                
                // Usar o valor_total do banco de dados, se disponível
                const orderTotal = order.valor_total !== undefined ? order.valor_total : totalValue;
                
                orderDetails.innerHTML = `
                    <div class="order-details-header">
                        <h4>Pedido #${order.id}</h4>
                        <span class="order-details-date">${date}</span>
                        <span class="order-status status-${order.status}">${formatStatus(order.status)}</span>
                    </div>
                    
                    <div class="order-details-customer">
                        <p><strong>Cliente:</strong> ${order.cliente}</p>
                        <p><strong>Telefone:</strong> ${order.telefone}</p>
                        <p><strong>Endereço:</strong> ${order.endereco}</p>
                        ${order.referencia ? `<p><strong>Referência:</strong> ${order.referencia}</p>` : ''}
                        ${order.observacoes ? `<p><strong>Observações:</strong> ${order.observacoes}</p>` : ''}
                    </div>
                    
                    <h4>Itens do Pedido</h4>
                    <div class="order-details-items">
                        ${itemsHtml}
                    </div>
                    
                    <div class="order-details-total">
                        <p><strong>Total de Itens:</strong> ${order.total_itens}</p>
                        <p><strong>Valor Total:</strong> R$ ${orderTotal.toFixed(2)}</p>
                    </div>
                `;
                
                // Configurar botões de status
                const orderStatusActions = document.getElementById('orderStatusActions');
                orderStatusActions.innerHTML = '';
                
                switch (order.status) {
                    case 'novo':
                        orderStatusActions.innerHTML = `
                            <button class="admin-btn" onclick="updateOrderStatus(${order.id}, 'preparo')">
                                <i class="fas fa-utensils"></i> Iniciar Preparo
                            </button>
                            <button class="admin-btn admin-btn-outline" onclick="updateOrderStatus(${order.id}, 'cancelado')">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        `;
                        break;
                        
                    case 'preparo':
                        orderStatusActions.innerHTML = `
                            <button class="admin-btn" onclick="updateOrderStatus(${order.id}, 'entrega')">
                                <i class="fas fa-truck"></i> Enviar para Entrega
                            </button>
                        `;
                        break;
                        
                    case 'entrega':
                        orderStatusActions.innerHTML = `
                            <button class="admin-btn" onclick="updateOrderStatus(${order.id}, 'concluido')">
                                <i class="fas fa-check"></i> Marcar como Concluído
                            </button>
                        `;
                        break;
                }
                
                // Mostrar modal
                document.getElementById('viewOrderModal').classList.add('active');
            } catch (error) {
                console.error('Erro ao visualizar pedido:', error);
                alert('Erro ao visualizar pedido. Tente novamente.');
            }
        };
        
        window.updateOrderStatus = async function(id, status) {
            try {
                const order = await window.dbFunctions.atualizarStatusPedido(id, status);
                
                if (order) {
                    // Atualizar data_atualizacao para que seja exibida corretamente na página de rastreio
                    await window.dbFunctions.atualizarPedido(id, {
                        data_atualizacao: new Date().toISOString()
                    });
                    
                    alert('Status do pedido atualizado com sucesso!');
                    document.getElementById('viewOrderModal').classList.remove('active');
                    loadOrders();
                }
            } catch (error) {
                console.error('Erro ao atualizar status do pedido:', error);
                alert('Erro ao atualizar status do pedido. Tente novamente.');
            }
        };
        
        async function handleEditProductSubmit() {
            const id = document.getElementById('editProductId').value;
            const name = document.getElementById('editProductName').value;
            const price = parseFloat(document.getElementById('editProductPrice').value);
            const description = document.getElementById('editProductDescription').value;
            
            if (!name || isNaN(price) || !description) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            
            try {
                // Buscar produto atual para obter a categoria
                const products = await window.dbFunctions.getProdutos();
                const product = products.find(p => p.id == id);
                
                if (!product) {
                    alert('Produto não encontrado.');
                    return;
                }
                
                // Construir especificações
                let specifications = {};
                const categorySlug = product.categoria.slug;
                
                switch (categorySlug) {
                    case 'bolos':
                        specifications = {
                            massa: document.getElementById('specMassa')?.value || '',
                            recheio: document.getElementById('specRecheio')?.value || '',
                            finalizacao: document.getElementById('specFinalizacao')?.value || ''
                        };
                        break;
                        
                    case 'brownies':
                        const sabores = [];
                        const sabor1 = document.getElementById('specSabor1')?.value;
                        const sabor2 = document.getElementById('specSabor2')?.value;
                        const sabor3 = document.getElementById('specSabor3')?.value;
                        
                        if (sabor1) sabores.push(sabor1);
                        if (sabor2) sabores.push(sabor2);
                        if (sabor3) sabores.push(sabor3);
                        
                        specifications = { sabores };
                        break;
                        
                    case 'copos':
                        specifications = {};
                        break;
                }
                
                // Atualizar produto
                const updatedProduct = {
                    nome: name,
                    descricao: description,
                    preco: price,
                    especificacoes: specifications
                };
                
                const updated = await window.dbFunctions.atualizarProduto(id, updatedProduct);
                
                if (updated) {
                    alert('Produto atualizado com sucesso!');
                    editProductModal.classList.remove('active');
                    loadProducts();
                }
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                alert('Erro ao atualizar produto. Tente novamente.');
            }
        }
    });