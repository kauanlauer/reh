const db = window.db;
const auth = window.auth;

// --- VARIÁVEIS GLOBAIS ---
let produtoAtual = null;
let fichaTecnica = {
    ingredientes: [],
    custos_fixos: [],
    taxas_venda: []
};

// Padrões iniciais (para produtos novos)
let configPadrao = {
    custos_fixos: [
        { nome: 'Embalagem', valor: 1.50 },
        { nome: 'Adesivo/Fita', valor: 0.30 },
        { nome: 'Gás/Luz (Estimado)', valor: 0.50 }
    ],
    taxas_venda: [
        { nome: 'Taxa iFood', valor: 12 }, // %
        { nome: 'Maquininha', valor: 4 },  // %
        { nome: 'Impostos', valor: 0 }
    ]
};

let precoSimulado = 0;
let produtosCache = [];

// --- INICIALIZAÇÃO SEGURA (CORREÇÃO DO PROBLEMA) ---
document.addEventListener('DOMContentLoaded', () => {
    if (!db || !auth) {
        alert('Erro ao iniciar Firebase. Recarregue a página.');
        return;
    }

    window.AdminAuth.requireAdminPage(() => {
        carregarConfiguracoesGlobais();
        carregarListaProdutos();
    });

    // Configura a busca
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
});

// --- 1. CARREGAR DADOS ---

function carregarConfiguracoesGlobais() {
    db.collection('config').doc('custos_padrao').get()
        .then(doc => {
            if (doc.exists) {
                configPadrao = doc.data();
            }
        })
        .catch(erro => console.log("Usando configuração padrão local."));
}

