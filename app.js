const API_URL = "https://6b00c9df1c637a569e52873b.mockapi.io/productos";
const CATEGORIES_API_URL = "";

const ADMIN_CREDENTIALS = {
  user: "gerente",
  pass: "GRT34#&",
};

const FALLBACK_IMAGE =
  "https://placehold.co/300x420/1e293b/94a3b8?text=Sin+Portada";

// Estado global de la aplicación
let mangasList = [];
let categoriesList = [];
let cartItems = [];
let currentModalManga = null;
let isAuthenticated = sessionStorage.getItem("manga_admin_auth") === "true";

// Referencias DOM - Vistas y Alertas
const publicView = document.getElementById("public-view");
const adminView = document.getElementById("admin-view");
const adminLoginBox = document.getElementById("admin-login-box");
const adminDashboard = document.getElementById("admin-dashboard");
const globalAlert = document.getElementById("global-alert");
const loadingPublic = document.getElementById("loading-public");

// Referencias DOM - Catálogo en Cards por Categoría
const searchInput = document.getElementById("search-input");
const genreFilter = document.getElementById("genre-filter");
const statusFilter = document.getElementById("status-filter");
const categoriesContainer = document.getElementById("categories-container");
const emptyPublicMsg = document.getElementById("empty-public-msg");

// Referencias DOM - Carrito
const btnOpenCart = document.getElementById("btn-open-cart");
const btnCloseCart = document.getElementById("btn-close-cart");
const cartDrawerBackdrop = document.getElementById("cart-drawer-backdrop");
const cartCountEl = document.getElementById("cart-count");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const btnClearCart = document.getElementById("btn-clear-cart");
const btnCheckout = document.getElementById("btn-checkout");

// Referencias DOM - Modal Detalle
const detailModal = document.getElementById("detail-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnModalAddCart = document.getElementById("btn-modal-add-cart");

// Referencias DOM - Modal Compra Exitosa
const saleSuccessModal = document.getElementById("sale-success-modal");
const saleModalDetail = document.getElementById("sale-modal-detail");
const btnCloseSaleModal = document.getElementById("btn-close-sale-modal");
const btnAcceptSaleModal = document.getElementById("btn-accept-sale-modal");

// Referencias DOM - Login y CRUD Admin
const btnToggleAdmin = document.getElementById("btn-toggle-admin");
const btnBackStore = document.getElementById("btn-back-store");
const btnBackStoreAuth = document.getElementById("btn-back-store-auth");
const btnLogout = document.getElementById("btn-logout");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const mangaForm = document.getElementById("manga-form");
const formTitle = document.getElementById("form-title");
const formError = document.getElementById("form-error");
const btnSubmitManga = document.getElementById("btn-submit-manga");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const categoriesDatalist = document.getElementById("categories-datalist");
const adminTbody = document.getElementById("admin-tbody");

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadInitialData();
});

function bindEvents() {
  btnToggleAdmin.addEventListener("click", openAdminSection);
  btnBackStore.addEventListener("click", openPublicSection);
  btnBackStoreAuth.addEventListener("click", openPublicSection);

  loginForm.addEventListener("submit", handleLogin);
  btnLogout.addEventListener("click", handleLogout);

  searchInput.addEventListener("input", renderCatalogByCategory);
  genreFilter.addEventListener("change", renderCatalogByCategory);
  statusFilter.addEventListener("change", renderCatalogByCategory);

  btnOpenCart.addEventListener("click", openCartDrawer);
  btnCloseCart.addEventListener("click", closeCartDrawer);
  cartDrawerBackdrop.addEventListener("click", (e) => {
    if (e.target === cartDrawerBackdrop) closeCartDrawer();
  });
  btnClearCart.addEventListener("click", () => {
    cartItems = [];
    renderCartUI();
  });
  btnCheckout.addEventListener("click", handleCheckoutSale);

  btnCloseModal.addEventListener("click", closeModal);
  btnModalAddCart.addEventListener("click", () => {
    if (currentModalManga) {
      addToCart(currentModalManga);
      closeModal();
      openCartDrawer();
    }
  });
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  btnCloseSaleModal.addEventListener("click", closeSaleModal);
  btnAcceptSaleModal.addEventListener("click", closeSaleModal);
  saleSuccessModal.addEventListener("click", (e) => {
    if (e.target === saleSuccessModal) closeSaleModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!saleSuccessModal.classList.contains("hidden")) closeSaleModal();
      else if (!detailModal.classList.contains("hidden")) closeModal();
      else if (!cartDrawerBackdrop.classList.contains("hidden")) closeCartDrawer();
    }
  });

  mangaForm.addEventListener("submit", handleSaveManga);
  btnCancelEdit.addEventListener("click", resetMangaForm);
}

