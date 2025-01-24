let carrinho = {};  // Formato: {produtoId_tamanho: {produto, quantidade, tamanho}}
let produtos = [];

// Variáveis globais para controle de imagens
let imagensAtuais = [];
let indiceImagemAtual = 0;

// Adicionar variável global para brinde selecionado
let brindeEscolhido = null;

// Adicionar variáveis globais
let usuarioAtual = null;
const DESCONTO_PRIMEIRA_COMPRA = 0.05; // 5% de desconto

// Carregar produtos do arquivo JSON
async function carregarProdutosJSON() {
    try {
        const response = await fetch('/produtos.json');
        const data = await response.json();
        produtos = data.produtos;
        carregarProdutos();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos. Por favor, verifique se o servidor está rodando.');
    }
}

// Carregar produtos na página
function carregarProdutos() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    produtos.forEach(produto => {
        let tamanhoHtml = '';
        
        if (produto.categoria !== 'colares') {
            // Mostrar guia de tamanhos apenas para anéis
            const guiaTamanhos = produto.categoria === 'aneis' ? `
                <a href="#" class="size-guide-link mb-2 d-block" onclick="abrirGuiaTamanhos(event)">
                    <i class="bi bi-rulers"></i> Guia de Tamanhos
                </a>
            ` : '';

            // Criar botões de tamanho
            const tamanhosButtons = produto.tamanhos
                .map(tamanho => `
                    <button type="button" 
                            class="size-btn me-2 mb-2"
                            data-tamanho="${tamanho}"
                            onclick="selecionarTamanho(this, ${produto.id})"
                            ${produto.tamanhos.length === 1 ? 'disabled' : ''}>
                        ${tamanho}
                    </button>
                `).join('');
                
            tamanhoHtml = `
                <div class="mb-3">
                    ${guiaTamanhos}
                    <div class="tamanhos-container" id="tamanhos-${produto.id}">
                        ${tamanhosButtons}
                    </div>
                    <input type="hidden" id="tamanho-${produto.id}" 
                           value="${produto.tamanhos.length === 1 ? produto.tamanhos[0] : ''}">
                </div>
            `;
        }

        // Calcular stock total
        const stockTotal = produto.categoria === 'colares' ? 1 : produto.tamanhos.length;

        const produtoElement = `
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="card product-card">
                    <img src="${produto.imagem[0]}" 
                         class="card-img-top mt-3" 
                         alt="${produto.nome}"
                         onclick="abrirModalImagem('${produto.nome}')">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${produto.nome}</h5>
                        <p class="card-text">${produto.descricao}</p>
                        <p class="card-text">
                            <strong>€${produto.preco.toFixed(2)}</strong>
                        </p>
                        ${tamanhoHtml}
                        <button onclick="adicionarAoCarrinho(${produto.id})" 
                                class="btn btn-primary mt-auto"
                                ${stockTotal === 0 ? 'disabled' : ''}>
                            ${stockTotal === 0 ? 'Sem Stock' : 'Adicionar ao Carrinho'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += produtoElement;
    });

    // Atualizar o select de tamanhos sem usar tags de imagem
    const sizeFilter = document.getElementById('sizeFilter');
    sizeFilter.innerHTML = `
        <option value="todos">Todos os Tamanhos</option>
    `;

    // Coletar todos os tamanhos únicos
    const tamanhosUnicos = new Set();
    produtos.forEach(produto => {
        if (produto.tamanhos) {
            produto.tamanhos.forEach(tamanho => {
                tamanhosUnicos.add(tamanho);
            });
        }
    });

    // Adicionar cada tamanho como opção
    Array.from(tamanhosUnicos).sort().forEach(tamanho => {
        sizeFilter.innerHTML += `
            <option value="${tamanho}">${tamanho}</option>
        `;
    });
}

function adicionarAoCarrinho(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (produto.categoria === 'colares') {
        // Para colares, adicionar diretamente sem tamanho
        const carrinhoId = `${produtoId}_unico`;
        
        if (carrinho[carrinhoId]) {
            carrinho[carrinhoId].quantidade++;
        } else {
            carrinho[carrinhoId] = {
                ...produto,
                quantidade: 1
            };
        }
        atualizarContadorCarrinho();
        mostrarNotificacao('Produto adicionado ao carrinho!', 'success');
        return;
    }
    
    // Para outros produtos, verificar tamanho
    const tamanhoInput = document.getElementById(`tamanho-${produtoId}`);
    const tamanho = tamanhoInput ? tamanhoInput.value : null;
    
    // Se tem apenas um tamanho ou já tem tamanho selecionado
    if (tamanho) {
        const carrinhoId = `${produtoId}_${tamanho}`;
        
        if (carrinho[carrinhoId]) {
            carrinho[carrinhoId].quantidade++;
        } else {
            carrinho[carrinhoId] = {
                ...produto,
                tamanho,
                quantidade: 1
            };
        }
        
        atualizarContadorCarrinho();
        mostrarNotificacao('Produto adicionado ao carrinho!', 'success');
        return;
    }
    
    // Se não tem tamanho selecionado e tem múltiplos tamanhos
    mostrarNotificacao('Por favor, selecione um tamanho', 'warning');
}

function atualizarContadorCarrinho() {
    const totalItens = Object.values(carrinho).reduce((sum, item) => sum + item.quantidade, 0);
    document.getElementById('cart-count').textContent = totalItens;
}

function abrirModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.add('show');
    modal.style.display = 'block';
    atualizarCarrinhoModal();
}

function fecharModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

function atualizarCarrinhoModal() {
    const cartItems = document.getElementById('cart-items');
    const giftWrapOption = document.getElementById('giftWrapOption');
    const giftOption = document.getElementById('gift-option');
    const giftSelect = document.getElementById('giftSelect');
    
    let subtotal = 0;
    cartItems.innerHTML = '';

    const itensNoCarrinho = Object.values(carrinho).length > 0;
    document.querySelector('button[onclick="enviarPedidoWhatsApp()"]').disabled = !itensNoCarrinho;
    
    if (!itensNoCarrinho) {
        cartItems.innerHTML = '<div class="text-center text-muted py-3">Seu carrinho está vazio</div>';
    } else {
        Object.entries(carrinho).forEach(([carrinhoId, item]) => {
            const subtotalItem = item.preco * item.quantidade;
            cartItems.innerHTML += `
                <div class="cart-item">
                    <div>
                        <h6 class="mb-0">${item.nome}</h6>
                        ${item.tamanho ? `<small>Tamanho: ${item.tamanho}</small><br>` : ''}
                        <small class="text-muted">
                            €${item.preco.toFixed(2)} x ${item.quantidade}
                            ${item.stockDisponivel ? 
                                `<span class="text-secondary">(${item.stockDisponivel - item.quantidade} disponíveis)</span>` 
                                : ''}
                        </small>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="btn-group btn-group-sm me-2">
                            <button class="btn btn-outline-secondary" onclick="alterarQuantidade('${carrinhoId}', -1)">-</button>
                            <button class="btn btn-outline-secondary" disabled>${item.quantidade}</button>
                            <button class="btn btn-outline-secondary" 
                                    onclick="alterarQuantidade('${carrinhoId}', 1)"
                                    ${item.stockDisponivel && item.quantidade >= item.stockDisponivel ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="btn btn-danger btn-sm remove-button" onclick="removerDoCarrinho('${carrinhoId}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            subtotal += subtotalItem;
        });
    }

    // Calcular subtotal
    Object.values(carrinho).forEach(item => {
        subtotal += item.preco * item.quantidade;
    });

    // Verificar desconto primeira compra
    let desconto = 0;
    if (usuarioAtual && usuarioAtual.primeiraCompra) {
        desconto = subtotal * DESCONTO_PRIMEIRA_COMPRA;
        
        // Adicionar aviso de desconto no topo do carrinho (apenas se não existir)
        if (!document.querySelector('.alert-success')) {
            const avisoDesconto = document.createElement('div');
            avisoDesconto.className = 'alert alert-success mb-3';
            avisoDesconto.innerHTML = `
                <i class="bi bi-tag-fill"></i>
                Você tem 5% de desconto na sua primeira compra!
            `;
            cartItems.insertBefore(avisoDesconto, cartItems.firstChild);
        }
        
        // Remover linha de desconto anterior se existir
        const descontoAnterior = document.querySelector('.desconto-primeira-compra');
        if (descontoAnterior) {
            descontoAnterior.remove();
        }
        
        // Adicionar linha de desconto
        const descontoElement = document.createElement('div');
        descontoElement.className = 'd-flex justify-content-between text-success desconto-primeira-compra';
        descontoElement.innerHTML = `
            <span>Desconto primeira compra (5%):</span>
            <span>-€${desconto.toFixed(2)}</span>
        `;
        
        const totalElement = document.querySelector('.cart-total .fw-bold');
        if (totalElement) {
            totalElement.parentNode.insertBefore(descontoElement, totalElement);
        }
    }

    // Verificar se a compra é elegível para brinde (acima de 50 euros)
    if (subtotal >= 50) {
        giftOption.style.display = 'block';
        
        // Adicionar listener para o select de brindes se ainda não existir
        if (!giftSelect.hasAttribute('data-listener')) {
            giftSelect.addEventListener('change', function() {
                brindeEscolhido = this.value;
                atualizarCarrinhoModal();
            });
            giftSelect.setAttribute('data-listener', 'true');
        }
    } else {
        giftOption.style.display = 'none';
        brindeEscolhido = null;
        giftSelect.value = '';
    }

    // Atualizar subtotal e total
    document.getElementById('cart-subtotal').textContent = subtotal.toFixed(2);
    
    // Calcular total com embrulho e desconto
    const total = subtotal + (giftWrapOption.checked ? 5 : 0) - desconto;
    document.getElementById('cart-total').textContent = total.toFixed(2);
    
    // Mostrar ou esconder custo do embrulho
    document.getElementById('gift-wrap-cost').style.display = 
        giftWrapOption.checked ? 'flex' : 'none';
    
    // Atualiza visibilidade da opção de presente e botões
    document.querySelector('.gift-wrap-option').style.display = itensNoCarrinho ? 'block' : 'none';
    document.querySelector('button[onclick="esvaziarCarrinho()"]').disabled = !itensNoCarrinho;
    document.querySelector('button[onclick="enviarPedidoWhatsApp()"]').disabled = !itensNoCarrinho;
}

