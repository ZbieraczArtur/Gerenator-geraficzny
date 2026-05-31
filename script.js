// script.js
/*****  PEŁNY EDYTOR KONFIGURACJI IDEOLOGICZNYCH *****/
// Zarządzanie stanem, drag & drop, multi-select z wyszukiwarką, import/export

// ---------- STAN APLIKACJI ----------
let appState = {
  pairsOfValues: [],
  ideologies: [],
  parties: [],
  questions: []
};

// Pomocnicze ID dla nowych elementów (questions mają id numeryczne)
let nextQuestionId = 1;

// Referencje DOM
const pairsContainer = document.getElementById('pairsList');
const ideologiesContainer = document.getElementById('ideologiesList');
const partiesContainer = document.getElementById('partiesList');
const questionsContainer = document.getElementById('questionsList');

// Modal i elementy
const modal = document.getElementById('appModal');
const modalTitle = document.getElementById('modalTitle');
const modalContentDiv = document.getElementById('modalContent');
let currentModalCallback = null;
let currentModalContext = null;

// Toast
const toastRoot = document.getElementById('toastRoot');
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  toastRoot.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// ---------- RENDEROWANIE WSZYSTKICH LIST (z drag & drop) ----------
function renderAll() {
  renderList('pairs', pairsContainer, appState.pairsOfValues, (item) => `${item.left} ⇄ ${item.right}`);
  renderList('ideologies', ideologiesContainer, appState.ideologies, (item) => item.name);
  renderList('parties', partiesContainer, appState.parties, (item) => item.name);
  renderQuestionsList(); // osobne dla pytań (bardziej złożone)
  attachDragAndDrop(); // po każdym renderze odświeżamy drag events
}

