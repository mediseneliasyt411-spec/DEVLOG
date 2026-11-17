/* DEVLOG 2.0 - núcleo funcional
   Mantiene los IDs y el almacenamiento de la versión actual.
   JavaScript se ejecuta en un iframe sandbox; otros lenguajes requieren backend.
*/
"use strict";

const STORAGE_KEYS = {
  projects: "devlog_projects_v2",
  notes: "devlog_notes_v2",
  lessons: "devlog_lessons_v2",
  activity: "devlog_activity_v2",
  spotify: "devlog_spotify_v2",
  tutorCode: "devlog_tutor_code_v2"
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function loadData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn("No se pudo leer", key, error);
    return fallback;
  }
}
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar. Comprueba el almacenamiento disponible del navegador.");
    return false;
  }
}
function id() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function dateNow() {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

let projects = loadData(STORAGE_KEYS.projects);
let notes = loadData(STORAGE_KEYS.notes);
let lessons = loadData(STORAGE_KEYS.lessons);
let activity = loadData(STORAGE_KEYS.activity);
let savedSpotify = loadData(STORAGE_KEYS.spotify, "");
let editingProjectId = null;
let editingNoteId = null;

function record(message) {
  activity.unshift({ id: id(), message, date: dateNow() });
  activity = activity.slice(0, 8);
  saveData(STORAGE_KEYS.activity, activity);
  renderActivity();
}
function empty(message) {
  return `<div class="empty-state">${safe(message)}</div>`;
}

/* Navegación */
const pageNames = {
  dashboard: "Dashboard", projects: "Proyectos", academy: "Academy",
  tutor: "Code Tutor", music: "Music", journal: "Bitácora"
};
function navigateTo(name) {
  if (!pageNames[name]) return;
  $$(".view").forEach(v => v.classList.toggle("active", v.id === name));
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("#pageTitle").textContent = pageNames[name];
  $("#sidebar")?.classList.remove("open");
  if (name === "dashboard") renderDashboard();
}
$$(".nav-item").forEach(b => b.addEventListener("click", () => navigateTo(b.dataset.view)));
$$("[data-go]").forEach(b => b.addEventListener("click", () => navigateTo(b.dataset.go)));
$("#menuButton")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));

/* Dashboard */
function renderActivity() {
  const box = $("#recentActivity");
  if (!box) return;
  box.innerHTML = activity.length ? activity.map(item => `
    <div class="activity-item" style="padding:12px 4px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:12px">
      <span>${safe(item.message)}</span><small class="muted">${safe(item.date)}</small>
    </div>`).join("") : empty("Todavía no hay actividad. ¡Comienza creando un proyecto!");
}
function renderDashboard() {
  $("#statProjects").textContent = projects.length;
  $("#statNotes").textContent = notes.length;
  $("#statLessons").textContent = lessons.length;
  renderActivity();
}