function alterarQuantidade(carrinhoId, delta) {
    if (carrinho[carrinhoId]) {
        const novaQuantidade = carrinho[carrinhoId].quantidade + delta;
        
        if (novaQuantidade > 0 && novaQuantidade <= carrinho[carrinhoId].stockDisponivel) {
            carrinho[carrinhoId].quantidade = novaQuantidade;
            atualizarContadorCarrinho();
            atualizarCarrinhoModal();
        } else if (novaQuantidade <= 0) {
            removerDoCarrinho(carrinhoId);
        } else {
            alert('Quantidade máxima disponível em stock atingida!');
        }
    }
}

function removerDoCarrinho(carrinhoId) {
    delete carrinho[carrinhoId];
    atualizarContadorCarrinho();
    atualizarCarrinhoModal();
}

function esvaziarCarrinho() {
    carrinho = {};
    brindeEscolhido = null;
    document.getElementById('giftSelect').value = '';
    atualizarContadorCarrinho();
    atualizarCarrinhoModal();
}

function enviarPedidoWhatsApp() {
    let mensagem = "Olá! Gostaria de fazer um pedido:\n\n";
    
    if (usuarioAtual) {
        mensagem += `Nome: ${usuarioAtual.nome}\n`;
        mensagem += `Email: ${usuarioAtual.email}\n`;
        mensagem += `Telefone: ${usuarioAtual.telefone}\n\n`;
    }
    
    Object.values(carrinho).forEach(item => {
        mensagem += `${item.nome}\n`;
        if (item.tamanho) mensagem += `Tamanho: ${item.tamanho}\n`;
        mensagem += `Quantidade: ${item.quantidade}\n`;
        mensagem += `Preço: €${(item.preco * item.quantidade).toFixed(2)}\n\n`;
    });

    const subtotal = Object.values(carrinho)
        .reduce((total, item) => total + (item.preco * item.quantidade), 0);
    
    mensagem += `Subtotal: €${subtotal.toFixed(2)}\n`;
    
    // Adicionar desconto se for primeira compra
    if (usuarioAtual && usuarioAtual.primeiraCompra) {
        const desconto = subtotal * DESCONTO_PRIMEIRA_COMPRA;
        mensagem += `Desconto primeira compra (5%): -€${desconto.toFixed(2)}\n`;
        
        // Atualizar usuário para marcar que usou o desconto
        usuarioAtual.primeiraCompra = false;
        
        // Atualizar no array de usuários
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        const index = usuarios.findIndex(u => u.email === usuarioAtual.email);
        if (index !== -1) {
            usuarios[index] = usuarioAtual;
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
        
        // Atualizar usuário atual no localStorage
        localStorage.setItem('usuarioAtual', JSON.stringify(usuarioAtual));
    }
    
    const giftWrapOption = document.getElementById('giftWrapOption');
    if (giftWrapOption.checked) {
        mensagem += "Embrulho para presente: €5.00\n";
    }
    
    if (brindeEscolhido) {
        const nomeBrinde = brindeEscolhido === 'porta' ? 'Porta Joia' : 'Saquinho de Joia';
        mensagem += `\nBrinde escolhido: ${nomeBrinde}\n`;
    }
    
    const total = subtotal + (giftWrapOption.checked ? 5 : 0);
    mensagem += `\nTotal: €${total.toFixed(2)}`;

    // Codificar a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Abrir WhatsApp em nova aba
    window.open(`https://wa.me/351923308665?text=${mensagemCodificada}`, '_blank');
}

// Adicionar eventos
document.querySelector('.cart-icon').addEventListener('click', abrirModal);

// Atualizar função que inicializa os filtros
function initializeFilters() {
    // Pesquisa
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterProducts);

    // Carregar categorias e inicializar opções de tamanho
    carregarCategorias();
}

