// script.js – wersja zoptymalizowana
"use strict";

/**
 * Centralny stan aplikacji przechowuje dane tylko w pamięci przeglądarki.
 */
const state = {
  pairsOfValues: [],
  ideologies: [],
  parties: [],
  questions: []
};

// Paginacja dla pytań
let questionsCurrentPage = 0;
const QUESTIONS_PER_PAGE = 20; // można zmienić na 10, 25 itd.

const sectionTitles = {
  pairs: "Pary wartości",
  ideologies: "Ideologie",
  parties: "Partie",
  questions: "Pytania"
};

const answerListKeys = [
  "values_for",
  "values_against",
  "ideologies_for",
  "ideologies_against",
  "parties_for",
  "parties_against"
];

const els = {
  navTabs: document.querySelectorAll(".nav-tab"),
  panels: document.querySelectorAll("[data-section-panel]"),
  sectionTitle: document.getElementById("sectionTitle"),
  pairsList: document.getElementById("pairsList"),
  ideologiesList: document.getElementById("ideologiesList"),
  partiesList: document.getElementById("partiesList"),
  questionsList: document.getElementById("questionsList"),
  questionsPagination: document.getElementById("questionsPagination"),
  addPairBtn: document.getElementById("addPairBtn"),
  addIdeologyBtn: document.getElementById("addIdeologyBtn"),
  addPartyBtn: document.getElementById("addPartyBtn"),
  addQuestionBtn: document.getElementById("addQuestionBtn"),
  importBtn: document.getElementById("importBtn"),
  exportBtn: document.getElementById("exportBtn"),
  themeToggle: document.getElementById("themeToggle"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),
  importDialog: document.getElementById("importDialog"),
  exportDialog: document.getElementById("exportDialog"),
  confirmDialog: document.getElementById("confirmDialog"),
  importText: document.getElementById("importText"),
  jsonFileInput: document.getElementById("jsonFileInput"),
  applyImportBtn: document.getElementById("applyImportBtn"),
  jsonPreview: document.getElementById("jsonPreview"),
  copyJsonBtn: document.getElementById("copyJsonBtn"),
  downloadJsonBtn: document.getElementById("downloadJsonBtn"),
  validationSummary: document.getElementById("validationSummary"),
  toastHost: document.getElementById("toastHost"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmOk: document.getElementById("confirmOk")
};

let pendingConfirm = null;
let currentSection = "pairs";
let validationDebounceTimer = null;
let cleanupDebounceTimer = null;

/**
 * Uruchamia aplikację, podpina zdarzenia i dodaje przykładowe puste pytanie.
 */
function init() {
  bindGlobalEvents();
  addPair();
  addIdeology();
  addParty();
  addQuestion();
  renderCurrentSection();
  toast("Gotowe do edycji. Dane są przechowywane lokalnie w tej karcie.");
}

/**
 * Renderuje tylko aktywną sekcję – oszczędza DOM.
 */
function renderCurrentSection() {
  switch (currentSection) {
    case "pairs":
      renderPairs();
      break;
    case "ideologies":
      renderNameDescriptionList("ideologies", els.ideologiesList, "Ideologia");
      break;
    case "parties":
      renderNameDescriptionList("parties", els.partiesList, "Partia");
      break;
    case "questions":
      renderQuestions();
      renderQuestionsPagination();
      break;
  }
  renderCounters();
  scheduleValidation();
  scheduleCleanup();
}

/**
 * Odroczone walidacje i czyszczenie referencji – nie blokują interfejsu.
 */
function scheduleValidation() {
  if (validationDebounceTimer) clearTimeout(validationDebounceTimer);
  validationDebounceTimer = setTimeout(() => validateAll(), 150);
}

function scheduleCleanup() {
  if (cleanupDebounceTimer) clearTimeout(cleanupDebounceTimer);
  cleanupDebounceTimer = setTimeout(() => cleanupReferences(), 200);
}

/**
 * Podpina przyciski globalne, import, eksport i obsługę modali.
 */
function bindGlobalEvents() {
  els.navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      currentSection = tab.dataset.section;
      switchSection(currentSection);
      renderCurrentSection();
    });
  });

  els.addPairBtn.addEventListener("click", () => addPair());
  els.addIdeologyBtn.addEventListener("click", () => addIdeology());
  els.addPartyBtn.addEventListener("click", () => addParty());
  els.addQuestionBtn.addEventListener("click", () => addQuestion());
  els.importBtn.addEventListener("click", () => els.importDialog.showModal());
  els.exportBtn.addEventListener("click", openExportDialog);
  els.applyImportBtn.addEventListener("click", importFromTextarea);
  els.copyJsonBtn.addEventListener("click", copyJson);
  els.downloadJsonBtn.addEventListener("click", downloadJson);
  els.resetDemoBtn.addEventListener("click", confirmAction("Nowy projekt", "Usunąć wszystkie bieżące dane z edytora?", resetProject));
  els.themeToggle.addEventListener("click", toggleTheme);

  document.querySelectorAll(".export-check").forEach(input => {
    input.addEventListener("change", updateJsonPreview);
  });

  els.jsonFileInput.addEventListener("change", handleFileImport);

  els.confirmOk.addEventListener("click", () => {
    if (typeof pendingConfirm === "function") pendingConfirm();
    pendingConfirm = null;
    els.confirmDialog.close();
  });
}