function carregarListaProdutos() {
    const listaEl = document.getElementById('lista-produtos');
    listaEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
            <i class="ri-loader-4-line text-3xl mb-2 spin"></i>
            <p>Buscando seus produtos...</p>
        </div>`;

    // Busca em tempo real
    db.collection('produtos').orderBy('nome').onSnapshot(snap => {
        produtosCache = [];
        listaEl.innerHTML = '';

        if (snap.empty) {
            listaEl.innerHTML = `
                <div class="text-center py-12 px-6">
                    <div class="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="ri-shopping-bag-3-line text-2xl text-gray-400"></i>
                    </div>
                    <h3 class="text-gray-600 font-bold">Nenhum produto encontrado</h3>
                    <p class="text-xs text-gray-400 mt-1">Cadastre produtos na aba "Produtos" primeiro.</p>
                </div>`;
            return;
        }

        snap.forEach(doc => {
            produtosCache.push({ id: doc.id, ...doc.data() });
        });

        renderizarLista(produtosCache);
    }, erro => {
        console.error("Erro ao buscar produtos:", erro);
        listaEl.innerHTML = `<div class="p-4 text-center text-red-500">Erro ao carregar produtos: ${erro.message}</div>`;
    });
}

function renderizarLista(lista) {
    const listaEl = document.getElementById('lista-produtos');
    listaEl.innerHTML = '';

    lista.forEach(p => {
        const div = document.createElement('div');
        div.className = "bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 active:bg-gray-50 transition-colors cursor-pointer mb-3 group";
        div.onclick = () => abrirCalculadora(p);
        div.innerHTML = `
            <div class="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0 relative">
                <img src="${p.imagem}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100?text=Foto'">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 truncate text-sm group-hover:text-brand-600 transition-colors">${p.nome}</h4>
                <p class="text-xs text-gray-400">Venda atual: <span class="font-bold text-gray-600">${formatarMoeda(p.preco)}</span></p>
            </div>
            <div class="text-gray-300 group-hover:text-brand-500 transition-colors">
                <i class="ri-arrow-right-s-line text-xl"></i>
            </div>
        `;
        listaEl.appendChild(div);
    });

    const totalEl = document.getElementById('total-produtos');
    if (totalEl) totalEl.innerText = lista.length;
}

function filtrarProdutos() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const filtrados = produtosCache.filter(p => p.nome.toLowerCase().includes(termo));
    renderizarLista(filtrados);
}

// --- 2. CALCULADORA (LÓGICA) ---

async function abrirCalculadora(produto) {
    produtoAtual = produto;
    precoSimulado = produto.preco || 0;

    // Transição de Tela
    document.getElementById('screen-list').classList.add('hidden');
    document.getElementById('screen-detail').classList.remove('hidden');
    document.getElementById('screen-detail').classList.add('slide-in-right');

    // Reseta Scroll
    document.getElementById('scroll-content').scrollTop = 0;

    // Preenche Header
    document.getElementById('detail-img').src = produto.imagem || 'https://placehold.co/100';
    document.getElementById('detail-nome').innerText = produto.nome;
    document.getElementById('input-preco-simulado').value = produto.preco;

    // Reseta Dados Locais
    fichaTecnica = { ingredientes: [], custos_fixos: [], taxas_venda: [] };

    // Tenta buscar ficha existente no Firestore
    try {
        const doc = await db.collection('fichas_tecnicas').doc(produto.id).get();

        if (doc.exists) {
            const data = doc.data();
            fichaTecnica.ingredientes = data.ingredientes || [];
            // Se não tiver custos salvos, usa o padrão global
            fichaTecnica.custos_fixos = data.custos_fixos || JSON.parse(JSON.stringify(configPadrao.custos_fixos));
            fichaTecnica.taxas_venda = data.taxas_venda || JSON.parse(JSON.stringify(configPadrao.taxas_venda));
        } else {
            // Ficha nova: Usa padrões
            fichaTecnica.custos_fixos = JSON.parse(JSON.stringify(configPadrao.custos_fixos));
            fichaTecnica.taxas_venda = JSON.parse(JSON.stringify(configPadrao.taxas_venda));
            adicionarIngrediente(false); // Adiciona um vazio pra começar
        }

        renderizarIngredientes();
        renderizarCustosExtras();
        calcularResultados();

    } catch (erro) {
        console.error("Erro ao abrir calculadora:", erro);
        alert("Erro ao carregar detalhes do produto.");
    }
}

function fecharCalculadora() {
    const screenDetail = document.getElementById('screen-detail');
    screenDetail.classList.remove('slide-in-right');
    screenDetail.classList.add('hidden');
    document.getElementById('screen-list').classList.remove('hidden');
}

// --- 3. GESTÃO DE INGREDIENTES ---

function adicionarIngrediente(render = true) {
    fichaTecnica.ingredientes.push({
        nome: '',
        qtd_compra: 1,
        unidade_compra: 'kg',
        preco_compra: 0,
        qtd_uso: 0,
        unidade_uso: 'g'
    });

    if (render) {
        renderizarIngredientes();
        // Rola para o novo item
        setTimeout(() => {
            const list = document.getElementById('lista-ingredientes');
            if (list.lastElementChild) {
                list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
}

function removerIngrediente(idx) {
    if (confirm("Remover este ingrediente?")) {
        fichaTecnica.ingredientes.splice(idx, 1);
        renderizarIngredientes();
        calcularResultados();
    }
}

function renderizarIngredientes() {
    const container = document.getElementById('lista-ingredientes');
    container.innerHTML = '';

    fichaTecnica.ingredientes.forEach((ing, idx) => {
        const custo = calcularCustoItem(ing);

        const el = document.createElement('div');
        el.className = "bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 relative group fade-in";
        el.innerHTML = `
            <button onclick="removerIngrediente(${idx})" class="absolute -top-2 -right-2 bg-red-100 text-red-500 w-6 h-6 rounded-full flex items-center justify-center shadow-sm z-10">
                <i class="ri-close-line"></i>
            </button>
            
            <div class="mb-3">
                <input type="text" value="${ing.nome}" onchange="atualizarIng(${idx}, 'nome', this.value)" 
                    class="w-full font-bold text-gray-800 border-b border-gray-200 focus:border-brand-500 outline-none pb-1 placeholder-gray-300 text-sm" 
                    placeholder="Nome do Ingrediente (ex: Farinha)">
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
                <!-- Compra -->
                <div class="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <p class="text-gray-400 uppercase font-bold mb-1 text-[10px]">Compra (Emb.)</p>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-gray-400">R$</span>
                        <input type="number" step="0.01" value="${ing.preco_compra}" onchange="atualizarIng(${idx}, 'preco_compra', this.value)" class="w-full bg-transparent border-b border-gray-200 font-bold outline-none" placeholder="0.00">
                    </div>
                    <div class="flex gap-1">
                        <input type="number" value="${ing.qtd_compra}" onchange="atualizarIng(${idx}, 'qtd_compra', this.value)" class="w-1/2 bg-white border rounded px-1 py-0.5 text-center" placeholder="Qtd">
                        <select onchange="atualizarIng(${idx}, 'unidade_compra', this.value)" class="w-1/2 bg-white border rounded px-1 py-0.5">
                            <option value="kg" ${ing.unidade_compra === 'kg' ? 'selected' : ''}>Kg</option>
                            <option value="g" ${ing.unidade_compra === 'g' ? 'selected' : ''}>g</option>
                            <option value="l" ${ing.unidade_compra === 'l' ? 'selected' : ''}>L</option>
                            <option value="ml" ${ing.unidade_compra === 'ml' ? 'selected' : ''}>ml</option>
                            <option value="un" ${ing.unidade_compra === 'un' ? 'selected' : ''}>Un</option>
                        </select>
                    </div>
                </div>

                <!-- Uso -->
                <div class="bg-brand-50/50 p-2 rounded-lg border border-brand-100">
                    <p class="text-brand-400 uppercase font-bold mb-1 text-[10px]">Uso na Receita</p>
                    <div class="flex gap-1 mt-4">
                        <input type="number" value="${ing.qtd_uso}" onchange="atualizarIng(${idx}, 'qtd_uso', this.value)" class="w-1/2 bg-white border border-brand-200 rounded px-1 py-0.5 text-center font-bold text-brand-700" placeholder="Qtd">
                        <select onchange="atualizarIng(${idx}, 'unidade_uso', this.value)" class="w-1/2 bg-white border border-brand-200 rounded px-1 py-0.5 text-brand-700 font-bold">
                            <option value="kg" ${ing.unidade_uso === 'kg' ? 'selected' : ''}>Kg</option>
                            <option value="g" ${ing.unidade_uso === 'g' ? 'selected' : ''}>g</option>
                            <option value="l" ${ing.unidade_uso === 'l' ? 'selected' : ''}>L</option>
                            <option value="ml" ${ing.unidade_uso === 'ml' ? 'selected' : ''}>ml</option>
                            <option value="un" ${ing.unidade_uso === 'un' ? 'selected' : ''}>Un</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                <span class="text-[10px] text-gray-400 font-bold uppercase">Custo Proporcional</span>
                <span class="text-sm font-black text-gray-800">${formatarMoeda(custo)}</span>
            </div>
        `;
        container.appendChild(el);
    });
}

function atualizarIng(idx, campo, valor) {
    if (['preco_compra', 'qtd_compra', 'qtd_uso'].includes(campo)) {
        fichaTecnica.ingredientes[idx][campo] = parseFloat(valor) || 0;
    } else {
        fichaTecnica.ingredientes[idx][campo] = valor;
    }
    // Não re-renderiza tudo para não perder foco do input, apenas recalcula
    const custo = calcularCustoItem(fichaTecnica.ingredientes[idx]);
    // Atualiza visualmente o custo desse item específico se necessário, 
    // mas o calcularResultados atualiza o total geral
    calcularResultados();
}

function calcularCustoItem(ing) {
    const fatores = { 'kg': 1000, 'g': 1, 'l': 1000, 'ml': 1, 'un': 1 };
    const baseCompra = ing.qtd_compra * (fatores[ing.unidade_compra] || 1);
    const baseUso = ing.qtd_uso * (fatores[ing.unidade_uso] || 1);

    if (baseCompra <= 0) return 0;
    return (ing.preco_compra / baseCompra) * baseUso;
}

// --- 4. CUSTOS EXTRAS ---

function renderizarCustosExtras() {
    // Fixos (R$)
    const listaFixos = document.getElementById('lista-custos-fixos');
    listaFixos.innerHTML = '';
    fichaTecnica.custos_fixos.forEach((item, idx) => {
        listaFixos.innerHTML += `
            <div class="flex items-center gap-2 mb-2">
                <button onclick="removerExtra('fixos', ${idx})" class="text-red-400 hover:text-red-600"><i class="ri-close-circle-line"></i></button>
                <input type="text" value="${item.nome}" onchange="atualizarExtra('fixos', ${idx}, 'nome', this.value)" class="flex-1 bg-transparent border-b border-gray-200 text-xs py-1 text-gray-600 outline-none focus:border-brand-500">
                <div class="flex items-center w-20">
                    <span class="text-xs text-gray-400 mr-1">R$</span>
                    <input type="number" step="0.01" value="${item.valor}" onchange="atualizarExtra('fixos', ${idx}, 'valor', this.value)" class="w-full bg-gray-50 rounded p-1 text-xs font-bold text-right outline-none focus:bg-white focus:ring-1 ring-brand-200">
                </div>
            </div>`;
    });

    // Taxas (%)
    const listaTaxas = document.getElementById('lista-taxas-venda');
    listaTaxas.innerHTML = '';
    fichaTecnica.taxas_venda.forEach((item, idx) => {
        listaTaxas.innerHTML += `
            <div class="flex items-center gap-2 mb-2">
                <button onclick="removerExtra('taxas', ${idx})" class="text-red-400 hover:text-red-600"><i class="ri-close-circle-line"></i></button>
                <input type="text" value="${item.nome}" onchange="atualizarExtra('taxas', ${idx}, 'nome', this.value)" class="flex-1 bg-transparent border-b border-gray-200 text-xs py-1 text-gray-600 outline-none focus:border-brand-500">
                <div class="flex items-center w-16">
                    <input type="number" step="0.1" value="${item.valor}" onchange="atualizarExtra('taxas', ${idx}, 'valor', this.value)" class="w-full bg-gray-50 rounded p-1 text-xs font-bold text-right outline-none focus:bg-white focus:ring-1 ring-brand-200">
                    <span class="text-xs text-gray-400 ml-1">%</span>
                </div>
            </div>`;
    });
}

function addExtra(tipo) {
    if (tipo === 'fixos') fichaTecnica.custos_fixos.push({ nome: 'Novo Custo', valor: 0 });
    if (tipo === 'taxas') fichaTecnica.taxas_venda.push({ nome: 'Nova Taxa', valor: 0 });
    renderizarCustosExtras();
    calcularResultados();
}

function removerExtra(tipo, idx) {
    if (tipo === 'fixos') fichaTecnica.custos_fixos.splice(idx, 1);
    if (tipo === 'taxas') fichaTecnica.taxas_venda.splice(idx, 1);
    renderizarCustosExtras();
    calcularResultados();
}

function atualizarExtra(tipo, idx, campo, valor) {
    const target = tipo === 'fixos' ? fichaTecnica.custos_fixos : fichaTecnica.taxas_venda;
    target[idx][campo] = campo === 'valor' ? (parseFloat(valor) || 0) : valor;
    calcularResultados();
}

// --- 5. CÁLCULO DE LUCRO ---

function atualizarPrecoSimulado(val) {
    precoSimulado = parseFloat(val) || 0;
    calcularResultados();
}

function calcularResultados() {
    // 1. Ingredientes
    let custoIngredientes = 0;
    fichaTecnica.ingredientes.forEach(ing => custoIngredientes += calcularCustoItem(ing));

    // 2. Custos Fixos
    let custoFixos = 0;
    fichaTecnica.custos_fixos.forEach(item => custoFixos += item.valor);

    // 3. Taxas (%)
    let percentualTaxas = 0;
    fichaTecnica.taxas_venda.forEach(item => percentualTaxas += item.valor);
    const valorTaxas = precoSimulado * (percentualTaxas / 100);

    // 4. Resultado
    const custoTotal = custoIngredientes + custoFixos + valorTaxas;
    const lucro = precoSimulado - custoTotal;
    const margem = precoSimulado > 0 ? (lucro / precoSimulado) * 100 : 0;

    // --- Atualizar Tela ---
    document.getElementById('resumo-ingredientes').innerText = formatarMoeda(custoIngredientes);
    document.getElementById('resumo-fixos').innerText = formatarMoeda(custoFixos);
    document.getElementById('resumo-taxas').innerText = `- ${formatarMoeda(valorTaxas)}`;

    const elLucro = document.getElementById('resultado-lucro');
    const elCard = document.getElementById('card-resultado');
    const elStatus = document.getElementById('status-lucro');

    elLucro.innerText = formatarMoeda(lucro);

    if (lucro > 0) {
        elCard.className = "bg-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden transition-colors duration-500";
        elLucro.className = "text-3xl font-black text-green-400";
        elStatus.innerHTML = `<i class="ri-thumb-up-line text-green-400 mr-1"></i> Lucrativo (${margem.toFixed(1)}%)`;
    } else {
        elCard.className = "bg-red-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden transition-colors duration-500";
        elLucro.className = "text-3xl font-black text-white";
        elStatus.innerHTML = `<i class="ri-alert-line text-yellow-400 mr-1"></i> Prejuízo! Aumente o preço.`;
    }
}

// --- 6. SALVAR NO BANCO ---

async function salvarFichaTecnica() {
    const btn = document.getElementById('btn-salvar');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i>';
    btn.disabled = true;

    try {
        const dadosSalvar = {
            produto_id: produtoAtual.id,
            nome_produto: produtoAtual.nome,
            imagem_produto: produtoAtual.imagem,
            ingredientes: fichaTecnica.ingredientes,
            custos_fixos: fichaTecnica.custos_fixos,
            taxas_venda: fichaTecnica.taxas_venda,
            ultima_atualizacao: new Date().toISOString()
        };

        await db.collection('fichas_tecnicas').doc(produtoAtual.id).set(dadosSalvar);

        btn.innerHTML = '<i class="ri-check-line"></i> Salvo!';
        btn.classList.add('bg-green-600', 'border-green-600');

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('bg-green-600', 'border-green-600');
            btn.disabled = false;
        }, 2000);

    } catch (e) {
        console.error(e);
        alert('Erro ao salvar: ' + e.message);
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

// --- UTILITÁRIOS ---

function formatarMoeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function toggleTooltip(id) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) setTimeout(() => el.classList.add('hidden'), 5000);
}
