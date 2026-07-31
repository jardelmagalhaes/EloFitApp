
/* ==========================================================================
   MÓDULO 1: IMPORTAÇÕES, CONFIGURAÇÃO E ESTADO LOCAL
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4lEEEAF754mDnXGdttZ7k1kU8h0sxM8Q",
  authDomain: "checkvital-999fa.firebaseapp.com",
  projectId: "checkvital-999fa",
  storageBucket: "checkvital-999fa.firebasestorage.app",
  messagingSenderId: "600263811491",
  appId: "1:600263811491:web:9f25d61c4b8f9620b67a16",
  measurementId: "G-SLVDSWWZH9"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let usuarioAtual = null;

function inicializarFirebaseSeDisponivel() {
    if (app) return true;

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        return true;
    } catch (error) {
        console.warn('Firebase não disponível para login do Google:', error);
        return false;
    }
}

async function autenticarGoogle() {
    if (!inicializarFirebaseSeDisponivel()) {
        alert('O login com Google não está disponível no momento. Você pode entrar sem login e usar o app normalmente.');
        return;
    }

    try {
        const resultado = await signInWithPopup(auth, googleProvider);
        usuarioAtual = resultado.user.uid;
        const telaLogin = document.getElementById('tela-login');
        const appPrincipal = document.getElementById('app-principal');
        if (telaLogin) telaLogin.style.display = 'none';
        if (appPrincipal) appPrincipal.style.display = 'block';

        const refDoc = doc(db, 'usuarios', usuarioAtual);
        const snapshot = await getDoc(refDoc);
        if (snapshot.exists()) {
            verificarRegraDeNegocio(snapshot.data());
        } else {
            verificarRegraDeNegocio(null);
        }
        atualizarInterfaceAgua();
        carregarTela('agua');
    } catch (error) {
        const popupBloqueado = [
            'auth/popup-blocked',
            'auth/cancelled-popup-request',
            'auth/popup-closed-by-user'
        ].includes(error?.code) || (error?.message || '').toLowerCase().includes('popup');

        if (popupBloqueado) {
            try {
                await signInWithRedirect(auth, googleProvider);
                return;
            } catch (redirectError) {
                console.error('Erro no redirect do Google:', redirectError);
            }
        }

        console.error('Erro ao autenticar com Google:', error);
        alert('Não foi possível entrar com o Google, mas você pode continuar sem login.');
        entrarNoApp();
    }
}

// Estados de Água
let totalAguaGlobal = 0;
let tamanhoGarrafaGlobal = 500;
let metaDiariaGlobal = 2500;
let historicoAdicoes = [];
let diasOfensiva = 0;
let totalDiasConcluidosGlobal = 0;
let diasSemanaConcluidos = {};
let intervaloNotificacao = null;

// Estado de Treinos Customizáveis pelo Usuário
let treinoSelecionadoKey = '';
let minhasFichasTreino = {
    costas: {
        titulo: "Costas",
        exercicios: [
            { texto: "Puxada aberta - 3x 10a12 repetições (progredir carga)", concluido: false },
            { texto: "Puxada Fechada - 3x 10a12 repetições", concluido: false },
            { texto: "Pulldown - 3x 10a12", concluido: false }
        ]
    },
    ombro: {
        titulo: "Ombro",
        exercicios: [
            { texto: "Desenvolvimento com Halter - 3x 10a12", concluido: false }
        ]
    }
};

function obterDataHojeStr() {
    return new Date().toISOString().split('T')[0];
}

function obterDataOntemStr() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    return ontem.toISOString().split('T')[0];
}

function obterDiasDaSemanaAtual() {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay();
    const diffParaSegunda = diaSemanaHoje === 0 ? -6 : 1 - diaSemanaHoje;
    
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() + diffParaSegunda);

    const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const semana = [];

    for (let i = 0; i < 7; i++) {
        const diaAtual = new Date(segunda);
        diaAtual.setDate(segunda.getDate() + i);
        const dataStr = diaAtual.toISOString().split('T')[0];
        semana.push({
            nome: diasNomes[i],
            dataStr: dataStr,
            concluido: !!diasSemanaConcluidos[dataStr]
        });
    }
    return semana;
}

/* ==========================================================================
   MÓDULO 2: TEMPLATES E CONTROLE DE TELAS
   ========================================================================== */