// ==========================================
// COMUNICACIÓN CON API (FETCH + ASYNC)
// ==========================================

async function loadInitialData() {
  showLoader(true);
  hideAlert(globalAlert);

  try {
    await Promise.all([fetchMangas(), fetchOptionalCategories()]);
    syncCartWithStock();
    populateGenreFilter();
    renderCatalogByCategory();
    renderAdminTable();
    renderCartUI();
  } catch (error) {
    showAlert(
      globalAlert,
      `Error de conexión: ${error.message}`,
      "error"
    );
  } finally {
    showLoader(false);
  }
}

async function fetchMangas() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}: No se pudo obtener el catálogo.`);
  }
  const data = await response.json();
  mangasList = Array.isArray(data) ? data : [];
}

async function fetchOptionalCategories() {
  if (!CATEGORIES_API_URL) {
    categoriesList = [];
    return;
  }

  try {
    const response = await fetch(CATEGORIES_API_URL);
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data)) {
      categoriesList = data
        .map((cat) => (typeof cat === "string" ? cat : cat.nombre || cat.genero || ""))
        .map((c) => c.trim())
        .filter(Boolean);
    }
  } catch {
    categoriesList = [];
  }
}

async function createManga(mangaData) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mangaData),
  });
  if (!response.ok) {
    throw new Error(`No se pudo crear el registro (HTTP ${response.status}).`);
  }
  return response.json();
}

async function updateManga(id, mangaData) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mangaData),
  });
  if (!response.ok) {
    throw new Error(`No se pudo actualizar el registro (HTTP ${response.status}).`);
  }
  return response.json();
}

async function deleteManga(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`No se pudo eliminar el registro (HTTP ${response.status}).`);
  }
  return response.json();
}

// ==========================================
// FORMATO DE MONEDA (BS)
// ==========================================

function formatBs(value) {
  return `Bs ${Number(value || 0).toFixed(2)}`;
}

// ==========================================
// CATÁLOGO EN CARDS SEPARADO POR CATEGORÍA
// ==========================================

function getMangaKey(manga) {
  return manga.id !== undefined && manga.id !== null && String(manga.id).trim() !== ""
    ? `id:${manga.id}`
    : `title:${manga.titulo || ""}`;
}

function populateGenreFilter() {
  const currentSelection = genreFilter.value;
  const mangaGenres = mangasList
    .map((m) => (m.genero || "Sin categoría").trim())
    .filter(Boolean);

  const genres = [...new Set([...categoriesList, ...mangaGenres])].sort((a, b) =>
    a.localeCompare(b)
  );

  genreFilter.innerHTML = `<option value="Todos">Todos</option>`;
  categoriesDatalist.innerHTML = "";

  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);

    const dataOption = document.createElement("option");
    dataOption.value = genre;
    categoriesDatalist.appendChild(dataOption);
  });

  if (genres.includes(currentSelection)) {
    genreFilter.value = currentSelection;
  }
}

function renderCatalogByCategory() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;
  const selectedStatus = statusFilter.value;

  const filtered = mangasList.filter((manga) => {
    const title = (manga.titulo || "").toLowerCase();
    const author = (manga.autor || "").toLowerCase();
    const category = (manga.genero || "Sin categoría").trim();
    const status = (manga.estado || "").trim();

    const matchesSearch = title.includes(query) || author.includes(query);
    const matchesGenre = selectedGenre === "Todos" || category === selectedGenre;
    const matchesStatus = selectedStatus === "Todos" || status === selectedStatus;

    return matchesSearch && matchesGenre && matchesStatus;
  });

  categoriesContainer.innerHTML = "";

  if (filtered.length === 0) {
    emptyPublicMsg.classList.remove("hidden");
    return;
  }

  emptyPublicMsg.classList.add("hidden");

  const grouped = new Map();
  filtered.forEach((manga) => {
    const catName = (manga.genero || "Sin categoría").trim();
    if (!grouped.has(catName)) {
      grouped.set(catName, []);
    }
    grouped.get(catName).push(manga);
  });

  const sortedCategories = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  sortedCategories.forEach((categoryName) => {
    const items = grouped.get(categoryName);

    const section = document.createElement("div");
    section.className = "category-section";

    section.innerHTML = `
      <div class="category-header">
        <h2 class="category-title">${escapeHTML(categoryName)}</h2>
        <span class="category-count">${items.length} ${items.length === 1 ? "manga" : "mangas"}</span>
      </div>
      <div class="cards-grid"></div>
    `;

    const grid = section.querySelector(".cards-grid");

    items.forEach((manga) => {
      const stock = Number(manga.stock ?? 0);
      const statusText = manga.estado || "En emisión";

      const card = document.createElement("article");
      card.className = "manga-card";

      card.innerHTML = `
        <div class="card-cover-wrap" title="Ver detalles">
          <img
            src="${escapeHTML(manga.imagen || FALLBACK_IMAGE)}"
            alt="${escapeHTML(manga.titulo || "Manga")}"
            class="card-cover-img"
            onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
          >
          <div class="card-status-overlay">
            <span class="status-badge ${getStatusBadgeClass(statusText)}">
              ${escapeHTML(statusText)}
            </span>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title" title="Ver detalles">${escapeHTML(manga.titulo || "Sin título")}</h3>
          <p class="card-author">${escapeHTML(manga.autor || "Autor desconocido")}</p>
          <div class="card-meta">
            <span class="price-cell">${formatBs(manga.precio)}</span>
            ${getStockBadgeHTML(stock)}
          </div>
          <div class="card-actions">
            <button
              type="button"
              class="btn btn-primary btn-sm btn-add-cart"
              ${stock <= 0 ? "disabled" : ""}
            >
              ${stock <= 0 ? "Agotado" : "Al carrito"}
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-detail">
              Detalle
            </button>
          </div>
        </div>
      `;

      card.querySelector(".card-cover-wrap").addEventListener("click", () => openMangaModal(manga));
      card.querySelector(".card-title").addEventListener("click", () => openMangaModal(manga));
      card.querySelector(".btn-detail").addEventListener("click", () => openMangaModal(manga));
      card.querySelector(".btn-add-cart").addEventListener("click", () => {
        addToCart(manga);
        openCartDrawer();
      });

      grid.appendChild(card);
    });

    categoriesContainer.appendChild(section);
  });
}

// ==========================================
// CARRITO DE COMPRAS Y VENTA (RESTA STOCK)
// ==========================================

function openCartDrawer() {
  renderCartUI();
  cartDrawerBackdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  cartDrawerBackdrop.classList.add("hidden");
  if (detailModal.classList.contains("hidden") && saleSuccessModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function addToCart(manga) {
  const maxStock = Number(manga.stock ?? 0);
  if (maxStock <= 0) {
    showAlert(globalAlert, `"${manga.titulo}" no tiene stock disponible.`, "error");
    return;
  }

  const key = getMangaKey(manga);
  const existing = cartItems.find((item) => item.key === key);

  if (existing) {
    if (existing.quantity >= maxStock) {
      showAlert(
        globalAlert,
        `Solo hay ${maxStock} unidades disponibles de "${manga.titulo}".`,
        "error"
      );
      return;
    }
    existing.quantity += 1;
  } else {
    cartItems.push({
      key,
      manga,
      quantity: 1,
    });
  }

  renderCartUI();
}

function updateCartQuantity(key, delta) {
  const index = cartItems.findIndex((item) => item.key === key);
  if (index === -1) return;

  const item = cartItems[index];
  const latestManga = mangasList.find((m) => getMangaKey(m) === key) || item.manga;
  const maxStock = Number(latestManga.stock ?? 0);
  const nextQty = item.quantity + delta;

  if (nextQty <= 0) {
    cartItems.splice(index, 1);
  } else if (nextQty > maxStock) {
    showAlert(
      globalAlert,
      `Stock máximo para "${latestManga.titulo}": ${maxStock} unidades.`,
      "error"
    );
    return;
  } else {
    item.quantity = nextQty;
    item.manga = latestManga;
  }

  renderCartUI();
}

function syncCartWithStock() {
  cartItems = cartItems
    .map((item) => {
      const latest = mangasList.find((m) => getMangaKey(m) === item.key);
      if (!latest) return null;
      const maxStock = Number(latest.stock ?? 0);
      if (maxStock <= 0) return null;
      return {
        key: item.key,
        manga: latest,
        quantity: Math.min(item.quantity, maxStock),
      };
    })
    .filter(Boolean);
}

function renderCartUI() {
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + Number(item.manga.precio || 0) * item.quantity,
    0
  );

  cartCountEl.textContent = totalUnits;
  cartTotalEl.textContent = formatBs(totalPrice);
  btnCheckout.disabled = cartItems.length === 0;
  btnClearCart.disabled = cartItems.length === 0;

  if (cartItems.length === 0) {
    cartItemsEl.innerHTML = `
      <p class="cart-empty">Tu carrito está vacío. Selecciona un manga para agregarlo.</p>
    `;
    return;
  }

  cartItemsEl.innerHTML = "";

  cartItems.forEach((item) => {
    const maxStock = Number(item.manga.stock ?? 0);
    const subtotal = Number(item.manga.precio || 0) * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <img
        src="${escapeHTML(item.manga.imagen || FALLBACK_IMAGE)}"
        alt="${escapeHTML(item.manga.titulo || "")}"
        class="cart-item-img"
        onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
      >
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHTML(item.manga.titulo || "Manga")}</div>
        <div class="cart-item-price">${formatBs(subtotal)} (c/u ${formatBs(item.manga.precio)})</div>
        <div class="cart-qty-controls">
          <button type="button" class="qty-btn btn-dec" aria-label="Restar unidad">-</button>
          <span>${item.quantity}</span>
          <button
            type="button"
            class="qty-btn btn-inc"
            aria-label="Sumar unidad"
            ${item.quantity >= maxStock ? "disabled" : ""}
          >+</button>
        </div>
      </div>
    `;

    row.querySelector(".btn-dec").addEventListener("click", () => updateCartQuantity(item.key, -1));
    row.querySelector(".btn-inc").addEventListener("click", () => updateCartQuantity(item.key, 1));

    cartItemsEl.appendChild(row);
  });
}