// Atualizar função para carregar categorias
async function carregarCategorias() {
    try {
        const response = await fetch('/categorias.json');
        const data = await response.json();
        window.categorias = data.categorias;
        
        // Gerar menu de categorias dinamicamente
        const listGroup = document.querySelector('.list-group');
        listGroup.innerHTML = `
            <button class="list-group-item list-group-item-action active" data-category="todos">
                Todos os Produtos
            </button>
        `;
        
        // Adicionar cada categoria do JSON
        data.categorias.forEach(categoria => {
            listGroup.innerHTML += `
                <button class="list-group-item list-group-item-action" data-category="${categoria.id}">
                    ${categoria.nome}
                </button>
            `;
        });
        
        // Adicionar event listeners para os botões de categoria
        document.querySelectorAll('.list-group-item').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelector('.list-group-item.active').classList.remove('active');
                e.target.classList.add('active');
                updateSizeOptions();
                filterProducts();
            });
        });
        
        updateSizeOptions();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        mostrarNotificacao('Erro ao carregar categorias', 'error');
    }
}

// Atualizar função que atualiza as opções de tamanho
function updateSizeOptions() {
    const selectedCategory = document.querySelector('.list-group-item.active').dataset.category;
    const sizeFilter = document.getElementById('sizeFilter');
    const sizeFilterContainer = document.querySelector('.size-filter');
    
    // Esconder filtro de tamanhos se "todos" estiver selecionado
    if (selectedCategory === 'todos') {
        sizeFilterContainer.style.display = 'none';
        return;
    }
    
    // Mostrar filtro de tamanhos
    sizeFilterContainer.style.display = 'block';
    
    // Encontrar categoria selecionada
    const categoria = window.categorias.find(cat => cat.id === selectedCategory);
    if (!categoria) return;
    
    // Atualizar o select com as opções de tamanho da categoria
    const currentSize = sizeFilter.value;
    sizeFilter.innerHTML = '<option value="todos">Todos os Tamanhos</option>';
    
    categoria.tamanhos.forEach(tamanho => {
        // Verificar se existe algum produto com este tamanho disponível
        const tamanhoDisponivel = produtos.some(produto => 
            produto.categoria === selectedCategory && 
            produto.tamanhos.includes(tamanho)
        );
        
        if (tamanhoDisponivel) {
            sizeFilter.innerHTML += `<option value="${tamanho}">${tamanho}</option>`;
        }
    });

    // Tentar manter o tamanho selecionado se ainda estiver disponível
    if (categoria.tamanhos.includes(currentSize)) {
        sizeFilter.value = currentSize;
    } else {
        sizeFilter.value = 'todos';
    }
}

