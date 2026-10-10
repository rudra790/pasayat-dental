"use strict";

// Mobile menu: toggles state, closes after navigation, and closes on Escape.
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-nav");

if (menuButton && navigation) {
  const setMenuOpen = (isOpen) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    navigation.classList.toggle("is-open", isOpen);
    const label = menuButton.querySelector(".sr-only");
    if (label) label.textContent = isOpen ? "Close navigation menu" : "Open navigation menu";
  };

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });
}

// Add a stronger header shadow after the page begins scrolling.
const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const updateHeaderShadow = () => {
    const hasScrolled = window.scrollY > 8;
    siteHeader.classList.toggle("is-scrolled", hasScrolled);
  };

  let scrollUpdatePending = false;
  window.addEventListener("scroll", () => {
    if (scrollUpdatePending) return;
    scrollUpdatePending = true;
    window.requestAnimationFrame(() => {
      updateHeaderShadow();
      scrollUpdatePending = false;
    });
  }, { passive: true });
  updateHeaderShadow();
}

// Mark the current route in the shared navigation.
if (navigation) {
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  navigation.querySelectorAll("a[href]").forEach((link) => {
    const linkPath = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, "") || "/";
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

// Reveal page sections when they enter the viewport. Nothing is hidden before
// observation, and the animation is skipped for reduced-motion preferences.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.animate(
        [
          { opacity: 0.55, transform: "translateY(14px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 420, easing: "ease-out", fill: "both" },
      );
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll("main > section, [data-reveal]").forEach((element) => {
    revealObserver.observe(element);
  });
}

// FAQ accordion. Markup: .faq-list contains .faq-question buttons;
// each button's aria-controls points to its .faq-answer panel.
document.querySelectorAll(".faq-question").forEach((button) => {
  const panelId = button.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : button.nextElementSibling;
  if (!panel) return;

  const setFaqExpanded = (isExpanded) => {
    button.setAttribute("aria-expanded", String(isExpanded));
    panel.hidden = !isExpanded;
  };

  setFaqExpanded(button.getAttribute("aria-expanded") === "true");
  button.addEventListener("click", () => {
    const willExpand = button.getAttribute("aria-expanded") !== "true";
    const faqList = button.closest(".faq-list");

    if (willExpand && faqList) {
      faqList.querySelectorAll(".faq-question").forEach((otherButton) => {
        if (otherButton === button) return;
        otherButton.setAttribute("aria-expanded", "false");
        const otherPanelId = otherButton.getAttribute("aria-controls");
        const otherPanel = otherPanelId
          ? document.getElementById(otherPanelId)
          : otherButton.nextElementSibling;
        if (otherPanel) otherPanel.hidden = true;
      });
    }

    setFaqExpanded(willExpand);
  });
});

// Gallery category filters.
const galleryFilters = [...document.querySelectorAll(".gallery-filter")];
const galleryCards = [...document.querySelectorAll(".gallery-card")];

document.querySelectorAll(".gallery-thumb").forEach((image) => {
  const galleryButton = image.closest(".gallery-open");
  image.addEventListener("load", () => galleryButton?.classList.add("has-photo"));
  image.addEventListener("error", () => {
    image.hidden = true;
  }, { once: true });

  if (image.complete && image.naturalWidth > 0) galleryButton?.classList.add("has-photo");
});

if (galleryFilters.length && galleryCards.length) {
  galleryFilters.forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
      const selectedCategory = filterButton.dataset.filter;

      galleryFilters.forEach((button) => {
        const isSelected = button === filterButton;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });

      galleryCards.forEach((card) => {
        card.hidden = selectedCategory !== "all" && card.dataset.category !== selectedCategory;
      });
    });
  });
}

