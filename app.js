const STORAGE_KEY = "modern-trial-roster-v1";

const DEFAULT_ROLES = [
  { id: "main-tank", name: "Main Tank", className: "Nightblade", short: "MT", color: "#b45309", player: "", tag: "Right Slayer" },
  { id: "off-tank", name: "Off Tank", className: "Sorcerer", short: "OT", color: "#6d5bd0", player: "", tag: "Right Slayer" },
  { id: "courage-healer", name: "Courage Healer", className: "Warden", short: "CH", color: "#0f766e", player: "", tag: "Right Slayer" },
  { id: "slayer-healer", name: "Slayer Healer", className: "Dragonknight", short: "SH", color: "#c24136", player: "", tag: "Right Slayer" },
  { id: "zenkosh", name: "ZenKosh", className: "Support", short: "ZK", color: "#8b5a2b", player: "", tag: "Right Slayer" },
  { id: "slayer-dps", name: "Slayer DPS", className: "Nightblade", short: "SD", color: "#b45309", player: "", tag: "Right Slayer" },
  { id: "force-dps", name: "Force DPS", className: "Arcanist", short: "FD", color: "#0f8a78", player: "", tag: "Left Slayer" },
  { id: "morag-dps", name: "Morag DPS", className: "Necromancer", short: "MD", color: "#5b6f7c", player: "", tag: "Left Slayer" },
  { id: "parse-nightblade", name: "Parse DPS", className: "Nightblade", short: "NB", color: "#b45309", player: "", tag: "Left Slayer" },
  { id: "parse-warden", name: "Parse DPS", className: "Warden", short: "WD", color: "#0f766e", player: "", tag: "Left Slayer" },
  { id: "parse-templar", name: "Parse DPS", className: "Templar", short: "TP", color: "#a16207", player: "", tag: "Left Slayer" },
  { id: "parse-open", name: "Parse DPS", className: "Open", short: "OP", color: "#4b5563", player: "", tag: "Left Slayer" }
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

let state = loadState();
let activeEncounterId = state.encounters[0]?.id;
let saveTimer;

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

  elements.roleKey.addEventListener("input", handleRoleEditorInput);
  elements.roleKey.addEventListener("change", handleRoleEditorInput);

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
      <div class="role-editor" style="--role-color: ${escapeAttribute(role.color)}">
        <div class="role-editor-top">
          <span class="class-token" aria-hidden="true">${escapeHtml(role.short || "--")}</span>
          <strong>Role ${index + 1}</strong>
        </div>
        <label>
          Player
          <input type="text" value="${escapeAttribute(role.player)}" data-role-id="${escapeAttribute(role.id)}" data-role-field="player" placeholder="@player">
        </label>
        <label>
          Slayer tag
          <select data-role-id="${escapeAttribute(role.id)}" data-role-field="tag">
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
      <button class="nav-item${activeClass}" type="button" data-encounter-target="${escapeAttribute(encounter.id)}">
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
  const encounterPages = chunkEncounters(state.encounters, 3);
  let pageNumber = 0;
  elements.exportSheet.innerHTML = encounterPages.map((encounters) => {
    const paddedEncounters = [...encounters];
    while (paddedEncounters.length < 3) {
      paddedEncounters.push(null);
    }

    return SLAYER_TAGS.map((tag) => {
      pageNumber += 1;
      const roles = getRoles().filter((role) => getRoleTag(role) === tag);
      return `
      <section class="export-page" aria-label="PDF roster page ${pageNumber}">
        <div class="export-grid">
          <div class="export-program-cell">
            <strong>${escapeHtml(formatMetaValue("title"))}</strong>
            <span>${escapeHtml(formatDateTimeForExport())}</span>
          </div>
          ${paddedEncounters.map(renderExportEncounterHeader).join("")}
          ${renderExportGroupRow(tag, roles.length)}
          ${roles.map((role) => renderExportRoleBand(role, paddedEncounters)).join("")}
        </div>
      </section>
      `;
    }).join("");
  }).join("");
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
    <article class="role-row" style="--role-color: ${role.color}">
      <div class="role-cell">
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
  const savedRoles = Array.isArray(inputRoles) ? inputRoles : [];
  const savedById = new Map(savedRoles.map((role) => [role.id, role]));

  return DEFAULT_ROLES.map((defaultRole) => {
    const savedRole = savedById.get(defaultRole.id) || {};
    return {
      ...defaultRole,
      name: normalizeRoleText(savedRole.name, defaultRole.name),
      className: normalizeRoleText(savedRole.className, defaultRole.className),
      short: normalizeRoleText(savedRole.short, defaultRole.short).slice(0, 4),
      color: normalizeRoleColor(savedRole.color, defaultRole.color),
      player: normalizeRoleText(savedRole.player, migrateRolePlayer(defaultRole.id, encounters)),
      tag: normalizeSlayerTag(savedRole.tag, defaultRole.tag)
    };
  });
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
  return normalizeSlayerTag(role.tag, "Right Slayer");
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

function saveState() {
  window.clearTimeout(saveTimer);
  elements.saveStatus.textContent = "Saving";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveTimer = window.setTimeout(() => setStatus("Saved"), 180);
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

function findEncounter(id) {
  return state.encounters.find((encounter) => encounter.id === id);
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.meta.title || "roster")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("JSON exported");
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
