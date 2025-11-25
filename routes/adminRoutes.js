const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

// Todas as rotas abaixo requerem privilégio de Administrador
router.get('/', isAdmin, adminController.getAdminPanel);

// Fluxo de Moderação
router.post('/update-status', isAdmin, adminController.updateDenunciaStatus);
router.post('/resolve-denuncia', isAdmin, adminController.resolveDenuncia); 

module.exports = router;