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
    
    // ===== Financial Management Functions =====

// Global state for financial data
let financialData = {
    completedOrders: [],
    currentPage: 1,
    ordersPerPage: 10,
    dateRange: {
        start: null,
        end: null
    },
    filter: 'week'
};

// Initialize financial module
function initializeFinancial() {
    // Period filter change handler
    document.getElementById('financialPeriodFilter').addEventListener('change', function() {
        financialData.filter = this.value;
        
        if (this.value === 'custom') {
            document.getElementById('customDateRange').style.display = 'inline-block';
            // Set default date range to current week
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
            
            document.getElementById('startDate').valueAsDate = startOfWeek;
            document.getElementById('endDate').valueAsDate = today;
        } else {
            document.getElementById('customDateRange').style.display = 'none';
            loadFinancialData();
        }
    });
    
    // Apply custom date range
    document.getElementById('applyCustomDate').addEventListener('click', function() {
        const startDate = document.getElementById('startDate').valueAsDate;
        const endDate = document.getElementById('endDate').valueAsDate;
        
        if (startDate && endDate) {
            financialData.dateRange.start = startDate;
            financialData.dateRange.end = endDate;
            loadFinancialData();
        } else {
            alert('Por favor, selecione datas válidas.');
        }
    });
    
    // Export data button
    document.getElementById('exportFinancialData').addEventListener('click', exportFinancialData);
    
    // Print order details
    document.getElementById('printOrderDetails').addEventListener('click', function() {
        printOrderDetails();
    });
    
    // Load initial data
    loadFinancialData();
}

