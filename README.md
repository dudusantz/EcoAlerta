# EcoAlerta

O **EcoAlerta** é uma plataforma web desenvolvida para facilitar a denúncia de crimes e irregularidades ambientais. O sistema conecta cidadãos conscientes a órgãos fiscalizadores, permitindo o envio de denúncias (anônimas ou identificadas) com fotos e localização, além de oferecer um painel administrativo para gestão e resolução dos casos.

---

## Tecnologias Utilizadas

O projeto foi construído utilizando a arquitetura **MVC (Model-View-Controller)** com as seguintes tecnologias:

* **Backend:** Node.js e Express
* **Banco de Dados:** MySQL
* **Frontend:** EJS (Embedded JavaScript), CSS3 e Bootstrap
* **Uploads:** Multer (Gestão de imagens)
* **Autenticação:** Sessões e Criptografia de senhas

---

## Instalação e Configuração

Siga os passos abaixo para rodar o projeto na sua máquina local.

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) instalado.
* [MySQL Workbench](https://www.mysql.com/products/workbench/) (ou outro cliente SQL) instalado.
* Git instalado.

### 2. Clonar o Repositório
Abra o terminal e rode:

bash
git clone [https://github.com/dudusantz/EcoAlerta.git](https://github.com/dudusantz/EcoAlerta.git)
cd EcoAlerta
3. Instalar Dependências
Baixe as bibliotecas necessárias listadas no package.json:

Bash

npm install
4. Configurar Variáveis de Ambiente (.env)
Por segurança, o arquivo de configurações não é enviado para o GitHub. Crie um arquivo chamado .env na raiz do projeto e preencha com os dados do seu banco MySQL:

Snippet de código

# Configuração do Servidor
PORT=3000

# Configuração do Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASS=SUA_SENHA_AQUI
DB_NAME=ecoalerta_db
(Substitua SUA_SENHA_AQUI pela senha do seu MySQL)

Configuração do Banco de Dados
Abra o seu MySQL Workbench (ou terminal SQL) e execute o script abaixo. Ele criará o banco e todas as tabelas necessárias já atualizadas.

SQL

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
Como criar um Usuário Administrador
Como o banco começa vazio, siga este passo a passo para acessar o painel de admin:

Rode o projeto e abra no navegador.

Vá em "Cadastrar" e crie uma conta comum.

No MySQL, rode o comando abaixo para transformar essa conta em Admin:

SQL

UPDATE users SET is_admin = 1 WHERE id = 1;
Executando o Projeto
Após configurar tudo, inicie o servidor:

Bash

node server.js
O sistema estará disponível em: http://localhost:3000

## Autor

**Eduardo Vinicius**
[Perfil no GitHub](https://github.com/dudusantz)
[Perfil no LinkedIn](https://www.linkedin.com/in/eduardo-vinicius-35bb56344/)