const conteudoPrincipal = document.getElementById('conteudo-principal');

const templateAgua = `
    <div class="card" style="text-align: center; background: linear-gradient(135deg, #fff 0%, #fff7f0 100%); border: 2px solid #ff7b0033;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff3e0; padding: 12px 15px; border-radius: 12px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.6rem;">🔥</span>
                <strong id="contador-ofensiva" style="color: #e65100; font-size: 1.1rem;">0 dias</strong>
            </div>
            <img src="img/mascote.png" alt="Mascote EloFit" style="width: 50px; height: 50px; object-fit: contain;">
        </div>

        <div id="container-dias-semana" style="display: flex; justify-content: space-between; gap: 5px; margin-bottom: 15px; background: #fdfdfd; padding: 10px; border-radius: 8px; border: 1px solid #eee;"></div>

        <h2>Controle de Hidratação</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; text-align: left;">
            <div>
                <label for="input-tamanho-garrafa" style="font-size: 0.8rem; color: #555; display: block; margin-bottom: 3px;">Principal (ml):</label>
                <input type="number" id="input-tamanho-garrafa" value="500" style="padding: 8px; width: 100%; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;" />
            </div>
            <div>
                <label for="input-meta-diaria" style="font-size: 0.8rem; color: #555; display: block; margin-bottom: 3px;">Meta Diária (ml):</label>
                <input type="number" id="input-meta-diaria" value="2500" style="padding: 8px; width: 100%; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;" />
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button id="btn-add-agua" class="btn-acao" style="flex: 2; background-color: #ff7b00;">+ Adicionar Principal</button>
            <button id="btn-desfazer" style="flex: 1; background-color: #6c757d; color: white; border: none; padding: 10px; border-radius: 6px; font-size: 0.95rem; cursor: pointer; font-weight: bold;">Desfazer</button>
        </div>

        <div style="display: flex; gap: 5px; margin-bottom: 15px;">
            <button class="btn-atalho" data-valor="250" style="flex: 1; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+250ml</button>
            <button class="btn-atalho" data-valor="300" style="flex: 1; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+300ml</button>
            <button class="btn-atalho" data-valor="500" style="flex: 1; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">+500ml</button>
        </div>

        <div style="margin-top: 15px;">
            <p style="font-size: 1rem;">Total hoje: <strong id="total-bebido" style="color: #ff7b00;">0 ml</strong> / <span id="meta-exibida">2500 ml</span></p>
            <div style="width: 100%; background: #e0e0e0; border-radius: 10px; height: 10px; margin-top: 8px; overflow: hidden;">
                <div id="barra-progresso" style="width: 0%; background: #ff7b00; height: 100%; transition: width 0.3s;"></div>
            </div>
        </div>

        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #555;">
            <span>🏆 Metas cumpridas: <strong id="total-dias-concluidos" style="color: #333;">0 dias</strong></span>
            <button id="btn-notificacao" style="background: #f0f0f0; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🔔 Ativar Lembretes</button>
        </div>
    </div>
`;

