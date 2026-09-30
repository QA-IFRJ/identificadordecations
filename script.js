// script.js
// Identificador de Cátions
// Primeira versão: matriz de possibilidades, sem exibição das justificativas de eliminação.

const elIdentify = document.getElementById("identify");
const elClear = document.getElementById("clear");
const elUniverse = document.getElementById("universe");
const elFinal = document.getElementById("final-matrix");
const elThemeToggle = document.getElementById("theme-toggle");
const selectAllBtn = document.getElementById("select-all");
const clearAllBtn = document.getElementById("clear-all");

function normalize(s){
  if(s === undefined || s === null) return "";
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu,"");
}

function compact(s){
  return normalize(s).replace(/\s+/g,"");
}

/*
  Normalização dos resultados experimentais.
  "Amostra branca gelatinosa" é tratada como "ppt branco",
  conforme definido para o projeto.
*/
function normalizePrecipitate(value){
  let v = compact(value);

  if(!v) return "";

  if(
    v.includes("naoprecipita") ||
    v === "naoppt" ||
    v === "naoprecipitou"
  ){
    return "nao precipita";
  }

  if(v.includes("brancogelatinos")){
    return "ppt branco";
  }

  if(v.includes("pptbranco")){
    return "ppt branco";
  }

  if(v.includes("pptpreto")){
    return "ppt preto";
  }

  if(v.includes("pptmarrom") || v.includes("pptcastanho")){
    return "ppt marrom";
  }

  if(v.includes("pptlaranja")){
    return "ppt laranja";
  }

  if(v.includes("pptverde")){
    return "ppt verde";
  }

  if(v.includes("pptazul")){
    return "ppt azul";
  }

  if(v.includes("pptamarelo")){
    return "ppt amarelo";
  }

  if(v.includes("pptvermelho")){
    return "ppt vermelho";
  }

  if(v.includes("pptbege")){
    return "ppt bege";
  }

  // Alguns dados da tabela podem estar registrados apenas pela cor
  // (ex.: "amarelo"). Em ensaios de precipitação, tratar essas entradas
  // como precipitados da respectiva cor.
  const bareColors = ["branco","preto","marrom","castanho","laranja","verde","azul","amarelo","vermelho","rosa","bege"];
  if(bareColors.includes(v)){
    return `ppt ${v === "castanho" ? "marrom" : v}`;
  }

  return normalize(value);
}

/*
  Cor da solução.
  O Cu²⁺ é considerado VERDE no banco de dados, conforme definido no projeto.
*/
function normalizeSolutionColor(value){
  const v = normalize(value);

  if(v === "azul-esverdeado" || v === "azulesverdeado" || v === "azul esverdeado"){
    return "verde";
  }

  return v;
}

/*
  Regras de eliminação por COR DA SOLUÇÃO:

  Incolor -> elimina coloridos.
  Amarelo -> elimina laranja, verde, azul e rosa.
  Laranja -> elimina verde, azul e rosa.
  Verde -> elimina laranja e rosa.
  Azul -> elimina verde, laranja, amarelo e rosa.
  Rosa -> elimina azul, verde, laranja e amarelo.

  Cores primárias/secundárias são consideradas somente conforme
  as relações definidas para este projeto.
*/
function colorEliminates(sampleColor, ionColor){
  const sample = normalizeSolutionColor(sampleColor);
  const ion = normalizeSolutionColor(ionColor);

  if(!sample || !ion) return false;
  if(sample === ion) return false;

  if(sample === "incolor"){
    return ion !== "incolor";
  }

  const rules = {
    "amarelo":["laranja","verde","azul","rosa"],
    "laranja":["verde","azul","rosa"],
    "verde":["laranja","rosa"],
    "azul":["verde","laranja","amarelo","rosa"],
    "rosa":["azul","verde","laranja","amarelo"]
  };

  return (rules[sample] || []).includes(ion);
}

