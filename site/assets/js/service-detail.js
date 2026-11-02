/* ==========================================================================
   Patitas Felices — Service detail
   One static template for the five service slugs:
     servicio.html?s=consulta | vacunacion | cirugia | peluqueria | emergencias
   The static HTML already contains the consulta content, so the page is useful
   without JavaScript. This script only swaps the content for the requested
   slug and keeps the booking link preselected.
   ========================================================================== */

(function () {
  "use strict";

  var WHATSAPP =
    "https://wa.me/584125550198?text=" +
    encodeURIComponent("Hola, quiero consultar sobre un servicio para mi mascota.");

  var SERVICES = {
    consulta: {
      name: "Consulta general",
      eyebrow: "Medicina preventiva",
      category: "Medicina general",
      icon: "#icon-stethoscope",
      photoAlt: "Veterinaria revisando a un perro en la clínica",
      badge: "Más solicitado",
      badgeClass: "badge--primary",
      duration: "30 min",
      price: "Desde $25",
      bookLabel: "Agendar consulta",
      short: "Evaluación completa y plan de cuidado.",
      lead: "Una revisión completa para entender cómo está tu mascota y qué necesita, con un plan de cuidado claro y sin sorpresas.",
      includes: [
        "Revisión de signos vitales, peso y condición corporal.",
        "Exploración física completa y revisión de piel, ojos, oídos y boca.",
        "Plan de cuidado escrito con próximos pasos y controles.",
        "Registro de la visita en el historial de tu mascota.",
        "Resolución de dudas sobre alimentación, ejercicio y prevención."
      ],
      bring: [
        "La cartilla o el historial de vacunas, si lo tienes a mano.",
        "Una lista de los síntomas o cambios que notaste.",
        "Los medicamentos que esté tomando, con su nombre y dosis.",
        "El transportín o correa con la que se sienta más tranquila."
      ],
      faq: [
        {
          question: "¿Necesito pedir cita para una consulta general?",
          answer: "Sí. Agenda en línea o por WhatsApp para reservar un horario de 30 minutos y evitar esperas. Si es una urgencia, llama al +58 412 555 0198."
        },
        {
          question: "¿La consulta incluye tratamiento?",
          answer: "La consulta incluye la evaluación y el plan de cuidado. Los medicamentos, exámenes o procedimientos se cotizan aparte y siempre se explican antes de aplicarlos."
        },
        {
          question: "¿Puedo llevar a más de una mascota?",
          answer: "Sí, pero cada mascota necesita su propia cita para dedicarle el tiempo completo. Agenda una cita por mascota."
        }
      ]
    },
    vacunacion: {
      name: "Vacunación",
      eyebrow: "Prevención",
      category: "Inmunización",
      icon: "#icon-syringe",
      photoAlt: "Veterinario sosteniendo a un perro durante una revisión",
      badge: "Prevención",
      badgeClass: "badge--accent",
      duration: "20 min",
      price: "Desde $35",
      bookLabel: "Agendar vacunación",
      short: "Esquema completo y registro digital.",
      lead: "Esquemas completos y refuerzos al día, con registro digital para que nunca pierdas la fecha de la próxima dosis.",
      includes: [
        "Revisión del esquema de vacunas según especie, edad y estilo de vida.",
        "Aplicación de la vacuna indicada por el veterinario.",
        "Registro de la dosis en el historial digital de tu mascota.",
        "Recordatorio de la próxima fecha por WhatsApp.",
        "Observación breve después de la aplicación."
      ],
      bring: [
        "La cartilla de vacunas o el registro anterior.",
        "La fecha de la última dosis, si la recuerdas.",
        "El peso actual de tu mascota, si lo conoces.",
        "Su correa o transportín."
      ],
      faq: [
        {
          question: "¿Qué vacunas aplican?",
          answer: "Trabajamos el esquema completo para perros y gatos: polivalente, rabia y las vacunas específicas que el veterinario indique según el riesgo de tu mascota."
        },
        {
          question: "¿Mi mascota puede vacunarse si está enferma?",
          answer: "El veterinario la evalúa primero. Si tiene fiebre o una enfermedad activa, se reprograma la dosis para proteger su salud."
        },
        {
          question: "¿Cada cuánto se refuerzan las vacunas?",
          answer: "Depende de la vacuna y del estilo de vida. La polivalente y la rabia suelen reforzarse cada año; el veterinario te dará la fecha exacta."
        }
      ]
    },
    cirugia: {
      name: "Cirugía",
      eyebrow: "Procedimientos",
      category: "Cirugía y traumatología",
      icon: "#icon-heart-pulse",
      photoAlt: "Manos de veterinaria con tijeras quirúrgicas junto a un perro",
      badge: "Requiere evaluación",
      badgeClass: "badge--warning",
      duration: "60 a 120 min",
      price: "Desde $180",
      bookLabel: "Agendar evaluación",
      short: "Evaluación previa, monitoreo y recuperación.",
      lead: "Procedimientos programados con evaluación previa, monitoreo y un plan de recuperación explicado paso a paso.",
      includes: [
        "Evaluación prequirúrgica y exámenes de laboratorio.",
        "Procedimiento con monitoreo de signos vitales.",
        "Control del dolor y cuidado postoperatorio.",
        "Indicaciones escritas para la recuperación en casa.",
        "Revisión de la herida y seguimiento."
      ],
      bring: [
        "Los exámenes o radiografías que ya tengas.",
        "La lista de medicamentos actuales.",
        "La cartilla de vacunas.",
        "Ayuno indicado por el veterinario antes del procedimiento."
      ],
      faq: [
        {
          question: "¿Toda cirugía requiere una consulta previa?",
          answer: "Sí. La evaluación prequirúrgica define si tu mascota está lista, qué exámenes necesita y cuál es el presupuesto final."
        },
        {
          question: "¿Cuánto tiempo queda en observación?",
          answer: "La mayoría de los procedimientos programados requieren observación el mismo día. El veterinario te dirá la hora estimada de salida."
        },
        {
          question: "¿El precio incluye los exámenes?",
          answer: "El precio publicado es referencial y cubre el procedimiento base. Los exámenes, medicamentos y controles se cotizan según el caso."
        }
      ]
    },
    peluqueria: {
      name: "Peluquería",
      eyebrow: "Bienestar",
      category: "Estética y piel",
      icon: "#icon-scissors",
      photoAlt: "Peluquera secando y cepillando a un perro en el salón",
      badge: "Bienestar",
      badgeClass: "badge",
      duration: "60 min",
      price: "Desde $20",
      bookLabel: "Agendar peluquería",
      short: "Baño, corte y cuidado de piel.",
      lead: "Baño, corte y cuidado de piel con productos hipoalergénicos, en un espacio tranquilo y sin estrés innecesario.",
      includes: [
        "Baño con productos adaptados a su tipo de piel.",
        "Corte o deslanado según raza y preferencia.",
        "Limpieza de oídos y corte de uñas.",
        "Revisión de piel y detección de irritaciones.",
        "Secado y cepillado final."
      ],
      bring: [
        "La cartilla de vacunas.",
        "El tipo de corte que prefieres, si tienes una referencia.",
        "Avisar si tiene alergias o irritaciones en la piel.",
        "Su correa o transportín."
      ],
      faq: [
        {
          question: "¿Atienden a perros y gatos?",
          answer: "Sí. Para gatos usamos manejo de bajo estrés, con citas en horarios tranquilos y transporte seguro."
        },
        {
          question: "¿Cuánto tarda el servicio?",
          answer: "Alrededor de 60 minutos, según el tamaño, el pelaje y el temperamento de la mascota. Te avisamos cuando esté lista."
        },
        {
          question: "¿Puedo quedarme durante el servicio?",
          answer: "Recomendamos esperar fuera para reducir el estrés. Si tu mascota necesita compañía, avísanos al agendar."
        }
      ]
    },
    emergencias: {
      name: "Emergencias 24/7",
      eyebrow: "Atención inmediata",
      category: "Urgencias",
      icon: "#icon-alert",
      photoAlt: "Veterinario atendiendo a un perro pastor alemán en la clínica",
      badge: "24 horas",
      badgeClass: "badge--emergency",
      duration: "Evaluación inmediata",
      price: "Desde $45",
      bookLabel: "Agendar evaluación",
      short: "Atención inmediata por orden de gravedad.",
      lead: "Si tu mascota tiene dificultad para respirar, convulsiones, sangrado o ingirió algo tóxico, llama ahora. No esperes a llenar un formulario.",
      includes: [
        "Evaluación de urgencia y estabilización inicial.",
        "Monitoreo de signos vitales y control del dolor.",
        "Comunicación clara con el dueño sobre el estado y los costos.",
        "Coordinación con el veterinario de guardia.",
        "Indicaciones para el traslado seguro."
      ],
      bring: [
        "La cartilla de vacunas, si está disponible.",
        "Los medicamentos o productos que pudo ingerir.",
        "Una manta para trasladarla con seguridad.",
        "El teléfono de contacto actualizado."
      ],
      faq: [
        {
          question: "¿Atienden sin cita?",
          answer: "Sí. Las emergencias se atienden por orden de gravedad, no por orden de llegada. Llama antes para que el equipo se prepare."
        },
        {
          question: "¿Qué signos son una emergencia?",
          answer: "Dificultad para respirar, convulsiones, sangrado que no se detiene, vómitos repetidos, ingestión de tóxicos, golpe de calor o un accidente. Ante la duda, llama."
        },
        {
          question: "¿Puedo agendar una evaluación de urgencia?",
          answer: "Si no es una emergencia inmediata pero tu mascota necesita atención hoy, puedes reservar una evaluación. Si hay riesgo de vida, llama de inmediato."
        }
      ]
    }
  };

  function setText(selector, value) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.textContent = value;
    });
  }

  function setHref(selector, value) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.setAttribute("href", value);
    });
  }

  function renderList(selector, items) {
    var list = document.querySelector(selector);
    if (!list) {
      return;
    }
    list.textContent = "";
    items.forEach(function (item) {
      var li = document.createElement("li");
      var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "icon");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");
      var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", "#icon-check");
      icon.appendChild(use);
      var text = document.createElement("span");
      text.textContent = item;
      li.appendChild(icon);
      li.appendChild(text);
      list.appendChild(li);
    });
  }

  function renderFaq(items) {
    var container = document.querySelector("[data-service-faq]");
    if (!container) {
      return;
    }
    container.textContent = "";
    items.forEach(function (item) {
      var details = document.createElement("details");
      details.className = "faq__item";
      var summary = document.createElement("summary");
      summary.textContent = item.question;
      var answer = document.createElement("p");
      answer.textContent = item.answer;
      details.appendChild(summary);
      details.appendChild(answer);
      container.appendChild(details);
    });
  }

  function renderOtherServices(currentSlug) {
    var container = document.querySelector("[data-other-services]");
    if (!container) {
      return;
    }
    container.textContent = "";
    Object.keys(SERVICES).forEach(function (slug) {
      if (slug === currentSlug) {
        return;
      }
      var item = SERVICES[slug];
      var article = document.createElement("article");
      article.className = "card";
      var body = document.createElement("div");
      body.className = "card__body";
      var title = document.createElement("h3");
      title.className = "card__title";
      var link = document.createElement("a");
      link.setAttribute("href", "servicio.html?s=" + slug);
      link.textContent = item.name;
      title.appendChild(link);
      var text = document.createElement("p");
      text.className = "card__text";
      text.textContent = item.short;
      var meta = document.createElement("p");
      meta.className = "card__meta";
      meta.textContent = item.duration + " · " + item.price;
      body.appendChild(title);
      body.appendChild(text);
      body.appendChild(meta);
      article.appendChild(body);
      container.appendChild(article);
    });
  }

  function applyService(service, slug) {
    document.title = service.name + " — Patitas Felices";
    setText("[data-service-title]", service.name);
    setText("[data-service-eyebrow]", service.eyebrow);
    setText("[data-service-category]", service.category);
    setText("[data-service-duration]", service.duration);
    setText("[data-service-price]", service.price);
    setText("[data-service-lead]", service.lead);
    setText("[data-breadcrumb-current]", service.name);
    setText("[data-service-badge]", service.badge);
    setText("[data-service-book-label]", service.bookLabel);

    var badge = document.querySelector("[data-service-badge]");
    if (badge) {
      badge.className = "badge " + service.badgeClass;
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-service-icon]"), function (use) {
      use.setAttribute("href", service.icon);
    });

    var photo = document.querySelector("[data-service-photo]");
    if (photo) {
      photo.src = "assets/img/photos/service-" + slug + ".webp";
      photo.alt = service.photoAlt;
    }

    var bookingHref = "agendar.html?servicio=" + slug;
    setHref("[data-service-book]", bookingHref);
    setHref("[data-service-book-2]", bookingHref);
    setHref("[data-service-whatsapp]", WHATSAPP);

    renderList("[data-service-includes]", service.includes);
    renderList("[data-service-bring]", service.bring);
    renderFaq(service.faq);
    renderOtherServices(slug);

    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", service.name + ": " + service.lead);
    }
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get("s") || "consulta";
    var service = SERVICES[slug] || SERVICES.consulta;
    var safeSlug = SERVICES[slug] ? slug : "consulta";
    applyService(service, safeSlug);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
