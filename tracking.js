document.addEventListener('DOMContentLoaded', async function() {
    // Elementos do DOM
    const trackingContent = document.getElementById('trackingContent');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Obter o ID do pedido da URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    
    if (!orderId) {
        showError('ID do pedido não encontrado na URL. Por favor, verifique o link.');
        return;
    }
    
    // Mostrar loading
    showLoading();
    
    try {
        // Buscar informações do pedido
        const order = await window.dbFunctions.getPedidoPorId(orderId);
        
        if (!order) {
            showError('Pedido não encontrado. Por favor, verifique o ID do pedido.');
            return;
        }
        
        // Renderizar informações do pedido
        renderOrderDetails(order);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        showError('Ocorreu um erro ao carregar as informações do pedido. Por favor, tente novamente.');
    } finally {
        // Esconder loading
        hideLoading();
    }
    
    // Função para mostrar o loading
    function showLoading() {
        loadingOverlay.classList.add('active');
    }
    
    // Função para esconder o loading
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }
    
    // Função para mostrar mensagem de erro
    function showError(message) {
        trackingContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
        hideLoading();
    }
    
    // Função para renderizar os detalhes do pedido
    function renderOrderDetails(order) {
        // Converter data para formato local
        const orderDate = new Date(order.data_pedido).toLocaleString('pt-BR');
        
        // Parsear os itens do pedido
        const items = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens;
        
        // Montar a lista de itens
        let itemsHtml = '';
        
        if (Array.isArray(items)) {
            items.forEach(item => {
                const itemPrice = item.price || 0;
                const itemTotal = (itemPrice * item.quantity).toFixed(2);
                
                itemsHtml += `
                    <div class="tracking-item">
                        <div class="item-details">
                            <div class="item-name">${item.title}</div>
                            <div class="item-category">${item.section}</div>
                        </div>
                        <div class="item-quantity-price">
                            <div>${item.quantity}x R$ ${itemPrice.toFixed(2)}</div>
                            <div>R$ ${itemTotal}</div>
                        </div>
                    </div>
                `;
            });
        }
        
        // Determinar quais status estão ativos
        const statuses = [
            {
                id: 'novo',
                title: 'Pedido Recebido',
                description: 'Seu pedido foi recebido e está sendo preparado para processamento.',
                active: ['novo', 'preparo', 'concluido'].includes(order.status),
                date: orderDate
            },
            {
                id: 'preparo',
                title: 'Em Produção',
                description: 'Estamos preparando seu pedido com muito carinho.',
                active: ['preparo', 'concluido'].includes(order.status),
                date: order.status === 'preparo' || order.status === 'concluido' 
                    ? formatUpdateDate(order.data_atualizacao) 
                    : ''
            },
            {
                id: 'concluido',
                title: 'Pronto para Retirada',
                description: 'Seu pedido está pronto para retirada no endereço:<br><strong>Coronel João Rodrigues da Silva, 202 - Lapa</strong><br>A retirada do pedido é por conta do cliente.',
                active: ['concluido'].includes(order.status),
                date: order.status === 'concluido' 
                    ? formatUpdateDate(order.data_atualizacao) 
                    : ''
            }
        ];
        
        // Montar o HTML do status timeline
        let statusHtml = '<div class="status-timeline"><div class="timeline-line"></div>';
        
        statuses.forEach(status => {
            statusHtml += `
                <div class="status-step ${status.active ? 'active' : ''}">
                    <div class="status-title">${status.title}</div>
                    <div class="status-desc">${status.description}</div>
                    ${status.date ? `<div class="status-time">${status.date}</div>` : ''}
                </div>
            `;
        });
        
        statusHtml += '</div>';
        
        // Verificar se o pedido foi cancelado
        let canceledHtml = '';
        if (order.status === 'cancelado') {
            canceledHtml = `
                <div class="error-message">
                    <i class="fas fa-ban"></i>
                    <p>Este pedido foi cancelado em ${formatUpdateDate(order.data_atualizacao)}.</p>
                </div>
            `;
        }
        
        // Adicionar informação de retirada destacada se o pedido estiver pronto
        let pickupInfoHtml = '';
        if (order.status === 'concluido') {
            pickupInfoHtml = `
                <div class="pickup-info">
                    <p><i class="fas fa-map-marker-alt"></i> <strong>Local de Retirada:</strong> Coronel João Rodrigues da Silva, 202 - Lapa</p>
                    <p><i class="fas fa-info-circle"></i> A retirada do pedido é por conta do cliente.</p>
                </div>
            `;
        }
        
        // Montar o HTML completo da página
        trackingContent.innerHTML = `
            <div class="order-info">
                <div class="order-number">
                    <span>Pedido #${order.id}</span>
                    <button class="refresh-button" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i> Atualizar
                    </button>
                </div>
                <div class="order-date">Realizado em ${orderDate}</div>
                
                <div class="customer-info">
                    <p><strong>Cliente:</strong> <span>${order.cliente}</span></p>
                    <p><strong>Telefone:</strong> <span>${order.telefone}</span></p>
                </div>
                
                ${pickupInfoHtml}
                
                ${canceledHtml}
                
                ${order.status !== 'cancelado' ? statusHtml : ''}
                
                <h3>Itens do Pedido</h3>
                <div class="items-list">
                    ${itemsHtml}
                </div>
                
                <div class="total-section">
                    <span>Total:</span>
                    <span class="order-total">R$ ${(order.valor_total || 0).toFixed(2)}</span>
                </div>
            </div>
        `;
    }
    
    // Função para formatar a data de atualização
    function formatUpdateDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('pt-BR');
    }
});