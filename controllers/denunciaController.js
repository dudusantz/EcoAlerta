const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { reverseGeocode, safeFileName } = require('../utils/helpers');

exports.getFeed = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Traz apenas denúncias já moderadas
        const [denuncias] = await connection.execute(
            'SELECT d.*, u.nomeCompleto AS nome_usuario FROM denuncias d LEFT JOIN users u ON d.id_usuario = u.id WHERE d.status IN ("APROVADA", "RESOLVIDA") ORDER BY d.data_envio DESC'
        );

        // Converte coordenadas em endereço legível
        const denunciasProcessadas = await Promise.all(denuncias.map(async (denuncia) => {
            const localizacaoFormatada = await reverseGeocode(denuncia.localizacao);
            return { ...denuncia, localizacao: localizacaoFormatada };
        }));

        res.render('feed', {
            denuncias: denunciasProcessadas,
            usuarioNome: req.session.nomeCompleto,
            isAdmin: req.session.isAdmin
        });

    } catch (error) {
        console.error('Erro getFeed:', error);
        res.status(500).send('Erro ao carregar feed.');
    } finally {
        if (connection) connection.release();
    }
};

exports.getDenunciaForm = (req, res) => {
    res.render('denuncia');
};

exports.submitDenuncia = async (req, res) => {
    let connection;
    try {
        const { titulo, descricao, localizacao, anonimo } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).send('Foto ou vídeo obrigatório.');
        }

        const nomesArquivos = req.files.map(file => file.filename).join(';');
        const isAnonimo = anonimo === 'true';
        const idUsuario = req.session.userId;
        const nomeExibicao = isAnonimo ? 'Anônimo' : req.session.nomeCompleto;

        connection = await pool.getConnection();

        const sql = `
            INSERT INTO denuncias (titulo, descricao, localizacao, nome_arquivo, id_usuario, anonimo, nome_exibicao, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE')
        `;

        await connection.execute(sql.trim(), [titulo, descricao, localizacao, nomesArquivos, idUsuario, isAnonimo, nomeExibicao]);

        res.redirect('/feed');

    } catch (error) {
        console.error('Erro submitDenuncia:', error);

        // Limpa uploads se der erro no banco
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => fs.promises.unlink(f.path).catch(() => {}));
        }

        res.status(500).send('Erro ao enviar denúncia.');
    } finally {
        if (connection) connection.release();
    }
};

exports.cancelDenuncia = async (req, res) => {
    const denunciaId = req.params.id;
    const userId = req.session.userId;
    let connection;

    try {
        connection = await pool.getConnection();

        // Valida se a denúncia é do usuário logado
        const [denuncia] = await connection.execute(
            'SELECT nome_arquivo FROM denuncias WHERE id = ? AND id_usuario = ?',
            [denunciaId, userId]
        );

        if (denuncia.length === 0) {
            return res.status(404).send('Não encontrado ou sem permissão.');
        }

        await connection.execute('DELETE FROM denuncias WHERE id = ?', [denunciaId]);

        // Remove arquivo físico da pasta uploads
        if (denuncia[0].nome_arquivo) {
            const arquivos = denuncia[0].nome_arquivo.split(';');
            arquivos.forEach(fileName => {
                const filePath = path.join(__dirname, '..', 'uploads', safeFileName(fileName));
                fs.unlink(filePath, () => {}); // Callback vazio intencional
            });
        }

        res.redirect('/perfil');

    } catch (error) {
        console.error('Erro cancelDenuncia:', error);
        res.status(500).send('Erro ao cancelar.');
    } finally {
        if (connection) connection.release();
    }
};

exports.getDenunciaDetails = async (req, res) => {
    const denunciaId = req.params.id;
    const userId = req.session.userId;
    const isAdminUser = req.session.isAdmin === 1;
    let connection;

    try {
        connection = await pool.getConnection();

        // Admin vê tudo, User vê só o dele
        const sql = isAdminUser
            ? 'SELECT * FROM denuncias WHERE id = ?'
            : 'SELECT * FROM denuncias WHERE id = ? AND id_usuario = ?';
        
        const params = isAdminUser ? [denunciaId] : [denunciaId, userId];
        const [denunciaRow] = await connection.execute(sql, params);

        if (denunciaRow.length === 0) {
            return res.status(404).send('Acesso negado ou não encontrado.');
        }

        res.render('denuncia_detalhes', { 
            denuncia: denunciaRow[0],
            isAdmin: isAdminUser 
        });

    } catch (error) {
        console.error('Erro getDenunciaDetails:', error);
        res.status(500).send('Erro interno.');
    } finally {
        if (connection) connection.release();
    }
};

exports.getAllUsers = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT id, nomeCompleto, cpf, email, dataNascimento FROM users');
        return res.json({ total: rows.length, data: rows });
    } catch (error) {
        console.error('Erro getAllUsers:', error);
        return res.status(500).send('Erro DB.');
    } finally {
        if (connection) connection.release();
    }
};