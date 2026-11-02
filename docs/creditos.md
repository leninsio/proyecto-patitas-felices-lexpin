# Créditos y licencias — Patitas Felices

**Proyecto:** sitio web de la clínica veterinaria Patitas Felices (Caracas, Venezuela)  
**Autor:** Lenin Alvarado  
**Fecha:** 2026-10-30

Este documento registra el origen de los recursos visuales del prototipo. La clínica, su dirección, teléfonos, precios, veterinarios, mascotas y testimonios son ficticios y se crearon con fines académicos.

## Ilustraciones

- **Ilustraciones de apoyo:** los iconos de servicio y el mapa son SVG originales creados para este proyecto. El hero y las tarjetas de servicio usan fotografías reales, detalladas más abajo.
- **Fotos del equipo:** fotografías de stock de Pexels usadas como fotos de prueba; las personas son modelos y no representan al personal ficticio de la clínica. Se listan con su autoría en la sección de fotografías.
- **Iconografía:** set Lucide (ISC) + WhatsApp de Simple Icons (CC0) definido como sprite en `site/assets/js/layout.js`; detalle y versiones en la sección de iconografía.
- **Mapa de contacto:** SVG original y estilizado en `site/contacto.html`. No es un mapa real ni usa datos de OpenStreetMap; la dirección es ficticia.
- **Logo y favicon:** composiciones propias en `site/assets/img/logo.svg` y `site/assets/img/favicon.svg`; la huella es `paw-print` de Lucide (ISC).

## Iconografía

- **Lucide** v1.65.0 — licencia **ISC**. Set base de 24 × 24 px, trazo 2, extremos redondeados. El sprite se genera con `tests/build-icons.mjs` desde `lucide-static` y se sirve inline desde `site/assets/js/layout.js`; no hay CDN en tiempo de ejecución. Sitio: <https://lucide.dev/> · Licencia: <https://lucide.dev/license>.
- **Simple Icons** v16.36.0 — licencia **CC0**. El glifo de marca de WhatsApp se toma de `simple-icons` y se sirve en el mismo sprite. Sitio: <https://simpleicons.org/> · Licencia: <https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md> (CC0 1.0).

## Tipografía

- **Nunito** (Vernon Adams y colaboradores), distribuida bajo la **SIL Open Font License 1.1**. El archivo `site/assets/fonts/nunito-latin.woff2` es el subconjunto latino autoalojado y se declara en `site/assets/css/tokens.css`.
- Respaldo del sistema: Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif.

## Fotografías

Las fotos de animales y del equipo se descargaron de **Pexels** y se autoalojan como WebP optimizado en `site/assets/img/photos/`. La licencia de Pexels permite el uso gratuito, incluido el uso comercial, sin atribución obligatoria; aun así se registra autor, fuente y licencia. Las personas que aparecen en las fotos del equipo son **modelos de stock** y no representan al personal real de la clínica: son fotos de prueba para el prototipo académico.

| Archivo | Tema | Autor | Fuente | Licencia |
|---|---|---|---|---|
| `hero.webp` | Gato y perro juntos | Helena Jankovičová Kováčová | <https://www.pexels.com/photo/16395150/> | Pexels License |
| `service-consulta.webp` | Veterinaria con perro | Tima Miroshnichenko | <https://www.pexels.com/photo/pet-owner-looking-at-her-dog-while-standing-near-the-veterinarian-holding-stethoscope-6235020/> | Pexels License |
| `service-vacunacion.webp` | Veterinario con perro | Tima Miroshnichenko | <https://www.pexels.com/photo/a-veterinarian-holding-a-pomeranian-6235225/> | Pexels License |
| `service-cirugia.webp` | Revisión con tijeras quirúrgicas | Ermelinda Maglione | <https://www.pexels.com/photo/veterinarian-checking-the-ear-of-a-dog-using-surgical-scissors-6604130/> | Pexels License |
| `service-peluqueria.webp` | Peluquería canina | Goochie Poochie Grooming | <https://www.pexels.com/photo/groomer-drying-poodle-19145896/> | Pexels License |
| `service-emergencias.webp` | Veterinario con pastor alemán | Tima Miroshnichenko | <https://www.pexels.com/photo/man-in-blue-scrub-suit-checking-up-a-dog-6235114/> | Pexels License |
| `pet-miga.webp` | Perra mestiza | Pragyan Bezbaruah | <https://www.pexels.com/photo/close-up-of-a-happy-mixed-breed-dog-indoors-35747386/> | Pexels License |
| `pet-bruno.webp` | Labrador chocolate | Sharon Snider | <https://www.pexels.com/photo/brown-labrador-dog-in-studio-15147689/> | Pexels License |
| `team-valeria.webp` | Foto de prueba: mujer veterinaria | Tima Miroshnichenko | <https://www.pexels.com/photo/a-woman-holding-a-pomeranian-dog-6234602/> | Pexels License |
| `team-andres.webp` | Foto de prueba: hombre veterinario | Tima Miroshnichenko | <https://www.pexels.com/photo/person-in-blue-scrub-suit-holding-a-dog-6235017/> | Pexels License |
| `team-camila.webp` | Foto de prueba: mujer veterinaria | Tima Miroshnichenko | <https://www.pexels.com/photo/pet-owner-looking-at-her-dog-while-standing-near-the-veterinarian-holding-stethoscope-6235020/> | Pexels License |
| `team-jesus.webp` | Foto de prueba: hombre veterinario | Tima Miroshnichenko | <https://www.pexels.com/photo/a-vet-checking-a-sick-rough-collie-6235231/> | Pexels License |

**Licencia Pexels:** <https://www.pexels.com/license/>

## Wireframes

Los wireframes de `site/wireframes/` son originales, en escala de grises y sin imágenes finales. Las cajas con una X representan imágenes o ilustraciones pendientes, no recursos descargados.

## Datos ficticios

- Dirección: Av. Francisco de Miranda, Torre Country, local 3, Los Ruices, Caracas 1071.
- Teléfono de la clínica: +58 212 555 1234.
- Emergencias y WhatsApp: +58 412 555 0198.
- Correo: hola@patitasfelices.com.ve.
- Veterinarios: Dra. Valeria Montilla, Dr. Andrés Liendo, Dra. Camila Rondón y Dr. Jesús Peñaloza.
- Mascotas de ejemplo: Miga y Bruno.

Cualquier parecido con personas, clínicas o mascotas reales es coincidencia.

## Uso académico

El proyecto se entrega como trabajo académico de diseño UI/UX. Los recursos originales de este repositorio pueden reutilizarse con mención del autor; la fuente Nunito conserva su propia licencia SIL OFL 1.1.