/**
 * Przełącza widoczną sekcję edytora.
 */
function switchSection(section) {
  els.navTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.section === section));
  els.panels.forEach(panel => panel.classList.toggle("active", panel.dataset.sectionPanel === section));
  els.sectionTitle.textContent = sectionTitles[section];
}

/**
 * Włącza lub wyłącza ciemny motyw.
 */
function toggleTheme() {
  document.body.classList.toggle("dark");
  els.themeToggle.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
}

/**
 * Czyści projekt i tworzy minimalny startowy zestaw pól.
 */
function resetProject() {
  state.pairsOfValues = [];
  state.ideologies = [];
  state.parties = [];
  state.questions = [];
  questionsCurrentPage = 0;
  addPair(false);
  addIdeology(false);
  addParty(false);
  addQuestion(false);
  renderCurrentSection();
  toast("Utworzono nowy projekt.");
}

/**
 * Dodaje nową parę wartości.
 */
function addPair(shouldRender = true) {
  state.pairsOfValues.push({ left: "", right: "", leftDef: "", rightDef: "" });
  if (shouldRender) {
    renderCurrentSection();
    toast("Dodano parę wartości.");
  }
}

/**
 * Dodaje nową ideologię.
 */
function addIdeology(shouldRender = true) {
  state.ideologies.push({ name: "", description: "" });
  if (shouldRender) {
    renderCurrentSection();
    toast("Dodano ideologię.");
  }
}

/**
 * Dodaje nową partię.
 */
function addParty(shouldRender = true) {
  state.parties.push({ name: "", description: "" });
  if (shouldRender) {
    renderCurrentSection();
    toast("Dodano partię.");
  }
}

/**
 * Dodaje pytanie z domyślnym zestawem odpowiedzi.
 */
function addQuestion(shouldRender = true) {
  state.questions.push({
    id: state.questions.length + 1,
    text: "",
    description: "",
    answers: [
      createAnswer("Zdecydowanie zgadzam się", 1.5),
      createAnswer("Częściowo zgadzam się", 1),
      createAnswer("Częściowo nie zgadzam się", -1),
      createAnswer("Zdecydowanie nie zgadzam się", -1.5),
      createAnswer("Pomiń pytanie", 0)
    ]
  });
  renumberQuestions();
  // Jeśli dodajemy na innej stronie niż ostatnia, przenieś na ostatnią
  const totalPages = Math.ceil(state.questions.length / QUESTIONS_PER_PAGE);
  if (questionsCurrentPage !== totalPages - 1) {
    questionsCurrentPage = totalPages - 1;
  }
  if (shouldRender) {
    renderCurrentSection();
    toast("Dodano pytanie.");
  }
}

/**
 * Tworzy pustą odpowiedź.
 */
function createAnswer(label = "", value = 0) {
  return {
    label,
    value,
    values_for: [],
    values_against: [],
    ideologies_for: [],
    ideologies_against: [],
    parties_for: [],
    parties_against: []
  };
}

/**
 * Renderuje wszystkie części interfejsu na podstawie aktualnego stanu.
 * (Zachowane dla kompatybilności, ale w praktyce używamy renderCurrentSection)
 */
function renderAll() {
  renderCurrentSection();
}

/**
 * Aktualizuje liczniki w bocznej nawigacji.
 */
