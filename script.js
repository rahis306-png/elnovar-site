(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('primary-nav');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
    }));
  }
  document.getElementById('year').textContent = new Date().getFullYear();

  const switches = Array.from(document.querySelectorAll('[data-audience]'));
  const companyInput = document.getElementById('contact-company');
  const companyLabel = document.getElementById('company-label');
  const messageInput = document.getElementById('contact-message');
  const messageLabel = document.getElementById('message-label');
  const contactEmail = document.getElementById('contact-email');

  switches.forEach(button => button.addEventListener('click', () => {
    const isEmployer = button.dataset.audience === 'employer';
    switches.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    companyLabel.textContent = isEmployer ? 'Company' : 'Current role / area of interest';
    companyInput.placeholder = isEmployer ? 'Company name' : 'e.g. Maintenance Engineer';
    companyInput.setAttribute('autocomplete', isEmployer ? 'organization' : 'off');
    messageLabel.innerHTML = isEmployer ? 'How can we help? <span>*</span>' : 'What are you looking for? <span>*</span>';
    messageInput.placeholder = isEmployer ?
      'Tell us about the role or recruitment support you need...' :
      'Tell us about your experience, preferred location and next step...';
    contactEmail.placeholder = isEmployer ? 'you@company.co.uk' : 'you@example.com';
  }));

  // IMPORTANT: Demo-only interaction. No user data is sent or stored.
  // Before launching publicly, connect a compliant form backend, publish a privacy
  // notice, confirm controller details, and implement data handling and retention.
  const form = document.getElementById('enquiry-form');
  const feedback = document.getElementById('form-feedback');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      feedback.textContent = 'This is a website preview. The form is not connected and no message has been sent.';
      feedback.focus?.();
    });
  }
})();