function renderList(type, container, items, displayFn) {
  container.innerHTML = '';
  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'drag-item';
    div.setAttribute('draggable', 'true');
    div.setAttribute('data-index', idx);
    div.setAttribute('data-list-type', type);
    div.innerHTML = `
      <div class="item-info">${displayFn(item)}</div>
      <div class="item-actions">
        <button class="edit-item" data-type="${type}" data-index="${idx}">✏️</button>
        <button class="delete-item" data-type="${type}" data-index="${idx}">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderQuestionsList() {
  questionsContainer.innerHTML = '';
  appState.questions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'drag-item';
    div.setAttribute('draggable', 'true');
    div.setAttribute('data-index', idx);
    div.setAttribute('data-list-type', 'questions');
    div.innerHTML = `
      <div class="item-info"><strong>#${q.id}</strong> ${q.text.substring(0, 70)}${q.text.length>70?'…':''}</div>
      <div class="item-actions">
        <button class="edit-item" data-type="questions" data-index="${idx}">✏️</button>
        <button class="delete-item" data-type="questions" data-index="${idx}">🗑️</button>
      </div>
    `;
    questionsContainer.appendChild(div);
  });
}

// ---------- DRAG & DROP (zmiana kolejności) ----------
let dragSource = null;
function attachDragAndDrop() {
  const draggables = document.querySelectorAll('.drag-item');
  draggables.forEach(el => {
    el.removeEventListener('dragstart', dragStartHandler);
    el.removeEventListener('dragover', dragOverHandler);
    el.removeEventListener('dragenter', dragEnterHandler);
    el.removeEventListener('dragleave', dragLeaveHandler);
    el.removeEventListener('drop', dropHandler);
    el.addEventListener('dragstart', dragStartHandler);
    el.addEventListener('dragover', dragOverHandler);
    el.addEventListener('dragenter', dragEnterHandler);
    el.addEventListener('dragleave', dragLeaveHandler);
    el.addEventListener('drop', dropHandler);
  });
}
function dragStartHandler(e) {
  dragSource = e.target.closest('.drag-item');
  e.dataTransfer.setData('text/plain', 'move');
  e.dataTransfer.effectAllowed = 'move';
}
function dragOverHandler(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function dragEnterHandler(e) { e.preventDefault(); e.target.closest('.drag-item')?.classList.add('drag-over'); }
function dragLeaveHandler(e) { e.target.closest('.drag-item')?.classList.remove('drag-over'); }
function dropHandler(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.drag-item');
  if (!dragSource || !targetItem || dragSource === targetItem) return;
  const sourceContainer = dragSource.parentNode;
  const targetContainer = targetItem.parentNode;
  if (sourceContainer !== targetContainer) return;
  const sourceIndex = parseInt(dragSource.getAttribute('data-index'));
  const targetIndex = parseInt(targetItem.getAttribute('data-index'));
  const listType = dragSource.getAttribute('data-list-type');
  if (isNaN(sourceIndex) || isNaN(targetIndex)) return;
  // zmiana w stanie
  if (listType === 'pairs') moveInArray(appState.pairsOfValues, sourceIndex, targetIndex);
  else if (listType === 'ideologies') moveInArray(appState.ideologies, sourceIndex, targetIndex);
  else if (listType === 'parties') moveInArray(appState.parties, sourceIndex, targetIndex);
  else if (listType === 'questions') {
    moveInArray(appState.questions, sourceIndex, targetIndex);
    reorderQuestionsIds(); // po zmianie kolejności przelicz id
  }
  renderAll();
  dragSource.classList.remove('drag-over');
  targetItem.classList.remove('drag-over');
  dragSource = null;
  showToast('Kolejność zmieniona', 'info');
}
function moveInArray(arr, from, to) {
  const element = arr[from];
  arr.splice(from, 1);
  arr.splice(to, 0, element);
}
function reorderQuestionsIds() {
  appState.questions.forEach((q, idx) => { q.id = idx + 1; });
  nextQuestionId = appState.questions.length + 1;
}

// ---------- OBSŁUGA EDYCJI / DODAWANIA (modale) ----------
function openModal(title, bodyHtml, onConfirm) {
  modalTitle.innerText = title;
  modalContentDiv.innerHTML = bodyHtml;
  modal.classList.remove('hidden');
  const confirmBtn = modal.querySelector('.confirm-modal');
  const cancelBtn = modal.querySelector('.cancel-modal');
  const closeBtn = modal.querySelector('.modal-close');
  const newConfirm = () => { onConfirm(); closeModal(); };
  confirmBtn.onclick = newConfirm;
  const closeModalFn = () => closeModal();
  cancelBtn.onclick = closeModalFn;
  closeBtn.onclick = closeModalFn;
}
function closeModal() { modal.classList.add('hidden'); }

// Dodawanie / edycja pary wartości
function editPair(index, isNew) {
  const pair = isNew ? { left: '', right: '', leftDef: '', rightDef: '' } : appState.pairsOfValues[index];
  const html = `
    <div class="form-group"><label>Left</label><input id="left" value="${escapeHtml(pair.left)}"></div>
    <div class="form-group"><label>Right</label><input id="right" value="${escapeHtml(pair.right)}"></div>
    <div class="form-group"><label>LeftDef</label><textarea id="leftDef">${escapeHtml(pair.leftDef)}</textarea></div>
    <div class="form-group"><label>RightDef</label><textarea id="rightDef">${escapeHtml(pair.rightDef)}</textarea></div>
  `;
  openModal(isNew ? 'Nowa para wartości' : 'Edytuj parę', html, () => {
    const newPair = {
      left: document.getElementById('left').value.trim(),
      right: document.getElementById('right').value.trim(),
      leftDef: document.getElementById('leftDef').value,
      rightDef: document.getElementById('rightDef').value,
    };
    if (!newPair.left || !newPair.right) { showToast('Left i Right nie mogą być puste', 'error'); return; }
    if (isNew) appState.pairsOfValues.push(newPair);
    else appState.pairsOfValues[index] = newPair;
    renderAll();
    showToast('Zapisano', 'success');
  });
}
// Ideologie / partie (ogólne)
function editSimpleItem(listType, index, isNew) {
  const list = appState[listType];
  const item = isNew ? { name: '', description: '' } : list[index];
  const html = `
    <div class="form-group"><label>Nazwa</label><input id="name" value="${escapeHtml(item.name)}"></div>
    <div class="form-group"><label>Opis (wieloliniowy, \\n zostanie zachowany)</label><textarea id="desc">${escapeHtml(item.description)}</textarea></div>
  `;
  openModal(isNew ? `Dodaj ${listType.slice(0,-1)}` : `Edytuj ${listType.slice(0,-1)}`, html, () => {
    const newItem = { name: document.getElementById('name').value.trim(), description: document.getElementById('desc').value };
    if (!newItem.name) { showToast('Nazwa wymagana', 'error'); return; }
    if (isNew) list.push(newItem);
    else list[index] = newItem;
    renderAll();
    showToast('Zapisano', 'success');
  });
}

// Pytanie z odpowiedziami (złożona edycja)
function editQuestion(index, isNew) {
  const q = isNew ? { id: nextQuestionId++, text: '', description: '', answers: [] } : appState.questions[index];
  // przygotujemy edytor odpowiedzi oraz główne pola
  function buildForm() {
    return `
      <div class="form-group"><label>Treść pytania</label><input id="qText" value="${escapeHtml(q.text)}"></div>
      <div class="form-group"><label>Opis (\\n jako nowa linia)</label><textarea id="qDesc">${escapeHtml(q.description)}</textarea></div>
      <div class="answers-editor" id="answersEditor"></div>
      <button type="button" id="addAnswerBtn" class="btn secondary">+ Dodaj odpowiedź</button>
    `;
  }
  function renderAnswersEditor() {
    const container = document.getElementById('answersEditor');
    if (!container) return;
    container.innerHTML = '';
    q.answers.forEach((ans, idx) => {
      const ansDiv = document.createElement('div');
      ansDiv.className = 'answer-item';
      ansDiv.innerHTML = `
        <strong>Odpowiedź ${idx+1}: ${escapeHtml(ans.label)} (wartość: ${ans.value})</strong>
        <button class="edit-answer" data-idx="${idx}">✏️ Edytuj</button>
        <button class="delete-answer" data-idx="${idx}">🗑️ Usuń</button>
        <div class="answer-details hidden" id="answerDetail-${idx}"></div>
      `;
      container.appendChild(ansDiv);
    });
    // eventy edycji
    document.querySelectorAll('.edit-answer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const aIdx = parseInt(btn.dataset.idx);
        editAnswer(q, aIdx, () => { renderAnswersEditor(); });
      });
    });
    document.querySelectorAll('.delete-answer').forEach(btn => {
      btn.addEventListener('click', () => {
        const aIdx = parseInt(btn.dataset.idx);
        q.answers.splice(aIdx,1);
        renderAnswersEditor();
      });
    });
  }
  function editAnswer(question, ansIdx, onSaved) {
    const ans = question.answers[ansIdx] || { label: '', value: 0, values_for: [], values_against: [], ideologies_for: [], ideologies_against: [], parties_for: [], parties_against: [] };
    const pairsNames = appState.pairsOfValues.flatMap(p => [p.left, p.right]);
    const ideologyNames = appState.ideologies.map(i => i.name);
    const partyNames = appState.parties.map(p => p.name);
    const multiSelect = (fieldName, options, selected) => buildMultiSelectHtml(fieldName, options, selected);
    const html = `
      <div class="form-group"><label>Etykieta odpowiedzi</label><input id="ansLabel" value="${escapeHtml(ans.label)}"></div>
      <div class="form-group"><label>Wartość liczbowa</label><input id="ansValue" type="number" step="0.5" value="${ans.value}"></div>
      ${multiSelect('values_for', pairsNames, ans.values_for)}
      ${multiSelect('values_against', pairsNames, ans.values_against)}
      ${multiSelect('ideologies_for', ideologyNames, ans.ideologies_for)}
      ${multiSelect('ideologies_against', ideologyNames, ans.ideologies_against)}
      ${multiSelect('parties_for', partyNames, ans.parties_for)}
      ${multiSelect('parties_against', partyNames, ans.parties_against)}
    `;
    openModal('Edytuj odpowiedź', html, () => {
      ans.label = document.getElementById('ansLabel').value.trim();
      ans.value = parseFloat(document.getElementById('ansValue').value);
      if (isNaN(ans.value)) ans.value = 0;
      ans.values_for = getMultiSelected('values_for');
      ans.values_against = getMultiSelected('values_against');
      ans.ideologies_for = getMultiSelected('ideologies_for');
      ans.ideologies_against = getMultiSelected('ideologies_against');
      ans.parties_for = getMultiSelected('parties_for');
      ans.parties_against = getMultiSelected('parties_against');
      if (!ans.label) showToast('Etykieta wymagana', 'error');
      else { onSaved(); showToast('Odpowiedź zapisana'); }
    });
  }
  function buildMultiSelectHtml(field, options, selected) {
    const safeSelected = new Set(selected || []);
    return `<div class="form-group"><label>${field.replace(/_/g,' ')}</label>
      <div class="multi-select-field" data-field="${field}">
        <div class="selected-tags" id="tags-${field}"></div>
        <input type="text" class="search-input" placeholder="Szukaj..." data-field="${field}">
        <div class="checkbox-list" id="list-${field}"></div>
      </div>
      <input type="hidden" id="hid-${field}" value="${selected.join(',')}">
    </div>`;
  }
  function getMultiSelected(field) {
    const hidden = document.getElementById(`hid-${field}`);
    return hidden ? hidden.value.split(',').filter(v=>v) : [];
  }
  function attachMultiSelectEvents() {
    const fields = ['values_for','values_against','ideologies_for','ideologies_against','parties_for','parties_against'];
    fields.forEach(f => {
      const container = document.querySelector(`.multi-select-field[data-field="${f}"]`);
      if (!container) return;
      const hidden = document.getElementById(`hid-${f}`);
      const update = () => {
        const selected = hidden.value.split(',').filter(v=>v);
        const tagsDiv = document.getElementById(`tags-${f}`);
        tagsDiv.innerHTML = selected.map(val => `<span class="tag">${escapeHtml(val)}<button data-val="${val}" class="remove-tag">✖</button></span>`).join('');
        document.querySelectorAll(`#tags-${f} .remove-tag`).forEach(btn => {
          btn.onclick = () => {
            const val = btn.dataset.val;
            let arr = hidden.value.split(',').filter(v=>v && v!==val);
            hidden.value = arr.join(',');
            update();
            renderChecklist();
          };
        });
        renderChecklist();
      };
      const renderChecklist = () => {
        const searchInput = container.querySelector('.search-input');
        const searchTerm = searchInput.value.toLowerCase();
        let options = [];
        if (f.includes('values')) options = appState.pairsOfValues.flatMap(p=>[p.left,p.right]);
        else if (f.includes('ideologies')) options = appState.ideologies.map(i=>i.name);
        else options = appState.parties.map(p=>p.name);
        const selectedSet = new Set(hidden.value.split(',').filter(v=>v));
        const filtered = options.filter(opt => opt.toLowerCase().includes(searchTerm));
        const listDiv = document.getElementById(`list-${f}`);
        listDiv.innerHTML = filtered.map(opt => `<label><input type="checkbox" value="${escapeHtml(opt)}" ${selectedSet.has(opt)?'checked':''}> ${escapeHtml(opt)}</label>`).join('');
        listDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.addEventListener('change', () => {
            let current = hidden.value.split(',').filter(v=>v);
            if (cb.checked && !current.includes(cb.value)) current.push(cb.value);
            else if (!cb.checked) current = current.filter(v=>v !== cb.value);
            hidden.value = current.join(',');
            update();
          });
        });
      };
      container.querySelector('.search-input').addEventListener('input', renderChecklist);
      update();
    });
  }

  function fullQuestionModal() {
    const mainHtml = buildForm();
    openModal(isNew ? 'Nowe pytanie' : 'Edytuj pytanie', mainHtml, () => {
      q.text = document.getElementById('qText').value.trim();
      q.description = document.getElementById('qDesc').value;
      if (!q.text) { showToast('Treść pytania wymagana'); return; }
      if (isNew) appState.questions.push(q);
      else appState.questions[index] = q;
      renderAll();
      showToast('Pytanie zapisane');
    });
    setTimeout(() => {
      renderAnswersEditor();
      document.getElementById('addAnswerBtn')?.addEventListener('click', () => {
        const newAns = { label: '', value: 0, values_for: [], values_against: [], ideologies_for: [], ideologies_against: [], parties_for: [], parties_against: [] };
        q.answers.push(newAns);
        renderAnswersEditor();
      });
    }, 50);
  }
  fullQuestionModal();
}

