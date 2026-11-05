const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
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
    status.textContent = 'Thank you — your message has been sent.';
  } catch (error) {
    status.textContent = error.message || 'Something went wrong. Please try again later.';
  } finally {
    button.disabled = false;
  }
});