// Keyboard-accessible gallery lightbox. The native dialog handles focus
// containment and Escape; arrow keys move between the currently visible items.
const galleryDialog = document.querySelector("#gallery-lightbox");
if (galleryDialog) {
  const galleryStage = document.querySelector("#lightbox-stage");
  const galleryCaption = document.querySelector("#lightbox-caption");
  const galleryCount = document.querySelector("#lightbox-count");
  const closeLightboxButton = galleryDialog.querySelector(".lightbox-close");
  const previousButton = galleryDialog.querySelector(".lightbox-previous");
  const nextButton = galleryDialog.querySelector(".lightbox-next");
  let visibleGalleryButtons = [];
  let currentGalleryIndex = 0;
  let previouslyFocusedElement = null;

  const makePlaceholder = (label) => {
    const placeholder = document.createElement("div");
    placeholder.className = "lightbox-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", label);

    const icon = document.createElement("span");
    icon.className = "gallery-placeholder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "＋";

    const text = document.createElement("span");
    text.textContent = label;
    placeholder.append(icon, text);
    return placeholder;
  };

  const renderLightboxItem = () => {
    const item = visibleGalleryButtons[currentGalleryIndex];
    if (!item) return;

    const photoPath = item.dataset.photo;
    const photoAlt = item.dataset.photoAlt || "Dental gallery photograph";
    const caption = item.querySelector(".gallery-card-caption")?.textContent || "Gallery photo";
    const photo = new Image();

    photo.className = "lightbox-photo";
    photo.alt = photoAlt;
    photo.addEventListener("error", () => {
      if (galleryStage.contains(photo)) galleryStage.replaceChildren(makePlaceholder(photoAlt));
    }, { once: true });
    photo.src = photoPath;
    galleryStage.replaceChildren(photo);

    galleryCaption.textContent = `${caption} · ${photoAlt}`;
    galleryCount.textContent = `${currentGalleryIndex + 1} of ${visibleGalleryButtons.length}`;
  };

  const openLightbox = (clickedButton) => {
    visibleGalleryButtons = [...document.querySelectorAll(".gallery-open")]
      .filter((button) => !button.closest(".gallery-card").hidden);
    currentGalleryIndex = visibleGalleryButtons.indexOf(clickedButton);
    previouslyFocusedElement = clickedButton;
    renderLightboxItem();
    galleryDialog.showModal();
    closeLightboxButton.focus();
  };

  const moveLightbox = (direction) => {
    if (!visibleGalleryButtons.length) return;
    currentGalleryIndex = (currentGalleryIndex + direction + visibleGalleryButtons.length) % visibleGalleryButtons.length;
    renderLightboxItem();
  };

  document.querySelectorAll(".gallery-open").forEach((button) => {
    button.addEventListener("click", () => openLightbox(button));
  });

  closeLightboxButton.addEventListener("click", () => galleryDialog.close());
  previousButton.addEventListener("click", () => moveLightbox(-1));
  nextButton.addEventListener("click", () => moveLightbox(1));

  galleryDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }
  });

  galleryDialog.addEventListener("click", (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });

  galleryDialog.addEventListener("close", () => {
    if (previouslyFocusedElement) previouslyFocusedElement.focus();
    previouslyFocusedElement = null;
  });
}

