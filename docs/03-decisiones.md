# Decisiones de diseño — Patitas Felices

**Proyecto:** sitio web de la clínica veterinaria Patitas Felices (Caracas, Venezuela)  
**Autor:** Lenin Alvarado  
**Fecha:** 2026-10-30  
**Documentos relacionados:** [`01-investigacion.md`](01-investigacion.md) (personas, journey y competencia), [`02-arquitectura.md`](02-arquitectura.md) (card sorting, sitemap y user flow).  
**Prototipo:** `site/` (HTML, CSS y JavaScript sin framework ni paso de compilación).

> **Regla de lectura.** Cada decisión de este documento se puede comprobar en el prototipo o en una prueba automatizada. Las capturas de las pantallas están en `docs/assets/pantallas/` y se regeneran con `node tests/capture.mjs`.

---

## 1. Cómo se tomaron las decisiones

El proyecto partió de tres proto-personas con necesidades deliberadamente opuestas (Camila, Rafael y la familia Rojas), un journey map con la emoción como eje y un análisis de tres sitios reales. Las decisiones no se justifican por gusto: cada una responde a un dolor observado, a un requisito del brief o a una restricción de accesibilidad.

| Fuente | Qué aportó | Dónde se ve |
|---|---|---|
| Personas (S1) | Extremos de edad, habilidad digital y contexto familiar | Menú de 6 opciones, reserva corta, teléfono visible, precios |
| Journey map (S2) | El pico de estrés está en el agendamiento y la calma llega con la confirmación | Flujo de 3 pasos, borrador, confirmación compartible |
| Competencia (S3) | Nadie mostraba precios ni disponibilidad real; la urgencia estaba escondida | Precio referencial + nota BCV, calendario, dock de emergencia |
| Brief (S4–S12) | Alcance, pantallas obligatorias y criterios de entrega | Checklist de la sección 5 |

---

## 2. Decisiones por persona

### 2.1. Camila — reserva rápida, precio claro y móvil

| Insight de la persona | Decisión de diseño | Dónde se implementa |
|---|---|---|
| Agenda desde el celular en una pausa corta. | Flujo lineal de 3 pasos y 5 pantallas, con una sola columna en móvil y botones de 48 px. | `site/agendar.html`, `agendar-paso-2.html`, `agendar-paso-3.html`; CSS mobile-first en `base.css` |
| Quiere saber si es urgente antes de reservar. | Pregunta “¿Es una emergencia?” como primera decisión del paso 1; si responde sí, se detiene el formulario y se ofrecen llamada y WhatsApp. | `site/agendar.html` + `booking.js` (`initStep1`) |
| Teme que el precio cambie. | Precio “Desde $” en cada tarjeta y nota “o su equivalente en Bs a tasa BCV del día” en servicios, detalle, resumen y confirmación. | `servicios.html`, `servicio.html`, `booking.js` |
| Quiere disponibilidad real, no un “te contactamos”. | Calendario con días disponibles, horarios de 30 minutos y estados disponible/seleccionado/no disponible. | `agendar-paso-2.html` + `booking.js` |
| Puede abandonar a mitad. | Modal de salida, borrador en `sessionStorage` por 24 h y banner “Continuar donde lo dejaste”. | `booking.js` (`setupExitGuard`, `readDraft`) |
| Quiere compartir la cita. | Confirmación con código, resumen, WhatsApp y archivo `.ics`. | `cita-confirmada.html` + `booking.js` |

### 2.2. Rafael — teléfono, letras legibles y cero laberintos

| Insight de la persona | Decisión de diseño | Dónde se implementa |
|---|---|---|
| Prefiere llamar y usa un teléfono fijo. | El teléfono de la clínica está en el header, el footer y la confirmación; la validación acepta móviles `04XX` y fijos `02XX`. | `site/assets/js/layout.js`, `booking.js` (`PHONE_RE`), `tests/booking.spec.js` |
| Necesita la emergencia sin buscar. | Botón fijo de emergencias en todas las páginas, con `tel:` y WhatsApp; además aparece en el header, el footer y la página de contacto. | `layout.js` (`dockMarkup`), `components.css` (`.emergency-dock`) |
| Tiene baja alfabetización digital. | Navegación de 6 opciones sin submenús, etiquetas visibles, foco claro y objetivos táctiles de 48 px. | `layout.js` (`NAV_ITEMS`), `base.css`, `components.css` |
| Usa lentes y aumenta el tamaño de letra. | Texto base de 16 px, escala fluida con `clamp()` y jerarquía con Nunito 400–800. | `tokens.css`, `base.css` |
| No quiere crear cuentas. | La reserva no pide contraseña ni registro; solo los datos mínimos del dueño. | `agendar-paso-3.html` |

