const db = window.db;
const auth = window.auth;
const clienteSession = window.ClienteSession || null;

// Constantes
const REGIAO_ATENDIMENTO = "Curitiba e Região";
let configuracaoLoja = { status: 'Fechada', horario_abertura: '18:00', horario_fechamento: '23:00', dias: 'Todos os dias' }; 

// Estado Global
let carrinho = JSON.parse(localStorage.getItem('meuCarrinho')) || [];
let favoritos = JSON.parse(localStorage.getItem('meusFavoritos')) || [];
let clienteAtual = clienteSession ? clienteSession.obterCliente() : null;
let userPoints = clienteAtual?.pontos || parseInt(localStorage.getItem('userPoints') || 0);
let todosProdutos = []; 
let produtoSelecionado = null, qtdModal = 1;
let filtroFavoritosAtivo = false;
let pedidoEmEnvio = false;
let menuCategoriaAtual = 'topo';
let scrollSpyFrame = null;

// Utilitários
const sanitizarId = (str) => str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const vibrar = () => { if (navigator.vibrate) navigator.vibrate(50); };
const dedupeIds = (lista = []) => [...new Set((Array.isArray(lista) ? lista : []).filter(Boolean))];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (!db || !auth) {
        console.error('Firebase nao foi inicializado corretamente.');
        return;
    }

    // Configura autenticação anônima se não houver usuário logado
    auth.onAuthStateChanged(user => { if (!user) auth.signInAnonymously(); });
    initApp();
    atualizarSaudacao();
    atualizarPontosUI();
    initClienteSessao();
    
    // Efeito de sombra e glass no header ao rolar a página
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('shadow-lg', 'bg-white');
            header.classList.remove('shadow-sm', 'glass-effect');
        } else {
            header.classList.remove('shadow-lg', 'bg-white');
            header.classList.add('shadow-sm', 'glass-effect');
        }
        lastScroll = currentScroll;
        agendarAtualizacaoMenuCategorias();
    });

    // Filtra a vitrine conforme o usuário digita na busca
    document.getElementById('search-input').addEventListener('input', (e) => filtrarVitrine(e.target.value.toLowerCase()));

    const quickLoginForm = document.getElementById('quick-login-form');
    if (quickLoginForm) {
        quickLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('quick-login-phone');
            await loginComTelefone(input?.value || '');
        });
    }

    atualizarVisibilidadeLoginRapido();
});

async function initClienteSessao() {
    if (!clienteSession) return;

    try {
        const local = clienteSession.obterCliente();
        if (local) {
            clienteSession.salvarLocal(local);
            clienteAtual = local;
            userPoints = parseInt(local.pontos || 0, 10) || 0;
            atualizarSaudacao();
            atualizarPontosUI();
            atualizarVisibilidadeLoginRapido();
        }

        if (local?.telefone_limpo || local?.telefone) {
            await carregarSessaoPorTelefone(local.telefone_limpo || local.telefone);
        }
    } catch (e) {
        console.warn('Falha ao sincronizar sessao do cliente:', e);
    }
}

function atualizarVisibilidadeLoginRapido() {
    const form = document.getElementById('quick-login-form');
    if (!form) return;

    const sessao = clienteSession ? clienteSession.obterCliente() : null;
    const logado = Boolean(
        clienteAtual?.telefone_limpo ||
        clienteAtual?.telefone ||
        sessao?.telefone_limpo ||
        sessao?.telefone
    );
    form.classList.toggle('hidden', logado);
}

async function carregarSessaoPorTelefone(telefone) {
    const remoto = await clienteSession.carregarDoFirebase(telefone);
    if (remoto) {
        clienteAtual = remoto;
        userPoints = parseInt(remoto.pontos || 0, 10) || 0;
        atualizarSaudacao();
        atualizarPontosUI();
        atualizarVisibilidadeLoginRapido();
    }

    const favoritosConta = await clienteSession.carregarFavoritos(telefone);
    const favoritosCombinados = dedupeIds([...favoritos, ...favoritosConta]);
    favoritos = favoritosCombinados;
    localStorage.setItem('meusFavoritos', JSON.stringify(favoritos));
    if (favoritosCombinados.length !== favoritosConta.length) {
        await clienteSession.salvarFavoritos(favoritosCombinados, telefone);
    }

    return remoto;
}

