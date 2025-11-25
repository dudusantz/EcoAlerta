const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const denunciaRoutes = require('./denunciaRoutes');
const adminRoutes = require('./adminRoutes');

// Centralizador de rotas da API
router.use(authRoutes);
router.use(denunciaRoutes);

// Rotas administrativas (prefixo /admin + middleware de segurança interno)
router.use('/admin', adminRoutes); 

module.exports = router;