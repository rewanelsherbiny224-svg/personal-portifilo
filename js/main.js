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
    var pos = window.scrollY + 140, current = 0;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= pos) current = i; });
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

  // Contact form — validates, then opens the visitor's email app (static site, no server)
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  var TO = "Rewanelsherbiny224@gmail.com";
  if (form) {
    var fields = [].slice.call(form.querySelectorAll("input, textarea"));
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      fields.forEach(function (el) { if (!check(el)) { ok = false; if (!first) first = el; } });
      if (!ok) { note.textContent = ""; first.focus(); return; }
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var body = form.elements.message.value.trim() + "\n\n— " + name + " (" + email + ")";
      note.textContent = "Opening your email app with your message ready to send. If nothing opens, email me directly at " + TO + ".";
      window.location.href = "mailto:" + TO + "?subject=" + encodeURIComponent("Portfolio message from " + name) + "&body=" + encodeURIComponent(body);
    });
  }
})();
