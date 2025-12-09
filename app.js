// ==========================================================
// CONFIGURAZIONE GLOBALE E STATO
// ==========================================================

const DATA_PATH = './final_dataset.json'; 
let dataset = null; 
let currentQuestionIndex = 0;
let userAnswers = {}; 
let userProfile = {}; 
const FALLBACK_AVG = 80.0; 

// NUOVI COLORI ARMONIZZATI CON IL CSS FUTURISTICO
const NEON_ACCENT = '#00ffe7'; 
const SECONDARY_PURPLE = '#9d00ff';
const SUCCESS_GREEN = '#00FF66';
const ERROR_RED = '#FF4500';
const TEXT_COLOR = '#e0e0e0';
const GRID_COLOR = 'rgba(0, 255, 231, 0.1)';


// Mappature AGGIORNATE per l'allineamento con le chiavi JSON ISTAT
const ageMap = {
    // Converte l'input numerico dell'età nella fascia di testo usata nel JSON.
    toKey: (age) => {
        // ISTAT utilizza 6 anni e più. Le fasce sono:
        if (age >= 6 && age <= 24) return '6-24 anni';
        if (age >= 25 && age <= 44) return '25-44 anni';
        if (age >= 45 && age <= 64) return '45-64 anni';
        if (age >= 65) return '65 anni e più';
        return null; // Caso fuori range (ad esempio, < 6)
    }
};

// Domande FOCUS DIGITAL GENDER GAP (Totale Punti: 100)
const quizQuestions = [
    { 
        id: 'q1_codice', 
        text: "Hai mai scritto o modificato una riga di codice (HTML, CSS, Python, ecc.) o usato piattaforme per l'automazione dei flussi di lavoro?", 
        points: 30,
        tip: "Questa è una competenza avanzata, spesso meno sviluppata tra le donne. Riguarda l'innovazione."
    },
    { 
        id: 'q2_pa', 
        text: "Hai utilizzato la tua identità digitale (SPID/CIE) per accedere a servizi complessi della Pubblica Amministrazione (es. Fascicolo Sanitario Elettronico, INPS)?", 
        points: 25,
        tip: "L'uso di servizi pubblici digitali avanzati è un indicatore DESI chiave."
    },
    { 
        id: 'q3_cybersecurity', 
        text: "Sai riconoscere e prevenire attivamente tentativi di phishing o truffe online e hai installato strumenti di protezione su almeno due dispositivi?", 
        points: 15,
        tip: "La sicurezza e la consapevolezza del rischio sono fondamentali per la fiducia digitale."
    },
    { 
        id: 'q4_e_commerce', 
        text: "Hai mai venduto o acquistato beni/servizi complessi online (es. investimenti, biglietti aerei, servizi professionali) tramite app o siti web?", 
        points: 15,
        tip: "L'uso di servizi finanziari o commerciali complessi è spesso disomogeneo per genere."
    },
    { 
        id: 'q5_carriera', 
        text: "Hai cercato informazioni attive su opportunità di carriera, formazione o istruzione in ambito ICT (Information and Communication Technology)?", 
        points: 15,
        tip: "L'interesse per il settore ICT è un prerequisito per colmare il divario di genere nel mondo del lavoro."
    }
];

// ==========================================================
// CONFIGURAZIONE CHART.JS E UI
// ==========================================================

let compareChartInstance = null;
let genderChartInstance = null;
let ageChartInstance = null;
let educationChartInstance = null;
let regionChartInstance = null;
let radarChartInstance = null; 

// Configurazione base per i grafici per il tema scuro
const CHART_CONFIG_BASE = {
    type: 'bar',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { 
                beginAtZero: true, 
                max: 100, 
                title: { display: true, text: 'Punteggio (%)', color: TEXT_COLOR },
                ticks: { color: TEXT_COLOR },
                grid: { color: GRID_COLOR }
            },
            x: { 
                grid: { display: false },
                ticks: { color: TEXT_COLOR }
            }
        },
        plugins: {
            legend: { position: 'top', labels: { color: TEXT_COLOR, font: { family: 'Roboto Mono' } } }, 
            tooltip: { 
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += context.parsed.y.toFixed(1) + '%';
                        return label;
                    }
                }
            },
            title: { 
                display: true, 
                text: 'Titolo Grafico', 
                color: NEON_ACCENT, 
                font: { family: 'Orbitron', size: 16 } 
            }
        },
        font: { family: 'Roboto Mono', size: 12, color: TEXT_COLOR }
    }
};

