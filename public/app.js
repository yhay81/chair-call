const CLIENT_KEY = "chair-call:client:v1";
const VISIT_KEY = "chair-call:last-visit:v1";
const MANAGED_KEY = "chair-call:managed:v1";

const labels = {
  areas: {
    central: "都心",
    east: "東側",
    west: "西側",
    north: "北側",
  },
  kinds: {
    practice: "練習モデル",
    shoot: "撮影モデル",
  },
  menus: {
    cut: "カット",
    color: "カラー",
    perm: "パーマ",
    straight: "縮毛矯正",
    treatment: "トリートメント",
  },
  hair: {
    any: "指定なし",
    short: "ショート",
    medium: "ミディアム",
    long: "ロング",
  },
};

function getClientId() {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

function apiHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "X-Chair-Client": getClientId(),
    ...extra,
  };
}

function record(event) {
  void fetch("/api/events", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}

function noteVisit() {
  const lastVisit = localStorage.getItem(VISIT_KEY);
  if (lastVisit && Date.now() - Number(lastVisit) > 20 * 60 * 60 * 1000) {
    record("returned");
  }
  localStorage.setItem(VISIT_KEY, String(Date.now()));
  record("visited");
}

function formatPrice(price) {
  return price === 0 ? "無料" : `¥${Number(price).toLocaleString("ja-JP")}`;
}

function formatSlot(slot) {
  const date = new Date(`${slot}:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createCallCard(listing) {
  const article = createElement("article", "call-card");
  article.dataset.area = listing.area;
  article.dataset.menus = listing.menus.join(" ");
  article.dataset.price = String(listing.price);
  article.dataset.search = `${listing.salonName} ${listing.station}`.toLocaleLowerCase("ja");

  const link = createElement("a");
  link.href = `/calls/${listing.id}`;
  const top = createElement("div", "card-topline");
  top.append(
    createElement("span", "", labels.kinds[listing.kind] ?? listing.kind),
    createElement("span", "", `${listing.slots.length}枠`),
  );
  const salon = createElement("h3", "", listing.salonName);
  const station = createElement(
    "p",
    "card-station",
    `${labels.areas[listing.area] ?? listing.area} · ${listing.station}`,
  );
  const menus = createElement("div", "card-menus");
  for (const menu of listing.menus) {
    menus.append(createElement("span", "", labels.menus[menu] ?? menu));
  }
  const price = createElement("strong", "card-price", formatPrice(listing.price));
  const hair = createElement("span", "card-hair", labels.hair[listing.hair] ?? listing.hair);
  const slots = createElement("div", "slot-rail");
  for (const slot of listing.slots.slice(0, 3)) {
    slots.append(createElement("span", "", formatSlot(slot)));
  }
  link.append(top, salon, station, menus, price, hair, slots);
  article.append(link);
  return article;
}

async function setupHome() {
  const grid = document.querySelector("#call-grid");
  const empty = document.querySelector("#board-empty");
  const count = document.querySelector("#listing-count");
  const search = document.querySelector("#listing-search");
  const free = document.querySelector("#free-filter");
  const areaButtons = [...document.querySelectorAll("#area-filter button")];
  const menuButtons = [...document.querySelectorAll("#menu-filter button")];
  if (!grid || !empty || !count || !search || !free) return;

  let area = "all";
  let menu = "all";
  let listings = [];

  function selectButton(buttons, selected) {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.value === selected));
    }
  }

  function render() {
    const needle = search.value.normalize("NFKC").trim().toLocaleLowerCase("ja");
    const visible = listings.filter(
      (listing) =>
        (area === "all" || listing.area === area) &&
        (menu === "all" || listing.menus.includes(menu)) &&
        (!free.checked || listing.price === 0) &&
        (!needle ||
          `${listing.salonName} ${listing.station}`.toLocaleLowerCase("ja").includes(needle)),
    );
    grid.replaceChildren(...visible.map(createCallCard));
    count.textContent = `${visible.length}件`;
    empty.hidden = visible.length > 0;
  }

  for (const button of areaButtons) {
    button.addEventListener("click", () => {
      area = button.dataset.value ?? "all";
      selectButton(areaButtons, area);
      render();
    });
  }
  for (const button of menuButtons) {
    button.addEventListener("click", () => {
      menu = button.dataset.value ?? "all";
      selectButton(menuButtons, menu);
      render();
    });
  }
  search.addEventListener("input", render);
  free.addEventListener("change", render);

  try {
    const response = await fetch("/api/listings", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("load_failed");
    const payload = await response.json();
    listings = Array.isArray(payload.listings) ? payload.listings : [];
  } catch {
    count.textContent = "読込エラー";
    empty.querySelector("p").textContent = "募集を読み込めませんでした";
  }
  render();
}

function japanDateTimeInput(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function formValues(form) {
  const data = new FormData(form);
  return {
    salonName: String(data.get("salonName") ?? ""),
    kind: String(data.get("kind") ?? "practice"),
    menus: data.getAll("menus").map(String),
    area: String(data.get("area") ?? "central"),
    station: String(data.get("station") ?? ""),
    price: Number(data.get("price") ?? 0),
    hair: String(data.get("hair") ?? "any"),
    slots: data.getAll("slots").map(String).filter(Boolean),
    note: String(data.get("note") ?? ""),
    contactUrl: String(data.get("contactUrl") ?? ""),
    confirmed: data.get("confirmed") === "on",
  };
}

function saveManagedListing(id, token) {
  let items = [];
  try {
    const saved = JSON.parse(localStorage.getItem(MANAGED_KEY) ?? "[]");
    if (Array.isArray(saved)) items = saved;
  } catch {
    items = [];
  }
  const next = [{ id, token }, ...items.filter((item) => item?.id !== id)].slice(0, 12);
  localStorage.setItem(MANAGED_KEY, JSON.stringify(next));
}

function setupCreate() {
  const form = document.querySelector("#call-form");
  const addSlot = document.querySelector("#add-slot");
  const slotLabels = [...document.querySelectorAll("#slot-inputs label")];
  const menuInputs = [...document.querySelectorAll('input[name="menus"]')];
  const error = document.querySelector("#form-error");
  if (!form || !addSlot || !error) return;

  const minimum = japanDateTimeInput(new Date(Date.now() + 30 * 60 * 1000));
  const maximum = japanDateTimeInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  for (const input of form.querySelectorAll('input[type="datetime-local"]')) {
    input.min = minimum;
    input.max = maximum;
  }

  addSlot.addEventListener("click", () => {
    const next = slotLabels.find((label) => label.hidden);
    if (next) next.hidden = false;
    addSlot.hidden = !slotLabels.some((label) => label.hidden);
  });

  for (const input of menuInputs) {
    input.addEventListener("change", () => {
      const selected = menuInputs.filter((choice) => choice.checked);
      if (selected.length > 3) {
        input.checked = false;
        error.textContent = "施術メニューは3つまで選べます";
        error.hidden = false;
      } else {
        error.hidden = true;
      }
      updatePreview();
    });
  }

  function updatePreview() {
    const values = formValues(form);
    document.querySelector("#preview-kind").textContent = labels.kinds[values.kind] ?? "練習モデル";
    document.querySelector("#preview-salon").textContent = values.salonName || "サロン表示名";
    document.querySelector("#preview-station").textContent =
      `${labels.areas[values.area] ?? "都心"} · ${values.station || "最寄り駅"}`;
    document.querySelector("#preview-price").textContent = formatPrice(values.price);
    const menus = document.querySelector("#preview-menus");
    menus.replaceChildren(
      ...(values.menus.length ? values.menus : ["cut"]).map((menu) =>
        createElement("span", "", labels.menus[menu] ?? menu),
      ),
    );
    const slots = document.querySelector("#preview-slots");
    slots.replaceChildren(
      ...(values.slots.length
        ? values.slots.slice(0, 3).map((slot) => createElement("span", "", formatSlot(slot)))
        : [createElement("span", "", "候補日時がここに並びます")]),
    );
  }

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "公開しています";
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(formValues(form)),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "publish_failed");
      saveManagedListing(payload.id, payload.manageToken);
      location.assign(payload.manageUrl);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "publish_failed";
      const messages = {
        invalid_fields: "入力項目を確認してください",
        invalid_text: "表示名、駅名、補足を確認してください",
        personal_data: "住所、電話、メール、URLは連絡先欄以外へ書けません",
        invalid_contact: "Instagram、LINE、XのHTTPS URLを入力してください",
        invalid_menus: "施術メニューを1〜3つ選んでください",
        invalid_slots: "14日以内の候補日時を1〜5件入力してください",
        confirmation_required: "掲載条件を確認してください",
        rate_limited: "少し時間を置いてからお試しください",
      };
      error.textContent = messages[code] ?? "募集カードを公開できませんでした";
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = "募集カードを公開";
    }
  });
  updatePreview();
}

function managedTokenFor(id) {
  const fragment = new URLSearchParams(location.hash.slice(1)).get("token");
  if (fragment && /^[0-9a-f]{64}$/.test(fragment)) {
    saveManagedListing(id, fragment);
    return fragment;
  }
  try {
    const items = JSON.parse(localStorage.getItem(MANAGED_KEY) ?? "[]");
    const item = Array.isArray(items) ? items.find((entry) => entry?.id === id) : null;
    return item && /^[0-9a-f]{64}$/.test(item.token) ? item.token : "";
  } catch {
    return "";
  }
}

async function setupManage() {
  const main = document.querySelector("[data-listing-id]");
  const status = document.querySelector("#manage-status");
  const actions = document.querySelector("#manage-actions");
  if (!main || !status || !actions) return;
  const id = main.dataset.listingId ?? "";
  const token = managedTokenFor(id);
  if (!token) {
    status.textContent = "この端末に管理鍵がありません。作成時の管理URLを開いてください。";
    return;
  }
  const response = await fetch(`/api/listings/${id}`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    status.textContent = "この募集は終了したか、公開されていません。";
    return;
  }
  const payload = await response.json();
  status.textContent = `${payload.listing.salonName} · ${payload.listing.station}`;
  actions.hidden = false;

  document.querySelector("#copy-call-url").addEventListener("click", async () => {
    const button = document.querySelector("#copy-call-url");
    if (!button) return;
    await navigator.clipboard.writeText(`${location.origin}/calls/${id}`);
    button.textContent = "コピー済み";
  });
  document.querySelector("#close-call").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const closeResponse = await fetch(`/api/listings/${id}/close`, {
      method: "POST",
      headers: apiHeaders({ "X-Chair-Manage": token }),
    });
    if (closeResponse.ok) {
      status.textContent = "募集を終了しました";
      actions.hidden = true;
    } else {
      button.disabled = false;
      status.textContent = "募集を終了できませんでした";
    }
  });
}

function setupCall() {
  const ticket = document.querySelector(".detail-ticket");
  const picker = document.querySelector("#slot-picker");
  const message = document.querySelector("#application-message");
  const copy = document.querySelector("#copy-message");
  const contact = document.querySelector("#open-contact");
  const main = document.querySelector("[data-listing-id]");
  if (!ticket || !picker || !message || !copy || !contact || !main) return;

  function updateMessage() {
    const chosen = picker.querySelector('input[name="chosen-slot"]:checked');
    const slot = chosen ? formatSlot(chosen.value) : "候補日時";
    message.textContent = `こんにちは。Chair Callの募集を見ました。${slot}を希望します。まだ募集していますか？`;
  }
  picker.addEventListener("change", updateMessage);
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(message.textContent);
      copy.textContent = "コピー済み";
      record("message_copied");
    } catch {
      copy.textContent = "コピーできませんでした";
    }
  });
  contact.addEventListener("click", () => record("contact_opened"));

  for (const button of document.querySelectorAll("#report-actions button")) {
    button.addEventListener("click", async () => {
      const response = await fetch(`/api/listings/${main.dataset.listingId}/report`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ reason: button.dataset.reason }),
      });
      document.querySelector("#report-status").textContent = response.ok
        ? "報告を受け付けました"
        : "報告を受け付けられませんでした";
    });
  }
  updateMessage();
}

noteVisit();
const page = document.body.dataset.page;
if (page === "home") void setupHome();
if (page === "create") setupCreate();
if (page === "manage") void setupManage();
if (page === "call") setupCall();

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js").catch(() => {});
}
