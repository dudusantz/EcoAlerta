const multer = require('multer');
const path = require('path');

// Estratégia de armazenamento: define o local e garante nomes únicos para evitar sobrescrita
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        // Cria um hash temporal (Timestamp + Random) para garantir que arquivos com mesmo nome não se substituam
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de Segurança: impede o upload de scripts maliciosos (.exe, .js, .php), aceitando apenas mídia
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo não suportado.'), false);
    }
};

// Inicialização do middleware com limite de 50MB para evitar sobrecarga do servidor (DoS)
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 
    }
});

module.exports = upload;