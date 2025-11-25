const transporter = require('../config/mailer');
const path = require('path');

// Importação dinâmica do node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// --- VALIDAÇÕES E FORMATAÇÃO ---

function cleanCpf(cpf) { 
    return cpf ? cpf.replace(/\D/g, '') : '';
}

function validateCpfLength(cpf) { 
    const cleaned = cleanCpf(cpf);
    return cleaned.length === 11 ? cleaned : false;
}

function safeFileName(fileName) { 
    return path.basename(fileName); 
}

function isAdult(dateString) { 
    const birthDate = new Date(dateString);
    const today = new Date();
    const ageLimit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return birthDate <= ageLimit;
}

// --- INTEGRAÇÕES ---

async function reverseGeocode(coords) { 
    if (!coords) return 'Localização não informada';

    const regexCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
    if (!regexCoords.test(coords)) {
        return coords; 
    }

    try {
        const [lat, lon] = coords.split(',').map(c => c.trim());
        
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'EcoAlerta-App/1.0 (projeto-estudante)' 
            }
        });

        if (!response.ok) return coords;

        const data = await response.json();

        if (data && data.address) {
            const rua = data.address.road || data.address.pedestrian || '';
            const numero = data.address.house_number || '';
            const bairro = data.address.suburb || data.address.neighbourhood || '';
            const cidade = data.address.city || data.address.town || data.address.village || '';
            
            let enderecoFormatado = rua;
            if (numero) enderecoFormatado += `, ${numero}`;
            if (bairro) enderecoFormatado += ` - ${bairro}`;
            if (cidade) enderecoFormatado += ` - ${cidade}`;
            
            return enderecoFormatado || coords;
        }

        return coords;

    } catch (error) {
        console.error('Erro no reverseGeocode:', error.message);
        return coords; 
    }
}

// --- NOTIFICAÇÕES ---

async function sendNotificationEmail(recipientEmail, denunciaTitle, newStatus, rejectionReason = '') {
    const subject = `[EcoAlerta] Atualização: Denúncia ${newStatus}`;
    let htmlBody = '';

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
        console.error(`[MAIL ERROR] Falha ao enviar para ${recipientEmail}:`, error.message);
    }
}

module.exports = { 
    validateCpfLength, 
    cleanCpf, 
    safeFileName, 
    isAdult, 
    reverseGeocode, 
    sendNotificationEmail 
};