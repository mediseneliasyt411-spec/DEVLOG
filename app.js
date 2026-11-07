
const $ = id => document.getElementById(id);

function getData(key) {
  return JSON.parse(localStorage.getItem("devlog_" + key) || "[]");
}

function saveData(key, data) {
  localStorage.setItem("devlog_" + key, JSON.stringify(data));
}

function escapeHTML(text = "") {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

// Navegación
function showView(view) {
  document.querySelectorAll(".view").forEach(section => {
    section.classList.toggle("active", section.id === view);
  });

  const titles = {
    inicio: "Bienvenido a DEVLOG",
    proyectos: "Mis proyectos",
    academy: "DEVLOG Academy",
    tutor: "Code Tutor",
    musica: "Focus Mode",
    bitacora: "Bitácora de desarrollo"
  };

  $("pageTitle").textContent = titles[view] || "DEVLOG";
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

// Proyectos
$("projectForm").addEventListener("submit", event => {
  event.preventDefault();

  const projects = getData("projects");

  projects.unshift({
    name: $("projectName").value.trim(),
    description: $("projectDescription").value.trim(),
    tech: $("projectTech").value,
    date: new Date().toLocaleDateString()
  });

  saveData("projects", projects);
  $("projectForm").reset();
  renderProjects();
});

function renderProjects() {
  const projects = getData("projects");

  $("projectCount").textContent = projects.length;

  $("projectsList").innerHTML = projects.map(project => `
    <article>
      <h3>${escapeHTML(project.name)}</h3>
      <p>${escapeHTML(project.description)}</p>
      <small>${escapeHTML(project.tech)} · ${escapeHTML(project.date)}</small>
    </article>
  `).join("");
}

// Academy
const lessons = {
  "Java": {
    basic: `Variables y tipos de datos
int edad = 20;
String nombre = "Alex";
System.out.println(nombre);`,
    intermediate: `Programación orientada a objetos
class Persona {
  String nombre;
  void saludar() {
    System.out.println("Hola");
  }
}`,
    advanced: `Colecciones
List<String> nombres = new ArrayList<>();
nombres.add("Ana");`
  },
  "Python": {
    basic: `Variables
nombre = "Alex"
edad = 20
print(nombre)`,
    intermediate: `Funciones
def sumar(a, b):
    return a + b`,
    advanced: `POO
class Persona:
    def __init__(self, nombre):
        self.nombre = nombre`
  },
  "C++": {
    basic: `Variables
int edad = 20;
cout << edad;`,
    intermediate: `Funciones
int sumar(int a, int b) {
    return a + b;
}`,
    advanced: `Vectores
vector<int> numeros = {1, 2, 3};`
  },
  "HTML y CSS": {
    basic: `HTML
<h1>Mi primera página</h1>
<p>Hola mundo</p>`,
    intermediate: `CSS
.contenedor {
  display: flex;
  gap: 20px;
}`,
    advanced: `Responsive
@media (max-width: 600px) {
  .contenedor {
    display: block;
  }
}`
  },
  "JavaScript": {
    basic: `Variables
const nombre = "Alex";
console.log(nombre);`,
    intermediate: `Funciones
function sumar(a, b) {
  return a + b;
}`,
    advanced: `Asincronía
async function cargar() {
  const respuesta = await fetch("/api");
  return respuesta.json();
}`
  }
};

function loadCourse(language) {
  const lesson = lessons[language];

  $("courseContent").innerHTML = `
    <h2>${language}</h2>
    <h3>Nivel básico</h3>
    <pre>${escapeHTML(lesson.basic)}</pre>
    <h3>Nivel intermedio</h3>
    <pre>${escapeHTML(lesson.intermediate)}</pre>
    <h3>Nivel avanzado</h3>
    <pre>${escapeHTML(lesson.advanced)}</pre>
    <p>Practica los ejemplos en tu propio entorno de desarrollo.</p>
  `;
}

// Code Tutor: revisión por reglas sencillas
function reviewCode() {
  const code = $("codeEditor").value;
  const language = $("codeLanguage").value;
  const issues = [];

  if (!code.trim()) {
    issues.push("El editor está vacío.");
  }

  if ((code.match(/\{/g) || []).length !==
      (code.match(/\}/g) || []).length) {
    issues.push("Revisa las llaves de apertura y cierre.");
  }

  if ((code.match(/\(/g) || []).length !==
      (code.match(/\)/g) || []).length) {
    issues.push("Revisa los paréntesis.");
  }

  if (language === "JavaScript") {
    if (/\bvar\b/.test(code)) {
      issues.push("Considera usar const o let en lugar de var.");
    }
    if (/==(?!=)/.test(code)) {
      issues.push("Revisa si necesitas === en lugar de ==.");
    }
  }

  if (language === "Python" && /\bfunction\b/.test(code)) {
    issues.push("En Python se define una función usando def.");
  }

  if (language === "Java" && /\bSystem\.out\.println/.test(code) &&
      !/;/.test(code)) {
    issues.push("Comprueba que las instrucciones Java terminen en punto y coma.");
  }

  if (issues.length === 0) {
    $("codeResults").innerHTML =
      "<h3>Revisión básica terminada</h3>" +
      "<p>No se detectaron los patrones configurados. Esto no garantiza que el programa sea correcto.</p>";
  } else {
    $("codeResults").innerHTML =
      "<h3>Observaciones</h3><ul>" +
      issues.map(issue => `<li>${escapeHTML(issue)}</li>`).join("") +
      "</ul>";
  }
}

// Spotify
function connectSpotify() {
  const link = $("spotifyLink").value.trim();

  try {
    const url = new URL(link);

    if (url.hostname !== "open.spotify.com") {
      throw new Error("Enlace inválido");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const types = ["track", "album", "playlist", "artist", "show", "episode"];

    if (parts.length < 2 || !types.includes(parts[0])) {
      throw new Error("Contenido no compatible");
    }

    const embed = `https://open.spotify.com/embed/${parts[0]}/${encodeURIComponent(parts[1])}`;

    $("spotifyPlayer").innerHTML = `
      <iframe src="${embed}"
        title="Spotify"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy">
      </iframe>
    `;
  } catch {
    $("spotifyPlayer").textContent =
      "No se reconoció el enlace. Pega un enlace compartido de open.spotify.com.";
  }
}

// Bitácora
$("noteForm").addEventListener("submit", event => {
  event.preventDefault();

  const notes = getData("notes");

  notes.unshift({
    title: $("noteTitle").value.trim(),
    body: $("noteBody").value.trim(),
    date: new Date().toLocaleString()
  });

  saveData("notes", notes);
  $("noteForm").reset();
  renderNotes();
});

function renderNotes() {
  const notes = getData("notes");

  $("noteCount").textContent = notes.length;

  $("notesList").innerHTML = notes.map(note => `
    <article class="panel">
      <h3>${escapeHTML(note.title)}</h3>
      <small>${escapeHTML(note.date)}</small>
      <p>${escapeHTML(note.body)}</p>
    </article>
  `).join("");
}

// Inicio
renderProjects();
renderNotes();
