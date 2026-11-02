/* ==========================================================================
   Patitas Felices — Booking flow (S5, S8, S9, S10)
   Shared by the four booking pages:
     agendar.html              data-booking-page="step1"
     agendar-paso-2.html       data-booking-page="step2"
     agendar-paso-3.html       data-booking-page="step3"
     cita-confirmada.html      data-booking-page="confirmation"

   The draft lives in sessionStorage under pf-booking-draft and expires after
   24 hours. No data is sent to a server. The exit modal is a native <dialog>
   injected here; window.confirm, window.alert and beforeunload are never used.
   ========================================================================== */

(function () {
  "use strict";

  var DRAFT_KEY = "pf-booking-draft";
  var CONFIRMED_KEY = "pf-booking-confirmed";
  var BLOCKED_KEY = "pf-booking-blocked-slots";
  var CONFLICT_FLAG_KEY = "pf-booking-conflict-shown";
  var CONFLICT_SLOT_KEY = "pf-booking-conflict-slot";
  var DRAFT_TTL = 24 * 60 * 60 * 1000;

  var LOCATION =
    "Av. Francisco de Miranda, Torre Country, local 3, Los Ruices, Caracas";
  var PRICE_NOTE = "o su equivalente en Bs a tasa BCV del día";

  /* Mobiles 04XX and Caracas-style landlines 02XX, 11 digits total. */
  var PHONE_RE = /^(?:04(?:12|14|16|24|26)|02\d{2})-?\d{7}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var SERVICES = {
    consulta: {
      label: "Consulta general",
      duration: 30,
      durationLabel: "30 min",
      price: "Desde $25"
    },
    vacunacion: {
      label: "Vacunación",
      duration: 20,
      durationLabel: "20 min",
      price: "Desde $35"
    },
    cirugia: {
      label: "Cirugía",
      duration: 90,
      durationLabel: "60 a 120 min",
      price: "Desde $180"
    },
    peluqueria: {
      label: "Peluquería",
      duration: 60,
      durationLabel: "60 min",
      price: "Desde $20"
    },
    emergencias: {
      label: "Emergencias 24/7",
      duration: 30,
      durationLabel: "Evaluación inmediata",
      price: "Desde $45"
    }
  };

  var PET_TYPES = {
    perro: "Perro",
    gato: "Gato",
    exotica: "Mascota exótica"
  };

  var MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  var saveCurrent = function () {};

  /* ==========================================================================
     Storage helpers
     ========================================================================== */
  function storageGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      /* Storage can be blocked; the current page still works. */
    }
  }

  function storageRemove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      /* Ignore. */
    }
  }

  function safeParse(value) {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function readDraft() {
    var draft = safeParse(storageGet(DRAFT_KEY));
    if (!draft || typeof draft !== "object") {
      return null;
    }
    if (!draft.updatedAt || Date.now() - draft.updatedAt > DRAFT_TTL) {
      storageRemove(DRAFT_KEY);
      return null;
    }
    return draft;
  }

  function writeDraft(patch) {
    var current = readDraft() || {};
    var next = Object.assign({}, current, patch, { updatedAt: Date.now() });
    storageSet(DRAFT_KEY, JSON.stringify(next));
    return next;
  }

  function clearDraft() {
    storageRemove(DRAFT_KEY);
  }

  function hasDraftData(draft) {
    if (!draft) {
      return false;
    }
    return Boolean(
      draft.step > 1 ||
        draft.service ||
        draft.petType ||
        draft.petName ||
        draft.petAge ||
        draft.date ||
        draft.time ||
        draft.ownerName ||
        draft.ownerPhone ||
        draft.ownerEmail ||
        draft.notes
    );
  }

  function hasStep1(draft) {
    return Boolean(
      draft &&
        draft.service &&
        SERVICES[draft.service] &&
        draft.petType &&
        PET_TYPES[draft.petType] &&
        draft.petName &&
        draft.petAge
    );
  }

  function hasStep2(draft) {
    return Boolean(hasStep1(draft) && draft.date && draft.time);
  }

  function resolveResumeStep(draft) {
    if (!hasStep1(draft)) {
      return 1;
    }
    if (draft.step === 3 && hasStep2(draft)) {
      return 3;
    }
    if (draft.step === 2) {
      return 2;
    }
    if (draft.step === 3) {
      return 2;
    }
    return 1;
  }

  function readConfirmed() {
    var confirmed = safeParse(storageGet(CONFIRMED_KEY));
    if (!confirmed || typeof confirmed !== "object") {
      return null;
    }
    if (
      !confirmed.code ||
      !confirmed.serviceLabel ||
      !confirmed.petName ||
      !confirmed.date ||
      !confirmed.time
    ) {
      return null;
    }
    return confirmed;
  }

  function readBlockedSlots() {
    var list = safeParse(storageGet(BLOCKED_KEY));
    return Array.isArray(list) ? list : [];
  }

  function isBlockedSlot(date, time) {
    return readBlockedSlots().indexOf(date + "|" + time) !== -1;
  }

  function blockSlot(date, time) {
    var list = readBlockedSlots();
    var key = date + "|" + time;
    if (list.indexOf(key) === -1) {
      list.push(key);
      storageSet(BLOCKED_KEY, JSON.stringify(list));
    }
  }

  function clearBlockedSlots() {
    storageRemove(BLOCKED_KEY);
  }

  function isConflictShown() {
    return storageGet(CONFLICT_FLAG_KEY) === "1";
  }

  function markConflict(slot) {
    storageSet(CONFLICT_FLAG_KEY, "1");
    storageSet(CONFLICT_SLOT_KEY, JSON.stringify(slot));
    blockSlot(slot.date, slot.time);
  }

  function readConflictSlot() {
    return safeParse(storageGet(CONFLICT_SLOT_KEY));
  }

  function clearConflictState() {
    storageRemove(CONFLICT_FLAG_KEY);
    storageRemove(CONFLICT_SLOT_KEY);
  }

  /* ==========================================================================
     Dates, availability and demo conflict
     ========================================================================== */
  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDateKey(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function parseDateKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayKey() {
    return formatDateKey(startOfDay(new Date()));
  }

  function isPastDate(key) {
    return key < todayKey();
  }

  function isSunday(key) {
    return parseDateKey(key).getDay() === 0;
  }

  function isDayDisabled(key, service) {
    if (isPastDate(key)) {
      return true;
    }
    if (isSunday(key) && service !== "emergencias") {
      return true;
    }
    return false;
  }

  function formatTimeFromMinutes(totalMinutes) {
    var hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    var minutes = String(totalMinutes % 60).padStart(2, "0");
    return hours + ":" + minutes;
  }

  function getSlotsForDate(key, service) {
    if (isDayDisabled(key, service)) {
      return [];
    }
    var date = parseDateKey(key);
    var lastSlot = date.getDay() === 6 ? 13 * 60 : 16 * 60 + 30;
    var slots = [];
    for (var minutes = 9 * 60; minutes <= lastSlot; minutes += 30) {
      slots.push(formatTimeFromMinutes(minutes));
    }
    return slots;
  }

  function formatTime12(time) {
    var parts = time.split(":").map(Number);
    var hours = parts[0];
    var minutes = String(parts[1]).padStart(2, "0");
    var suffix = hours >= 12 ? "p. m." : "a. m.";
    var hour12 = hours % 12 || 12;
    return hour12 + ":" + minutes + " " + suffix;
  }

  function formatDateLong(key) {
    var formatted = new Intl.DateTimeFormat("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(parseDateKey(key));
    return formatted.replace(",", "");
  }

  function formatDateShort(key) {
    var formatted = new Intl.DateTimeFormat("es-VE", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(parseDateKey(key));
    formatted = formatted.replace(",", "");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function formatMonthLabel(year, month) {
    var label = MONTHS[month] + " " + year;
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function hashString(value) {
    var hash = 0;
    for (var index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }

  function getDemoConflictSlot() {
    var date = addDays(startOfDay(new Date()), 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date = addDays(date, 1);
    }
    return { date: formatDateKey(date), time: "09:00" };
  }

  function isSlotUnavailable(key, time, service) {
    if (isDayDisabled(key, service)) {
      return true;
    }
    if (isBlockedSlot(key, time)) {
      return true;
    }
    var demo = getDemoConflictSlot();
    if (key === demo.date && time === demo.time && !isConflictShown()) {
      return false;
    }
    return hashString(key + "|" + time + "|" + service) % 7 === 0;
  }

  function findNearestAvailableSlots(origin, service, count) {
    var results = [];
    var originDate = parseDateKey(origin.date);
    for (var offset = 0; offset < 21 && results.length < count; offset += 1) {
      var date = addDays(originDate, offset);
      var key = formatDateKey(date);
      if (isDayDisabled(key, service)) {
        continue;
      }
      var slots = getSlotsForDate(key, service);
      for (var index = 0; index < slots.length; index += 1) {
        var time = slots[index];
        if (offset === 0 && time <= origin.time) {
          continue;
        }
        if (isSlotUnavailable(key, time, service)) {
          continue;
        }
        results.push({ date: key, time: time });
        if (results.length >= count) {
          break;
        }
      }
    }
    return results;
  }

  /* ==========================================================================
     Validation helpers
     ========================================================================== */
  function setError(control, errorEl, message) {
    if (!errorEl) {
      return;
    }
    var text = errorEl.querySelector("[data-error-text]");
    if (text) {
      text.textContent = message;
    }
    errorEl.hidden = false;
    if (control) {
      control.setAttribute("aria-invalid", "true");
      if (errorEl.id) {
        control.setAttribute("aria-describedby", errorEl.id);
      }
      var group = control.closest(".field, .booking-choice-group");
      if (group) {
        group.classList.add("field--error");
      }
    }
  }

  function clearError(control, errorEl) {
    if (errorEl) {
      errorEl.hidden = true;
    }
    if (control) {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      var group = control.closest(".field, .booking-choice-group");
      if (group) {
        group.classList.remove("field--error");
      }
    }
  }

  function focusControl(control) {
    if (!control) {
      return;
    }
    control.focus();
    if (typeof control.scrollIntoView === "function") {
      control.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function checkedRadio(name) {
    return document.querySelector('input[name="' + name + '"]:checked');
  }

  function selectedService() {
    var radio = checkedRadio("service");
    return radio ? radio.value : "";
  }

  function selectedPetType() {
    var radio = checkedRadio("petType");
    return radio ? radio.value : "";
  }

  function serviceFromQuery() {
    var slug = new URLSearchParams(window.location.search).get("servicio");
    return slug && SERVICES[slug] ? slug : "";
  }

  function formatPriceNote() {
    return PRICE_NOTE;
  }

  function setText(selector, value) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.textContent = value;
    });
  }

  function setHidden(selector, hidden) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.hidden = hidden;
    });
  }

  /* ==========================================================================
     Guard notices
     ========================================================================== */
  function showGuardNotice() {
    var notice = document.querySelector("[data-guard-notice]");
    if (!notice) {
      return;
    }
    var aviso = new URLSearchParams(window.location.search).get("aviso");
    var messages = {
      paso1:
        "Completa el servicio y los datos de tu mascota para elegir fecha y hora.",
      paso2:
        "Elige una fecha y un horario para continuar con los datos del dueño.",
      paso3:
        "Completa los datos del dueño y confirma la cita para ver el resumen final."
    };
    if (!aviso || !messages[aviso]) {
      return;
    }
    var text = notice.querySelector("[data-guard-text]");
    if (text) {
      text.textContent = messages[aviso];
    }
    notice.hidden = false;
    notice.setAttribute("tabindex", "-1");
    notice.focus();
  }

  function redirect(url) {
    window.location.replace(url);
  }

  /* ==========================================================================
     Exit modal (custom <dialog>, never window.confirm)
     ========================================================================== */
  function setupExitGuard(saveCallback) {
    saveCurrent = saveCallback;

    if (document.getElementById("exit-modal")) {
      return;
    }

    var dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.id = "exit-modal";
    dialog.setAttribute("aria-labelledby", "exit-modal-title");
    dialog.innerHTML =
      '<div class="modal__header">' +
      '<h2 class="modal__title" id="exit-modal-title">¿Quieres salir?</h2>' +
      '<button class="btn btn--ghost btn--icon" type="button" data-exit-cancel aria-label="Cerrar">' +
      '<svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-close"></use></svg>' +
      "</button>" +
      "</div>" +
      '<div class="modal__body">' +
      "<p>Guardamos lo que llevas para que puedas continuar después. Si sales ahora, podrás retomar la cita en el paso en el que estabas.</p>" +
      "</div>" +
      '<div class="modal__footer">' +
      '<button class="btn btn--secondary" type="button" data-exit-cancel>Seguir agendando</button>' +
      '<button class="btn btn--primary" type="button" data-exit-save>Guardar y salir</button>' +
      "</div>";
    document.body.appendChild(dialog);

    var pendingHref = "";
    var lastLink = null;

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener("close", function () {
      if (lastLink && typeof lastLink.focus === "function") {
        lastLink.focus();
      }
    });

    Array.prototype.forEach.call(
      dialog.querySelectorAll("[data-exit-cancel]"),
      function (button) {
        button.addEventListener("click", function () {
          dialog.close();
        });
      }
    );

    var saveButton = dialog.querySelector("[data-exit-save]");
    if (saveButton) {
      saveButton.addEventListener("click", function () {
        saveCurrent();
        dialog.close();
        if (pendingHref) {
          window.location.href = pendingHref;
        }
      });
    }

    document.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest("a[href]") : null;
      if (!link || !link.closest(".site-header, .site-footer")) {
        return;
      }
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") {
        return;
      }
      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (error) {
        return;
      }
      if (url.origin !== window.location.origin) {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return;
      }
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!hasDraftData(readDraft())) {
        return;
      }
      event.preventDefault();
      pendingHref = url.href;
      lastLink = link;
      if (!dialog.open) {
        dialog.showModal();
      }
    });
  }

  /* ==========================================================================
     Step 1 — service, pet and emergency question
     ========================================================================== */
  function initStep1() {
    showGuardNotice();

    var form = document.querySelector("[data-booking-form]");
    if (!form) {
      return;
    }

    var banner = document.querySelector("[data-resume-banner]");
    var content = document.querySelector("[data-booking-content]");
    var emergencyPanel = document.querySelector("[data-emergency-panel]");
    var emergencyRadios = document.querySelectorAll('input[name="emergency"]');
    var serviceGroup = document.querySelector("[data-service-group]");
    var serviceError = document.querySelector('[data-error="service"]');
    var petTypeGroup = document.querySelector("[data-pet-type-group]");
    var petTypeError = document.querySelector('[data-error="petType"]');
    var petName = document.getElementById("pet-name");
    var petAge = document.getElementById("pet-age");
    var petAgeUnit = document.getElementById("pet-age-unit");
    var petNameError = document.getElementById("pet-name-error");
    var petAgeError = document.getElementById("pet-age-error");

    function composeAge(value, unit) {
      var number = String(value || "").trim();
      if (!number) {
        return "";
      }
      return number + " " + (unit === "años" ? "años" : "meses");
    }

    function parseAge(draft) {
      if (draft && draft.petAgeValue) {
        return {
          value: String(draft.petAgeValue),
          unit: draft.petAgeUnit === "años" ? "años" : "meses"
        };
      }
      var old = draft && draft.petAge ? String(draft.petAge) : "";
      var match = old.match(/^\s*(\d+)\s*(mes(?:es)?|años?|anos?)?/i);
      if (!match) {
        return { value: "", unit: "meses" };
      }
      return {
        value: match[1],
        unit: /año|ano/i.test(match[2] || "") ? "años" : "meses"
      };
    }

    function currentValues() {
      var value = petAge ? petAge.value.trim() : "";
      var unit = petAgeUnit ? petAgeUnit.value : "meses";
      return {
        service: selectedService(),
        petType: selectedPetType(),
        petName: petName ? petName.value.trim() : "",
        petAgeValue: value,
        petAgeUnit: unit,
        petAge: composeAge(value, unit)
      };
    }

    function saveStep1() {
      writeDraft(Object.assign({}, currentValues(), { step: 1 }));
    }

    function updateSummary() {
      var values = currentValues();
      var service = SERVICES[values.service] || SERVICES.consulta;
      var petTypeLabel = PET_TYPES[values.petType] || "Mascota";
      setText("[data-summary-service]", service.label);
      setText(
        "[data-summary-pet]",
        (values.petName || "Tu mascota") + " · " + petTypeLabel
      );
      setText("[data-summary-price]", service.price);
      setText("[data-summary-price-note]", formatPriceNote());
      setText("[data-summary-date]", "Por elegir");
    }

    function populate(draft) {
      var queryService = serviceFromQuery();
      var service =
        queryService ||
        (draft && SERVICES[draft.service] ? draft.service : "consulta");
      var serviceRadio = document.querySelector(
        'input[name="service"][value="' + service + '"]'
      );
      if (serviceRadio) {
        serviceRadio.checked = true;
      }

      var petType =
        draft && PET_TYPES[draft.petType] ? draft.petType : "perro";
      var petTypeRadio = document.querySelector(
        'input[name="petType"][value="' + petType + '"]'
      );
      if (petTypeRadio) {
        petTypeRadio.checked = true;
      }

      if (petName) {
        petName.value = draft && draft.petName ? draft.petName : "";
      }
      if (petAge) {
        var parsedAge = parseAge(draft);
        petAge.value = parsedAge.value;
        if (petAgeUnit) {
          petAgeUnit.value = parsedAge.unit;
        }
      }
    }

    function resetForm() {
      var consulta = document.querySelector(
        'input[name="service"][value="consulta"]'
      );
      var perro = document.querySelector(
        'input[name="petType"][value="perro"]'
      );
      if (consulta) {
        consulta.checked = true;
      }
      if (perro) {
        perro.checked = true;
      }
      if (petName) {
        petName.value = "";
      }
      if (petAge) {
        petAge.value = "";
      }
      if (petAgeUnit) {
        petAgeUnit.value = "meses";
      }
      clearError(serviceGroup, serviceError);
      clearError(petTypeGroup, petTypeError);
      clearError(petName, petNameError);
      clearError(petAge, petAgeError);
      updateSummary();
    }

    function updateResumeBanner() {
      if (!banner) {
        return;
      }
      var draft = readDraft();
      if (!hasDraftData(draft)) {
        banner.hidden = true;
        return;
      }
      var step = resolveResumeStep(draft);
      var text = banner.querySelector("[data-resume-text]");
      if (text) {
        text.textContent =
          "Tienes una cita en progreso" +
          (draft.petName ? " para " + draft.petName : "") +
          ". Continúa en el paso " +
          step +
          " de 3.";
      }
      banner.hidden = false;
    }

    function showEmergency() {
      if (content) {
        content.hidden = true;
      }
      if (banner) {
        banner.hidden = true;
      }
      if (emergencyPanel) {
        emergencyPanel.hidden = false;
        var heading = emergencyPanel.querySelector("[data-emergency-title]");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus();
        }
      }
    }

    function showForm() {
      if (content) {
        content.hidden = false;
      }
      if (emergencyPanel) {
        emergencyPanel.hidden = true;
      }
      updateResumeBanner();
    }

    function validatePetName() {
      if (!petName) {
        return true;
      }
      if (!petName.value.trim()) {
        setError(
          petName,
          petNameError,
          "Escribe el nombre de tu mascota."
        );
        return false;
      }
      clearError(petName, petNameError);
      return true;
    }

    function validatePetAge() {
      if (!petAge) {
        return true;
      }
      var value = petAge.value.trim();
      var unit = petAgeUnit ? petAgeUnit.value : "meses";
      if (!value || !/^\d+$/.test(value)) {
        setError(
          petAge,
          petAgeError,
          "Indica la edad de tu mascota en meses o años. Ejemplo: 8 meses o 3 años."
        );
        return false;
      }
      var months = Number(value) * (unit === "años" ? 12 : 1);
      if (!Number.isFinite(months) || months < 1 || months > 360) {
        setError(
          petAge,
          petAgeError,
          "Indica una edad válida entre 1 mes y 30 años."
        );
        return false;
      }
      clearError(petAge, petAgeError);
      return true;
    }

    function validateStep1() {
      var firstInvalid = null;

      if (!selectedService()) {
        setError(serviceGroup, serviceError, "Elige un servicio para continuar.");
        firstInvalid =
          firstInvalid || document.querySelector('input[name="service"]');
      } else {
        clearError(serviceGroup, serviceError);
      }

      if (!selectedPetType()) {
        setError(
          petTypeGroup,
          petTypeError,
          "Elige el tipo de mascota para continuar."
        );
        firstInvalid =
          firstInvalid || document.querySelector('input[name="petType"]');
      } else {
        clearError(petTypeGroup, petTypeError);
      }

      if (!validatePetName()) {
        firstInvalid = firstInvalid || petName;
      }
      if (!validatePetAge()) {
        firstInvalid = firstInvalid || petAge;
      }

      if (firstInvalid) {
        focusControl(firstInvalid);
        return false;
      }
      return true;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateStep1()) {
        return;
      }
      saveStep1();
      writeDraft({ step: 2 });
      window.location.href = "agendar-paso-2.html";
    });

    form.addEventListener("input", function (event) {
      saveStep1();
      updateSummary();
      if (event.target === petName && petName.getAttribute("aria-invalid") === "true") {
        validatePetName();
      }
      if (event.target === petAge && petAge.getAttribute("aria-invalid") === "true") {
        validatePetAge();
      }
    });

    form.addEventListener("change", function (event) {
      saveStep1();
      updateSummary();
      if (event.target.name === "service") {
        clearError(serviceGroup, serviceError);
      }
      if (event.target.name === "petType") {
        clearError(petTypeGroup, petTypeError);
      }
    });

    if (petName) {
      petName.addEventListener("blur", validatePetName);
    }
    if (petAge) {
      petAge.addEventListener("blur", validatePetAge);
    }
    if (petAgeUnit) {
      petAgeUnit.addEventListener("change", function () {
        saveStep1();
        if (petAge && petAge.getAttribute("aria-invalid") === "true") {
          validatePetAge();
        }
      });
    }

    Array.prototype.forEach.call(emergencyRadios, function (radio) {
      radio.addEventListener("change", function () {
        if (radio.checked && radio.value === "si") {
          showEmergency();
        } else if (radio.checked) {
          showForm();
        }
      });
    });

    var emergencyBack = document.querySelector("[data-emergency-back]");
    if (emergencyBack) {
      emergencyBack.addEventListener("click", function () {
        var no = document.querySelector(
          'input[name="emergency"][value="no"]'
        );
        if (no) {
          no.checked = true;
        }
        showForm();
        if (petName) {
          petName.focus();
        }
      });
    }

    if (banner) {
      var resumeButton = banner.querySelector("[data-resume]");
      var discardButton = banner.querySelector("[data-discard]");
      if (resumeButton) {
        resumeButton.addEventListener("click", function () {
          var draft = readDraft();
          var step = resolveResumeStep(draft);
          if (step === 1) {
            banner.hidden = true;
            if (petName) {
              petName.focus();
            }
          } else if (step === 2) {
            window.location.href = "agendar-paso-2.html";
          } else {
            window.location.href = "agendar-paso-3.html";
          }
        });
      }
      if (discardButton) {
        discardButton.addEventListener("click", function () {
          clearDraft();
          clearBlockedSlots();
          clearConflictState();
          banner.hidden = true;
          resetForm();
        });
      }
    }

    populate(readDraft());
    updateSummary();
    updateResumeBanner();
    showForm();
    setupExitGuard(saveStep1);

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        populate(readDraft());
        updateSummary();
        updateResumeBanner();
      }
    });
  }

  /* ==========================================================================
     Step 2 — calendar and slots
     ========================================================================== */
  function initStep2() {
    var draft = readDraft();
    if (!hasStep1(draft)) {
      redirect("agendar.html?aviso=paso1");
      return;
    }

    showGuardNotice();

    var calendarGrid = document.querySelector("[data-calendar-grid]");
    var monthLabel = document.querySelector("[data-calendar-month]");
    var prevButton = document.querySelector("[data-calendar-prev]");
    var nextButton = document.querySelector("[data-calendar-next]");
    var slotsTitle = document.querySelector("[data-slots-title]");
    var slotsHint = document.querySelector("[data-slots-hint]");
    var slotGrid = document.querySelector("[data-slot-grid]");
    var stepError = document.querySelector("[data-step2-error]");
    var conflictAlert = document.querySelector("[data-conflict-alert]");
    var conflictText = document.querySelector("[data-conflict-text]");
    var alternatives = document.querySelector("[data-alternatives]");
    var conflictStatus = document.querySelector("[data-conflict-status]");
    var demoText = document.querySelector("[data-demo-text]");
    var demoButton = document.querySelector("[data-demo-conflict]");

    var demo = getDemoConflictSlot();
    var state = {
      service: draft.service,
      viewYear: 0,
      viewMonth: 0,
      selectedDate: draft.date || "",
      selectedTime: draft.time || ""
    };

    if (state.selectedDate) {
      var selected = parseDateKey(state.selectedDate);
      state.viewYear = selected.getFullYear();
      state.viewMonth = selected.getMonth();
    } else {
      var demoDate = parseDateKey(demo.date);
      state.viewYear = demoDate.getFullYear();
      state.viewMonth = demoDate.getMonth();
    }

    if (
      state.selectedTime &&
      isSlotUnavailable(state.selectedDate, state.selectedTime, state.service)
    ) {
      state.selectedTime = "";
      writeDraft({ time: "" });
    }

    function saveStep2() {
      writeDraft({
        date: state.selectedDate,
        time: state.selectedTime,
        step: 2
      });
    }

    function updateSummary() {
      var service = SERVICES[state.service] || SERVICES.consulta;
      setText("[data-summary-service]", service.label);
      setText(
        "[data-summary-pet]",
        (draft.petName || "Tu mascota") +
          " · " +
          (PET_TYPES[draft.petType] || "Mascota")
      );
      var dateText = "Por elegir";
      if (state.selectedDate && state.selectedTime) {
        dateText =
          formatDateLong(state.selectedDate) +
          ", " +
          formatTime12(state.selectedTime);
      } else if (state.selectedDate) {
        dateText = formatDateLong(state.selectedDate) + " · elige un horario";
      }
      setText("[data-summary-date]", dateText);
      setText("[data-summary-price]", service.price);
      setText("[data-summary-price-note]", formatPriceNote());
    }

    function renderCalendar() {
      if (!calendarGrid) {
        return;
      }
      if (monthLabel) {
        monthLabel.textContent = formatMonthLabel(
          state.viewYear,
          state.viewMonth
        );
      }
      if (prevButton) {
        var today = new Date();
        prevButton.disabled =
          state.viewYear === today.getFullYear() &&
          state.viewMonth === today.getMonth();
      }

      calendarGrid.textContent = "";
      var first = new Date(state.viewYear, state.viewMonth, 1);
      var offset = (first.getDay() + 6) % 7;
      for (var empty = 0; empty < offset; empty += 1) {
        var spacer = document.createElement("span");
        spacer.className = "calendar-day calendar-day--outside";
        spacer.setAttribute("aria-hidden", "true");
        calendarGrid.appendChild(spacer);
      }

      var totalDays = new Date(
        state.viewYear,
        state.viewMonth + 1,
        0
      ).getDate();
      for (var day = 1; day <= totalDays; day += 1) {
        var date = new Date(state.viewYear, state.viewMonth, day);
        var key = formatDateKey(date);
        var disabled = isDayDisabled(key, state.service);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "calendar-day";
        button.dataset.date = key;
        button.textContent = String(day);
        button.setAttribute(
          "aria-label",
          formatDateLong(key) +
            ", " +
            (disabled ? "no disponible" : "disponible")
        );
        if (disabled) {
          button.disabled = true;
        }
        if (key === todayKey()) {
          button.classList.add("calendar-day--today");
        }
        if (key === state.selectedDate) {
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
          button.setAttribute(
            "aria-label",
            formatDateLong(key) + ", seleccionado"
          );
        }
        if (!disabled) {
          button.addEventListener("click", function (selectedKey) {
            return function () {
              selectDate(selectedKey);
            };
          }(key));
        }
        calendarGrid.appendChild(button);
      }
    }

    function renderSlots() {
      if (!slotGrid) {
        return;
      }
      slotGrid.textContent = "";
      if (!state.selectedDate) {
        if (slotsTitle) {
          slotsTitle.textContent = "Horarios";
        }
        if (slotsHint) {
          slotsHint.textContent = "Elige un día para ver los horarios.";
          slotsHint.hidden = false;
        }
        return;
      }

      if (slotsTitle) {
        slotsTitle.textContent =
          "Horarios del " + formatDateLong(state.selectedDate);
      }

      var slots = getSlotsForDate(state.selectedDate, state.service);
      var available = slots.filter(function (time) {
        return !isSlotUnavailable(state.selectedDate, time, state.service);
      });

      if (!slots.length) {
        if (slotsHint) {
          slotsHint.textContent =
            "No hay atención para este día. Elige otro día.";
          slotsHint.hidden = false;
        }
        return;
      }
      if (!available.length) {
        if (slotsHint) {
          slotsHint.textContent =
            "No quedan horarios disponibles para este día. Elige otro día.";
          slotsHint.hidden = false;
        }
        return;
      }

      if (slotsHint) {
        slotsHint.hidden = true;
      }

      slots.forEach(function (time) {
        var unavailable = isSlotUnavailable(
          state.selectedDate,
          time,
          state.service
        );
        var button = document.createElement("button");
        button.type = "button";
        button.className = "slot";
        button.dataset.time = time;
        button.textContent = formatTime12(time);
        if (unavailable) {
          button.disabled = true;
          button.setAttribute(
            "aria-label",
            formatTime12(time) + ", no disponible"
          );
        } else {
          button.setAttribute(
            "aria-label",
            formatTime12(time) + ", disponible"
          );
          button.addEventListener("click", function () {
            selectTime(time);
          });
        }
        if (time === state.selectedTime) {
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
        }
        slotGrid.appendChild(button);
      });
    }

    function selectDate(key) {
      state.selectedDate = key;
      state.selectedTime = "";
      if (stepError) {
        stepError.hidden = true;
      }
      saveStep2();
      renderCalendar();
      renderSlots();
      updateSummary();
      if (slotsTitle) {
        slotsTitle.setAttribute("tabindex", "-1");
        slotsTitle.focus();
      }
    }

    function selectTime(time) {
      state.selectedTime = time;
      if (stepError) {
        stepError.hidden = true;
      }
      saveStep2();
      renderSlots();
      updateSummary();
      var selectedSlot = document.querySelector(
        '[data-slot-grid] .slot[data-time="' + time + '"]'
      );
      if (selectedSlot) {
        selectedSlot.focus();
      }
    }

    function showConflict() {
      if (!conflictAlert) {
        return;
      }
      if (new URLSearchParams(window.location.search).get("conflicto") !== "1") {
        return;
      }
      var origin = readConflictSlot() || demo;
      var suggestions = findNearestAvailableSlots(origin, state.service, 3);
      if (conflictText) {
        conflictText.textContent =
          "El horario del " +
          formatDateLong(origin.date) +
          " a las " +
          formatTime12(origin.time) +
          " se ocupó mientras completabas la cita. Tus datos se conservan. Elige uno de estos horarios cercanos:";
      }
      if (alternatives) {
        alternatives.textContent = "";
        suggestions.forEach(function (suggestion) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn--secondary";
          button.dataset.alternative = "true";
          button.dataset.date = suggestion.date;
          button.dataset.time = suggestion.time;
          button.textContent =
            formatDateShort(suggestion.date) +
            " · " +
            formatTime12(suggestion.time);
          button.addEventListener("click", function () {
            chooseAlternative(suggestion);
          });
          alternatives.appendChild(button);
        });
      }
      conflictAlert.hidden = false;
      conflictAlert.setAttribute("tabindex", "-1");
      conflictAlert.focus();
    }

    function chooseAlternative(suggestion) {
      var date = parseDateKey(suggestion.date);
      state.viewYear = date.getFullYear();
      state.viewMonth = date.getMonth();
      state.selectedDate = suggestion.date;
      state.selectedTime = suggestion.time;
      saveStep2();
      renderCalendar();
      renderSlots();
      updateSummary();
      if (conflictAlert) {
        conflictAlert.hidden = true;
      }
      if (conflictStatus) {
        conflictStatus.textContent =
          "Horario actualizado a " +
          formatDateLong(suggestion.date) +
          ", " +
          formatTime12(suggestion.time) +
          " — revisa y continúa.";
        conflictStatus.hidden = false;
      }
      try {
        window.history.replaceState({}, "", "agendar-paso-2.html");
      } catch (error) {
        /* Ignore. */
      }
      var selectedSlot = document.querySelector(
        '[data-slot-grid] .slot[data-time="' + suggestion.time + '"]'
      );
      if (selectedSlot) {
        selectedSlot.focus();
      }
    }

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        state.viewMonth -= 1;
        if (state.viewMonth < 0) {
          state.viewMonth = 11;
          state.viewYear -= 1;
        }
        renderCalendar();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        state.viewMonth += 1;
        if (state.viewMonth > 11) {
          state.viewMonth = 0;
          state.viewYear += 1;
        }
        renderCalendar();
      });
    }

    var continueButton = document.querySelector("[data-step2-continue]");
    if (continueButton) {
      continueButton.addEventListener("click", function () {
        if (!state.selectedDate || !state.selectedTime) {
          if (stepError) {
            stepError.hidden = false;
            stepError.setAttribute("tabindex", "-1");
            stepError.focus();
          }
          return;
        }
        saveStep2();
        writeDraft({ step: 3 });
        window.location.href = "agendar-paso-3.html";
      });
    }

    if (demoText) {
      demoText.textContent =
        "El primer horario del próximo día hábil a las 9:00 (" +
        formatDateShort(demo.date) +
        ", " +
        formatTime12(demo.time) +
        ") simulará estar ocupado al confirmar la cita.";
    }
    if (demoButton) {
      if (isBlockedSlot(demo.date, demo.time)) {
        demoButton.hidden = true;
        if (demoText) {
          demoText.textContent =
            "El conflicto de demo ya se activó en esta sesión. Elige otro horario para continuar.";
        }
      } else {
        demoButton.addEventListener("click", function () {
          var date = parseDateKey(demo.date);
          state.viewYear = date.getFullYear();
          state.viewMonth = date.getMonth();
          state.selectedDate = demo.date;
          state.selectedTime = demo.time;
          saveStep2();
          renderCalendar();
          renderSlots();
          updateSummary();
          var selectedSlot = document.querySelector(
            '[data-slot-grid] .slot[data-time="' + demo.time + '"]'
          );
          if (selectedSlot) {
            selectedSlot.focus();
          }
        });
      }
    }

    renderCalendar();
    renderSlots();
    updateSummary();
    showConflict();
    setupExitGuard(saveStep2);

    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) {
        return;
      }
      var latest = readDraft();
      if (!hasStep1(latest)) {
        redirect("agendar.html?aviso=paso1");
        return;
      }
      state.service = latest.service;
      state.selectedDate = latest.date || "";
      state.selectedTime = latest.time || "";
      if (state.selectedDate) {
        var selectedDate = parseDateKey(state.selectedDate);
        state.viewYear = selectedDate.getFullYear();
        state.viewMonth = selectedDate.getMonth();
      }
      renderCalendar();
      renderSlots();
      updateSummary();
    });
  }

  /* ==========================================================================
     Step 3 — owner data, summary and confirmation
     ========================================================================== */
  function initStep3() {
    var draft = readDraft();
    if (!hasStep1(draft)) {
      redirect("agendar.html?aviso=paso1");
      return;
    }
    if (!hasStep2(draft)) {
      redirect("agendar-paso-2.html?aviso=paso2");
      return;
    }

    showGuardNotice();

    var form = document.querySelector("[data-booking-form]");
    var ownerName = document.getElementById("owner-name");
    var ownerPhone = document.getElementById("owner-phone");
    var ownerEmail = document.getElementById("owner-email");
    var ownerNotes = document.getElementById("owner-notes");
    var ownerNameError = document.getElementById("owner-name-error");
    var ownerPhoneError = document.getElementById("owner-phone-error");
    var ownerEmailError = document.getElementById("owner-email-error");
    var demoText = document.querySelector("[data-demo-text]");

    function updateSummary() {
      var service = SERVICES[draft.service] || SERVICES.consulta;
      setText("[data-summary-service]", service.label);
      setText(
        "[data-summary-pet]",
        draft.petName +
          " · " +
          (PET_TYPES[draft.petType] || "Mascota") +
          " · " +
          draft.petAge
      );
      setText(
        "[data-summary-date]",
        formatDateLong(draft.date) + ", " + formatTime12(draft.time)
      );
      setText("[data-summary-price]", service.price);
      setText("[data-summary-price-note]", formatPriceNote());
    }

    function populate() {
      var latest = readDraft() || draft;
      draft = latest;
      if (ownerName) {
        ownerName.value = latest.ownerName || "";
      }
      if (ownerPhone) {
        ownerPhone.value = latest.ownerPhone || "";
      }
      if (ownerEmail) {
        ownerEmail.value = latest.ownerEmail || "";
      }
      if (ownerNotes) {
        ownerNotes.value = latest.notes || "";
      }
      updateSummary();
    }

    function saveOwnerFields() {
      writeDraft({
        ownerName: ownerName ? ownerName.value.trim() : "",
        ownerPhone: ownerPhone ? ownerPhone.value.trim() : "",
        ownerEmail: ownerEmail ? ownerEmail.value.trim() : "",
        notes: ownerNotes ? ownerNotes.value.trim() : "",
        step: 3
      });
    }

    function validateOwnerName() {
      if (!ownerName) {
        return true;
      }
      if (!ownerName.value.trim()) {
        setError(
          ownerName,
          ownerNameError,
          "Escribe el nombre del dueño."
        );
        return false;
      }
      clearError(ownerName, ownerNameError);
      return true;
    }

    function validateOwnerPhone() {
      if (!ownerPhone) {
        return true;
      }
      var value = ownerPhone.value.trim();
      if (!value) {
        setError(
          ownerPhone,
          ownerPhoneError,
          "Escribe tu teléfono. Ejemplo: 0412-5550198 o 0212-5551234."
        );
        return false;
      }
      if (!PHONE_RE.test(value)) {
        setError(
          ownerPhone,
          ownerPhoneError,
          "Escribe un teléfono válido de 11 dígitos. Ejemplo: 0412-5550198 o 0212-5551234."
        );
        return false;
      }
      clearError(ownerPhone, ownerPhoneError);
      return true;
    }

    function validateOwnerEmail() {
      if (!ownerEmail) {
        return true;
      }
      var value = ownerEmail.value.trim();
      if (!value) {
        setError(
          ownerEmail,
          ownerEmailError,
          "Escribe tu correo electrónico."
        );
        return false;
      }
      if (!EMAIL_RE.test(value)) {
        setError(
          ownerEmail,
          ownerEmailError,
          "Escribe un correo válido. Ejemplo: nombre@correo.com."
        );
        return false;
      }
      clearError(ownerEmail, ownerEmailError);
      return true;
    }

    function validateOwner() {
      var firstInvalid = null;
      if (!validateOwnerName()) {
        firstInvalid = firstInvalid || ownerName;
      }
      if (!validateOwnerPhone()) {
        firstInvalid = firstInvalid || ownerPhone;
      }
      if (!validateOwnerEmail()) {
        firstInvalid = firstInvalid || ownerEmail;
      }
      if (firstInvalid) {
        focusControl(firstInvalid);
        return false;
      }
      return true;
    }

    if (form) {
      form.addEventListener("input", function (event) {
        saveOwnerFields();
        if (
          event.target === ownerName &&
          ownerName.getAttribute("aria-invalid") === "true"
        ) {
          validateOwnerName();
        }
        if (
          event.target === ownerPhone &&
          ownerPhone.getAttribute("aria-invalid") === "true"
        ) {
          validateOwnerPhone();
        }
        if (
          event.target === ownerEmail &&
          ownerEmail.getAttribute("aria-invalid") === "true"
        ) {
          validateOwnerEmail();
        }
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateOwner()) {
          return;
        }
        saveOwnerFields();

        var latest = readDraft();
        var demo = getDemoConflictSlot();
        if (
          latest.date === demo.date &&
          latest.time === demo.time &&
          !isConflictShown()
        ) {
          markConflict(demo);
          writeDraft({ time: "", step: 2 });
          window.location.href = "agendar-paso-2.html?conflicto=1";
          return;
        }

        var service = SERVICES[latest.service] || SERVICES.consulta;
        var confirmed = {
          code: createBookingCode(),
          service: latest.service,
          serviceLabel: service.label,
          servicePrice: service.price,
          durationLabel: service.durationLabel,
          durationMinutes: service.duration,
          petType: latest.petType,
          petTypeLabel: PET_TYPES[latest.petType] || "Mascota",
          petName: latest.petName,
          petAge: latest.petAge,
          date: latest.date,
          time: latest.time,
          ownerName: latest.ownerName,
          ownerPhone: latest.ownerPhone,
          ownerEmail: latest.ownerEmail,
          notes: latest.notes || "",
          createdAt: Date.now()
        };
        storageSet(CONFIRMED_KEY, JSON.stringify(confirmed));
        window.location.href = "cita-confirmada.html";
      });
    }

    if (ownerName) {
      ownerName.addEventListener("blur", validateOwnerName);
    }
    if (ownerPhone) {
      ownerPhone.addEventListener("blur", validateOwnerPhone);
    }
    if (ownerEmail) {
      ownerEmail.addEventListener("blur", validateOwnerEmail);
    }

    if (demoText) {
      var demo = getDemoConflictSlot();
      if (isConflictShown()) {
        demoText.textContent =
          "El conflicto de demo ya se activó en esta sesión. Si eliges otro horario, la confirmación será normal.";
      } else {
        demoText.textContent =
          "Si confirmas el horario de demo (" +
          formatDateShort(demo.date) +
          ", " +
          formatTime12(demo.time) +
          "), volverás al paso 2 con el aviso de conflicto.";
      }
    }

    populate();
    setupExitGuard(saveOwnerFields);

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        populate();
      }
    });
  }

  /* ==========================================================================
     Confirmation
     ========================================================================== */
  function createBookingCode() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var now = new Date();
    var prefix =
      "PF-" +
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, "0");
    var suffix = "";
    for (var index = 0; index < 4; index += 1) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return prefix + "-" + suffix;
  }

  function combineDateTime(dateKey, time) {
    var date = parseDateKey(dateKey);
    var parts = time.split(":").map(Number);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      parts[0],
      parts[1],
      0,
      0
    );
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatIcsLocal(date) {
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      "00"
    );
  }

  function formatIcsUtc(date) {
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      "Z"
    );
  }

  function icsEscape(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  function buildIcs(booking) {
    var start = combineDateTime(booking.date, booking.time);
    var end = new Date(
      start.getTime() + (booking.durationMinutes || 30) * 60 * 1000
    );
    var description =
      "Cita para " +
      booking.petName +
      " (" +
      booking.petTypeLabel +
      ", " +
      booking.petAge +
      "). Código " +
      booking.code +
      ". Teléfono " +
      booking.ownerPhone +
      ".";
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Patitas Felices//Citas//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + booking.code + "@patitasfelices.com.ve",
      "DTSTAMP:" + formatIcsUtc(new Date()),
      "DTSTART:" + formatIcsLocal(start),
      "DTEND:" + formatIcsLocal(end),
      "SUMMARY:" + icsEscape(booking.serviceLabel + " — Patitas Felices"),
      "LOCATION:" + icsEscape(LOCATION),
      "DESCRIPTION:" + icsEscape(description),
      "END:VEVENT",
      "END:VCALENDAR",
      ""
    ];
    return lines.join("\r\n");
  }

  function buildWhatsAppText(booking) {
    return [
      "Hola, comparto mi cita en Patitas Felices:",
      "Código: " + booking.code,
      "Servicio: " + booking.serviceLabel,
      "Mascota: " +
        booking.petName +
        " (" +
        booking.petTypeLabel +
        ", " +
        booking.petAge +
        ")",
      "Fecha: " +
        formatDateLong(booking.date) +
        ", " +
        formatTime12(booking.time),
      "Sede: " + LOCATION,
      "Dueño: " + booking.ownerName,
      ""
    ].join("\n");
  }

  function downloadIcs(booking) {
    var ics = buildIcs(booking);
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "patitas-felices-cita.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function initConfirmation() {
    var booking = readConfirmed();
    if (!booking) {
      var draft = readDraft();
      if (hasStep2(draft)) {
        redirect("agendar-paso-3.html?aviso=paso3");
      } else if (hasStep1(draft)) {
        redirect("agendar-paso-2.html?aviso=paso2");
      } else {
        redirect("agendar.html?aviso=paso1");
      }
      return;
    }

    clearDraft();
    clearBlockedSlots();
    clearConflictState();

    setText("[data-booking-code]", booking.code);
    setText("[data-confirmed-service]", booking.serviceLabel);
    setText(
      "[data-confirmed-pet]",
      booking.petName +
        " · " +
        booking.petTypeLabel +
        " · " +
        booking.petAge
    );
    setText(
      "[data-confirmed-date]",
      formatDateLong(booking.date) + ", " + formatTime12(booking.time)
    );
    setText("[data-confirmed-owner]", booking.ownerName);
    setText("[data-confirmed-phone]", booking.ownerPhone);
    setText("[data-confirmed-email]", booking.ownerEmail);
    setText(
      "[data-confirmed-notes]",
      booking.notes ? booking.notes : "Sin notas adicionales."
    );
    setText("[data-confirmed-price]", booking.servicePrice);
    setText("[data-confirmed-price-note]", formatPriceNote());

    var whatsappLink = document.querySelector("[data-whatsapp-share]");
    if (whatsappLink) {
      whatsappLink.setAttribute(
        "href",
        "https://wa.me/?text=" +
          encodeURIComponent(buildWhatsAppText(booking))
      );
    }

    var icsButton = document.querySelector("[data-ics]");
    if (icsButton) {
      icsButton.addEventListener("click", function () {
        downloadIcs(booking);
      });
    }
  }

  /* ==========================================================================
     Bootstrap
     ========================================================================== */
  function init() {
    var page = document.body.getAttribute("data-booking-page");
    if (!page) {
      return;
    }
    if (page === "step1") {
      initStep1();
    } else if (page === "step2") {
      initStep2();
    } else if (page === "step3") {
      initStep3();
    } else if (page === "confirmation") {
      initConfirmation();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
