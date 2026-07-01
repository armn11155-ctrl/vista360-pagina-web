(function () {
  const root = document.querySelector('[data-detail-root]');
  if (!root) return;

  const reveals = Array.from(root.querySelectorAll('[data-reveal]'));
  reveals.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(26px)';
    el.style.transition = 'opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)';
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        observer.unobserve(entry.target);
      });
    }, { threshold:0.1, rootMargin:'0px 0px -6% 0px' });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  const progress = root.querySelector('[data-detail-progress]');
  const updateProgress = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  };
  window.addEventListener('scroll', updateProgress, { passive:true });
  updateProgress();
})();
