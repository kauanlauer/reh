// Inicializar módulo financeiro quando o documento for totalmente carregado
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeFinancial === 'function') {
        initializeFinancial();
    }
    
    // Atualizar o botão de refresh
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', function() {
            if (typeof loadFinancialData === 'function') {
                loadFinancialData();
            }
        });
    }
});
// Adicione este código ao financial.js

document.addEventListener('DOMContentLoaded', function() {
    // Função para criar versão responsiva da tabela financeira
    function initResponsiveFinancialTable() {
        // Verificar se estamos na página financeira
        const financialSection = document.getElementById('financial');
        if (!financialSection) return;
        
        // Verificar se a tabela existe
        const tableContainer = document.querySelector('.financial-table-container');
        if (!tableContainer) return;
        
        // Criar verificador de mídia para dispositivos móveis
        const mobileMediaQuery = window.matchMedia('(max-width: 768px)');
        
        // Função para adicionar rótulos às células da tabela
        function updateTableForMobile() {
            const table = document.querySelector('.financial-table');
            if (!table) return;
            
            // Aplicar classe de tabela responsiva
            table.classList.toggle('responsive-table', mobileMediaQuery.matches);
            
            // Em telas pequenas, adicionar atributos de data para CSS
            const headerTexts = [];
            const headerCells = table.querySelectorAll('thead th');
            
            // Coletar textos dos cabeçalhos
            headerCells.forEach(th => {
                headerTexts.push(th.textContent.trim());
            });
            
            // Aplicar aos dados da tabela
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, index) => {
                    if (index < headerTexts.length && index !== cells.length - 1) { // Não aplicar ao botão de ações
                        cell.setAttribute('data-label', headerTexts[index] + ':');
                    }
                });
            });
        }
        
        // Inicial e quando a tela é redimensionada
        updateTableForMobile();
        mobileMediaQuery.addEventListener('change', updateTableForMobile);
        
        // Também atualizar quando mudar de período
        const periodFilter = document.getElementById('financialPeriodFilter');
        if (periodFilter) {
            periodFilter.addEventListener('change', function() {
                // Dar tempo para os dados carregarem
                setTimeout(updateTableForMobile, 500);
            });
        }
    }
    
    // Atualizar estilo do dropdown financeiro
    function fixFinancialDropdown() {
        const periodFilter = document.getElementById('financialPeriodFilter');
        if (periodFilter) {
            // Garantir que o estilo esteja correto
            periodFilter.style.backgroundColor = 'rgba(57, 72, 57, 0.8)';
            periodFilter.style.color = '#f0f3f0';
            
            // Corrigir opções também
            const options = periodFilter.querySelectorAll('option');
            options.forEach(option => {
                option.style.backgroundColor = '#2d3c2d';
                option.style.color = '#f0f3f0';
                option.style.padding = '8px';
            });
        }
    }
    
    // Inicializar tudo
    if (typeof initializeFinancial === 'function') {
        initializeFinancial();
        
        // Inicializar recursos responsivos após um pequeno delay
        setTimeout(() => {
            initResponsiveFinancialTable();
            fixFinancialDropdown();
        }, 500);
    }
    
    // Atualizar quando algum botão de atualização for clicado
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', function() {
            if (typeof loadFinancialData === 'function') {
                loadFinancialData();
                
                // Atualizar responsividade após os dados carregarem
                setTimeout(() => {
                    initResponsiveFinancialTable();
                    fixFinancialDropdown();
                }, 500);
            }
        });
    }
});