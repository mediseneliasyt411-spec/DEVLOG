# DEVLOG 2.2 — Developer Workspace

DEVLOG es una aplicación web local para organizar proyectos, estudiar programación, analizar errores frecuentes y documentar avances. Está construida con HTML, CSS y JavaScript sin un servidor obligatorio.

## Funcionalidades incluidas
- Dashboard con estadísticas y actividad reciente.
- Navegación entre Dashboard, Proyectos, Academy, Code Tutor, Music y Bitácora.
- Proyectos: crear, abrir, editar código, guardar y eliminar.
- Analizador estático educativo para JavaScript, Python, Java, C++ y estructura HTML.
- Diagnósticos con severidad, número de línea, explicación y sugerencia de corrección.
- Academy con cuatro rutas y cuatro lecciones por ruta; cada lección incluye explicación, ejemplo, ejercicio y progreso.
- Music: reproductor embebido de Spotify para enlaces válidos.
- Bitácora: crear, editar y eliminar entradas.
- Persistencia local con `localStorage`.

## Archivos
- `index.html`: estructura y secciones.
- `styles.css`: diseño adaptable a escritorio y móvil.
- `app.js`: navegación, almacenamiento, proyectos, diagnósticos, Academy y bitácora.
- `DOCUMENTACION.md`: arquitectura, pruebas, límites y mantenimiento.

## Instalación
1. Descarga y descomprime el ZIP.
2. Abre la carpeta en Visual Studio Code.
3. Abre `index.html` directamente en el navegador o utiliza la extensión Live Server.
4. Para publicar, sube los tres archivos principales a la raíz del repositorio de GitHub y conecta el repositorio a Vercel o GitHub Pages.
5. No cambies los nombres de los archivos ni los identificadores HTML sin actualizar sus referencias en `app.js`.

## Datos y privacidad
Los proyectos, notas, progreso y preferencias se guardan en `localStorage` del navegador. Los datos no se sincronizan entre dispositivos ni se envían a una base de datos. No borres los datos del sitio si quieres conservar tu información.

## Límites importantes
El analizador es estático y educativo. Detecta patrones frecuentes mediante reglas y expresiones regulares; no ejecuta, compila ni interpreta programas. Puede generar falsos positivos o no detectar errores complejos. Para validación completa se necesitaría integrar analizadores/lint específicos o un servicio de compilación seguro.
Spotify requiere conexión a Internet y que el contenido esté disponible para reproducirse.
