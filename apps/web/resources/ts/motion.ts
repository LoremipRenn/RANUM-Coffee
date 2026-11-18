// Bidirectional scroll-reveal using IntersectionObserver (composite-only: opacity + transform)
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealElements = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
  revealElements.forEach((el) => {
    el.dataset.revealState = 'visible';
  });
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          target.dataset.revealState = 'visible';
        } else {
          delete target.dataset.revealState;
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -20px 0px' },
  );

  revealElements.forEach((el) => observer.observe(el));
}

// Mobile navbar toggle
const mobileToggle = document.getElementById('mobile-nav-toggle');
const mobileMenu = document.getElementById('mobile-nav-menu');
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.toggle('hidden');
    mobileToggle.setAttribute('aria-expanded', String(!isHidden));
  });
}

