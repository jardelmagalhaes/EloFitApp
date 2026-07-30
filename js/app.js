
// ==========================================
// 0. CONFIGURAÇÃO E MOTOR FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyB4lEEEAF754mDnXGdttZ7k1kU8h0sxM8Q",
  authDomain: "checkvital-999fa.firebaseapp.com",
  projectId: "checkvital-999fa",
  storageBucket: "checkvital-999fa.firebasestorage.app",
  messagingSenderId: "600263811491",
  appId: "1:600263811491:web:8086e0437a548293b67a16",
  measurementId: "G-0WRDQBB9GN"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let usuarioAtual = null;

async function salvarNoFirestore(dados) {
    if (!usuarioAtual) return;
    await db.collection("usuarios").doc(usuarioAtual).set(dados, { merge: true });
}

async function carregarDoFirestore() {
    if (!usuarioAtual) return null;
    const doc = await db.collection("usuarios").doc(usuarioAtual).get();
    return doc.exists ? doc.data() : null;
}

auth.onAuthStateChanged((user) => {
    if (user) {
        usuarioAtual = user.uid;
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('app-principal').style.display = 'block';
        carregarTela('agua');
    } else {
        document.getElementById('tela-login').style.display = 'flex';
        document.getElementById('app-principal').style.display = 'none';
    }
});

// Este código deve estar após a inicialização do firebase
document.getElementById('btn-entrar').addEventListener('click', () => {
    console.log("Botão clicado!"); // Adicione este log para testar no F12
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Sucesso:", result.user);
        })
        .catch((error) => {
            console.error("Erro no login:", error);
        });
});

document.getElementById('btn-sair').addEventListener('click', () => auth.signOut());

// ==========================================
// 1. UTILITÁRIOS GERAIS
// ==========================================
function formatarVolume(ml) {
    if (ml >= 1000) return (ml / 1000) + ' L';
    return ml + ' ml';
}

function obterDataLocalStr(dataObj) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterDataHojeStr() {
    return new Date().toISOString().split('T')[0];
}

// Obtém a data de ontem (necessário para o cálculo de streak)
function obterDataOntemStr() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    return ontem.toISOString().split('T')[0];
}

// Formatação simples de volume em ml
function formatarVolume(ml) {
    return `${ml} ml`;
}

// Wrappers para o LocalStorage
function getLocal(key) {
    return localStorage.getItem(key);
}
function setLocal(key, val) {
    localStorage.setItem(key, val);
}

// Gera a lista de nomes dos dias da semana para o calendário
function obterDiasDaSemanaAtual() {
    const hoje = new Date();
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const dia = new Date();
        dia.setDate(hoje.getDate() - hoje.getDay() + i);
        dias.push({
            nome: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dia.getDay()],
            dataStr: dia.toISOString().split('T')[0]
        });
    }
    return dias;
}
// ==========================================
// 2. TEMPLATES
// ==========================================
const templateAgua = `
    <div class="card">
        <div class="streak-container">
            <span id="icone-fogo" style="filter: grayscale(100%); opacity: 0.5;">🔥</span>
            <span id="streak-count">0</span> dias de foco
        </div>
        <div class="calendario-semanal" id="calendario-semanal-container"></div>
        <h2>Controle de Hidratação</h2>
        <p>Defina suas metas e o recipiente para manter a chama acesa.</p>
        
        <div class="input-grupo" style="margin-top: 15px;">
            <label>Meta Diária (Litros)</label>
            <input type="number" id="meta-diaria" value="4" step="0.1" min="0.1">
        </div>
        <div class="input-grupo">
            <label>Tamanho do Recipiente (ml)</label>
            <input type="number" id="tamanho-garrafa" value="500">
        </div>
        <div class="botoes-container">
            <button id="btn-beber" class="btn-acao">Beber (+ <span id="display-ml">500</span>ml)</button>
            <button id="btn-desfazer" class="btn-acao btn-desfazer">↺ Desfazer</button>
        </div>
        <h3 style="margin-top: 20px;">Progresso de Hoje: <span id="total-bebido">0 ml</span></h3>
        <div id="mensagem-meta" style="display: none; margin-top: 15px; padding: 15px; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 8px; text-align: center; font-weight: bold;">
            🎉 Você atingiu sua meta e salvou a ofensiva!
        </div>
        <div class="checklist-agua" id="container-copos"></div>
    </div>
`;

