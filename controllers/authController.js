const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/database');
const transporter = require('../config/mailer');
const { validateCpfLength, cleanCpf, isAdult } = require('../utils/helpers'); 

const saltRounds = 10;

/**
 * Registra um novo usuário no sistema.
 * Realiza validações de CPF, unicidade de dados e insere o registro com aceite de termos.
 */
exports.register = async (req, res) => {
    const { nomeCompleto, cpf, dataNascimento, email, password } = req.body;
    let connection;

    // Sanitização e validação de formato do CPF antes de qualquer operação
    const cleanedCpf = cleanCpf(cpf);
    const validatedCpf = validateCpfLength(cleanedCpf);
    
    if (!validatedCpf) {
        return res.status(400).send('Erro: CPF inválido.');
    }

    // Normalização da data para o formato do banco (AAAA-MM-DD)
    let formattedDate = dataNascimento;
    if (dataNascimento && dataNascimento.includes('/')) {
        const parts = dataNascimento.split('/');
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    try {
        connection = await pool.getConnection();
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Verifica duplicidade de CPF ou E-mail para evitar conflitos de chave única
        const [existing] = await connection.execute('SELECT `id` FROM `users` WHERE `cpf` = ? OR `email` = ?', [validatedCpf, email]);
        if (existing.length > 0) {
            return res.status(409).send('Erro: CPF ou Email já cadastrado(s)!');
        }

        // Insere o usuário registrando o timestamp de aceite dos termos (obrigatório no frontend)
        const sql = `
            INSERT INTO users (nomeCompleto, cpf, dataNascimento, email, password_hash, is_admin, terms_accepted_at)
            VALUES (?, ?, ?, ?, ?, 0, NOW())
        `;
        const values = [nomeCompleto, validatedCpf, formattedDate, email, password_hash];

        await connection.execute(sql, values);

        console.log(`[Auth] Novo usuário registrado: ${email}`);
        res.send('Cadastro realizado com sucesso! <a href="/login.html">Faça Login</a>');

    } catch (error) {
        console.error('[Auth] Erro no registro:', error);
        return res.status(500).send('Erro interno do servidor ao registrar.');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Autentica o usuário e inicia a sessão.
 * Utiliza uma estratégia de duas consultas para segurança e estabilidade do driver MySQL.
 */
exports.login = async (req, res) => {
    const { cpf, password } = req.body;
    let connection;

    try {
        const cleanedCpf = cleanCpf(cpf);
        const validatedCpf = validateCpfLength(cleanedCpf); 
        
        if (!validatedCpf) {
            return res.status(400).json({ mensagem: 'O CPF deve ter 11 dígitos.', campo: 'cpf' });
        }

        connection = await pool.getConnection();

        // Query 1: Recupera apenas credenciais essenciais para validação (ID e Hash)
        const [rows] = await connection.execute('SELECT `id`, `password_hash` FROM `users` WHERE `cpf` = ?', [validatedCpf]);

        if (rows.length === 0) {
            return res.status(401).json({ mensagem: 'CPF não encontrado no sistema.', campo: 'cpf' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            // Query 2: Recupera dados de perfil para a sessão apenas após sucesso na autenticação
            const [fullUserRows] = await connection.execute(
                'SELECT `nomeCompleto`, `is_admin` FROM `users` WHERE `id` = ?', 
                [user.id]
            );
            const fullUser = fullUserRows[0];

            // Configura a sessão do usuário
            req.session.userId = user.id;
            req.session.nomeCompleto = fullUser.nomeCompleto;
            req.session.isAdmin = fullUser.is_admin;

            return res.status(200).json({ mensagem: 'Login bem-sucedido!' });
        } else {
            return res.status(401).json({ mensagem: 'Senha incorreta.', campo: 'password' });
        }

    } catch (error) {
        console.error('[Auth] Erro no login:', error.message || error); 
        return res.status(500).json({ mensagem: 'Erro interno no servidor. Tente novamente.', campo: 'geral' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Encerra a sessão do usuário.
 */
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('[Auth] Erro no logout:', err);
            return res.status(500).send('Não foi possível finalizar a sessão.');
        }
        res.redirect('/login.html');
    });
};

/**
 * Carrega os dados do perfil do usuário e seu histórico de denúncias.
 */
exports.getProfile = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const userId = req.session.userId;

        // Recupera dados pessoais
        const [userData] = await connection.execute(
            'SELECT nomeCompleto, cpf, dataNascimento, email FROM users WHERE id = ?',
            [userId]
        );

        // Recupera histórico de denúncias
        const [denunciasEnviadas] = await connection.execute(
            'SELECT * FROM denuncias WHERE id_usuario = ? ORDER BY data_envio DESC',
            [userId]
        );

        if (userData.length === 0) {
            return res.status(404).send("Usuário não encontrado.");
        }

        res.render('perfil', {
            usuario: userData[0],
            denuncias: denunciasEnviadas
        });

    } catch (error) {
        console.error('[Auth] Erro ao carregar perfil:', error);
        res.status(500).send('Erro interno do servidor ao carregar seu perfil.');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Atualiza as informações do perfil do usuário.
 * Inclui validações de regra de negócio como maioridade e unicidade de e-mail.
 */
exports.updateProfile = async (req, res) => {
    const { nomeCompleto, dataNascimento, email } = req.body;
    const userId = req.session.userId;
    let connection;
    let updateFields = [];
    let updateValues = [];

    try {
        connection = await pool.getConnection();

        // Regra de Negócio: Usuário deve ser maior de 18 anos
        if (dataNascimento) {
            if (!isAdult(dataNascimento)) {
                return res.status(400).json({ mensagem: 'O usuário precisa ter 18 anos ou mais.' });
            }
            updateFields.push('dataNascimento = ?');
            updateValues.push(dataNascimento);
        }

        // Verifica se o novo e-mail já está em uso por outro usuário
        if (email) {
            const [existingEmail] = await connection.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ mensagem: 'Este endereço de e-mail já está em uso por outra conta.' });
            }
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        if (nomeCompleto) {
            updateFields.push('nomeCompleto = ?');
            updateValues.push(nomeCompleto);
            req.session.nomeCompleto = nomeCompleto; // Atualiza a sessão com o novo nome
        }

        if (updateFields.length === 0) {
            return res.redirect('/perfil');
        }

        // Constrói e executa a query dinâmica de atualização
        const sqlUserUpdate = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(userId);
        await connection.execute(sqlUserUpdate, updateValues);

        // Atualiza o nome de exibição nas denúncias não anônimas para manter consistência
        if (nomeCompleto) {
            await connection.execute(
                'UPDATE denuncias SET nome_exibicao = ? WHERE id_usuario = ? AND anonimo = 0',
                [nomeCompleto, userId]
            );
        }

        return res.status(200).json({ mensagem: 'Perfil atualizado com sucesso.' });

    } catch (error) {
        console.error('[Auth] Erro ao atualizar perfil:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao atualizar seu perfil.' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Altera a senha do usuário logado.
 */
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    let connection;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).send('Todos os campos são obrigatórios e a nova senha deve ter no mínimo 6 caracteres.');
    }

    try {
        connection = await pool.getConnection();

        const [userRow] = await connection.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        const oldHash = userRow[0].password_hash;

        // Valida a senha atual antes de permitir a alteração
        const match = await bcrypt.compare(currentPassword, oldHash);

        if (!match) {
            return res.status(401).send('A Senha Atual fornecida está incorreta.');
        }

        const newPassword_hash = await bcrypt.hash(newPassword, saltRounds);

        await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword_hash, userId]);

        res.status(200).send('Senha alterada com sucesso!');

    } catch (error) {
        console.error('[Auth] Erro ao mudar senha:', error);
        res.status(500).send('Erro interno ao processar a mudança de senha.');
    } finally {
        if (connection) connection.release();
    }
};

// --- CONTROLE DE TERMOS DE USO ---

exports.getTermsPage = async (req, res) => {
    res.render('terms', { 
        usuarioNome: req.session.nomeCompleto || 'Visitante', 
        error: req.query.error 
    });
};

exports.acceptTerms = async (req, res) => {
    const userId = req.session.userId;
    let connection;

    if (!userId) { return res.redirect('/login.html'); }

    try {
        connection = await pool.getConnection();
        await connection.execute('UPDATE users SET terms_accepted_at = NOW() WHERE id = ?', [userId]);
        res.redirect('/feed'); 
    } catch (error) {
        console.error('[Auth] Erro ao aceitar termos:', error);
        res.redirect('/terms?error=Falha ao registrar aceitação.'); 
    } finally {
        if (connection) connection.release();
    }
};

// --- FLUXO DE RECUPERAÇÃO DE SENHA (ESQUECI A SENHA) ---

/**
 * Inicia o processo de recuperação de senha gerando um token e enviando por e-mail.
 */
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute('SELECT id, nomeCompleto FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            // Retorna sucesso mesmo se o e-mail não existir (medida de segurança contra enumeração de usuários)
            return res.status(200).json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá um link.' });
        }

        const user = users[0];

        // Gera token de recuperação
        const token = crypto.randomBytes(20).toString('hex');
        const now = new Date();
        now.setHours(now.getHours() + 1); // Token válido por 1 hora

        await connection.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [token, now, user.id]
        );

        const resetLink = `http://${req.headers.host}/reset-password/${token}`;

        const mailOptions = {
            from: `EcoAlerta <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Recuperação de Senha - EcoAlerta',
            html: `
                <p>Olá, ${user.nomeCompleto}.</p>
                <p>Você solicitou a redefinição de sua senha.</p>
                <p>Clique no link abaixo para criar uma nova senha:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>Este link expira em 1 hora.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá um link.' });

    } catch (error) {
        console.error('[Auth] Erro no forgotPassword:', error);
        res.status(500).json({ mensagem: 'Erro ao processar solicitação.' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Valida o token de recuperação e renderiza a tela de redefinição.
 */
exports.renderResetPassword = async (req, res) => {
    const { token } = req.params;
    let connection;

    try {
        connection = await pool.getConnection();

        // Verifica se o token existe e ainda é válido (não expirado)
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.send('<h1 style="font-family:sans-serif; color:#d32f2f; text-align:center; margin-top:50px;">Link inválido ou expirado.</h1><p style="text-align:center;"><a href="/esqueci-senha">Tentar novamente</a></p>');
        }

        res.render('reset_password', { token });

    } catch (error) {
        console.error('[Auth] Erro ao renderizar reset:', error);
        res.status(500).send('Erro interno.');
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Finaliza a recuperação de senha, atualizando o registro e invalidando o token.
 */
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    let connection;

    if (!password || password.length < 6) {
        return res.send('<h1>Senha muito curta.</h1><a href="javascript:history.back()">Voltar</a>');
    }

    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).send('Token inválido ou expirado.');
        }

        const user = users[0];
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Atualiza a senha e limpa os campos de token para evitar reuso
        await connection.execute(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [password_hash, user.id]
        );

        res.render('reset_success');

    } catch (error) {
        console.error('[Auth] Erro ao resetar senha:', error);
        res.status(500).send('Erro ao resetar senha.');
    } finally {
        if (connection) connection.release();
    }
};