function createOrUpdateChart(canvasId, chartInstanceRef, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (chartInstanceRef) {
        chartInstanceRef.destroy();
    }
    
    // Aggiorna specificamente il titolo con il nuovo testo del grafico
    if (config.options && config.options.plugins && config.options.plugins.title) {
        config.options.plugins.title.text = config.titleText || 'Grafico';
    }

    return new Chart(ctx, config);
}

/ Renderizza i grafici statici della Dashboard comparativa (Gender, Age, Education, Region). */
function renderDashboardCharts() {
    if (!dataset || !dataset.averageScore) return; 

    const data = dataset;

    // 1. Grafico Genere (Gender Gap)
    genderChartInstance = createOrUpdateChart('genderChart', genderChartInstance, {
        ...CHART_CONFIG_BASE,
        // TITOLO CORRETTO: Divario di Genere
        titleText: 'Divario di Genere ISTAT', 
        data: {
            labels: ['Uomini', 'Donne', 'Totale'],
            datasets: [{
                label: 'Competenza Digitale Media ISTAT',
                data: [data.gender.Maschi, data.gender.Femmine, data.gender.Totale],
                backgroundColor: [NEON_ACCENT, SECONDARY_PURPLE, TEXT_COLOR], 
                borderWidth: 1
            }]
        },
        options: { ...CHART_CONFIG_BASE.options, plugins: { ...CHART_CONFIG_BASE.options.plugins, legend: { position: 'bottom', labels: { color: TEXT_COLOR } } } }
    });

    // 2. Grafico Età
    ageChartInstance = createOrUpdateChart('ageChart', ageChartInstance, {
        ...CHART_CONFIG_BASE,
        // TITOLO CORRETTO: Competenza per Età
        titleText: 'Competenza Digitale per Fascia d\'Età',
        data: {
            labels: Object.keys(data.age),
            datasets: [{
                label: 'Competenza Digitale Media ISTAT',
                data: Object.values(data.age),
                backgroundColor: SUCCESS_GREEN,
                borderWidth: 1
            }]
        },
        options: { ...CHART_CONFIG_BASE.options, plugins: { ...CHART_CONFIG_BASE.options.plugins, legend: { display: false } } }
    });

    // 3. Grafico Istruzione
    educationChartInstance = createOrUpdateChart('educationChart', educationChartInstance, {
        ...CHART_CONFIG_BASE,
        // TITOLO CORRETTO: Competenza per Istruzione
        titleText: 'Competenza Digitale per Istruzione',
        data: {
            labels: ['Basso (Nessun titolo / Elementare)', 'Medio (Licenza Media)', 'Avanzato (Diploma)', 'Alto (Laurea e Post-Laurea)'],
            datasets: [{
                label: 'Competenza Digitale Media ISTAT',
                data: [data.education.low_no, data.education.low, data.education.medium, data.education.high],
                backgroundColor: SECONDARY_PURPLE,
                borderWidth: 1
            }]
        },
        options: { ...CHART_CONFIG_BASE.options, plugins: { ...CHART_CONFIG_BASE.options.plugins, legend: { display: false } } }
    });
    
    // 4. Grafico Regione (Questo era corretto)
    const regionalLabels = Object.keys(data.region);
    const regionalData = Object.values(data.region);

    regionChartInstance = createOrUpdateChart('regionChart', regionChartInstance, {
        type: 'bar', 
        titleText: 'Competenza Digitale per Regione', // TITOLO CORRETTO
        data: {
            labels: regionalLabels,
            datasets: [{
                label: 'Competenza Digitale Media ISTAT',
                data: regionalData,
                backgroundColor: NEON_ACCENT,
                borderWidth: 1
            }]
        },
        // [Omesso il resto della configurazione per brevità]
        // ...
    });
}

// ... Resto del codice app.js ...

// ==========================================================
// GESTIONE QUIZ, PROFILO E RISULTATI
// ==========================================================

