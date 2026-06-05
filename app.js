const STORAGE_KEY = "modern-trial-roster-v1";
const THEME_STORAGE_KEY = "modern-trial-roster-theme";

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

const DEFAULT_SETTINGS = {
  slayerGroupsEnabled: true
};

const ROLE_COLOR_PALETTE = [
  "#b45309",
  "#6d5bd0",
  "#0f766e",
  "#c24136",
  "#8b5a2b",
  "#0f8a78",
  "#5b6f7c",
  "#a16207",
  "#2563eb",
  "#be185d",
  "#64748b",
  "#7c3aed"
];

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
let exportFitFrame;
let draggedEncounterId = null;
let draggedRoleId = null;
let currentTheme = loadThemePreference();

document.body.dataset.theme = currentTheme;

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
  roleCount: document.querySelector("#roleCount"),
  encounterNav: document.querySelector("#encounterNav"),
  roleKey: document.querySelector("#roleKey"),
  rosterSheet: document.querySelector("#rosterSheet"),
  exportSheet: document.querySelector("#exportSheet"),
  newRosterButton: document.querySelector("#newRosterButton"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  exportPngButton: document.querySelector("#exportPngButton"),
  printButton: document.querySelector("#printButton"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  themeToggleLabel: document.querySelector("#themeToggleLabel"),
  addEncounterButton: document.querySelector("#addEncounterButton"),
  addRoleButton: document.querySelector("#addRoleButton"),
  slayerGroupsToggle: document.querySelector("#slayerGroupsToggle"),
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
  elements.roleKey.addEventListener("click", handleRoleKeyClick);
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
    const encounter = createEncounter(`Encounter ${state.encounters.length + 1}`, getRoles());
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
    }, getRoles());
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
  elements.themeToggleButton.addEventListener("click", toggleTheme);
  elements.addRoleButton.addEventListener("click", addRole);
  elements.slayerGroupsToggle.addEventListener("change", () => {
    state.settings.slayerGroupsEnabled = elements.slayerGroupsToggle.checked;
    saveState();
    render();
  });

  window.addEventListener("beforeprint", () => {
    document.title = `${state.meta.title || "Roster"} PDF`;
    renderExportSheet();
    fitExportTypography();
    growAllTextareas();
  });

  window.addEventListener("afterprint", () => {
    document.title = "Roster Builder";
  });

  syncThemeToggle();
}

function handleRoleKeyClick(event) {
  const button = event.target.closest("[data-role-delete-id]");
  if (!button) {
    return;
  }

  removeRole(button.dataset.roleDeleteId);
}

function addRole() {
  const roles = getRoles();
  const role = createRole(roles.length);
  roles.push(role);
  ensureRoleRows(role.id);
  saveState();
  render();
  setStatus("Role added");
  focusRoleEditor(role.id);
}

function removeRole(roleId) {
  const roles = getRoles();
  if (roles.length <= 1) {
    setStatus("Keep one role");
    return;
  }

  const role = roles.find((item) => item.id === roleId);
  if (!role) {
    return;
  }

  if (!window.confirm(`Remove ${role.name || "this role"}? This will remove its encounter info.`)) {
    return;
  }

  state.roles = roles.filter((item) => item.id !== roleId);
  state.encounters.forEach((encounter) => {
    if (encounter.rows && typeof encounter.rows === "object") {
      delete encounter.rows[roleId];
    }
  });
  draggedRoleId = null;
  saveState();
  render();
  setStatus("Role removed");
}

function createRole(index = getRoles().length) {
  const roleNumber = index + 1;
  return {
    id: createUniqueRoleId(`custom-role-${roleNumber}`),
    name: `New Role ${roleNumber}`,
    className: "Open",
    short: `R${roleNumber}`.slice(0, 4),
    color: getRoleColorForIndex(index),
    player: "",
    slayerTag: index < 6 ? "Right Slayer" : "Left Slayer"
  };
}

function ensureRoleRows(roleId) {
  state.encounters.forEach((encounter) => {
    if (!encounter.rows || typeof encounter.rows !== "object") {
      encounter.rows = {};
    }
    if (!encounter.rows[roleId]) {
      encounter.rows[roleId] = createEmptyRow();
    }
  });
}

