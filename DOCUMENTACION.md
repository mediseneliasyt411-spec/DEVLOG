# Documentación técnica — DEVLOG 2.2

## 1. Objetivo
Ofrecer un espacio de trabajo personal para administrar pequeños proyectos de programación, revisar patrones comunes de error, aprender fundamentos y registrar avances.

## 2. Arquitectura
Aplicación cliente sin backend obligatorio:
- Presentación: `index.html` y `styles.css`.
- Lógica: `app.js`.
- Persistencia: `localStorage`.
- Servicios externos opcionales: reproductor embebido de Spotify.

## 3. Módulos
### Dashboard
Resume proyectos, notas, rutas terminadas, lecciones terminadas y actividad reciente.

### Proyectos
Cada proyecto contiene identificador, nombre, lenguaje, descripción, fecha, archivo y código. El editor permite modificar y guardar el código. El botón Analizar utiliza el diagnóstico correspondiente al lenguaje seleccionado al crear el proyecto.

### Code Tutor y diagnóstico
El analizador procesa el texto y aplica reglas educativas:
- JavaScript: delimitadores, cadenas, `var`, comparaciones flexibles, declaraciones incompletas y patrones comunes.
- Python: dos puntos en bloques, indentación, llamadas a funciones y asignaciones incompletas.
- Java: estructura de clase, delimitadores, llamadas `println`, cadenas y punto y coma.
- C++: `main`, delimitadores, declaraciones, `cout` y cabeceras frecuentes.
- HTML: etiquetas estructurales básicas y cierres.

Cada diagnóstico contiene nivel, título, explicación, línea aproximada y sugerencia. No es un compilador ni garantiza detectar todos los defectos.

### Academy
Cuatro rutas: Java, Python, Desarrollo web y C++. Cada ruta contiene cuatro lecciones. Se guarda el avance de cada lección y el estado de la ruta.

### Music
Valida el dominio de Spotify y los tipos track, album, playlist, episode y show antes de crear el iframe.

### Bitácora
Permite crear, editar y eliminar entradas personales.

## 4. Modelo de datos local
Claves principales:
- `devlog_projects_v2`
- `devlog_notes_v2`
- `devlog_lessons_v2`
- `devlog_activity_v2`
- `devlog_spotify_v2`
- `devlog_tutor_code_v2`
- `devlog_lesson_progress_v2`

Las respuestas de ejercicios se guardan con claves `devlog_answer_<ruta>_<lección>`.

## 5. Pruebas manuales recomendadas
1. Navegar por los seis menús y regresar al Dashboard.
2. En móvil, abrir y cerrar el menú lateral.
3. Crear proyectos en los cinco lenguajes, abrirlos y guardar cambios.
4. Analizar ejemplos con errores conocidos y confirmar que se muestran línea, explicación y sugerencia.
5. Crear una nota, editarla y eliminarla.
6. Abrir las cuatro rutas de Academy, desplegar lecciones, guardar respuestas y completar lecciones.
7. Recargar la página y verificar que los datos persisten.
8. Probar enlaces de Spotify válidos e inválidos.

## 6. Seguridad y limitaciones
- No se ejecuta código introducido por el usuario.
- El análisis se hace localmente y no envía el código a servidores.
- Los diagnósticos son heurísticos; el número de línea puede ser aproximado.
- `localStorage` depende del navegador y dispositivo; no es un sistema de respaldo.
- No existe autenticación, sincronización multiusuario ni base de datos remota.

## 7. Mantenimiento
Mantener sincronizados los identificadores de `index.html` con los selectores de `app.js`. Antes de publicar cambios, probar los flujos descritos en la sección 5. Hacer una copia de los datos importantes antes de limpiar el almacenamiento del navegador.