async function loginComTelefone(telefoneDigitado) {
    if (!clienteSession) {
        mostrarToast('Login indisponivel no momento.', 'erro');
        return;
    }

    const telefone = clienteSession.normalizarTelefone(telefoneDigitado);
    if (telefone.length < 10) {
        mostrarToast('Digite um WhatsApp valido.', 'erro');
        return;
    }

    try {
        const remoto = await carregarSessaoPorTelefone(telefone);
        if (!remoto) {
            mostrarToast('Telefone nao encontrado. Cadastre-se no perfil.', 'erro');
            return;
        }

        const input = document.getElementById('quick-login-phone');
        if (input) input.value = remoto.telefone || telefoneDigitado;
        mostrarToast(`Ola, ${remoto.nome || 'cliente'}!`, 'sucesso');
    } catch (e) {
        console.error('Falha no login por telefone:', e);
        mostrarToast('Nao foi possivel buscar sua conta agora.', 'erro');
    }
}

// Atualiza a saudação no topo (Bom dia, Boa tarde, Boa noite)
function atualizarSaudacao() {
    const nome = clienteAtual?.nome || localStorage.getItem('userName');
    const el = document.getElementById('saudacao-usuario');
    const hora = new Date().getHours();
    let periodo = "Olá";

    if (hora >= 5 && hora < 12) periodo = "Bom dia";
    else if (hora >= 12 && hora < 18) periodo = "Boa tarde";
    else periodo = "Boa noite";

    if (nome) {
        el.innerText = `${periodo}, ${nome.split(' ')[0]}!`;
    } else {
        el.innerText = `${periodo}, Visitante`;
    }
}

// Atualiza a contagem de pontos no header e no banner
function atualizarPontosUI() {
    const p = document.getElementById('user-points-header');
    const b = document.getElementById('banner-points');
    if(p) p.innerText = userPoints;
    if(b) b.innerText = userPoints;
}

// Inicializa a aplicação carregando configurações e produtos
async function initApp() {
    renderizarSkeleton();
    atualizarBadge();
    
    // Listener para o status da loja em tempo real
    db.collection('config').doc('loja').onSnapshot(doc => {
        if(doc.exists) configuracaoLoja = doc.data();
        atualizarStatusLoja(); 
    });

    try {
        // Busca produtos ativos
        const snap = await db.collection('produtos').where('ativo', '==', true).get();
        todosProdutos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        sincronizarFavoritosComCardapio();
        sanitizarCarrinhoPorCardapio();
        
        renderizarBanners(todosProdutos);
        renderizarCategorias(todosProdutos);
        renderizarVitrine(todosProdutos);
        atualizarIconeFavoritosHeader();
        
    } catch (e) {
        console.error("Erro ao carregar app:", e);
    }
}

function sincronizarFavoritosComCardapio() {
    const ativos = new Set(todosProdutos.map(p => p.id));
    const anteriores = [...favoritos];
    favoritos = dedupeIds(favoritos).filter(id => ativos.has(id));

    if (anteriores.length !== favoritos.length) {
        localStorage.setItem('meusFavoritos', JSON.stringify(favoritos));
        salvarFavoritosConta();
    }
}

function sanitizarCarrinhoPorCardapio() {
    const ativos = new Set(todosProdutos.map(p => p.id));
    const tamanhoAnterior = carrinho.length;
    carrinho = carrinho.filter(item => ativos.has(item.id));

    if (carrinho.length !== tamanhoAnterior) {
        salvarCarrinho();
        if (document.getElementById('lista-carrinho')) renderizarCarrinho();
        mostrarToast('Itens indisponiveis foram removidos da sacola.', 'erro');
    }
}