function renderCounters() {
  document.querySelector('[data-count="pairs"]').textContent = state.pairsOfValues.length;
  document.querySelector('[data-count="ideologies"]').textContent = state.ideologies.length;
  document.querySelector('[data-count="parties"]').textContent = state.parties.length;
  document.querySelector('[data-count="questions"]').textContent = state.questions.length;
}

/**
 * Renderuje listę par wartości.
 */
function renderPairs() {
  els.pairsList.innerHTML = "";
  if (!state.pairsOfValues.length) {
    els.pairsList.append(emptyState("Brak par wartości. Dodaj pierwszą oś testu."));
    return;
  }

  state.pairsOfValues.forEach((pair, index) => {
    const card = cardShell("pair", index, pair.left && pair.right ? `${pair.left} ↔ ${pair.right}` : `Para ${index + 1}`, "pairsOfValues", () => {
      removeItem(state.pairsOfValues, index, "Usunąć tę parę wartości?");
    });

    const body = card.querySelector(".card-body");
    body.append(
      twoColumn(
        inputField("left", "left", pair.left, value => updatePair(index, "left", value)),
        inputField("right", "right", pair.right, value => updatePair(index, "right", value))
      ),
      twoColumn(
        textareaField("leftDef", "leftDef", pair.leftDef, value => updatePair(index, "leftDef", value)),
        textareaField("rightDef", "rightDef", pair.rightDef, value => updatePair(index, "rightDef", value))
      )
    );
    els.pairsList.append(card);
  });

  enableDrag(els.pairsList, state.pairsOfValues, renderCurrentSection);
}

/**
 * Aktualizuje właściwość pary wartości.
 */
function updatePair(index, key, value) {
  state.pairsOfValues[index][key] = value;
  renderCounters();
  scheduleValidation();
}

/**
 * Renderuje listę ideologii albo partii.
 */
function renderNameDescriptionList(type, host, label) {
  host.innerHTML = "";
  if (!state[type].length) {
    host.append(emptyState(`Brak elementów w sekcji ${type}.`));
    return;
  }

  state[type].forEach((item, index) => {
    const card = cardShell(type, index, item.name || `${label} ${index + 1}`, type, () => {
      removeItem(state[type], index, `Usunąć element "${item.name || label}"?`);
    });
    const body = card.querySelector(".card-body");
    body.append(
      inputField("name", "name", item.name, value => {
        item.name = value;
        scheduleValidation();
      }),
      textareaField("description", "description", item.description, value => {
        item.description = value;
        scheduleValidation();
      })
    );
    host.append(card);
  });

  enableDrag(host, state[type], renderCurrentSection);
}

/**
 * Renderuje listę pytań – TYLKO dla bieżącej strony.
 */
function renderQuestions() {
  els.questionsList.innerHTML = "";
  if (!state.questions.length) {
    els.questionsList.append(emptyState("Brak pytań. Dodaj pierwsze pytanie."));
    return;
  }

  const start = questionsCurrentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(start + QUESTIONS_PER_PAGE, state.questions.length);
  const pageQuestions = state.questions.slice(start, end);

  pageQuestions.forEach((question, idx) => {
    const globalIndex = start + idx;
    const title = question.text ? `#${question.id} ${question.text}` : `Pytanie #${question.id}`;
    const card = cardShell("question", globalIndex, title, `${question.answers.length} odpowiedzi`, () => {
      removeItem(state.questions, globalIndex, "Usunąć to pytanie?");
      // Po usunięciu dostosuj stronę
      const totalPages = Math.ceil(state.questions.length / QUESTIONS_PER_PAGE);
      if (questionsCurrentPage >= totalPages && totalPages > 0) questionsCurrentPage = totalPages - 1;
      if (questionsCurrentPage < 0) questionsCurrentPage = 0;
      renderCurrentSection();
    });
    const body = card.querySelector(".card-body");
    body.append(
      twoColumn(
        inputField("id", "id", question.id, () => {}, "number", true),
        inputField("text", "text", question.text, value => {
          question.text = value;
          scheduleValidation();
        })
      ),
      textareaField("description", "description", question.description, value => {
        question.description = value;
        scheduleValidation();
      }),
      renderAnswers(question, globalIndex)
    );
    els.questionsList.append(card);
  });

  enableDrag(els.questionsList, state.questions, () => {
    renumberQuestions();
    renderCurrentSection();
  });
}

/**
 * Renderuje paginację dla sekcji pytań.
 */
