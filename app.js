/* DEVLOG 2.1 - aplicación local. Persistencia en localStorage. */
"use strict";

const STORE = {
  projects: "devlog_projects_v2",
  notes: "devlog_notes_v2",
  lessons: "devlog_lessons_v2",
  activity: "devlog_activity_v2",
  spotify: "devlog_spotify_v2",
  tutor: "devlog_tutor_code_v2"
};
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const read = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
  catch (error) { console.warn("No se pudo leer el almacenamiento", error); return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.error(error); toast("No se pudo guardar. Revisa el almacenamiento del navegador."); return false; }
};
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Intl.DateTimeFormat("es-MX", {dateStyle:"medium",timeStyle:"short"}).format(new Date());
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let projects = read(STORE.projects, []);
let notes = read(STORE.notes, []);
let lessons = read(STORE.lessons, []);
let activity = read(STORE.activity, []);
let spotify = read(STORE.spotify, "");
let editingProjectId = null;
let editingNoteId = null;
let toastTimer;

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}
function record(message) {
  activity.unshift({id:uid(),message,date:now()});
  activity = activity.slice(0,8);
  write(STORE.activity,activity);
  renderActivity();
}
function empty(message) { return `<div class="empty-state">${escapeHTML(message)}</div>`; }

const pageNames = {dashboard:"Dashboard",projects:"Proyectos",academy:"Academy",tutor:"Code Tutor",music:"Music",journal:"Bitácora"};
function navigateTo(name) {
  if (!pageNames[name]) return;
  $$(".view").forEach(view => view.classList.toggle("active",view.id===name));
  $$(".nav-link").forEach(button => button.classList.toggle("active",button.dataset.view===name));
  $("#pageTitle").textContent = pageNames[name];
  $("#sidebar").classList.remove("open");
  if (name==="dashboard") renderDashboard();
}
$$(".nav-link").forEach(button => button.addEventListener("click",()=>navigateTo(button.dataset.view)));
$$("[data-go]").forEach(button => button.addEventListener("click",()=>navigateTo(button.dataset.go)));
$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));

function renderActivity() {
  const box=$("#recentActivity");
  box.innerHTML=activity.length ? activity.map(item=>`<div class="activity-row"><span>${escapeHTML(item.message)}</span><small>${escapeHTML(item.date)}</small></div>`).join("") : empty("Todavía no hay actividad. ¡Crea tu primer proyecto!");
}
function renderDashboard() {
  $("#statProjects").textContent=projects.length;
  $("#statNotes").textContent=notes.length;
  $("#statLessons").textContent=lessons.length;
  renderActivity();
}