async function salvarFavoritosConta() {
    if (!clienteSession) return;
    const sessao = clienteSession.obterCliente();
    if (!sessao?.telefone_limpo && !sessao?.telefone) return;

    try {
        await clienteSession.salvarFavoritos(favoritos, sessao.telefone_limpo || sessao.telefone);
    } catch (err) {
        console.warn('Nao foi possivel salvar favoritos na conta:', err);
    }
}

// --- RENDERIZAÇÃO VISUAL ---

function renderizarSkeleton() {}

// Renderiza o carrossel de destaques e o banner de fidelidade
function renderizarBanners(produtos) {
    const container = document.getElementById('banners-container');
    const carrossel = document.getElementById('carrossel-destaques');
    // Filtra até 5 produtos marcados como destaque ou do dia
    const destaques = produtos.filter(p => p.tag_especial === 'do_dia' || p.destaque).slice(0, 5);
    
    container.classList.remove('hidden');
    
    let html = ``;
    destaques.forEach(p => {
        html += `
        <div onclick="abrirModalProduto('${encodeURIComponent(JSON.stringify(p))}', this)" class="snap-center shrink-0 w-[80vw] md:w-[350px] h-36 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 relative overflow-hidden cursor-pointer shadow-lg shadow-brand-200/50 transform transition hover:scale-[1.01]">
            <div class="absolute inset-0 bg-white/5"></div>
            <div class="relative z-10 p-5 flex flex-col justify-center h-full w-2/3">
                <span class="bg-white/20 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded w-fit mb-1">OFERTA</span>
                <h3 class="text-white font-serif font-black text-xl leading-tight mb-1 text-shadow-sm line-clamp-2">${p.nome}</h3>
                <p class="text-white/80 text-xs font-bold flex items-center gap-1">Ver detalhes <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg></p>
            </div>
            <img src="${p.imagem}" class="absolute -right-2 top-1/2 -translate-y-1/2 w-32 h-32 object-cover rounded-full border-4 border-white/20 shadow-2xl rotate-[-12deg]">
        </div>`;
    });
    carrossel.innerHTML = html;
}

// Renderiza os botões de categorias
function renderizarCategorias(produtos) {
    const nav = document.getElementById('nav-categorias');
    // Extrai categorias únicas e ordena
    const cats = [...new Set(produtos.map(p => p.categoria))].sort();
    
    let html = `<button data-cat-target="topo" onclick="scrollToCat('topo')" class="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all snap-center whitespace-nowrap">Início</button>`;

    cats.forEach(c => {
        const targetId = `cat-${sanitizarId(c)}`;
        html += `<button data-cat-target="${targetId}" onclick="scrollToCat('${targetId}')" class="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all snap-center whitespace-nowrap">${c}</button>`;
    });
    nav.innerHTML = html;
    menuCategoriaAtual = 'topo';
    atualizarBotoesCategoriasAtivo('topo');
}

// Renderiza a lista principal de produtos
function renderizarVitrine(lista) {
    const container = document.getElementById('main-vitrine');
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = `<div class="text-center py-10 opacity-50"><p>Nenhum item encontrado.</p></div>`;
        menuCategoriaAtual = 'topo';
        atualizarBotoesCategoriasAtivo('topo');
        return;
    }

    // Se o filtro de favoritos estiver ativo, renderiza tudo junto
    if (filtroFavoritosAtivo) {
        document.getElementById('titulo-secao').innerText = "Meus Favoritos";
        document.getElementById('btn-ver-todos').classList.remove('hidden');
        let htmlItens = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-0">`;
        lista.forEach(p => htmlItens += cardProdutoApp(p));
        htmlItens += `</div>`;
        container.innerHTML = htmlItens;
        menuCategoriaAtual = 'topo';
        atualizarBotoesCategoriasAtivo('topo');
        return;
    }

    // Caso contrário, renderiza por categoria
    document.getElementById('titulo-secao').innerText = "Cardápio";
    document.getElementById('btn-ver-todos').classList.add('hidden');

    const cats = [...new Set(lista.map(p => p.categoria))].sort();

    cats.forEach(cat => {
        const itens = lista.filter(p => p.categoria === cat);
        const section = document.createElement('div');
        section.id = `cat-${sanitizarId(cat)}`;
        section.className = "scroll-mt-48"; 
        let htmlItens = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-0">`;
        itens.forEach(p => htmlItens += cardProdutoApp(p));
        htmlItens += `</div>`;
        section.innerHTML = `
            <div class="flex items-center gap-3 mb-4 px-4 md:px-0 mt-6">
                <h2 class="text-lg font-black text-gray-900 tracking-tight">${cat}</h2>
                <div class="h-px bg-gray-200 flex-grow opacity-50"></div>
            </div>
            ${htmlItens}
        `;
        container.appendChild(section);
    });

    agendarAtualizacaoMenuCategorias();
}

