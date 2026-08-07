(() => {
  "use strict";

  /* ---- Footer year ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Sticky nav background on scroll ---- */
  const nav = document.getElementById("nav");
  const toTopBtn = document.getElementById("toTop");

  const onScroll = () => {
    const scrolled = window.scrollY > 40;
    nav.classList.toggle("scrolled", scrolled);
    toTopBtn.classList.toggle("visible", window.scrollY > 600);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  toTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---- Scroll-spy active nav link ---- */
  const sections = Array.from(document.querySelectorAll("main .section, .hero"));
  const navAnchors = Array.from(document.querySelectorAll("[data-nav]"));

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navAnchors.forEach((a) => {
          a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((section) => {
    if (section.id) spyObserver.observe(section);
  });

  /* ---- Scroll-reveal ---- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* Safety net: force-reveal anything already on-screen if IntersectionObserver
     never fires (e.g. throttled while the tab/pane isn't actively compositing). */
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("in-view");
      }
    });
  }, 1200);

  /* ---- Hero rotating role tag ---- */
  const roleTag = document.getElementById("roleTag");
  const roles = ["AI Director", "Digital Marketing Specialist", "Claude AI Certified"];
  let roleIndex = 0;
  if (roleTag) {
    setInterval(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleTag.style.opacity = "0";
      roleTag.style.transform = "translateY(6px)";
      setTimeout(() => {
        roleTag.textContent = roles[roleIndex];
        roleTag.style.opacity = "1";
        roleTag.style.transform = "translateY(0)";
      }, 260);
    }, 3200);
    roleTag.style.transition = "opacity .26s ease, transform .26s ease";
  }

  /* ---- Cursor spotlight glow (desktop only) ---- */
  const glow = document.querySelector(".cursor-glow");
  if (glow && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
      glow.style.opacity = "1";
    });
    window.addEventListener("mouseleave", () => {
      glow.style.opacity = "0";
    });
  }

  /* ---- Booking form ---- */
  const form = document.getElementById("bookingForm");
  const successMsg = document.getElementById("formSuccess");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      successMsg.classList.add("visible");
      form.reset();
      successMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => successMsg.classList.remove("visible"), 6000);
    });
  }
})();
