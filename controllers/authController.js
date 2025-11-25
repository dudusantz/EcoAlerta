const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/database');
const transporter = require('../config/mailer');
const { validateCpfLength, cleanCpf, isAdult } = require('../utils/helpers');

const saltRounds = 10;

// --- REGISTRO ---
exports.register = async (req, res) => {
    const { nomeCompleto, cpf, dataNascimento, email, password } = req.body;
    let connection;

    const cleanedCpf = cleanCpf(cpf);
    const validatedCpf = validateCpfLength(cleanedCpf);
    
    if (!validatedCpf) {
        return res.status(400).send('Erro: CPF inválido.');
    }

    let formattedDate = dataNascimento;

    try {
        connection = await pool.getConnection();
        const password_hash = await bcrypt.hash(password, saltRounds);

        const [existing] = await connection.execute('SELECT id FROM users WHERE cpf = ? OR email = ?', [validatedCpf, email]);
        if (existing.length > 0) {
            return res.status(409).send('Erro: CPF ou Email já cadastrado(s)!');
        }

        const sql = `
            INSERT INTO users (nomeCompleto, cpf, dataNascimento, email, password_hash, is_admin, terms_accepted_at)
            VALUES (?, ?, ?, ?, ?, 0, NOW())
        `;
        await connection.execute(sql, [nomeCompleto, validatedCpf, formattedDate, email, password_hash]);

        res.send('Cadastro realizado com sucesso! <a href="/login.html">Faça Login</a>');

    } catch (error) {
        console.error('[Auth] Erro no registro:', error);
        return res.status(500).send('Erro interno do servidor ao registrar.');
    } finally {
        if (connection) connection.release();
    }
};

// --- LOGIN ---
exports.login = async (req, res) => {
    const { cpf, password } = req.body; // Login por CPF
    let connection;

    try {
        const cleanedCpf = cleanCpf(cpf);
        const validatedCpf = validateCpfLength(cleanedCpf); 
        
        if (!validatedCpf) {
            return res.status(400).json({ mensagem: 'O CPF deve ter 11 dígitos.', campo: 'cpf' });
        }

        connection = await pool.getConnection();

        const [rows] = await connection.execute('SELECT id, password_hash FROM users WHERE cpf = ?', [validatedCpf]);

        if (rows.length === 0) {
            return res.status(401).json({ mensagem: 'CPF não encontrado no sistema.', campo: 'cpf' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            const [fullUserRows] = await connection.execute(
                'SELECT nomeCompleto, email, is_admin FROM users WHERE id = ?', 
                [user.id]
            );
            const fullUser = fullUserRows[0];

            req.session.userId = user.id;
            req.session.nomeCompleto = fullUser.nomeCompleto;
            req.session.email = fullUser.email;
            req.session.isAdmin = fullUser.is_admin;

            return res.status(200).json({ mensagem: 'Login bem-sucedido!' });
        } else {
            return res.status(401).json({ mensagem: 'Senha incorreta.', campo: 'password' });
        }

    } catch (error) {
        console.error('[Auth] Erro no login:', error); 
        return res.status(500).json({ mensagem: 'Erro interno no servidor.', campo: 'geral' });
    } finally {
        if (connection) connection.release();
    }
};

// --- LOGOUT ---
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('[Auth] Erro no logout:', err);
        res.redirect('/login.html');
    });
};

// --- PERFIL (GET) ---
exports.getProfile = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const userId = req.session.userId;

        const [userData] = await connection.execute(
            'SELECT nomeCompleto, cpf, dataNascimento, email FROM users WHERE id = ?',
            [userId]
        );

        const [denunciasEnviadas] = await connection.execute(
            'SELECT * FROM denuncias WHERE id_usuario = ? ORDER BY data_envio DESC',
            [userId]
        );

        if (userData.length === 0) {
            return res.status(404).send("Usuário não encontrado.");
        }

        res.render('perfil', {
            usuario: userData[0],
            denuncias: denunciasEnviadas,
            message: null // Garante que a variável message exista
        });

    } catch (error) {
        console.error('[Auth] Erro ao carregar perfil:', error);
        res.status(500).send('Erro ao carregar perfil.');
    } finally {
        if (connection) connection.release();
    }
};

