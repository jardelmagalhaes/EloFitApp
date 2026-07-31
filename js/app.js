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
let historicoAdicoes = [];

// Retorna a data atual no formato string "AAAA-MM-DD"
function obterDataHojeStr() {
    return new Date().toISOString().split('T')[0];
}

/* ==========================================================================
   MÓDULO 2: TEMPLATES E CONTROLE DE TELAS
   ========================================================================== */
const conteudoPrincipal = document.getElementById('conteudo-principal');

const templateAgua = `
    <div class="card">
        <h2>Controle de Hidratação</h2>
        <p>Registre sua água e mantenha a ofensiva.</p>
        
        <div style="margin: 15px 0;">
            <label for="input-tamanho-garrafa" style="font-size: 0.9rem; color: #555; display: block; margin-bottom: 5px;">Tamanho do Recipiente (ml):</label>
            <input type="number" id="input-tamanho-garrafa" value="500" style="padding: 8px; width: 100%; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem;" />
        </div>

        <div style="display: flex; gap: 10px;">
            <button id="btn-add-agua" class="btn-acao" style="flex: 2;">+ Adicionar Copo</button>
            <button id="btn-desfazer" style="flex: 1; background-color: #6c757d; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: bold;">Desfazer</button>
        </div>

        <p style="margin-top: 15px;">Total hoje: <strong id="total-bebido">0 ml</strong></p>
    </div>
`;

const templateTreino = `
    <div class="card">
        <h2>Controle de Treino</h2>
        <p>Foco no objetivo e disciplina diária.</p>
    </div>
`;

function atualizarTelaAgua() {
    const displayTotal = document.getElementById('total-bebido');
    if (displayTotal) {
        displayTotal.innerText = `${totalAguaGlobal} ml`;
    }
}

function salvarEstadoAtual() {
    const dataHoje = obterDataHojeStr();
    localStorage.setItem('elofit_data_registro', dataHoje);
    localStorage.setItem('elofit_agua', totalAguaGlobal);
    localStorage.setItem('elofit_tamanho_garrafa', tamanhoGarrafaGlobal);
    localStorage.setItem('elofit_historico', JSON.stringify(historicoAdicoes));

    if (usuarioAtual) {
        const refDoc = doc(db, "usuarios", usuarioAtual);
        setDoc(refDoc, { 
            dataRegistro: dataHoje,
            agua: totalAguaGlobal, 
            tamanhoGarrafa: tamanhoGarrafaGlobal,
            historico: historicoAdicoes
        }, { merge: true }).catch(() => {});
    }
}

function verificarViradaDeDia(dadosSalvos) {
    const dataHoje = obterDataHojeStr();
    const ultimaData = dadosSalvos ? dadosSalvos.dataRegistro : localStorage.getItem('elofit_data_registro');

    // Se a data registrada for diferente de hoje, o dia virou! Resetamos o contador.
    if (ultimaData !== dataHoje) {
        totalAguaGlobal = 0;
        historicoAdicoes = [];
        // Mantém apenas o tamanho da garrafa que o usuário configurou
        if (dadosSalvos && dadosSalvos.tamanhoGarrafa) {
            tamanhoGarrafaGlobal = dadosSalvos.tamanhoGarrafa;
        } else {
            tamanhoGarrafaGlobal = parseInt(localStorage.getItem('elofit_tamanho_garrafa')) || 500;
        }
        salvarEstadoAtual(); // Salva o estado zerado para o novo dia
    } else {
        // Se for o mesmo dia, apenas carrega os valores normais
        totalAguaGlobal = dadosSalvos ? (dadosSalvos.agua || 0) : (parseInt(localStorage.getItem('elofit_agua')) || 0);
        tamanhoGarrafaGlobal = dadosSalvos ? (dadosSalvos.tamanhoGarrafa || 500) : (parseInt(localStorage.getItem('elofit_tamanho_garrafa')) || 500);
        
        const histLocal = localStorage.getItem('elofit_historico');
        historicoAdicoes = dadosSalvos && dadosSalvos.historico ? dadosNuvemHistoricoSeguro(dadosSalvos.historico) : (histLocal ? JSON.parse(histLocal) : []);
    }
}

function dadosNuvemHistoricoSeguro(hist) {
    return Array.isArray(hist) ? hist : [];
}

function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        // Verifica se mudou o dia com base no localStorage primeiro
        verificarViradaDeDia(null);
        atualizarTelaAgua();

        const inputGarrafa = document.getElementById('input-tamanho-garrafa');
        if (inputGarrafa) {
            inputGarrafa.value = tamanhoGarrafaGlobal;
            inputGarrafa.oninput = (e) => {
                tamanhoGarrafaGlobal = parseInt(e.target.value) || 0;
                salvarEstadoAtual();
            };
        }

        const btnAddAgua = document.getElementById('btn-add-agua');
        if (btnAddAgua) {
            btnAddAgua.onclick = () => {
                const quantidadeAdicionada = tamanhoGarrafaGlobal;
                totalAguaGlobal += quantidadeAdicionada;
                historicoAdicoes.push(quantidadeAdicionada);
                
                atualizarTelaAgua();
                salvarEstadoAtual();
            };
        }

        const btnDesfazer = document.getElementById('btn-desfazer');
        if (btnDesfazer) {
            btnDesfazer.onclick = () => {
                if (historicoAdicoes.length > 0) {
                    const ultimoValor = historicoAdicoes.pop();
                    totalAguaGlobal -= ultimoValor;
                    if (totalAguaGlobal < 0) totalAguaGlobal = 0;
                    
                    atualizarTelaAgua();
                    salvarEstadoAtual();
                }
            };
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
                const dadosNuvem = snapshot.data();
                verificarViradaDeDia(dadosNuvem);
            } else {
                verificarViradaDeDia(null);
            }
            
            atualizarTelaAgua();
            const inputGarrafa = document.getElementById('input-tamanho-garrafa');
            if (inputGarrafa) inputGarrafa.value = tamanhoGarrafaGlobal;
        }).catch(() => {
            verificarViradaDeDia(null);
            atualizarTelaAgua();
        });

        carregarTela('agua');
    } else {
        usuarioAtual = null;
        localStorage.removeItem('elofit_agua');
        localStorage.removeItem('elofit_tamanho_garrafa');
        localStorage.removeItem('elofit_historico');
        localStorage.removeItem('elofit_data_registro');
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