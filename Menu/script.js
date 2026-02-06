// ===============================
// HELPERS
// ===============================
const $ = (sel) => document.querySelector(sel);

// ===============================
// ELEMENTS
// ===============================
const els = {
  widgetUrl: $("#widgetUrlInput"),
  copyBtn: $("#btnWidgetUrl"),
  statusPill: $("#statusPill"),
  countPill: $("#countPill"),
  sectionsMount: document.querySelector(".left"),
};

// ===============================
// STATE & SCHEMA
// ===============================
let schema = null;
let state = {};

// ===============================
// STATE INIT
// ===============================
function setDefaultState() {
  state = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      state[field.id] = field.default;
    }
  }
}

// ===============================
// FIELD RENDERER (CLON DEL BUENO)
// ===============================
function renderField(field) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const label = document.createElement("div");
  label.className = "fieldLabel";

  const labelText = document.createElement("span");
  labelText.textContent = field.label;

  const meta = document.createElement("span");
  meta.className = "fieldMeta";
  meta.textContent = field.param;

  label.append(labelText, meta);
  wrap.appendChild(label);

  const row = document.createElement("div");
  row.className = "row";

  let input;

  // SWITCH
  if (field.type === "switch") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!state[field.id];

    const line = document.createElement("label");
    line.className = "switchLine";
    line.appendChild(input);

    const txt = document.createElement("span");
    txt.textContent = input.checked ? "Activado" : "Desactivado";
    line.appendChild(txt);

    input.addEventListener("change", () => {
      state[field.id] = input.checked;
      txt.textContent = input.checked ? "Activado" : "Desactivado";
      buildUrl();
    });

    row.appendChild(line);
    wrap.appendChild(row);
    return wrap;
  }

  // COLOR
  if (field.type === "color" && field.variant === "swatch") {
    const wrapper = document.createElement("div");
    wrapper.className = "colorPicker";

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "colorSwatch";
    swatch.style.setProperty("--swatch-color", state[field.id]);

    const input = document.createElement("input");
    input.type = "color";
    input.value = state[field.id];
    input.className = "colorInput";

    input.addEventListener("input", () => {
      state[field.id] = input.value;
      swatch.style.setProperty("--swatch-color", input.value);
      buildUrl();
      refreshPreview?.();
    });

    swatch.addEventListener("click", () => input.click());

    wrapper.appendChild(swatch);
    wrapper.appendChild(input);
    wrap.appendChild(wrapper);

    return wrap;
  }

  // SELECT 
  if (field.type === "select") {
        const select = document.createElement("select");
        select.className = "input";
        select.id = field.id;

        const options = field.options ?? [];

        options.forEach((opt) => {
            const option = document.createElement("option");
            option.value = String(opt.value);
            option.textContent = opt.label;
            select.appendChild(option);
        });

        select.value = String(state[field.id] ?? field.default);

        select.addEventListener("change", () => {
            state[field.id] = select.value;
            buildUrl();
            refreshPreview?.();
        });

        wrap.appendChild(select);
        return wrap;
    }


  if (field.description) {
    const desc = document.createElement("div");
    desc.className = "fieldDesc";
    desc.textContent = field.description;
    wrap.appendChild(desc);
  }

  // NUMBER / TEXT
  input = document.createElement("input");
  input.className = "input";
  input.type = field.type === "number" ? "number" : "text";
  input.value = state[field.id];

  if (field.min !== undefined) input.min = field.min;
  if (field.max !== undefined) input.max = field.max;
  if (field.step !== undefined) input.step = field.step;
  if (field.placeholder) input.placeholder = field.placeholder;

  input.addEventListener("input", () => {
    state[field.id] =
      field.type === "number" ? Number(input.value) : input.value;
    buildUrl();
  });

  wrap.appendChild(input);
  return wrap;
}

// ===============================
// SECTION / CARD RENDERER
// ===============================
function renderSections() {
  // eliminar cards dinámicas previas
  els.sectionsMount
    .querySelectorAll(".card.dynamic")
    .forEach((c) => c.remove());

  for (const section of schema.sections) {
    const card = document.createElement("div");
    card.className = "card dynamic";

    card.innerHTML = `
      <div class="cardHeader">
        <h2 class="cardTitle">${section.title}</h2>
        <p class="cardHint">${section.description ?? ""}</p>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "sectionBody";

    section.fields.forEach((field) => {
      body.appendChild(renderField(field));
    });

    card.appendChild(body);
    els.sectionsMount.appendChild(card);
  }
}

function normalizeBaseUrl(url) {
    return (url || "").trim();
}

function toQueryValue(field, value) {
    // Boolean switches -> "true"/"false"
    if (field.type === "switch") return value ? "true" : "false";
    // Everything else -> string
    return String(value ?? "");
}

// ===============================
// URL BUILDER (STATE-DRIVEN)
// ===============================
function buildUrl() {
  const baseUrl = normalizeBaseUrl(schema?.base?.defaultBaseUrl);

  if (!baseUrl) {
    if (els.widgetUrl) els.widgetUrl.value = "";
    if (els.statusPill) {
      els.statusPill.textContent = "Falta URL base";
      els.statusPill.style.background = "rgba(255, 77, 77, 0.16)";
      els.statusPill.style.borderColor = "rgba(255, 77, 77, 0.22)";
    }
    if (els.countPill) els.countPill.textContent = "0 parametros";
    return "";
  }

  const url = new URL(baseUrl, window.location.href);

  let count = 0;
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const v = state[field.id];
      url.searchParams.set(field.param, toQueryValue(field, v));
      count++;
    }
  }

  els.widgetUrl.value = url.toString();

  if (els.statusPill) {
    els.statusPill.textContent = "Listo";
    els.statusPill.style.background = "rgba(0, 255, 136, 0.14)";
    els.statusPill.style.borderColor = "rgba(0, 255, 136, 0.20)";
  }
  if (els.countPill) els.countPill.textContent = `${count} parametros`;

  return url.toString();
}

// ===============================
// COPY URL
// ===============================
function copyUrl() {
  const val = (els.widgetUrl?.value || "").trim();
  if (!val) return;

  navigator.clipboard.writeText(val).then(() => {
    if (els.statusPill) {
      els.statusPill.textContent = "Copiado ✅";
      els.statusPill.style.background = "rgba(169,112,255,0.18)";
      els.statusPill.style.borderColor = "rgba(169,112,255,0.26)";
      setTimeout(() => buildUrl(), 900);
    }
  });
}

// ===============================
// INIT
// ===============================
async function init() {
  const res = await fetch("./config/config.json", { cache: "no-store" });
  schema = await res.json();
  console.debug("Schema: ", schema);
  
  setDefaultState();
  renderSections();
  buildUrl();

  els.copyBtn.addEventListener("click", copyUrl);
}

document.addEventListener("DOMContentLoaded", init);