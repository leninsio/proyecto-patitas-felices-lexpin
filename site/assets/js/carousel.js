/* ==========================================================================
   Patitas Felices — accessible team carousel (T16)
   Scroll-snap track + prev/next buttons + dots + keyboard arrows + native
   swipe. No autoplay. Smooth scrolling is skipped when the user asks for
   reduced motion (base.css also turns transitions off globally).
   ========================================================================== */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initCarousel(root) {
    var track = root.querySelector("[data-carousel-track]");
    var slides = Array.prototype.slice.call(
      root.querySelectorAll("[data-carousel-slide]")
    );
    var previous = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    var dots = root.querySelector("[data-carousel-dots]");

    if (!track || !slides.length || !dots) {
      return;
    }

    if (!root.getAttribute("role")) {
      root.setAttribute("role", "region");
    }

    var page = 0;
    var pageCount = 1;

    function gapSize() {
      var styles = window.getComputedStyle(track);
      return parseFloat(styles.columnGap || styles.gap) || 0;
    }

    function slidesPerView() {
      var width = slides[0].getBoundingClientRect().width;
      if (!width) {
        return 1;
      }
      return Math.max(
        1,
        Math.round((track.clientWidth + gapSize()) / (width + gapSize()))
      );
    }

    function maxScroll() {
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }

    function calculatePages() {
      pageCount = Math.max(1, Math.ceil(slides.length / slidesPerView()));
    }

    function goTo(target) {
      page = Math.max(0, Math.min(pageCount - 1, target));
      var distance = pageCount > 1 ? page / (pageCount - 1) : 0;
      track.scrollTo({
        left: distance * maxScroll(),
        behavior: reducedMotion.matches ? "auto" : "smooth"
      });
      update();
    }

    function update() {
      var progress = maxScroll() > 0 ? track.scrollLeft / maxScroll() : 0;
      page = Math.max(
        0,
        Math.min(pageCount - 1, Math.round(progress * (pageCount - 1)))
      );

      if (previous) {
        previous.disabled = page <= 0;
      }
      if (next) {
        next.disabled = page >= pageCount - 1;
      }

      Array.prototype.forEach.call(
        dots.querySelectorAll("button"),
        function (button, index) {
          if (index === page) {
            button.setAttribute("aria-current", "true");
          } else {
            button.removeAttribute("aria-current");
          }
        }
      );
    }

    function buildDots() {
      calculatePages();
      dots.textContent = "";
      for (var index = 0; index < pageCount; index += 1) {
        var button = document.createElement("button");
        var dot = document.createElement("span");
        button.type = "button";
        button.className = "team-carousel__dot";
        button.setAttribute(
          "aria-label",
          "Ir al grupo " + (index + 1) + " de " + pageCount
        );
        button.setAttribute("aria-controls", track.id);
        button.appendChild(dot);
        button.addEventListener("click", function (target) {
          return function () {
            goTo(target);
          };
        }(index));
        dots.appendChild(button);
      }
      update();
    }

    if (previous) {
      previous.addEventListener("click", function () {
        goTo(page - 1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        goTo(page + 1);
      });
    }

    root.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      var target = event.target;
      if (
        target &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      goTo(event.key === "ArrowLeft" ? page - 1 : page + 1);
      track.focus();
    });

    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    });

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildDots, 120);
    });

    if (window.ResizeObserver) {
      new window.ResizeObserver(function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(buildDots, 120);
      }).observe(track);
    }

    buildDots();
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-carousel]"),
      initCarousel
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