/* Proyectos: abrir, editar, guardar y ejecutar JS */
function ensureProjectEditor() {
  if ($("#projectWorkbench")) return;
  const host = document.createElement("section");
  host.id = "projectWorkbench";
  host.className = "editor-panel project-workbench";
  host.hidden = true;
  host.innerHTML = `
    <div class="editor-toolbar">
      <div class="editor-file"><span class="file-dot"></span><span id="workbenchTitle">Proyecto</span></div>
      <span class="muted" id="workbenchTech">Editor local</span>
    </div>
    <div class="workbench-meta">
      <label>Descripción del archivo
        <input id="workbenchFile" type="text" value="main.js" maxlength="80">
      </label>
    </div>
    <textarea id="projectCode" class="code-editor" spellcheck="false" aria-label="Código del proyecto"></textarea>
    <div class="editor-actions">
      <button class="primary-button" id="saveProjectCode" type="button">Guardar código</button>
      <button class="secondary-button" id="runProjectCode" type="button">Ejecutar JavaScript</button>
      <button class="secondary-button" id="closeProjectEditor" type="button">Cerrar editor</button>
    </div>
    <div class="console-panel"><div class="console-title">CONSOLA DEL PROYECTO</div><pre id="projectOutput">Abre un proyecto para comenzar.</pre></div>`;
  $("#projectList").insertAdjacentElement("afterend", host);
  $("#saveProjectCode").addEventListener("click", saveProjectCode);
  $("#runProjectCode").textContent = "Analizar código";
  $("#runProjectCode").addEventListener("click", () => {
    const p = projects.find(x => x.id === editingProjectId);
    if (!p) { $("#projectOutput").textContent = "Abre un proyecto primero."; return; }
    showAnalysis($("#projectCode").value, normalizedTech(p.tech), $("#projectOutput"), $("#consoleStatus") || {set textContent(v){}});
    record(`Analizaste código en: ${p.name}`);
  });
  $("#closeProjectEditor").addEventListener("click", () => { host.hidden = true; editingProjectId = null; });
}
function defaultFileName(tech) {
  return ({ "Python": "main.py", "Java": "Main.java", "C++": "main.cpp", "HTML / CSS": "index.html", "JavaScript": "main.js" })[tech] || "main.js";
}
function normalizedTech(value) {
  const allowed = ["Java", "Python", "C++", "HTML / CSS", "JavaScript"];
  return allowed.includes(value) ? value : "JavaScript";
}
function starterCode(tech) {
  if (tech === "Python") return '# Escribe tu programa Python aquí\nprint("Hola, DEVLOG")';
  if (tech === "Java") return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola, DEVLOG");\n    }\n}';
  if (tech === "C++") return '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hola, DEVLOG" << endl;\n    return 0;\n}';
  if (tech === "HTML / CSS") return '<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><title>Mi proyecto</title></head>\n<body><h1>Hola, DEVLOG</h1></body>\n</html>';
  return 'const mensaje = "Hola, DEVLOG";\nconsole.log(mensaje);';
}
function renderProjects() {
  const box = $("#projectList");
  $("#projectCount").textContent = `${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`;
  box.innerHTML = projects.length ? projects.map(p => `
    <article class="project-card" data-project-card="${safe(p.id)}" data-project-tech="${safe(normalizedTech(p.tech))}">
      <span class="project-meta">${safe(normalizedTech(p.tech))}</span>
      <h3>${safe(p.name)}</h3><p>${safe(p.description || "Sin descripción.")}</p>
      <div class="project-footer">
        <small class="muted">${safe(p.date || "")}</small>
        <div class="project-actions">
          <button class="secondary-button" type="button" data-open-project="${safe(p.id)}">Abrir</button>
          <button class="delete-button" type="button" data-delete-project="${safe(p.id)}">Eliminar</button>
        </div>
      </div>
    </article>`).join("") : empty("Aún no tienes proyectos. Crea el primero usando el formulario.");
}
$("#projectForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#projectName").value.trim();
  if (!name) return;
  const project = {
    id: id(), name, tech: $("#projectTech").value,
    description: $("#projectDescription").value.trim(),
    date: dateNow(), code: starterCode($("#projectTech").value), fileName: defaultFileName($("#projectTech").value)
  };
  projects.unshift(project);
  if (!saveData(STORAGE_KEYS.projects, projects)) { projects.shift(); return; }
  e.target.reset();
  record(`Creaste el proyecto: ${name}`);
  renderProjects(); renderDashboard();
});
function openProject(projectId, cardTech = null) {
  const p = projects.find(x => String(x.id) === String(projectId));
  if (!p) return;
  ensureProjectEditor();
  editingProjectId = p.id;
  const tech = normalizedTech(cardTech || p.tech);
  if (p.tech !== tech) { p.tech = tech; saveData(STORAGE_KEYS.projects, projects); }
  $("#workbenchTitle").textContent = p.name;
  $("#workbenchTech").textContent = `${tech} · Guardado local`;
  const expectedFile = defaultFileName(tech);
  const currentFile = String(p.fileName || "");
  const expectedExt = expectedFile.split(".").pop();
  const currentExt = currentFile.includes(".") ? currentFile.split(".").pop() : "";
  $("#workbenchFile").value = currentExt === expectedExt ? currentFile : expectedFile;
  $("#projectCode").value = p.code ?? starterCode(tech);
  $("#projectWorkbench").hidden = false;
  const runButton = $("#runProjectCode");
  if (runButton) runButton.disabled = tech !== "JavaScript";
  $("#projectOutput").textContent = tech === "JavaScript"
    ? "Código cargado. Puedes ejecutarlo o guardarlo."
    : `Código ${tech} cargado. Puedes editarlo y guardarlo; para ejecutarlo hace falta un compilador/backend.`;
  $("#projectWorkbench").scrollIntoView({ behavior: "smooth", block: "start" });
}
function saveProjectCode() {
  const p = projects.find(x => x.id === editingProjectId);
  if (!p) return;
  p.code = $("#projectCode").value;
  p.fileName = $("#workbenchFile").value.trim() || defaultFileName(p.tech);
  if (saveData(STORAGE_KEYS.projects, projects)) {
    $("#projectOutput").textContent = "✓ Código guardado en este navegador.";
    record(`Guardaste código en: ${p.name}`);
  }
}
$("#projectList").addEventListener("click", e => {
  const open = e.target.closest("[data-open-project]");
  const del = e.target.closest("[data-delete-project]");
  if (open) {
    const card = open.closest("[data-project-card]");
    openProject(open.dataset.openProject, card?.dataset.projectTech || null);
  }
  if (del) {
    const p = projects.find(x => x.id === del.dataset.deleteProject);
    if (!p || !confirm(`¿Eliminar el proyecto "${p.name}"?`)) return;
    projects = projects.filter(x => x.id !== p.id);
    if (!saveData(STORAGE_KEYS.projects, projects)) return;
    if (editingProjectId === p.id) $("#projectWorkbench").hidden = true;
    record(`Eliminaste el proyecto: ${p.name}`);
    renderProjects(); renderDashboard();
  }
});