const templateTreino = `
    <div class="card">
        <div class="streak-container">
            <span id="icone-fogo-treino" style="filter: grayscale(100%); opacity: 0.5;">🔥</span>
            <span id="streak-count-treino">0</span> treinos concluídos
        </div>
        <div class="calendario-semanal" id="calendario-semanal-treino-container"></div>

        <div id="etapa-lista-fichas">
            <h2>📋 Minhas Fichas</h2>
            <div id="lista-fichas-salvas" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;"></div>
            <div style="margin-top: 25px; border-top: 2px solid #eee; padding-top: 15px;">
                <h3>Nova Ficha</h3>
                <div class="input-grupo" style="margin-top: 10px;">
                    <input type="text" id="nome-nova-ficha" placeholder="Ex: Costas e Bíceps">
                </div>
                <button id="btn-criar-ficha" class="btn-acao" style="background-color: var(--cor-texto);">+ Criar Ficha</button>
            </div>
        </div>

        <div id="etapa-dentro-ficha" class="etapa-oculta">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <h2 style="margin: 0;"><span id="display-nome-ficha" style="color: var(--cor-secundaria);"></span></h2>
                <button id="btn-voltar-fichas" style="background: none; border: none; color: #777; text-decoration: underline; cursor: pointer; font-weight: bold;">⬅ Voltar</button>
            </div>
            <div class="input-grupo">
                <label>Novo Exercício</label>
                <input type="text" id="nome-exercicio" placeholder="Ex: Elevação Lateral">
            </div>
            <div style="display: flex; gap: 10px;">
                <div class="input-grupo" style="flex: 1;">
                    <label>Séries</label>
                    <input type="number" id="qtd-series" placeholder="Ex: 4" min="1">
                </div>
                <div class="input-grupo" style="flex: 1;">
                    <label>Repetições</label>
                    <input type="text" id="qtd-reps" placeholder="Ex: 10 a 12">
                </div>
            </div>
            <div class="input-grupo" style="flex-direction: row; align-items: center; gap: 10px; margin-bottom: 20px;">
                <input type="checkbox" id="progresso-carga" style="width: 20px; height: 20px; cursor: pointer;">
                <label for="progresso-carga" style="margin-bottom: 0; cursor: pointer; font-weight: bold;">Com Progressão de Carga?</label>
            </div>
            <div class="botoes-container">
                <button id="btn-add-exercicio" class="btn-acao" style="background-color: var(--cor-secundaria);">+ Adicionar</button>
                <button id="btn-desfazer-treino" class="btn-acao btn-desfazer">↺ Desfazer</button>
            </div>
        </div>
        <div id="mensagem-meta-treino" class="etapa-oculta" style="margin-top: 15px; padding: 15px; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 8px; text-align: center; font-weight: bold;">
            💪 Treino Concluído! Descanso merecido.
        </div>
    </div>
    <div id="ficha-treino"></div>
`;

// ==========================================
// 3. NAVEGAÇÃO
// ==========================================
const btnAgua = document.getElementById('btn-agua');
const btnTreino = document.getElementById('btn-treino');
const conteudoPrincipal = document.getElementById('conteudo-principal');

function carregarTela(tela) {
    if (tela === 'agua') {
        conteudoPrincipal.innerHTML = templateAgua;
        
        // --- A CHAMADA DA LÓGICA ---
        // Agora que a função auxiliar existe, este comando vai funcionar:
        iniciarLogicaAgua(); 
        
    } else {
        conteudoPrincipal.innerHTML = templateTreino;
    }
}
btnAgua.addEventListener('click', () => carregarTela('agua'));
btnTreino.addEventListener('click', () => carregarTela('treino'));


