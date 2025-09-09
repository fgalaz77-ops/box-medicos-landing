// api/lead.js — Vercel Serverless Function
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let raw = ''; await new Promise(r => { req.on('data', c => raw += c); req.on('end', r); });
  let p = {}; try { p = JSON.parse(raw || '{}'); } catch { p = {}; }

  const { especialidad='', comunas=[], franja_Mediodia, franja_PM, franja_Sabado,
          modalidad='', requisitos='', tarifa='', nombre='', whatsapp='', email='',
          utm_source='', utm_medium='', utm_campaign='', utm_content='' } = p;

  const list = a => Array.isArray(a) ? a.join(', ') : (a||'');
  const franjasTxt = ['AM', franja_Mediodia?'Mediodía':'', franja_PM?'PM':'', franja_Sabado?'Sábado':''].filter(Boolean).join(', ');
  const htmlAdmin = `
    <h2>Nuevo lead — Box Médico por Hora</h2>
    <p><b>Nombre:</b> ${nombre||'(s/i)'}<br><b>Email:</b> ${email||'(s/i)'}<br><b>WhatsApp:</b> ${whatsapp||'(s/i)'}</p>
    <p><b>Especialidad:</b> ${especialidad||'(s/i)'}<br><b>Comunas:</b> ${list(comunas)||'(s/i)'}<br>
       <b>Franjas:</b> ${franjasTxt||'(s/i)'}<br><b>Modalidad:</b> ${modalidad||'(s/i)'}<br>
       <b>Requisitos:</b> ${requisitos||'(ninguno)'}<br><b>Tarifa:</b> ${tarifa||'(s/i)'}</p>
    <p><b>UTM:</b> ${utm_source}/${utm_medium}/${utm_campaign}/${utm_content}</p>`;

  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_TO } = process.env;
  if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO)
    return res.status(200).json({ ok:true, warn:'Missing env vars' });

  const send = payload => fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  }).then(r => (r.ok ? true : (r.text().then(t=>console.error('Resend',r.status,t)), false)));

  await send({
    from: EMAIL_FROM,
    to: String(EMAIL_TO).split(',').map(s=>s.trim()),
    subject: `Nuevo lead: ${especialidad||'sin especialidad'} — ${nombre||'sin nombre'}`,
    html: htmlAdmin,
    reply_to: email || undefined
  });

  if (email) {
    await send({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Recibimos tu registro — Box Médico por Hora',
      html: `<p>Hola ${nombre||''}, gracias por tu interés.</p>
             <p>Recibimos tu registro${comunas?.length?` en ${list(comunas)}`:''}. Te contactaremos pronto.</p>
             <p>Si necesitas hablar ahora: WhatsApp +56 9 9863 1064.</p>
             <p>— Equipo Box Médico por Hora</p>`
    });
  }

  return res.status(200).json({ ok:true });
};