/* Ejecución aislada: solo JavaScript. El iframe no recibe acceso al DOM principal. */
function runInSandbox(source, output) {
  output.textContent = "Ejecutando…";
  output.style.color = "var(--green)";
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.hidden = true;
  const token = id();
  let finished = false;
  const finish = (message, color = "var(--green)") => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    window.removeEventListener("message", onMessage);
    frame.remove();
    output.textContent = message;
    output.style.color = color;
  };
  const onMessage = event => {
    if (event.source !== frame.contentWindow || !event.data || event.data.token !== token) return;
    if (event.data.type === "result") finish(event.data.lines.join("\n") || "✓ Ejecutado sin mensajes de consola.");
    if (event.data.type === "error") finish(`Error: ${event.data.message}`, "var(--orange)");
  };
  window.addEventListener("message", onMessage);
  const timer = setTimeout(() => finish("Tiempo límite alcanzado (2 segundos).", "var(--orange)"), 2000);
  const safeSource = JSON.stringify(source);
  frame.srcdoc = `<!doctype html><meta charset="utf-8"><script>
    const token=${JSON.stringify(token)};
    const lines=[];
    const clean=v=>{try{return typeof v==="string"?v:JSON.stringify(v)}catch{return String(v)}};
    const original=console.log;
    console.log=(...args)=>lines.push(args.map(clean).join(" "));
    console.info=(...args)=>lines.push(args.map(clean).join(" "));
    console.warn=(...args)=>lines.push("Aviso: "+args.map(clean).join(" "));
    try {
      (new Function(${safeSource}))();
      parent.postMessage({token,type:"result",lines},"*");
    } catch(error) {
      parent.postMessage({token,type:"error",message:error.message},"*");
    }
  <\/script>`;
  document.body.appendChild(frame);
}
function inspectJavaScript(source) {
  const problems = [];
  if (!source.trim()) return ["El editor está vacío. Escribe código para revisarlo."];
  try { new Function(source); }
  catch (error) { problems.push(`Error de sintaxis: ${error.message}`); }
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  let quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && n === "/") { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && n === "/") { lineComment = true; i++; continue; }
    if (c === "/" && n === "*") { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (pairs[c]) stack.push({ c, i });
    else if ([")", "]", "}"].includes(c)) {
      const last = stack.pop();
      if (!last || pairs[last.c] !== c) problems.push(`Cierre inesperado "${c}" en posición ${i + 1}.`);
    }
  }
  if (quote) problems.push("Hay una cadena sin cerrar.");
  if (blockComment) problems.push("Hay un comentario /* sin cerrar.");
  if (stack.length) problems.push("Hay paréntesis, corchetes o llaves sin cerrar.");
  if (!problems.length) problems.push("✓ Sintaxis básica correcta. Esto no garantiza que el programa esté libre de errores.");
  return problems;
}