// ==========================================
// 4. LÓGICA DO MÓDULO DE ÁGUA
// ==========================================
async function iniciarLogicaAgua() {
    const inputMeta = document.getElementById('meta-diaria');
    const inputTamanho = document.getElementById('tamanho-garrafa');
    const displayMl = document.getElementById('display-ml');
    const btnBeber = document.getElementById('btn-beber');
    const btnDesfazer = document.getElementById('btn-desfazer');
    const containerCopos = document.getElementById('container-copos');
    const displayTotal = document.getElementById('total-bebido');
    const mensagemMeta = document.getElementById('mensagem-meta');

    let totalConsumido = 0;
    let historicoCopos = [];

    const dadosNuvem = await carregarDoFirestore() || {};
    let streak = dadosNuvem.agua_streak || 0;
    let lastGoalDate = dadosNuvem.agua_last_goal_date || null;
    let historicoMetas = dadosNuvem.agua_historico_metas || {};

    function auditarOfensiva() {
        if (streak > 0 && lastGoalDate) {
            const hoje = obterDataHojeStr();
            const ontem = obterDataOntemStr();
            if (lastGoalDate !== hoje && lastGoalDate !== ontem) {
                streak = 0;
                setLocal('agua_streak', streak);
            }
        }
    }

    async function salvarEstadoAgua() {
    await salvarNoFirestore({
        agua_data_atual: obterDataHojeStr(),
        agua_consumo: totalConsumido,
        agua_historico: historicoCopos.map(item => item.volume)
    });
}

    function criarCopoVisual(volume) {
        const copo = document.createElement('div');
        copo.classList.add('copo', 'cheio');
        copo.addEventListener('click', () => {
            if (copo.parentNode) {
                totalConsumido -= volume;
                displayTotal.innerText = formatarVolume(totalConsumido);
                copo.remove();
                historicoCopos = historicoCopos.filter(item => item.elemento !== copo);
                salvarEstadoAgua();
                atualizarVerificacaoMeta();
            }
        });
        containerCopos.appendChild(copo);
        historicoCopos.push({ elemento: copo, volume: volume });
    }

    function atualizarDisplayStreak() {
        const streakEl = document.getElementById('streak-count');
        const iconeFogo = document.getElementById('icone-fogo');
        streakEl.innerText = streak;
        if (streak > 0) {
            iconeFogo.style.filter = 'grayscale(0%)';
            iconeFogo.style.opacity = '1';
        } else {
            iconeFogo.style.filter = 'grayscale(100%)';
            iconeFogo.style.opacity = '0.5';
        }
    }

    function renderizarCalendarioSemanal() {
        const container = document.getElementById('calendario-semanal-container');
        if (!container) return;
        const diasDaSemana = obterDiasDaSemanaAtual();
        const hojeStr = obterDataHojeStr();
        const dataInicio = getLocal('data_inicio');
        let html = '';

        diasDaSemana.forEach(dia => {
            const bateuMeta = historicoMetas[dia.dataStr];
            const ehHoje = dia.dataStr === hojeStr;
            let icone = '⏳'; 
            let classeSucesso = '';

            if (dia.dataStr < dataInicio) {
                icone = '➖';
            } else if (bateuMeta) {
                icone = '🔥';
                classeSucesso = 'sucesso';
            } else if (dia.dataStr < hojeStr) {
                icone = '❌'; 
            }

            html += `<div class="dia-semana ${classeSucesso} ${ehHoje ? 'hoje' : ''}">
                        <span>${dia.nome}</span>
                        <div class="icone-dia">${icone}</div>
                     </div>`;
        });
        container.innerHTML = html;
    }

    async function atualizarVerificacaoMeta() {
        const metaLitros = parseFloat(inputMeta.value) || 0;
        const metaMl = metaLitros * 1000;
        const hoje = obterDataHojeStr();

        if (metaMl > 0 && totalConsumido >= metaMl) {
            mensagemMeta.style.display = 'block';
            historicoMetas[hoje] = true;

            if (lastGoalDate !== hoje) {
                const ontem = obterDataOntemStr();
                streak = (lastGoalDate === ontem) ? streak + 1 : 1;
                lastGoalDate = hoje;
                atualizarDisplayStreak();
            }
        } else {
            mensagemMeta.style.display = 'none';
            if (lastGoalDate === hoje) {
                delete historicoMetas[hoje];
                streak = Math.max(0, streak - 1); 
                lastGoalDate = streak > 0 ? obterDataOntemStr() : null; 
                atualizarDisplayStreak();
            }
        }
        
        // --- A MUDANÇA ESTÁ AQUI: Salva tudo de uma vez na nuvem ---
        await salvarNoFirestore({
            agua_historico_metas: historicoMetas,
            agua_streak: streak,
            agua_last_goal_date: lastGoalDate
        });

        renderizarCalendarioSemanal();
    }

    auditarOfensiva();
    const dataSalva = getLocal('agua_data_atual');
    const hojeStr = obterDataHojeStr();

    if (dataSalva === hojeStr) {
        totalConsumido = parseInt(getLocal('agua_consumo')) || 0;
        displayTotal.innerText = formatarVolume(totalConsumido);
        const volumesSalvos = JSON.parse(getLocal('agua_historico')) || [];
        volumesSalvos.forEach(vol => criarCopoVisual(vol));
    } else {
        totalConsumido = 0;
        salvarEstadoAgua(); 
    }

    atualizarDisplayStreak();
    atualizarVerificacaoMeta();

    setInterval(() => {
        const sentinelaHoje = obterDataHojeStr();
        const sentinelaSalva = getLocal('agua_data_atual');
        if (sentinelaSalva && sentinelaSalva !== sentinelaHoje) {
            auditarOfensiva(); 
            totalConsumido = 0;
            historicoCopos = [];
            containerCopos.innerHTML = '';
            displayTotal.innerText = formatarVolume(0);
            salvarEstadoAgua();
            atualizarDisplayStreak();
            atualizarVerificacaoMeta();
        }
    }, 60000); 

    inputMeta.addEventListener('input', atualizarVerificacaoMeta);
    inputTamanho.addEventListener('input', (e) => {
        displayMl.innerText = e.target.value || 0;
    });

    btnBeber.addEventListener('click', () => {
        const mlAtual = parseInt(inputTamanho.value);
        if(!mlAtual || mlAtual <= 0) return;
        totalConsumido += mlAtual;
        displayTotal.innerText = formatarVolume(totalConsumido);
        criarCopoVisual(mlAtual); 
        salvarEstadoAgua();
        atualizarVerificacaoMeta();
    });

    btnDesfazer.addEventListener('click', () => {
        if (historicoCopos.length > 0) {
            const ultimoRegistro = historicoCopos.pop();
            totalConsumido -= ultimoRegistro.volume;
            displayTotal.innerText = formatarVolume(totalConsumido);
            ultimoRegistro.elemento.remove();
            salvarEstadoAgua();
            atualizarVerificacaoMeta();
        }
    });
}


