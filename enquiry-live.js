/* Secure enquiries progressively activate only when the Cloudflare endpoint has
   been configured and explicitly enabled after privacy/operational review.
   Otherwise existing preview or email-draft behaviour is preserved. */
(() => {
  async function init() {
    const form = document.getElementById('enquiry-form') || document.querySelector('[data-enquiry-form]');
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    const note = form.querySelector('.form-note, .form-privacy');
    let feedback = document.getElementById('form-feedback');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      form.appendChild(feedback);
    }
    if (!button) return;
    let config;
    try {
      const response = await fetch('/api/enquiry', {credentials:'same-origin', cache:'no-store'});
      if (!response.ok) return;
      config = await response.json();
      if (!config.live || !config.siteKey) return;
    } catch { return; }
    const loadTurnstile = () => new Promise((resolve,reject) => {
      if (window.turnstile) return resolve(window.turnstile);
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable'));
      script.onerror = reject;
      document.head.appendChild(script);
    });
    let turnstile;
    try {turnstile = await loadTurnstile();} catch {
      feedback.textContent = 'Secure enquiry verification is unavailable in this browser. Please try again later.';
      feedback.hidden = false;
      return;
    }
    const widget = document.createElement('div');
    widget.className = 'enquiry-security-check';
    widget.style.margin = '1rem 0';
    widget.setAttribute('aria-label', 'Anti-spam verification');
    form.insertBefore(widget, button);
    const trap = document.createElement('input');
    trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1;
    trap.autocomplete = 'off'; trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;opacity:0;pointer-events:none;';
    form.appendChild(trap);
    let widgetId;
    try {widgetId = turnstile.render(widget, {sitekey:config.siteKey});}
    catch {widget.remove();trap.remove();return;}
    form.dataset.enquiryLive = 'true';
    button.disabled = false;
    const originalButtonHTML = button.innerHTML;
    button.textContent = 'Send enquiry securely';
    if (note) {
      note.textContent = 'Secure submissions are sent to the business contact team only when successfully delivered. Please avoid unnecessary sensitive information. ';
      const link = document.createElement('a');link.href='/privacy/';link.textContent='Read our privacy information.';
      note.appendChild(link);
    }
    form.addEventListener('submit', async event => {
      if (form.dataset.enquiryLive !== 'true') return;
      event.preventDefault();event.stopImmediatePropagation();
      feedback.hidden = false;
      if (!form.reportValidity()) {
        feedback.textContent = 'Please complete the required fields.';
        return;
      }
      const token = turnstile.getResponse(widgetId);
      if (!token) {
        feedback.textContent = 'Please complete the anti-spam verification.';
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      delete data['cf-turnstile-response'];
      data.turnstileToken = token;
      button.disabled = true;button.textContent = 'Sending…';
      feedback.textContent = 'Sending your enquiry securely…';
      try {
        const response = await fetch('/api/enquiry', {method:'POST', credentials:'same-origin',
          headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to send this enquiry.');
        feedback.textContent = 'Your enquiry has been sent successfully.';
        form.reset();turnstile.reset(widgetId);
      } catch(error) {
        feedback.textContent = error.message || 'Unable to send. Please try again.';
        turnstile.reset(widgetId);
      } finally {
        button.disabled = false;button.textContent = 'Send enquiry securely';
      }
    }, true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
