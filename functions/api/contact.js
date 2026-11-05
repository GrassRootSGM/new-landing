export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return Response.json({ error: 'Invalid form submission.' }, { status: 415 });
  }

  const form = await request.formData();
  // Honeypot field: silently accept bot submissions without sending email.
  if (String(form.get('website') || '').trim()) {
    return Response.json({ ok: true });
  }

  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const message = String(form.get('message') || '').trim();

  if (!name || !email || !message || name.length > 120 || email.length > 254 || message.length > 5000) {
    return Response.json({ error: 'Please complete all fields and check their length.' }, { status: 400 });
  }
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.FROM_EMAIL) {
    return Response.json({ error: 'The contact form is not configured yet. Please email hello@grassrootsgm.org.' }, { status: 503 });
  }

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Website enquiry from ${name}`,
      text: `Name: ${name}\\nEmail: ${email}\\n\\nMessage:\\n${message}`
    })
  });

  if (!result.ok) {
    return Response.json({ error: 'Your message could not be sent. Please try again later.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
