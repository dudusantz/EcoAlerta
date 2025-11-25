const express = require('express');
const router = express.Router();
const denunciaController = require('../controllers/denunciaController');
const { isAuthenticated } = require('../middleware/auth');
const { checkTermsAcceptance } = require('../middleware/terms'); 
const upload = require('../config/multer');

// Middleware composto: Autenticação + Verificação de Termos
const protect = [isAuthenticated, checkTermsAcceptance];

// --- LEITURA E FORMULÁRIOS ---
router.get('/feed', ...protect, denunciaController.getFeed);
router.get('/denuncia', ...protect, denunciaController.getDenunciaForm);
router.get('/denuncia/detalhes/:id', ...protect, denunciaController.getDenunciaDetails);

// --- AÇÕES (Criação e Cancelamento) ---

// Wrapper do Multer para tratar erros de limite (ex: > 50MB) antes do controller
router.post('/submit-denuncia', ...protect, (req, res, next) => {
    upload.array('imagem', 5)(req, res, (err) => {
        if (err instanceof require('multer').MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('Erro: O arquivo excede o limite de 50MB.');
        }
        next(err); // Passa para o controller se não houver erro de upload
    });
}, denunciaController.submitDenuncia);

router.post('/denuncia/cancelar/:id', ...protect, denunciaController.cancelDenuncia);

// Rota utilitária (Listagem de Users)
router.get('/users', denunciaController.getAllUsers);

module.exports = router;