function analyzeSource(source, tech) {
  const code = String(source || "");
  const lang = String(tech || "JavaScript");
  const lines = code.split(/\r?\n/);
  const found = [];
  const add = (level, line, title, why, fix, replacement = "") =>
    found.push({level, line, title, why, fix, replacement});
  if (!code.trim()) add("warning", 1, "Código vacío", "No hay instrucciones para revisar.", "Escribe código y vuelve a analizar.");
  if (lang === "JavaScript") {
    try { new Function(code); }
    catch (e) {
      const m = String(e.message || e);
      add("error", 1, "Error de sintaxis", m, "Revisa paréntesis, llaves, comillas y la estructura indicada.");
    }
  } else if (lang === "Python") {
    lines.forEach((raw, i) => {
      const s = raw.trim();
      if (!s || s.startsWith("#")) return;
      if (/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(s) && !s.endsWith(":"))
        add("error", i+1, "Faltan dos puntos", "Esta instrucción de Python debe terminar con dos puntos (:).", "Agrega : al final de la instrucción.", raw.replace(/\s*$/, "") + ":");
      if (/\b(true|false|null)\b/.test(s))
        add("error", i+1, "Literal incorrecto", "Python distingue mayúsculas en True, False y None.", "Usa True, False o None según corresponda.");
      if (/^print\s+["']/.test(s))
        add("error", i+1, "Sintaxis de print", "En Python 3, print se utiliza como función.", "Usa print(\"texto\").");
      if (/\t/.test(raw) && /^ +/.test(raw))
        add("warning", i+1, "Indentación mezclada", "La línea combina tabuladores y espacios.", "Utiliza una indentación consistente, preferentemente cuatro espacios.");
    });
  } else if (lang === "Java" || lang === "C++") {
    let stack = [];
    let quote = "", escaped = false;
    const pairs = {"(":")","[":"]","{":"}"};
    lines.forEach((raw, i) => {
      const s = raw.trim();
      if (!s || s.startsWith("//") || s.startsWith("#")) return;
      for (let j=0;j<raw.length;j++) {
        const c=raw[j];
        if (quote) { if (escaped) escaped=false; else if (c==="\\") escaped=true; else if (c===quote) quote=""; continue; }
        if (c==="'" || c==='"') { quote=c; continue; }
        if (pairs[c]) stack.push({c,line:i+1});
        else if ([")","]","}"].includes(c)) {
          const last=stack.pop();
          if (!last || pairs[last.c]!==c) add("error",i+1,"Cierre no coincidente",`El símbolo ${c} no coincide con una apertura.`,`Revisa los delimitadores de esta línea.`);
        }
      }
      const control = /^(if|else|for|while|switch|try|catch|do)\b/.test(s);
      const declaration = /^(return|throw|break|continue|System\.out\.|cout\s*<<|int\s+\w+\s*=|double\s+\w+\s*=|String\s+\w+\s*=)/.test(s);
      if (!control && declaration && !/[;{}]$/.test(s))
        add("warning",i+1,"Posible punto y coma faltante","Esta instrucción normalmente termina con ;.","Agrega punto y coma al final.",raw.replace(/\s*$/, "")+";");
      if (lang==="Java" && /\bString\s+\w+\s*=\s*'[^']*'/.test(s))
        add("error",i+1,"Comillas incorrectas","Los textos String en Java usan comillas dobles.","Cambia las comillas simples por dobles.");
    });
    stack.forEach(x=>add("error",x.line,"Delimitador sin cerrar",`Falta cerrar ${pairs[x.c]}.`,`Agrega el delimitador de cierre correspondiente.`));
    if (lang==="Java" && code.trim() && !/\bclass\s+\w+/.test(code))
      add("warning",1,"No se detectó una clase","Una aplicación Java normalmente declara una clase.","Comprueba que el archivo contenga una clase.");
    if (lang==="C++" && code.trim() && !/\bmain\s*\(/.test(code))
      add("warning",1,"No se detectó main","No se encontró la función de entrada habitual.","Agrega int main() si este archivo es un programa ejecutable.");
  } else if (lang === "HTML / CSS" || lang === "HTML") {
    const voids = new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
    const stack = [];
    const rx = /<\/?([a-z][\w-]*)\b[^>]*>/gi; let m;
    while ((m=rx.exec(code))) {
      const tag=m[1].toLowerCase(), closing=m[0].startsWith("</"), self=/\/>$/.test(m[0]);
      const line=code.slice(0,m.index).split(/\r?\n/).length;
      if (voids.has(tag)||self) continue;
      if (!closing) stack.push({tag,line});
      else {
        const last=stack.pop();
        if (!last || last.tag!==tag) add("warning",line,"Cierre de etiqueta dudoso",`La etiqueta </${tag}> no coincide con la última etiqueta abierta.`,`Revisa el orden de las etiquetas.`);
      }
    }
    stack.forEach(x=>add("warning",x.line,"Etiqueta sin cerrar",`Falta revisar el cierre de <${x.tag}>.`,`Agrega </${x.tag}> donde corresponda.`));
  } else if (lang === "CSS") {
    let depth=0;
    lines.forEach((raw,i)=>{
      const s=raw.trim();
      for (const c of s) { if(c==="{") depth++; if(c==="}") depth--; }
      if (s.includes(":") && !s.startsWith("/*") && !/[;{}]$/.test(s) && !s.endsWith("*/"))
        add("warning",i+1,"Posible ; faltante","Una declaración CSS suele terminar con punto y coma.","Agrega ; al final.",raw.replace(/\s*$/,"")+";");
      if (depth<0) { add("error",i+1,"Llave de cierre inesperada","Hay una } sin una apertura previa.","Revisa las llaves del bloque CSS."); depth=0; }
    });
    if(depth>0) add("error",lines.length,"Falta cerrar un bloque CSS","Hay una llave { sin pareja.","Agrega } al final del bloque.");
  }
  if (!found.length) found.push({level:"success",line:0,title:"Sin problemas detectados",why:"El análisis básico no encontró errores conocidos.",fix:"Esto no garantiza que el programa esté libre de errores lógicos. Revisa también su comportamiento y requisitos."});
  return found;
}
function showAnalysis(source, tech, output, status) {
  const results = analyzeSource(source, tech);
  output.textContent = results.map(x =>
    `[${x.level.toUpperCase()}] ${x.line ? "Línea "+x.line : "Resultado"} · ${x.title}\n${x.why}\nSugerencia: ${x.fix}${x.replacement ? "\nCorrección propuesta: "+x.replacement : ""}`
  ).join("\n\n");
  output.style.color = results.some(x=>x.level==="error") ? "var(--orange)" : "var(--green)";
  status.textContent = `${results.filter(x=>x.level==="error").length} errores · ${results.filter(x=>x.level==="warning").length} advertencias`;
  return results;
}

/* Code Tutor */
if ($("#codeEditor")) {
  const saved = loadData(STORAGE_KEYS.tutorCode, null);
  if (saved !== null) $("#codeEditor").value = saved;
  const actions = $(".editor-actions", $("#tutor"));
  if (actions && !$("#runTutorCode")) {
    const run = document.createElement("button");
    run.id = "runTutorCode"; run.type = "button";
    run.className = "primary-button"; run.textContent = "Analizar código";
    actions.insertBefore(run, $("#clearCode"));
    run.addEventListener("click", () => {
      showAnalysis($("#codeEditor").value, "JavaScript", $("#codeOutput"), $("#tutorStatus") || {set textContent(v){}});
      record("Analizaste código en Code Tutor");
    });
  }
  $("#codeEditor").addEventListener("input", () => saveData(STORAGE_KEYS.tutorCode, $("#codeEditor").value));
  $("#checkCode").addEventListener("click", () => {
    const results = inspectJavaScript($("#codeEditor").value);
    $("#codeOutput").textContent = results.join("\n");
    $("#codeOutput").style.color = results[0].startsWith("✓") ? "var(--green)" : "var(--orange)";
    record("Revisaste código en Code Tutor");
  });
  $("#clearCode").addEventListener("click", () => {
    if (!confirm("¿Limpiar todo el editor?")) return;
    $("#codeEditor").value = "";
    saveData(STORAGE_KEYS.tutorCode, "");
    $("#codeOutput").textContent = "Editor limpio.";
  });
}

/* Academy: progreso persistente y contenido de estudio */
const courseLessons = {
  java: ["Variables y tipos de datos", "Condicionales if / switch", "Ciclos for y while", "Clases y objetos"],
  python: ["Variables e impresión", "Condicionales", "Listas y diccionarios", "Funciones"],
  web: ["Estructura HTML", "Selectores CSS", "Variables y funciones JS", "Eventos del navegador"],
  cpp: ["Tipos de datos", "Entrada y salida", "Condicionales y ciclos", "Funciones y arreglos"]
};
const lessonDetails = {
 java:[
 ["Variables y tipos de datos","Una variable almacena un valor. Java exige declarar el tipo de dato.","int edad = 20;\nString nombre = \"Ana\";\ndouble promedio = 9.5;"],
 ["Condicionales if / switch","Permiten tomar decisiones según una condición.","if (edad >= 18) {\n  System.out.println(\"Mayor de edad\");\n} else {\n  System.out.println(\"Menor de edad\");\n}"],
 ["Ciclos for y while","Repiten instrucciones mientras se cumpla una condición.","for (int i = 1; i <= 5; i++) {\n  System.out.println(i);\n}"],
 ["Clases y objetos","Una clase define atributos y métodos; un objeto es una instancia.","class Persona {\n  String nombre;\n  void saludar() { System.out.println(\"Hola \" + nombre); }\n}"]],
 python:[
 ["Variables e impresión","Python infiere el tipo de dato. print() muestra información.","nombre = \"Ana\"\nedad = 20\nprint(nombre, edad)"],
 ["Condicionales","if, elif y else permiten tomar decisiones. La indentación define los bloques.","if edad >= 18:\n    print(\"Mayor\")\nelse:\n    print(\"Menor\")"],
 ["Listas y diccionarios","Las listas guardan colecciones; los diccionarios relacionan claves y valores.","frutas = [\"pera\", \"uva\"]\npersona = {\"nombre\": \"Ana\"}\nprint(frutas[0], persona[\"nombre\"])"],
 ["Funciones","Una función agrupa instrucciones reutilizables.","def sumar(a, b):\n    return a + b\n\nprint(sumar(3, 4))"]],
 web:[
 ["Estructura HTML","HTML organiza el contenido mediante etiquetas.","<h1>Mi página</h1>\n<p>Bienvenido.</p>"],
 ["Selectores CSS","Los selectores eligen los elementos a los que se aplican estilos.","h1 { color: rebeccapurple; }\n.card { padding: 16px; }"],
 ["Variables y funciones JS","JavaScript añade comportamiento y permite reutilizar lógica.","const saludo = nombre => `Hola ${nombre}`;\nconsole.log(saludo(\"Ana\"));"],
 ["Eventos del navegador","Los eventos responden a acciones como clics y escritura.","document.querySelector(\"button\")\n .addEventListener(\"click\", () => alert(\"Hola\"));"]],
 cpp:[
 ["Tipos de datos","C++ requiere declarar el tipo de las variables.","int edad = 20;\ndouble precio = 19.5;\nstring nombre = \"Ana\";"],
 ["Entrada y salida","iostream ofrece cout para salida y cin para entrada.","#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n; }"],
 ["Condicionales y ciclos","if y los ciclos controlan el flujo del programa.","for (int i = 0; i < 5; i++) {\n  cout << i << endl;\n}"],
 ["Funciones y arreglos","Las funciones dividen tareas y los arreglos almacenan varios valores.","int sumar(int a, int b) { return a + b; }\nint valores[3] = {1, 2, 3};"]]
};
let selectedCourse = "java";
function renderAcademy() {
 ["java","python","web","cpp"].forEach(course => {
  const done = lessons.includes(course), status = $(`#progress-${course}`), button = $(`[data-course="${course}"]`);
  if (status) { status.textContent = done ? "✓ Ruta completada" : "Pendiente"; status.style.color = done ? "var(--green)" : "var(--muted)"; }
  if (button) button.textContent = done ? "Marcar como pendiente" : "Marcar como completado";
 });
 let details = $("#academyDetails");
 if (!details) { details = document.createElement("div"); details.id = "academyDetails"; details.className = "panel academy-details"; $("#courseList").insertAdjacentElement("afterend", details); }
 const titles = {java:"Java",python:"Python",web:"Desarrollo web",cpp:"C++"};
 details.innerHTML = `<h3>Academia · ${titles[selectedCourse]}</h3><p class="muted">Abre cada lección para consultar explicación y ejemplo.</p>
 <div class="academy-topic-grid">${lessonDetails[selectedCourse].map((item,index)=>`
 <article class="academy-topic"><button type="button" class="academy-lesson-button" data-open-lesson="${index}" aria-expanded="false"><strong>${index+1}. ${safe(item[0])}</strong><span>Ver lección ▾</span></button>
 <div class="academy-lesson-body" id="lesson-body-${index}" hidden><p>${safe(item[1])}</p><pre>${safe(item[2])}</pre></div></article>`).join("")}</div>`;
}
$("#courseList").addEventListener("click", e => {
 const b=e.target.closest("[data-course]"); if(!b)return;
 selectedCourse=b.dataset.course;
 const course=b.dataset.course;
 lessons=lessons.includes(course)?lessons.filter(x=>x!==course):[...lessons,course];
 if(!saveData(STORAGE_KEYS.lessons,lessons))return;
 record(`Actualizaste el progreso de Academy: ${course}`); renderAcademy(); renderDashboard();
});
document.addEventListener("click", e => {
 const b=e.target.closest("[data-open-lesson]"); if(!b)return;
 const body=$(`#lesson-body-${b.dataset.openLesson}`); if(!body)return;
 body.hidden=!body.hidden; b.setAttribute("aria-expanded",String(!body.hidden));
 b.querySelector("span").textContent=body.hidden?"Ver lección ▾":"Ocultar lección ▴";
});
/* Spotify */
function spotifyEmbed(raw) {
  try {
    const u = new URL(raw);
    if (!["open.spotify.com", "www.open.spotify.com"].includes(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed") parts.shift();
    if (!["track", "album", "playlist", "episode", "show"].includes(parts[0]) || !/^[a-zA-Z0-9]+$/.test(parts[1] || "")) return null;
    return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  } catch { return null; }
}
function renderSpotify(url) {
  const box = $("#spotifyPlayer");
  box.innerHTML = url ? `<iframe src="${url}" title="Reproductor de Spotify" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>` : empty("Tu reproductor aparecerá aquí.");
}
$("#spotifyForm").addEventListener("submit", e => {
  e.preventDefault();
  const url = spotifyEmbed($("#spotifyUrl").value.trim());
  if (!url) return alert("Introduce un enlace válido de Spotify.");
  savedSpotify = url;
  if (saveData(STORAGE_KEYS.spotify, savedSpotify)) {
    renderSpotify(savedSpotify); record("Actualizaste tu reproductor de Spotify");
  }
});

/* Bitácora: crear, editar y eliminar */
function renderNotes() {
  const box = $("#journalList");
  box.innerHTML = notes.length ? notes.map(n => `
    <article class="note-card">
      <span class="note-date">${safe(n.date)}</span><h3>${safe(n.title)}</h3><p>${safe(n.content)}</p>
      <div class="note-actions">
        <button class="secondary-button" type="button" data-edit-note="${safe(n.id)}">Editar</button>
        <button class="delete-button" type="button" data-delete-note="${safe(n.id)}">Eliminar entrada</button>
      </div>
    </article>`).join("") : empty("Todavía no tienes entradas en tu bitácora.");
}
$("#noteForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("#noteTitle").value.trim(), content = $("#noteContent").value.trim();
  if (!title || !content) return alert("Completa el título y el contenido.");
  if (editingNoteId) {
    const n = notes.find(x => x.id === editingNoteId);
    if (n) { n.title = title; n.content = content; n.date = dateNow(); }
    editingNoteId = null;
    $("button[type=submit]", e.target).textContent = "Guardar entrada";
    record(`Editaste una entrada: ${title}`);
  } else {
    notes.unshift({ id: id(), title, content, date: dateNow() });
    record(`Guardaste una entrada: ${title}`);
  }
  if (!saveData(STORAGE_KEYS.notes, notes)) return;
  e.target.reset(); renderNotes(); renderDashboard();
});
$("#journalList").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit-note]");
  const del = e.target.closest("[data-delete-note]");
  if (edit) {
    const n = notes.find(x => x.id === edit.dataset.editNote);
    if (!n) return;
    editingNoteId = n.id;
    $("#noteTitle").value = n.title; $("#noteContent").value = n.content;
    $("button[type=submit]", $("#noteForm")).textContent = "Actualizar entrada";
    $("#noteForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (del) {
    const n = notes.find(x => x.id === del.dataset.deleteNote);
    if (!n || !confirm(`¿Eliminar la entrada "${n.title}"?`)) return;
    notes = notes.filter(x => x.id !== n.id);
    if (!saveData(STORAGE_KEYS.notes, notes)) return;
    record(`Eliminaste una entrada: ${n.title}`); renderNotes(); renderDashboard();
  }
});

/* Inicio */
function init() {
  renderProjects(); renderAcademy(); renderNotes(); renderDashboard();
  renderSpotify(savedSpotify);
  console.info("DEVLOG 2.0 listo.");
}
init();
