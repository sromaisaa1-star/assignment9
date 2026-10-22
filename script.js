// ==================== Elements ====================
const contactModal = document.getElementById("contactModal");
const contactForm = document.getElementById("contactForm");
const contactsContainer = document.getElementById("contactsContainer");
const searchInput = document.getElementById("searchInput");

const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const email = document.getElementById("email");
const address = document.getElementById("address");
const group = document.getElementById("group");
const notes = document.getElementById("notes");
const favorite = document.getElementById("favorite");
const emergency = document.getElementById("emergency");
const photoInput = document.getElementById("photoInput");
const avatarPreview = document.getElementById("avatarPreview");

let contacts = [];
let editingId = null;
let selectedPhoto = "";

// ==================== LocalStorage ====================
try {
    const savedContacts = JSON.parse(
        localStorage.getItem("contactHubContacts") || "[]"
    );

    contacts = Array.isArray(savedContacts) ? savedContacts : [];
} catch {
    contacts = [];
}

function saveToLocalStorage() {
    try {
        localStorage.setItem("contactHubContacts", JSON.stringify(contacts));
    } catch {
        Swal.fire({
            icon: "error",
            title: "Storage Error",
            text: "Unable to save data. Try using a smaller photo."
        });
        return false;
    }

    return true;
}

// ==================== Modal ====================
function openModal(id = null) {
    contactForm.reset();
    clearErrors();
    selectedPhoto = "";
    editingId = id;

    document.getElementById("modalTitle").textContent =
        id === null ? "Add New Contact" : "Edit Contact";

    document.getElementById("saveBtn").innerHTML =
        id === null
            ? '<i class="fa-solid fa-check"></i> Save Contact'
            : '<i class="fa-solid fa-check"></i> Update Contact';

    if (id !== null) {
        const contact = contacts.find(item => item.id === id);

        if (!contact) return;

        fullName.value = contact.name;
        phone.value = contact.phone;
        email.value = contact.email || "";
        address.value = contact.address || "";
        group.value = contact.group || "";
        notes.value = contact.notes || "";
        favorite.checked = contact.favorite;
        emergency.checked = contact.emergency;
        selectedPhoto = contact.photo || "";
    }

    updateAvatarPreview(selectedPhoto);
    contactModal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    contactModal.classList.remove("show");
    document.body.style.overflow = "";
    editingId = null;
}

document.getElementById("addContactBtn").addEventListener("click", () => {
    openModal();
});

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

contactModal.addEventListener("click", event => {
    if (event.target === contactModal) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && contactModal.classList.contains("show")) {
        closeModal();
    }
});

// ==================== Photo ====================
photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        Swal.fire("Invalid file", "Please choose an image.", "error");
        photoInput.value = "";
        return;
    }

    // Keep the image reasonably small for LocalStorage.
    if (file.size > 700 * 1024) {
        Swal.fire(
            "Image too large",
            "Please choose an image smaller than 700 KB.",
            "warning"
        );
        photoInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        selectedPhoto = reader.result;
        updateAvatarPreview(selectedPhoto);
    };

    reader.readAsDataURL(file);
});

function updateAvatarPreview(photo) {
    if (photo) {
        avatarPreview.innerHTML = `<img src="${photo}" alt="Contact photo">`;
    } else {
        avatarPreview.innerHTML = '<i class="fa-solid fa-user"></i>';
    }
}

// ==================== Validation ====================
function clearErrors() {
    document.getElementById("nameError").textContent = "";
    document.getElementById("phoneError").textContent = "";
    document.getElementById("emailError").textContent = "";

    fullName.setCustomValidity("");
    phone.setCustomValidity("");
    email.setCustomValidity("");
}