async function handleCheckoutSale() {
  if (cartItems.length === 0) return;

  btnCheckout.disabled = true;
  btnCheckout.textContent = "Procesando...";

  try {
    const totalSold = cartItems.reduce(
      (sum, item) => sum + Number(item.manga.precio || 0) * item.quantity,
      0
    );
    const totalUnitsSold = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    for (const item of cartItems) {
      const latest = mangasList.find((m) => getMangaKey(m) === item.key) || item.manga;
      const currentStock = Number(latest.stock ?? 0);
      const newStock = Math.max(0, currentStock - item.quantity);

      const updatedPayload = {
        titulo: latest.titulo,
        autor: latest.autor,
        genero: latest.genero,
        estado: latest.estado,
        precio: Number(latest.precio ?? 0),
        stock: newStock,
        capitulos: Number(latest.capitulos ?? 1),
        imagen: latest.imagen,
        descripcion: latest.descripcion,
      };

      const recordId = latest.id ?? latest._id;
      if (recordId !== undefined && recordId !== null && String(recordId).trim() !== "") {
        await updateManga(recordId, updatedPayload);
      } else {
        throw new Error(`El registro "${latest.titulo}" no tiene un ID válido.`);
      }
    }

    cartItems = [];
    closeCartDrawer();
    await loadInitialData();
    openSaleSuccessModal(totalUnitsSold, totalSold);
  } catch (error) {
    showAlert(globalAlert, `Error al completar la compra: ${error.message}`, "error");
  } finally {
    btnCheckout.disabled = cartItems.length === 0;
    btnCheckout.textContent = "Confirmar compra";
  }
}

