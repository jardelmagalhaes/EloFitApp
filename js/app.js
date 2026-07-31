/* ==========================================================================
   MÓDULO 1: IMPORTAÇÕES E CONFIGURAÇÃO DO FIREBASE
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let usuarioAtual = null;
let totalAguaGlobal = 0;
let tamanhoGarrafaGlobal = 500;
let metaDiariaGlobal = 2500; // Meta padrão de 2.5L
let historicoAdicoes = [];
let diasOfensiva = 0;
let diasSemanaConcluidos = {}; // Ex: { "2026-07-31": true }

function obterDataHojeStr() {
    return new Date().toISOString().split('T')[0];
}

function obterDataOntemStr() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    return ontem.toISOString().split('T')[0];
}

// Retorna um array com as datas e nomes dos dias da semana atual (Segunda a Domingo)
function obterDiasDaSemanaAtual() {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay(); // 0 (Dom) a 6 (Sáb)
    
    // Ajusta para a semana começar na Segunda-feira (1)
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
        
        <!-- Bloco de Ofensiva e Mascote -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff3e0; padding: 12px 15px; border-radius: 12px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.6rem;">🔥</span>
                <strong id="contador-ofensiva" style="color: #e65100; font-size: 1.1rem;">0 dias</strong>
            </div>
            <img src="img/mascote.png" alt="Mascote EloFit" style="width: 50px; height: 50px; object-fit: contain;">
        </div>

        <!-- Dias da Semana (Calendário de Ofensiva) -->
        <div id="container-dias-semana" style="display: flex; justify-content: space-between; gap: 5px; margin-bottom: 20px; background: #fdfdfd; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
            <!-- Gerado dinamicamente via JS -->
        </div>

        <h2>Controle de Hidratação</h2>
        <p style="color: #666; font-size: 0.85rem; margin-bottom: 15px;">Atinja sua meta diária para manter a chama acesa!</p>
        
        <!-- Configurações de Garrafa e Meta -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; text-align: left;">
            <div>
                <label for="input-tamanho-garrafa" style="font-size: 0.8rem; color: #555; display: block; margin-bottom: 3px;">Copo/Garrafa (ml):</label>
                <input type="number" id="input-tamanho-garrafa" value="500" style="padding: 8px; width: 100%; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;" />
            </div>
            <div>
                <label for="input-meta-diaria" style="font-size: 0.8rem; color: #555; display: block; margin-bottom: 3px;">Meta Diária (ml):</label>
                <input type="number" id="input-meta-diaria" value="2500" style="padding: 8px; width: 100%; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem;" />
            </div>
        </div>

        <div style="display: flex; gap: 10px;">
            <button id="btn-add-agua" class="btn-acao" style="flex: 2; background-color: #ff7b00;">+ Adicionar Copo</button>
            <button id="btn-desfazer" style="flex: 1; background-color: #6c757d; color: white; border: none; padding: 10px; border-radius: 6px; font-size: 0.95rem; cursor: pointer; font-weight: bold;">Desfazer</button>
        </div>

        <div style="margin-top: 20px;">
            <p style="font-size: 1rem;">Total hoje: <strong id="total-bebido" style="color: #ff7b00;">0 ml</strong> / <span id="meta-exibida">2500 ml</span></p>
            <div style="width: 100%; background: #e0e0e0; border-radius: 10px; height: 10px; margin-top: 8px; overflow: hidden;">
                <div id="barra-progresso" style="width: 0%; background: #ff7b00; height: 100%; transition: width 0.3s;"></div>
            </div>
        </div>
    </div>
`;

const templateTreino = `
    <div class="card">
        <h2>Controle de Treino</h2>
        <p>Foco no objetivo e disciplina diária.</p>
    </div>
`;

function atualizarInterface() {
    const displayTotal = document.getElementById('total-bebido');
    const displayMeta = document.getElementById('meta-exibida');
    const barraProgresso = document.getElementById('barra-progresso');
    const displayOfensiva = document.getElementById('contador-ofensiva');
    const containerDias = document.getElementById('container-dias-semana');

    if (displayTotal) displayTotal.innerText = `${totalAguaGlobal} ml`;
    if (displayMeta) displayMeta.innerText = `${metaDiariaGlobal} ml`;
    
    // Atualiza barra de progresso
    if (barraProgresso) {
        let porcentagem = (totalAguaGlobal / metaDiariaGlobal) * 100;
        if (porcentagem > 100) porcentagem = 100;
        barraProgresso.style.width = `${porcentagem}%`;
    }

    if (displayOfensiva) {
        displayOfensiva.innerText = `${diasOfensiva} ${diasOfensiva === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}`;
    }

    // Renderiza os dias da semana
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

function salvarEstadoAtual() {
    const dataHoje = obterDataHojeStr();
    localStorage.setItem('elofit_data_registro', dataHoje);
    localStorage.setItem('elofit_agua', totalAguaGlobal);
    localStorage.setItem('elofit_tamanho_garrafa', tamanhoGarrafaGlobal);
    localStorage.setItem('elofit_meta_diaria', metaDiariaGlobal);
    localStorage.setItem('elofit_historico', JSON.stringify(historicoAdicoes));
    localStorage.setItem('elofit_ofensiva', diasOfensiva);
    localStorage.setItem('elofit_dias_semana', JSON.stringify(diasSemanaConcluidos));

    if (usuarioAtual) {
        const refDoc = doc(db, "usuarios", usuarioAtual);
        setDoc(refDoc, { 
            dataRegistro: dataHoje,
            agua: totalAguaGlobal, 
            tamanhoGarrafa: tamanhoGarrafaGlobal,
            metaDiaria: metaDiariaGlobal,
            historico: historicoAdicoes,
            ofensiva: diasOfensiva,
            diasSemanaConcluidos: diasSemanaConcluidos
        }, { merge: true }).catch(() => {});
    }
}

function verificarRegraDeNegocio(dadosSalvos) {
    const dataHoje = obterDataHojeStr();
    const dataOntem = obterDataOntemStr();
    
    const ultimaData = dadosSalvos ? dadosSalvos.dataRegistro : localStorage.getItem('elofit_data_registro');
    
    tamanhoGarrafaGlobal = dadosSalvos && dadosSalvos.tamanhoGarrafa !== undefined ? dadosSalvos.tamanhoGarrafa : (parseInt(localStorage.getItem('elofit_tamanho_garrafa')) || 500);
    metaDiariaGlobal = dadosSalvos && dadosSalvos.metaDiaria !== undefined ? dadosSalvos.metaDiaria : (parseInt(localStorage.getItem('elofit_meta_diaria')) || 2500);
    
    const diasSalvosLocal = localStorage.getItem('elofit_dias_semana');
    diasSemanaConcluidos = dadosSalvos && dadosSalvos.diasSemanaConcluidos ? dadosSalvos.diasSemanaConcluidos : (diasSalvosLocal ? JSON.parse(diasSalvosLocal) : {});

    if (ultimaData === dataHoje) {
        totalAguaGlobal = dadosSalvos ? (dadosSalvos.agua || 0) : (parseInt(localStorage.getItem('elofit_agua')) || 0);
        diasOfensiva = dadosSalvos ? (dadosSalvos.ofensiva || 0) : (parseInt(localStorage.getItem('elofit_ofensiva')) || 0);
        
        const histLocal = localStorage.getItem('elofit_historico');
        historicoAdicoes = dadosSalvos && Array.isArray(dadosSalvos.historico) ? dadosSalvos.historico : (histLocal ? JSON.parse(histLocal) : []);
    } else if (ultimaData === dataOntem) {
        // Verifica se completou a meta ontem
        const totalOntem = dadosSalvos ? (dadosSalvos.agua || 0) : (parseInt(localStorage.getItem('elofit_agua')) || 0);
        const metaOntem = metaDiariaGlobal;
        
        if (totalOntem >= metaOntem) {
            diasSemanaConcluidos[ultimaData] = true;
        } else {
            // Se perdeu a meta ontem e não atingiu, zera a ofensiva
            diasOfensiva = 0;
        }

        totalAguaGlobal = 0;
        historicoAdicoes = [];
        salvarEstadoAtual();
    } else {
        // Ficou mais de um dia sem logar, zera ofensiva
        diasOfensiva = 0;
        totalAguaGlobal = 0;
        historicoAdicoes = [];
        salvarEstadoAtual();
    }
}

function checarConclusaoMeta() {
    const dataHoje = obterDataHojeStr();
    if (totalAguaGlobal >= metaDiariaGlobal) {
        if (!diasSemanaConcluidos[dataHoje]) {
            diasSemanaConcluidos[dataHoje] = true;
            diasOfensiva += 1; // Incrementa a ofensiva ao bater a meta pela primeira vez no dia
        }
    } else {
        // Se ficou abaixo da meta por causa de um "desfazer", remove o status de concluído do dia
        if (diasSemanaConcluidos[dataHoje]) {
            delete diasSemanaConcluidos[dataHoje];
            if (diasOfensiva > 0) diasOfensiva -= 1;
        }
    }
}

function registrarProgressoAgua() {
    const quantidadeAdicionada = tamanhoGarrafaGlobal;
    totalAguaGlobal += quantidadeAdicionada;
    historicoAdicoes.push(quantidadeAdicionada);
    
    checarConclusaoMeta();
    atualizarInterface();
    salvarEstadoAtual();
}

function desfazerProgressoAgua() {
    if (historicoAdicoes.length > 0) {
        const ultimoValor = historicoAdicoes.pop();
        totalAguaGlobal -= ultimoValor;
        if (totalAguaGlobal < 0) totalAguaGlobal = 0;
        
        checarConclusaoMeta();
        atualizarInterface();
        salvarEstadoAtual();
    }
}

function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        verificarRegraDeNegocio(null);
        atualizarInterface();

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
                atualizarInterface();
                salvarEstadoAtual();
            };
        }

        const btnAddAgua = document.getElementById('btn-add-agua');
        if (btnAddAgua) {
            btnAddAgua.onclick = registrarProgressoAgua;
        }

        const btnDesfazer = document.getElementById('btn-desfazer');
        if (btnDesfazer) {
            btnDesfazer.onclick = desfazerProgressoAgua;
        }

    } else {
        conteudoPrincipal.innerHTML = templateTreino;
    }
}

/* ==========================================================================
   MÓDULO 3: AUTENTICAÇÃO E EVENTOS GLOBAIS
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    const telaLogin = document.getElementById('tela-login');
    const appPrincipal = document.getElementById('app-principal');
    
    if (user) {
        usuarioAtual = user.uid;
        telaLogin.style.display = 'none';
        appPrincipal.style.display = 'block';
        
        const refDoc = doc(db, "usuarios", usuarioAtual);
        getDoc(refDoc).then((snapshot) => {
            if (snapshot.exists()) {
                verificarRegraDeNegocio(snapshot.data());
            } else {
                verificarRegraDeNegocio(null);
            }
            atualizarInterface();
            const inputGarrafa = document.getElementById('input-tamanho-garrafa');
            const inputMeta = document.getElementById('input-meta-diaria');
            if (inputGarrafa) inputGarrafa.value = tamanhoGarrafaGlobal;
            if (inputMeta) inputMeta.value = metaDiariaGlobal;
        }).catch(() => {
            verificarRegraDeNegocio(null);
            atualizarInterface();
        });

        carregarTela('agua');
    } else {
        usuarioAtual = null;
        localStorage.clear();
        telaLogin.style.display = 'flex';
        appPrincipal.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-entrar').addEventListener('click', () => signInWithPopup(auth, provider));
    document.getElementById('btn-sair').addEventListener('click', () => signOut(auth));
    document.getElementById('btn-agua').addEventListener('click', () => carregarTela('agua'));
    document.getElementById('btn-treino').addEventListener('click', () => carregarTela('treino'));
});