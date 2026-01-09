# 🌱 EcoAlerta

**EcoAlerta** é uma plataforma web desenvolvida como **projeto acadêmico** com o objetivo de facilitar a denúncia de crimes e irregularidades ambientais. O sistema conecta cidadãos conscientes a órgãos fiscalizadores, permitindo o envio de denúncias (anônimas ou identificadas) com fotos e localização, além de oferecer um painel administrativo para gestão e resolução dos casos.

---

## 🚀 Tecnologias Utilizadas

Este projeto foi construído seguindo a arquitetura **MVC (Model-View-Controller)**:

-   **Backend:** [Node.js](https://nodejs.org/) e [Express](https://expressjs.com/).
-   **Banco de Dados:** MySQL (via `mysql2`).
-   **Frontend:** EJS (Embedded JavaScript), CSS3 e Bootstrap.
-   **Autenticação:** Gestão de sessões (`express-session`) e criptografia de senhas (`bcrypt`).
-   **Uploads:** Multer (para upload de imagens das denúncias).
-   **E-mail:** Nodemailer (para notificações).
-   **Outros:** Geolocalização (API do navegador) e Boxicons.

---

## ✨ Funcionalidades

### Área Pública (Cidadão)
-   📢 **Denúncias:** Envio de denúncias ambientais com título, descrição e foto.
-   📍 **Geolocalização:** Captura automática da localização no momento da denúncia.
-   🕵️ **Anonimato:** Opção de enviar denúncias sem se identificar.
-   🔐 **Autenticação:** Cadastro e login de usuários para acompanhamento.

### Área Administrativa
-   📊 **Gestão de Denúncias:** Visualização de todas as ocorrências.
-   ✅ **Status:** Aprovação, rejeição ou marcação de denúncias como resolvidas.

---

## 📦 Instalação e Configuração

Siga os passos abaixo para rodar o projeto localmente.

### 1. Pré-requisitos
Certifique-se de ter instalado:
-   [Node.js](https://nodejs.org/)
-   MySQL Workbench (ou outro cliente SQL)
-   Git

### 2. Clonar o Repositório

```bash
git clone [https://github.com/dudusantz/EcoAlerta.git](https://github.com/dudusantz/EcoAlerta.git)
cd EcoAlerta

```

### 3. Instalar Dependências

```bash
npm install

```

### 4. Configurar Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto e preencha com as credenciais do seu banco de dados MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=SUA_SENHA_DO_MYSQL
DB_NAME=ecoalerta_db

```

### 5. Configurar o Banco de Dados

Abra seu cliente SQL (como o MySQL Workbench) e execute o script abaixo para criar o banco e as tabelas:

```sql
-- 1. Criação do Banco
CREATE DATABASE IF NOT EXISTS ecoalerta_db;
USE ecoalerta_db;

-- 2. Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomeCompleto VARCHAR(255) NOT NULL,
    cpf CHAR(11) UNIQUE NOT NULL,
    dataNascimento DATE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    reset_password_token VARCHAR(255) DEFAULT NULL,
    reset_password_expires DATETIME DEFAULT NULL,
    terms_accepted_at DATETIME NULL
);

-- 3. Tabela de Denúncias
CREATE TABLE IF NOT EXISTS denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    localizacao VARCHAR(255),
    nome_arquivo VARCHAR(255) NULL,
    status ENUM('PENDENTE', 'APROVADA', 'REJEITADA', 'RESOLVIDA') NOT NULL DEFAULT 'PENDENTE',
    usuario_id INT,
    nome_exibicao VARCHAR(100),
    anonimo TINYINT(1) DEFAULT 0,
    motivo_rejeicao VARCHAR(500) NULL,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id)
);

```

### 6. Criar um Usuário Administrador

Como o banco inicia vazio, siga estes passos para criar o primeiro admin:

1. Rode o projeto e acesse `http://localhost:3000`.
2. Vá em "Cadastrar" e crie uma conta comum.
3. No seu banco de dados MySQL, execute o comando abaixo para dar permissão de admin ao usuário criado (assumindo que seja o primeiro):

```sql
UPDATE users SET is_admin = 1 WHERE id = 1;

```

---

## ▶️ Executando o Projeto

Após configurar o banco e as variáveis de ambiente:

```bash
npm start
# ou
node server.js

```

Acesse em seu navegador: `http://localhost:3000`

---

## 🎓 Sobre

Este projeto foi desenvolvido por **Eduardo Vinicius** como parte de um trabalho acadêmico.

[Perfil no GitHub](https://github.com/dudusantz) | [Perfil no LinkedIn](https://www.linkedin.com/in/eduardo-vinicius-35bb56344/)

```

```
