// Script para a página de login

document.addEventListener('DOMContentLoaded', function() {
    // Redirecionar se já estiver logado
    
    const loginForm = document.getElementById('loginForm');
    
    
    // Adicionar animação aos campos de input
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        
        input.addEventListener('input', function() {
            hideError();
        });
    });
});