### 2.3. Familia Rojas — confianza, precio y logística compartida

| Insight de la persona | Decisión de diseño | Dónde se implementa |
|---|---|---|
| Compara antes de pagar. | Inicio con prueba social (8 años, +4.000 mascotas, 24/7, 4 especialistas), equipo y testimonios. | `index.html`, `equipo.html` |
| Necesita precios y duración. | Cada servicio muestra duración y precio referencial; el detalle explica qué incluye y cómo prepararse. | `servicios.html`, `servicio.html` |
| Agenda alrededor del colegio. | Calendario con sábados de 8:00 a 14:00 y domingos solo emergencias; horarios de 30 min. | `booking.js` (`getSlotsForDate`), `contacto.html` |
| Comparte la decisión con su pareja. | Confirmación con resumen completo y enlace de WhatsApp con el texto de la cita. | `cita-confirmada.html` |
| Quiere el historial de vacunas. | “Mis mascotas” con perfiles, vacunas, próximas dosis y recordatorios. | `mis-mascotas.html` |

---

## 3. Sistema visual y guía de estilos

La guía viva está en **`site/guia-de-estilos.html`** y los valores en `site/assets/css/tokens.css`. Este resumen explica el porqué.

### 3.1. Paleta

- **Verde azulado (`--color-primary` #0E6B5F):** confianza y cuidado. Es el color de las acciones principales, los enlaces y el foco.
- **Ámbar (`--color-accent` #B45309):** calidez y energía; se usa en acentos y badges, nunca en texto largo.
- **Rojo (`--color-emergency` #B42318):** reservado exclusivamente para emergencias y errores. No se usa como decoración.
- **Neutros con inclinación verde:** el fondo claro es #F6FAF8 y el texto #0E211E; evitan el blanco/negro puros y reducen la fatiga.
- **Modo oscuro:** invierte las superficies a #08110F/#101D1A y sube el verde a #2DD4BF para mantener el contraste. La preferencia se guarda en `localStorage` (`pf-theme`) y respeta `prefers-color-scheme` cuando no hay elección explícita.

**Evidencia WCAG AA:** `node tests/contrast.mjs` audita **74 pares de tokens en dos temas = 148 comprobaciones**. Todos pasan (4.5:1 para texto, 3:1 para texto grande, bordes y foco). La tabla visible está en la guía de estilos.

### 3.2. Tipografía

**Nunito** (SIL OFL 1.1, autoalojada) tiene formas redondeadas y una altura de x generosa: se siente cercana sin perder legibilidad. Pesos 400, 600, 700 y 800; cuerpo mínimo de 16 px y medida máxima de 68 caracteres. La monoespaciada del sistema se reserva para códigos y tokens.

### 3.3. Logo e iconografía

El logo es una huella **Lucide `paw-print`** dentro de una placa verde azulado; funciona igual en claro y oscuro. En el footer se usa solo la huella y el wordmark, sin la placa, para aligerar el bloque sobre fondo oscuro. El set completo es **Lucide v1.65.0 (ISC)**, de 24 × 24 px y trazo 2, más el glifo de WhatsApp de **Simple Icons v16.36.0 (CC0)**. El sprite se genera con `tests/build-icons.mjs`, se sirve inline desde `layout.js` y no depende de un CDN. Todos los iconos decorativos usan `aria-hidden="true"` y `focusable="false"`.

### 3.4. Espaciado, radios y elevación

Base de 4 px (`--space-1` a `--space-12`), radios de 8–24 px para tarjetas y píldoras para botones. La elevación es discreta: dos niveles de sombra y bordes de 1–2 px para separar superficies sin depender solo del color.

### 3.5. Estados de los componentes

| Componente | Reposo | Hover | Activo | Deshabilitado | Error / seleccionado |
|---|---|---|---|---|---|
| Botón primario | Verde 0E6B5F | Verde 0A544A | Verde 08463E + 1 px de press | Gris de deshabilitado, sin sombra | — |
| Botón secundario | Superficie + borde fuerte | Verde suave | Superficie apagada | Gris | — |
| Campo de texto | Borde fuerte | Borde primario | — | — | Borde rojo + mensaje + `aria-invalid` |
| Tarjeta de servicio (radio) | Superficie | Borde primario | — | — | Fondo verde suave + check |
| Día del calendario | Superficie | Borde primario | — | Rayado y gris | Verde lleno con `aria-pressed` |
| Horario | Superficie + borde | Verde suave | — | Tachado y gris | Verde lleno con `aria-pressed` |
| Enlace | Verde | Verde oscuro | — | — | — |

Los estados no dependen solo del color: hay borde, icono, texto o `aria-*`. El foco visible es un contorno de 3 px con offset.

**Hover de enlaces y botones:** el hover genérico de enlaces se limita a `a:not(.btn):hover`; cada variante de `.btn` define su color de texto en hover/activo/foco. La prueba `tests/button-contrast.spec.js` recorre todos los botones visibles de las 33 páginas en claro y oscuro y exige 4.5:1 (3:1 solo para texto grande).

### 3.6. Modo oscuro

No es una inversión automática: se declaran tokens semánticos para `[data-theme="dark"]` y para `prefers-color-scheme: dark`, y una prueba verifica que ambos bloques no diverjan. El toggle cambia el icono luna/sol, actualiza `aria-label` y guarda la preferencia.

### 3.7. Microinteracciones

| Interacción | Efecto | Implementación |
|---|---|---|
| Pulsar un botón | Hundimiento de 1 px y escala 0.985 | `.btn:active` en `components.css` |
| Cambiar de paso | Entrada suave de 8 px con desvanecido | `.booking-layout > *` en `pages.css` |
| Elegir día u horario | Pop de 6 % durante 180 ms | `@keyframes pf-pop` |
| Confirmar la cita | Check con rebote y anillo que se disipa | `.confirmation-icon` + `@keyframes pf-check-ring` |
| Cargar una página | Pulso suave del botón “Llamar”, una sola vez | `@keyframes pf-dock-pulse`, `iteration-count: 1` |
| Cambiar de tema | Giro de 180° del icono | `.theme-toggle .icon` |

**Reduced motion:** `base.css` desactiva animaciones y transiciones con `prefers-reduced-motion: reduce`. La prueba `tests/motion.spec.js` confirma que, con esa preferencia, ningún elemento tiene animaciones en ejecución.

### 3.8. Fotografía

La ilustración del hero y los iconos de servicio se sustituyeron por **fotografía real autohospedada** (WebP, 1600 px el hero y 800 px las tarjetas, todas por debajo de 200 KB). Las fotos vienen de Pexels, con licencia que permite uso gratuito y comercial. Se usan para el hero, las cinco tarjetas y detalles de servicio, los perfiles de Miga y Bruno y las tarjetas del equipo. Las personas del equipo son **modelos de stock**, no personal real, y se identifican como “fotos de prueba”. Autor, fuente y licencia de cada archivo están en `docs/creditos.md`, que es la fuente canónica.

**Accesibilidad:** todas las fotos tienen `alt` descriptivo en español, `width` y `height` para reservar espacio, y `loading="lazy"` salvo el hero. Las fotos del equipo se muestran en escala de grises para mantener una serie visual coherente.

---

## 4. Decisiones transversales

### 4.1. Mobile-first

- Todo el CSS parte de una columna y solo añade columnas en `min-width: 40rem`, `48rem`, `60rem` y `64rem`.
- Objetivo táctil mínimo de 48 px en botones, enlaces de navegación, días y horarios.
- Tipografía fluida con `clamp()`; sin texto por debajo de 12 px y cuerpo de 16 px.
- El dock de emergencia reserva espacio con `--emergency-dock-space` para no tapar contenido.
- Verificación: `tests/smoke.spec.js` recorre 33 páginas a 390 y 1440 px y falla si hay desbordamiento horizontal, errores de consola o falta el dock.

### 4.2. Emergencias siempre a mano

La emergencia es global, no una página: el dock fijo aparece en todas las pantallas con “Llamar” (`tel:`) y “WhatsApp” (`wa.me`). También está en el header, el footer, la página de contacto y la confirmación. En el paso 1 del agendamiento, la pregunta de emergencia interrumpe el formulario. El bloque de emergencia se rediseñó como una superficie roja suave con borde, icono en badge y acciones agrupadas a la derecha en escritorio; el footer usa un botón rojo/blanco con el número alineado. El dock usa el rojo reservado y su texto cumple AA.

### 4.3. Accesibilidad

- **Contraste:** 148 comprobaciones AA en claro y oscuro (`tests/contrast.mjs`).
- **Auditoría automatizada:** `tests/axe.spec.js` ejecuta axe-core en 33 páginas × 2 temas = **66 pruebas**, sin violaciones serias ni críticas.
- **Teclado y foco:** enlace “Saltar al contenido”, foco visible de 3 px, `dialog` nativo para el modal de salida, retorno de foco al abrir/cerrar, `aria-pressed` en calendario y horarios.
- **Formularios:** etiquetas asociadas, `aria-invalid`, `aria-describedby`, contenedores con `role="alert"`/`aria-live`, errores que no dependen solo del color y foco en el primer campo inválido.
- **Semántica:** un solo `h1` por página, jerarquía de encabezados, regiones con `aria-label`, tablas con `caption` y `th scope`, iconos decorativos ocultos.
- **Movimiento:** respeto estricto de `prefers-reduced-motion`.
- **Contenido:** textos en español venezolano neutral, instrucciones claras y ejemplos en los mensajes de error.

### 4.4. Consistencia

Un solo sistema de tokens, un solo header/footer inyectado por `layout.js` y una sola guía de estilos. Las 10 pantallas obligatorias, “Mis mascotas”, la guía y los 11 wireframes comparten la misma retícula, tipografía, botones y estados.

### 4.5. Flujo de reserva

- **3 pasos y 5 pantallas:** el paso 1 agrupa servicio + mascota; el paso 3 agrupa datos del dueño + confirmación, tal como pide el brief. El camino ideal tiene 4 clics de avance.
- **Borrador:** `pf-booking-draft` en `sessionStorage`, caducidad de 24 h, sin envío al servidor.
- **Conflicto de horario:** el horario de demo se ocupa al confirmar; se vuelve al paso 2 con tres alternativas cercanas y los datos intactos.
- **Validación:** teléfono móvil `04XX-XXXXXXX` o fijo `02XX-XXXXXXX` (11 dígitos), correo estándar y edad estructurada en **número + unidad** (meses o años). Los borradores antiguos con edad en texto libre se migran al cargar; los errores aparecen inline y bloquean el avance.
- **Modal de salida:** diálogo nativo centrado en escritorio y hoja inferior en móvil; el reset global ya no rompe el `margin: auto` del diálogo.
- **Campos:** `.field` y `.form-grid` usan `align-content/align-items: start`, así un error en un campo no estira el campo hermano.
- **Confirmación:** código `PF-AAAM-XXXX`, resumen, WhatsApp y `.ics`.
- **Objetivo de tiempo:** ≤ 2 minutos; el diseño estima ≈ 100 s (no es una medición con usuarios).

### 4.6. Extras opcionales

| Extra | Estado | Dónde |
|---|---|---|
| Modo oscuro | Implementado | `tokens.css`, toggle global, prueba axe en ambos temas |
| Microinteracciones | Implementado y con reduced motion | `components.css`, `pages.css`, `tests/motion.spec.js` |
| Carrusel de equipo | Implementado, sin autoplay, con teclado, swipe y puntos | `equipo.html`, `index.html`, `carousel.js`, `tests/carousel.spec.js` |
| “Mis mascotas” con historial de vacunas | Implementado con foto, próxima dosis y CTA de refuerzo | `mis-mascotas.html` |
| Prueba de usabilidad | **No realizada** (no formaba parte del alcance elegido) | — |

### 4.7. Contenido y moneda

La clínica, la dirección, los teléfonos, los precios, el equipo y los testimonios son ficticios y plausibles para Caracas. Los precios se muestran en USD con la nota “o su equivalente en Bs a tasa BCV del día”. El teléfono de la clínica es +58 212 555 1234 y el de emergencias/WhatsApp +58 412 555 0198.

---

## 5. Cumplimiento del enunciado

### 5.1. Investigación y arquitectura

| Requisito del brief | Evidencia | Estado |
|---|---|---|
| S1 · Lista de al menos 4 tipos de cliente, con por qué visitarían el sitio | `docs/01-investigacion.md` §1 (5 tipos) | Cumplido |
| S1 · Elegir 2–3 tipos distintos y justificar | `docs/01-investigacion.md` §1.1 | Cumplido |
| S1 · Datos básicos, mascota, frase, perfil tecnológico, deseos (≥3), frustraciones (≥3), miedos, motivaciones, escenario | `docs/01-investigacion.md` §2.1–2.3 | Cumplido |
| S1 · Al menos 2 supuestos justificados por persona | `docs/01-investigacion.md` §2.1–2.3 (2 por persona) | Cumplido |
| S1 · 2–3 decisiones de diseño por persona | `docs/01-investigacion.md` §2.1–2.3 (3 por persona) | Cumplido |
| S2 · Escenario textual, una persona, columnas Detección → Post-cita | `docs/01-investigacion.md` §3.1 | Cumplido |
| S2 · Filas Acciones, Pensamientos, Emociones, Contactos, Dolores, Oportunidades | `docs/01-investigacion.md` §3.1 | Cumplido |
| S2 · Curva o iconos de emoción | `docs/assets/journey-emociones.svg` | Cumplido |
| S3 · 2–3 sitios reales, al menos uno de Venezuela | `docs/01-investigacion.md` §4.2 (Los Chorros y DogtorVet, VE; Vets4Pets, UK) | Cumplido |
| S3 · Tabla con los criterios del brief, URL y fecha | `docs/01-investigacion.md` §4.2–4.3 (2026-10-29) | Cumplido |
| S3 · Capturas de escritorio y móvil | `docs/assets/competencia/*-1440.png` y `*-390.png` | Cumplido |
| S3 · Conclusión de 5–8 líneas: adoptar, evitar, diferenciarse | `docs/01-investigacion.md` §4.4 (6 líneas) | Cumplido |
| S4 · Card sorting por persona | `docs/02-arquitectura.md` §1.2–1.5 | Cumplido |
| S4 · Árbol Nivel 0 / Nivel 1 / Nivel 2 y elementos globales aparte | `docs/02-arquitectura.md` §2.2–2.3 + `docs/assets/sitemap.svg` | Cumplido |
| S4 · Menú ≤ 6 opciones y ninguna página importante a más de 3 clics | `docs/02-arquitectura.md` §2.1 y §2.4 (6 opciones; ≤ 3 clics) | Cumplido |
| S4 · Justificación de 3–4 líneas | `docs/02-arquitectura.md` §2.5 | Cumplido |
| S5 · Símbolos estándar (óvalo, rectángulo, rombo, flechas) | `docs/assets/user-flow.svg` y bloque Mermaid en §3.2 | Cumplido |
| S5 · Al menos 2 puntos de entrada | `docs/02-arquitectura.md` §3.1 (Google, Instagram, detalle) | Cumplido |
| S5 · Camino ideal completo | `docs/02-arquitectura.md` §3.3 | Cumplido |
| S5 · Alternativas: emergencia, horario ocupado, campos inválidos, volver, abandono | `docs/02-arquitectura.md` §3.4 + user flow | Cumplido |
| S5 · Conteo de clics/pantallas y meta < 2 min | `docs/02-arquitectura.md` §3.5 (4 clics, 5 pantallas, ≈100 s) | Cumplido |

### 5.2. Prototipo y pantallas

| Requisito del brief | Evidencia | Estado |
|---|---|---|
| S6 · Todos los wireframes requeridos en gris, sin imágenes finales | `site/wireframes/01-inicio.html` … `11-mis-mascotas.html` + índice | Cumplido (11) |
| S7 · Paleta, tipografía, botones, campos, iconografía y logo | `site/guia-de-estilos.html` | Cumplido |
| S7 · Pantallas finales a 1440 y 390 px | `docs/assets/pantallas/*-1440.png` y `*-390.png` | Cumplido |
| S7 · Fotografía real con licencia y autoría | `site/assets/img/photos/*.webp` + tabla en `docs/creditos.md` | Cumplido |
| S8 · Flujo de agendar recorrible con clics | `site/agendar.html` → `cita-confirmada.html`; `tests/booking.spec.js` | Cumplido |
| S9.1 · Inicio con hero + CTA, servicios, testimonios y contacto | `site/index.html` | Cumplido |
| S9.2 · Servicios (consulta, vacunación, cirugía, peluquería, emergencias) con precios | `site/servicios.html` | Cumplido |
| S9.3 · Detalle de servicio | `site/servicio.html?s=consulta` (5 slugs) | Cumplido |
| S9.4 · Nuestro equipo y especialidades | `site/equipo.html` y carrusel en `index.html`; fotos de prueba con autoría en `docs/creditos.md` | Cumplido |
| S9.5 · Agendar paso 1: servicio + mascota (tipo, nombre, edad) | `site/agendar.html` | Cumplido |
| S9.6 · Agendar paso 2: fecha y hora con disponibilidad | `site/agendar-paso-2.html` | Cumplido |
| S9.7 · Agendar paso 3: datos del dueño + confirmación | `site/agendar-paso-3.html` | Cumplido |
| S9.8 · Cita confirmada con resumen, WhatsApp y calendario | `site/cita-confirmada.html` | Cumplido |
| S9.9 · Contacto y ubicación: mapa, horarios y emergencias | `site/contacto.html` con cabecera y acciones rápidas, mapa, contacto, horario con “hoy” y bloque de emergencia | Cumplido |
| S9.10 · Página 404 con estilo de marca | `site/404.html` | Cumplido |
| S10 · Mobile-first | CSS base + pruebas a 390/1440 | Cumplido |
| S10 · Contraste WCAG AA | `tests/contrast.mjs` (148/148) + `tests/axe.spec.js` | Cumplido |
| S10 · Emergencias visibles en todo momento | Dock global en las 33 páginas | Cumplido |
| S10 · Estados hover, activo, deshabilitado y error | `site/guia-de-estilos.html` §botones/formularios; CSS | Cumplido |
| S10 · Consistencia visual | Tokens, layout compartido y guía; footer, emergencia, tarjetas de mascota, carrusel y contacto usan los mismos componentes | Cumplido |
| S11 · “Mis mascotas” con historial de vacunas | `site/mis-mascotas.html` con foto, próxima dosis destacada y CTA de refuerzo | Cumplido |
| S11 · Modo oscuro | Toggle global + tokens + axe en oscuro | Cumplido |
| S11 · Microinteracciones con reduced motion | `components.css`, `pages.css`, `tests/motion.spec.js` | Cumplido |
| S12 · Enlace al diseño (sitio, guía, wireframes) | `README.md`; `<URL_VERCEL>/documentacion/pantallas.html`; `<URL_VERCEL>/guia-de-estilos.html`; `<URL_VERCEL>/wireframes/index.html` | Cumplido en el repositorio; el enlace se publica en T9 |
| S12 · Enlace al prototipo | `README.md`, `docs/informe.pdf` y `<URL_VERCEL>` | Cumplido en el repositorio; el enlace se publica en T9 |
| S12 · Documentación navegable dentro del sitio (investigación, arquitectura, decisiones, pantallas, PDF) | `site/documentacion/index.html` y las cuatro páginas generadas | Cumplido |
| S12 · PDF ≤ 8 páginas con investigación, sitemap, user flow y justificación | `docs/informe.pdf` y `site/documentacion/informe.pdf` (8 páginas) | Cumplido |

### 5.3. Criterios de calidad verificables

| Criterio | Comando / evidencia | Resultado |
|---|---|---|
| Contraste AA en claro y oscuro | `node tests/contrast.mjs` | 74 pares × 2 temas = 148/148 |
| axe-core sin violaciones serias/críticas | `pnpm exec playwright test tests/axe.spec.js` | 66/66 |
| Hover de botones con etiqueta legible | `pnpm exec playwright test tests/button-contrast.spec.js` | 33 páginas × 2 temas |
| Suite completa (estructura, flujo, axe, movimiento) | `pnpm exec playwright test` | 197/197 |
| Sin desbordamiento horizontal a 390/1440 | `tests/smoke.spec.js` | 33 páginas × 2 anchos |
| Capturas de entrega | `node tests/capture.mjs` | 32 PNG en `docs/assets/pantallas/` |
| PDF dentro del límite | `docs/informe.pdf` y `site/documentacion/informe.pdf` | 8 páginas A4, texto seleccionable |

---

## 6. Límites y siguientes pasos

- **No hubo prueba de usabilidad con personas reales:** no formaba parte de los extras elegidos. Las decisiones son hipótesis de diseño sustentadas en el análisis y deben validarse con al menos 5 usuarios.
- **Los datos son ficticios y el prototipo no tiene backend:** el borrador y la cita viven en `sessionStorage`. En producción faltaría disponibilidad real, correo/WhatsApp transaccional y protección de datos.
- **La publicación en Vercel queda pendiente de confirmación del usuario (T9).** El `README.md` y el PDF usan marcadores `<URL_VERCEL>` que se reemplazan al publicar.
- **Mantenimiento:** al cambiar un token hay que actualizar `tests/contrast.mjs` y la tabla de la guía; al cambiar una pantalla, regenerar capturas con `node tests/capture.mjs` y el PDF con el script de `docs/informe.html`.