const templateTreino = `
    <div class="card" style="background: #fff; border: 1px solid #ddd;">
        <h2>Montar e Gerenciar Fichas de Treino</h2>
        <p style="color: #666; font-size: 0.85rem; margin-bottom: 15px;">Adicione seus próprios treinos, monte seus exercícios e marque conforme concluir.</p>
        
        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
            <input type="text" id="input-novo-treino" placeholder="Ex: Costas, Pernas, Peito..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;" />
            <button id="btn-criar-treino" style="background: #4285F4; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">+ Criar Treino</button>
        </div>

        <div id="container-botoes-grupo" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
            </div>

        <div id="painel-ficha-ativa" style="display: none; border-top: 1px solid #eee; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 id="titulo-ficha-ativa" style="font-size: 1.05rem; color: #333; margin: 0;"></h3>
                <button id="btn-apagar-treino-todo" style="background: #ea4335; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">🗑️ Apagar Treino Inteiro</button>
            </div>

            <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                <input type="text" id="input-novo-exercicio" placeholder="Ex: Puxada aberta - 3x 10a12" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;" />
                <button id="btn-adicionar-exercicio" style="background: #34a853; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">+ Adicionar</button>
            </div>

            <div id="lista-exercicios" style="display: flex; flex-direction: column; gap: 10px;">
                </div>
        </div>
    </div>
`;

function atualizarInterfaceAgua() {
    const displayTotal = document.getElementById('total-bebido');
    const displayMeta = document.getElementById('meta-exibida');
    const barraProgresso = document.getElementById('barra-progresso');
    const displayOfensiva = document.getElementById('contador-ofensiva');
    const displayTotalConcluidos = document.getElementById('total-dias-concluidos');
    const containerDias = document.getElementById('container-dias-semana');

    if (displayTotal) displayTotal.innerText = `${totalAguaGlobal} ml`;
    if (displayMeta) displayMeta.innerText = `${metaDiariaGlobal} ml`;
    
    if (barraProgresso) {
        let porcentagem = (totalAguaGlobal / metaDiariaGlobal) * 100;
        if (porcentagem > 100) porcentagem = 100;
        barraProgresso.style.width = `${porcentagem}%`;
    }

    if (displayOfensiva) {
        displayOfensiva.innerText = `${diasOfensiva} ${diasOfensiva === 1 ? 'dia' : 'dias'} de ofensiva`;
    }

    if (displayTotalConcluidos) {
        displayTotalConcluidos.innerText = `${totalDiasConcluidosGlobal} ${totalDiasConcluidosGlobal === 1 ? 'dia' : 'dias'}`;
    }

    if (containerDias) {
        const semana = obterDiasDaSemanaAtual();
        containerDias.innerHTML = semana.map(dia => `
            <div style="display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; flex: 1;">
                <span style="color: #666; margin-bottom: 3px; font-weight: bold;">${dia.nome}</span>
                <div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${dia.concluido ? '#ff7b00' : '#e0e0e0'}; color: white; font-size: 0.9rem;">
                    ${dia.concluido ? '🔥' : '·'}
                </div>
            </div>
        `).join('');
    }
}