// Atualizar função de filtro
function filterProducts() {
    const container = document.getElementById('products-container');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.querySelector('.list-group-item.active').dataset.category;
    const selectedSize = document.getElementById('sizeFilter').value;
    
    container.innerHTML = '';
    
    produtos.forEach(produto => {
        const matchesSearch = produto.nome.toLowerCase().includes(searchTerm) || 
                            produto.descricao.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'todos' || produto.categoria === selectedCategory;
        
        // Nova lógica para verificar tamanhos
        const matchesSize = selectedSize === 'todos' || 
                          (produto.tamanhos && produto.tamanhos.includes(selectedSize));

        if (matchesSearch && matchesCategory && matchesSize) {
            let tamanhoHtml = '';
            
            if (produto.categoria !== 'colares') {
                // Se tiver apenas um tamanho, não precisa mostrar botões
                if (produto.tamanhos.length === 1) {
                    tamanhoHtml = `
                        <input type="hidden" id="tamanho-${produto.id}" value="${produto.tamanhos[0]}">
                    `;
                } else {
                    // Criar botões de tamanho
                    const tamanhosButtons = produto.tamanhos
                        .map(tamanho => `
                            <button type="button" 
                                    class="size-btn me-2 mb-2"
                                    data-tamanho="${tamanho}"
                                    onclick="selecionarTamanho(this, ${produto.id})"
                                    ${produto.tamanhos.length === 1 ? 'disabled' : ''}>
                                ${tamanho}
                            </button>
                        `).join('');
                        
                        // Mostrar guia de tamanhos apenas para anéis
                        const guiaTamanhos = produto.categoria === 'aneis' ? `
                            <a href="#" class="size-guide-link mb-2 d-block" onclick="abrirGuiaTamanhos(event)">
                                <i class="bi bi-rulers"></i> Guia de Tamanhos
                            </a>
                        ` : '';
                        
                    tamanhoHtml = `
                        <div class="mb-2">
                            ${guiaTamanhos}
                            <div class="tamanhos-container" id="tamanhos-${produto.id}">
                                ${tamanhosButtons}
                            </div>
                            <input type="hidden" id="tamanho-${produto.id}" value="">
                        </div>
                    `;
                }
            }

            // Calcular stock total
            const stockTotal = produto.categoria === 'colares' ? 1 : produto.tamanhos.length;

            const produtoElement = `
                <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                    <div class="card product-card">
                        <img src="${produto.imagem[0]}" 
                             class="card-img-top mt-3" 
                             alt="${produto.nome}"
                             onclick="abrirModalImagem('${produto.nome}')">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${produto.nome}</h5>
                            <p class="card-text">${produto.descricao}</p>
                            <p class="card-text">
                                <strong>€${produto.preco.toFixed(2)}</strong>
                            </p>
                            ${tamanhoHtml}
                            <button onclick="adicionarAoCarrinho(${produto.id})" 
                                    class="btn btn-primary mt-auto"
                                    ${stockTotal === 0 ? 'disabled' : ''}>
                                ${stockTotal === 0 ? 'Sem Stock' : 'Adicionar ao Carrinho'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += produtoElement;
        }
    });
}

// Atualizar função para inicializar o menu mobile
function initializeMobileMenu() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        // Remover o listener manual e deixar o Bootstrap gerenciar
        document.addEventListener('click', (e) => {
            // Fechar o menu quando clicar fora dele
            if (!navbarCollapse.contains(e.target) && 
                !navbarToggler.contains(e.target) && 
                navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        });
    }
}

// Atualizar a função de inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarProdutosJSON();
    initializeFilters();
    initializeMobileMenu();
    
    // Carregar usuário atual do localStorage
    const usuarioSalvo = localStorage.getItem('usuarioAtual');
    if (usuarioSalvo) {
        usuarioAtual = JSON.parse(usuarioSalvo);
        atualizarBotoesUsuario();
    }
    
    // Configurar evento do carrinho
    document.querySelector('.cart-icon').addEventListener('click', abrirModal);
});

// Atualizar função de abrir o modal de imagem
function abrirModalImagem(nomeProduto) {
    const produto = produtos.find(p => p.nome === nomeProduto);
    if (!produto) return;

    // Verificar se o modal e seus elementos existem
    const modalElement = document.getElementById('image-modal');
    if (!modalElement) {
        console.error('Modal não encontrado');
        return;
    }

    // Criar instância do modal
    const modal = new bootstrap.Modal(modalElement);

    // Atualizar título e informações do produto
    const titleElement = modalElement.querySelector('.modal-title');
    const descriptionElement = modalElement.querySelector('.modal-description');
    const priceElement = modalElement.querySelector('.modal-price');
    const imageElement = modalElement.querySelector('#modal-image');

    if (titleElement) titleElement.textContent = produto.nome;
    if (descriptionElement) descriptionElement.textContent = produto.descricao;
    if (priceElement) priceElement.textContent = `€${produto.preco.toFixed(2)}`;
    
    // Configurar imagens
    imagensAtuais = produto.imagem;
    indiceImagemAtual = 0;
    if (imageElement) {
        atualizarImagemModal();
    }
    
    // Configurar tamanhos
    const selectTamanho = modalElement.querySelector('.size-select-container');
    const btnAdicionar = modalElement.querySelector('.btn-primary');
    
    if (!selectTamanho || !btnAdicionar) {
        console.error('Elementos do modal não encontrados');
        return;
    }
    
    if (produto.categoria === 'colares') {
        // Para colares, esconder select e ajustar botão
        selectTamanho.style.display = 'none';
        btnAdicionar.classList.remove('flex-grow-1');
        btnAdicionar.style.width = '100%';
        btnAdicionar.onclick = () => {
            const carrinhoId = `${produto.id}_unico`;
            if (carrinho[carrinhoId]) {
                carrinho[carrinhoId].quantidade++;
            } else {
                carrinho[carrinhoId] = {
                    ...produto,
                    quantidade: 1
                };
            }
            atualizarContadorCarrinho();
            mostrarNotificacao('Produto adicionado ao carrinho!', 'success');
            modal.hide();
        };
    } else {
        // Para outros produtos, mostrar select e configurar normalmente
        selectTamanho.style.display = 'block';
        btnAdicionar.classList.add('flex-grow-1');
        
        // Mostrar guia de tamanhos apenas para anéis
        const guiaTamanhos = produto.categoria === 'aneis' ? `
            <a href="#" class="size-guide-link mb-2 d-block" onclick="abrirGuiaTamanhos(event)">
                <i class="bi bi-rulers"></i> Guia de Tamanhos
            </a>
        ` : '';
        
        // Criar botões de tamanho
        const tamanhosButtons = produto.tamanhos
            .map(tamanho => `
                <button type="button" 
                        class="size-btn me-2 mb-2"
                        data-tamanho="${tamanho}"
                        onclick="selecionarTamanhoModal(this, ${produto.id})"
                        ${produto.tamanhos.length === 1 ? 'disabled' : ''}>
                    ${tamanho}
                </button>
            `).join('');
        
        selectTamanho.innerHTML = `
            ${guiaTamanhos}
            <div class="tamanhos-container">
                ${tamanhosButtons}
            </div>
            <input type="hidden" id="modal-tamanho-input" 
                   value="${produto.tamanhos.length === 1 ? produto.tamanhos[0] : ''}">
        `;
        
        // Configurar botão de adicionar ao carrinho
        btnAdicionar.onclick = () => {
            const tamanho = document.getElementById('modal-tamanho-input').value;
            
            if (!tamanho && produto.tamanhos.length > 1) {
                mostrarNotificacao('Por favor, selecione um tamanho', 'warning');
                return;
            }
            
            const carrinhoId = `${produto.id}_${tamanho}`;
            if (carrinho[carrinhoId]) {
                carrinho[carrinhoId].quantidade++;
            } else {
                carrinho[carrinhoId] = {
                    ...produto,
                    tamanho,
                    quantidade: 1
                };
            }
            
            atualizarContadorCarrinho();
            mostrarNotificacao('Produto adicionado ao carrinho!', 'success');
            modal.hide();
        };
    }
    
    // Mostrar modal
    modal.show();
}

function navegarImagem(direcao) {
    indiceImagemAtual += direcao;
    atualizarImagemModal();
}

function atualizarImagemModal() {
    const img = document.getElementById('modal-image');
    const btnPrev = document.querySelector('.prev-image');
    const btnNext = document.querySelector('.next-image');
    
    img.src = imagensAtuais[indiceImagemAtual];
    
    // Atualizar estado dos botões de navegação
    btnPrev.classList.toggle('disabled', indiceImagemAtual <= 0);
    btnNext.classList.toggle('disabled', indiceImagemAtual >= imagensAtuais.length - 1);
}

// Atualizar função de abrir modal de cadastro
function abrirModalCadastro() {
    // Limpar formulário antes de abrir
    const form = document.getElementById('signup-form');
    if (form) {
        form.reset();
        // Remover classes de validação
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
    }
    
    const modal = new bootstrap.Modal(document.getElementById('signup-modal'));
    modal.show();
}

// Atualizar função de abrir modal de login
function abrirModalLogin() {
    // Limpar formulário antes de abrir
    const form = document.getElementById('login-form');
    if (form) {
        form.reset();
        // Remover classes de validação
        form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
    }
    
    const modal = new bootstrap.Modal(document.getElementById('login-modal'));
    modal.show();
}

// Função para validar número de telefone
function validarTelefone(telefone) {
    // Remover todos os caracteres não numéricos
    const numeroLimpo = telefone.toString().replace(/\D/g, '');
    
    // Verificar se tem exatamente 9 dígitos
    if (numeroLimpo.length === 9) {
        return {
            valido: true,
            formatado: `+351 ${numeroLimpo}`
        };
    }
    
    return {
        valido: false,
        mensagem: 'O número deve conter exatamente 9 dígitos'
    };
}

// Adicionar funções para gerenciar login/cadastro
function trocarParaCadastro() {
    // Fechar modal de login
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
    loginModal.hide();
    
    // Abrir modal de cadastro
    setTimeout(() => {
        const cadastroModal = new bootstrap.Modal(document.getElementById('signup-modal'));
        cadastroModal.show();
    }, 400);
}

function trocarParaLogin() {
    // Fechar modal de cadastro
    const cadastroModal = bootstrap.Modal.getInstance(document.getElementById('signup-modal'));
    cadastroModal.hide();
    
    // Abrir modal de login
    setTimeout(() => {
        const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
        loginModal.show();
    }, 400);
}

// Adicionar função para validar email
function validarEmail(email) {
    // Verificar formato básico do email
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return {
            valido: false,
            mensagem: 'Email inválido. Use um formato válido (exemplo@dominio.com)'
        };
    }
    
    // Verificar se tem .com, .pt, etc no final
    const dominios = ['.com', '.pt', '.br', '.net', '.org', '.edu'];
    if (!dominios.some(dominio => email.toLowerCase().endsWith(dominio))) {
        return {
            valido: false,
            mensagem: 'Email inválido. O domínio deve terminar com .com, .pt, .br, .net, .org ou .edu'
        };
    }
    
    return {
        valido: true,
        formatado: email.toLowerCase()
    };
}

// Adicionar função helper para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    const configs = {
        text: mensagem,
        duration: 3000,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        className: `toast-${tipo}`,
        style: {
            background: tipo === 'error' ? '#dc3545' : 
                       tipo === 'success' ? '#198754' : 
                       tipo === 'warning' ? '#ffc107' : '#0dcaf0'
        }
    };
    
    Toastify(configs).showToast();
}

// Atualizar função de cadastro para usar Toastify
function cadastrarUsuario(event) {
    event.preventDefault();
    
    const nome = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const telefone = document.getElementById('signup-phone').value;
    
    // Validar email
    const validacaoEmail = validarEmail(email);
    if (!validacaoEmail.valido) {
        mostrarNotificacao(validacaoEmail.mensagem, 'error');
        document.getElementById('signup-email').focus();
        return;
    }
    
    // Validar telefone
    const validacaoTelefone = validarTelefone(telefone);
    if (!validacaoTelefone.valido) {
        mostrarNotificacao(validacaoTelefone.mensagem, 'error');
        return;
    }
    
    // Verificar se já existe usuário com este email ou telefone
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    
    // Verificar email
    if (usuarios.some(u => u.email === validacaoEmail.formatado)) {
        mostrarNotificacao('Este email já está cadastrado. Por favor, use outro email ou faça login.', 'error');
        document.getElementById('signup-email').focus();
        return;
    }
    
    // Verificar telefone
    if (usuarios.some(u => u.telefone === validacaoTelefone.formatado)) {
        mostrarNotificacao('Este número de telefone já está cadastrado. Por favor, use outro número ou faça login.', 'error');
        document.getElementById('signup-phone').focus();
        return;
    }
    
    const novoUsuario = {
        nome,
        email: validacaoEmail.formatado,
        telefone: validacaoTelefone.formatado,
        primeiraCompra: true,
        dataCadastro: new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
    };
    
    // Adicionar ao array de usuários
    usuarios.push(novoUsuario);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    // Definir como usuário atual
    usuarioAtual = novoUsuario;
    localStorage.setItem('usuarioAtual', JSON.stringify(usuarioAtual));
    
    // Enviar notificação via WhatsApp
    const mensagemAdmin = `🎉 Novo cadastro na Lune Prata!\n\n` +
        `Nome: ${novoUsuario.nome}\n` +
        `Email: ${novoUsuario.email}\n` +
        `Telefone: ${novoUsuario.telefone}\n` +
        `Data: ${novoUsuario.dataCadastro}`;
    
    // Abrir WhatsApp em nova aba para enviar notificação ao admin
    const mensagemCodificada = encodeURIComponent(mensagemAdmin);
    window.open(`https://wa.me/351923308665?text=${mensagemCodificada}`, '_blank');
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('signup-modal'));
    modal.hide();
    
    // Mostrar mensagem de sucesso
    mostrarNotificacao('Cadastro realizado com sucesso! Você ganhou 5% de desconto na sua primeira compra.', 'success');
    
    // Atualizar botões do usuário
    atualizarBotoesUsuario();
    
    // Rolar suavemente até a seção de produtos
    const produtosContainer = document.getElementById('products-container');
    if (produtosContainer) {
        produtosContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
    }
    
    // Destacar brevemente a seção de produtos
    produtosContainer.classList.add('highlight-section');
    setTimeout(() => {
        produtosContainer.classList.remove('highlight-section');
    }, 1500);
}

// Atualizar função de login
function realizarLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const telefone = document.getElementById('login-phone').value;
    
    // Validar email
    const validacaoEmail = validarEmail(email);
    if (!validacaoEmail.valido) {
        mostrarNotificacao(validacaoEmail.mensagem, 'error');
        document.getElementById('login-email').focus();
        return;
    }
    
    // Validar telefone
    const validacaoTelefone = validarTelefone(telefone);
    if (!validacaoTelefone.valido) {
        mostrarNotificacao(validacaoTelefone.mensagem, 'error');
        return;
    }
    
    // Buscar usuário
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const usuario = usuarios.find(u => 
        u.email === validacaoEmail.formatado && u.telefone === validacaoTelefone.formatado
    );
    
    if (!usuario) {
        mostrarNotificacao('Email ou telefone incorretos.', 'error');
        return;
    }
    
    // Definir como usuário atual
    usuarioAtual = usuario;
    localStorage.setItem('usuarioAtual', JSON.stringify(usuarioAtual));
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
    modal.hide();
    
    mostrarNotificacao('Login realizado com sucesso!', 'success');
    
    atualizarBotoesUsuario();
}

// Atualizar função que atualiza os botões
function atualizarBotoesUsuario() {
    const btnGroup = document.querySelector('.btn-group');
    if (usuarioAtual) {
        btnGroup.innerHTML = `
            <button class="btn btn-outline-light" disabled>
                <i class="bi bi-person-check"></i> Olá, ${usuarioAtual.nome.split(' ')[0]}
            </button>
            <button class="btn btn-outline-light" onclick="realizarLogout()">
                <i class="bi bi-box-arrow-right"></i> Sair
            </button>
        `;
    } else {
        btnGroup.innerHTML = `
            <button class="btn btn-outline-light" onclick="abrirModalLogin()">
                <i class="bi bi-person"></i> Entrar
            </button>
            <button class="btn btn-outline-light" onclick="abrirModalCadastro()">
                <i class="bi bi-person-plus"></i> Cadastrar
            </button>
        `;
    }
}

// Adicionar função de logout
function realizarLogout() {
    usuarioAtual = null;
    localStorage.removeItem('usuarioAtual');
    atualizarBotoesUsuario();
    mostrarNotificacao('Logout realizado com sucesso!', 'info');
}

// Adicionar função para abrir o guia de tamanhos
function abrirGuiaTamanhos(event) {
    event.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('size-guide-modal'));
    modal.show();
}