function renderQuestionsPagination() {
  if (!els.questionsPagination) return;
  const totalQuestions = state.questions.length;
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  if (totalPages <= 1) {
    els.questionsPagination.innerHTML = "";
    return;
  }

  const container = els.questionsPagination;
  container.innerHTML = "";
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Poprzednia";
  prevBtn.className = "secondary-button";
  prevBtn.disabled = questionsCurrentPage === 0;
  prevBtn.addEventListener("click", () => {
    if (questionsCurrentPage > 0) {
      questionsCurrentPage--;
      renderCurrentSection();
    }
  });

  const pageInfo = document.createElement("span");
  pageInfo.textContent = `Strona ${questionsCurrentPage + 1} z ${totalPages}`;
  pageInfo.style.margin = "0 1rem";

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Następna →";
  nextBtn.className = "secondary-button";
  nextBtn.disabled = questionsCurrentPage === totalPages - 1;
  nextBtn.addEventListener("click", () => {
    if (questionsCurrentPage < totalPages - 1) {
      questionsCurrentPage++;
      renderCurrentSection();
    }
  });

  container.append(prevBtn, pageInfo, nextBtn);
}

/**
 * Renderuje odpowiedzi należące do pojedynczego pytania.
 */
function renderAnswers(question, questionIndex) {
  const block = document.createElement("div");
  block.className = "answers-block";

  const head = document.createElement("div");
  head.className = "section-head";
  head.innerHTML = `<div><h3>answers</h3><p>Listy wyboru korzystają z aktualnych wartości, ideologii i partii.</p></div>`;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "secondary-button";
  addButton.textContent = "Dodaj odpowiedź";
  addButton.addEventListener("click", () => {
    question.answers.push(createAnswer());
    renderCurrentSection();
  });
  head.append(addButton);
  block.append(head);

  const list = document.createElement("div");
  list.className = "item-list";
  question.answers.forEach((answer, answerIndex) => {
    const card = document.createElement("article");
    card.className = "answer-card";
    card.draggable = true;
    card.dataset.index = answerIndex;
    card.innerHTML = `
      <div class="answer-header">
        <span class="drag-handle" title="Przeciągnij">↕</span>
        <div>
          <div class="item-title">${escapeHtml(answer.label || `Odpowiedź ${answerIndex + 1}`)}</div>
          <div class="item-subtitle">value: ${escapeHtml(String(answer.value))}</div>
        </div>
        <div class="answer-actions"></div>
      </div>
      <div class="card-body"></div>
    `;
    const actions = card.querySelector(".answer-actions");
    const removeBtn = document.createElement("button");
    removeBtn.className = "tiny-button";
    removeBtn.type = "button";
    removeBtn.textContent = "Usuń";
    removeBtn.addEventListener("click", confirmAction("Usuń odpowiedź", "Usunąć tę odpowiedź?", () => {
      question.answers.splice(answerIndex, 1);
      renderCurrentSection();
    }));
    actions.append(removeBtn);

    const body = card.querySelector(".card-body");
    body.append(
      twoColumn(
        inputField("label", "label", answer.label, value => {
          answer.label = value;
          scheduleValidation();
        }),
        inputField("value", "value", answer.value, value => {
          answer.value = parseNumber(value);
          scheduleValidation();
        }, "number")
      ),
      multiSelectGrid(answer)
    );
    list.append(card);
  });
  block.append(list);
  enableDrag(list, question.answers, () => renderCurrentSection());
  return block;
}

/**
 * Buduje siatkę sześciu pól wielokrotnego wyboru dla odpowiedzi.
 */
function multiSelectGrid(answer) {
  const grid = document.createElement("div");
  grid.className = "multi-grid";
  // Pobieramy opcje tylko raz dla całej siatki (lekka optymalizacja)
  const valueOptions = getValueOptions();
  const ideologyOptions = state.ideologies.map(item => item.name).filter(Boolean);
  const partyOptions = state.parties.map(item => item.name).filter(Boolean);

  grid.append(
    multiSelect("values_for", valueOptions, answer.values_for, values => answer.values_for = values),
    multiSelect("values_against", valueOptions, answer.values_against, values => answer.values_against = values),
    multiSelect("ideologies_for", ideologyOptions, answer.ideologies_for, values => answer.ideologies_for = values),
    multiSelect("ideologies_against", ideologyOptions, answer.ideologies_against, values => answer.ideologies_against = values),
    multiSelect("parties_for", partyOptions, answer.parties_for, values => answer.parties_for = values),
    multiSelect("parties_against", partyOptions, answer.parties_against, values => answer.parties_against = values)
  );

  return grid;
}

