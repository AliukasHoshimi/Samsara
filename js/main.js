// SamsaraFilmss — shared site behavior

document.addEventListener("DOMContentLoaded", function () {
  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var question = item.querySelector(".faq-question");
    var answer = item.querySelector(".faq-answer");
    if (!question || !answer) return;

    question.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");

      document.querySelectorAll(".faq-item.open").forEach(function (open) {
        if (open !== item) {
          open.classList.remove("open");
          open.querySelector(".faq-answer").style.maxHeight = null;
        }
      });

      item.classList.toggle("open", !isOpen);
      answer.style.maxHeight = !isOpen ? answer.scrollHeight + "px" : null;
    });
  });

  // Home hero slideshow — click arrows or dots to move between photos
  var heroSlides = document.querySelectorAll(".hero-slide");

  if (heroSlides.length) {
    var heroIndex = 0;
    var heroDots = document.querySelectorAll(".hero-dots .dot");
    var heroPrev = document.querySelector(".hero-arrow.prev");
    var heroNext = document.querySelector(".hero-arrow.next");

    function showHeroSlide(i) {
      heroIndex = (i + heroSlides.length) % heroSlides.length;
      heroSlides.forEach(function (slide, idx) {
        slide.classList.toggle("active", idx === heroIndex);
      });
      heroDots.forEach(function (dot, idx) {
        dot.classList.toggle("active", idx === heroIndex);
      });
    }

    if (heroPrev) heroPrev.addEventListener("click", function () { showHeroSlide(heroIndex - 1); });
    if (heroNext) heroNext.addEventListener("click", function () { showHeroSlide(heroIndex + 1); });
    heroDots.forEach(function (dot, idx) {
      dot.addEventListener("click", function () { showHeroSlide(idx); });
    });
  }

  // Portfolio hero — auto-crossfades through its photos, no manual
  // controls (unlike the home hero, which is dot/arrow-driven only).
  var galleryHeroSlides = document.querySelectorAll(".gallery-hero .hero-slide");

  if (galleryHeroSlides.length > 1) {
    var ghIndex = 0;
    setInterval(function () {
      galleryHeroSlides[ghIndex].classList.remove("active");
      ghIndex = (ghIndex + 1) % galleryHeroSlides.length;
      galleryHeroSlides[ghIndex].classList.add("active");
    }, 4500);
  }

  // Home closing CTA — crossfades through the gallery chapter names
  var fadeWords = document.querySelectorAll(".gallery-fade-word");

  if (fadeWords.length) {
    var fadeIndex = 0;
    setInterval(function () {
      fadeWords[fadeIndex].classList.remove("active");
      fadeIndex = (fadeIndex + 1) % fadeWords.length;
      fadeWords[fadeIndex].classList.add("active");
    }, 2600);
  }

  // Scroll reveal — headlines, timeline steps, FAQ rows, and gallery tiles
  // fade/rise in as they enter the viewport (photos "load in" while scrolling).
  var revealEls = document.querySelectorAll(".reveal");

  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Lightbox — click a gallery tile to open, arrow keys / swipe to
  // navigate, escape or backdrop click to close.
  var triggers = Array.prototype.slice.call(document.querySelectorAll(".lightbox-trigger"));
  var lightbox = document.getElementById("lightbox");

  if (triggers.length && lightbox) {
    var stage = lightbox.querySelector(".lightbox-media");
    var caption = lightbox.querySelector(".lightbox-caption");
    var closeBtn = lightbox.querySelector(".lightbox-close");
    var prevBtn = lightbox.querySelector(".lightbox-prev");
    var nextBtn = lightbox.querySelector(".lightbox-next");
    var current = 0;
    var touchStartX = null;

    function renderSlide() {
      var trigger = triggers[current];
      var phClass = trigger.getAttribute("data-ph") || "ph-1";
      var ratio = trigger.getAttribute("data-ratio") || "ratio-wide";
      var cap = trigger.getAttribute("data-caption") || "";
      var full = trigger.getAttribute("data-full") || "";
      var altText = cap.replace(/"/g, "&quot;");
      var imgTag = full
        ? '<img src="' + full + '" alt="' + altText + '" loading="eager" ' +
          "onload=\"this.classList.add('is-loaded')\" onerror=\"this.style.display='none'\">"
        : "";
      stage.innerHTML =
        '<div class="ph-img ' + phClass + " " + ratio + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.3"/></svg>' +
        imgTag +
        "</div>";
      caption.textContent = cap;
    }

    function openLightbox(index) {
      current = index;
      renderSlide();
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-lock");
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-lock");
    }

    function showNext() {
      current = (current + 1) % triggers.length;
      renderSlide();
    }

    function showPrev() {
      current = (current - 1 + triggers.length) % triggers.length;
      renderSlide();
    }

    triggers.forEach(function (trigger, i) {
      trigger.addEventListener("click", function () { openLightbox(i); });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (nextBtn) nextBtn.addEventListener("click", showNext);
    if (prevBtn) prevBtn.addEventListener("click", showPrev);

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    });

    lightbox.addEventListener("touchstart", function (e) {
      touchStartX = e.changedTouches[0].clientX;
    });

    lightbox.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { dx < 0 ? showNext() : showPrev(); }
      touchStartX = null;
    });
  }

  // Contact forms — posts to our own /api/contact serverless function,
  // which forwards to the Studio admin app server-to-server. Handles
  // both the quick form and the full booking inquiry form.
  document.querySelectorAll(".contact-form").forEach(function (form) {
    var note = form.querySelector(".form-note");
    if (!note) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var formType = data.get("form_type") || "Contact";
      var isInquiry = formType === "Inquiry";

      var message = data.get("message") || "";
      if (isInquiry) {
        var lines = [];
        var addLine = function (label, key) {
          var value = data.get(key);
          if (value) lines.push(label + ": " + value);
        };
        addLine("Session type", "session_type");
        addLine("Estimated budget", "budget");
        if (data.get("dates_flexible")) {
          lines.push("Date(s): Flexible");
        } else {
          var dateFrom = data.get("date_from");
          var dateTo = data.get("date_to");
          if (dateFrom && dateTo && dateFrom !== dateTo) {
            lines.push("Date(s): " + dateFrom + " to " + dateTo);
          } else if (dateFrom || dateTo) {
            lines.push("Date(s): " + (dateFrom || dateTo));
          }
        }
        if (message) lines.push("Message: " + message);
        message = lines.join("\n");
      }

      var payload = {
        name: data.get("name") || "",
        email: data.get("email") || "",
        phone: data.get("phone") || "",
        instagram: data.get("instagram") || "",
        message: message || "",
        source: isInquiry ? "inquiry" : "quick-contact",
      };

      var submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            note.textContent = isInquiry
              ? "Thanks for reaching out! I'll be in touch soon — excited to see what we make together."
              : "Thanks for reaching out! I'll get back to you soon.";
            form.reset();
            if (isInquiry && dateTo) dateTo.min = todayIso;
          } else {
            note.textContent = "Something went wrong sending that — please try again, or email jenna.mcmullen12@gmail.com directly.";
          }
          note.classList.add("visible");
        })
        .catch(function () {
          note.textContent = "Something went wrong sending that — please try again, or email jenna.mcmullen12@gmail.com directly.";
          note.classList.add("visible");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  });

  // Contact page — reveal the full booking inquiry form on demand
  var bookingToggle = document.querySelector(".booking-toggle");
  var bookingWrap = document.querySelector(".booking-form-wrap");

  if (bookingToggle && bookingWrap) {
    var bookingInner = bookingWrap.querySelector(".booking-form-inner");
    var bookingLabel = bookingToggle.querySelector(".label-text");

    bookingToggle.addEventListener("click", function () {
      var isOpen = bookingWrap.classList.toggle("open");
      bookingToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (bookingLabel) {
        bookingLabel.textContent = isOpen
          ? "Hide this"
          : "Not sure yet? Reach out and we can talk";
      }
      bookingWrap.style.maxHeight = isOpen ? bookingInner.scrollHeight + "px" : null;

      if (isOpen) {
        setTimeout(function () {
          bookingWrap.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    });
  }

  // Inquiry form — date range can't start in the past, and "Latest"
  // can't be set before "Earliest". "Flexible on dates" disables both.
  var flexCheckbox = document.getElementById("dates-flexible");
  var dateFrom = document.getElementById("date-from");
  var dateTo = document.getElementById("date-to");

  if (dateFrom && dateTo) {
    var todayIso = (function () {
      var d = new Date();
      var mm = String(d.getMonth() + 1).padStart(2, "0");
      var dd = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + mm + "-" + dd;
    })();

    dateFrom.min = todayIso;
    dateTo.min = todayIso;

    dateFrom.addEventListener("change", function () {
      dateTo.min = dateFrom.value || todayIso;
      if (dateTo.value && dateTo.value < dateTo.min) dateTo.value = "";
    });
  }

  if (flexCheckbox && dateFrom && dateTo) {
    flexCheckbox.addEventListener("change", function () {
      var flexible = flexCheckbox.checked;
      dateFrom.disabled = flexible;
      dateTo.disabled = flexible;
      if (flexible) {
        dateFrom.value = "";
        dateTo.value = "";
        dateTo.min = todayIso;
      }
    });
  }
});
