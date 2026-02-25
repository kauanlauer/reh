(function () {
    const SESSION_KEY = 'clienteSession';

    function onlyDigits(value) {
        return (value || '').toString().replace(/\D/g, '');
    }

    function getLegacyCliente() {
        const nome = localStorage.getItem('userName');
        const telefone = localStorage.getItem('userPhone');
        const telefoneLimpo = onlyDigits(telefone);

        if (!nome || !telefoneLimpo) {
            return null;
        }

        return {
            nome,
            telefone,
            telefone_limpo: telefoneLimpo,
            pontos: parseInt(localStorage.getItem('userPoints') || '0', 10) || 0
        };
    }

    function getSessionCliente() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.telefone_limpo) return null;
            parsed.pontos = parseInt(parsed.pontos || '0', 10) || 0;
            parsed.total_pedidos = parseInt(parsed.total_pedidos || '0', 10) || 0;
            return parsed;
        } catch (_err) {
            return null;
        }
    }

    function persistCliente(cliente) {
        if (!cliente || !cliente.telefone_limpo) return;

        const data = {
            nome: cliente.nome || '',
            telefone: cliente.telefone || '',
            telefone_limpo: cliente.telefone_limpo,
            pontos: parseInt(cliente.pontos || '0', 10) || 0,
            total_pedidos: parseInt(cliente.total_pedidos || '0', 10) || 0
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(data));

        // Compatibilidade com o legado
        localStorage.setItem('userName', data.nome);
        localStorage.setItem('userPhone', data.telefone);
        localStorage.setItem('userPoints', String(data.pontos));
    }

    async function resolveClienteDoc(telefoneLimpo) {
        const collection = window.db.collection('clientes');
        const canonicalRef = collection.doc(telefoneLimpo);
        const canonicalSnap = await canonicalRef.get();

        if (canonicalSnap.exists) {
            return { ref: canonicalRef, snap: canonicalSnap };
        }

        const querySnap = await collection.where('telefone_limpo', '==', telefoneLimpo).limit(1).get();
        if (!querySnap.empty) {
            const found = querySnap.docs[0];
            return { ref: collection.doc(found.id), snap: found };
        }

        return { ref: canonicalRef, snap: null };
    }

    async function syncCliente(partial) {
        if (!window.db) throw new Error('Firestore nao inicializado.');

        const clienteBase = getCliente();
        const now = new Date().toISOString();
        const telefone = (partial && partial.telefone) || (clienteBase && clienteBase.telefone) || '';
        const telefoneLimpo = (partial && partial.telefone_limpo) || onlyDigits(telefone) || (clienteBase && clienteBase.telefone_limpo) || '';

        if (!telefoneLimpo) {
            throw new Error('Telefone invalido para sincronizacao.');
        }

        const nome = (partial && partial.nome) || (clienteBase && clienteBase.nome) || '';
        const resolved = await resolveClienteDoc(telefoneLimpo);
        const ref = resolved.ref;
        const atual = resolved.snap ? resolved.snap.data() : {};

        const payload = {
            nome,
            telefone,
            telefone_limpo: telefoneLimpo,
            auth_uid: window.auth?.currentUser?.uid || atual.auth_uid || null,
            pontos: parseInt((partial && partial.pontos) ?? atual.pontos ?? clienteBase?.pontos ?? 0, 10) || 0,
            total_pedidos: parseInt(atual.total_pedidos || clienteBase?.total_pedidos || 0, 10) || 0,
            data_cadastro: atual.data_cadastro || now,
            ultimo_acesso: now
        };

        await ref.set(payload, { merge: true });
        persistCliente(payload);
        return payload;
    }

    async function loadClienteFromFirebase(phoneOrId) {
        if (!window.db) throw new Error('Firestore nao inicializado.');

        const fromSession = getCliente();
        const docId = onlyDigits(phoneOrId) || (fromSession && fromSession.telefone_limpo);
        if (!docId) return null;

        const resolved = await resolveClienteDoc(docId);
        if (!resolved.snap) return null;

        const remote = resolved.snap.data();
        const merged = {
            nome: remote.nome || fromSession?.nome || '',
            telefone: remote.telefone || fromSession?.telefone || '',
            telefone_limpo: docId,
            auth_uid: remote.auth_uid || null,
            pontos: parseInt(remote.pontos || 0, 10) || 0,
            total_pedidos: parseInt(remote.total_pedidos || 0, 10) || 0
        };

        persistCliente(merged);
        return merged;
    }

    async function registerPedido(data) {
        if (!window.db) throw new Error('Firestore nao inicializado.');

        const cliente = getCliente();
        const telefoneLimpo = onlyDigits(data && data.telefone) || (cliente && cliente.telefone_limpo);
        if (!telefoneLimpo) throw new Error('Cliente sem telefone para registrar pedido.');

        const now = new Date().toISOString();
        const pontosGanhos = parseInt((data && data.pontosGanhos) || 0, 10) || 0;
        const nome = (data && data.nome) || (cliente && cliente.nome) || '';
        const telefone = (data && data.telefone) || (cliente && cliente.telefone) || '';

        const resolved = await resolveClienteDoc(telefoneLimpo);
        const ref = resolved.ref;
        let payloadFinal = null;

        await window.db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const atual = snap.exists ? snap.data() : {};

            payloadFinal = {
                nome,
                telefone,
                telefone_limpo: telefoneLimpo,
                auth_uid: window.auth?.currentUser?.uid || atual.auth_uid || null,
                pontos: (parseInt(atual.pontos || 0, 10) || 0) + pontosGanhos,
                total_pedidos: (parseInt(atual.total_pedidos || 0, 10) || 0) + 1,
                total_gasto: (parseFloat(atual.total_gasto || 0) || 0) + (parseFloat(data?.valorPedido || 0) || 0),
                data_cadastro: atual.data_cadastro || now,
                ultimo_acesso: now,
                ultimo_pedido: now
            };

            tx.set(ref, payloadFinal, { merge: true });
        });

        persistCliente(payloadFinal);
        return payloadFinal;
    }

    async function loadFavoritosCliente(phoneOrId) {
        if (!window.db) throw new Error('Firestore nao inicializado.');

        const fromSession = getCliente();
        const docId = onlyDigits(phoneOrId) || (fromSession && fromSession.telefone_limpo);
        if (!docId) return [];

        const resolved = await resolveClienteDoc(docId);
        if (!resolved.snap) return [];

        const remote = resolved.snap.data();
        return Array.isArray(remote.favoritos) ? remote.favoritos : [];
    }

    async function saveFavoritosCliente(favoritos, phoneOrId) {
        if (!window.db) throw new Error('Firestore nao inicializado.');

        const fromSession = getCliente();
        const docId = onlyDigits(phoneOrId) || (fromSession && fromSession.telefone_limpo);
        if (!docId) return;

        const resolved = await resolveClienteDoc(docId);
        await resolved.ref.set({
            telefone_limpo: docId,
            favoritos: Array.isArray(favoritos) ? favoritos : [],
            ultimo_acesso: new Date().toISOString()
        }, { merge: true });
    }

    function getCliente() {
        return getSessionCliente() || getLegacyCliente();
    }

    function logoutCliente() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('userName');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userPoints');
    }

    window.ClienteSession = {
        normalizarTelefone: onlyDigits,
        obterCliente: getCliente,
        salvarLocal: persistCliente,
        sincronizar: syncCliente,
        carregarDoFirebase: loadClienteFromFirebase,
        carregarFavoritos: loadFavoritosCliente,
        salvarFavoritos: saveFavoritosCliente,
        registrarPedido: registerPedido,
        logout: logoutCliente
    };
})();