// Cria o HTML de um único card de produto
const cardProdutoApp = (p) => {
    const dados = encodeURIComponent(JSON.stringify(p));
    const precoDisplay = p.preco_promo > 0 ? formatarMoeda(p.preco_promo) : formatarMoeda(p.preco);
    const precoAntigo = p.preco_promo > 0 ? `<span class="text-xs text-gray-400 line-through mr-2">${formatarMoeda(p.preco)}</span>` : '';
    const isFav = favoritos.includes(p.id);
    
    // Rating simulado para prova social
    const stars = Math.floor(Math.random() * (50 - 45) + 45) / 10;

    return `
    <div class="bg-white rounded-2xl p-3 md:p-4 shadow-soft border border-gray-50 hover:border-brand-100 hover:shadow-lg transition-all relative overflow-hidden group h-full">
        <div onclick="abrirModalProduto('${dados}', this)" class="flex justify-between gap-3 cursor-pointer">
            <div class="flex flex-col justify-between flex-1 py-1 min-h-[100px]">
                <div>
                    <h3 class="font-bold text-gray-800 text-[15px] leading-tight mb-1 group-hover:text-brand-600 transition-colors line-clamp-2">${p.nome}</h3>
                    <div class="flex items-center gap-1 mb-2">
                        <svg class="w-3 h-3 text-brand-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        <span class="text-[10px] font-bold text-gray-500">${stars}</span>
                    </div>
                    <p class="text-xs text-gray-500 leading-relaxed line-clamp-2">${p.descricao}</p>
                </div>
                <div class="flex items-baseline mt-2">
                    ${precoAntigo}
                    <span class="font-bold text-green-600 text-base">${precoDisplay}</span>
                </div>
            </div>
            <div class="relative w-28 h-28 flex-shrink-0">
                <img src="${p.imagem}" class="w-full h-full object-cover rounded-xl bg-gray-100 product-img-source transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.src='https://placehold.co/120?text=Delicia'">
                <div class="absolute -bottom-2 -right-2 bg-white rounded-tl-xl p-1.5 shadow-sm z-10">
                    <div class="bg-brand-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold shadow-brand-200 shadow-lg active:scale-90 transition-transform">+</div>
                </div>
            </div>
        </div>
        <button onclick="event.stopPropagation(); toggleFavorito('${p.id}')" class="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm z-20 active:scale-90 transition-transform">
            ${isFav ? '<svg class="w-5 h-5 text-red-500 heart-pop" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' : '<svg class="w-5 h-5 text-gray-300 hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>'}
        </button>
    </div>`;
};

// --- FAVORITOS ---
window.toggleFavorito = (id) => {
    vibrar();
    const idx = favoritos.indexOf(id);
    if (idx === -1) {
        favoritos.push(id);
        mostrarToast("Salvo nos favoritos ❤️", 'sucesso');
    } else {
        favoritos.splice(idx, 1);
        if (filtroFavoritosAtivo) { filtrarFavoritos(true); return; }
    }
    localStorage.setItem('meusFavoritos', JSON.stringify(favoritos));
    salvarFavoritosConta();
    renderizarVitrine(todosProdutos);
    atualizarIconeFavoritosHeader();
    if (produtoSelecionado && produtoSelecionado.id === id) atualizarBotaoFavModal();
}