/ Carica il dataset JSON (Logica robusta per l'errore 0.0%) */
async function loadDataset() {
    try {
        const response = await fetch(DATA_PATH);
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}. Controlla che il file final_dataset.json sia nel percorso esatto: ${DATA_PATH}`);
        }
        dataset = await response.json();
        
        if (!dataset || !dataset.averageScore || Object.keys(dataset.gender).length < 2) {
             throw new Error("Il file final_dataset.json è incompleto o non contiene i dati benchmark necessari. Verifica i valori e le chiavi.");
        }
        
        console.log("Dataset ISTAT/DESI caricato con successo.", dataset);
        
        const heroButton = document.querySelector('.hero button');
        if (heroButton) {
            heroButton.textContent = 'Inizia la tua autovalutazione (Pronto)';
            heroButton.disabled = false;
        }

        renderDashboardCharts();

    } catch (error) {
        console.error("ERRORE CRITICO DI CARICAMENTO DATI:", error);
        
        const profileSection = document.getElementById('user-profile');
        if (profileSection) {
            profileSection.innerHTML = `<h2 style="color:red;">ERRORE FATALE: Dati non caricati.</h2>
                <p><strong>Motivo:</strong> ${error.message}. Per favore, controlla la console (F12) e verifica il contenuto di <strong>final_dataset.json</strong>.</p>`;
        }
        
        const heroButton = document.querySelector('.hero button');
        if (heroButton) {
            heroButton.textContent = 'Errore: Dati mancanti';
            heroButton.disabled = true;
        }
    }
}

/ Legge i dati dal form profilo e li valida. */
function readUserProfile() {
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value; 
    const education = document.getElementById('education').value; 
    const region = document.getElementById('region').value; 

    const ageKey = ageMap.toKey(age);

    if (!ageKey || !gender || !education || !region || isNaN(age)) {
        alert("Per favore, compila tutti i campi del profilo (età 6-65).");
        return false;
    }

    userProfile = { age, ageKey, gender, education, region };
    return true;
}

/ Avvia il quiz dopo la validazione del profilo. */
function startQuiz() {
    if (!dataset || !dataset.averageScore) {
        alert("Errore: I dati ISTAT non sono stati caricati correttamente. Controlla il percorso del file JSON.");
        return;
    }
    if (!readUserProfile()) return;

    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('quiz').style.display = 'block';

    currentQuestionIndex = 0;
    userAnswers = {};
    
    renderQuestion();
}

/ Renderizza la domanda corrente nell'HTML. */
function renderQuestion() {
    const q = quizQuestions[currentQuestionIndex];
    const quizCard = document.getElementById('quiz-card');
    
    if (!q) return;

    const prevAnswer = userAnswers[q.id];

    quizCard.innerHTML = `
        <div class="question-title" style="color:${NEON_ACCENT}; font-family:'Orbitron',sans-serif;">Domanda ${currentQuestionIndex + 1} di ${quizQuestions.length}</div>
        <p style="margin: 10px 0;"><strong>${q.text}</strong></p>
        <div class="tip" style="color:${SECONDARY_PURPLE}; font-size: 0.9em;">${q.tip}</div>
        <div class="radio-group" style="margin-top: 15px;">
            <input type="radio" id="${q.id}-yes" name="${q.id}" value="yes" ${prevAnswer === 'yes' ? 'checked' : ''} style="display: none;">
            <label for="${q.id}-yes" class="btn">Sì</label>
            <input type="radio" id="${q.id}-no" name="${q.id}" value="no" ${prevAnswer === 'no' ? 'checked' : ''} style="display: none;">
            <label for="${q.id}-no" class="btn">No</label>
        </div>
        <style>
             /* Stili dinamici per i radio button (se non definiti nel CSS esterno) */
            .radio-group label.btn {
                 background: rgba(20, 20, 40, 0.9);
                 color: ${TEXT_COLOR};
                 border: 1px solid rgba(0, 255, 231, 0.2);
                 box-shadow: none;
            }
            .radio-group input[type="radio"]:checked + label.btn {
                 background: ${NEON_ACCENT};
                 color: #000;
                 box-shadow: 0 0 10px ${NEON_ACCENT};
            }
        </style>
    `;

    // Nasconde o mostra i bottoni di navigazione in base alla posizione
    const prevBtn = document.querySelector('#quiz button:nth-child(1)');
    const nextBtn = document.querySelector('#quiz button:nth-child(2)');
    const submitBtn = document.getElementById('submitBtn');
    
    if (prevBtn) prevBtn.style.display = (currentQuestionIndex > 0) ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = (currentQuestionIndex < quizQuestions.length - 1) ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = (currentQuestionIndex === quizQuestions.length - 1) ? 'inline-block' : 'none';
}

/ Passa alla domanda precedente. */
function prevQ() {
    saveAnswer();
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

/ Passa alla domanda successiva. */
function nextQ() {
    if (!saveAnswer()) return;
    
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

/ Salva la risposta corrente nello stato (userAnswers). */
function saveAnswer() {
    const q = quizQuestions[currentQuestionIndex];
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    
    userAnswers[q.id] = selected ? selected.value : null;
    return true;
}

/ Finalizza il quiz, calcola il punteggio totale e mostra i risultati. */
function submitQuiz() {
    // Si assicura che l'ultima risposta venga salvata
    saveAnswer(); 

    let userScore = 0;
    
    quizQuestions.forEach(q => {
        if (userAnswers[q.id] === 'yes') {
            userScore += q.points;
        }
    });

    userScore = Math.min(100, Math.max(0, userScore)); 

    document.getElementById('quiz').style.display = 'none';
    document.getElementById('results').style.display = 'block';

    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

    renderResults(userScore);
}

/ Renderizza il grafico dei Risultati (Confronto Utente vs Benchmark e Radar Chart) */
function renderResults(userScore) {
    const data = dataset;
    
    const nationalAvg = data.averageScore || FALLBACK_AVG; 
    const desiScore = data.desiHumanCapitalScore || 45; 
    
    // Recupera i benchmark specifici
    const ageBenchmark = data.age[userProfile.ageKey] || nationalAvg;
    const genderBenchmark = data.gender[userProfile.gender] || nationalAvg;
    const educationBenchmark = data.education[userProfile.education] || nationalAvg;
    const regionBenchmark = data.region[userProfile.region] || nationalAvg;

    const scoreDisplay = userScore.toFixed(1);
    
    document.getElementById('resultPercent').textContent = `${scoreDisplay}%`;
    document.getElementById('profileLabel').textContent = `Profilo: ${userProfile.gender}, ${userProfile.ageKey} anni, ${userProfile.region}`;
    
    const progressBarElement = document.getElementById('progressBar');
    if (progressBarElement) {
        progressBarElement.style.width = `${scoreDisplay}%`;
        // Usa i colori del tema per il feedback visivo
        progressBarElement.style.background = userScore < nationalAvg ? ERROR_RED : SUCCESS_GREEN;
    }

    // --- Giustificazione Testuale ---
    let justification = `Livello di Competenza Digitale: ${scoreDisplay}% (Benchmark Nazionale ISTAT: ${nationalAvg.toFixed(1)}%).\n\n`;
    
    const difference = userScore - nationalAvg;
    
    if (difference >= 5) {
        justification += `⭐ ECCELLENTE: Sei significativamente al di sopra della media italiana. Hai dimostrato un'ottima padronanza delle competenze ICT. `;
    } else if (difference >= -5) {
        justification += `✅ NELLA MEDIA: Il tuo punteggio è in linea con i dati nazionali. `;
    } else {
        justification += `⚠️ MARGINE DI MIGLIORAMENTO: Il tuo punteggio è inferiore alla media nazionale. Concentrati sul rafforzamento delle tue abilità. `;
    }
    
    justification += `\n\nAnalisi del tuo profilo specifico (Gender Gap e Tendenze):\n`;
    
    const genderStatus = userScore > genderBenchmark ? 'superiore' : (userScore < genderBenchmark ? 'inferiore' : 'in linea');
    justification += `- Genere (${userProfile.gender}): Punteggio ${genderStatus} alla media del tuo genere (${genderBenchmark.toFixed(1)}%).\n`;

    const ageStatus = userScore > ageBenchmark ? 'superiore' : (userScore < ageBenchmark ? 'inferiore' : 'in linea');
    justification += `- Età (${userProfile.ageKey}): Punteggio ${ageStatus} alla media della tua fascia d'età (${ageBenchmark.toFixed(1)}%).\n`;

    const educationStatus = userScore > educationBenchmark ? 'superiore' : (userScore < educationBenchmark ? 'inferiore' : 'in linea');
    justification += `- Istruzione: Punteggio ${educationStatus} alla media del tuo livello di istruzione (${educationBenchmark.toFixed(1)}%).`;

    // --- Contesto DESI ---
    justification += `\n\nContesto Europeo (Indice DESI):\n`;
    justification += `L'Italia ha un punteggio DESI (Capitale Umano) di ${desiScore.toFixed(1)}/100, classificandosi tra le nazioni con divari di competenza. Il tuo percorso di miglioramento è cruciale per sollevare questo indicatore nazionale.`;

    document.getElementById('justificationText').innerHTML = justification.replace(/\n/g, '<br>'); 

    // Grafico di Confronto (Utente vs Benchmarks)
    const labels = ['Il tuo Punteggio', 'Media Nazionale', `Genere (${userProfile.gender})`, `Età (${userProfile.ageKey})`, `Regione (${userProfile.region})`];
    const userVsBenchmarks = [userScore, nationalAvg, genderBenchmark, ageBenchmark, regionBenchmark];
    
    compareChartInstance = createOrUpdateChart('compareChart', compareChartInstance, {
        ...CHART_CONFIG_BASE,
        titleText: 'Confronto Personale con i Dati ISTAT',
        data: {
            labels: labels,
            datasets: [{
                label: 'Punteggi (%)',
                data: userVsBenchmarks,
                backgroundColor: [
                    NEON_ACCENT, // Utente
                    SECONDARY_PURPLE, // Media Nazionale
                    '#FFD400', // Genere
                    SUCCESS_GREEN, // Età
                    '#00D4FF'  // Regione
                ],
                borderWidth: 1
            }]
        },
        options: { 
            ...CHART_CONFIG_BASE.options, 
            plugins: { ...CHART_CONFIG_BASE.options.plugins, legend: { display: false } } 
        }
    });

    // --- Radar Chart per le Aree di Competenza ---
    const skillScores = quizQuestions.map(q => {
        const achievedPoints = userAnswers[q.id] === 'yes' ? q.points : 0;
        return (achievedPoints / q.points) * 100; 
    });
    
    const skillLabels = quizQuestions.map(q => {
        return q.id.replace('q1_codice', 'Coding/Automazione')
                   .replace('q2_pa', 'Servizi PA Avanzati')
                   .replace('q3_cybersecurity', 'Cybersecurity')
                   .replace('q4_e_commerce', 'E-Commerce Complesso')
                   .replace('q5_carriera', 'Orientamento ICT');
    });

    const benchmarkTarget = skillScores.map(() => nationalAvg);

    radarChartInstance = createOrUpdateChart('radarChart', radarChartInstance, {
        type: 'radar',
        titleText: 'Dettaglio Competenze vs Target',
        data: {
            labels: skillLabels,
            datasets: [
                {
                    label: 'Il tuo Punteggio (%)',
                    data: skillScores,
                    backgroundColor: `rgba(0, 255, 231, 0.3)`, // NEON_ACCENT semi-trasparente
                    borderColor: NEON_ACCENT,
                    pointBackgroundColor: NEON_ACCENT,
                    borderWidth: 2
                },
                {
                    label: 'Media Nazionale ISTAT (Target)',
                    data: benchmarkTarget,
                    backgroundColor: `rgba(157, 0, 255, 0.2)`, // SECONDARY_PURPLE semi-trasparente
                    borderColor: SECONDARY_PURPLE,
                    pointBackgroundColor: SECONDARY_PURPLE,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: GRID_COLOR },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    pointLabels: { font: { size: 12, color: TEXT_COLOR, family: 'Roboto Mono' }, color: TEXT_COLOR },
                    ticks: {
                        backdropColor: 'rgba(20, 20, 40, 0.9)', // Sfondo card per i tick
                        color: TEXT_COLOR,
                        font: { size: 10 }
                    },
                    grid: { color: GRID_COLOR }
                }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: TEXT_COLOR } },
                title: { display: true, text: 'Dettaglio Competenze vs Target', color: NEON_ACCENT, font: { family: 'Orbitron', size: 16 } }
            }
        }
    });
    
    // Aggiungi la sezione suggerimenti (se non già aggiunta da un'esecuzione precedente)
    let suggestionsBlock = document.getElementById('feedbackSuggestions');
    if (!suggestionsBlock) {
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            // Creo il div dei suggerimenti
            suggestionsBlock = document.createElement('div');
            suggestionsBlock.id = 'feedbackSuggestions';
            suggestionsBlock.className = 'card';
            suggestionsBlock.style.marginTop = '24px';
            suggestionsBlock.innerHTML = `<h4>Prossimi Passi Consigliati</h4><ul id="suggestionsList"></ul>`;
            
            // Trovo il contenitore del file input per inserire i suggerimenti prima
            const fileInputCard = document.querySelector('#results .card:last-child');
            resultsSection.insertBefore(suggestionsBlock, fileInputCard);
        }
    }
    
    // --- Feedback Mirato (Inietta nella lista aggiornata) ---
    const suggestionsList = document.getElementById('suggestionsList');
    if(suggestionsList) suggestionsList.innerHTML = ''; 

    quizQuestions.forEach((q) => {
        if (userAnswers[q.id] === 'no') { 
            let suggestion = `<li style="list-style: none; margin-bottom: 10px; padding-left: 1.5em; position: relative;">`;
            suggestion += `<span style="position: absolute; left: 0; color: ${SUCCESS_GREEN}; font-size: 1.2em;">→</span>`; // Simbolo freccia verde
            suggestion += `Suggerimento: `;
            
            if (q.id === 'q1_codice') {
                suggestion += `Inizia con risorse gratuite come <a href="https://www.codecademy.com/" target="_blank" style="color:${SECONDARY_PURPLE};">Codecademy</a> o corsi base su <a href="https://www.edx.org/" target="_blank" style="color:${SECONDARY_PURPLE};">edX</a> per acquisire familiarità con HTML/CSS.`;
            } else if (q.id === 'q2_pa') {
                suggestion += `Visita il portale <a href="https://www.agid.gov.it/it/piattaforme/spid" target="_blank" style="color:${SECONDARY_PURPLE};">SPID/CIE</a> o il sito della tua Regione per familiarizzare con l'uso dei servizi digitali PA.`;
            } else if (q.id === 'q3_cybersecurity') {
                suggestion += `Segui i consigli dell'<a href="https://www.poliziadistato.it/articolo/cyber-security" target="_blank" style="color:${SECONDARY_PURPLE};">Agenzia per la Cybersicurezza Nazionale</a> e valuta l'installazione di un Password Manager.`;
            } else if (q.id === 'q4_e_commerce') {
                 suggestion += `Inizia ad usare servizi di pagamento digitali protetti come PayPal o app bancarie per aumentare la fiducia negli acquisti/vendite complesse online.`;
            } else if (q.id === 'q5_carriera') {
                 suggestion += `Esplora le opportunità di formazione finanziate dal PNRR per le competenze ICT o cerca webinar specifici nel settore.`;
            }
            suggestion += '</li>';
            if (suggestionsList) suggestionsList.innerHTML += suggestion;
        }
    });
    
    // Se non ci sono 'No', complimentati
    if (suggestionsList && suggestionsList.innerHTML === '') {
        suggestionsList.innerHTML = `<li style="list-style: none; color:${SUCCESS_GREEN};">Nessuna area critica riscontrata! Ottimo lavoro di autovalutazione. Il tuo profilo è digitale e completo.</li>`;
    }
}

/ Gestisce il caricamento dei file (funzionalità non implementata in app.js) */
function handleFiles(event) {
    const files = event.target.files;
    const fileListDiv = document.getElementById('fileList');
    
    if (files.length > 0) {
        fileListDiv.innerHTML = `File caricati (solo demo):<ul>${Array.from(files).map(f => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('')}</ul>`;
        console.warn("Funzionalità di elaborazione CSV avanzata non implementata: I dati mostrati si basano su final_dataset.json.");
    } else {
         fileListDiv.textContent = 'Nessun file caricato';
    }
}

// ==========================================================
// AVVIO
// ==========================================================

document.addEventListener('DOMContentLoaded', loadDataset);

// Rendi le funzioni di navigazione globalmente disponibili
window.startQuiz = startQuiz;
window.prevQ = prevQ;
window.nextQ = nextQ;
window.submitQuiz = submitQuiz;
window.handleFiles = handleFiles;

// Nasconde le sezioni all'avvio
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('results').style.display = 'none';
});