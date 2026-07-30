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

/* ==========================================================================
   MÓDULO 2: FUNÇÕES DE BANCO DE DADOS (FIRESTORE)
   ========================================================================== */
async function salvarNoFirestore(dados) {
    if (!usuarioAtual) return;
    try {
        const refDoc = doc(db, "usuarios", usuarioAtual);
        // merge: true garante que não sobrescreve outros campos
        await setDoc(refDoc, dados, { merge: true });
    } catch (erro) {
        console.error("Erro ao salvar no Firestore:", erro);
    }
}

async function carregarDoFirestore() {
    if (!usuarioAtual) return null;
    try {
        const refDoc = doc(db, "usuarios", usuarioAtual);
        const snapshot = await getDoc(refDoc);
        if (snapshot.exists()) {
            return snapshot.data();
        }
        return null;
    } catch (erro) {
        console.error("Erro ao carregar do Firestore:", erro);
        return null;
    }
}

/* ==========================================================================
   MÓDULO 3: TEMPLATES E CONTROLE DE TELAS
   ========================================================================== */
const conteudoPrincipal = document.getElementById('conteudo-principal');

const templateAgua = `
    <div class="card">
        <h2>Controle de Hidratação</h2>
        <p>Registre sua água e mantenha a ofensiva.</p>
        <button id="btn-add-agua" class="btn-acao">+ Adicionar Copo (250ml)</button>
        <p>Total hoje: <strong id="total-bebido">0 ml</strong></p>
    </div>
`;

const templateTreino = `
    <div class="card">
        <h2>Controle de Treino</h2>
        <p>Foco no objetivo e disciplina diária.</p>
    </div>
`;

async function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        // Carrega o valor salvo no Firestore ao abrir a tela
        const dados = await carregarDoFirestore();
        let totalAgua = dados && dados.agua ? dados.agua : 0;
        
        const displayTotal = document.getElementById('total-bebido');
        if (displayTotal) {
            displayTotal.innerText = `${totalAgua} ml`;
        }

        // Evento de clique para adicionar água e salvar na nuvem
        document.getElementById('btn-add-agua').addEventListener('click', async () => {
            totalAgua += 250;
            if (displayTotal) {
                displayTotal.innerText = `${totalAgua} ml`;
            }
            await salvarNoFirestore({ agua: totalAgua });
            console.log("Água salva na nuvem:", totalAgua);
        });

    } else {
        conteudoPrincipal.innerHTML = templateTreino;
    }
}

/* ==========================================================================
   MÓDULO 4: AUTENTICAÇÃO E EVENTOS GLOBAIS
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
    const telaLogin = document.getElementById('tela-login');
    const appPrincipal = document.getElementById('app-principal');
    
    if (user) {
        usuarioAtual = user.uid;
        telaLogin.style.display = 'none';
        appPrincipal.style.display = 'block';
        carregarTela('agua');
    } else {
        usuarioAtual = null;
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