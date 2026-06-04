const STORAGE_KEY = "modern-trial-roster-v1";

const DEFAULT_ROLES = [
  { id: "main-tank", name: "Main Tank", className: "Nightblade", short: "MT", color: "#b45309", player: "", slayerTag: "Right Slayer" },
  { id: "off-tank", name: "Off Tank", className: "Sorcerer", short: "OT", color: "#6d5bd0", player: "", slayerTag: "Right Slayer" },
  { id: "courage-healer", name: "Courage Healer", className: "Warden", short: "CH", color: "#0f766e", player: "", slayerTag: "Right Slayer" },
  { id: "slayer-healer", name: "Slayer Healer", className: "Dragonknight", short: "SH", color: "#c24136", player: "", slayerTag: "Right Slayer" },
  { id: "zenkosh", name: "ZenKosh", className: "Support", short: "ZK", color: "#8b5a2b", player: "", slayerTag: "Right Slayer" },
  { id: "slayer-dps", name: "Slayer DPS", className: "Nightblade", short: "SD", color: "#b45309", player: "", slayerTag: "Right Slayer" },
  { id: "force-dps", name: "Force DPS", className: "Arcanist", short: "FD", color: "#0f8a78", player: "", slayerTag: "Left Slayer" },
  { id: "morag-dps", name: "Morag DPS", className: "Necromancer", short: "MD", color: "#5b6f7c", player: "", slayerTag: "Left Slayer" },
  { id: "parse-nightblade", name: "Parse DPS", className: "Nightblade", short: "NB", color: "#b45309", player: "", slayerTag: "Left Slayer" },
  { id: "parse-warden", name: "Parse DPS", className: "Warden", short: "WD", color: "#0f766e", player: "", slayerTag: "Left Slayer" },
  { id: "parse-templar", name: "Parse DPS", className: "Templar", short: "TP", color: "#a16207", player: "", slayerTag: "Left Slayer" },
  { id: "parse-open", name: "Parse DPS", className: "Open", short: "OP", color: "#4b5563", player: "", slayerTag: "Left Slayer" }
];

const SLAYER_TAGS = ["Right Slayer", "Left Slayer"];

const ROW_FIELDS = ["gear", "skills", "ultimates", "passives", "misc"];

const FIELD_LABELS = {
  gear: "Gear sets",
  skills: "Skills",
  ultimates: "Ultimates",
  passives: "Passives / masteries",
  misc: "Misc"
};

const FIELD_PLACEHOLDERS = {
  gear: "Sets, bars, enchants",
  skills: "Skills, swaps, calls",
  ultimates: "Ultimate plan",
  passives: "Class passives, masteries",
  misc: "Notes"
};

const DEFAULT_ENCOUNTERS = ["Encounter 1", "Encounter 2", "Encounter 3"];
const EXPORT_ENCOUNTERS_PER_PAGE = 5;
const PNG_EXPORT_WIDTH = 2112;
const PNG_EXPORT_HEIGHT = 1612;

let state = loadState();
persistState(state);
let activeEncounterId = state.encounters[0]?.id;
let saveTimer;
let draggedEncounterId = null;
let draggedRoleId = null;

if (new URLSearchParams(window.location.search).has("export-preview")) {
  document.body.classList.add("export-preview");
}