function atualizarInterfaceTreino() {
    const containerBotoesGrupo = document.getElementById('container-botoes-grupo');
    const painelFichaAtiva = document.getElementById('painel-ficha-ativa');
    const tituloFichaAtiva = document.getElementById('titulo-ficha-ativa');
    const listaExercicios = document.getElementById('lista-exercicios');

    const chavesTreino = Object.keys(minhasFichasTreino);

    // Se não houver nenhum treino cadastrado
    if (chavesTreino.length === 0) {
        if (containerBotoesGrupo) containerBotoesGrupo.innerHTML = '<p style="color: #777; font-size: 0.9px;">Nenhum treino criado ainda. Crie um acima!</p>';
        if (painelFichaAtiva) painelFichaAtiva.style.display = 'none';
        return;
    }

    // Se o treino selecionado atual não existir mais, seleciona o primeiro disponível
    if (!minhasFichasTreino[treinoSelecionadoKey]) {
        treinoSelecionadoKey = chavesTreino[0];
    }

    // Renderiza os botões de seleção de cada treino
    if (containerBotoesGrupo) {
        containerBotoesGrupo.innerHTML = chavesTreino.map(key => {
            const ativo = key === treinoSelecionadoKey;
            return `
                <button class="btn-grupo-custom" data-key="${key}" style="padding: 6px 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; background: ${ativo ? '#4285F4' : '#f1f3f4'}; color: ${ativo ? 'white' : '#333'};">
                    ${minhasFichasTreino[key].titulo}
                </button>
            `;
        }).join('');

        document.querySelectorAll('.btn-grupo-custom').forEach(btn => {
            btn.onclick = () => {
                treinoSelecionadoKey = btn.getAttribute('data-key');
                atualizarInterfaceTreino();
            };
        });
    }

    // Exibe o painel da ficha ativa
    if (painelFichaAtiva) {
        painelFichaAtiva.style.display = 'block';
        const fichaAtual = minhasFichasTreino[treinoSelecionadoKey];
        if (tituloFichaAtiva) tituloFichaAtiva.innerText = `Treino: ${fichaAtual.titulo}`;

        if (listaExercicios) {
            if (fichaAtual.exercicios.length === 0) {
                listaExercicios.innerHTML = '<p style="color: #888; font-size: 0.85rem; font-style: italic;">Nenhum exercício cadastrado neste treino.</p>';
            } else {
                listaExercicios.innerHTML = fichaAtual.exercicios.map((ex, index) => {
                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: 6px; background: ${ex.concluido ? '#e6f4ea' : '#f8f9fa'}; border: 1px solid ${ex.concluido ? '#34a853' : '#dadce0'};">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;" class="clique-concluir-ex" data-index="${index}">
                                <input type="checkbox" ${ex.concluido ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
                                <span style="font-size: 0.9rem; color: ${ex.concluido ? '#137333' : '#3c4043'}; text-decoration: ${ex.concluido ? 'line-through' : 'none'}; flex: 1;">
                                    ${ex.texto}
                                </span>
                            </div>
                            <button class="btn-apagar-ex" data-index="${index}" style="background: transparent; border: none; color: #ea4335; cursor: pointer; font-size: 1rem; padding: 4px 8px;" title="Apagar exercício">🗑️</button>
                        </div>
                    `;
                }).join('');

                // Eventos de marcar conclusão do exercício
                document.querySelectorAll('.clique-concluir-ex').forEach(div => {
                    div.onclick = () => {
                        const idx = parseInt(div.getAttribute('data-index'));
                        minhasFichasTreino[treinoSelecionadoKey].exercicios[idx].concluido = !minhasFichasTreino[treinoSelecionadoKey].exercicios[idx].concluido;
                        salvarEstadoAtual();
                        atualizarInterfaceTreino();
                    };
                });

                // Eventos de apagar exercício específico
                document.querySelectorAll('.btn-apagar-ex').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.getAttribute('data-index'));
                        minhasFichasTreino[treinoSelecionadoKey].exercicios.splice(idx, 1);
                        salvarEstadoAtual();
                        atualizarInterfaceTreino();
                    };
                });
            }
        }
    }
}

function salvarEstadoAtual() {
    const dataHoje = obterDataHojeStr();
    localStorage.setItem('elofit_data_registro', dataHoje);
    localStorage.setItem('elofit_agua', totalAguaGlobal);
    localStorage.setItem('elofit_tamanho_garrafa', tamanhoGarrafaGlobal);
    localStorage.setItem('elofit_meta_diaria', metaDiariaGlobal);
    localStorage.setItem('elofit_historico', JSON.stringify(historicoAdicoes));
    localStorage.setItem('elofit_ofensiva', diasOfensiva);
    localStorage.setItem('elofit_total_dias_concluidos', totalDiasConcluidosGlobal);
    localStorage.setItem('elofit_dias_semana', JSON.stringify(diasSemanaConcluidos));
    localStorage.setItem('elofit_fichas_treino', JSON.stringify(minhasFichasTreino));

    if (usuarioAtual && usuarioAtual !== 'dispositivo_local' && db) {
        const refDoc = doc(db, 'usuarios', usuarioAtual);
        setDoc(refDoc, {
            dataRegistro: dataHoje,
            agua: totalAguaGlobal,
            tamanhoGarrafa: tamanhoGarrafaGlobal,
            metaDiaria: metaDiariaGlobal,
            historico: historicoAdicoes,
            ofensiva: diasOfensiva,
            totalDiasConcluidos: totalDiasConcluidosGlobal,
            diasSemanaConcluidos: diasSemanaConcluidos,
            fichasTreino: minhasFichasTreino
        }, { merge: true }).catch(() => {});
    }
}

function verificarRegraDeNegocio(dadosSalvos) {
    const dataHoje = obterDataHojeStr();
    const dataOntem = obterDataOntemStr();
    
    const ultimaData = dadosSalvos ? dadosSalvos.dataRegistro : localStorage.getItem('elofit_data_registro');
    
    tamanhoGarrafaGlobal = dadosSalvos && dadosSalvos.tamanhoGarrafa !== undefined ? dadosSalvos.tamanhoGarrafa : (parseInt(localStorage.getItem('elofit_tamanho_garrafa')) || 500);
    metaDiariaGlobal = dadosSalvos && dadosSalvos.metaDiaria !== undefined ? dadosSalvos.metaDiaria : (parseInt(localStorage.getItem('elofit_meta_diaria')) || 2500);
    totalDiasConcluidosGlobal = dadosSalvos && dadosSalvos.totalDiasConcluidos !== undefined ? dadosSalvos.totalDiasConcluidos : (parseInt(localStorage.getItem('elofit_total_dias_concluidos')) || 0);
    
    const diasSalvosLocal = localStorage.getItem('elofit_dias_semana');
    diasSemanaConcluidos = dadosSalvos && dadosSalvos.diasSemanaConcluidos ? dadosSalvos.diasSemanaConcluidos : (diasSalvosLocal ? JSON.parse(diasSalvosLocal) : {});

    const fichasLocais = localStorage.getItem('elofit_fichas_treino');
    minhasFichasTreino = dadosSalvos && dadosSalvos.fichasTreino ? dadosSalvos.fichasTreino : (fichasLocais ? JSON.parse(fichasLocais) : minhasFichasTreino);

    const chaves = Object.keys(minhasFichasTreino);
    if (chaves.length > 0 && !minhasFichasTreino[treinoSelecionadoKey]) {
        treinoSelecionadoKey = chaves[0];
    }

    if (ultimaData === dataHoje) {
        totalAguaGlobal = dadosSalvos ? (dadosSalvos.agua || 0) : (parseInt(localStorage.getItem('elofit_agua')) || 0);
        diasOfensiva = dadosSalvos ? (dadosSalvos.ofensiva || 0) : (parseInt(localStorage.getItem('elofit_ofensiva')) || 0);
        
        const histLocal = localStorage.getItem('elofit_historico');
        historicoAdicoes = dadosSalvos && Array.isArray(dadosSalvos.historico) ? dadosSalvos.historico : (histLocal ? JSON.parse(histLocal) : []);
    } else if (ultimaData === dataOntem) {
        const totalOntem = dadosSalvos ? (dadosSalvos.agua || 0) : (parseInt(localStorage.getItem('elofit_agua')) || 0);
        
        if (totalOntem >= metaDiariaGlobal) {
            if (!diasSemanaConcluidos[ultimaData]) {
                diasSemanaConcluidos[ultimaData] = true;
                totalDiasConcluidosGlobal += 1;
            }
        } else {
            diasOfensiva = 0;
        }

        totalAguaGlobal = 0;
        historicoAdicoes = [];
        salvarEstadoAtual();
    } else {
        diasOfensiva = 0;
        totalAguaGlobal = 0;
        historicoAdicoes = [];
        salvarEstadoAtual();
    }
}

function checarConclusaoMeta() {
    const dataHoje = obterDataHojeStr();
    const jaConcluido = !!diasSemanaConcluidos[dataHoje];

    if (totalAguaGlobal >= metaDiariaGlobal) {
        if (!jaConcluido) {
            diasSemanaConcluidos[dataHoje] = true;
            diasOfensiva += 1;
            totalDiasConcluidosGlobal += 1;
        }
    } else {
        if (jaConcluido) {
            delete diasSemanaConcluidos[dataHoje];
            if (diasOfensiva > 0) diasOfensiva -= 1;
            if (totalDiasConcluidosGlobal > 0) totalDiasConcluidosGlobal -= 1;
        }
    }
}

function adicionarAguaCustomizada(quantidade) {
    totalAguaGlobal += quantidade;
    historicoAdicoes.push(quantidade);
    
    checarConclusaoMeta();
    atualizarInterfaceAgua();
    salvarEstadoAtual();
}

function desfazerProgressoAgua() {
    if (historicoAdicoes.length > 0) {
        const ultimoValor = historicoAdicoes.pop();
        totalAguaGlobal -= ultimoValor;
        if (totalAguaGlobal < 0) totalAguaGlobal = 0;
        
        checarConclusaoMeta();
        atualizarInterfaceAgua();
        salvarEstadoAtual();
    }
}

function configurarNotificacoes() {
    const btnNotif = document.getElementById('btn-notificacao');
    if (!btnNotif) return;

    if (!("Notification" in window)) {
        btnNotif.innerText = "Sem suporte a alertas";
        return;
    }

    if (Notification.permission === "granted") {
        btnNotif.innerText = "🔔 Lembretes Ativos";
    }

    btnNotif.onclick = async () => {
        const permissao = await Notification.requestPermission();
        if (permissao === "granted") {
            btnNotif.innerText = "🔔 Lembretes Ativos";
            new Notification("EloFit 💧", { body: "Lembrete: Mantenha a disciplina e hidrate-se agora!" });
            
            if (intervaloNotificacao) clearInterval(intervaloNotificacao);
            intervaloNotificacao = setInterval(() => {
                new Notification("EloFit 💧", { body: "Hora de beber um copo de água e manter a ofensiva em dia!" });
            }, 3600000);
        } else {
            alert("Permissão de notificação negada pelo navegador.");
        }
    };
}

function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        verificarRegraDeNegocio(null);
        atualizarInterfaceAgua();
        configurarNotificacoes();

        const inputGarrafa = document.getElementById('input-tamanho-garrafa');
        const inputMeta = document.getElementById('input-meta-diaria');

        if (inputGarrafa) {
            inputGarrafa.value = tamanhoGarrafaGlobal;
            inputGarrafa.oninput = (e) => {
                tamanhoGarrafaGlobal = parseInt(e.target.value) || 0;
                salvarEstadoAtual();
            };
        }

        if (inputMeta) {
            inputMeta.value = metaDiariaGlobal;
            inputMeta.oninput = (e) => {
                metaDiariaGlobal = parseInt(e.target.value) || 0;
                checarConclusaoMeta();
                atualizarInterfaceAgua();
                salvarEstadoAtual();
            };
        }

        const btnAddAgua = document.getElementById('btn-add-agua');
        if (btnAddAgua) {
            btnAddAgua.onclick = () => adicionarAguaCustomizada(tamanhoGarrafaGlobal);
        }

        const btnDesfazer = document.getElementById('btn-desfazer');
        if (btnDesfazer) {
            btnDesfazer.onclick = desfazerProgressoAgua;
        }

        document.querySelectorAll('.btn-atalho').forEach(botao => {
            botao.onclick = () => {
                const qtd = parseInt(botao.getAttribute('data-valor')) || 0;
                adicionarAguaCustomizada(qtd);
            };
        });

    } else if (tela === 'treino') {
        conteudoPrincipal.innerHTML = templateTreino;
        
        atualizarInterfaceTreino();

        // Criar Novo Treino (Grupamento)
        const btnCriarTreino = document.getElementById('btn-criar-treino');
        const inputNovoTreino = document.getElementById('input-novo-treino');

        if (btnCriarTreino && inputNovoTreino) {
            btnCriarTreino.onclick = () => {
                const nomeTreino = inputNovoTreino.value.trim();
                if (!nomeTreino) return;

                const chaveId = nomeTreino.toLowerCase().replace(/\s+/g, '_');
                if (minhasFichasTreino[chaveId]) {
                    alert("Já existe um treino com esse nome!");
                    return;
                }

                minhasFichasTreino[chaveId] = {
                    titulo: nomeTreino,
                    exercicios: []
                };

                treinoSelecionadoKey = chaveId;
                inputNovoTreino.value = '';
                salvarEstadoAtual();
                atualizarInterfaceTreino();
            };
        }

        // Adicionar Novo Exercício na Ficha Ativa
        const btnAdicionarEx = document.getElementById('btn-adicionar-exercicio');
        const inputNovoEx = document.getElementById('input-novo-exercicio');

        if (btnAdicionarEx && inputNovoEx) {
            btnAdicionarEx.onclick = () => {
                const textoEx = inputNovoEx.value.trim();
                if (!textoEx || !treinoSelecionadoKey) return;

                minhasFichasTreino[treinoSelecionadoKey].exercicios.push({
                    texto: textoEx,
                    concluido: false
                });

                inputNovoEx.value = '';
                salvarEstadoAtual();
                atualizarInterfaceTreino();
            };
        }

        // Apagar Treino Inteiro
        const btnApagarTreinoTodo = document.getElementById('btn-apagar-treino-todo');
        if (btnApagarTreinoTodo) {
            btnApagarTreinoTodo.onclick = () => {
                if (!treinoSelecionadoKey) return;
                if (confirm(`Tem certeza que deseja apagar o treino "${minhasFichasTreino[treinoSelecionadoKey].titulo}" inteiro?`)) {
                    delete minhasFichasTreino[treinoSelecionadoKey];
                    const chaves = Object.keys(minhasFichasTreino);
                    treinoSelecionadoKey = chaves.length > 0 ? chaves[0] : '';
                    salvarEstadoAtual();
                    atualizarInterfaceTreino();
                }
            };
        }
    }
}

/* ==========================================================================
   MÓDULO 3: EVENTOS GLOBAIS E ACESSO LOCAL
   ========================================================================== */

function entrarNoApp() {
    const telaLogin = document.getElementById('tela-login');
    const appPrincipal = document.getElementById('app-principal');

    if (telaLogin) telaLogin.style.display = 'none';
    if (appPrincipal) appPrincipal.style.display = 'block';

    usuarioAtual = 'dispositivo_local';
    verificarRegraDeNegocio(null);
    atualizarInterfaceAgua();
    carregarTela('agua');
}

document.addEventListener('DOMContentLoaded', () => {
    const mostrarTelaLogin = () => {
        const telaLogin = document.getElementById('tela-login');
        const appPrincipal = document.getElementById('app-principal');

        if (telaLogin) telaLogin.style.display = 'flex';
        if (appPrincipal) appPrincipal.style.display = 'none';

        usuarioAtual = null;
        if (intervaloNotificacao) clearInterval(intervaloNotificacao);
        carregarTela('agua');
    };

    document.getElementById('btn-entrar').addEventListener('click', entrarNoApp);
    document.getElementById('btn-entrar-google').addEventListener('click', autenticarGoogle);
    
    document.getElementById('btn-sair').addEventListener('click', () => {
        mostrarTelaLogin();
    });

    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            mostrarTelaLogin();
        });
    }

    document.getElementById('btn-agua').addEventListener('click', () => carregarTela('agua'));
    document.getElementById('btn-treino').addEventListener('click', () => carregarTela('treino'));

    mostrarTelaLogin();
});