// --- ATUALIZAR PERFIL (POST) ---
exports.updateProfile = async (req, res) => {
    const { nomeCompleto, dataNascimento, email } = req.body;
    const userId = req.session.userId;
    let connection;

    try {
        connection = await pool.getConnection();

        // --- VALIDAÇÃO DE TAMANHO (100 CARACTERES) ---
        if (nomeCompleto && nomeCompleto.length > 100) {
            return res.status(400).json({ mensagem: 'Erro: Nome muito longo (Máx 100 caracteres).' });
        }
        if (email && email.length > 100) {
            return res.status(400).json({ mensagem: 'Erro: Email muito longo (Máx 100 caracteres).' });
        }
        // ----------------------------------------------

        let updateFields = [];
        let updateValues = [];

        // Regra de Negócio: Maioridade
        if (dataNascimento) {
            if (!isAdult(dataNascimento)) {
                return res.status(400).json({ mensagem: 'O usuário precisa ter 18 anos ou mais.' });
            }
            updateFields.push('dataNascimento = ?');
            updateValues.push(dataNascimento);
        }

        // Verifica unicidade de e-mail
        if (email) {
            const [existingEmail] = await connection.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ mensagem: 'Este e-mail já está em uso.' });
            }
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        if (nomeCompleto) {
            updateFields.push('nomeCompleto = ?');
            updateValues.push(nomeCompleto);
        }

        if (updateFields.length === 0) {
            return res.json({ mensagem: 'Nenhuma alteração realizada.' });
        }

        const sqlUserUpdate = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(userId);
        await connection.execute(sqlUserUpdate, updateValues);

        // Atualiza sessão e denúncias
        if (nomeCompleto) {
            req.session.nomeCompleto = nomeCompleto;
            await connection.execute(
                'UPDATE denuncias SET nome_exibicao = ? WHERE id_usuario = ? AND anonimo = 0',
                [nomeCompleto, userId]
            );
        }
        if (email) {
            req.session.email = email;
        }

        return res.status(200).json({ mensagem: 'Perfil atualizado com sucesso.' });

    } catch (error) {
        console.error('[Auth] Erro ao atualizar perfil:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao atualizar.' });
    } finally {
        if (connection) connection.release();
    }
};

// --- ALTERAR SENHA (POST) ---
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    let connection;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).send('Nova senha deve ter no mínimo 6 caracteres.');
    }

    try {
        connection = await pool.getConnection();
        const [userRow] = await connection.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        const oldHash = userRow[0].password_hash;

        const match = await bcrypt.compare(currentPassword, oldHash);
        if (!match) {
            return res.status(401).send('Senha atual incorreta.');
        }

        const newPassword_hash = await bcrypt.hash(newPassword, saltRounds);
        await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword_hash, userId]);

        res.status(200).send('Senha alterada com sucesso!');

    } catch (error) {
        console.error('[Auth] Erro ao mudar senha:', error);
        res.status(500).send('Erro interno.');
    } finally {
        if (connection) connection.release();
    }
};

// --- TERMOS DE USO (Resolvendo o erro das rotas) ---
exports.getTermsPage = async (req, res) => {
    res.render('terms', { 
        usuarioNome: req.session.nomeCompleto || 'Visitante', 
        error: req.query.error 
    });
};

exports.acceptTerms = async (req, res) => {
    const userId = req.session.userId;
    let connection;

    if (!userId) return res.redirect('/login.html');

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

// --- RECUPERAÇÃO DE SENHA ---
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();
        const [users] = await connection.execute('SELECT id, nomeCompleto FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(200).json({ mensagem: 'Se o e-mail existir, o link foi enviado.' });
        }

        const user = users[0];
        const token = crypto.randomBytes(20).toString('hex');
        const now = new Date();
        now.setHours(now.getHours() + 1);

        // Usa reset_password_token (padrão do seu banco)
        await connection.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [token, now, user.id]
        );

        const resetLink = `http://${req.headers.host}/reset-password/${token}`;

        await transporter.sendMail({
            from: `EcoAlerta <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Recuperação de Senha - EcoAlerta',
            html: `<p>Olá ${user.nomeCompleto},</p><p>Clique para redefinir sua senha: <a href="${resetLink}">${resetLink}</a></p>`
        });

        res.status(200).json({ mensagem: 'Link enviado.' });

    } catch (error) {
        console.error('[Auth] Erro no forgotPassword:', error);
        res.status(500).json({ mensagem: 'Erro ao processar.' });
    } finally {
        if (connection) connection.release();
    }
};

exports.renderResetPassword = async (req, res) => {
    const { token } = req.params;
    let connection;

    try {
        connection = await pool.getConnection();
        const [users] = await connection.execute(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.send('<h1 style="text-align:center; margin-top:50px;">Link inválido ou expirado.</h1>');
        }

        res.render('reset_password', { token });

    } catch (error) {
        console.error('[Auth] Erro ao renderizar reset:', error);
        res.status(500).send('Erro interno.');
    } finally {
        if (connection) connection.release();
    }
};

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

        const password_hash = await bcrypt.hash(password, saltRounds);

        await connection.execute(
            'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [password_hash, users[0].id]
        );

        res.render('reset_success');

    } catch (error) {
        console.error('[Auth] Erro ao resetar senha:', error);
        res.status(500).send('Erro ao resetar senha.');
    } finally {
        if (connection) connection.release();
    }
};