// Load financial data based on selected filters
async function loadFinancialData() {
    try {
        // Get all completed orders
        const orders = await window.dbFunctions.getPedidos();
        
        // Filter by status
        const completedOrders = orders.filter(order => order.status === 'concluido');
        
        // Apply date filters
        const filteredOrders = filterOrdersByDate(completedOrders, financialData.filter);
        
        // Store in state
        financialData.completedOrders = filteredOrders;
        
        // Update UI
        updateFinancialSummary(filteredOrders);
        updateCategorySales(filteredOrders);
        renderFinancialTable(filteredOrders);
        
    } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
        document.getElementById('financialTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="error">Erro ao carregar dados financeiros. Tente novamente.</td>
            </tr>
        `;
    }
}

// Filter orders by selected date range
function filterOrdersByDate(orders, filter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    let start, end;
    
    switch (filter) {
        case 'today':
            start = today;
            end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
            
        case 'yesterday':
            start = yesterday;
            end = today;
            break;
            
        case 'week':
            start = startOfWeek;
            end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
            
        case 'month':
            start = startOfMonth;
            end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            break;
            
        case 'custom':
            start = financialData.dateRange.start;
            end = new Date(financialData.dateRange.end.getTime() + 24 * 60 * 60 * 1000);
            break;
            
        default:
            start = null;
            end = null;
    }
    
    if (!start || !end) {
        return orders;
    }
    
    return orders.filter(order => {
        const orderDate = new Date(order.data_pedido);
        return orderDate >= start && orderDate < end;
    });
}

// Update financial summary metrics
function updateFinancialSummary(orders) {
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.valor_total) || 0), 0);
    
    // Calculate total items sold
    const totalItems = orders.reduce((sum, order) => sum + (parseInt(order.total_itens) || 0), 0);
    
    // Calculate average order value
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    // Update UI
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalRevenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('averageOrderValue').textContent = `R$ ${averageOrderValue.toFixed(2)}`;
}

// Update category sales statistics
function updateCategorySales(orders) {
    const categoryContainer = document.getElementById('categorySalesContainer');
    categoryContainer.innerHTML = '<div class="loading">Calculando estatísticas...</div>';
    
    // Process all orders to get category data
    const categoryData = {};
    
    orders.forEach(order => {
        try {
            const items = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens;
            
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const category = item.section;
                    const price = parseFloat(item.price) || 0;
                    const quantity = parseInt(item.quantity) || 0;
                    const totalValue = price * quantity;
                    
                    if (!categoryData[category]) {
                        categoryData[category] = {
                            itemsSold: 0,
                            totalValue: 0,
                            products: {}
                        };
                    }
                    
                    categoryData[category].itemsSold += quantity;
                    categoryData[category].totalValue += totalValue;
                    
                    // Track product-specific data
                    if (!categoryData[category].products[item.title]) {
                        categoryData[category].products[item.title] = {
                            quantity: 0,
                            value: 0
                        };
                    }
                    
                    categoryData[category].products[item.title].quantity += quantity;
                    categoryData[category].products[item.title].value += totalValue;
                });
            }
        } catch (error) {
            console.error('Erro ao processar itens do pedido:', error);
        }
    });
    
    // Render category cards
    let html = '';
    
    if (Object.keys(categoryData).length === 0) {
        html = '<div class="no-data">Nenhum dado disponível para o período selecionado.</div>';
    } else {
        for (const category in categoryData) {
            const data = categoryData[category];
            
            // Sort products by quantity sold (descending)
            const sortedProducts = Object.entries(data.products)
                .sort((a, b) => b[1].quantity - a[1].quantity)
                .slice(0, 3); // Top 3 products
            
            html += `
                <div class="category-card">
                    <div class="category-name">
                        ${category}
                        <span class="category-amount">R$ ${data.totalValue.toFixed(2)}</span>
                    </div>
                    
                    <div class="category-stats-list">
                        <div class="category-stat-item">
                            <span class="category-stat-label">Itens Vendidos</span>
                            <span class="category-stat-value">${data.itemsSold}</span>
                        </div>
                        
                        <div class="category-stat-item">
                            <span class="category-stat-label">Produtos Mais Vendidos</span>
                            <span class="category-stat-value"></span>
                        </div>
                        
                        ${sortedProducts.map(([product, stats]) => `
                            <div class="category-stat-item" style="padding-left: 1rem;">
                                <span class="category-stat-label">${product}</span>
                                <span class="category-stat-value">${stats.quantity}x</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    categoryContainer.innerHTML = html;
}

// Render financial table with pagination
function renderFinancialTable(orders) {
    const tableBody = document.getElementById('financialTableBody');
    const paginationContainer = document.getElementById('financialPagination');
    
    // Reset
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">Nenhum pedido concluído no período selecionado.</td>
            </tr>
        `;
        paginationContainer.innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(orders.length / financialData.ordersPerPage);
    const start = (financialData.currentPage - 1) * financialData.ordersPerPage;
    const end = start + financialData.ordersPerPage;
    const paginatedOrders = orders.slice(start, end);
    
    // Render table rows
    paginatedOrders.forEach(order => {
        const date = new Date(order.data_pedido).toLocaleString('pt-BR');
        const formattedValue = `R$ ${parseFloat(order.valor_total).toFixed(2)}`;
        
        tableBody.innerHTML += `
            <tr>
                <td>#${order.id}</td>
                <td>${date}</td>
                <td>${order.cliente}</td>
                <td>${order.total_itens}</td>
                <td>${formattedValue}</td>
                <td>
                    <button class="admin-btn admin-btn-outline" onclick="viewFinancialDetails(${order.id})">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </td>
            </tr>
        `;
    });
    
    // Render pagination
    renderFinancialPagination(totalPages);
}

// Render pagination controls
function renderFinancialPagination(totalPages) {
    const paginationContainer = document.getElementById('financialPagination');
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    if (financialData.currentPage > 1) {
        paginationContainer.innerHTML += `
            <button class="page-btn" onclick="changePage(${financialData.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Page buttons
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= financialData.currentPage - 1 && i <= financialData.currentPage + 1)
        ) {
            paginationContainer.innerHTML += `
                <button class="page-btn ${i === financialData.currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (
            i === financialData.currentPage - 2 || 
            i === financialData.currentPage + 2
        ) {
            paginationContainer.innerHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Next button
    if (financialData.currentPage < totalPages) {
        paginationContainer.innerHTML += `
            <button class="page-btn" onclick="changePage(${financialData.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
}

// Change page handler
window.changePage = function(page) {
    financialData.currentPage = page;
    renderFinancialTable(financialData.completedOrders);
};

// View financial order details
window.viewFinancialDetails = async function(id) {
    try {
        const order = await window.dbFunctions.getPedidoPorId(id);
        
        if (!order) {
            alert('Pedido não encontrado.');
            return;
        }
        
        const orderDetailsContainer = document.getElementById('financialOrderDetails');
        const orderDate = new Date(order.data_pedido).toLocaleString('pt-BR');
        const updateDate = order.data_atualizacao ? new Date(order.data_atualizacao).toLocaleString('pt-BR') : '-';
        
        // Parse order items
        const items = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens;
        
        let itemsHtml = '';
        let totalValue = 0;
        
        if (Array.isArray(items)) {
            items.forEach(item => {
                const itemPrice = parseFloat(item.price) || 0;
                const itemQuantity = parseInt(item.quantity) || 0;
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
        
        // Render order details
        orderDetailsContainer.innerHTML = `
            <div class="order-details-header">
                <h4>Pedido #${order.id}</h4>
                <div class="order-details-dates">
                    <div>Data do pedido: ${orderDate}</div>
                    <div>Data de conclusão: ${updateDate}</div>
                </div>
                <span class="order-status status-${order.status}">${formatStatus(order.status)}</span>
            </div>
            
            <div class="order-details-section">
                <h5>Informações do Cliente</h5>
                <div class="order-details-customer">
                    <p><strong>Cliente:</strong> ${order.cliente}</p>
                    <p><strong>Telefone:</strong> ${order.telefone}</p>
                    <p><strong>Endereço:</strong> ${order.endereco}</p>
                    ${order.referencia ? `<p><strong>Referência:</strong> ${order.referencia}</p>` : ''}
                </div>
            </div>
            
            <div class="order-details-section">
                <h5>Itens do Pedido</h5>
                <div class="order-details-items">
                    ${itemsHtml}
                </div>
                
                <div class="order-details-total">
                    <p><strong>Total de Itens:</strong> ${order.total_itens}</p>
                    <p><strong>Valor Total:</strong> R$ ${parseFloat(order.valor_total).toFixed(2)}</p>
                </div>
            </div>
            
            ${order.observacoes ? `
                <div class="order-details-section">
                    <h5>Observações</h5>
                    <div class="order-notes">
                        ${order.observacoes}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Show modal
        document.getElementById('financialDetailsModal').classList.add('active');
        
    } catch (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
        alert('Erro ao carregar detalhes do pedido. Tente novamente.');
    }
};

// Format order status
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

// Export financial data to CSV
function exportFinancialData() {
    const orders = financialData.completedOrders;
    
    if (orders.length === 0) {
        alert('Não há dados para exportar no período selecionado.');
        return;
    }
    
    try {
        // Prepare CSV header
        let csvContent = 'ID,Data,Cliente,Telefone,Endereço,Total de Itens,Valor Total\n';
        
        // Add order data
        orders.forEach(order => {
            const date = new Date(order.data_pedido).toLocaleDateString('pt-BR');
            const totalValue = parseFloat(order.valor_total).toFixed(2);
            
            // Escape fields that might contain commas
            const escapedClient = `"${order.cliente.replace(/"/g, '""')}"`;
            const escapedPhone = `"${order.telefone.replace(/"/g, '""')}"`;
            const escapedAddress = `"${order.endereco.replace(/"/g, '""')}"`;
            
            csvContent += `${order.id},${date},${escapedClient},${escapedPhone},${escapedAddress},${order.total_itens},${totalValue}\n`;
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Set filename based on date range
        let filename = 'relatorio-financeiro_';
        if (financialData.filter === 'custom') {
            const start = financialData.dateRange.start.toLocaleDateString('pt-BR').replace(/\//g, '-');
            const end = financialData.dateRange.end.toLocaleDateString('pt-BR').replace(/\//g, '-');
            filename += `${start}_a_${end}.csv`;
        } else {
            filename += `${financialData.filter}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
        }
        
        // Create and click download link
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        alert('Erro ao exportar dados. Tente novamente.');
    }
}

// Print order details
function printOrderDetails() {
    const detailsContainer = document.getElementById('financialOrderDetails');
    
    if (!detailsContainer) {
        alert('Erro ao preparar impressão.');
        return;
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Por favor, permita popups para imprimir.');
        return;
    }
    
    // Add content to the print window
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Detalhes do Pedido</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                
                h1, h2, h3, h4, h5 {
                    margin-top: 20px;
                    margin-bottom: 10px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #ddd;
                }
                
                .company-name {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .order-id {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .order-date {
                    font-size: 14px;
                    color: #666;
                }
                
                .section {
                    margin-bottom: 20px;
                }
                
                .section h5 {
                    font-size: 16px;
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #eee;
                }
                
                .customer-info p {
                    margin: 5px 0;
                }
                
                .items-container {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                
                .items-container th {
                    background-color: #f2f2f2;
                    padding: 8px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                
                .items-container td {
                    padding: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .total-row {
                    font-weight: bold;
                }
                
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">Delícia D'Brownie</div>
                ${detailsContainer.querySelector('.order-details-header h4') ? 
                    `<div class="order-id">${detailsContainer.querySelector('.order-details-header h4').textContent}</div>` : ''}
                ${detailsContainer.querySelector('.order-details-dates') ? 
                    `<div class="order-date">${detailsContainer.querySelector('.order-details-dates').textContent}</div>` : ''}
            </div>
            
            <div class="section">
                <h5>Informações do Cliente</h5>
                <div class="customer-info">
                    ${detailsContainer.querySelector('.order-details-customer') ? 
                        detailsContainer.querySelector('.order-details-customer').innerHTML : ''}
                </div>
            </div>
            
            <div class="section">
                <h5>Itens do Pedido</h5>
                <table class="items-container">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Categoria</th>
                            <th>Preço Unit.</th>
                            <th>Qtd</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(detailsContainer.querySelectorAll('.order-item')).map(item => `
                            <tr>
                                <td>${item.querySelector('.item-name') ? item.querySelector('.item-name').textContent : ''}</td>
                                <td>${item.querySelector('.item-category') ? item.querySelector('.item-category').textContent : ''}</td>
                                <td>${item.querySelector('.item-price') ? item.querySelector('.item-price').textContent : ''}</td>
                                <td>${item.querySelector('.item-quantity') ? item.querySelector('.item-quantity').textContent : ''}</td>
                                <td>${item.querySelector('.item-total') ? item.querySelector('.item-total').textContent : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3"></td>
                            <td>Total:</td>
                            <td>${detailsContainer.querySelector('.order-details-total p:last-child') ? 
                                detailsContainer.querySelector('.order-details-total p:last-child').textContent : ''}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            ${detailsContainer.querySelector('.order-notes') ? `
                <div class="section">
                    <h5>Observações</h5>
                    <div class="notes">
                        ${detailsContainer.querySelector('.order-notes').innerHTML}
                    </div>
                </div>
            ` : ''}
            
            <div class="footer">
                <p>Impresso em ${new Date().toLocaleString('pt-BR')}</p>
                <p>Delícia D'Brownie - (41) 99248-0604 - @_delicia_de_brownie_</p>
            </div>
        </body>
        </html>
    `);
    
    // Trigger print and close the window after printing
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        // Uncomment to close the window after printing
        // printWindow.close();
    };
}
