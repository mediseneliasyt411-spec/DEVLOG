
"use strict";

/* =========================================
   DEVLOG 2.0 - APLICACIÓN PRINCIPAL
   HTML + CSS + JavaScript
========================================= */

const STORAGE_KEYS = {
    projects: "devlog_projects_v2",
    notes: "devlog_notes_v2",
    lessons: "devlog_lessons_v2",
    activity: "devlog_activity_v2",
    spotify: "devlog_spotify_v2"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/* ---------- ALMACENAMIENTO ---------- */

function loadData(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error("No se pudo leer el almacenamiento:", error);
        return fallback;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("No se pudo guardar la información:", error);
        alert("No se pudo guardar. Revisa el espacio disponible del navegador.");
        return false;
    }
}

let projects = loadData(STORAGE_KEYS.projects);
let notes = loadData(STORAGE_KEYS.notes);
let lessons = loadData(STORAGE_KEYS.lessons);
let activity = loadData(STORAGE_KEYS.activity);
let savedSpotify = loadData(STORAGE_KEYS.spotify, "");

/* ---------- UTILIDADES ---------- */

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function createId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function registerActivity(message) {
    activity.unshift({
        id: createId(),
        message,
        date: formatDate()
    });

    activity = activity.slice(0, 8);
    saveData(STORAGE_KEYS.activity, activity);
    renderActivity();
}

function showEmpty(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

/* ---------- NAVEGACIÓN ---------- */

const pageNames = {
    dashboard: "Dashboard",
    projects: "Proyectos",
    academy: "Academy",
    tutor: "Code Tutor",
    music: "Music",
    journal: "Bitácora"
};

function navigateTo(viewName) {
    if (!pageNames[viewName]) return;

    $$(".view").forEach(view => {
        view.classList.toggle("active", view.id === viewName);
    });

    $$(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    $("#pageTitle").textContent = pageNames[viewName];
    $("#sidebar").classList.remove("open");

    if (viewName === "dashboard") renderDashboard();
}

$$(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.view);
    });
});

$$("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.go);
    });
});

$("#menuButton").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

/* ---------- DASHBOARD ---------- */

function renderDashboard() {
    $("#statProjects").textContent = projects.length;
    $("#statNotes").textContent = notes.length;
    $("#statLessons").textContent = lessons.length;

    renderActivity();
}

function renderActivity() {
    const container = $("#recentActivity");

    if (!activity.length) {
        container.innerHTML = showEmpty(
            "Todavía no hay actividad. ¡Comienza creando un proyecto!"
        );
        return;
    }

    container.innerHTML = activity.map(item => `
        <div class="activity-item" style="
            padding: 12px 4px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            gap: 12px;
        ">
            <span>${escapeHTML(item.message)}</span>
            <small class="muted">${escapeHTML(item.date)}</small>
        </div>
    `).join("");
}

/* ---------- PROYECTOS ---------- */

function renderProjects() {
    const container = $("#projectList");

    $("#projectCount").textContent =
        `${projects.length} ${projects.length === 1 ? "proyecto" : "proyectos"}`;

    if (!projects.length) {
        container.innerHTML = showEmpty(
            "Aún no tienes proyectos. Crea el primero usando el formulario."
        );
        return;
    }

    container.innerHTML = projects.map(project => `
        <article class="project-card">
            <span class="project-meta">${escapeHTML(project.tech)}</span>
            <h3>${escapeHTML(project.name)}</h3>
            <p>${escapeHTML(project.description || "Sin descripción.")}</p>
            <div class="project-footer">
                <small class="muted">${escapeHTML(project.date)}</small>
                <button class="delete-button" data-delete-project="${escapeHTML(project.id)}">
                    Eliminar
                </button>
            </div>
        </article>
    `).join("");
}

$("#projectForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#projectName").value.trim();
    const tech = $("#projectTech").value;
    const description = $("#projectDescription").value.trim();

    if (!name) {
        alert("Escribe el nombre del proyecto.");
        return;
    }

    const project = {
        id: createId(),
        name,
        tech,
        description,
        date: formatDate()
    };

    projects.unshift(project);

    if (!saveData(STORAGE_KEYS.projects, projects)) {
        projects.shift();
        return;
    }

    event.target.reset();
    registerActivity(`Creaste el proyecto: ${name}`);
    renderProjects();
    renderDashboard();
});

