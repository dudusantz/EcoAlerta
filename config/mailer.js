const nodemailer = require('nodemailer');

// Configuração do transportador SMTP (Gmail) para envio de notificações do sistema
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // As credenciais devem ser configuradas no arquivo .env para segurança
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

module.exports = transporter;