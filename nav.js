(function () {
  var desktopQuery = window.matchMedia("(min-width: 1660px)");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var storageKey = "equipment-handoff-rail";
  var layout = document.querySelector(".layout");
  var rail = document.querySelector(".rail");
  var hero = document.querySelector(".hero");
  var railToggle = document.getElementById("rail-toggle");
  var railLabel = railToggle.querySelector(".rail-toggle__text");
  var mobileToggle = document.getElementById("mobile-sections-toggle");
  var mobileMenu = document.getElementById("mobile-section-menu");
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var portfolioHome = document.querySelector(".hero .portfolio-home");
  var portfolioFloat = document.querySelector(".portfolio-home--float");
  var frame = 0;
  var heroTheme = null;
  var themeBuffer = 16;
  var portfolioShown = false;

  function readChoice() {
    try {
      return sessionStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function storeChoice(value) {
    try {
      sessionStorage.setItem(storageKey, value);
    } catch (error) {
      return;
    }
  }

  function setRailExpanded(expanded, persist) {
    layout.classList.toggle("is-rail-collapsed", !expanded);
    railToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    railToggle.title = expanded ? "Collapse sections" : "Expand sections";
    railLabel.textContent = expanded ? "Collapse sections" : "Expand sections";
    if (persist) storeChoice(expanded ? "expanded" : "collapsed");
    syncRailTheme();
  }

  function syncRailTheme() {
    if (!rail || !hero) return;
    var heroBottom = hero.getBoundingClientRect().bottom;
    var mid = (window.innerHeight || document.documentElement.clientHeight) / 2;
    var next;
    if (heroTheme === null) {
      next = heroBottom >= mid;
    } else if (heroTheme) {
      next = heroBottom >= mid - themeBuffer;
    } else {
      next = heroBottom >= mid + themeBuffer;
    }
    if (next === heroTheme) return;
    heroTheme = next;
    rail.classList.toggle("is-hero-theme", next);
  }

  function setMobileOpen(open) {
    mobileToggle.setAttribute("aria-expanded", open ? "true" : "false");
    mobileMenu.hidden = !open;
  }

  function setCurrent(id) {
    links.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function currentFromScroll() {
    var marker = 96;
    var current = sections[0] ? sections[0].id : "";
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd && sections.length) {
      current = sections[sections.length - 1].id;
    } else {
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top - marker <= 0) current = section.id;
      });
    }
    if (current) setCurrent(current);
  }

  function setLinkExposed(link, exposed) {
    if (!link) return;
    if (exposed) {
      link.removeAttribute("inert");
      link.removeAttribute("aria-hidden");
      link.removeAttribute("tabindex");
      return;
    }
    if (document.activeElement === link) link.blur();
    link.setAttribute("inert", "");
    link.setAttribute("aria-hidden", "true");
    link.setAttribute("tabindex", "-1");
  }

  function railContentHeight() {
    var nav = rail.querySelector(".rail__nav");
    var cs = window.getComputedStyle(rail);
    var pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    var gap = parseFloat(cs.rowGap || cs.gap) || 0;
    return railToggle.offsetHeight + gap + nav.scrollHeight + pad;
  }

  function constrainRail(show) {
    if (!rail) return;
    if (!show || !desktopQuery.matches) {
      rail.classList.remove("is-below-lockup");
      return;
    }
    var clearance = Math.ceil(portfolioFloat.getBoundingClientRect().bottom) + 12;
    var maxH = window.innerHeight - 32;
    var used = Math.min(railContentHeight(), maxH);
    var naturalTop = (window.innerHeight - used) / 2;
    rail.style.setProperty("--lockup-clearance", clearance + "px");
    rail.classList.toggle("is-below-lockup", naturalTop < clearance);
  }

  function syncPortfolioFloat() {
    if (!portfolioHome || !portfolioFloat || !hero) return;
    var show = portfolioHome.getBoundingClientRect().bottom <= 0;
    var floatRect = portfolioFloat.getBoundingClientRect();
    var sampleY = floatRect.height ? floatRect.top + floatRect.height / 2 : 36;
    var overHero = hero.getBoundingClientRect().bottom > sampleY;
    var themeChanged = portfolioFloat.classList.contains("is-on-hero") !== overHero;
    var snapTheme = themeChanged && !portfolioFloat.classList.contains("is-shown");
    if (snapTheme) portfolioFloat.classList.add("is-instant");
    portfolioFloat.classList.toggle("is-on-hero", overHero);
    portfolioFloat.classList.toggle("is-on-body", !overHero);
    if (snapTheme) {
      portfolioFloat.getBoundingClientRect();
      portfolioFloat.classList.remove("is-instant");
    }
    if (show !== portfolioShown) {
      portfolioShown = show;
      document.documentElement.classList.toggle("is-portfolio-float", show);
      if (show) {
        setLinkExposed(portfolioFloat, true);
        setLinkExposed(portfolioHome, false);
        window.requestAnimationFrame(function () {
          if (portfolioShown) portfolioFloat.classList.add("is-shown");
        });
      } else {
        portfolioFloat.classList.remove("is-shown");
        setLinkExposed(portfolioFloat, false);
        setLinkExposed(portfolioHome, true);
      }
    }
    constrainRail(show);
    clearMobileMenu(show);
  }

  function clearMobileMenu(show) {
    var mobile = document.querySelector(".mobile-sections");
    if (!mobile) return;
    if (!show || desktopQuery.matches) {
      mobile.style.marginLeft = "";
      return;
    }
    var floatRect = portfolioFloat.getBoundingClientRect();
    var host = mobile.parentElement.getBoundingClientRect();
    var overlap = Math.ceil(floatRect.right + 12 - host.left);
    mobile.style.marginLeft = overlap > 0 ? overlap + "px" : "";
  }

  function onScroll() {
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      currentFromScroll();
      syncRailTheme();
      syncPortfolioFloat();
    });
  }

  function headingFor(id) {
    var section = document.getElementById(id);
    if (!section) return null;
    return section.querySelector("h1, h2");
  }

  function focusHeading(id) {
    var heading = headingFor(id);
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    var group = heading.closest(".reveal");
    if (group) group.classList.add("is-shown");
    heading.focus({ preventScroll: true });
  }

  function inView(el) {
    var rect = el.getBoundingClientRect();
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > 0 && rect.top < viewH;
  }

  function prepareReveals() {
    if (motionQuery.matches || !("IntersectionObserver" in window)) return;
    var reveals = [];
    sections.forEach(function (section) {
      if (section.id === "introduction") return;
      Array.prototype.forEach.call(section.children, function (child) {
        var pieces = child.matches(".compare, .closing__outcomes, .closing__support, .takeaways__notes, .journey__steps, .context")
          ? child.children
          : [child];
        Array.prototype.forEach.call(pieces, function (el, index) {
          if (!el || el.nodeType !== 1) return;
          el.classList.add("reveal");
          el.style.setProperty("--reveal-delay", Math.min(index * 50, 150) + "ms");
          if (inView(el)) el.classList.add("is-shown");
          reveals.push(el);
        });
      });
    });

    var hashId = location.hash.slice(1);
    var hashLock = hashId ? Date.now() + 1000 : 0;
    if (hashId) {
      reveals.forEach(function (el) {
        if (el.closest("#" + (window.CSS && CSS.escape ? CSS.escape(hashId) : hashId))) {
          el.classList.add("is-shown");
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-shown");
        } else if (entry.intersectionRatio === 0) {
          if (hashId && Date.now() < hashLock && entry.target.closest("#" + (window.CSS && CSS.escape ? CSS.escape(hashId) : hashId))) return;
          entry.target.classList.remove("is-shown");
        }
      });
    }, { threshold: [0, 0.01] });

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  setRailExpanded(readChoice() !== "collapsed", false);
  setMobileOpen(false);
  prepareReveals();

  railToggle.addEventListener("click", function () {
    var expanded = railToggle.getAttribute("aria-expanded") === "true";
    setRailExpanded(!expanded, true);
  });

  mobileToggle.addEventListener("click", function () {
    var open = mobileToggle.getAttribute("aria-expanded") === "true";
    setMobileOpen(!open);
  });

  mobileMenu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMobileOpen(false);
  });

  var navToken = 0;

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var id = link.getAttribute("href").slice(1);
      var token = ++navToken;
      setCurrent(id);
      if (motionQuery.matches) {
        focusHeading(id);
        return;
      }
      var finished = false;
      function finish() {
        if (finished || token !== navToken) return;
        var heading = headingFor(id);
        if (!heading) return;
        var top = heading.getBoundingClientRect().top;
        var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (!atEnd && (top > 200 || top < -40)) return;
        finished = true;
        window.removeEventListener("scrollend", finish);
        focusHeading(id);
      }
      window.addEventListener("scrollend", finish);
      window.requestAnimationFrame(finish);
    });
  });

  document.addEventListener("focusin", function (event) {
    var group = event.target.closest ? event.target.closest(".reveal") : null;
    if (group) group.classList.add("is-shown");
  });

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("hashchange", function () {
    currentFromScroll();
    syncRailTheme();
    syncPortfolioFloat();
  });
  window.addEventListener("resize", onScroll);
  desktopQuery.addEventListener("change", function () {
    if (!desktopQuery.matches) setMobileOpen(false);
    syncRailTheme();
    syncPortfolioFloat();
  });
  currentFromScroll();
  syncRailTheme();
  syncPortfolioFloat();
})();