function validateContact() {
    clearErrors();

    const nameValue = fullName.value.trim();
    const phoneValue = phone.value.trim();
    const emailValue = email.value.trim();

    let valid = true;

    if (nameValue.length < 2) {
        document.getElementById("nameError").textContent =
            "Name must contain at least 2 characters.";
        fullName.setCustomValidity("Invalid name");
        valid = false;
    }

    // Accepts international numbers, spaces, brackets and hyphens.
    const phonePattern = /^\+?[0-9][0-9\s()-]{6,19}$/;

    if (!phonePattern.test(phoneValue)) {
        document.getElementById("phoneError").textContent =
            "Enter a valid phone number.";
        phone.setCustomValidity("Invalid phone number");
        valid = false;
    }

    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        document.getElementById("emailError").textContent =
            "Enter a valid email address.";
        email.setCustomValidity("Invalid email");
        valid = false;
    }

    const duplicate = contacts.find(contact =>
        contact.id !== editingId &&
        contact.phone.replace(/\D/g, "") === phoneValue.replace(/\D/g, "")
    );

    if (duplicate) {
        document.getElementById("phoneError").textContent =
            "This phone number already exists.";
        phone.setCustomValidity("Duplicate phone number");
        valid = false;
    }

    if (!valid) {
        contactForm.reportValidity();
    }

    return valid;
}

// ==================== CREATE & UPDATE ====================
contactForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!validateContact()) return;

    const oldContact = editingId !== null
        ? contacts.find(item => item.id === editingId)
        : null;

    const contact = {
        id: editingId !== null ? editingId : Date.now().toString(),
        name: fullName.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        address: address.value.trim(),
        group: group.value,
        notes: notes.value.trim(),
        favorite: favorite.checked,
        emergency: emergency.checked,
        photo: selectedPhoto
    };

    if (editingId !== null) {
        const index = contacts.findIndex(item => item.id === editingId);

        if (index === -1) return;

        contacts[index] = contact;
    } else {
        contacts.push(contact);
    }

    if (!saveToLocalStorage()) {
        if (oldContact) {
            contacts = contacts.map(item =>
                item.id === oldContact.id ? oldContact : item
            );
        } else {
            contacts = contacts.filter(item => item.id !== contact.id);
        }
        return;
    }

    closeModal();
    renderContacts();

    Swal.fire({
        icon: "success",
        title: editingId === null ? "Contact Added!" : "Contact Updated!",
        text: `${contact.name} has been saved successfully.`,
        timer: 1600,
        showConfirmButton: false
    });
});

