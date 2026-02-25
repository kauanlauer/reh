(function () {
    const LOGIN_PATH = 'admin-login.html';

    function toAdminEmail(username) {
        const normalized = (username || '').trim().toLowerCase();
        if (!normalized) return '';
        return `${normalized}@deliciabrownie.admin`;
    }

    function nextUrl() {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');
        return next && !next.includes('admin-login.html') ? next : 'admin-pedidos.html';
    }

    function redirectToLogin() {
        const current = window.location.pathname.split('/').pop() || 'admin-pedidos.html';
        window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(current)}`;
    }

    async function isAdmin(uid) {
        const snap = await window.db.collection('admins').doc(uid).get();
        return snap.exists && snap.data()?.ativo === true;
    }

    async function ensureAdminDoc(user, username) {
        const ref = window.db.collection('admins').doc(user.uid);
        const snap = await ref.get();

        if (snap.exists && snap.data()?.ativo === true) {
            return;
        }

        // Bootstrap controlado: primeiro acesso do usuário "loja"
        if ((username || '').toLowerCase() === 'loja') {
            await ref.set({
                uid: user.uid,
                username: 'loja',
                role: 'owner',
                ativo: true,
                criado_em: new Date().toISOString()
            }, { merge: true });
            return;
        }

        throw new Error('Usuário sem permissão de admin.');
    }

    async function loginWithUsernamePassword(username, password) {
        if (!window.auth || !window.db) {
            throw new Error('Firebase não inicializado.');
        }

        const email = toAdminEmail(username);
        if (!email || !password) {
            throw new Error('Preencha usuário e senha.');
        }

        let cred;
        try {
            cred = await window.auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            // Primeiro setup: cria a conta automaticamente para o usuário principal
            if (err?.code === 'auth/user-not-found' && (username || '').toLowerCase() === 'loja') {
                cred = await window.auth.createUserWithEmailAndPassword(email, password);
            } else {
                throw err;
            }
        }

        await ensureAdminDoc(cred.user, username);
        return cred.user;
    }

    function requireAdminPage(onReady) {
        if (!window.auth || !window.db) {
            alert('Erro ao iniciar autenticação admin.');
            return;
        }

        let ready = false;
        window.auth.onAuthStateChanged(async (user) => {
            try {
                if (!user) {
                    redirectToLogin();
                    return;
                }

                const ok = await isAdmin(user.uid);
                if (!ok) {
                    await window.auth.signOut();
                    redirectToLogin();
                    return;
                }

                if (!ready && typeof onReady === 'function') {
                    ready = true;
                    onReady(user);
                }
            } catch (_e) {
                await window.auth.signOut();
                redirectToLogin();
            }
        });
    }

    async function logoutAdmin() {
        if (window.auth) {
            await window.auth.signOut();
        }
        window.location.href = LOGIN_PATH;
    }

    window.AdminAuth = {
        toAdminEmail,
        loginWithUsernamePassword,
        requireAdminPage,
        logoutAdmin,
        nextUrl
    };
})();
