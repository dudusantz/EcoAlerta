// server.js

// ----------------------------------------------------
// 1. IMPORTAÇÕES
// ----------------------------------------------------
const express = require('express');
const path = require('path');
const session = require('express-session'); 
const { isAuthenticated } = require('./middleware/auth'); // Middleware de autenticação
const { checkTermsAcceptance } = require('./middleware/terms'); // Middleware de checagem de termos (Ainda importado, mas não usado globalmente)

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa o agregador de rotas
const allRoutes = require('./routes');

const app = express();
const PORT = 3000;

// --- MIDDLEWARES E CONFIGURAÇÕES ---
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads')); 

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// **********************************************
// 2. ROTAS DA APLICAÇÃO (Todas as rotas públicas e protegidas)
// **********************************************

// O middleware isAuthenticated e checkTermsAcceptance serão aplicados DENTRO 
// dos arquivos de rotas (denunciaRoutes.js e authRoutes.js).
app.use('/', allRoutes);

// --- ROTA RAIZ ---
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// --- INICIA O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Página de Denúncia: http://localhost:${PORT}/denuncia`);
    console.log(`Feed de Denúncias: http://localhost:${PORT}/feed`);
    console.log(`Painel Admin: http://localhost:${PORT}/admin`);
});