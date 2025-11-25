function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    // Redireciona para login se não houver sessão ativa
    res.redirect('/login.html');
}

function isAdmin(req, res, next) {
    if (req.session.userId && req.session.isAdmin === 1) {
        return next();
    }

    console.warn(`[AUTH] Acesso Admin negado. User ID: ${req.session.userId}`);

    // Retorna script para alertar o usuário antes de redirecionar (UX)
    res.status(403).send(`
        <script>
            alert('Acesso Negado: Área restrita a administradores.');
            window.location.href = '/feed';
        </script>
    `);
}

module.exports = { isAuthenticated, isAdmin };