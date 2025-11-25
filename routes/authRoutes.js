const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// --- ACESSO PÚBLICO ---
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Termos de uso (acessível sem login)
router.get('/view-terms', authController.getTermsPage);

// --- RECUPERAÇÃO DE SENHA ---
router.get('/esqueci-senha', (req, res) => {
    res.sendFile('esqueci_senha.html', { root: './public' });
});

router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.renderResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// --- ÁREA RESTRITA (Requer Login) ---

// Gestão de Perfil
router.get('/perfil', isAuthenticated, authController.getProfile);
router.post('/perfil', isAuthenticated, authController.updateProfile);
router.post('/perfil/senha', isAuthenticated, authController.changePassword);

// Fluxo de Aceite de Termos (Pós-Login)
router.get('/terms', isAuthenticated, authController.getTermsPage);
router.post('/accept-terms', isAuthenticated, authController.acceptTerms);

module.exports = router;