function openSaleSuccessModal(units, total) {
  saleModalDetail.textContent = `Se procesaron ${units} ${units === 1 ? "unidad" : "unidades"} por un total de ${formatBs(total)}.`;
  saleSuccessModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSaleModal() {
  saleSuccessModal.classList.add("hidden");
  if (detailModal.classList.contains("hidden") && cartDrawerBackdrop.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function getStockBadgeHTML(stockValue) {
  const stock = Number(stockValue ?? 0);
  if (stock <= 0) {
    return `<span class="stock-badge stock-out">Agotado (0)</span>`;
  }
  if (stock <= 5) {
    return `<span class="stock-badge stock-low">¡Quedan ${stock}!</span>`;
  }
  return `<span class="stock-badge stock-ok">${stock} en stock</span>`;
}

function getStatusBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "en emisión":
      return "status-emision";
    case "finalizado":
      return "status-finalizado";
    case "cancelado":
      return "status-cancelado";
    case "en pausa":
      return "status-pausa";
    default:
      return "status-finalizado";
  }
}

// ==========================================
// MODAL DE DETALLE
// ==========================================

function openMangaModal(manga) {
  currentModalManga = manga;

  const imgEl = document.getElementById("modal-img");
  imgEl.src = manga.imagen || FALLBACK_IMAGE;
  imgEl.onerror = () => {
    imgEl.src = FALLBACK_IMAGE;
  };

  document.getElementById("modal-title").textContent = manga.titulo || "Sin título";
  document.getElementById("modal-author").textContent = manga.autor || "Autor desconocido";
  document.getElementById("modal-genre-badge").textContent = manga.genero || "General";

  const statusBadge = document.getElementById("modal-status-badge");
  const statusText = manga.estado || "En emisión";
  statusBadge.textContent = statusText;
  statusBadge.className = `status-badge ${getStatusBadgeClass(statusText)}`;

  const stock = Number(manga.stock ?? 0);
  document.getElementById("modal-price").textContent = formatBs(manga.precio);
  document.getElementById("modal-stock").innerHTML = getStockBadgeHTML(stock);
  document.getElementById("modal-chapters").textContent = `${manga.capitulos || 0}`;
  document.getElementById("modal-description").textContent =
    manga.descripcion || "Sin descripción disponible.";

  btnModalAddCart.disabled = stock <= 0;
  btnModalAddCart.textContent = stock <= 0 ? "Sin stock disponible" : "Agregar al carrito";

  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  detailModal.classList.add("hidden");
  if (cartDrawerBackdrop.classList.contains("hidden") && saleSuccessModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
  currentModalManga = null;
}

// ==========================================
// NAVEGACIÓN Y AUTENTICACIÓN DE ADMIN
// ==========================================

function openAdminSection() {
  publicView.classList.add("hidden");
  adminView.classList.remove("hidden");
  btnToggleAdmin.classList.add("hidden");
  hideAlert(globalAlert);
  updateAdminAuthUI();
}

function openPublicSection() {
  adminView.classList.add("hidden");
  publicView.classList.remove("hidden");
  btnToggleAdmin.classList.remove("hidden");
  hideAlert(globalAlert);
}

function updateAdminAuthUI() {
  if (isAuthenticated) {
    adminLoginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    renderAdminTable();
  } else {
    adminDashboard.classList.add("hidden");
    adminLoginBox.classList.remove("hidden");
    loginForm.reset();
    hideAlert(loginError);
  }
}

function handleLogin(e) {
  e.preventDefault();
  const userInput = document.getElementById("admin-user").value.trim();
  const passInput = document.getElementById("admin-pass").value.trim();

  if (userInput === ADMIN_CREDENTIALS.user && passInput === ADMIN_CREDENTIALS.pass) {
    isAuthenticated = true;
    sessionStorage.setItem("manga_admin_auth", "true");
    hideAlert(loginError);
    updateAdminAuthUI();
  } else {
    showAlert(
      loginError,
      "Usuario o contraseña incorrectos. Prueba con usuario: admin y contraseña: 1234.",
      "error"
    );
  }
}

function handleLogout() {
  isAuthenticated = false;
  sessionStorage.removeItem("manga_admin_auth");
  resetMangaForm();
  updateAdminAuthUI();
}

// ==========================================
// PANEL CRUD ADMINISTRADOR
// ==========================================

function renderAdminTable() {
  adminTbody.innerHTML = "";

  if (mangasList.length === 0) {
    adminTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; color:#94a3b8; padding:1.5rem;">
          No hay mangas registrados todavía.
        </td>
      </tr>
    `;
    return;
  }

  mangasList.forEach((manga) => {
    const tr = document.createElement("tr");
    const statusText = manga.estado || "En emisión";

    tr.innerHTML = `
      <td>
        <img
          src="${escapeHTML(manga.imagen || FALLBACK_IMAGE)}"
          alt="${escapeHTML(manga.titulo || "")}"
          class="thumb-img"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
        >
      </td>
      <td><strong>${escapeHTML(manga.titulo || "")}</strong></td>
      <td>${escapeHTML(manga.autor || "")}</td>
      <td>${escapeHTML(manga.genero || "")}</td>
      <td>
        <span class="status-badge ${getStatusBadgeClass(statusText)}">
          ${escapeHTML(statusText)}
        </span>
      </td>
      <td class="price-cell">${formatBs(manga.precio)}</td>
      <td>${getStockBadgeHTML(manga.stock)}</td>
      <td>
        <div class="action-buttons-cell">
          <button type="button" class="btn btn-secondary btn-sm btn-edit">Editar</button>
          <button type="button" class="btn btn-danger btn-sm btn-delete">Eliminar</button>
        </div>
      </td>
    `;

    tr.querySelector(".btn-edit").addEventListener("click", () => loadMangaIntoForm(manga));
    tr.querySelector(".btn-delete").addEventListener("click", () => handleDeleteManga(manga));

    adminTbody.appendChild(tr);
  });
}

async function handleSaveManga(e) {
  e.preventDefault();
  hideAlert(formError);

  const id = document.getElementById("manga-id").value.trim();
  const payload = {
    titulo: document.getElementById("titulo").value.trim(),
    autor: document.getElementById("autor").value.trim(),
    genero: document.getElementById("genero").value.trim(),
    estado: document.getElementById("estado").value,
    precio: parseFloat(document.getElementById("precio").value),
    stock: parseInt(document.getElementById("stock").value, 10),
    capitulos: parseInt(document.getElementById("capitulos").value, 10),
    imagen: document.getElementById("imagen").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim(),
  };

  const validationError = validateMangaPayload(payload);
  if (validationError) {
    showAlert(formError, validationError, "error");
    return;
  }

  btnSubmitManga.disabled = true;
  btnSubmitManga.textContent = id ? "Actualizando..." : "Guardando...";

  try {
    if (id) {
      await updateManga(id, payload);
      showAlert(globalAlert, `Manga "${payload.titulo}" actualizado correctamente.`, "success");
    } else {
      await createManga(payload);
      showAlert(globalAlert, `Manga "${payload.titulo}" agregado al catálogo.`, "success");
    }

    resetMangaForm();
    await loadInitialData();
  } catch (error) {
    showAlert(formError, `Error al guardar: ${error.message}`, "error");
  } finally {
    btnSubmitManga.disabled = false;
    btnSubmitManga.textContent = document.getElementById("manga-id").value
      ? "Actualizar Manga"
      : "Guardar Manga";
  }
}

function validateMangaPayload(data) {
  if (
    !data.titulo ||
    !data.autor ||
    !data.genero ||
    !data.estado ||
    !data.imagen ||
    !data.descripcion
  ) {
    return "Todos los campos marcados con * son obligatorios.";
  }

  if (Number.isNaN(data.precio) || data.precio < 0) {
    return "El precio debe ser un número válido mayor o igual a 0.";
  }

  if (Number.isNaN(data.stock) || data.stock < 0) {
    return "El stock debe ser un número entero mayor o igual a 0.";
  }

  if (Number.isNaN(data.capitulos) || data.capitulos < 1) {
    return "La cantidad de capítulos debe ser al menos 1.";
  }

  try {
    new URL(data.imagen);
  } catch {
    return "Ingresa una URL válida para la imagen (debe comenzar con http:// o https://).";
  }

  return null;
}

function loadMangaIntoForm(manga) {
  hideAlert(formError);
  document.getElementById("manga-id").value = manga.id;
  document.getElementById("titulo").value = manga.titulo || "";
  document.getElementById("autor").value = manga.autor || "";
  document.getElementById("genero").value = manga.genero || "";
  document.getElementById("estado").value = manga.estado || "En emisión";
  document.getElementById("precio").value = manga.precio ?? 0;
  document.getElementById("stock").value = manga.stock ?? 0;
  document.getElementById("capitulos").value = manga.capitulos ?? 1;
  document.getElementById("imagen").value = manga.imagen || "";
  document.getElementById("descripcion").value = manga.descripcion || "";

  formTitle.textContent = `Editando: ${manga.titulo}`;
  btnSubmitManga.textContent = "Actualizar Manga";
  btnCancelEdit.classList.remove("hidden");

  mangaForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetMangaForm() {
  mangaForm.reset();
  document.getElementById("manga-id").value = "";
  formTitle.textContent = "Agregar Nuevo Manga";
  btnSubmitManga.textContent = "Guardar Manga";
  btnCancelEdit.classList.add("hidden");
  hideAlert(formError);
}

async function handleDeleteManga(manga) {
  const confirmed = window.confirm(
    `¿Estás seguro de que deseas eliminar "${manga.titulo}"? Esta acción no se puede deshacer.`
  );

  if (!confirmed) return;

  try {
    await deleteManga(manga.id);
    if (document.getElementById("manga-id").value === String(manga.id)) {
      resetMangaForm();
    }
    await loadInitialData();
    showAlert(globalAlert, `Manga "${manga.titulo}" eliminado correctamente.`, "success");
  } catch (error) {
    showAlert(globalAlert, `Error al eliminar: ${error.message}`, "error");
  }
}

// ==========================================
// UTILIDADES
// ==========================================

function showLoader(isLoading) {
  if (isLoading) {
    loadingPublic.classList.remove("hidden");
  } else {
    loadingPublic.classList.add("hidden");
  }
}

function showAlert(element, message, type = "error") {
  element.textContent = message;
  element.className = `alert alert-${type}`;
  element.classList.remove("hidden");
}

function hideAlert(element) {
  element.classList.add("hidden");
  element.textContent = "";
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}