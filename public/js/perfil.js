document.addEventListener('DOMContentLoaded', () => {
    const fieldsToEnable = ['nomeCompleto', 'email', 'dataNascimento'];
    const submitButton = document.getElementById('submitButton');
    const toggleButton = document.getElementById('btn-toggle-edit');
    const messageElement = document.getElementById('message');
    const passwordMessageElement = document.getElementById('passwordMessage');
    let currentDenunciaId = null;

    // Variável para guardar os valores originais
    let originalValues = {}; 

    // --- Controle de Modais ---
    function openModal(id) { document.getElementById(id).style.display = 'flex'; } 
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    // Expondo funções globais para o onclick do HTML
    window.closeModal = closeModal;
    
    window.openChangePasswordModal = function() {
        openModal('changePasswordModal');
        if (passwordMessageElement) passwordMessageElement.textContent = '';
        document.getElementById('changePasswordForm').reset();
    }

    window.openConfirmModal = function(denunciaId) {
        currentDenunciaId = denunciaId;
        openModal('confirmCancelModal');
    }

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) closeModal(event.target.id);
    }

    // --- Cancelamento de Denúncia ---
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (!currentDenunciaId) return;
            closeModal('confirmCancelModal');

            // Cria formulário dinâmico para submissão POST
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `/denuncia/cancelar/${currentDenunciaId}`;
            document.body.appendChild(form);
            form.submit();
        });
    }

    // --- Modo de Edição (Com Restauração de Valores) ---
    window.toggleEditMode = function() {
        // Verifica se já está editando (se o botão de salvar está habilitado)
        const isEditing = !submitButton.disabled;

        if (!isEditing) {
            // --- ATIVAR MODO EDIÇÃO ---
            fieldsToEnable.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    // 1. Salva o valor atual antes de liberar
                    originalValues[id] = field.value;
                    field.disabled = false;
                    field.style.borderColor = 'var(--secondary-color)'; // Destaque visual
                }
            });
            
            submitButton.disabled = false;
            toggleButton.textContent = 'Cancelar Edição';
            toggleButton.style.backgroundColor = '#d32f2f'; // Vermelho
            if (messageElement) messageElement.textContent = '';

        } else {
            // --- CANCELAR EDIÇÃO (Restaurar) ---
            fieldsToEnable.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    // 1. Restaura o valor original salvo
                    if (originalValues[id] !== undefined) {
                        field.value = originalValues[id];
                    }
                    field.disabled = true;
                    field.style.borderColor = ''; // Remove destaque
                }
            });

            submitButton.disabled = true;
            toggleButton.textContent = 'Editar Perfil';
            toggleButton.style.backgroundColor = 'var(--secondary-color)'; // Volta ao verde
            if (messageElement) messageElement.textContent = '';
        }
    }

    // --- Atualizar Perfil (AJAX) ---
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault(); 
            if (messageElement) {
                messageElement.textContent = 'Salvando...';
                messageElement.style.color = '#007bff';
            }

            const dataToSend = {};
            fieldsToEnable.forEach(id => {
                const el = document.getElementById(id);
                if(el) dataToSend[el.name] = el.value;
            });

            try {
                const response = await fetch('/perfil', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend)
                });

                const resData = await response.json().catch(() => ({}));

                if (response.ok) {
                    if (messageElement) {
                        messageElement.textContent = resData.mensagem || 'Sucesso.';
                        messageElement.style.color = 'var(--secondary-color)';
                    }
                    // Atualiza os valores originais com os novos salvos
                    fieldsToEnable.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) originalValues[id] = el.value;
                    });
                    
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    if (messageElement) {
                        messageElement.textContent = `Erro: ${resData.mensagem || 'Falha ao atualizar.'}`;
                        messageElement.style.color = '#d32f2f';
                    }
                }
            } catch (error) {
                if (messageElement) {
                    messageElement.textContent = 'Erro de conexão.';
                    messageElement.style.color = '#d32f2f';
                }
            }
        });
    }

    // --- Alterar Senha (AJAX) ---
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const currentPass = document.getElementById('modalCurrentPassword').value;
            const newPass = document.getElementById('modalNewPassword').value;

            if (newPass.length < 6) {
                if (passwordMessageElement) {
                    passwordMessageElement.className = 'message-error';
                    passwordMessageElement.textContent = 'Mínimo 6 caracteres.';
                }
                return;
            }

            try {
                const response = await fetch('/perfil/senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
                });

                if (response.ok) {
                    if (passwordMessageElement) {
                        passwordMessageElement.className = 'message-success';
                        passwordMessageElement.textContent = 'Senha alterada!';
                    }
                    setTimeout(() => closeModal('changePasswordModal'), 2000);
                } else {
                    const text = await response.text();
                    if (passwordMessageElement) {
                        passwordMessageElement.className = 'message-error';
                        passwordMessageElement.textContent = text;
                    }
                }
            } catch (error) {
                if (passwordMessageElement) {
                    passwordMessageElement.className = 'message-error';
                    passwordMessageElement.textContent = 'Erro de servidor.';
                }
            }
        });
    }
});