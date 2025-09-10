// api/lead.js — Vercel Serverless Function (ESM)
export default async function handler(req, res) {
  try {
    // CORS mínimo
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Leer body (robusto)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    let p = {};
    try { p = JSON.parse(raw || '{}'); } catch { p = {}; }

    const {
      especialidad = '', comunas = [], franja_Mediodia, franja_PM, franja_Sabado,
      modalidad = '', requisitos = '', tarifa = '', nombre = '', whatsapp = '', email = '',
      utm_source = '', utm_medium = '', utm_campaign = '', utm_content = ''
    } = p;

    const list = (a) => Array.isArray(a) ? a.join(', ') : (a || '');
    const franjasTxt = ['AM', franja_Mediodia ? 'Mediodía' : '', franja_PM ? 'PM' : '', franja_Sabado ? 'Sábado' : '']
      .filter(Boolean).join(', ');

    const htmlAdmin = `
      <h2>Nuevo lead — Box Médico por Hora</h2>
      <p><b>Nombre:</b> ${nombre || '(s/i)'}<br>
         <b>Email:</b> ${email || '(s/i)'}<br>
         <b>WhatsApp:</b> ${whatsapp || '(s/i)'}</p>
      <p><b>Especialidad:</b> ${especialidad || '(s/i)'}<br>
         <b>Comunas:</b> ${list(comunas) || '(s/i)'}<br>
         <b>Franjas:</b> ${franjasTxt || '(s/i)'}<br>
         <b>Modalidad:</b> ${modalidad || '(s/i)'}<br>
         <b>Requisitos:</b> ${requisitos || '(ninguno)'}<br>
         <b>Tarifa:</b> ${tarifa || '(s/i)'} </p>
      <p><b>UTM:</b> ${utm_source}/${utm_medium}/${utm_campaign}/${utm_content}</p>
    `;

    const { RESEND_API_KEY, EMAIL_FROM, EMAIL_TO } = process.env;
    if (!RESEND_API_KEY || !EMAIL_FROM || !EMAIL_TO) {
      // No rompas el flujo: devuelve OK con aviso
      return res.status(200).json({ ok: true, warn: 'Missing env vars' });
    }

    const send = async (payload) => {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          // No lances error al usuario final
          const t = await r.text().catch(() => '');
          console.error('Resend error:', r.status, t);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    // 1) Aviso interno
    await send({
      from: EMAIL_FROM,
      to: String(EMAIL_TO).split(',').map(s => s.trim()),
      subject: `Nuevo lead: ${especialidad || 'sin especialidad'} — ${nombre || 'sin nombre'}`,
      html: htmlAdmin,
      reply_to: email || undefined
    });

    // 2) Auto-respuesta (si hay email)
    if (email) {
      await send({
        from: EMAIL_FROM,
        to: [email],
        subject: 'Recibimos tu registro — Box Médico por Hora',
        html: `
          <p>Hola ${nombre || ''}, gracias por tu interés.</p>
          <p>Recibimos tu registro${comunas?.length ? ` en ${list(comunas)}` : ''}.
          Te contactaremos pronto.</p>
          <p>Si necesitas hablar ahora: WhatsApp +56 9 9863 1064.</p>
          <p>— Equipo Box Médico por Hora</p>
        `,
        reply_to: 'oficina@isalar.cl'
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Evita 500 visibles
    console.error('Handler crash:', err);
    return res.status(200).json({ ok: true, warn: 'caught', error: String(err?.message || err) });
  }
}

