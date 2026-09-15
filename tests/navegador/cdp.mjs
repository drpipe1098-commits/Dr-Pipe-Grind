/**
 * POSTULA — Cliente mínimo del protocolo de Chrome (CDP).
 *
 * Permite manejar un Chromium real desde Node sin instalar ninguna
 * dependencia: Node 22 trae WebSocket nativo. Así las pruebas de navegador
 * respetan la regla del proyecto de no tener dependencias.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const CANDIDATOS = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium'
].filter(Boolean);

export function buscarNavegador() {
  // Si el entorno fija POSTULA_CHROME, esa ruta manda: una ruta explícita
  // que no existe debe fallar, no caer silenciosamente en otro navegador.
  if (process.env.POSTULA_CHROME) {
    return existsSync(process.env.POSTULA_CHROME) ? process.env.POSTULA_CHROME : null;
  }
  const directo = CANDIDATOS.find((ruta) => existsSync(ruta));
  if (directo) return directo;
  // Rutas con comodín: /opt/pw-browsers/chromium-*/chrome-linux/chrome
  try {
    const base = '/opt/pw-browsers';
    const carpeta = readdirSync(base).find((n) => n.startsWith('chromium-'));
    if (carpeta) {
      const ruta = `${base}/${carpeta}/chrome-linux/chrome`;
      if (existsSync(ruta)) return ruta;
    }
  } catch { /* sin navegador */ }
  return null;
}

function esperar(ms) {
  return new Promise((listo) => setTimeout(listo, ms));
}

async function puntoDeEntrada(puerto, intentos = 60) {
  for (let i = 0; i < intentos; i += 1) {
    try {
      const respuesta = await fetch(`http://127.0.0.1:${puerto}/json/list`);
      const objetivos = await respuesta.json();
      const pagina = objetivos.find((o) => o.type === 'page' && o.webSocketDebuggerUrl);
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch { /* todavía no levanta */ }
    await esperar(250);
  }
  throw new Error('El navegador no expuso su punto de depuración a tiempo.');
}

export async function abrirNavegador() {
  const binario = buscarNavegador();
  if (!binario) return null;

  const puerto = 9500 + Math.floor(Math.random() * 400);
  const proceso = spawn(binario, [
    '--headless=new',
    `--remote-debugging-port=${puerto}`,
    '--remote-allow-origins=*',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--no-first-run',
    '--user-data-dir=/tmp/postula-chrome-pruebas',
    'about:blank'
  ], { stdio: 'ignore' });

  const url = await puntoDeEntrada(puerto);
  const socket = new WebSocket(url);
  await new Promise((listo, falla) => {
    socket.onopen = listo;
    socket.onerror = () => falla(new Error('No se pudo conectar al navegador.'));
  });

  let siguiente = 0;
  const pendientes = new Map();
  const oyentes = [];

  socket.onmessage = (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id !== undefined) {
      const espera = pendientes.get(mensaje.id);
      if (!espera) return;
      pendientes.delete(mensaje.id);
      if (mensaje.error) espera.falla(new Error(mensaje.error.message));
      else espera.listo(mensaje.result);
      return;
    }
    oyentes.forEach((oyente) => oyente(mensaje));
  };

  function enviar(metodo, params = {}) {
    siguiente += 1;
    const id = siguiente;
    socket.send(JSON.stringify({ id, method: metodo, params }));
    return new Promise((listo, falla) => {
      pendientes.set(id, { listo, falla });
      setTimeout(() => {
        if (pendientes.delete(id)) falla(new Error(`Tiempo agotado en ${metodo}`));
      }, 20000);
    });
  }

  return {
    binario,
    enviar,
    alRecibir(oyente) { oyentes.push(oyente); },
    esperarEvento(nombre, tiempo = 15000) {
      return new Promise((listo, falla) => {
        const reloj = setTimeout(() => falla(new Error(`No llegó el evento ${nombre}`)), tiempo);
        oyentes.push(function propio(mensaje) {
          if (mensaje.method !== nombre) return;
          clearTimeout(reloj);
          listo(mensaje.params);
        });
      });
    },
    async cerrar() {
      try { socket.close(); } catch { /* ya cerrado */ }
      proceso.kill('SIGKILL');
      await esperar(120);
    }
  };
}