const elements = {
  rosterTitle: document.querySelector("#rosterTitle"),
  trialName: document.querySelector("#trialName"),
  rosterDate: document.querySelector("#rosterDate"),
  rosterTime: document.querySelector("#rosterTime"),
  rosterLead: document.querySelector("#rosterLead"),
  rosterNotes: document.querySelector("#rosterNotes"),
  saveStatus: document.querySelector("#saveStatus"),
  encounterCount: document.querySelector("#encounterCount"),
  encounterNav: document.querySelector("#encounterNav"),
  roleKey: document.querySelector("#roleKey"),
  rosterSheet: document.querySelector("#rosterSheet"),
  exportSheet: document.querySelector("#exportSheet"),
  newRosterButton: document.querySelector("#newRosterButton"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  exportPngButton: document.querySelector("#exportPngButton"),
  printButton: document.querySelector("#printButton"),
  addEncounterButton: document.querySelector("#addEncounterButton"),
  duplicateEncounterButton: document.querySelector("#duplicateEncounterButton"),
  removeEncounterButton: document.querySelector("#removeEncounterButton"),
  importFile: document.querySelector("#importFile")
};

render();
bindEvents();

function bindEvents() {
  ["rosterTitle", "trialName", "rosterDate", "rosterTime", "rosterLead", "rosterNotes"].forEach((key) => {
    elements[key].addEventListener("input", () => {
      const field = key.replace("roster", "").toLowerCase();
      const metaField = key === "trialName" ? "trial" : field;
      state.meta[metaField] = elements[key].value;
      saveState();
      syncHeader();
      renderExportSheet();
      if (key === "rosterNotes") {
        resizeTextarea(elements[key]);
      }
    });
  });

  elements.rosterSheet.addEventListener("input", (event) => {
    const target = event.target;
    const field = target.dataset.field;
    const encounterId = target.dataset.encounterId;

    if (!field || !encounterId) {
      return;
    }

    const encounter = findEncounter(encounterId);
    if (!encounter) {
      return;
    }

    if (field === "name" || field === "notes") {
      encounter[field] = target.value;
      if (field === "name") {
        renderEncounterNav();
      }
    } else {
      const roleId = target.dataset.roleId;
      if (encounter.rows[roleId]) {
        encounter.rows[roleId][field] = target.value;
      }
    }

    if (target.tagName === "TEXTAREA") {
      resizeTextarea(target);
    }
    saveState();
  });
  elements.rosterSheet.addEventListener("dragstart", handleRoleDragStart);
  elements.rosterSheet.addEventListener("dragover", handleRoleDragOver);
  elements.rosterSheet.addEventListener("drop", handleRoleDrop);
  elements.rosterSheet.addEventListener("dragend", handleRoleDragEnd);

  elements.roleKey.addEventListener("input", handleRoleEditorInput);
  elements.roleKey.addEventListener("change", handleRoleEditorInput);
  elements.roleKey.addEventListener("dragstart", handleRoleDragStart);
  elements.roleKey.addEventListener("dragover", handleRoleDragOver);
  elements.roleKey.addEventListener("drop", handleRoleDrop);
  elements.roleKey.addEventListener("dragend", handleRoleDragEnd);

  elements.roleKey.addEventListener("focusout", (event) => {
    if (!elements.roleKey.contains(event.relatedTarget)) {
      renderRoleKey();
    }
  });

  elements.encounterNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-encounter-target]");
    if (!button) {
      return;
    }
    activeEncounterId = button.dataset.encounterTarget;
    renderEncounterNav();
    document
      .querySelector(`[data-section-id="${cssEscape(activeEncounterId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.encounterNav.addEventListener("dragstart", handleEncounterDragStart);
  elements.encounterNav.addEventListener("dragover", handleEncounterDragOver);
  elements.encounterNav.addEventListener("drop", handleEncounterDrop);
  elements.encounterNav.addEventListener("dragend", handleEncounterDragEnd);

  elements.addEncounterButton.addEventListener("click", () => {
    const encounter = createEncounter(`Encounter ${state.encounters.length + 1}`);
    state.encounters.push(encounter);
    activeEncounterId = encounter.id;
    saveState();
    render();
    scrollToActiveEncounter();
  });

  elements.duplicateEncounterButton.addEventListener("click", () => {
    const source = findEncounter(activeEncounterId) || state.encounters[0];
    const duplicate = normalizeEncounter({
      ...structuredCloneSafe(source),
      id: createId(),
      name: `${source.name || "Encounter"} Copy`
    });
    state.encounters.push(duplicate);
    activeEncounterId = duplicate.id;
    saveState();
    render();
    scrollToActiveEncounter();
  });

  elements.removeEncounterButton.addEventListener("click", () => {
    if (state.encounters.length <= 1) {
      setStatus("Keep one encounter");
      return;
    }
    const encounter = findEncounter(activeEncounterId);
    const label = encounter?.name || "this encounter";
    if (!window.confirm(`Remove ${label}?`)) {
      return;
    }
    state.encounters = state.encounters.filter((item) => item.id !== activeEncounterId);
    activeEncounterId = state.encounters[0].id;
    saveState();
    render();
  });

  elements.newRosterButton.addEventListener("click", () => {
    if (!window.confirm("Start a new blank roster?")) {
      return;
    }
    state = createDefaultRoster();
    activeEncounterId = state.encounters[0].id;
    saveState();
    render();
  });

  elements.exportButton.addEventListener("click", exportRosterJson);
  elements.exportPngButton.addEventListener("click", exportRosterPng);
  elements.importButton.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", importRosterJson);
  elements.printButton.addEventListener("click", printRoster);

  window.addEventListener("beforeprint", () => {
    document.title = `${state.meta.title || "Roster"} PDF`;
    renderExportSheet();
    growAllTextareas();
  });

  window.addEventListener("afterprint", () => {
    document.title = "Roster Builder";
  });
}

function handleRoleEditorInput(event) {
    const target = event.target;
    const roleId = target.dataset.roleId;
    const roleField = target.dataset.roleField;

    if (!roleId || !roleField) {
      return;
    }

    const role = getRoles().find((item) => item.id === roleId);
    if (!role) {
      return;
    }

    role[roleField] = target.value;
    const editor = target.closest(".role-editor");
    if (editor && roleField === "color") {
      editor.style.setProperty("--role-color", target.value);
    }
    if (editor && roleField === "short") {
      editor.querySelector(".class-token").textContent = target.value || "--";
    }

    saveState();
    renderEncounterNav();
    renderSheet();
    renderExportSheet();
    growAllTextareas();
}

function handleEncounterDragStart(event) {
  const button = event.target.closest("[data-encounter-target]");
  if (!button) {
    return;
  }

  draggedEncounterId = button.dataset.encounterTarget;
  button.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedEncounterId);
}

function handleEncounterDragOver(event) {
  const button = event.target.closest("[data-encounter-target]");
  if (!button || !draggedEncounterId || button.dataset.encounterTarget === draggedEncounterId) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setDropTarget(button, shouldInsertAfter(event, button));
}

function handleEncounterDrop(event) {
  const button = event.target.closest("[data-encounter-target]");
  if (!button || !draggedEncounterId) {
    return;
  }

  event.preventDefault();
  const didMove = reorderItemById(
    state.encounters,
    draggedEncounterId,
    button.dataset.encounterTarget,
    shouldInsertAfter(event, button)
  );
  clearDragState();

  if (!didMove) {
    return;
  }

  saveState();
  render();
}

function handleEncounterDragEnd() {
  clearDragState();
}

function handleRoleDragStart(event) {
  const handle = event.target.closest("[data-role-drag-id]");
  if (!handle) {
    return;
  }

  draggedRoleId = handle.dataset.roleDragId;
  handle.closest(".role-editor, .role-row")?.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedRoleId);
}

function handleRoleDragOver(event) {
  const dropTarget = event.target.closest("[data-role-editor-id], [data-role-row-id]");
  const targetRoleId = getRoleDropTargetId(dropTarget);
  if (!dropTarget || !draggedRoleId || targetRoleId === draggedRoleId) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setDropTarget(dropTarget, shouldInsertAfter(event, dropTarget));
}

function handleRoleDrop(event) {
  const dropTarget = event.target.closest("[data-role-editor-id], [data-role-row-id]");
  const targetRoleId = getRoleDropTargetId(dropTarget);
  if (!dropTarget || !draggedRoleId || !targetRoleId) {
    return;
  }

  event.preventDefault();
  const didMove = reorderItemById(
    state.roles,
    draggedRoleId,
    targetRoleId,
    shouldInsertAfter(event, dropTarget)
  );
  clearDragState();

  if (!didMove) {
    return;
  }

  applySlayerTagsByRoleOrder();
  saveState();
  render();
}

function handleRoleDragEnd() {
  clearDragState();
}

function getRoleDropTargetId(target) {
  return target?.dataset.roleEditorId || target?.dataset.roleRowId || "";
}

function render() {
  syncControls();
  renderRoleKey();
  renderEncounterNav();
  renderSheet();
  renderExportSheet();
  growAllTextareas();
}

function syncControls() {
  elements.rosterTitle.value = state.meta.title || "";
  elements.trialName.value = state.meta.trial || "";
  elements.rosterDate.value = state.meta.date || "";
  elements.rosterTime.value = state.meta.time || "";
  elements.rosterLead.value = state.meta.lead || "";
  elements.rosterNotes.value = state.meta.notes || "";
  resizeTextarea(elements.rosterNotes);
}

function syncHeader() {
  document.querySelectorAll("[data-meta-display]").forEach((node) => {
    const field = node.dataset.metaDisplay;
    node.textContent = formatMetaValue(field);
  });
}

function renderRoleKey() {
  elements.roleKey.innerHTML = getRoles().map((role, index) => {
    return `
      <div class="role-editor" data-role-editor-id="${escapeAttribute(role.id)}" style="--role-color: ${escapeAttribute(role.color)}">
        <div class="role-editor-top">
          <button
            class="drag-handle role-drag-handle"
            type="button"
            draggable="true"
            data-role-drag-id="${escapeAttribute(role.id)}"
            aria-label="Drag ${escapeAttribute(role.name)}"
            title="Drag role"
          ></button>
          <span class="class-token" aria-hidden="true">${escapeHtml(role.short || "--")}</span>
          <strong>Role ${index + 1}</strong>
        </div>
        <label>
          Player
          <input type="text" value="${escapeAttribute(role.player)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="player" placeholder="@player">
        </label>
        <label>
          Slayer tag
          <select data-role-id="${escapeAttribute(role.id)}" data-role-field="slayerTag">
            ${SLAYER_TAGS.map((tag) => `
              <option value="${escapeAttribute(tag)}"${getRoleTag(role) === tag ? " selected" : ""}>${escapeHtml(tag)}</option>
            `).join("")}
          </select>
        </label>
        <label>
          Role
          <input type="text" value="${escapeAttribute(role.name)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="name">
        </label>
        <div class="role-editor-grid">
          <label>
            Class
            <input type="text" value="${escapeAttribute(role.className)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="className">
          </label>
          <label>
            Code
            <input type="text" value="${escapeAttribute(role.short)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="short" maxlength="4">
          </label>
          <label>
            Color
            <input type="color" value="${escapeAttribute(role.color)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="color">
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function renderEncounterNav() {
  elements.encounterCount.textContent = String(state.encounters.length);
  elements.removeEncounterButton.disabled = state.encounters.length <= 1;
  elements.encounterNav.innerHTML = state.encounters.map((encounter, index) => {
    const activeClass = encounter.id === activeEncounterId ? " is-active" : "";
    return `
      <button class="nav-item${activeClass}" type="button" draggable="true" data-encounter-target="${escapeAttribute(encounter.id)}">
        <strong>${escapeHtml(encounter.name || `Encounter ${index + 1}`)}</strong>
        <span>${getRoles().length} rows</span>
      </button>
    `;
  }).join("");
}

function renderSheet() {
  elements.rosterSheet.innerHTML = `
    <header class="sheet-header">
      <div>
        <h2 data-meta-display="title">${escapeHtml(formatMetaValue("title"))}</h2>
        <dl>
          <div>
            <dt>Trial</dt>
            <dd data-meta-display="trial">${escapeHtml(formatMetaValue("trial"))}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd data-meta-display="date">${escapeHtml(formatMetaValue("date"))}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd data-meta-display="time">${escapeHtml(formatMetaValue("time"))}</dd>
          </div>
          <div>
            <dt>Lead</dt>
            <dd data-meta-display="lead">${escapeHtml(formatMetaValue("lead"))}</dd>
          </div>
        </dl>
        <p class="sheet-notes" data-meta-display="notes">${escapeHtml(formatMetaValue("notes"))}</p>
      </div>
      <div class="sheet-stat" aria-label="Role count">
        <strong>${getRoles().length}</strong>
        <span>Roles</span>
      </div>
    </header>
    ${state.encounters.map(renderEncounterSection).join("")}
  `;
}

function renderExportSheet() {
  elements.exportSheet.innerHTML = getExportPageModels().map((page) => {
      const encounterCount = Math.max(1, page.encounters.length);
      return `
      <section class="export-page" aria-label="Roster export page ${page.pageNumber}">
        <div class="export-grid" style="--export-encounter-count: ${encounterCount}">
          <div class="export-program-cell">
            <strong>${escapeHtml(formatMetaValue("title"))}</strong>
            <span>${escapeHtml(formatDateTimeForExport())}</span>
          </div>
          ${page.encounters.map(renderExportEncounterHeader).join("")}
          ${renderExportGroupRow(page.tag, page.roles.length)}
          ${page.roles.map((role) => renderExportRoleBand(role, page.encounters)).join("")}
        </div>
      </section>
      `;
  }).join("");
}

function getExportPageModels() {
  const encounterPages = chunkEncounters(state.encounters, EXPORT_ENCOUNTERS_PER_PAGE);
  let pageNumber = 0;

  return encounterPages.flatMap((encounters) => {
    return SLAYER_TAGS.map((tag) => {
      pageNumber += 1;
      return {
        pageNumber,
        encounters,
        tag,
        roles: getRoles().filter((role) => getRoleTag(role) === tag)
      };
    });
  });
}

function renderExportEncounterHeader(encounter) {
  return `
    <div class="export-encounter-pill">${escapeHtml(encounter?.name || "")}</div>
  `;
}

function renderExportGroupRow(tag, roleCount) {
  return `
    <div class="export-group-row">
      <strong>${escapeHtml(tag)}</strong>
      <span>${roleCount} roles</span>
    </div>
  `;
}

function renderExportRoleBand(role, encounters) {
  return `
    <div class="export-role-cell" style="--role-color: ${role.color}">
      <span class="export-role-token">${escapeHtml(role.short)}</span>
      <div>
        <strong>${escapeHtml(role.name)}</strong>
        <span>${escapeHtml(role.className)}</span>
        <em>${escapeHtml(role.player || "Player")}</em>
      </div>
    </div>
    ${encounters.map((encounter) => renderExportEncounterCell(encounter, role)).join("")}
  `;
}

function renderExportEncounterCell(encounter, role) {
  if (!encounter) {
    return '<div class="export-info-cell export-info-cell-empty"></div>';
  }

  const row = encounter.rows[role.id] || createEmptyRow();
  const lines = [
    { label: "Gear", value: row.gear },
    { label: "Skills", value: row.skills },
    { label: "Ults", value: row.ultimates },
    { label: "Passives", value: row.passives },
    { label: "Misc", value: row.misc }
  ].filter((line) => String(line.value || "").trim());

  if (!lines.length) {
    return '<div class="export-info-cell"><span class="export-empty-note">Encounter details</span></div>';
  }

  return `
    <div class="export-info-cell">
      ${lines.map((line) => `
        <p>
          <strong>${escapeHtml(line.label)}:</strong>
          <span>${escapeHtml(line.value)}</span>
        </p>
      `).join("")}
    </div>
  `;
}

function renderEncounterSection(encounter) {
  return `
    <section class="encounter-section" data-section-id="${escapeAttribute(encounter.id)}">
      <div class="encounter-top">
        <input
          class="encounter-name"
          type="text"
          value="${escapeAttribute(encounter.name)}"
          data-field="name"
          data-encounter-id="${escapeAttribute(encounter.id)}"
          aria-label="Encounter name"
        >
        <textarea
          class="encounter-note"
          rows="1"
          data-field="notes"
          data-encounter-id="${escapeAttribute(encounter.id)}"
          aria-label="Encounter notes"
          placeholder="Encounter notes">${escapeHtml(encounter.notes)}</textarea>
      </div>
      <div class="roster-grid">
        <div class="column-head" aria-hidden="true">
          <span>Role</span>
          <span>Gear sets</span>
          <span>Skills</span>
          <span>Ultimates</span>
          <span>Passives / masteries</span>
          <span>Misc</span>
        </div>
        ${getRoles().map((role) => renderRoleRow(encounter, role)).join("")}
      </div>
    </section>
  `;
}

function renderRoleRow(encounter, role) {
  const row = encounter.rows[role.id] || createEmptyRow();
  return `
    <article class="role-row" data-role-row-id="${escapeAttribute(role.id)}" style="--role-color: ${role.color}">
      <div class="role-cell">
        <button
          class="drag-handle sheet-role-drag-handle"
          type="button"
          draggable="true"
          data-role-drag-id="${escapeAttribute(role.id)}"
          aria-label="Drag ${escapeAttribute(role.name)}"
          title="Drag role"
        ></button>
        <span class="role-token" aria-hidden="true">${escapeHtml(role.short)}</span>
        <div>
          <strong>${escapeHtml(role.name)}</strong>
          <span>${escapeHtml(role.className)}</span>
          <small>${escapeHtml(getRoleTag(role))}</small>
          <em>${escapeHtml(role.player || "Player")}</em>
        </div>
      </div>
      ${ROW_FIELDS.map((field) => renderField(encounter.id, role.id, field, row[field])).join("")}
    </article>
  `;
}

function renderField(encounterId, roleId, field, value) {
  const label = FIELD_LABELS[field];
  const placeholder = FIELD_PLACEHOLDERS[field];
  const dataset = `
    data-field="${escapeAttribute(field)}"
    data-encounter-id="${escapeAttribute(encounterId)}"
    data-role-id="${escapeAttribute(roleId)}"
  `;

  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <textarea
        rows="1"
        placeholder="${escapeAttribute(placeholder)}"
        ${dataset}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function createDefaultRoster() {
  return {
    version: 2,
    meta: {
      title: "Trial Roster",
      trial: "",
      date: new Date().toISOString().slice(0, 10),
      time: "",
      lead: "",
      notes: ""
    },
    roles: DEFAULT_ROLES.map((role) => ({ ...role })),
    encounters: DEFAULT_ENCOUNTERS.map((name) => createEncounter(name))
  };
}

function createEncounter(name) {
  return {
    id: createId(),
    name,
    notes: "",
    rows: createRows()
  };
}

function createRows(source = {}) {
  return DEFAULT_ROLES.reduce((rows, role) => {
    rows[role.id] = { ...createEmptyRow(), ...(source[role.id] || {}) };
    return rows;
  }, {});
}

function createEmptyRow() {
  return ROW_FIELDS.reduce((row, field) => {
    row[field] = "";
    return row;
  }, {});
}

function getRoles() {
  if (!Array.isArray(state.roles)) {
    state.roles = DEFAULT_ROLES.map((role) => ({ ...role }));
  }
  return state.roles;
}

function normalizeRoster(input) {
  const fallback = createDefaultRoster();
  const roster = input && typeof input === "object" ? input : fallback;
  const encounters = Array.isArray(roster.encounters) && roster.encounters.length
    ? roster.encounters
    : fallback.encounters;
  const normalizedEncounters = encounters.map(normalizeEncounter);

  return {
    version: 2,
    meta: {
      ...fallback.meta,
      ...(roster.meta && typeof roster.meta === "object" ? roster.meta : {})
    },
    roles: normalizeRoles(roster.roles, normalizedEncounters),
    encounters: normalizedEncounters
  };
}

function normalizeRoles(inputRoles, encounters = []) {
  const savedRoles = Array.isArray(inputRoles) ? inputRoles.filter((role) => role && typeof role === "object") : [];
  const defaultIds = new Set(DEFAULT_ROLES.map((role) => role.id));
  const savedById = new Map(savedRoles
    .filter((role) => defaultIds.has(role.id))
    .map((role) => [role.id, role]));
  const orderedIds = [];

  savedRoles.forEach((role) => {
    if (defaultIds.has(role.id) && !orderedIds.includes(role.id)) {
      orderedIds.push(role.id);
    }
  });
  DEFAULT_ROLES.forEach((role) => {
    if (!orderedIds.includes(role.id)) {
      orderedIds.push(role.id);
    }
  });

  const normalizedById = new Map(DEFAULT_ROLES.map((defaultRole) => {
    const savedRole = savedById.get(defaultRole.id) || {};
    return [defaultRole.id, {
      ...defaultRole,
      name: normalizeRoleText(savedRole.name, defaultRole.name),
      className: normalizeRoleText(savedRole.className, defaultRole.className),
      short: normalizeRoleText(savedRole.short, defaultRole.short).slice(0, 4),
      color: normalizeRoleColor(savedRole.color, defaultRole.color),
      player: normalizeRoleText(savedRole.player, migrateRolePlayer(defaultRole.id, encounters)),
      slayerTag: normalizeSlayerTag(
        savedRole.slayerTag || savedRole.tag || savedRole.subpanel,
        defaultRole.slayerTag
      )
    }];
  }));

  return orderedIds.map((id) => normalizedById.get(id));
}

function normalizeRoleText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeRoleColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeSlayerTag(value, fallback) {
  return SLAYER_TAGS.includes(value) ? value : fallback;
}

function getRoleTag(role) {
  return normalizeSlayerTag(role.slayerTag || role.tag || role.subpanel, "Right Slayer");
}

function migrateRolePlayer(roleId, encounters) {
  for (const encounter of encounters) {
    const player = encounter.rows?.[roleId]?.player;
    if (typeof player === "string" && player.trim()) {
      return player.trim();
    }
  }
  return "";
}

function normalizeEncounter(encounter) {
  const normalized = encounter && typeof encounter === "object" ? encounter : {};
  return {
    id: typeof normalized.id === "string" && normalized.id ? normalized.id : createId(),
    name: typeof normalized.name === "string" && normalized.name ? normalized.name : "Encounter",
    notes: typeof normalized.notes === "string" ? normalized.notes : "",
    rows: createRows(normalized.rows && typeof normalized.rows === "object" ? normalized.rows : {})
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeRoster(JSON.parse(saved)) : createDefaultRoster();
  } catch (error) {
    console.warn("Could not load roster", error);
    return createDefaultRoster();
  }
}

function persistState(roster) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
}

function saveState() {
  window.clearTimeout(saveTimer);
  elements.saveStatus.textContent = "Saving";
  persistState(state);
  saveTimer = window.setTimeout(() => setStatus("Saved"), 180);
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

function findEncounter(id) {
  return state.encounters.find((encounter) => encounter.id === id);
}

function reorderItemById(items, draggedId, targetId, insertAfter = false) {
  if (!Array.isArray(items) || draggedId === targetId) {
    return false;
  }

  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || targetIndex < 0) {
    return false;
  }

  const [item] = items.splice(fromIndex, 1);
  let insertIndex = targetIndex;
  if (fromIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (insertAfter) {
    insertIndex += 1;
  }
  items.splice(Math.max(0, Math.min(insertIndex, items.length)), 0, item);
  return true;
}

function applySlayerTagsByRoleOrder() {
  getRoles().forEach((role, index) => {
    role.slayerTag = index < 6 ? "Right Slayer" : "Left Slayer";
  });
}

function shouldInsertAfter(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function setDropTarget(element, insertAfter) {
  document.querySelectorAll(".is-drop-target, .is-drop-after").forEach((node) => {
    node.classList.remove("is-drop-target", "is-drop-after");
  });
  element.classList.add("is-drop-target");
  element.classList.toggle("is-drop-after", insertAfter);
}

function clearDragState() {
  draggedEncounterId = null;
  draggedRoleId = null;
  document.querySelectorAll(".is-dragging, .is-drop-target, .is-drop-after").forEach((node) => {
    node.classList.remove("is-dragging", "is-drop-target", "is-drop-after");
  });
}

function scrollToActiveEncounter() {
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-section-id="${cssEscape(activeEncounterId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function formatMetaValue(field) {
  const value = state.meta[field];
  if (field === "title") {
    return value || "Trial Roster";
  }
  if (field === "date") {
    return formatDateForDisplay(value) || "TBD";
  }
  if (field === "notes") {
    return value || "";
  }
  return value || "TBD";
}

function formatDateTimeForExport() {
  const date = formatDateForDisplay(state.meta.date);
  const time = state.meta.time;
  if (date && time) {
    return `${date} ${time}`;
  }
  return date || time || "Date & Time";
}

function exportRosterJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${slugify(state.meta.title || "roster")}.json`);
  setStatus("JSON exported");
}

async function exportRosterPng() {
  setStatus("Exporting PNG");
  renderExportSheet();

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pages = getExportPageModels();
    if (!pages.length) {
      setStatus("Nothing to export");
      return;
    }

    const baseName = slugify(state.meta.title || "roster");

    for (const [index, page] of pages.entries()) {
      const canvas = renderExportPageCanvas(page);
      const blob = await canvasToBlob(canvas);
      const pageSuffix = pages.length > 1 ? `-page-${String(index + 1).padStart(2, "0")}` : "";
      downloadBlob(blob, `${baseName}${pageSuffix}.png`);
      await wait(120);
    }

    setStatus(`${pages.length} PNG${pages.length === 1 ? "" : "s"} exported`);
  } catch (error) {
    console.error(error);
    setStatus("PNG export failed");
    window.alert("The PNG export could not be created.");
  }
}

async function importRosterJson() {
  const file = elements.importFile.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    state = normalizeRoster(JSON.parse(text));
    activeEncounterId = state.encounters[0].id;
    saveState();
    render();
    setStatus("JSON imported");
  } catch (error) {
    console.error(error);
    setStatus("Import failed");
    window.alert("That JSON file could not be imported.");
  } finally {
    elements.importFile.value = "";
  }
}

function printRoster() {
  renderExportSheet();
  growAllTextareas();
  window.print();
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export returned an empty PNG."));
      }
    }, "image/png");
  });
}

function renderExportPageCanvas(page) {
  const canvas = document.createElement("canvas");
  canvas.width = PNG_EXPORT_WIDTH;
  canvas.height = PNG_EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.imageSmoothingEnabled = true;
  drawExportPageCanvas(ctx, page);
  return canvas;
}

function drawExportPageCanvas(ctx, page) {
  const width = PNG_EXPORT_WIDTH;
  const height = PNG_EXPORT_HEIGHT;
  const padding = 32;
  const gap = 11;
  const headerHeight = 116;
  const groupHeight = 64;
  const encounterCount = Math.max(1, page.encounters.length);
  const gridX = padding;
  const gridY = padding;
  const gridWidth = width - padding * 2;
  const gridHeight = height - padding * 2;
  const unit = (gridWidth - gap * encounterCount) / (encounterCount + 0.47);
  const roleWidth = unit * 0.47;
  const encounterWidth = unit;
  const rowCount = Math.max(6, page.roles.length || 6);
  const roleHeight = (gridHeight - headerHeight - groupHeight - gap * (rowCount + 1)) / rowCount;
  const groupY = gridY + headerHeight + gap;
  const firstRoleY = groupY + groupHeight + gap;

  drawExportPageBackground(ctx, width, height);
  drawProgramCell(ctx, gridX, gridY, roleWidth, headerHeight);

  page.encounters.forEach((encounter, index) => {
    const x = gridX + roleWidth + gap + index * (encounterWidth + gap);
    drawEncounterHeader(ctx, x, gridY, encounterWidth, headerHeight, encounter.name || `Encounter ${index + 1}`);
  });

  drawGroupRowCanvas(ctx, gridX, groupY, gridWidth, groupHeight, page.tag, page.roles.length);

  page.roles.forEach((role, rowIndex) => {
    const y = firstRoleY + rowIndex * (roleHeight + gap);
    drawExportRoleCellCanvas(ctx, gridX, y, roleWidth, roleHeight, role);

    page.encounters.forEach((encounter, encounterIndex) => {
      const x = gridX + roleWidth + gap + encounterIndex * (encounterWidth + gap);
      drawExportInfoCellCanvas(ctx, x, y, encounterWidth, roleHeight, encounter, role);
    });
  });
}

function drawExportPageBackground(ctx, width, height) {
  drawRoundedPath(ctx, 1, 1, width - 2, height - 2, 36);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#f8fbfb";
  ctx.fillRect(0, 0, width, height);

  const teal = ctx.createLinearGradient(0, 0, width * 0.55, height * 0.52);
  teal.addColorStop(0, "rgba(15, 118, 110, 0.13)");
  teal.addColorStop(1, "rgba(15, 118, 110, 0)");
  ctx.fillStyle = teal;
  ctx.fillRect(0, 0, width, height);

  const coral = ctx.createLinearGradient(width, height, width * 0.55, height * 0.48);
  coral.addColorStop(0, "rgba(194, 65, 54, 0.12)");
  coral.addColorStop(1, "rgba(194, 65, 54, 0)");
  ctx.fillStyle = coral;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.strokeStyle = "rgba(28, 42, 43, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawProgramCell(ctx, x, y, width, height) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#202828");
  gradient.addColorStop(0.62, "#314142");
  gradient.addColorStop(1, "#0f766e");
  drawPanel(ctx, x, y, width, height, 28, gradient, "rgba(21, 32, 33, 0.2)");

  ctx.fillStyle = "#ffffff";
  setCanvasFont(ctx, 22, 850);
  drawCenteredLines(ctx, wrapCanvasText(ctx, formatMetaValue("title"), width - 24, 2), x, y + 24, width, 28);
  ctx.fillStyle = "#d8e7e5";
  setCanvasFont(ctx, 15, 780);
  drawCenteredLines(ctx, [formatDateTimeForExport()], x, y + height - 38, width, 20);
}

function drawEncounterHeader(ctx, x, y, width, height, label) {
  const pillWidth = Math.min(width * 0.92, 460);
  const pillHeight = 54;
  const pillX = x + (width - pillWidth) / 2;
  const pillY = y + (height - pillHeight) / 2;
  const gradient = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillHeight);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#edf7f5");
  drawPanel(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2, gradient, "rgba(15, 118, 110, 0.13)", {
    stroke: "rgba(15, 118, 110, 0.32)",
    shadowBlur: 18,
    shadowOffsetY: 8
  });

  ctx.fillStyle = "#123635";
  setCanvasFont(ctx, 16, 850);
  drawCenteredLines(ctx, wrapCanvasText(ctx, label, pillWidth - 32, 2), pillX, pillY + 15, pillWidth, 18);
}

function drawGroupRowCanvas(ctx, x, y, width, height, tag, roleCount) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#202828");
  gradient.addColorStop(0.58, "#2e3b3c");
  gradient.addColorStop(1, "#0f766e");
  drawPanel(ctx, x, y, width, height, 18, gradient, "rgba(21, 32, 33, 0.16)", {
    shadowBlur: 20,
    shadowOffsetY: 9
  });

  ctx.fillStyle = "#ffffff";
  setCanvasFont(ctx, 20, 850);
  ctx.textAlign = "left";
  ctx.fillText(tag, x + 24, y + 20);

  ctx.fillStyle = "#d6e4e3";
  setCanvasFont(ctx, 13, 850);
  ctx.textAlign = "right";
  ctx.fillText(`${roleCount} roles`.toUpperCase(), x + width - 24, y + 23);
  ctx.textAlign = "left";
}

function drawExportRoleCellCanvas(ctx, x, y, width, height, role) {
  const roleColor = normalizeRoleColor(role.color, "#4b5563");
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, mixHex(roleColor, "#ffffff", 0.18));
  gradient.addColorStop(1, "#ffffff");
  drawPanel(ctx, x, y, width, height, 20, gradient, "rgba(31, 37, 37, 0.1)", {
    stroke: "rgba(21, 32, 33, 0.13)",
    shadowBlur: 17,
    shadowOffsetY: 9
  });

  const tokenSize = Math.min(34, Math.max(25, width * 0.22));
  const tokenX = x + 12;
  const tokenY = y + Math.max(12, (height - tokenSize) / 2 - 22);
  const tokenGradient = ctx.createLinearGradient(tokenX, tokenY, tokenX, tokenY + tokenSize);
  tokenGradient.addColorStop(0, "#ffffff");
  tokenGradient.addColorStop(1, mixHex(roleColor, "#ffffff", 0.13));
  drawPanel(ctx, tokenX, tokenY, tokenSize, tokenSize, 10, tokenGradient, "rgba(31, 37, 37, 0.08)", {
    stroke: mixHex(roleColor, "#ffffff", 0.62),
    shadowBlur: 10,
    shadowOffsetY: 5
  });

  ctx.fillStyle = mixHex(roleColor, "#111111", 0.76);
  setCanvasFont(ctx, Math.max(10, tokenSize * 0.38), 900);
  drawCenteredLines(ctx, [role.short || "--"], tokenX, tokenY + tokenSize * 0.32, tokenSize, tokenSize * 0.36);

  const textX = tokenX + tokenSize + 10;
  const textWidth = Math.max(20, x + width - textX - 10);
  let textY = y + 18;

  ctx.fillStyle = "#111111";
  setCanvasFont(ctx, 16, 850);
  const nameLines = wrapCanvasText(ctx, role.name || "Role", textWidth, 2);
  nameLines.forEach((line) => {
    ctx.fillText(line, textX, textY);
    textY += 18;
  });

  ctx.fillStyle = "#4d5a5c";
  setCanvasFont(ctx, 12, 700);
  wrapCanvasText(ctx, role.className || "", textWidth, 2).forEach((line) => {
    ctx.fillText(line, textX, textY + 2);
    textY += 15;
  });

  ctx.fillStyle = mixHex(roleColor, "#111111", 0.78);
  setCanvasFont(ctx, 14, 900);
  wrapCanvasText(ctx, role.player || "Player", textWidth, 2).forEach((line) => {
    if (textY < y + height - 18) {
      ctx.fillText(line, textX, textY + 5);
      textY += 16;
    }
  });
}

function drawExportInfoCellCanvas(ctx, x, y, width, height, encounter, role) {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  gradient.addColorStop(1, "rgba(248, 251, 251, 0.96)");
  drawPanel(ctx, x, y, width, height, 20, gradient, "rgba(31, 37, 37, 0.1)", {
    stroke: "rgba(21, 32, 33, 0.13)",
    shadowBlur: 17,
    shadowOffsetY: 9
  });

  const row = encounter.rows[role.id] || createEmptyRow();
  const lines = [
    { label: "Gear", value: row.gear },
    { label: "Skills", value: row.skills },
    { label: "Ults", value: row.ultimates },
    { label: "Passives", value: row.passives },
    { label: "Misc", value: row.misc }
  ].filter((line) => String(line.value || "").trim());

  const inset = 16;
  const maxWidth = width - inset * 2;
  let cursorY = y + 14;
  const maxY = y + height - 18;
  setCanvasFont(ctx, 14, 700);

  if (!lines.length) {
    ctx.fillStyle = "#7c8a8d";
    ctx.fillText("Encounter details", x + inset, cursorY);
    return;
  }

  for (const line of lines) {
    if (cursorY > maxY) {
      break;
    }
    const wrapped = wrapCanvasText(ctx, `${line.label}: ${line.value}`, maxWidth, 4);
    for (const wrappedLine of wrapped) {
      if (cursorY > maxY) {
        ctx.fillText("...", x + inset, maxY);
        return;
      }
      ctx.fillStyle = "#1e2c2d";
      ctx.fillText(wrappedLine, x + inset, cursorY);
      cursorY += 18;
    }
    cursorY += 3;
  }
}

function drawPanel(ctx, x, y, width, height, radius, fill, shadowColor, options = {}) {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = options.shadowBlur ?? 18;
  ctx.shadowOffsetY = options.shadowOffsetY ?? 7;
  drawRoundedPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = options.stroke || "rgba(21, 32, 33, 0.13)";
  ctx.lineWidth = options.lineWidth || 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawRoundedPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function setCanvasFont(ctx, size, weight = 700, style = "normal") {
  ctx.font = `${style} ${weight} ${size}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function drawCenteredLines(ctx, lines, x, y, width, lineHeight) {
  ctx.textAlign = "center";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + width / 2, y + index * lineHeight);
  });
  ctx.textAlign = "left";
}

function wrapCanvasText(ctx, value, maxWidth, maxLines = Infinity) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length >= maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (!lines.length) {
    return [""];
  }

  if (lines.length === maxLines && words.length) {
    const lastIndex = lines.length - 1;
    while (ctx.measureText(`${lines[lastIndex]}...`).width > maxWidth && lines[lastIndex].length > 1) {
      lines[lastIndex] = lines[lastIndex].slice(0, -1).trim();
    }
    if (ctx.measureText(`${lines[lastIndex]}...`).width <= maxWidth) {
      lines[lastIndex] = `${lines[lastIndex]}...`;
    }
  }

  return lines;
}

function mixHex(hex, otherHex, amount) {
  const color = hexToRgb(hex) || hexToRgb("#4b5563");
  const other = hexToRgb(otherHex) || hexToRgb("#ffffff");
  const mix = (start, end) => Math.round(start * amount + end * (1 - amount));
  return `rgb(${mix(color.r, other.r)}, ${mix(color.g, other.g)}, ${mix(color.b, other.b)})`;
}

function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function growAllTextareas() {
  document.querySelectorAll("textarea").forEach(resizeTextarea);
}

function resizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "roster";
}

function chunkEncounters(encounters, size) {
  const chunks = [];
  for (let index = 0; index < encounters.length; index += size) {
    chunks.push(encounters.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function formatDateForDisplay(value) {
  if (!value) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return CSS.escape(value);
  }
  return String(value).replace(/"/g, '\\"');
}