/*
  Regras de eliminação por PRECIPITAÇÃO:

  Não precipita -> elimina os que precipitam.
  Ppt preto -> não elimina ninguém.
  Ppt marrom -> não elimina ninguém.
  Ppt branco -> elimina coloridos, mas não elimina os que não precipitam.
  Ppt laranja -> elimina preto/marrom, verde e azul.
  Ppt verde -> elimina preto/marrom e laranja.
  Ppt azul -> elimina preto/marrom, amarelo, verde e laranja.
  Ppt amarelo -> elimina preto/marrom, laranja, verde e azul.

  Regra geral: nenhum precipitado elimina um cátion que NÃO precipita.
*/
function precipitateEliminates(sampleResult, ionResult){
  const sample = normalizePrecipitate(sampleResult);
  const ion = normalizePrecipitate(ionResult);

  if(!sample || !ion) return false;

  if(sample === "nao precipita"){
    return ion !== "nao precipita";
  }

  if(ion === "nao precipita"){
    return false;
  }

  if(sample === "ppt preto") return false;
  if(sample === "ppt marrom") return false;

  if(sample === "ppt branco"){
    // Branco elimina qualquer precipitado de outra cor.
    // A proteção acima garante que quem NÃO precipita nunca seja eliminado.
    return ion !== "ppt branco";
  }

  if(sample === "ppt laranja"){
    return ["ppt preto","ppt marrom","ppt verde","ppt azul"].includes(ion);
  }

  if(sample === "ppt verde"){
    return ["ppt preto","ppt marrom","ppt laranja"].includes(ion);
  }

  if(sample === "ppt azul"){
    return ["ppt preto","ppt marrom","ppt amarelo","ppt verde","ppt laranja"].includes(ion);
  }

  if(sample === "ppt amarelo"){
    return ["ppt preto","ppt marrom","ppt laranja","ppt verde","ppt azul"].includes(ion);
  }

  // Não foi definida regra específica para outras cores de precipitado.
  return false;
}

function getSelectedUniverse(){
  const checked = [...document.querySelectorAll(".grp:checked")].map(x => x.value);
  const groups = window.CATION_GROUPS || {};
  let universe = [];

  checked.forEach(groupKey => {
    if(groups[groupKey]){
      universe = universe.concat(groups[groupKey]);
    }
  });

  return [...new Set(universe)];
}

function evaluateCation(cationKey, cationData, user){
  let eliminated = false;

  // COR DA SOLUÇÃO
  if(colorEliminates(user.color, cationData.cor)){
    eliminated = true;
  }

  if(!eliminated){
    const tests = ["HCl","NH4OH","S2","NaOH","aquecimento","SO4"];

    for(const test of tests){
      if(precipitateEliminates(user[test], cationData[test])){
        eliminated = true;
        break;
      }
    }
  }

  return {eliminated};
}

function analyzeUniverse(universeKeys, userInput){
  const survivors = [];

  universeKeys.forEach(key => {
    const data = window.CATION_DATA[key];
    if(!data) return;

    const result = evaluateCation(key, data, userInput);

    if(!result.eliminated){
      survivors.push(key);
    }
  });

  return {survivors};
}

function renderMatrix(survivors){
  if(!survivors.length){
    elFinal.textContent = "Nenhum cátion compatível.";
    return;
  }

  elFinal.innerHTML = `
    <div class="matrix-grid">
      ${survivors.map(cation => `<div class="cation-item">${cation}</div>`).join("")}
    </div>
  `;
}

function applyTheme(theme){
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  elThemeToggle.textContent = isDark ? "☀️" : "🌙";
  elThemeToggle.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo noturno");
  elThemeToggle.setAttribute("aria-pressed", String(isDark));
}

// Modo noturno: aplica o estado salvo e permite alternar pelo botão.
const savedTheme = localStorage.getItem("identificador-cations-theme");
applyTheme(savedTheme === "dark" ? "dark" : "light");

elThemeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark ? "dark" : "light");
  localStorage.setItem("identificador-cations-theme", isDark ? "dark" : "light");
});

selectAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".grp").forEach(c => c.checked = true);
});

clearAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".grp").forEach(c => c.checked = false);
});

elIdentify.addEventListener("click", () => {
  const universe = getSelectedUniverse();

  if(universe.length === 0){
    alert("Selecione ao menos um grupo.");
    return;
  }

  const userInput = {
    color: document.getElementById("color").value,
    HCl: document.getElementById("HCl").value,
    NH4OH: document.getElementById("NH4OH").value,
    S2: document.getElementById("S2").value,
    NaOH: document.getElementById("NaOH").value,
    aquecimento: document.getElementById("aquecimento").value,
    SO4: document.getElementById("SO4").value
  };

  elUniverse.textContent = universe.join(", ");

  const {survivors} = analyzeUniverse(universe, userInput);
  renderMatrix(survivors);
});

elClear.addEventListener("click", () => {
  ["color","HCl","NH4OH","S2","NaOH","aquecimento","SO4"].forEach(id => {
    document.getElementById(id).value = "";
  });

  document.querySelectorAll(".grp").forEach(c => c.checked = false);

  elUniverse.textContent = "(nenhuma seleção)";
  elFinal.textContent = "(nenhuma análise)";
});
