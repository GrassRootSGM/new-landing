const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.querySelector('[name="cf-turnstile-response"]')?.value) {
    status.textContent = 'Please complete the anti-spam check before sending.';
    return;
  }
  status.textContent = 'Sending…';
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: new FormData(form)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not send your message.');
    form.reset();
    if (window.turnstile) window.turnstile.reset();
    status.textContent = 'Thank you — your message has been sent.';
  } catch (error) {
    status.textContent = error.message || 'Something went wrong. Please try again later.';
    if (window.turnstile) window.turnstile.reset();
  } finally {
    button.disabled = false;
  }
});