// Adicionar função para selecionar tamanho
function selecionarTamanho(button, produtoId) {
    // Remover seleção anterior
    const container = button.closest('.tamanhos-container');
    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Selecionar novo tamanho
    button.classList.add('active');
    document.getElementById(`tamanho-${produtoId}`).value = button.dataset.tamanho;
}

// Adicionar função para selecionar tamanho no modal
function selecionarTamanhoModal(button, produtoId) {
    // Remover seleção anterior
    const container = button.closest('.tamanhos-container');
    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Selecionar novo tamanho
    button.classList.add('active');
    document.getElementById('modal-tamanho-input').value = button.dataset.tamanho;
}

function removerAcentos(texto) {
    if (!texto) return '';
    
    // Usar normalização Unicode para decomposição
    return texto.normalize('NFKD')  // Normalização de Compatibilidade com Decomposição
                .replace(/[\u0300-\u036f]/g, '')  // Remover diacríticos
                .toLowerCase();
}

// Função auxiliar para comparação de strings
function compararStrings(str1, str2) {
    return str1.localeCompare(str2, undefined, {
        sensitivity: 'base',  // Ignora diferenças de caso e diacríticos
        ignorePunctuation: true
    }) === 0;
}

// Na função de pesquisa, usar a comparação insensível
function pesquisarProdutos(termoBusca) {
    if (!termoBusca) return produtos;
    
    const termoBuscaNormalizado = removerAcentos(termoBusca);
    
    return produtos.filter(produto => {
        const nomeNormalizado = removerAcentos(produto.nome);
        const descricaoNormalizada = removerAcentos(produto.descricao);
        const categoriaNormalizada = removerAcentos(produto.categoria);
        
        return nomeNormalizado.includes(termoBuscaNormalizado) || 
               categoriaNormalizada.includes(termoBuscaNormalizado) ||
               descricaoNormalizada.includes(termoBuscaNormalizado);
    });
} 