// Cloudflare Pages Function — POST /api/contact
//
// Recibe el formulario de Contacto, verifica el token de Turnstile EN EL
// SERVIDOR (la parte que un bot no puede falsificar) y solo si es válido,
// guarda la solicitud en Firestore. El navegador nunca llama a Firestore
// directamente ni conoce ninguna clave secreta.
//
// Variables de entorno necesarias (Cloudflare Pages → Settings →
// Environment variables):
//   TURNSTILE_SECRET_KEY  -> la Secret Key del widget de Turnstile
//   FIREBASE_API_KEY      -> la misma API key que ya se usaba antes en el
//                            navegador (AIzaSyCklWQStUPElsRfKH3icUZht-R321zgZY8),
//                            ahora movida aquí en vez de quedar visible en el HTML.

const PROJECT_ID = 'base-de-datos-vista360';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  // Honeypot: defensa adicional ademas del chequeo que ya hace el navegador.
  // Si el campo invisible viene lleno, es un bot -- fingimos exito sin guardar nada.
  if (data.hp) {
    return json({ success: true });
  }

  const token = data.token;
  if (!token || typeof token !== 'string') {
    return json({ success: false, error: 'missing_token' }, 400);
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    return json({ success: false, error: 'server_misconfigured' }, 500);
  }

  // 1) Verificar el token de Turnstile con Cloudflare. Esta es la parte que
  //    realmente bloquea bots: un script que llame a este endpoint sin haber
  //    resuelto el widget en un navegador real nunca tendra un token valido.
  const verifyBody = new URLSearchParams();
  verifyBody.set('secret', env.TURNSTILE_SECRET_KEY);
  verifyBody.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) verifyBody.set('remoteip', ip);

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyBody,
  });
  const verifyJson = await verifyRes.json();

  if (!verifyJson.success) {
    return json({ success: false, error: 'turnstile_failed', codes: verifyJson['error-codes'] || [] }, 400);
  }

  // 2) Validacion minima de campos requeridos.
  const contacto = String(data.contacto || '').trim();
  const empresa = String(data.empresa || '').trim();
  const celular = String(data.celular || '').trim();
  const email = String(data.email || '').trim();
  const panelInteres = String(data.panelInteres || '').trim();
  const notas = String(data.notas || '').trim();
  if (!contacto || !empresa || !celular || !email || !panelInteres) {
    return json({ success: false, error: 'missing_fields' }, 400);
  }

  // 3) Guardar en Firestore (ya verificado que es una persona real).
  if (!env.FIREBASE_API_KEY) {
    return json({ success: false, error: 'server_misconfigured' }, 500);
  }
  const fsUrl =
    'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID +
    '/databases/(default)/documents/solicitudesWeb?key=' +
    env.FIREBASE_API_KEY;
  const fsBody = {
    fields: {
      contacto: { stringValue: contacto },
      empresa: { stringValue: empresa },
      celular: { stringValue: celular },
      email: { stringValue: email },
      panelInteres: { stringValue: panelInteres },
      notas: { stringValue: notas },
      tipo: { stringValue: 'Prospecto' },
      estado: { stringValue: 'En contacto' },
      origen: { stringValue: 'web' },
      createdAt: { timestampValue: new Date().toISOString() },
      importado: { booleanValue: false },
    },
  };

  const fsRes = await fetch(fsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fsBody),
  });

  if (!fsRes.ok) {
    return json({ success: false, error: 'firestore_failed' }, 502);
  }

  return json({ success: true });
}

// Cualquier otro metodo (GET, etc.) no esta permitido en este endpoint.
export async function onRequestGet() {
  return json({ success: false, error: 'method_not_allowed' }, 405);
}