function focusRoleEditor(roleId) {
  window.requestAnimationFrame(() => {
    const editor = elements.roleKey.querySelector(`[data-role-editor-id="${cssEscape(roleId)}"]`);
    editor?.scrollIntoView({ behavior: "smooth", block: "center" });
    editor?.querySelector("[data-role-field='player']")?.focus();
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
  state.settings = normalizeSettings(state.settings);
  elements.rosterTitle.value = state.meta.title || "";
  elements.trialName.value = state.meta.trial || "";
  elements.rosterDate.value = state.meta.date || "";
  elements.rosterTime.value = state.meta.time || "";
  elements.rosterLead.value = state.meta.lead || "";
  elements.rosterNotes.value = state.meta.notes || "";
  elements.slayerGroupsToggle.checked = areSlayerGroupsEnabled();
  resizeTextarea(elements.rosterNotes);
}

function syncHeader() {
  document.querySelectorAll("[data-meta-display]").forEach((node) => {
    const field = node.dataset.metaDisplay;
    node.textContent = formatMetaValue(field);
  });
}

function renderRoleKey() {
  const roles = getRoles();
  const showSlayerGroups = areSlayerGroupsEnabled();
  elements.roleCount.textContent = String(roles.length);
  elements.roleKey.innerHTML = roles.map((role, index) => {
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
          <button
            class="role-delete-button"
            type="button"
            data-role-delete-id="${escapeAttribute(role.id)}"
            aria-label="Remove ${escapeAttribute(role.name)}"
            title="Remove role"
            ${roles.length <= 1 ? "disabled" : ""}
          >&times;</button>
        </div>
        <label>
          Player
          <input type="text" value="${escapeAttribute(role.player)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="player" placeholder="@player">
        </label>
        ${showSlayerGroups ? `<label>
          Slayer tag
          <select data-role-id="${escapeAttribute(role.id)}" data-role-field="slayerTag">
            ${SLAYER_TAGS.map((tag) => `
              <option value="${escapeAttribute(tag)}"${getRoleTag(role) === tag ? " selected" : ""}>${escapeHtml(tag)}</option>
            `).join("")}
          </select>
        </label>` : ""}
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
        <div class="export-grid${page.showGroup ? "" : " is-flat"}" style="--export-encounter-count: ${encounterCount}; --export-role-count: ${Math.max(1, page.roles.length)}">
          <div class="export-program-cell">
            <strong>${escapeHtml(formatMetaValue("title"))}</strong>
            <span>${escapeHtml(formatDateTimeForExport())}</span>
          </div>
          ${page.encounters.map(renderExportEncounterHeader).join("")}
          ${page.showGroup ? renderExportGroupRow(page.tag, page.roles.length) : ""}
          ${page.roles.map((role) => renderExportRoleBand(role, page.encounters)).join("")}
        </div>
      </section>
      `;
  }).join("");
  scheduleExportTypographyFit();
}

function getExportPageModels() {
  const encounterPages = chunkEncounters(state.encounters, EXPORT_ENCOUNTERS_PER_PAGE);
  let pageNumber = 0;

  if (!areSlayerGroupsEnabled()) {
    return encounterPages.map((encounters) => {
      pageNumber += 1;
      return {
        pageNumber,
        encounters,
        tag: "Roles",
        showGroup: false,
        roles: getRoles()
      };
    });
  }

  return encounterPages.flatMap((encounters) => {
    return SLAYER_TAGS.map((tag) => {
      pageNumber += 1;
      return {
        pageNumber,
        encounters,
        tag,
        showGroup: true,
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
  const slayerTag = areSlayerGroupsEnabled()
    ? `<small>${escapeHtml(getRoleTag(role))}</small>`
    : "";
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
          ${slayerTag}
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
  const roles = DEFAULT_ROLES.map((role) => ({ ...role }));
  return {
    version: 3,
    settings: { ...DEFAULT_SETTINGS },
    meta: {
      title: "Trial Roster",
      trial: "",
      date: new Date().toISOString().slice(0, 10),
      time: "",
      lead: "",
      notes: ""
    },
    roles,
    encounters: DEFAULT_ENCOUNTERS.map((name) => createEncounter(name, roles))
  };
}

function createEncounter(name, roles = getRoles()) {
  return {
    id: createId(),
    name,
    notes: "",
    rows: createRows({}, roles)
  };
}

function createRows(source = {}, roles = DEFAULT_ROLES) {
  return roles.reduce((rows, role) => {
    rows[role.id] = normalizeRow(source[role.id]);
    return rows;
  }, {});
}

function createEmptyRow() {
  return ROW_FIELDS.reduce((row, field) => {
    row[field] = "";
    return row;
  }, {});
}

function normalizeRow(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return ROW_FIELDS.reduce((row, field) => {
    row[field] = typeof source[field] === "string" ? source[field] : "";
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
  const normalizedRoles = normalizeRoles(roster.roles, encounters);
  const normalizedEncounters = encounters.map((encounter) => normalizeEncounter(encounter, normalizedRoles));

  return {
    version: 3,
    settings: normalizeSettings(roster.settings),
    meta: {
      ...fallback.meta,
      ...(roster.meta && typeof roster.meta === "object" ? roster.meta : {})
    },
    roles: normalizedRoles,
    encounters: normalizedEncounters
  };
}

function normalizeRoles(inputRoles, encounters = []) {
  const savedRoles = Array.isArray(inputRoles) ? inputRoles.filter((role) => role && typeof role === "object") : [];
  const sourceRoles = savedRoles.length ? savedRoles : DEFAULT_ROLES;
  const usedIds = new Set();

  return sourceRoles.map((role, index) => {
    const defaultRole = DEFAULT_ROLES.find((item) => item.id === role.id) || DEFAULT_ROLES[index] || DEFAULT_ROLES[0];
    const roleId = normalizeRoleId(role.id, defaultRole?.id || `role-${index + 1}`, usedIds);
    const fallbackTag = defaultRole?.slayerTag || (index < 6 ? "Right Slayer" : "Left Slayer");
    const shortValue = typeof role.short === "string" ? role.short : role.code;

    return {
      id: roleId,
      name: normalizeRoleText(role.name, defaultRole?.name || `Role ${index + 1}`),
      className: normalizeRoleText(role.className, defaultRole?.className || "Open"),
      short: normalizeRoleText(shortValue, defaultRole?.short || `R${index + 1}`).slice(0, 4),
      color: normalizeRoleColor(role.color, defaultRole?.color || getRoleColorForIndex(index)),
      player: normalizeRoleText(role.player, migrateRolePlayer(roleId, encounters)),
      slayerTag: normalizeSlayerTag(role.slayerTag || role.tag || role.subpanel, fallbackTag)
    };
  });
}

function normalizeRoleText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeRoleColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function normalizeRoleId(value, fallback, usedIds) {
  const base = typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
  let candidate = base || `role-${usedIds.size + 1}`;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function normalizeSlayerTag(value, fallback) {
  return SLAYER_TAGS.includes(value) ? value : fallback;
}

function normalizeSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...DEFAULT_SETTINGS,
    slayerGroupsEnabled: source.slayerGroupsEnabled !== false && source.showSlayerGroups !== false
  };
}

function areSlayerGroupsEnabled() {
  return state.settings?.slayerGroupsEnabled !== false;
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

function normalizeEncounter(encounter, roles = DEFAULT_ROLES) {
  const normalized = encounter && typeof encounter === "object" ? encounter : {};
  return {
    id: typeof normalized.id === "string" && normalized.id ? normalized.id : createId(),
    name: typeof normalized.name === "string" && normalized.name ? normalized.name : "Encounter",
    notes: typeof normalized.notes === "string" ? normalized.notes : "",
    rows: createRows(normalized.rows && typeof normalized.rows === "object" ? normalized.rows : {}, roles)
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

function loadThemePreference() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch (error) {
    console.warn("Could not load theme preference", error);
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggleTheme() {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function setTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = currentTheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  } catch (error) {
    console.warn("Could not save theme preference", error);
  }
  syncThemeToggle();
}

function syncThemeToggle() {
  if (!elements.themeToggleButton || !elements.themeToggleLabel) {
    return;
  }
  const isDark = currentTheme === "dark";
  elements.themeToggleButton.setAttribute("aria-pressed", String(isDark));
  elements.themeToggleLabel.textContent = isDark ? "Light" : "Dark";
  elements.themeToggleButton.title = isDark ? "Switch to light mode" : "Switch to dark mode";
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
  fitExportTypography();
  growAllTextareas();
  window.print();
}

function scheduleExportTypographyFit() {
  window.cancelAnimationFrame(exportFitFrame);
  exportFitFrame = window.requestAnimationFrame(() => fitExportTypography());
}

function fitExportTypography() {
  if (!elements.exportSheet?.children.length) {
    return;
  }

  const stage = document.createElement("div");
  stage.className = "png-export-stage export-fit-stage";
  stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = elements.exportSheet.innerHTML;
  document.body.append(stage);

  try {
    fitExportStageTypography(stage);
    copyExportFitStyles(stage);
  } finally {
    stage.remove();
  }
}

function fitExportStageTypography(root) {
  root.querySelectorAll(".export-program-cell").forEach((cell) => {
    fitCompositeFont(cell, 8, 18, (size) => {
      const title = cell.querySelector("strong");
      const date = cell.querySelector("span");
      if (title) {
        applyDomFont(title, size, 1.06);
      }
      if (date) {
        applyDomFont(date, size * 0.72, 1.08);
      }
    });
  });

  root.querySelectorAll(".export-encounter-pill").forEach((pill) => {
    fitDomText(pill, {
      min: 7,
      max: 18,
      lineHeight: 1.08
    });
  });

  root.querySelectorAll(".export-group-row").forEach((row) => {
    fitCompositeFont(row, 8, 18, (size) => {
      applyDomFont(row.querySelector("strong"), size, 1.1);
      applyDomFont(row.querySelector("span"), size * 0.72, 1.1);
    });
  });

  root.querySelectorAll(".export-info-cell:not(.export-info-cell-empty)").forEach((cell) => {
    fitDomText(cell, {
      min: cell.querySelector(".export-empty-note") ? 7 : 6,
      max: cell.querySelector(".export-empty-note") ? 16 : 14.5,
      lineHeight: 1.22
    });
  });
}

function fitCompositeFont(element, min, max, apply) {
  let low = min;
  let high = max;
  let best = min;

  for (let step = 0; step < 9; step += 1) {
    const size = (low + high) / 2;
    apply(size);

    if (doesDomNodeFit(element)) {
      best = size;
      low = size;
    } else {
      high = size;
    }
  }

  apply(best);
}

function fitDomText(element, options) {
  fitCompositeFont(element, options.min, options.max, (size) => {
    applyDomFont(element, size, options.lineHeight);
  });
}

function applyDomFont(element, size, lineHeight = 1.1) {
  if (!element) {
    return;
  }
  element.style.fontSize = `${roundFontSize(size)}px`;
  element.style.lineHeight = String(lineHeight);
}

function doesDomNodeFit(element) {
  return element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
}

function copyExportFitStyles(stage) {
  [
    ".export-program-cell strong",
    ".export-program-cell span",
    ".export-encounter-pill",
    ".export-group-row strong",
    ".export-group-row span",
    ".export-info-cell"
  ].forEach((selector) => copyExportStyleList(stage, selector));
}

function copyExportStyleList(stage, selector) {
  const fittedNodes = Array.from(stage.querySelectorAll(selector));
  const exportNodes = Array.from(elements.exportSheet.querySelectorAll(selector));

  fittedNodes.forEach((source, index) => {
    const target = exportNodes[index];
    if (!target) {
      return;
    }
    target.style.fontSize = source.style.fontSize;
    target.style.lineHeight = source.style.lineHeight;
  });
}

function roundFontSize(value) {
  return Math.round(value * 10) / 10;
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
  const theme = getExportTheme();
  const width = PNG_EXPORT_WIDTH;
  const height = PNG_EXPORT_HEIGHT;
  const padding = 32;
  const gap = 11;
  const headerHeight = 116;
  const showGroup = page.showGroup !== false;
  const groupHeight = showGroup ? 64 : 0;
  const encounterCount = Math.max(1, page.encounters.length);
  const gridX = padding;
  const gridY = padding;
  const gridWidth = width - padding * 2;
  const gridHeight = height - padding * 2;
  const unit = (gridWidth - gap * encounterCount) / (encounterCount + 0.47);
  const roleWidth = unit * 0.47;
  const encounterWidth = unit;
  const rowCount = Math.max(6, page.roles.length || 6);
  const verticalGapCount = showGroup ? rowCount + 1 : rowCount;
  const roleHeight = (gridHeight - headerHeight - groupHeight - gap * verticalGapCount) / rowCount;
  const groupY = gridY + headerHeight + gap;
  const firstRoleY = showGroup ? groupY + groupHeight + gap : gridY + headerHeight + gap;

  drawExportPageBackground(ctx, width, height, theme);
  drawProgramCell(ctx, gridX, gridY, roleWidth, headerHeight, theme);

  page.encounters.forEach((encounter, index) => {
    const x = gridX + roleWidth + gap + index * (encounterWidth + gap);
    drawEncounterHeader(ctx, x, gridY, encounterWidth, headerHeight, encounter.name || `Encounter ${index + 1}`, theme);
  });

  if (showGroup) {
    drawGroupRowCanvas(ctx, gridX, groupY, gridWidth, groupHeight, page.tag, page.roles.length, theme);
  }

  page.roles.forEach((role, rowIndex) => {
    const y = firstRoleY + rowIndex * (roleHeight + gap);
    drawExportRoleCellCanvas(ctx, gridX, y, roleWidth, roleHeight, role, theme);

    page.encounters.forEach((encounter, encounterIndex) => {
      const x = gridX + roleWidth + gap + encounterIndex * (encounterWidth + gap);
      drawExportInfoCellCanvas(ctx, x, y, encounterWidth, roleHeight, encounter, role, theme);
    });
  });
}

function getExportTheme() {
  const dark = currentTheme === "dark";
  return {
    dark,
    pageBackground: dark ? "#101615" : "#f8fbfb",
    pageStroke: dark ? "rgba(159, 177, 174, 0.22)" : "rgba(28, 42, 43, 0.18)",
    pageTeal: dark ? "rgba(15, 118, 110, 0.22)" : "rgba(15, 118, 110, 0.13)",
    pageCoral: dark ? "rgba(194, 65, 54, 0.15)" : "rgba(194, 65, 54, 0.12)",
    programGradient: dark ? ["#0f1716", "#243330", "#0f766e"] : ["#202828", "#314142", "#0f766e"],
    programText: "#ffffff",
    programMuted: dark ? "#cce4e0" : "#d8e7e5",
    pillTop: dark ? "#1b2523" : "#ffffff",
    pillBottom: dark ? "#243330" : "#edf7f5",
    pillText: dark ? "#eaf6f4" : "#123635",
    pillStroke: dark ? "rgba(53, 211, 196, 0.36)" : "rgba(15, 118, 110, 0.32)",
    groupMuted: dark ? "#cce4e0" : "#d6e4e3",
    panelStroke: dark ? "rgba(159, 177, 174, 0.18)" : "rgba(21, 32, 33, 0.13)",
    roleFill: dark ? "#17201f" : "#ffffff",
    tokenTop: dark ? "#202c2a" : "#ffffff",
    roleText: dark ? "#f2f7f6" : "#111111",
    roleMuted: dark ? "#aebdb9" : "#4d5a5c",
    infoTop: dark ? "rgba(27, 37, 35, 0.98)" : "rgba(255, 255, 255, 0.98)",
    infoBottom: dark ? "rgba(18, 26, 25, 0.96)" : "rgba(248, 251, 251, 0.96)",
    infoLabel: dark ? "#35d3c4" : "#08746d",
    infoText: dark ? "#d9e6e3" : "#243132",
    emptyText: dark ? "#91a7a3" : "#7c8a8d",
    panelShadow: dark ? "rgba(0, 0, 0, 0.24)" : "rgba(31, 37, 37, 0.1)",
    strongShadow: dark ? "rgba(0, 0, 0, 0.34)" : "rgba(21, 32, 33, 0.16)"
  };
}

function drawExportPageBackground(ctx, width, height, theme) {
  drawRoundedPath(ctx, 1, 1, width - 2, height - 2, 36);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = theme.pageBackground;
  ctx.fillRect(0, 0, width, height);

  const teal = ctx.createLinearGradient(0, 0, width * 0.55, height * 0.52);
  teal.addColorStop(0, theme.pageTeal);
  teal.addColorStop(1, "rgba(15, 118, 110, 0)");
  ctx.fillStyle = teal;
  ctx.fillRect(0, 0, width, height);

  const coral = ctx.createLinearGradient(width, height, width * 0.55, height * 0.48);
  coral.addColorStop(0, theme.pageCoral);
  coral.addColorStop(1, "rgba(194, 65, 54, 0)");
  ctx.fillStyle = coral;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.strokeStyle = theme.pageStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawProgramCell(ctx, x, y, width, height, theme) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, theme.programGradient[0]);
  gradient.addColorStop(0.62, theme.programGradient[1]);
  gradient.addColorStop(1, theme.programGradient[2]);
  drawPanel(ctx, x, y, width, height, 28, gradient, theme.strongShadow);

  ctx.fillStyle = theme.programText;
  drawFittedCanvasText(ctx, formatMetaValue("title"), {
    x: x + 14,
    y: y + 20,
    width: width - 28,
    height: height - 58,
    minSize: 13,
    maxSize: 30,
    weight: 850,
    align: "center",
    maxLines: 2,
    lineHeight: 1.08,
    color: theme.programText
  });
  ctx.fillStyle = theme.programMuted;
  drawFittedCanvasText(ctx, formatDateTimeForExport(), {
    x: x + 14,
    y: y + height - 40,
    width: width - 28,
    height: 24,
    minSize: 9,
    maxSize: 18,
    weight: 780,
    align: "center",
    maxLines: 1,
    lineHeight: 1.08,
    color: theme.programMuted
  });
}

function drawEncounterHeader(ctx, x, y, width, height, label, theme) {
  const pillWidth = Math.min(width * 0.92, 460);
  const pillHeight = 54;
  const pillX = x + (width - pillWidth) / 2;
  const pillY = y + (height - pillHeight) / 2;
  const gradient = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillHeight);
  gradient.addColorStop(0, theme.pillTop);
  gradient.addColorStop(1, theme.pillBottom);
  drawPanel(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2, gradient, theme.panelShadow, {
    stroke: theme.pillStroke,
    shadowBlur: 18,
    shadowOffsetY: 8
  });

  ctx.fillStyle = theme.pillText;
  drawFittedCanvasText(ctx, label, {
    x: pillX + 16,
    y: pillY + 8,
    width: pillWidth - 32,
    height: pillHeight - 16,
    minSize: 9,
    maxSize: 22,
    weight: 850,
    align: "center",
    maxLines: 2,
    lineHeight: 1.08,
    color: theme.pillText
  });
}

function drawGroupRowCanvas(ctx, x, y, width, height, tag, roleCount, theme) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, theme.programGradient[0]);
  gradient.addColorStop(0.58, theme.programGradient[1]);
  gradient.addColorStop(1, theme.programGradient[2]);
  drawPanel(ctx, x, y, width, height, 18, gradient, theme.strongShadow, {
    shadowBlur: 20,
    shadowOffsetY: 9
  });

  ctx.fillStyle = "#ffffff";
  drawFittedCanvasText(ctx, tag, {
    x: x + 24,
    y: y + 14,
    width: width * 0.55,
    height: height - 24,
    minSize: 10,
    maxSize: 24,
    weight: 850,
    align: "left",
    maxLines: 1,
    lineHeight: 1.1,
    color: theme.programText
  });

  ctx.fillStyle = theme.groupMuted;
  drawFittedCanvasText(ctx, `${roleCount} roles`.toUpperCase(), {
    x: x + width * 0.58,
    y: y + 17,
    width: width * 0.42 - 24,
    height: height - 24,
    minSize: 8,
    maxSize: 16,
    weight: 850,
    align: "right",
    maxLines: 1,
    lineHeight: 1.1,
    color: theme.groupMuted
  });
}

function drawExportRoleCellCanvas(ctx, x, y, width, height, role, theme) {
  const roleColor = normalizeRoleColor(role.color, "#4b5563");
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, mixHex(roleColor, theme.roleFill, 0.24));
  gradient.addColorStop(1, theme.roleFill);
  drawPanel(ctx, x, y, width, height, 20, gradient, theme.panelShadow, {
    stroke: theme.panelStroke,
    shadowBlur: 17,
    shadowOffsetY: 9
  });

  const tokenSize = Math.min(34, Math.max(25, width * 0.22));
  const tokenX = x + 12;
  const textX = tokenX + tokenSize + 10;
  const textWidth = Math.max(20, x + width - textX - 10);
  const nameSize = 18;
  const classSize = 13.5;
  const playerSize = 15.5;
  const nameLineHeight = 20;
  const classLineHeight = 17;
  const playerLineHeight = 18;

  setCanvasFont(ctx, nameSize, 850);
  const nameLines = wrapCanvasText(ctx, role.name || "Role", textWidth, 2, { truncate: true });
  setCanvasFont(ctx, classSize, 700);
  const classLines = wrapCanvasText(ctx, role.className || "", textWidth, 2, { truncate: true });
  setCanvasFont(ctx, playerSize, 900);
  const playerLines = wrapCanvasText(ctx, role.player || "Player", textWidth, 2, { truncate: true });
  const textBlockHeight =
    nameLines.length * nameLineHeight +
    classLines.length * classLineHeight +
    Math.min(playerLines.length, 2) * playerLineHeight;
  const contentHeight = Math.max(tokenSize, textBlockHeight);
  const contentY = y + Math.max(0, (height - contentHeight) / 2);
  const tokenY = contentY + (contentHeight - tokenSize) / 2;
  const tokenGradient = ctx.createLinearGradient(tokenX, tokenY, tokenX, tokenY + tokenSize);
  tokenGradient.addColorStop(0, theme.tokenTop);
  tokenGradient.addColorStop(1, mixHex(roleColor, theme.tokenTop, 0.2));
  drawPanel(ctx, tokenX, tokenY, tokenSize, tokenSize, 10, tokenGradient, theme.panelShadow, {
    stroke: mixHex(roleColor, theme.tokenTop, 0.62),
    shadowBlur: 10,
    shadowOffsetY: 5
  });

  ctx.fillStyle = mixHex(roleColor, theme.roleText, 0.76);
  setCanvasFont(ctx, Math.max(11, tokenSize * 0.42), 900);
  ctx.textAlign = "center";
  ctx.fillText(role.short || "--", tokenX + tokenSize / 2, tokenY + tokenSize * 0.32);
  ctx.textAlign = "left";

  let textY = contentY + Math.max(0, (contentHeight - textBlockHeight) / 2);

  ctx.fillStyle = theme.roleText;
  setCanvasFont(ctx, nameSize, 850);
  nameLines.forEach((line) => {
    ctx.fillText(line, textX, textY);
    textY += nameLineHeight;
  });

  ctx.fillStyle = theme.roleMuted;
  setCanvasFont(ctx, classSize, 700);
  classLines.forEach((line) => {
    ctx.fillText(line, textX, textY + 2);
    textY += classLineHeight;
  });

  ctx.fillStyle = mixHex(roleColor, theme.roleText, 0.78);
  setCanvasFont(ctx, playerSize, 900);
  playerLines.forEach((line) => {
    if (textY < y + height - 18) {
      ctx.fillText(line, textX, textY + 5);
      textY += playerLineHeight;
    }
  });
}

function drawExportInfoCellCanvas(ctx, x, y, width, height, encounter, role, theme) {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, theme.infoTop);
  gradient.addColorStop(1, theme.infoBottom);
  drawPanel(ctx, x, y, width, height, 20, gradient, theme.panelShadow, {
    stroke: theme.panelStroke,
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

  const inset = 20;
  const maxWidth = width - inset * 2;

  if (!lines.length) {
    drawFittedCanvasText(ctx, "Encounter details", {
      x: x + inset,
      y: y + 18,
      width: maxWidth,
      height: height - 36,
      minSize: 9,
      maxSize: 18,
      weight: 760,
      align: "left",
      maxLines: 1,
      lineHeight: 1.18,
      color: theme.emptyText
    });
    return;
  }

  const layout = fitInfoCanvasLayout(ctx, lines, maxWidth, height - 36, theme);
  drawInfoCanvasLayout(ctx, layout, x + inset, y + 18);
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

function drawFittedCanvasText(ctx, text, options) {
  const layout = fitCanvasTextBlock(ctx, text, options);
  setCanvasFont(ctx, layout.size, options.weight, options.style);
  ctx.fillStyle = options.color || ctx.fillStyle;
  ctx.textAlign = options.align || "left";

  layout.lines.forEach((line, index) => {
    const y = options.y + index * layout.lineHeight;
    const x = options.align === "center"
      ? options.x + options.width / 2
      : options.align === "right"
        ? options.x + options.width
        : options.x;
    ctx.fillText(line, x, y);
  });

  ctx.textAlign = "left";
}

function fitCanvasTextBlock(ctx, text, options) {
  let low = options.minSize;
  let high = options.maxSize;
  let best = createCanvasTextLayout(ctx, text, options, low, true);

  for (let step = 0; step < 9; step += 1) {
    const size = (low + high) / 2;
    const layout = createCanvasTextLayout(ctx, text, options, size, false);

    if (layout.fits) {
      best = layout;
      low = size;
    } else {
      high = size;
    }
  }

  return best;
}

function createCanvasTextLayout(ctx, text, options, size, truncate) {
  setCanvasFont(ctx, size, options.weight, options.style);
  const lineHeight = size * (options.lineHeight || 1.1);
  const lines = wrapCanvasText(ctx, text, options.width, options.maxLines || Infinity, { truncate });
  const measuredWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
  const measuredHeight = lines.length * lineHeight;

  return {
    size,
    lines,
    lineHeight,
    fits: measuredWidth <= options.width + 0.5 && measuredHeight <= options.height + 0.5
  };
}

function fitInfoCanvasLayout(ctx, lines, width, height, theme) {
  let low = 8;
  let high = 18;
  let best = createInfoCanvasLayout(ctx, lines, width, low, true, height, theme);

  for (let step = 0; step < 9; step += 1) {
    const size = (low + high) / 2;
    const layout = createInfoCanvasLayout(ctx, lines, width, size, false, height, theme);

    if (layout.fits) {
      best = layout;
      low = size;
    } else {
      high = size;
    }
  }

  if (!best.fits) {
    best = createInfoCanvasLayout(ctx, lines, width, low, true, height, theme);
  }

  return best;
}

function createInfoCanvasLayout(ctx, lines, width, size, truncate = false, maxHeight = Infinity, theme = getExportTheme()) {
  const labelSize = size * 1.16;
  const lineHeight = Math.max(labelSize, size) * 1.22;
  const gap = size * 0.3;
  const output = [];
  let y = 0;
  let fits = true;

  for (const line of lines) {
    const label = `${line.label}: `;
    const value = String(line.value || "");
    setCanvasFont(ctx, labelSize, 880);
    const labelWidth = Math.min(ctx.measureText(label).width, width);
    setCanvasFont(ctx, size, 700);
    const firstLineWidth = Math.max(0, width - labelWidth);
    const firstLine = takeCanvasWordsForWidth(ctx, value, firstLineWidth);
    const remainingValue = firstLine.remaining;
    const valueLines = remainingValue
      ? wrapCanvasText(ctx, remainingValue, width, Infinity, { truncate: false })
      : [];

    const fieldLines = [
      {
        segments: [
          { text: label, x: 0, size: labelSize, weight: 880, color: theme.infoLabel },
          ...(firstLine.text ? [{ text: firstLine.text, x: labelWidth, size, weight: 700, color: theme.infoText }] : [])
        ]
      },
      ...valueLines.map((text) => ({
        segments: [{ text, x: 0, size, weight: 700, color: theme.infoText }]
      }))
    ];

    for (const fieldLine of fieldLines) {
      if (y + lineHeight > maxHeight) {
        fits = false;
        if (truncate) {
          const lastY = Math.max(0, maxHeight - lineHeight);
          output.push({
            y: lastY,
            lineHeight,
            segments: [{ text: "...", x: 0, size, weight: 700, color: theme.infoText }]
          });
          return { lines: output, height: maxHeight, fits: true };
        }
        return { lines: output, height: y, fits };
      }
      output.push({ ...fieldLine, y, lineHeight });
      y += lineHeight;
    }
    y += gap;
  }

  return {
    lines: output,
    height: y,
    fits
  };
}

function drawInfoCanvasLayout(ctx, layout, x, y) {
  layout.lines.forEach((line) => {
    line.segments.forEach((segment) => {
      ctx.fillStyle = segment.color;
      setCanvasFont(ctx, segment.size, segment.weight);
      ctx.fillText(segment.text, x + segment.x, y + line.y);
    });
  });
}

function takeCanvasWordsForWidth(ctx, value, maxWidth) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  if (!words.length || maxWidth <= 0) {
    return { text: "", remaining: words.join(" ") };
  }

  let text = "";
  let index = 0;

  while (index < words.length) {
    const test = text ? `${text} ${words[index]}` : words[index];
    if (ctx.measureText(test).width <= maxWidth || !text) {
      if (ctx.measureText(test).width > maxWidth && !text) {
        break;
      }
      text = test;
      index += 1;
      continue;
    }
    break;
  }

  return {
    text,
    remaining: words.slice(index).join(" ")
  };
}

function setCanvasFont(ctx, size, weight = 700, style = "normal") {
  ctx.font = `${style} ${weight} ${size}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function wrapCanvasText(ctx, value, maxWidth, maxLines = Infinity, options = {}) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  let didTruncate = false;

  const pushLine = (line) => {
    if (lines.length >= maxLines) {
      didTruncate = true;
      return false;
    }
    lines.push(line);
    return true;
  };

  for (const word of words) {
    if (!current && ctx.measureText(word).width > maxWidth) {
      const chunks = splitLongCanvasWord(ctx, word, maxWidth);
      for (const chunk of chunks) {
        if (current && !pushLine(current)) {
          break;
        }
        current = chunk;
      }
      continue;
    }

    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      continue;
    }
    if (!pushLine(current)) {
      current = "";
      break;
    }
    current = word;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current) {
    didTruncate = true;
  }

  if (!lines.length) {
    return [""];
  }

  if (options.truncate && didTruncate) {
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

function splitLongCanvasWord(ctx, word, maxWidth) {
  const chunks = [];
  let current = "";

  for (const character of word) {
    const test = `${current}${character}`;
    if (ctx.measureText(test).width <= maxWidth || !current) {
      current = test;
      continue;
    }
    chunks.push(current);
    current = character;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
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

function createUniqueRoleId(base) {
  const existingIds = new Set(getRoles().map((role) => role.id));
  const cleanBase = slugify(base || "custom-role") || "custom-role";
  let candidate = cleanBase;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function getRoleColorForIndex(index) {
  return ROLE_COLOR_PALETTE[index % ROLE_COLOR_PALETTE.length];
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