function extensionFor(tech) {
  return ({Java:"java",Python:"py","C++":"cpp","HTML / CSS":"html",JavaScript:"js",Otro:"txt"})[tech] || "txt";
}
function defaultFileName(tech) { return tech==="Java" ? "Main.java" : `main.${extensionFor(tech)}`; }
function starterCode(tech) {
  if (tech==="Python") return '# Programa inicial de DEVLOG\nprint("Hola, DEVLOG")';
  if (tech==="Java") return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola, DEVLOG");\n    }\n}';
  if (tech==="C++") return '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hola, DEVLOG" << endl;\n    return 0;\n}';
  if (tech==="HTML / CSS") return '<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><title>Mi proyecto</title></head>\n<body><h1>Hola, DEVLOG</h1></body>\n</html>';
  if (tech==="JavaScript") return 'const mensaje = "Hola, DEVLOG";\nconsole.log(mensaje);';
  return "// Comienza tu proyecto aquí.";
}
function renderProjects() {
  $("#projectCount").textContent=`${projects.length} ${projects.length===1?"proyecto":"proyectos"}`;
  $("#projectList").innerHTML=projects.length ? projects.map(project=>`
    <article class="project-card">
      <span class="project-meta">${escapeHTML(project.tech)}</span>
      <h3>${escapeHTML(project.name)}</h3><p>${escapeHTML(project.description||"Sin descripción.")}</p>
      <div class="project-footer"><small class="muted">${escapeHTML(project.date||"")}</small>
        <div class="project-actions"><button class="button secondary" data-open-project="${escapeHTML(project.id)}">Abrir editor</button><button class="delete-button" data-delete-project="${escapeHTML(project.id)}">Eliminar</button></div>
      </div>
    </article>`).join("") : empty("Aún no tienes proyectos. Crea el primero con el formulario.");
}
$("#projectForm").addEventListener("submit",event=>{
  event.preventDefault();
  const name=$("#projectName").value.trim();
  if(!name) return;
  const tech=$("#projectTech").value;
  const project={id:uid(),name,tech,description:$("#projectDescription").value.trim(),date:now(),code:starterCode(tech),fileName:defaultFileName(tech)};
  projects.unshift(project);
  if(!write(STORE.projects,projects)){projects.shift();return;}
  event.target.reset();
  record(`Creaste el proyecto: ${name}`);
  renderProjects();renderDashboard();toast("Proyecto creado.");
});
function openProject(projectId) {
  const project=projects.find(item=>item.id===projectId);
  if(!project)return;
  editingProjectId=projectId;
  $("#workbenchTitle").textContent=project.name;
  $("#workbenchTech").textContent=project.tech;
  $("#workbenchFile").value=project.fileName||defaultFileName(project.tech);
  $("#projectCode").value=project.code??starterCode(project.tech);
  $("#projectOutput").textContent="Código cargado. Guarda tus cambios para conservarlos.";
  $("#consoleStatus").textContent="Editor abierto";
  $("#projectWorkbench").hidden=false;
  $("#projectWorkbench").scrollIntoView({behavior:"smooth",block:"start"});
}
$("#projectList").addEventListener("click",event=>{
  const open=event.target.closest("[data-open-project]");
  const remove=event.target.closest("[data-delete-project]");
  if(open)openProject(open.dataset.openProject);
  if(remove){
    const project=projects.find(item=>item.id===remove.dataset.deleteProject);
    if(!project||!confirm(`¿Eliminar el proyecto "${project.name}"?`))return;
    projects=projects.filter(item=>item.id!==project.id);
    if(!write(STORE.projects,projects))return;
    if(editingProjectId===project.id){editingProjectId=null;$("#projectWorkbench").hidden=true;}
    record(`Eliminaste el proyecto: ${project.name}`);renderProjects();renderDashboard();toast("Proyecto eliminado.");
  }
});
$("#saveProjectCode").addEventListener("click",()=>{
  const project=projects.find(item=>item.id===editingProjectId);
  if(!project){toast("Abre un proyecto primero.");return;}
  project.code=$("#projectCode").value;
  let file=$("#workbenchFile").value.trim().replace(/[\\/:*?"<>|]/g,"").slice(0,80);
  project.fileName=file||defaultFileName(project.tech);
  if(write(STORE.projects,projects)){
    $("#projectOutput").textContent="✓ Código guardado en este dispositivo.";
    $("#consoleStatus").textContent="Guardado";
    record(`Guardaste código en: ${project.name}`);toast("Código guardado.");
  }
});
$("#runProjectCode").addEventListener("click",()=>{
  const project=projects.find(item=>item.id===editingProjectId);
  if(!project){$("#projectOutput").textContent="Abre un proyecto primero.";return;}
  if(project.tech!=="JavaScript"){
    $("#projectOutput").textContent=`La ejecución de ${project.tech} todavía no está conectada. Puedes editar y guardar el código; para ejecutarlo se necesita un compilador/backend.`;
    $("#consoleStatus").textContent="No disponible";
    return;
  }
  executeJavaScript($("#projectCode").value,$("#projectOutput"),$("#consoleStatus"));
  record(`Ejecutaste código en: ${project.name}`);
});
$("#clearProjectConsole").addEventListener("click",()=>{
  $("#projectOutput").textContent="Consola limpia.";$("#consoleStatus").textContent="Lista";
});
$("#closeProjectEditor").addEventListener("click",()=>{
  $("#projectWorkbench").hidden=true;editingProjectId=null;
});

function executeJavaScript(source,output,status) {
  if(!source.trim()){output.textContent="El editor está vacío.";status.textContent="Sin código";return;}
  output.textContent="Ejecutando…";status.textContent="Ejecutando";
  const frame=document.createElement("iframe");
  frame.setAttribute("sandbox","allow-scripts");
  frame.setAttribute("aria-hidden","true");
  frame.style.cssText="position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0";
  const token=uid();let finished=false;let timer;
  const finish=(message,isError=false)=>{
    if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener("message",onMessage);frame.remove();
    output.textContent=message;output.style.color=isError?"var(--orange)":"var(--green)";status.textContent=isError?"Finalizado con error":"Finalizado";
  };
  const onMessage=event=>{
    if(event.source!==frame.contentWindow||!event.data||event.data.token!==token)return;
    if(event.data.type==="result")finish(event.data.lines.join("\n")||"✓ Ejecutado sin mensajes de consola.");
    if(event.data.type==="error")finish(`Error: ${event.data.message}`,true);
  };
  window.addEventListener("message",onMessage);
  timer=setTimeout(()=>finish("Tiempo límite alcanzado (2 segundos). El proceso fue detenido.",true),2000);
  const encoded=JSON.stringify(String(source));
  frame.srcdoc=`<!doctype html><meta charset="utf-8"><script>
    const token=${JSON.stringify(token)},lines=[];
    const format=value=>{try{return typeof value==="string"?value:JSON.stringify(value)??String(value)}catch{return String(value)}};
    for(const method of ["log","info","warn","error"])console[method]=(...args)=>lines.push((method==="error"?"Error: ":method==="warn"?"Aviso: ":"")+args.map(format).join(" "));
    try{(new Function(${encoded}))();parent.postMessage({token,type:"result",lines},"*")}
    catch(error){parent.postMessage({token,type:"error",message:error&&error.message?error.message:String(error)},"*")}
  <\/script>`;
  document.body.appendChild(frame);
}

function inspectJavaScript(source) {
  if(!source.trim())return ["El editor está vacío."];
  try{new Function(source);return ["✓ No se detectaron errores de sintaxis. Esto no garantiza que el programa esté libre de errores lógicos."];}
  catch(error){return [`Error de sintaxis: ${error.message}`];}
}
$("#runTutorCode").addEventListener("click",()=>executeJavaScript($("#codeEditor").value,$("#codeOutput"),$("#tutorStatus")));
$("#checkCode").addEventListener("click",()=>{
  const result=inspectJavaScript($("#codeEditor").value);
  $("#codeOutput").textContent=result.join("\n");
  $("#codeOutput").style.color=result[0].startsWith("✓")?"var(--green)":"var(--orange)";
  $("#tutorStatus").textContent=result[0].startsWith("✓")?"Revisión terminada":"Revisar código";
  record("Revisaste código en Code Tutor");
});
$("#codeEditor").addEventListener("input",()=>write(STORE.tutor,$("#codeEditor").value));
const savedTutor=read(STORE.tutor,null);if(savedTutor!==null)$("#codeEditor").value=savedTutor;
$("#clearCode").addEventListener("click",()=>{
  $("#codeEditor").value="";write(STORE.tutor,"");$("#codeOutput").textContent="Editor limpio." ;$("#tutorStatus").textContent="Lista";
});

const courseIds=["java","python","web","cpp"];
function renderAcademy(){
  courseIds.forEach(course=>{
    const complete=lessons.includes(course);
    const button=$(`[data-course="${course}"]`),status=$(`#progress-${course}`);
    button.textContent=complete?"Marcar como pendiente":"Marcar completado";
    status.textContent=complete?"✓ Ruta completada":"Pendiente";
    status.style.color=complete?"var(--green)":"var(--muted)";
  });
}
$("#courseList").addEventListener("click",event=>{
  const button=event.target.closest("[data-course]");if(!button)return;
  const course=button.dataset.course;
  lessons=lessons.includes(course)?lessons.filter(item=>item!==course):[...lessons,course];
  if(!write(STORE.lessons,lessons))return;
  record(`Actualizaste Academy: ${course}`);renderAcademy();renderDashboard();
});

function spotifyEmbed(raw){
  try{
    const url=new URL(raw);
    if(url.hostname!=="open.spotify.com"&&url.hostname!=="www.open.spotify.com")return null;
    const parts=url.pathname.split("/").filter(Boolean);
    if(parts[0]==="embed")parts.shift();
    if(!["track","album","playlist","episode","show"].includes(parts[0])||! /^[a-zA-Z0-9]+$/.test(parts[1]||""))return null;
    return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  }catch{return null;}
}
function renderSpotify(url){
  const box=$("#spotifyPlayer");
  if(!url){box.innerHTML=empty("Tu reproductor aparecerá aquí.");return;}
  const frame=document.createElement("iframe");
  frame.src=url;frame.title="Reproductor de Spotify";frame.loading="lazy";
  frame.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";frame.allowFullscreen=true;
  box.replaceChildren(frame);
}
$("#spotifyForm").addEventListener("submit",event=>{
  event.preventDefault();const embed=spotifyEmbed($("#spotifyUrl").value.trim());
  if(!embed){toast("Introduce un enlace válido de Spotify.");return;}
  spotify=embed;if(write(STORE.spotify,spotify)){renderSpotify(spotify);record("Actualizaste Spotify");}
});

function renderNotes(){
  $("#journalList").innerHTML=notes.length?notes.map(note=>`
    <article class="note-card"><span class="note-date">${escapeHTML(note.date)}</span><h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.content)}</p><div class="note-actions">
      <button class="button secondary" data-edit-note="${escapeHTML(note.id)}">Editar</button>
      <button class="delete-button" data-delete-note="${escapeHTML(note.id)}">Eliminar</button></div>
    </article>`).join(""):empty("Todavía no tienes entradas en tu bitácora.");
}
function resetNoteForm(){
  editingNoteId=null;$("#noteForm").reset();$("#noteFormTitle").textContent="Nueva entrada";
  $("#saveNoteButton").textContent="Guardar entrada";$("#cancelNoteEdit").hidden=true;
}
$("#noteForm").addEventListener("submit",event=>{
  event.preventDefault();
  const title=$("#noteTitle").value.trim(),content=$("#noteContent").value.trim();
  if(!title||!content)return;
  if(editingNoteId){
    const note=notes.find(item=>item.id===editingNoteId);if(note){note.title=title;note.content=content;note.date=now();}
    record(`Editaste una entrada: ${title}`);
  }else{
    notes.unshift({id:uid(),title,content,date:now()});record(`Guardaste una entrada: ${title}`);
  }
  if(!write(STORE.notes,notes))return;
  resetNoteForm();renderNotes();renderDashboard();toast("Entrada guardada.");
});
$("#cancelNoteEdit").addEventListener("click",resetNoteForm);
$("#journalList").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit-note]"),remove=event.target.closest("[data-delete-note]");
  if(edit){
    const note=notes.find(item=>item.id===edit.dataset.editNote);if(!note)return;
    editingNoteId=note.id;$("#noteTitle").value=note.title;$("#noteContent").value=note.content;
    $("#noteFormTitle").textContent="Editar entrada";$("#saveNoteButton").textContent="Actualizar entrada";$("#cancelNoteEdit").hidden=false;
    $("#noteForm").scrollIntoView({behavior:"smooth",block:"center"});
  }
  if(remove){
    const note=notes.find(item=>item.id===remove.dataset.deleteNote);
    if(!note||!confirm(`¿Eliminar la entrada "${note.title}"?`))return;
    notes=notes.filter(item=>item.id!==note.id);
    if(!write(STORE.notes,notes))return;
    record(`Eliminaste una entrada: ${note.title}`);renderNotes();renderDashboard();toast("Entrada eliminada.");
  }
});

function init(){
  renderProjects();renderAcademy();renderNotes();renderDashboard();renderSpotify(spotify);
  console.info("DEVLOG 2.1 listo.");
}
init();
