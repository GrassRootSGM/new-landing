// Cloudflare Pages Function: functions/api/contact.js
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return Response.json({ error: 'Invalid form submission.' }, { status: 415 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form submission.' }, { status: 400 });
  }

  // Honeypot: quietly accept automated spam submissions.
  if (String(form.get('website') || '').trim()) {
    return Response.json({ ok: true });
  }

  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const message = String(form.get('message') || '').trim();

  if (!name || !email || !message || name.length > 120 || email.length > 254 || message.length > 5000) {
    return Response.json({ error: 'Please complete all fields and check their length.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.FROM_EMAIL) {
    return Response.json({ error: 'The contact form is not configured yet. Please try again later.' }, { status: 503 });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r\n|\r|\n/g, '<br>');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f6f5f0;font-family:Arial,Helvetica,sans-serif;color:#26352a;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7df;">
    <tr><td style="background:#285c2d;padding:24px 28px;color:#ffffff;">
      <div style="font-size:21px;font-weight:bold;letter-spacing:1px;">GRASSROOTS</div>
      <div style="font-size:12px;letter-spacing:2px;margin-top:5px;">GREATER MANCHESTER</div>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="font-size:23px;line-height:1.3;margin:0 0 10px;color:#285c2d;">New website enquiry</h1>
      <p style="font-size:14px;line-height:1.6;color:#526055;margin:0 0 26px;">A new message has been submitted through your website contact form.</p>
      <p style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#af7545;margin:0 0 6px;">NAME</p>
      <p style="font-size:16px;margin:0 0 22px;">${safeName}</p>
      <p style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#af7545;margin:0 0 6px;">EMAIL ADDRESS</p>
      <p style="font-size:16px;margin:0 0 22px;">${safeEmail}</p>
      <p style="font-size:12px;font-weight:bold;letter-spacing:1px;color:#af7545;margin:0 0 8px;">MESSAGE</p>
      <div style="padding:18px;background:#f5f7f2;border-left:4px solid #af7545;font-size:15px;line-height:1.7;overflow-wrap:anywhere;">${safeMessage}</div>
      <p style="border-top:1px solid #e5e7df;padding-top:18px;margin:26px 0 0;font-size:12px;color:#657068;">Grass Roots Greater Manchester · Website contact form notification</p>
    </td></tr>
  </table>
</body></html>`;

  // Actual newlines (not literal backslash-n characters) for plain-text mail clients.
  const text = `New website enquiry\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nSent via the Grass Roots Greater Manchester website.`;

  let result;
  try {
    result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.CONTACT_TO],
        reply_to: email,
        subject: `New website enquiry — ${name.replace(/[\r\n]/g, ' ')}`,
        html,
        text
      })
    });
  } catch {
    return Response.json({ error: 'Your message could not be sent. Please try again later.' }, { status: 502 });
  }

  if (!result.ok) {
    console.error('Resend failed with status', result.status);
    return Response.json({ error: 'Your message could not be sent. Please try again later.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
