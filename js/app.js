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
   MÓDULO 2: TEMPLATES E CONTROLE DE TELAS
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

function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        // Evento provisório do botão de água
        document.getElementById('btn-add-agua').addEventListener('click', () => {
            console.log("Copo adicionado!");
        });
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