$("#projectList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-project]");
    if (!button) return;

    const id = button.dataset.deleteProject;
    const project = projects.find(item => item.id === id);

    if (!project) return;

    if (!confirm(`¿Eliminar el proyecto "${project.name}"?`)) return;

    projects = projects.filter(item => item.id !== id);
    if (!saveData(STORAGE_KEYS.projects, projects)) return;

    registerActivity(`Eliminaste el proyecto: ${project.name}`);
    renderProjects();
    renderDashboard();
});

/* ---------- ACADEMY ---------- */

function renderAcademy() {
    const courseIds = ["java", "python", "web", "cpp"];

    courseIds.forEach(id => {
        const completed = lessons.includes(id);
        const status = $(`#progress-${id}`);
        const button = $(`[data-course="${id}"]`);

        status.textContent = completed ? "✓ Completado" : "Pendiente";
        status.style.color = completed ? "var(--green)" : "var(--muted)";

        button.textContent = completed
            ? "Marcar como pendiente"
            : "Marcar como completado";
    });
}

$("#courseList").addEventListener("click", event => {
    const button = event.target.closest("[data-course]");
    if (!button) return;

    const course = button.dataset.course;
    const completed = lessons.includes(course);

    if (completed) {
        lessons = lessons.filter(item => item !== course);
        registerActivity(`Actualizaste el progreso de ${course}`);
    } else {
        lessons.push(course);
        registerActivity(`Completaste una ruta de Academy: ${course}`);
    }

    if (!saveData(STORAGE_KEYS.lessons, lessons)) return;

    renderAcademy();
    renderDashboard();
});

/* ---------- CODE TUTOR ---------- */

function inspectJavaScript(source) {
    const problems = [];

    if (!source.trim()) {
        return ["El editor está vacío. Escribe algo de código."];
    }

    const pairs = {
        "(": ")",
        "[": "]",
        "{": "}"
    };

    const opening = [];
    const closing = new Set(Object.values(pairs));

    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        const next = source[i + 1];

        if (lineComment) {
            if (char === "\n") lineComment = false;
            continue;
        }

        if (blockComment) {
            if (char === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }

        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === "\\") {
                escaped = true;
                continue;
            }

            if (char === quote) quote = null;
            continue;
        }

        if (char === "/" && next === "/") {
            lineComment = true;
            i++;
            continue;
        }

        if (char === "/" && next === "*") {
            blockComment = true;
            i++;
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            quote = char;
            continue;
        }

        if (pairs[char]) {
            opening.push({ char, position: i });
            continue;
        }

        if (closing.has(char)) {
            const last = opening.pop();

            if (!last || pairs[last.char] !== char) {
                problems.push(
                    `Símbolo de cierre inesperado "${char}" en posición ${i + 1}.`
                );
            }
        }
    }

    if (quote) {
        problems.push("Parece que hay una cadena de texto sin cerrar.");
    }

    if (blockComment) {
        problems.push("Parece que hay un comentario de bloque sin cerrar.");
    }

    if (opening.length) {
        problems.push("Hay uno o más paréntesis, corchetes o llaves sin cerrar.");
    }

    if (/\bvar\s+[a-zA-Z_$]/.test(source)) {
        problems.push("Consejo: considera utilizar let o const en lugar de var.");
    }

    if (/console\.log\s*\(\s*\)/.test(source)) {
        problems.push("Hay una llamada a console.log() sin contenido.");
    }

    if (/\bif\s*\([^)]*\)\s*[^{}\s]/.test(source)) {
        problems.push("Revisa el bloque if: utiliza llaves para delimitar sus instrucciones.");
    }

    return problems;
}

$("#checkCode").addEventListener("click", () => {
    const source = $("#codeEditor").value;
    const results = inspectJavaScript(source);
    const output = $("#codeOutput");

    if (results.length === 0) {
        output.textContent =
            "✓ No se encontraron errores en las comprobaciones básicas.\n\n" +
            "Esto no garantiza que el programa funcione correctamente. " +
            "La revisión no sustituye a un analizador sintáctico profesional.";
        output.style.color = "var(--green)";
    } else {
        output.textContent = results.map((item, index) =>
            `${index + 1}. ${item}`
        ).join("\n");

        output.style.color = "var(--orange)";
    }

    registerActivity("Revisaste código en Code Tutor");
});

