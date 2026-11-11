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
      <button class="secondary-button" id="runProjectCode" type="button">Ejecutar en consola</button>
      <button class="secondary-button" id="clearProjectConsole" type="button">Limpiar consola</button>
      <button class="secondary-button" id="closeProjectEditor" type="button">Cerrar editor</button>
    </div>
    <div class="console-panel"><div class="console-title">CONSOLA DEL PROYECTO</div><pre id="projectOutput">Abre un proyecto para comenzar.</pre></div>`;
  $("#projectList").insertAdjacentElement("afterend", host);
  $("#saveProjectCode").addEventListener("click", saveProjectCode);
  $("#runProjectCode").addEventListener("click", () => runInSandbox($("#projectCode").value, $("#projectOutput")));
  $("#closeProjectEditor").addEventListener("click", () => { host.hidden = true; editingProjectId = null; });
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
    <article class="project-card">
      <span class="project-meta">${safe(p.tech)}</span>
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
    date: dateNow(), code: starterCode($("#projectTech").value), fileName: "main.js"
  };
  projects.unshift(project);
  if (!saveData(STORAGE_KEYS.projects, projects)) { projects.shift(); return; }
  e.target.reset();
  record(`Creaste el proyecto: ${name}`);
  renderProjects(); renderDashboard();
});
function openProject(projectId) {
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  ensureProjectEditor();
  editingProjectId = projectId;
  $("#workbenchTitle").textContent = p.name;
  $("#workbenchTech").textContent = `${p.tech} · Guardado local`;
  $("#workbenchFile").value = p.fileName || (p.tech === "Python" ? "main.py" : p.tech === "Java" ? "Main.java" : p.tech === "C++" ? "main.cpp" : "main.js");
  $("#projectCode").value = p.code ?? starterCode(p.tech);
  $("#projectWorkbench").hidden = false;
  $("#projectOutput").textContent = "Código cargado. Recuerda guardar tus cambios.";
  $("#projectWorkbench").scrollIntoView({ behavior: "smooth", block: "start" });
}
function saveProjectCode() {
  const p = projects.find(x => x.id === editingProjectId);
  if (!p) return;
  p.code = $("#projectCode").value;
  p.fileName = $("#workbenchFile").value.trim() || "main.js";
  if (saveData(STORAGE_KEYS.projects, projects)) {
    $("#projectOutput").textContent = "✓ Código guardado en este navegador.";
    record(`Guardaste código en: ${p.name}`);
  }
}
$("#projectList").addEventListener("click", e => {
  const open = e.target.closest("[data-open-project]");
  const del = e.target.closest("[data-delete-project]");
  if (open) openProject(open.dataset.openProject);
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
function runProjectCode() {
  $("#runProjectCode").addEventListener("click", runProjectCode);

$("#clearProjectConsole").addEventListener("click", () => {
  $("#projectOutput").textContent = "Consola limpia.";
});
  if (!project) {
    output.textContent = "Abre un proyecto primero.";
    return;
  }

  if (project.tech !== "JavaScript") {
    output.textContent =
      `La ejecución de ${project.tech} necesita conectar un compilador.`;
    output.style.color = "var(--orange)";
    return;
  }

  runInSandbox($("#projectCode").value, output);
  record(`Ejecutaste código en: ${project.name}`);
}

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

/* Code Tutor */
if ($("#codeEditor")) {
  const saved = loadData(STORAGE_KEYS.tutorCode, null);
  if (saved !== null) $("#codeEditor").value = saved;
  const actions = $(".editor-actions", $("#tutor"));
  if (actions && !$("#runTutorCode")) {
    const run = document.createElement("button");
    run.id = "runTutorCode"; run.type = "button";
    run.className = "primary-button"; run.textContent = "Ejecutar JavaScript";
    actions.insertBefore(run, $("#clearCode"));
    run.addEventListener("click", () => runInSandbox($("#codeEditor").value, $("#codeOutput")));
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
function renderAcademy() {
  ["java", "python", "web", "cpp"].forEach(course => {
    const done = lessons.includes(course);
    const status = $(`#progress-${course}`);
    const button = $(`[data-course="${course}"]`);
    if (status) status.textContent = done ? "✓ Ruta completada" : "Pendiente";
    if (status) status.style.color = done ? "var(--green)" : "var(--muted)";
    if (button) button.textContent = done ? "Marcar como pendiente" : "Marcar como completado";
  });
  let details = $("#academyDetails");
  if (!details) {
    details = document.createElement("div");
    details.id = "academyDetails";
    details.className = "panel academy-details";
    $("#courseList").insertAdjacentElement("afterend", details);
  }
  details.innerHTML = `<h3>Contenido de las rutas</h3><p class="muted">Selecciona una ruta y estudia sus temas. El progreso general se conserva en este dispositivo.</p>
    <div class="academy-topic-grid">${Object.entries(courseLessons).map(([key, topics]) => `
      <div class="academy-topic"><strong>${({java:"Java",python:"Python",web:"Desarrollo web",cpp:"C++"})[key]}</strong>
      <ol>${topics.map(t => `<li>${safe(t)}</li>`).join("")}</ol></div>`).join("")}</div>`;
}
$("#courseList").addEventListener("click", e => {
  const b = e.target.closest("[data-course]");
  if (!b) return;
  const course = b.dataset.course;
  lessons = lessons.includes(course) ? lessons.filter(x => x !== course) : [...lessons, course];
  if (!saveData(STORAGE_KEYS.lessons, lessons)) return;
  record(`Actualizaste el progreso de Academy: ${course}`);
  renderAcademy(); renderDashboard();
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