// ---------- IMPORT I EKSPORT ----------
function showExportModal() {
  const exportHtml = document.getElementById('exportModalContent').innerHTML;
  openModal('Eksportuj JSON', exportHtml, () => {});
  const checkboxes = document.querySelectorAll('#modalContent input[type="checkbox"]');
  const previewArea = document.getElementById('jsonPreview');
  function updatePreview() {
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    const exportObj = {};
    if (selected.includes('pairsOfValues')) exportObj.pairsOfValues = appState.pairsOfValues;
    if (selected.includes('ideologies')) exportObj.ideologies = appState.ideologies;
    if (selected.includes('parties')) exportObj.parties = appState.parties;
    if (selected.includes('questions')) exportObj.questions = appState.questions;
    previewArea.value = JSON.stringify(exportObj, null, 2);
  }
  checkboxes.forEach(cb => cb.addEventListener('change', updatePreview));
  updatePreview();
  document.getElementById('copyJsonBtn').onclick = () => { navigator.clipboard.writeText(previewArea.value); showToast('Skopiowano!'); };
  document.getElementById('downloadJsonBtn').onclick = () => {
    const blob = new Blob([previewArea.value], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ideoconfig.json'; a.click(); URL.revokeObjectURL(a.href);
  };
}
function showImportModal() {
  const importHtml = document.getElementById('importModalContent').innerHTML;
  openModal('Importuj JSON', importHtml, () => {});
  document.getElementById('importFromFileBtn').onclick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => { document.getElementById('jsonRawInput').value = ev.target.result; };
      reader.readAsText(file);
    }; input.click();
  };
  document.getElementById('processImportBtn').onclick = () => {
    try {
      const raw = document.getElementById('jsonRawInput').value;
      const data = JSON.parse(raw);
      if (data.pairsOfValues) appState.pairsOfValues = data.pairsOfValues;
      if (data.ideologies) appState.ideologies = data.ideologies;
      if (data.parties) appState.parties = data.parties;
      if (data.questions) { appState.questions = data.questions; reorderQuestionsIds(); }
      renderAll();
      showToast('Import udany!');
      closeModal();
    } catch(e) { showToast('Nieprawidłowy JSON', 'error'); }
  };
}

