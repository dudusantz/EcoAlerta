const pool = require('../config/database');
const { sendNotificationEmail } = require('../utils/helpers');

// Renderiza o painel administrativo com a lista de denúncias
exports.getAdminPanel = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Busca denúncias ordenando por prioridade de status e data
        const [denuncias] = await connection.execute(
            'SELECT * FROM denuncias ORDER BY FIELD(status, "PENDENTE", "APROVADA", "RESOLVIDA", "REJEITADA"), data_envio DESC'
        );

        res.render('admin_painel', {
            denuncias: denuncias,
            usuarioNome: req.session.nomeCompleto
        });

    } catch (error) {
        console.error('[Admin] Erro ao carregar painel:', error);
        res.status(500).send('Erro interno do servidor ao carregar o painel.');
    } finally {
        if (connection) connection.release();
    }
};

// Processa a aprovação ou rejeição inicial de uma denúncia
exports.updateDenunciaStatus = async (req, res) => {
    const { id, newStatus, rejectionReason } = req.body;

    if (!['APROVADA', 'REJEITADA'].includes(newStatus)) {
        return res.status(400).send('Status inválido.');
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Atualiza o status e registra o motivo da rejeição, se houver
        await connection.execute(
            'UPDATE denuncias SET status = ?, motivo_rejeicao = ? WHERE id = ?',
            [newStatus, rejectionReason || null, id]
        );

        // Recupera dados do usuário para notificação
        const [denunciaRow] = await connection.execute(
            'SELECT d.titulo, u.email FROM denuncias d JOIN users u ON d.id_usuario = u.id WHERE d.id = ?',
            [id]
        );

        if (denunciaRow.length > 0) {
            const denuncia = denunciaRow[0];
            // Envia notificação sem bloquear a resposta da requisição
            sendNotificationEmail(denuncia.email, denuncia.titulo, newStatus, rejectionReason)
                .catch(err => console.error('[Email Error]', err));
        }

        return res.status(200).send('Status atualizado com sucesso.');

    } catch (error) {
        console.error('[Admin] Erro ao atualizar status:', error);
        return res.status(500).send('Erro interno ao processar a moderação.');
    } finally {
        if (connection) connection.release();
    }
};

// Marca uma denúncia já aprovada como Resolvida
exports.resolveDenuncia = async (req, res) => {
    const { id } = req.body; 
    const newStatus = 'RESOLVIDA';
    
    let connection;
    try {
        connection = await pool.getConnection();

        await connection.execute(
            'UPDATE denuncias SET status = ? WHERE id = ?',
            [newStatus, id]
        );

        const [denunciaRow] = await connection.execute(
            'SELECT d.titulo, u.email FROM denuncias d JOIN users u ON d.id_usuario = u.id WHERE d.id = ?',
            [id]
        );

        if (denunciaRow.length > 0) {
            const denuncia = denunciaRow[0];
            sendNotificationEmail(denuncia.email, denuncia.titulo, newStatus)
                .catch(err => console.error('[Email Error]', err));
        }

        return res.status(200).send('Status atualizado para RESOLVIDA.');

    } catch (error) {
        console.error('[Admin] Erro ao resolver denúncia:', error);
        return res.status(500).send('Erro interno ao processar a resolução.');
    } finally {
        if (connection) connection.release();
    }
};