// ==========================================
// 5. LÓGICA DO MÓDULO DE TREINO
// ==========================================
function iniciarLogicaTreino() {
    const etapaListaFichas = document.getElementById('etapa-lista-fichas');
    const listaFichasSalvas = document.getElementById('lista-fichas-salvas');
    const inputNomeNovaFicha = document.getElementById('nome-nova-ficha');
    const btnCriarFicha = document.getElementById('btn-criar-ficha');
    
    const etapaDentroFicha = document.getElementById('etapa-dentro-ficha');
    const displayNomeFicha = document.getElementById('display-nome-ficha');
    const btnVoltarFichas = document.getElementById('btn-voltar-fichas');
    const btnAddExercicio = document.getElementById('btn-add-exercicio');
    const btnDesfazerTreino = document.getElementById('btn-desfazer-treino');
    
    const inputExercicio = document.getElementById('nome-exercicio');
    const inputSeries = document.getElementById('qtd-series');
    const inputReps = document.getElementById('qtd-reps');
    const inputProgressao = document.getElementById('progresso-carga');
    
    const fichaTreino = document.getElementById('ficha-treino'); 
    const mensagemMeta = document.getElementById('mensagem-meta-treino');

    let streak = parseInt(getLocal('treino_streak')) || 0;
    let lastGoalDate = getLocal('treino_last_goal_date') || null;
    let historicoMetas = JSON.parse(getLocal('treino_historico_metas')) || {};
    let fichas = JSON.parse(getLocal('fichas_treino')) || [];
    let idFichaAtiva = null;

    function auditarOfensiva() {
        if (streak > 0 && lastGoalDate) {
            const hoje = obterDataHojeStr();
            const ontem = obterDataOntemStr();
            if (lastGoalDate !== hoje && lastGoalDate !== ontem) {
                streak = 0;
                setLocal('treino_streak', streak);
            }
        }
    }

    function salvarFichas() {
        setLocal('fichas_treino', JSON.stringify(fichas));
        setLocal('treino_data_atual', obterDataHojeStr()); 
    }

    function atualizarDisplayStreak() {
        const streakEl = document.getElementById('streak-count-treino');
        const iconeFogo = document.getElementById('icone-fogo-treino');
        if(!streakEl || !iconeFogo) return;

        streakEl.innerText = streak;
        if (streak > 0) {
            iconeFogo.style.filter = 'grayscale(0%)';
            iconeFogo.style.opacity = '1';
        } else {
            iconeFogo.style.filter = 'grayscale(100%)';
            iconeFogo.style.opacity = '0.5';
        }
    }

    function renderizarCalendarioSemanal() {
        const container = document.getElementById('calendario-semanal-treino-container');
        if (!container) return;
        const diasDaSemana = obterDiasDaSemanaAtual();
        const hojeStr = obterDataHojeStr();
        const dataInicio = getLocal('data_inicio'); 
        let html = '';

        diasDaSemana.forEach(dia => {
            const bateuMeta = historicoMetas[dia.dataStr];
            const ehHoje = dia.dataStr === hojeStr;
            let icone = '⏳'; 
            let classeSucesso = '';

            if (dia.dataStr < dataInicio) {
                icone = '➖'; 
            } else if (bateuMeta) {
                icone = '💪'; 
                classeSucesso = 'sucesso';
            } else if (dia.dataStr < hojeStr) {
                icone = '❌'; 
            }

            html += `<div class="dia-semana ${classeSucesso} ${ehHoje ? 'hoje' : ''}">
                        <span>${dia.nome}</span>
                        <div class="icone-dia">${icone}</div>
                     </div>`;
        });
        container.innerHTML = html;
    }

    function verificarTreinoConcluido() {
        if (!idFichaAtiva) return;
        const fichaAtual = fichas.find(f => f.id === idFichaAtiva);
        const temExercicios = fichaAtual.exercicios.length > 0;
        let tudoFeito = temExercicios;

        if (temExercicios) {
            for (let ex of fichaAtual.exercicios) {
                if (!ex.series.every(serie => serie === true)) {
                    tudoFeito = false;
                    break;
                }
            }
        } else {
            tudoFeito = false;
        }

        const hoje = obterDataHojeStr();
        if (tudoFeito) {
            mensagemMeta.classList.remove('etapa-oculta'); 
            historicoMetas[hoje] = true;
            setLocal('treino_historico_metas', JSON.stringify(historicoMetas));

            if (lastGoalDate !== hoje) {
                const ontem = obterDataOntemStr();
                streak = (lastGoalDate === ontem) ? streak + 1 : 1;
                lastGoalDate = hoje;
                setLocal('treino_streak', streak);
                setLocal('treino_last_goal_date', lastGoalDate);
                atualizarDisplayStreak();
            }
        } else {
            mensagemMeta.classList.add('etapa-oculta'); 
            if (lastGoalDate === hoje) {
                delete historicoMetas[hoje];
                setLocal('treino_historico_metas', JSON.stringify(historicoMetas));
                streak = Math.max(0, streak - 1);
                lastGoalDate = streak > 0 ? obterDataOntemStr() : null;
                setLocal('treino_streak', streak);
                setLocal('treino_last_goal_date', lastGoalDate);
                atualizarDisplayStreak();
            }
        }
        renderizarCalendarioSemanal();
    }

    function renderizarListaFichas() {
        listaFichasSalvas.innerHTML = '';
        if (fichas.length === 0) {
            listaFichasSalvas.innerHTML = '<p style="color: #777; font-style: italic;">Você ainda não possui fichas de treino cadastradas.</p>';
            return;
        }

        fichas.forEach(ficha => {
            const card = document.createElement('div');
            card.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #fff; border: 1px solid #ddd; border-radius: var(--borda-raio); box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
            card.innerHTML = `
                <span style="font-weight: bold; font-size: 1.1rem; text-transform: capitalize; color: var(--cor-texto);">${ficha.nome}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-abrir" style="background-color: var(--cor-secundaria); color: #fff; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer;">Entrar</button>
                    <button class="btn-apagar" style="background-color: transparent; color: #ff4757; border: 1px solid #ff4757; padding: 8px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">🗑️</button>
                </div>
            `;
            card.querySelector('.btn-abrir').addEventListener('click', () => abrirFicha(ficha.id));
            card.querySelector('.btn-apagar').addEventListener('click', () => {
                if (confirm(`Tem certeza que deseja apagar a ficha "${ficha.nome}" permanentemente?`)) {
                    fichas = fichas.filter(f => f.id !== ficha.id);
                    salvarFichas();
                    renderizarListaFichas();
                }
            });
            listaFichasSalvas.appendChild(card);
        });
    }

    function abrirFicha(id) {
        idFichaAtiva = id;
        const fichaAtual = fichas.find(f => f.id === id);
        displayNomeFicha.innerText = fichaAtual.nome;
        etapaListaFichas.classList.add('etapa-oculta');
        etapaDentroFicha.classList.remove('etapa-oculta');
        renderizarExercicios();
        verificarTreinoConcluido();
    }

    function voltarParaLista() {
        idFichaAtiva = null;
        etapaDentroFicha.classList.add('etapa-oculta');
        etapaListaFichas.classList.remove('etapa-oculta');
        mensagemMeta.classList.add('etapa-oculta');
        fichaTreino.innerHTML = ''; 
        renderizarListaFichas();
    }

    function renderizarExercicios() {
        fichaTreino.innerHTML = ''; 
        if (!idFichaAtiva) return;
        const fichaAtual = fichas.find(f => f.id === idFichaAtiva);

        fichaAtual.exercicios.forEach((exercicio, indexExercicio) => {
            const exercicioConcluido = exercicio.series.length > 0 && exercicio.series.every(serie => serie === true);
            const divExercicio = document.createElement('div');
            divExercicio.classList.add('exercicio-item');
            if (exercicioConcluido) divExercicio.classList.add('concluido');

            const header = document.createElement('div');
            header.classList.add('exercicio-header');
            
            const seloCarga = exercicio.progressaoCarga 
                ? '<div class="badge-progresso badge-sim">📈 Com progressão de carga</div>' 
                : '<div class="badge-progresso badge-nao">➖ Sem progressão de carga</div>';

            const seloConcluido = exercicioConcluido
                ? '<div class="badge-concluido-ex">✅ Exercício Concluído</div>'
                : '';

            header.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span class="exercicio-titulo">${exercicio.nome}</span>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
                        ${seloCarga}
                        ${seloConcluido}
                    </div>
                </div>
                <button class="btn-remover-ex" title="Remover Exercício">✖</button>
            `;
            
            header.querySelector('.btn-remover-ex').addEventListener('click', () => {
                fichaAtual.exercicios.splice(indexExercicio, 1);
                salvarFichas();
                renderizarExercicios();
                verificarTreinoConcluido();
            });

            divExercicio.appendChild(header);

            const containerSeries = document.createElement('div');
            containerSeries.classList.add('series-container');

            exercicio.series.forEach((serieFeita, indexSerie) => {
                const box = document.createElement('div');
                box.classList.add('serie-linha');
                if (serieFeita) box.classList.add('concluida');
                
                box.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span class="serie-info">Série ${indexSerie + 1}</span>
                        <span class="serie-reps">Alvo: ${exercicio.repeticoes} Reps</span>
                    </div>
                    <span class="serie-status">${serieFeita ? '✅' : '⬜'}</span>
                `;

                box.addEventListener('click', () => {
                    fichaAtual.exercicios[indexExercicio].series[indexSerie] = !fichaAtual.exercicios[indexExercicio].series[indexSerie];
                    salvarFichas();
                    renderizarExercicios();
                    verificarTreinoConcluido();
                });

                containerSeries.appendChild(box);
            });
            divExercicio.appendChild(containerSeries);
            fichaTreino.appendChild(divExercicio);
        });
    }

    auditarOfensiva();
    const dataSalva = getLocal('treino_data_atual');
    const hojeStr = obterDataHojeStr();
    if (dataSalva && dataSalva !== hojeStr) {
        fichas.forEach(f => { f.exercicios.forEach(ex => ex.series = ex.series.map(() => false)); });
        salvarFichas();
    }

    renderizarListaFichas();
    atualizarDisplayStreak();

    setInterval(() => {
        const sentinelaHoje = obterDataHojeStr();
        const sentinelaSalva = getLocal('treino_data_atual');
        if (sentinelaSalva && sentinelaSalva !== sentinelaHoje) {
            auditarOfensiva(); 
            fichas.forEach(f => { f.exercicios.forEach(ex => ex.series = ex.series.map(() => false)); });
            salvarFichas();
            if (idFichaAtiva) {
                renderizarExercicios();
                verificarTreinoConcluido();
            }
            atualizarDisplayStreak();
        }
    }, 60000); 

    btnCriarFicha.addEventListener('click', () => {
        const nome = inputNomeNovaFicha.value.trim();
        if (nome === '') {
            alert("Por favor, dê um nome para a nova ficha.");
            return;
        }
        fichas.push({ id: Date.now(), nome: nome, exercicios: [] });
        salvarFichas();
        inputNomeNovaFicha.value = '';
        renderizarListaFichas();
    });

    btnVoltarFichas.addEventListener('click', voltarParaLista);

    btnAddExercicio.addEventListener('click', () => {
        if (!idFichaAtiva) return;
        const fichaAtual = fichas.find(f => f.id === idFichaAtiva);
        const nome = inputExercicio.value.trim();
        const series = parseInt(inputSeries.value);
        const reps = inputReps.value.trim() || 'N/A';
        const progressao = inputProgressao.checked;

        if (!nome || !series || series <= 0) {
            alert("Preencha o nome e a quantidade de séries válidas.");
            return;
        }
        fichaAtual.exercicios.push({
            nome: nome, repeticoes: reps, progressaoCarga: progressao, series: new Array(series).fill(false)
        });

        salvarFichas();
        renderizarExercicios();
        verificarTreinoConcluido();

        inputExercicio.value = ''; inputSeries.value = ''; inputReps.value = ''; inputProgressao.checked = false;
        inputExercicio.focus();
    });

    btnDesfazerTreino.addEventListener('click', () => {
        if (!idFichaAtiva) return;
        const fichaAtual = fichas.find(f => f.id === idFichaAtiva);
        if (fichaAtual.exercicios.length > 0) {
            fichaAtual.exercicios.pop(); 
            salvarFichas();
            renderizarExercicios();
            verificarTreinoConcluido(); 
        }
    });
}

// ==========================================
// 6. INICIALIZAÇÃO DO APLICATIVO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
});

// ==========================================
// 7. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(registration => {
            console.log('Service Worker registrado com sucesso no escopo:', registration.scope);
        })
        .catch(error => {
            console.log('Falha ao registrar o Service Worker:', error);
        });
    });
}