// ---------- INICJALIZACJA ----------
function init() {
  // przykładowe dane aby nie było pusto
  if (appState.pairsOfValues.length === 0) {
    appState.pairsOfValues = [{ left: "Indywidualizm", right: "Kolektywizm", leftDef: "wartość jednostki", rightDef: "wartość grupy" }];
    appState.ideologies = [{ name: "Liberalizm", description: "Wolność jednostki" }];
    appState.parties = [{ name: "Przykładowa partia", description: "opis" }];
    appState.questions = [{ id:1, text:"Przykładowe pytanie", description:"opis", answers:[{ label:"Zgadzam się", value:1, values_for:[], values_against:[], ideologies_for:[], ideologies_against:[], parties_for:[], parties_against:[] }] }];
    nextQuestionId = 2;
  }
  renderAll();
  document.getElementById('themeSwitch').onclick = () => document.body.classList.toggle('dark');
  document.getElementById('importJsonBtn').onclick = showImportModal;
  document.getElementById('exportConfigBtn').onclick = showExportModal;
  document.querySelectorAll('.add-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.dataset.type;
      if (type === 'pair') editPair(null, true);
      else if (type === 'ideology') editSimpleItem('ideologies', null, true);
      else if (type === 'party') editSimpleItem('parties', null, true);
      else if (type === 'question') editQuestion(null, true);
    });
  });
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-item')) {
      const idx = parseInt(e.target.dataset.index); const type = e.target.dataset.type;
      if (type === 'pairs') editPair(idx, false);
      else if (type === 'ideologies') editSimpleItem('ideologies', idx, false);
      else if (type === 'parties') editSimpleItem('parties', idx, false);
      else if (type === 'questions') editQuestion(idx, false);
    }
    if (e.target.classList.contains('delete-item')) {
      const idx = parseInt(e.target.dataset.index); const type = e.target.dataset.type;
      if (confirm('Usunąć element?')) {
        if (type === 'pairs') appState.pairsOfValues.splice(idx,1);
        else if (type === 'ideologies') appState.ideologies.splice(idx,1);
        else if (type === 'parties') appState.parties.splice(idx,1);
        else if (type === 'questions') { appState.questions.splice(idx,1); reorderQuestionsIds(); }
        renderAll();
        showToast('Usunięto');
      }
    }
  });
}
function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
init();
</script>
