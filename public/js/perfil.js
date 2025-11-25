document.addEventListener('DOMContentLoaded', () => {
    const fieldsToEnable = ['nomeCompleto', 'email', 'dataNascimento'];
    const submitButton = document.getElementById('submitButton');
    const toggleButton = document.getElementById('btn-toggle-edit');
    const messageElement = document.getElementById('message');
    const passwordMessageElement = document.getElementById('passwordMessage');
    let currentDenunciaId = null;

    // --- Controle de Modais ---
    function openModal(id) { document.getElementById(id).style.display = 'flex'; } 
    function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    // Expondo funções globais para o onclick do HTML
    window.closeModal = closeModal;
    
    window.openChangePasswordModal = function() {
        openModal('changePasswordModal');
        passwordMessageElement.textContent = '';
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
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
        if (!currentDenunciaId) return;
        closeModal('confirmCancelModal');

        // Cria formulário dinâmico para submissão POST
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/denuncia/cancelar/${currentDenunciaId}`;
        document.body.appendChild(form);
        form.submit();
    });

    // --- Modo de Edição (Toggle) ---
    function setEditMode(enabled) {
        fieldsToEnable.forEach(id => {
            const field = document.getElementById(id);
            if (field) field.disabled = !enabled;
        });
        submitButton.disabled = !enabled;
        toggleButton.textContent = enabled ? 'Cancelar Edição' : 'Editar Perfil';
        toggleButton.style.backgroundColor = enabled ? '#d32f2f' : 'var(--secondary-color)';
        messageElement.textContent = '';
    }

    window.toggleEditMode = function() {
        setEditMode(submitButton.disabled); // Inverte estado atual
    }

    setEditMode(false); // Estado inicial

    // --- Atualizar Perfil (AJAX) ---
    document.getElementById('editForm').addEventListener('submit', async function(e) {
        e.preventDefault(); 
        messageElement.textContent = 'Salvando...';
        messageElement.style.color = '#007bff';

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
                messageElement.textContent = resData.mensagem || 'Sucesso.';
                messageElement.style.color = 'var(--secondary-color)';
                setTimeout(() => window.location.reload(), 1000);
            } else {
                messageElement.textContent = `Erro: ${resData.mensagem || 'Falha ao atualizar.'}`;
                messageElement.style.color = '#d32f2f';
            }
        } catch (error) {
            messageElement.textContent = 'Erro de conexão.';
            messageElement.style.color = '#d32f2f';
        }
    });

    // --- Alterar Senha (AJAX) ---
    document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const currentPass = document.getElementById('modalCurrentPassword').value;
        const newPass = document.getElementById('modalNewPassword').value;

        if (newPass.length < 6) {
            passwordMessageElement.className = 'message-error';
            return passwordMessageElement.textContent = 'Mínimo 6 caracteres.';
        }

        try {
            const response = await fetch('/perfil/senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
            });

            if (response.ok) {
                passwordMessageElement.className = 'message-success';
                passwordMessageElement.textContent = 'Senha alterada!';
                setTimeout(() => closeModal('changePasswordModal'), 2000);
            } else {
                const text = await response.text();
                passwordMessageElement.className = 'message-error';
                passwordMessageElement.textContent = text;
            }
        } catch (error) {
            passwordMessageElement.className = 'message-error';
            passwordMessageElement.textContent = 'Erro de servidor.';
        }
    });
});