$("#clearCode").addEventListener("click", () => {
    if (!confirm("¿Limpiar todo el editor?")) return;

    $("#codeEditor").value = "";
    $("#codeOutput").textContent = "Editor limpio.";
    $("#codeOutput").style.color = "var(--muted)";
});

/* ---------- SPOTIFY ---------- */

function convertSpotifyUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);

        if (
            url.hostname !== "open.spotify.com" &&
            url.hostname !== "www.open.spotify.com"
        ) {
            return null;
        }

        const parts = url.pathname.split("/").filter(Boolean);

        if (parts[0] === "embed") parts.shift();

        const type = parts[0];
        const id = parts[1];

        const allowedTypes = ["track", "album", "playlist", "episode", "show"];

        if (!allowedTypes.includes(type) || !/^[a-zA-Z0-9]+$/.test(id || "")) {
            return null;
        }

        return `https://open.spotify.com/embed/${type}/${id}`;
    } catch {
        return null;
    }
}

function renderSpotify(embedUrl) {
    const container = $("#spotifyPlayer");

    if (!embedUrl) {
        container.innerHTML = showEmpty("Tu reproductor aparecerá aquí.");
        return;
    }

    container.innerHTML = `
        <iframe
            src="${embedUrl}"
            title="Reproductor de Spotify"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowfullscreen>
        </iframe>
    `;
}

$("#spotifyForm").addEventListener("submit", event => {
    event.preventDefault();

    const rawUrl = $("#spotifyUrl").value.trim();
    const embedUrl = convertSpotifyUrl(rawUrl);

    if (!embedUrl) {
        alert("Introduce un enlace válido de Spotify a una canción, álbum o playlist.");
        return;
    }

    savedSpotify = embedUrl;
    if (!saveData(STORAGE_KEYS.spotify, savedSpotify)) return;

    renderSpotify(savedSpotify);
    registerActivity("Actualizaste tu reproductor de Spotify");
});

/* ---------- BITÁCORA ---------- */

function renderNotes() {
    const container = $("#journalList");

    if (!notes.length) {
        container.innerHTML = showEmpty(
            "Todavía no tienes entradas en tu bitácora."
        );
        return;
    }

    container.innerHTML = notes.map(note => `
        <article class="note-card">
            <span class="note-date">${escapeHTML(note.date)}</span>
            <h3>${escapeHTML(note.title)}</h3>
            <p>${escapeHTML(note.content)}</p>
            <button class="delete-button" data-delete-note="${escapeHTML(note.id)}">
                Eliminar entrada
            </button>
        </article>
    `).join("");
}

$("#noteForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#noteTitle").value.trim();
    const content = $("#noteContent").value.trim();

    if (!title || !content) {
        alert("Completa el título y el contenido.");
        return;
    }

    notes.unshift({
        id: createId(),
        title,
        content,
        date: formatDate()
    });

    if (!saveData(STORAGE_KEYS.notes, notes)) {
        notes.shift();
        return;
    }

    event.target.reset();
    registerActivity(`Guardaste una entrada: ${title}`);
    renderNotes();
    renderDashboard();
});

$("#journalList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-note]");
    if (!button) return;

    const id = button.dataset.deleteNote;
    const note = notes.find(item => item.id === id);

    if (!note) return;

    if (!confirm(`¿Eliminar la entrada "${note.title}"?`)) return;

    notes = notes.filter(item => item.id !== id);
    if (!saveData(STORAGE_KEYS.notes, notes)) return;

    registerActivity(`Eliminaste una entrada: ${note.title}`);
    renderNotes();
    renderDashboard();
});

/* ---------- INICIALIZACIÓN ---------- */

function initializeApp() {
    renderProjects();
    renderAcademy();
    renderNotes();
    renderDashboard();

    if (savedSpotify) {
        $("#spotifyUrl").value = "";
        renderSpotify(savedSpotify);
    }
}

initializeApp();

console.info("DEVLOG 2.0 iniciado correctamente.");