// Appointment details stay in the browser until the visitor opens WhatsApp.
const appointmentForm = document.querySelector("#appointment");
if (appointmentForm) {
  const status = document.querySelector("#form-status");
  const submitButton = appointmentForm.querySelector('button[type="submit"]');
  const fields = {
    name: appointmentForm.elements.namedItem("name"),
    phone: appointmentForm.elements.namedItem("phone"),
    date: appointmentForm.elements.namedItem("preferred_date"),
    time: appointmentForm.elements.namedItem("preferred_time"),
    treatment: appointmentForm.elements.namedItem("treatment"),
  };

  const localToday = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const value = (type) => parts.find((part) => part.type === type).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  };

  if (fields.date) fields.date.min = localToday();

  const getFieldError = (field) => {
    const errorId = `${field.id}-error`;
    let error = document.getElementById(errorId);
    if (!error) {
      error = document.createElement("span");
      error.className = "field-error";
      error.id = errorId;
      error.setAttribute("aria-live", "polite");
      field.insertAdjacentElement("afterend", error);
    }
    return error;
  };

  const setFieldError = (field, message) => {
    if (!field) return;
    const error = getFieldError(field);
    error.textContent = message;
    field.setAttribute("aria-invalid", String(Boolean(message)));

    const describedBy = new Set(
      (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean),
    );
    if (message) describedBy.add(error.id);
    else describedBy.delete(error.id);

    if (describedBy.size) field.setAttribute("aria-describedby", [...describedBy].join(" "));
    else field.removeAttribute("aria-describedby");
  };

  const validIndianPhone = (rawPhone) => {
    let phone = rawPhone.trim().replace(/[\s()-]/g, "");
    if (phone.startsWith("+91")) phone = phone.slice(3);
    else if (phone.startsWith("91") && phone.length === 12) phone = phone.slice(2);
    if (phone.startsWith("0") && phone.length === 11) phone = phone.slice(1);
    return /^[6-9]\d{9}$/.test(phone);
  };

  const validateAppointmentForm = () => {
    let firstInvalidField = null;
    const flagError = (field, message) => {
      setFieldError(field, message);
      if (message && !firstInvalidField) firstInvalidField = field;
    };

    const nameValue = fields.name?.value.trim() || "";
    flagError(fields.name, nameValue.length < 2 ? "Enter your name (at least 2 characters)." : "");

    const phoneValue = fields.phone?.value.trim() || "";
    flagError(fields.phone, !validIndianPhone(phoneValue) ? "Enter a valid 10-digit Indian mobile number." : "");

    const dateValue = fields.date?.value || "";
    flagError(fields.date, !dateValue
      ? "Choose a preferred date."
      : dateValue < localToday() ? "Choose today or a future date." : "");

    const timeValue = fields.time?.value || "";
    flagError(fields.time, !timeValue
      ? "Choose a preferred time."
      : timeValue < "10:00" || timeValue > "22:00" ? "Choose a time between 10:00 and 22:00." : "");

    flagError(fields.treatment, !fields.treatment?.value ? "Select a treatment." : "");

    if (!appointmentForm.checkValidity() && !firstInvalidField) {
      firstInvalidField = appointmentForm.querySelector(":invalid");
      if (firstInvalidField) setFieldError(firstInvalidField, "Please check this field.");
    }

    if (firstInvalidField) {
      firstInvalidField.focus();
      return false;
    }
    return true;
  };

  Object.values(fields).forEach((field) => {
    if (!field) return;
    field.addEventListener("input", () => setFieldError(field, ""));
    field.addEventListener("change", () => setFieldError(field, ""));
  });

  appointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateAppointmentForm()) return;
    const values = new FormData(appointmentForm);
    const messageLines = [
      "Hello Pasayat Dental Clinic, I would like to request an appointment.",
      `Name: ${String(values.get("name")).trim()}`,
      `Phone: ${String(values.get("phone")).trim()}`,
      `Preferred date: ${values.get("preferred_date")}`,
      `Preferred time: ${values.get("preferred_time")}`,
      `Treatment: ${values.get("treatment")}`,
    ];
    const optionalMessage = String(values.get("message") || "").trim();
    if (optionalMessage) messageLines.push(`Message: ${optionalMessage}`);
    const whatsappUrl = `https://wa.me/919437245564?text=${encodeURIComponent(messageLines.join("\n"))}`;
    status.textContent = "Opening WhatsApp. Review your details and tap Send there to send your request.";
    window.location.assign(whatsappUrl);
  });
  // Without JavaScript, the disabled button and CSP prevent accidental form uploads.
  if (submitButton) submitButton.disabled = false;
}

const banner = document.querySelector(".clinic-banner");
const bannerToggle = document.querySelector(".banner-toggle");
bannerToggle?.addEventListener("click", () => {
  const paused = banner.classList.toggle("is-paused");
  bannerToggle.setAttribute("aria-pressed", String(paused));
  bannerToggle.setAttribute("aria-label", `${paused ? "Resume" : "Pause"} moving clinic name`);
  bannerToggle.textContent = paused ? "Resume" : "Pause";
});
