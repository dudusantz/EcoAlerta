const pool = require('../config/database');

// Força o usuário a aceitar os termos antes de usar a plataforma
exports.checkTermsAcceptance = async (req, res, next) => {
    // Se não estiver logado, passa a bola para o auth middleware
    if (!req.session.userId) return next(); 

    let connection;
    try {
        connection = await pool.getConnection();
        
        const [rows] = await connection.execute(
            'SELECT terms_accepted_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (rows.length > 0) {
            const user = rows[0];

            if (!user.terms_accepted_at) {
                // Previne loop infinito se o user já estiver na rota /terms
                if (req.originalUrl.startsWith('/terms')) return next();
                
                return res.redirect('/terms');
            }
        }
        
        next(); 

    } catch (error) {
        console.error('[TERMS] Erro verificação:', error);
        // Fail-safe: Em erro de banco, não bloqueia o uso do app
        next(); 
    } finally {
        if (connection) connection.release();
    }
};