// ==================== DELETE ====================
async function deleteContact(id) {
    const contact = contacts.find(item => item.id === id);

    if (!contact) return;

    const result = await Swal.fire({
        title: "Delete Contact?",
        text: `Are you sure you want to delete ${contact.name}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#e60036"
    });

    if (!result.isConfirmed) return;

    const previousContacts = [...contacts];
    contacts = contacts.filter(item => item.id !== id);

    if (!saveToLocalStorage()) {
        contacts = previousContacts;
        return;
    }

    renderContacts();

    Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Contact has been deleted.",
        timer: 1400,
        showConfirmButton: false
    });
}

// ==================== FAVORITES ====================
function toggleFavorite(id) {
    const contact = contacts.find(item => item.id === id);

    if (!contact) return;

    const previousValue = contact.favorite;
    contact.favorite = !contact.favorite;

    if (!saveToLocalStorage()) {
        contact.favorite = previousValue;
        return;
    }

    renderContacts();
}

// ==================== Filters & Search ====================
let currentFilter = "all";

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        currentFilter = button.dataset.filter;

        document.getElementById("sectionTitle").textContent = {
            all: "All Contacts",
            favorites: "Favorite Contacts",
            emergency: "Emergency Contacts"
        }[currentFilter];

        renderContacts();
    });
});

searchInput.addEventListener("input", renderContacts);

// ==================== Safe HTML ====================
function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getAvatar(contact, mini = false) {
    const className = mini ? "mini-avatar" : "contact-avatar";

    if (contact.photo) {
        return `<div class="${className}">
            <img src="${contact.photo}" alt="">
        </div>`;
    }

    const initials = escapeHTML(
        contact.name.trim().split(/\s+/).slice(0, 2)
            .map(word => word[0]).join("").toUpperCase()
    );

    return `<div class="${className}">${initials}</div>`;
}

// ==================== Render Contact Card ====================
function createContactCard(contact) {
    const id = escapeHTML(contact.id);
    const name = escapeHTML(contact.name);
    const safePhone = contact.phone.replace(/[^\d+*#,;]/g, "");
    const safeEmail = contact.email || "";

    return `
        <article class="contact-card">
            <div class="contact-top">
                ${getAvatar(contact)}

                <div class="contact-info">
                    <h4>${name}</h4>
                    <p><i class="fa-solid fa-phone"></i> ${escapeHTML(contact.phone)}</p>
                    ${contact.email
                        ? `<p class="mt-2"><i class="fa-solid fa-envelope"></i>
                            ${escapeHTML(contact.email)}</p>`
                        : ""}
                </div>
            </div>

            <div class="card-badges">
                ${contact.group
                    ? `<span class="contact-badge">${escapeHTML(contact.group)}</span>`
                    : ""}
                ${contact.emergency
                    ? '<span class="contact-badge emergency-badge">Emergency</span>'
                    : ""}
            </div>

            ${contact.address
                ? `<p class="mt-3 mb-0 small text-secondary">
                    <i class="fa-solid fa-location-dot"></i>
                    ${escapeHTML(contact.address)}</p>`
                : ""}

            ${contact.notes
                ? `<p class="mt-2 mb-0 small text-secondary">
                    ${escapeHTML(contact.notes)}</p>`
                : ""}

            <div class="card-actions">
                <a class="action-btn" href="tel:${safePhone}" title="Call">
                    <i class="fa-solid fa-phone"></i>
                </a>

                ${safeEmail
                    ? `<a class="action-btn"
                        href="mailto:${encodeURIComponent(safeEmail)}"
                        title="Email">
                        <i class="fa-solid fa-envelope"></i>
                    </a>`
                    : ""}

                <button class="action-btn ${contact.favorite ? "starred" : ""}"
                    data-action="favorite" data-id="${id}"
                    title="${contact.favorite ? "Remove Favorite" : "Add Favorite"}">
                    <i class="fa-solid fa-star"></i>
                </button>

                <button class="action-btn" data-action="edit" data-id="${id}"
                    title="Edit Contact">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button class="action-btn delete" data-action="delete" data-id="${id}"
                    title="Delete Contact">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </article>
    `;
}

// ==================== Sidebar ====================
function renderSidebar(list, containerId, emptyMessage) {
    const container = document.getElementById(containerId);

    if (list.length === 0) {
        container.innerHTML = `<p>${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = list.map(contact => `
        <div class="mini-contact">
            ${getAvatar(contact, true)}
            <div>
                <strong>${escapeHTML(contact.name)}</strong>
                <small>${escapeHTML(contact.phone)}</small>
            </div>
        </div>
    `).join("");
}

// ==================== Main Render ====================
function renderContacts() {
    document.getElementById("totalCount").textContent = contacts.length;

    document.getElementById("favoritesCount").textContent =
        contacts.filter(contact => contact.favorite).length;

    document.getElementById("emergencyCount").textContent =
        contacts.filter(contact => contact.emergency).length;

    document.getElementById("sectionSubtitle").textContent =
        `Manage and organize your ${contacts.length} contacts`;

    renderSidebar(
        contacts.filter(contact => contact.favorite),
        "favoritesList",
        "No favorites yet"
    );

    renderSidebar(
        contacts.filter(contact => contact.emergency),
        "emergencyList",
        "No emergency contacts"
    );

    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = [
            contact.name,
            contact.phone,
            contact.email
        ].some(value => String(value || "").toLowerCase().includes(searchTerm));

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "favorites" && contact.favorite) ||
            (currentFilter === "emergency" && contact.emergency);

        return matchesSearch && matchesFilter;
    });

    if (filteredContacts.length === 0) {
        const isEmpty = contacts.length === 0;

        contactsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fa-solid fa-address-book"></i>
                </div>
                <h4>${isEmpty ? "No contacts found" : "No matching contacts"}</h4>
                <p>${isEmpty
                    ? 'Click "Add Contact" to get started'
                    : "Try another search or filter."}</p>
            </div>
        `;
        return;
    }

    contactsContainer.innerHTML =
        filteredContacts.map(createContactCard).join("");
}

// ==================== Action Delegation ====================
contactsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    switch (button.dataset.action) {
        case "favorite":
            toggleFavorite(id);
            break;

        case "edit":
            openModal(id);
            break;

        case "delete":
            deleteContact(id);
            break;
    }
});

// ==================== Start App ====================
renderContacts();