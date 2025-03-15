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
