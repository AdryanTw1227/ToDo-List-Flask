document.addEventListener('DOMContentLoaded', () => {
    carregarTarefas();

    const form = document.getElementById('todoForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const texto = document.getElementById('tarefaTexto').value.trim();
        const prioridade = document.getElementById('prioridade').value;
        let categoria = document.getElementById('categoria').value;
        const personalizada = document.getElementById('categoriaPersonalizada').value.trim();
        if (categoria === 'Personalizada') categoria = personalizada || 'Personalizada';

        const novaTarefa = { texto, prioridade, categoria };

        try {
            const res = await fetch('/api/tarefas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaTarefa)
            });

            if (res.ok) {
                const tarefaCriada = await res.json();
                tarefasArray.push(tarefaCriada);
                form.reset();
                atualizarEstatisticas();
                popularFiltroCategoria();
                renderizarTarefasFiltradas();
            } else {
                console.error('Erro ao criar tarefa');
            }
        } catch (err) {
            console.error('Erro:', err);
        }
    });

    window.tarefasArray = [];

    const inputBusca = document.getElementById('busca');
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const selectOrdenacao = document.getElementById('ordenacao');

    [inputBusca, filtroStatus, filtroCategoria, selectOrdenacao].forEach(el => {
        el.addEventListener('input', renderizarTarefasFiltradas);
        el.addEventListener('change', renderizarTarefasFiltradas);
    });

    // Delegação de evento para lista de tarefas (concluir, apagar, editar)
    document.getElementById('todosList').addEventListener('click', async (e) => {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        const id = item.dataset.id;

        // Concluir/desconcluir
        if (e.target.closest('.todo-checkbox')) {
            await toggleConcluida(id, item);
        }

        // Apagar tarefa
        else if (e.target.closest('.delete-btn')) {
            await deletarTarefa(id);
        }

        // Editar tarefa
        else if (e.target.closest('.edit-btn')) {
            await editarTarefa(id);
        }
    });

    async function carregarTarefas() {
        try {
            const res = await fetch('/api/tarefas');
            if (res.ok) {
                const tarefas = await res.json();
                tarefasArray = tarefas;
                popularFiltroCategoria();
                atualizarEstatisticas();
                renderizarTarefasFiltradas();
            }
        } catch (err) {
            console.error('Erro ao carregar:', err);
        }
    }

    function popularFiltroCategoria() {
        const categoriasUnicas = new Set(tarefasArray.map(t => t.categoria));
        filtroCategoria.innerHTML = `<option value="todas">Todas</option>`;
        categoriasUnicas.forEach(cat => {
            filtroCategoria.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }

    function filtrarETornarTarefasFiltradas() {
        const termoBusca = inputBusca.value.toLowerCase();
        const status = filtroStatus.value;
        const categoriaFiltro = filtroCategoria.value;
        const ordenacao = selectOrdenacao.value;

        let filtradas = tarefasArray.filter(tarefa => {
            const textoMatch = tarefa.texto.toLowerCase().includes(termoBusca);
            const statusMatch =
                status === 'todas' ? true :
                    status === 'pendentes' ? !tarefa.concluida :
                        status === 'concluidas' ? tarefa.concluida : true;
            const categoriaMatch = categoriaFiltro === 'todas' ? true : tarefa.categoria === categoriaFiltro;

            return textoMatch && statusMatch && categoriaMatch;
        });

        if (ordenacao === 'recentes') {
            filtradas.sort((a, b) => new Date(b.criada_em) - new Date(a.criada_em));
        } else if (ordenacao === 'antigas') {
            filtradas.sort((a, b) => new Date(a.criada_em) - new Date(b.criada_em));
        } else if (ordenacao === 'prioridade') {
            const prioridadeValor = p => {
                if (p === 'alta') return 3;
                if (p === 'media') return 2;
                if (p === 'baixa') return 1;
                return 0;
            };
            filtradas.sort((a, b) => prioridadeValor(b.prioridade) - prioridadeValor(a.prioridade));
        }

        return filtradas;
    }

    function renderizarTarefasFiltradas() {
        const lista = document.getElementById('todosList');
        lista.innerHTML = '';

        const tarefasParaMostrar = filtrarETornarTarefasFiltradas();

        if (tarefasParaMostrar.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            document.getElementById('emptyState').style.display = 'none';
        }

        tarefasParaMostrar.forEach(adicionarTarefaNaPagina);
        atualizarEstatisticas();
    }

    function adicionarTarefaNaPagina(tarefa) {

        const data = tarefa.criada_em ? new Date(tarefa.criada_em) : null;
        const dataFormatada = (data && !isNaN(data)) ? data.toLocaleDateString('pt-BR') : 'Sem data';

        const lista = document.getElementById('todosList');

        const prioridadeEmoji = { baixa: '🟢', media: '🟡', alta: '🔴' };
        const tarefaHTML = `
            <div class="todo-item ${tarefa.concluida ? 'completed' : ''}" data-id="${tarefa.id}" data-prioridade="${tarefa.prioridade}">
                <div class="todo-content">
                    <div class="todo-checkbox ${tarefa.concluida ? 'checked' : ''}" title="Concluir">
                        ${tarefa.concluida ? '<svg width="16" height="16" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
                    </div>
                    <div class="todo-details">
                        <p class="todo-text">${tarefa.texto}</p>
                        <div class="todo-meta">
                            <span>${dataFormatada}</span>
                            <span>${tarefa.categoria}</span>
                            <span>${prioridadeEmoji[tarefa.prioridade]} ${tarefa.prioridade}</span>
                        </div>
                    </div>
                    <div class="todo-actions">
                        <button class="todo-action-btn edit-btn" title="Editar">✏️</button>
                        <button class="todo-action-btn delete-btn" title="Remover">🗑️</button>
                    </div>
                </div>
            </div>`;
        lista.insertAdjacentHTML('beforeend', tarefaHTML);
    }

    async function toggleConcluida(id, item) {
        const isCompleted = item.classList.contains('completed');
        try {
            const res = await fetch(`/api/tarefas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concluida: !isCompleted })
            });
            if (res.ok) {
                // Atualiza array local
                const tarefaLocal = tarefasArray.find(t => t.id == id);
                if (tarefaLocal) tarefaLocal.concluida = !isCompleted;
                renderizarTarefasFiltradas();
            }
        } catch (err) {
            console.error('Erro ao concluir:', err);
        }
    }

    async function deletarTarefa(id) {
        try {
            const res = await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                tarefasArray = tarefasArray.filter(t => t.id != id);
                renderizarTarefasFiltradas();
            }
        } catch (err) {
            console.error('Erro ao deletar:', err);
        }
    }

    async function editarTarefa(id) {
        const tarefaLocal = tarefasArray.find(t => t.id == id);
        if (!tarefaLocal) return;

        const novoTexto = prompt('Editar tarefa:', tarefaLocal.texto);
        if (!novoTexto || novoTexto.trim() === tarefaLocal.texto.trim()) return;

        try {
            const res = await fetch(`/api/tarefas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: novoTexto.trim() })
            });
            if (res.ok) {
                tarefaLocal.texto = novoTexto.trim();
                renderizarTarefasFiltradas();
            }
        } catch (err) {
            console.error('Erro ao editar tarefa:', err);
        }
    }

    function atualizarEstatisticas() {
        const tarefasVisiveis = filtrarETornarTarefasFiltradas();
        const concluidasVisiveis = tarefasVisiveis.filter(t => t.concluida);
        const altaPrioridadeAtivas = tarefasVisiveis.filter(t => t.prioridade === 'alta' && !t.concluida).length;

        document.getElementById('totalTarefas').textContent = tarefasVisiveis.length;
        document.getElementById('tarefasPendentes').textContent = tarefasVisiveis.length - concluidasVisiveis.length;
        document.getElementById('tarefasConcluidas').textContent = concluidasVisiveis.length;
        document.getElementById('tarefasAltaPrioridade').textContent = altaPrioridadeAtivas;

        document.getElementById('emptyState').style.display = tarefasVisiveis.length === 0 ? 'block' : 'none';
        document.getElementById('todosCount').textContent = `${tarefasVisiveis.length} tarefa${tarefasVisiveis.length !== 1 ? 's' : ''}`;
    }
});
