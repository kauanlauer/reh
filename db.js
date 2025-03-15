// Configuração da conexão com Supabase
const supabaseUrl = 'https://dbtkufhsgdnfxjcjypqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidGt1ZmhzZ2RuZnhqY2p5cHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMDU0NzksImV4cCI6MjA1NzU4MTQ3OX0.B9Ktlj5KAwd7-wD--uJG47zeEQwWTBc5sXoPacoUyCk';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Funções para gerenciar produtos
async function getProdutos() {
    const { data, error } = await supabase
        .from('produtos')
        .select('*, categoria:categoria_id(nome, slug)')
        .order('nome');
    
    if (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
    }
    
    return data;
}

async function getProdutosPorCategoria(categoriaSlug) {
    const { data: categoria, error: categoriaError } = await supabase
        .from('categorias')
        .select('id')
        .eq('slug', categoriaSlug)
        .single();
    
    if (categoriaError) {
        console.error('Erro ao buscar categoria:', categoriaError);
        return [];
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('categoria_id', categoria.id)
        .order('nome');
    
    if (error) {
        console.error('Erro ao buscar produtos por categoria:', error);
        return [];
    }
    
    return data;
}

async function getCategorias() {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('id');
    
    if (error) {
        console.error('Erro ao buscar categorias:', error);
        return [];
    }
    
    return data;
}

async function adicionarProduto(produto) {
    const { data, error } = await supabase
        .from('produtos')
        .insert([produto])
        .select()
        .single();
    
    if (error) {
        console.error('Erro ao adicionar produto:', error);
        return null;
    }
    
    return data;
}

async function atualizarProduto(id, produto) {
    const { data, error } = await supabase
        .from('produtos')
        .update(produto)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Erro ao atualizar produto:', error);
        return null;
    }
    
    return data;
}

async function excluirProduto(id) {
    const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Erro ao excluir produto:', error);
        return false;
    }
    
    return true;
}

// Funções para gerenciar pedidos
async function getPedidos() {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('data_pedido', { ascending: false });
    
    if (error) {
        console.error('Erro ao buscar pedidos:', error);
        return [];
    }
    
    return data;
}

async function getPedidoPorId(id) {
    const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Erro ao buscar pedido:', error);
        return null;
    }
    
    return data;
}

async function atualizarStatusPedido(id, status) {
    const { data, error } = await supabase
        .from('pedidos')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        return null;
    }
    
    return data;
}

async function adicionarPedido(pedido) {
    const { data, error } = await supabase
        .from('pedidos')
        .insert([pedido])
        .select()
        .single();
    
    if (error) {
        console.error('Erro ao adicionar pedido:', error);
        return null;
    }
    
    return data;
}

async function atualizarPedido(id, dadosPedido) {
    const { data, error } = await supabase
        .from('pedidos')
        .update(dadosPedido)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Erro ao atualizar pedido:', error);
        return null;
    }
    
    return data;
}

// Exportar funções - APENAS UMA VEZ, no final do arquivo!
window.dbFunctions = {
    getProdutos,
    getProdutosPorCategoria,
    getCategorias,
    adicionarProduto,
    atualizarProduto,
    excluirProduto,
    getPedidos,
    getPedidoPorId,
    atualizarStatusPedido,
    adicionarPedido,
    atualizarPedido
};