/**
 * Tworzy własny multi-select z wyszukiwarką i checkboxami.
 */
function multiSelect(label, options, selected, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "multi-select";
  const safeSelected = Array.isArray(selected) ? selected : [];
  const uniqueOptions = unique([...options, ...safeSelected.filter(Boolean)]);

  wrap.innerHTML = `
    <div class="multi-label">${label}</div>
    <div class="multi-box">
      <div class="chips"></div>
      <input class="search-box" type="text" placeholder="Szukaj i zaznacz...">
      <div class="option-list"></div>
    </div>
  `;

  const chips = wrap.querySelector(".chips");
  const search = wrap.querySelector(".search-box");
  const list = wrap.querySelector(".option-list");

  const paint = () => {
    const query = search.value.trim().toLowerCase();
    chips.innerHTML = "";
    safeSelected.forEach(value => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${escapeHtml(value)} <button type="button" title="Usuń">×</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        const next = safeSelected.filter(item => item !== value);
        onChange(next);
        renderCurrentSection();
      });
      chips.append(chip);
    });

    list.innerHTML = "";
    uniqueOptions
      .filter(option => option.toLowerCase().includes(query))
      .forEach(option => {
        const item = document.createElement("label");
        item.className = "option-item";
        item.innerHTML = `<input type="checkbox" ${safeSelected.includes(option) ? "checked" : ""}> <span>${escapeHtml(option)}</span>`;
        item.querySelector("input").addEventListener("change", event => {
          const next = event.target.checked ? unique([...safeSelected, option]) : safeSelected.filter(value => value !== option);
          onChange(next);
          renderCurrentSection();
        });
        list.append(item);
      });

    if (!uniqueOptions.length) {
      list.append(emptyState("Brak dostępnych opcji."));
    }
  };

  search.addEventListener("input", paint);
  paint();
  return wrap;
}

/**
 * Tworzy bazową kartę elementu.
 */
function cardShell(type, index, title, subtitle, onRemove) {
  const card = document.createElement("article");
  card.className = "editor-card";
  card.draggable = true;
  card.dataset.index = index;
  card.dataset.type = type;
  card.innerHTML = `
    <div class="item-header">
      <span class="drag-handle" title="Przeciągnij">↕</span>
      <div>
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="item-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="item-actions"></div>
    </div>
    <div class="card-body"></div>
  `;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "tiny-button";
  removeButton.textContent = "Usuń";
  removeButton.addEventListener("click", confirmAction("Usuń element", "Tej operacji nie można cofnąć.", onRemove));
  card.querySelector(".item-actions").append(removeButton);
  return card;
}

/**
 * Tworzy pole tekstowe.
 */
function inputField(id, label, value, onInput, type = "text", readonly = false) {
  const field = document.createElement("label");
  field.className = "field";
  field.innerHTML = `<span>${label}</span><input type="${type}" value="${escapeAttribute(value ?? "")}" ${readonly ? "readonly" : ""}>`;
  const input = field.querySelector("input");
  if (type === "number") input.step = "any";
  input.addEventListener("input", event => onInput(event.target.value));
  input.dataset.fieldId = id;
  return field;
}

/**
 * Tworzy wieloliniowe pole tekstowe.
 */
function textareaField(id, label, value, onInput) {
  const field = document.createElement("label");
  field.className = "field";
  field.innerHTML = `<span>${label}</span><textarea>${escapeHtml(value ?? "")}</textarea>`;
  const textarea = field.querySelector("textarea");
  textarea.addEventListener("input", event => onInput(event.target.value));
  textarea.dataset.fieldId = id;
  return field;
}

/**
 * Układa dwa elementy formularza obok siebie.
 */
function twoColumn(first, second) {
  const grid = document.createElement("div");
  grid.className = "grid-two";
  grid.append(first, second);
  return grid;
}

/**
 * Tworzy czytelny pusty stan listy.
 */
function emptyState(text) {
  const box = document.createElement("div");
  box.className = "empty-state";
  box.textContent = text;
  return box;
}

/**
 * Umożliwia zmianę kolejności elementów przez przeciąganie.
 */
