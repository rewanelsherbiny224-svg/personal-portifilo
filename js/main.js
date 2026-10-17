(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var nav = document.getElementById("nav");
  var toTop = document.getElementById("toTop");
  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle("scrolled", y > 40);
    if (toTop) toTop.classList.toggle("show", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // Mobile menu
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function setMenu(open) {
    if (!toggle || !links) return;
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (toggle) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { setMenu(false); toggle.focus(); } });
  }

  // Scroll spy
  var anchors = [].slice.call(document.querySelectorAll("[data-nav]"));
  var targets = anchors.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function spy() {
    // Nav order differs from page order (Experience sits below Projects), so pick
    // the section nearest above the viewport, not the last nav item that qualifies.
    var pos = window.scrollY + 140, current = 0, best = -1;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= pos && t.offsetTop > best) { best = t.offsetTop; current = i; } });
    anchors.forEach(function (a, i) { a.classList.toggle("active", i === current); });
  }
  window.addEventListener("scroll", spy, { passive: true });
  spy();

  // Reveal on scroll
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add("in-view"); }); }, 6000);
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  // Contact form — validates, then POSTs to /api/contact (Vercel function → Resend)
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  var TO = "Rewanelsherbiny224@gmail.com";
  var LABELS = { freelance: "Freelance enquiry", employment: "Job opportunity", other: "Message" };
  var PROMPTS = { freelance: "Project details", employment: "Role & team details", other: "Message" };
  if (form) {
    var typeEl = form.elements.type;
    var msgLabel = document.getElementById("cMsgLabel");
    var setType = function (t) {
      if (!LABELS[t]) t = "other";
      typeEl.value = t;
      if (msgLabel) msgLabel.textContent = PROMPTS[t];
    };
    typeEl.addEventListener("change", function () { setType(typeEl.value); });
    setType(typeEl.value);
    // Enquiry buttons across the page preselect the matching enquiry type
    var service = "";
    var msgEl = form.elements.message;
    [].slice.call(document.querySelectorAll("[data-inquiry]")).forEach(function (el) {
      el.addEventListener("click", function () {
        setType(el.getAttribute("data-inquiry"));
        service = el.getAttribute("data-service") || "";
        if (service && !msgEl.value.trim()) msgEl.value = "I'm interested in: " + service + ".\n\n";
      });
    });

    var fields = [].slice.call(form.querySelectorAll(".field input, .field textarea"));
    var msgFor = function (el) {
      if (el.validity.valueMissing) return "Please fill this in.";
      if (el.validity.typeMismatch) return "Please enter a valid email address.";
      if (el.validity.tooShort) return "Please write at least 10 characters.";
      return "";
    };
    var check = function (el) {
      var m = msgFor(el), wrap = el.closest(".field");
      wrap.classList.toggle("invalid", !!m);
      wrap.querySelector(".err").textContent = m;
      el.setAttribute("aria-invalid", m ? "true" : "false");
      return !m;
    };
    fields.forEach(function (el) {
      el.addEventListener("blur", function () { check(el); });
      el.addEventListener("input", function () { if (el.closest(".field").classList.contains("invalid")) check(el); });
    });
    var btn = form.querySelector('button[type="submit"]');
    var btnHtml = btn.innerHTML;
    var setNote = function (text, kind) {
      note.textContent = text;
      note.className = "form-note" + (kind ? " " + kind : "");
    };
    var busy = false;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var ok = true, first = null;
      fields.forEach(function (el) { if (!check(el)) { ok = false; if (!first) first = el; } });
      if (!ok) { setNote(""); first.focus(); return; }

      busy = true;
      btn.disabled = true;
      btn.textContent = "Sending…";
      setNote("Sending your message…");

      var fail = function (msg) {
        setNote(msg || "Something went wrong. Please email me directly at " + TO + ".", "error");
      };
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: typeEl.value,
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          message: form.elements.message.value.trim(),
          service: service,
          website: form.elements.website ? form.elements.website.value : ""
        })
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!data && (res.status === 404 || res.status === 405 || res.status === 501)) {
            // No server function on this host (e.g. the GitHub Pages copy): use the email app, as before.
            var subj = LABELS[typeEl.value] + (service ? " — " + service : "") + " — " + form.elements.name.value.trim();
            var mbody = form.elements.message.value.trim() + "\n\n— " + form.elements.name.value.trim() + " (" + form.elements.email.value.trim() + ")";
            setNote("Opening your email app with your message ready to send. If nothing opens, email me directly at " + TO + ".");
            window.location.href = "mailto:" + TO + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(mbody);
            return;
          }
          if (res.ok && data && data.ok === true) {
            // Only reached when the server confirmed Resend accepted the email.
            form.reset();
            service = "";
            setType("freelance");
            fields.forEach(function (el) {
              el.closest(".field").classList.remove("invalid");
              el.setAttribute("aria-invalid", "false");
            });
            setNote("Thank you — your message has been sent. I'll get back to you soon.", "success");
            return;
          }
          if (data && data.fields) {
            var firstBad = null;
            Object.keys(data.fields).forEach(function (k) {
              var el = form.elements[k];
              if (!el || !el.closest) return;
              var wrap = el.closest(".field");
              wrap.classList.add("invalid");
              wrap.querySelector(".err").textContent = data.fields[k];
              el.setAttribute("aria-invalid", "true");
              if (!firstBad) firstBad = el;
            });
            if (firstBad) firstBad.focus();
          }
          fail(data && data.error ? data.error + " You can also email me at " + TO + "." : null);
        });
      }).catch(function () {
        fail("Couldn't reach the server. Check your connection and try again, or email me at " + TO + ".");
      }).then(function () {
        busy = false;
        btn.disabled = false;
        btn.innerHTML = btnHtml;
      });
    });
  }
})();