window.filtrarFavoritos = (forceRefresh = false) => {
    if (!forceRefresh) { filtroFavoritosAtivo = !filtroFavoritosAtivo; vibrar(); }
    const btn = document.getElementById('btn-header-fav');
    if (filtroFavoritosAtivo) {
        const prodsFavs = todosProdutos.filter(p => favoritos.includes(p.id));
        renderizarVitrine(prodsFavs);
        btn.classList.add('text-brand-600', 'bg-brand-50');
        btn.classList.remove('text-gray-400');
    } else {
        resetarFiltros();
    }
}

window.resetarFiltros = () => {
    filtroFavoritosAtivo = false;
    renderizarVitrine(todosProdutos);
    const btn = document.getElementById('btn-header-fav');
    btn.classList.remove('text-brand-600', 'bg-brand-50');
    btn.classList.add('text-gray-400');
}

function atualizarIconeFavoritosHeader() {
    const btn = document.getElementById('btn-header-fav');
    if (favoritos.length > 0) {
        btn.innerHTML = `<svg class="w-6 h-6" fill="${filtroFavoritosAtivo ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
    }
}

// --- MODAL PRODUTO ---
window.abrirModalProduto = (dados, elOrigem) => {
    vibrar();
    produtoSelecionado = JSON.parse(decodeURIComponent(dados));
    qtdModal = 1;
    const preco = produtoSelecionado.preco_promo > 0 ? produtoSelecionado.preco_promo : produtoSelecionado.preco;
    produtoSelecionado.precoFinal = preco;

    document.getElementById('modal-img').src = produtoSelecionado.imagem;
    document.getElementById('modal-titulo').innerText = produtoSelecionado.nome;
    document.getElementById('modal-desc').innerText = produtoSelecionado.descricao;
    document.getElementById('modal-obs').value = ''; 
    atualizarBotaoFavModal();
    atualizarBtnModal();
    toggleModal('modal-produto', true);
}

function atualizarBotaoFavModal() {
    const isFav = favoritos.includes(produtoSelecionado.id);
    const btn = document.getElementById('modal-btn-fav');
    btn.innerHTML = isFav 
        ? `<svg class="w-6 h-6 text-red-500 heart-pop" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`
        : `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
    btn.onclick = () => toggleFavorito(produtoSelecionado.id);
}

window.mudarQtd = (n) => { vibrar(); if(qtdModal + n >= 1) { qtdModal += n; atualizarBtnModal(); } }
function atualizarBtnModal() {
    document.getElementById('qtd-display').innerText = qtdModal;
    const total = produtoSelecionado.precoFinal * qtdModal;
    document.getElementById('modal-btn-preco').innerText = formatarMoeda(total);
}

window.addAoCarrinho = () => {
    vibrar();
    const ativo = todosProdutos.some(p => p.id === produtoSelecionado.id);
    if (!ativo) {
        mostrarToast('Produto indisponivel no momento.', 'erro');
        toggleModal('modal-produto', false);
        return;
    }

    const obs = document.getElementById('modal-obs').value;
    const item = { ...produtoSelecionado, qtd: qtdModal, obs: obs };
    carrinho.push(item);
    salvarCarrinho();
    toggleModal('modal-produto', false);
    mostrarToast(`Adicionado! 🛒`, 'sucesso');
    animarCarrinho();
}

function animarCarrinho() {
    const iconD = document.getElementById('cart-icon-svg');
    const iconM = document.getElementById('cart-icon-mobile');
    const bgM = document.getElementById('cart-icon-mobile-bg');
    if(iconD) iconD.parentElement.classList.add('animate-bounce-short');
    if(iconM) { iconM.classList.add('scale-125'); bgM.classList.remove('scale-0'); }
    setTimeout(() => {
        if(iconD) iconD.parentElement.classList.remove('animate-bounce-short');
        if(iconM) { iconM.classList.remove('scale-125'); bgM.classList.add('scale-0'); }
    }, 500);
}

// --- CARRINHO E PEDIDO ---
window.abrirCarrinho = () => { vibrar(); renderizarCarrinho(); toggleModal('modal-carrinho', true); }
function renderizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    lista.innerHTML = '';
    let total = 0;
    if (carrinho.length === 0) {
        lista.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-center opacity-50"><svg class="w-16 h-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg><p class="font-bold">Sua sacola está vazia</p></div>`;
        document.getElementById('btn-finalizar').disabled = true;
        document.getElementById('btn-finalizar').classList.add('opacity-50');
    } else {
        document.getElementById('btn-finalizar').disabled = false;
        document.getElementById('btn-finalizar').classList.remove('opacity-50');
        carrinho.forEach((item, idx) => {
            total += item.precoFinal * item.qtd;
            lista.innerHTML += `<div class="flex gap-3 py-3 border-b border-gray-50 last:border-0"><img src="${item.imagem}" class="w-14 h-14 rounded-xl bg-gray-100 object-cover"><div class="flex-1"><div class="flex justify-between"><h4 class="font-bold text-sm text-gray-800 line-clamp-1">${item.nome}</h4><span class="font-bold text-sm text-gray-900">${formatarMoeda(item.precoFinal * item.qtd)}</span></div><p class="text-xs text-gray-400 mb-1">${item.qtd}x ${formatarMoeda(item.precoFinal)}</p><button onclick="removerItem(${idx})" class="text-[10px] font-bold text-red-500 mt-1">Remover</button></div></div>`;
        });
    }
    document.getElementById('subtotal-carrinho').innerText = formatarMoeda(total);
}
window.removerItem = (idx) => { vibrar(); carrinho.splice(idx, 1); salvarCarrinho(); renderizarCarrinho(); }

window.prepararPedido = async () => {
    if (pedidoEmEnvio) return;

    if (configuracaoLoja.status === 'Fechada') {
        vibrar(); alert('A loja está fechada. Voltamos às ' + configuracaoLoja.horario_abertura); return;
    }
    const sessaoCliente = clienteSession ? clienteSession.obterCliente() : null;
    const nome = sessaoCliente?.nome || localStorage.getItem('userName');
    const fone = sessaoCliente?.telefone || localStorage.getItem('userPhone');
    if (!nome || !fone) {
        toggleModal('modal-carrinho', false);
        mostrarToast('Faça login para finalizar', 'erro');
        setTimeout(() => window.location.href = "perfil.html", 1500);
        return;
    }
    if (carrinho.length === 0) {
        mostrarToast('Sua sacola está vazia.', 'erro');
        return;
    }

    const checks = await Promise.all(carrinho.map(async (item) => {
        try {
            const snap = await db.collection('produtos').doc(item.id).get();
            return { id: item.id, ativo: snap.exists && snap.data()?.ativo === true };
        } catch (_e) {
            return { id: item.id, ativo: false };
        }
    }));
    const ativosAgora = new Set(checks.filter(c => c.ativo).map(c => c.id));
    const indisponiveis = carrinho.filter(i => !ativosAgora.has(i.id));
    if (indisponiveis.length > 0) {
        carrinho = carrinho.filter(i => ativosAgora.has(i.id));
        salvarCarrinho();
        renderizarCarrinho();
        mostrarToast('Alguns itens sairam do cardapio. Revise sua sacola.', 'erro');
        return;
    }

    // CELEBRAÇÃO DE CONFETES
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#db2777', '#f43f5e', '#fbbf24'] });
    vibrar();

    const total = carrinho.reduce((acc, i) => acc + (i.precoFinal * i.qtd), 0);
    const btn = document.getElementById('btn-finalizar');
    const txtOriginal = btn.innerText; // Guarda o texto original
    pedidoEmEnvio = true;
    btn.innerText = 'Enviando...'; btn.disabled = true;

    const pontosGanhos = 1;
    const uid = clienteSession ? clienteSession.normalizarTelefone(fone) : fone.replace(/\D/g, '');
    const authUid = auth.currentUser?.uid || null;
    const pedidoToken = Date.now();

    const pedido = {
        id_visual: `#${String(pedidoToken).slice(-6)}`,
        cliente_nome: nome,
        cliente_telefone: fone,
        cliente_telefone_limpo: uid,
        cliente_uid: authUid,
        itens: carrinho,
        total: total,
        status: 'Enviado',
        tipo_entrega: 'Retirada',
        pontos_ganhos: pontosGanhos,
        data: new Date().toISOString()
    };

    db.collection('pedidos').add(pedido).then(async () => {
        try {
            if (clienteSession) {
                const atualizado = await clienteSession.registrarPedido({
                    nome,
                    telefone: fone,
                    pontosGanhos,
                    valorPedido: total
                });
                clienteAtual = atualizado;
                userPoints = atualizado?.pontos || userPoints;
            } else {
                userPoints += pontosGanhos;
                localStorage.setItem('userPoints', String(userPoints));
            }
            atualizarPontosUI();
            atualizarSaudacao();
        } catch (erroPontos) {
            console.warn('Pedido enviado, mas nao foi possivel atualizar pontos:', erroPontos);
        }

        // --- NOVO PASSO: SALVA DADOS DO PEDIDO PARA A PÁGINA DE COMPROVANTE ---
        // Usamos sessionStorage pois a informação só é necessária para o próximo carregamento.
        sessionStorage.setItem('lastPedidoData', JSON.stringify(pedido));
        
        // Monta mensagem do WhatsApp
        let msg = `*NOVO PEDIDO (RETIRADA) ${pedido.id_visual}*\n👤 ${nome}\n\n`;
        pedido.itens.forEach(i => { msg += `${i.qtd}x ${i.nome}\n`; if(i.obs) msg += `   _Obs: ${i.obs}_\n`; });
        msg += `\n💰 *Total: ${formatarMoeda(total)}*`;
        msg += `\n🎁 *Ganhei +${pontosGanhos} Ponto Fidelidade!*`;
        msg += `\n\nVou passar buscar!`;
        
        // Limpa o carrinho local e a UI
        carrinho = []; salvarCarrinho();
        
        // Redireciona para o comprovante E abre o WhatsApp
        setTimeout(() => {
            window.open(`https://wa.me/5541992480604?text=${encodeURIComponent(msg)}`, '_blank');
            window.location.href = 'comprovante.html'; // REDIRECIONA PARA O COMPROVANTE
        }, 1500); // Delay para ver os confetes
    }).catch(e => {
        console.error(e); 
        btn.innerText = txtOriginal; // Volta o texto
        btn.disabled = false;
        pedidoEmEnvio = false;
        alert('Erro ao enviar pedido. Tente novamente.');
    });
}

