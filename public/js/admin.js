let currentDenunciaId = null;

// --- Controle de Modal ---
function closeRejectionModal() {
    document.getElementById('rejectionModal').classList.remove('is-visible');
}

function openRejectionModal(denunciaId) {
    currentDenunciaId = denunciaId;
    document.getElementById('rejectionModal').classList.add('is-visible');
    document.getElementById('rejectionReasonInput').value = '';
    document.getElementById('rejectionError').textContent = '';
}

// --- Atualização de Status (Aprovar/Rejeitar) ---
async function updateStatus(denunciaId, newStatus, rejectionReason = '') {
    const feedbackElement = document.getElementById(`feedback-${denunciaId}`);

    // Validação: Rejeição exige motivo preenchido
    if (newStatus === 'REJEITADA' && !rejectionReason.trim()) {
        document.getElementById('rejectionError').textContent = 'Motivo obrigatório.';
        return;
    }

    if (feedbackElement) {
        feedbackElement.textContent = 'Processando...';
        feedbackElement.className = 'feedback';
    }
    closeRejectionModal();

    try {
        const response = await fetch('/admin/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: denunciaId, newStatus, rejectionReason })
        });

        if (response.ok) {
            window.location.reload(); // Recarrega para atualizar lista
        } else {
            const errorText = await response.text();
            alert(`Erro na Moderação: ${errorText}`);
            if (feedbackElement) {
                feedbackElement.textContent = `Falha: ${errorText}`;
                feedbackElement.className = 'feedback error';
            }
        }
    } catch (error) {
        alert('Erro de conexão com o servidor.');
    }
}

// --- Event Listeners ---
document.getElementById('rejectionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const reason = document.getElementById('rejectionReasonInput').value;
    updateStatus(currentDenunciaId, 'REJEITADA', reason);
});

// Fecha modal ao clicar fora
window.onclick = function (event) {
    if (event.target == document.getElementById('rejectionModal')) {
        closeRejectionModal();
    }
}