const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const transporter = require('../config/mailer');
const path = require('path');

// --- VALIDAÇÕES E FORMATAÇÃO ---

function cleanCpf(cpf) { 
    return cpf ? cpf.replace(/\D/g, '') : '';
}

function validateCpfLength(cpf) { 
    const cleaned = cleanCpf(cpf);
    return cleaned.length === 11 ? cleaned : false;
}

// Segurança: Previne 'Path Traversal' removendo diretórios do nome do arquivo
function safeFileName(fileName) { 
    return path.basename(fileName); 
}

// Regra de Negócio: Validação de Maioridade (18 anos)
function isAdult(dateString) { 
    const birthDate = new Date(dateString);
    const today = new Date();
    // Cria data limite exata (Hoje - 18 anos)
    const ageLimit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return birthDate <= ageLimit;
}

// --- INTEGRAÇÕES ---

async function reverseGeocode(locationString) { 
    // Stub: Retorna a string original se não for coordenada GPS crua
    // Futuro: Implementar chamada à API Google Maps/Nominatim aqui
    if (!locationString || !locationString.startsWith('GPS: Lat')) { return locationString; }
    
    return locationString; 
}

// --- NOTIFICAÇÕES ---

async function sendNotificationEmail(recipientEmail, denunciaTitle, newStatus, rejectionReason = '') {
    const subject = `[EcoAlerta] Atualização: Denúncia ${newStatus}`;
    let htmlBody = '';

    // Monta o corpo do e-mail baseado no status
    switch (newStatus) {
        case 'APROVADA':
            htmlBody = `
                <h2>Sua denúncia foi Aprovada!</h2>
                <p>O relato <strong>"${denunciaTitle}"</strong> já está visível no Feed público.</p>
                <p>Obrigado por contribuir com a comunidade.</p>
            `;
            break;
        case 'REJEITADA':
            htmlBody = `
                <h2>Atualização de Status</h2>
                <p>A denúncia <strong>"${denunciaTitle}"</strong> foi recusada.</p>
                <p><strong>Motivo:</strong> ${rejectionReason || 'Violação dos Termos de Uso.'}</p>
            `;
            break;
        case 'RESOLVIDA':
            htmlBody = `
                <h2 style="color:green;">Problema Resolvido!</h2>
                <p>A denúncia <strong>"${denunciaTitle}"</strong> foi marcada como resolvida.</p>
            `;
            break;
        default:
            htmlBody = `<p>O status da denúncia "${denunciaTitle}" mudou para: ${newStatus}.</p>`;
    }

    htmlBody += `<br><p><em>Atenciosamente,<br>Equipe EcoAlerta.</em></p>`;

    try {
        await transporter.sendMail({
            from: `EcoAlerta <${process.env.MAIL_USER}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlBody
        });
        console.log(`[MAIL] Notificação enviada para ${recipientEmail} (${newStatus})`);
    } catch (error) {
        // Log de erro não bloqueante (não quebra o fluxo do admin)
        console.error(`[MAIL ERROR] Falha ao enviar para ${recipientEmail}:`, error.message);
    }
}

module.exports = { validateCpfLength, cleanCpf, safeFileName, isAdult, reverseGeocode, sendNotificationEmail };