function salvarCarrinho() { localStorage.setItem('meuCarrinho', JSON.stringify(carrinho)); atualizarBadge(); }
function atualizarBadge() {
    const qtd = carrinho.reduce((a, b) => a + b.qtd, 0);
    const badgeD = document.getElementById('badge-cart-desktop');
    if(badgeD) { badgeD.innerText = qtd; badgeD.classList.toggle('scale-0', qtd === 0); }
    const badgeM = document.getElementById('badge-cart-mobile');
    if(badgeM) { badgeM.innerText = qtd; badgeM.classList.toggle('scale-0', qtd === 0); }
    const btnSacola = document.getElementById('btn-sacola-flutuante');
    const btnSacolaQtd = document.getElementById('btn-sacola-qtd');
    if (btnSacola && btnSacolaQtd) {
        btnSacolaQtd.innerText = qtd;
        btnSacola.classList.toggle('hidden', qtd === 0);
        btnSacola.classList.toggle('flex', qtd > 0);
    }
}
function atualizarStatusLoja() {
    const bar = document.getElementById('status-loja-bar');
    if (configuracaoLoja.status === 'Fechada') { bar.classList.remove('hidden'); bar.innerText = `LOJA FECHADA • Abre às ${configuracaoLoja.horario_abertura}`; } else { bar.classList.add('hidden'); }
}
window.scrollToCat = (id) => {
    vibrar();
    const target = id || 'topo';
    menuCategoriaAtual = target;
    atualizarBotoesCategoriasAtivo(target);

    if (target === 'topo') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const el = document.getElementById(target);
    const header = document.getElementById('main-header');
    if (el) {
        const offset = (header?.offsetHeight || 220) + 18;
        const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

function atualizarBotoesCategoriasAtivo(targetId) {
    const botoes = document.querySelectorAll('#nav-categorias [data-cat-target]');
    botoes.forEach((btn) => {
        const ativo = btn.getAttribute('data-cat-target') === targetId;
        btn.classList.toggle('bg-gray-900', ativo);
        btn.classList.toggle('text-white', ativo);
        btn.classList.toggle('shadow-md', ativo);
        btn.classList.toggle('bg-white', !ativo);
        btn.classList.toggle('text-gray-600', !ativo);
        btn.classList.toggle('shadow-sm', !ativo);
        btn.classList.toggle('border', !ativo);
        btn.classList.toggle('border-gray-100', !ativo);
        btn.classList.toggle('hover:bg-gray-50', !ativo);
    });

    const nav = document.getElementById('nav-categorias');
    const ativo = document.querySelector(`#nav-categorias [data-cat-target="${targetId}"]`);
    if (nav && ativo) {
        const left = ativo.offsetLeft - (nav.clientWidth / 2) + (ativo.clientWidth / 2);
        nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
}

function descobrirCategoriaAtivaPorScroll() {
    const secoes = [...document.querySelectorAll('#main-vitrine [id^="cat-"]')];
    if (secoes.length === 0) return 'topo';

    const header = document.getElementById('main-header');
    const linhaLeitura = window.scrollY + (header?.offsetHeight || 220) + 30;
    let ativa = 'topo';

    for (const secao of secoes) {
        if (secao.offsetTop <= linhaLeitura) ativa = secao.id;
        else break;
    }

    return ativa;
}

function atualizarMenuCategoriasPorScroll() {
    if (filtroFavoritosAtivo) return;
    const ativa = descobrirCategoriaAtivaPorScroll();
    if (ativa === menuCategoriaAtual) return;
    menuCategoriaAtual = ativa;
    atualizarBotoesCategoriasAtivo(ativa);
}

function agendarAtualizacaoMenuCategorias() {
    if (scrollSpyFrame) return;
    scrollSpyFrame = window.requestAnimationFrame(() => {
        scrollSpyFrame = null;
        atualizarMenuCategoriasPorScroll();
    });
}
function filtrarVitrine(termo) {
    if (!termo) { renderizarVitrine(todosProdutos); document.getElementById('banners-container').classList.remove('hidden'); }
    else { const filtrados = todosProdutos.filter(p => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo)); document.getElementById('banners-container').classList.add('hidden'); renderizarVitrine(filtrados); }
}
function toggleModal(id, show) {
    const el = document.getElementById(id);
    const content = el.querySelector('.modal-content');
    const overlay = el.querySelector('.modal-overlay');
    if(show) { el.classList.remove('hidden'); setTimeout(() => { overlay.classList.remove('opacity-0'); content.classList.remove('translate-y-full', 'translate-x-full'); }, 10); }
    else { overlay.classList.add('opacity-0'); if (window.innerWidth < 768) content.classList.add('translate-y-full'); else content.classList.add(id === 'modal-carrinho' ? 'translate-x-full' : 'translate-y-full'); setTimeout(() => el.classList.add('hidden'), 300); }
}
function mostrarToast(msg, tipo) {
    const t = document.getElementById('toast');
    t.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-[100] text-sm font-bold text-white transition-all duration-300 ${tipo === 'sucesso' ? 'bg-gray-900' : 'bg-red-600'}`;
    t.innerText = msg; t.classList.remove('hidden', '-translate-y-20', 'opacity-0');
    setTimeout(() => t.classList.add('-translate-y-20', 'opacity-0'), 3000);
}