function enableDrag(container, array, afterDrop) {
  let draggedIndex = null;

  container.querySelectorAll("[draggable='true']").forEach(item => {
    item.addEventListener("dragstart", event => {
      draggedIndex = Number(item.dataset.index);
      item.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragend", () => item.classList.remove("dragging"));

    item.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("drop", event => {
      event.preventDefault();
      const targetIndex = Number(item.dataset.index);
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      const [moved] = array.splice(draggedIndex, 1);
      array.splice(targetIndex, 0, moved);
      draggedIndex = null;
      afterDrop();
      toast("Zmieniono kolejność.");
    });
  });
}

/**
 * Usuwa element z tablicy.
 */
function removeItem(array, index, message) {
  array.splice(index, 1);
  renderCurrentSection();
  toast(message ? "Usunięto element." : "Usunięto.");
}

/**
 * Otwiera modal potwierdzenia.
 */
function confirmAction(title, message, callback) {
  return () => {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    pendingConfirm = callback;
    els.confirmDialog.showModal();
  };
}

/**
 * Przelicza identyfikatory pytań.
 */
function renumberQuestions() {
  state.questions.forEach((question, index) => {
    question.id = index + 1;
  });
}

/**
 * Zwraca wszystkie wartości dostępne dla pól values_for i values_against.
 */
function getValueOptions() {
  return unique(state.pairsOfValues.flatMap(pair => [pair.left, pair.right]).filter(Boolean));
}

/**
 * Usuwa z odpowiedzi referencje, które nie istnieją już w źródłowych sekcjach.
 */
function cleanupReferences() {
  const allowed = {
    values_for: getValueOptions(),
    values_against: getValueOptions(),
    ideologies_for: state.ideologies.map(item => item.name).filter(Boolean),
    ideologies_against: state.ideologies.map(item => item.name).filter(Boolean),
    parties_for: state.parties.map(item => item.name).filter(Boolean),
    parties_against: state.parties.map(item => item.name).filter(Boolean)
  };

  state.questions.forEach(question => {
    question.answers.forEach(answer => {
      answerListKeys.forEach(key => {
        answer[key] = ensureArray(answer[key]).filter(value => allowed[key].includes(value));
      });
    });
  });
}

/**
 * Sprawdza wymagane pola (odroczone).
 */
function validateAll() {
  document.querySelectorAll(".invalid").forEach(node => node.classList.remove("invalid"));
  const errors = [];

  state.pairsOfValues.forEach((pair, index) => {
    if (!pair.left.trim() || !pair.right.trim()) errors.push(`Para ${index + 1}: uzupełnij left i right.`);
  });

  validateNamedCollection(state.ideologies, "Ideologia", errors);
  validateNamedCollection(state.parties, "Partia", errors);

  state.questions.forEach(question => {
    if (!question.text.trim()) errors.push(`Pytanie ${question.id}: uzupełnij text.`);
    question.answers.forEach((answer, index) => {
      if (!answer.label.trim()) errors.push(`Pytanie ${question.id}, odpowiedź ${index + 1}: uzupełnij label.`);
      if (Number.isNaN(Number(answer.value))) errors.push(`Pytanie ${question.id}, odpowiedź ${index + 1}: value musi być liczbą.`);
    });
  });

  // Opcjonalnie wyświetl błędy w export dialogu przy podglądzie
  const summaryDiv = document.getElementById("validationSummary");
  if (summaryDiv) {
    summaryDiv.innerHTML = errors.slice(0, 8).map(e => `<div>${escapeHtml(e)}</div>`).join("");
    if (errors.length > 8) summaryDiv.innerHTML += `<div>...oraz ${errors.length - 8} więcej.</div>`;
  }
  return errors;
}

/**
 * Waliduje kolekcje z polami name.
 */
function validateNamedCollection(collection, label, errors) {
  collection.forEach((item, index) => {
    if (!item.name.trim()) errors.push(`${label} ${index + 1}: uzupełnij name.`);
  });
}

/**
 * Otwiera okno eksportu.
 */
function openExportDialog() {
  updateJsonPreview();
  els.exportDialog.showModal();
}

/**
 * Tworzy obiekt eksportu tylko z zaznaczonych sekcji.
 */
function buildExportObject() {
  renumberQuestions();
  const selected = [...document.querySelectorAll(".export-check:checked")].map(input => input.value);
  const output = {};

  if (selected.includes("pairsOfValues")) output.pairsOfValues = clone(state.pairsOfValues);
  if (selected.includes("ideologies")) output.ideologies = clone(state.ideologies);
  if (selected.includes("parties")) output.parties = clone(state.parties);
  if (selected.includes("questions")) output.questions = clone(state.questions);

  return output;
}

/**
 * Aktualizuje podgląd JSON.
 */
function updateJsonPreview() {
  const errors = validateAll(); // walidacja tutaj może być, bo robi się ją tylko na żądanie eksportu
  els.jsonPreview.value = JSON.stringify(buildExportObject(), null, 2);
}

/**
 * Kopiuje JSON do schowka.
 */
async function copyJson() {
  updateJsonPreview();
  try {
    await navigator.clipboard.writeText(els.jsonPreview.value);
    toast("Skopiowano JSON do schowka.");
  } catch {
    els.jsonPreview.select();
    document.execCommand("copy");
    toast("Skopiowano JSON.");
  }
}

/**
 * Pobiera JSON jako plik.
 */
function downloadJson() {
  updateJsonPreview();
  const blob = new Blob([els.jsonPreview.value], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "konfiguracja-testu.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  toast("Rozpoczęto pobieranie pliku.");
}

/**
 * Importuje JSON wklejony do pola tekstowego – asynchronicznie, z loaderem.
 */
async function importFromTextarea() {
  const raw = els.importText.value.trim();
  if (!raw) {
    toast("Wklej JSON albo wybierz plik.", "error");
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    toast(`Nie udało się wczytać JSON: ${error.message}`, "error");
    return;
  }

  toast("Importowanie dużego zestawu danych...", "info");
  // Ustępujemy głównemu wątkowi, by pokazać toast
  await new Promise(resolve => setTimeout(resolve, 10));

  try {
    applyImportedData(data);
    // Po imporcie ustaw stronę pytań na pierwszą
    questionsCurrentPage = 0;
    renderCurrentSection();
    els.importDialog.close();
    toast("Zaimportowano JSON.");
  } catch (error) {
    toast(`Błąd podczas importu: ${error.message}`, "error");
  }
}

/**
 * Odczytuje wybrany plik JSON.
 */
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    els.importText.value = reader.result;
    toast("Plik wczytany do pola importu.");
  };
  reader.onerror = () => toast("Nie udało się odczytać pliku.", "error");
  reader.readAsText(file, "utf-8");
}

/**
 * Normalizuje importowane dane i przenosi je do stanu aplikacji.
 */
function applyImportedData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("główny element musi być obiektem");
  }

  state.pairsOfValues = ensureArray(data.pairsOfValues).map(item => ({
    left: stringValue(item.left),
    right: stringValue(item.right),
    leftDef: stringValue(item.leftDef),
    rightDef: stringValue(item.rightDef)
  }));

  state.ideologies = ensureArray(data.ideologies).map(normalizeNamedItem);
  state.parties = ensureArray(data.parties).map(normalizeNamedItem);

  state.questions = ensureArray(data.questions).map((question, index) => ({
    id: index + 1,
    text: stringValue(question.text),
    description: stringValue(question.description),
    answers: ensureArray(question.answers).map(normalizeAnswer)
  }));

  if (!state.questions.length) addQuestion(false);
  // Nie wywołujemy renderAll() tutaj – zrobi to funkcja wołająca
}

/**
 * Normalizuje obiekt z polami name i description.
 */
function normalizeNamedItem(item = {}) {
  return {
    name: stringValue(item.name),
    description: stringValue(item.description)
  };
}

/**
 * Normalizuje odpowiedź po imporcie.
 */
function normalizeAnswer(item = {}) {
  const answer = createAnswer(stringValue(item.label), parseNumber(item.value));
  answerListKeys.forEach(key => {
    answer[key] = ensureArray(item[key]).map(stringValue).filter(Boolean);
  });
  return answer;
}

/**
 * Wyświetla krótkie powiadomienie typu toast.
 */
function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  els.toastHost.append(item);
  setTimeout(() => item.remove(), 3600);
}

/**
 * Zwraca tablicę unikalnych wartości.
 */
function unique(values) {
  return [...new Set(values)];
}

/**
 * Gwarantuje tablicę.
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Konwertuje na string.
 */
function stringValue(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Konwertuje na liczbę.
 */
function parseNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Tworzy głęboką kopię.
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Zabezpiecza tekst przed HTML.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Zabezpiecza wartości w atrybutach.
 */
function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init();
