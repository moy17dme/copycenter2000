"""
setup_outbound_agent.py
=======================
Crea el agente Sofia Outbound en Retell AI con variables dinámicas por sector.
Ejecutar UNA SOLA VEZ: python scripts/setup_outbound_agent.py
"""
import json, urllib.request, urllib.error

RETELL_API_KEY = "key_bb269acdc2478171822d5119a9f5"

# ── System Prompt Outbound ─────────────────────────────────────────────────────

SYSTEM_PROMPT = """
Eres Sofia, agente de seguimiento comercial de Copy Center 2000,
una imprenta en Pachuca, Hidalgo, Mexico. Hablas en espanol mexicano,
calido, breve y directo. Esta es una llamada SALIENTE de seguimiento.

DATOS DEL CLIENTE (ya tienes esta informacion, no la preguntes):
- Nombre: {{nombre_cliente}}
- Empresa: {{empresa}}
- Sector: {{sector}}
- Ultimo pedido o interes: {{ultimo_pedido}}

## APERTURA OBLIGATORIA (primera linea, siempre igual)
Di exactamente: "Hola {{nombre_cliente}}, habla Sofia de Copy Center 2000.
Le llamo para dar seguimiento a su solicitud de {{ultimo_pedido}}. Tiene un minuto?"

Si dice NO o esta ocupado: "Sin problema, cuando guste nos llama al 771 353 1668.
Que tenga buen dia." → termina la llamada, marca resultado: SIN_TIEMPO

## SCRIPTS POR SECTOR

### EDUCACION (escuelas, universidades, centros de capacitacion)
Enfoque: volumen, organizacion y fechas de entrega.
Ofrecer: cuadernillos escolares, credenciales PVC, examenes, carteles para alumnos.
Argumento clave: "Manejamos entregas en cantidad con tiempo para inicio de ciclo."
Pregunta guia: "Cuantos alumnos tienen aproximadamente? Asi le doy un precio de volumen."

### ARQUITECTURA / INGENIERIA (constructoras, despachos, ingenieros)
Enfoque: precision tecnica y fidelidad de color.
Ofrecer: ploteo de planos B/N y color, renders de alta calidad, papel fotografico.
Argumento clave: "Imprimimos en rollo hasta 90 cm de ancho, ideal para planos arquitectonicos."
Pregunta guia: "Que formato manejan normalmente, A1, A0 o algun tamano especial?"

### LEGAL (abogados, notarias, despachos juridicos)
Enfoque: confidencialidad, rapidez y volumen de expedientes.
Ofrecer: copias de expedientes, documentos notariales, engargolados de presentacion.
Argumento clave: "Manejo discreto de documentos, entrega el mismo dia para urgencias."
Pregunta guia: "Manejan copias de expedientes con frecuencia o es algo eventual?"

### FOTOGRAFIA (fotografos, estudios, artistas visuales)
Enfoque: calidad artistica y sustratos premium.
Ofrecer: impresion de fotografia en gran formato, papel fotografico brillante/mate/satinado.
Argumento clave: "Imprimimos en papel fotografico de 420 pesos por metro, colores precisos."
Pregunta guia: "Que tamanos imprimen con mas frecuencia? Tenemos hasta formato panoramico."

### RESTAURANTES (cafes, fondas, cadenas)
Enfoque: estetica, durabilidad y actualizacion de menus.
Ofrecer: menus, manteles individuales, flyers promocionales, enmicado.
Argumento clave: "Menus en couche con plastificado que duran meses sin deteriorarse."
Pregunta guia: "Con que frecuencia actualizan sus menus? Hacemos redisenos rapidos."

### GENERAL (sin sector especifico)
Ofrecer el servicio relacionado con {{ultimo_pedido}}.
Preguntar necesidad actual antes de cotizar.

## FLUJO DE CONVERSACION
1. Apertura → espera respuesta
2. Si acepta: aplica script del sector, UNA pregunta a la vez
3. Si muestra interes: da precio referencia y ofrece mandar cotizacion por WhatsApp
4. Cierre siempre con: "Le mando los detalles al WhatsApp 771 353 1668, que tenga excelente dia"

## RESULTADOS A REPORTAR (solo internos, no los digas en voz alta)
Al finalizar la llamada, en tu ultimo mensaje incluye una de estas etiquetas:
RESULTADO: INTERESADO | SIN_INTERES | SIN_TIEMPO | VOLVER_LLAMAR | GANADO

## REGLAS DE VOZ
- Nunca menciones dolares, siempre pesos o solo el numero
- Nunca leas calculos, solo el total
- Dimensiones: di "por" en lugar de "x"
- Una sola pregunta por turno
""".strip()

# ── Crear LLM ──────────────────────────────────────────────────────────────────

def create_llm():
    payload = {
        "model": "claude-4.5-haiku",
        "model_temperature": 0.3,
        "general_prompt": SYSTEM_PROMPT,
        "begin_message": None,   # el begin_message lo genera dinamicamente la llamada
        "inactivity_messages": [
            {"content": "Sigue ahi? Le escucho.", "seconds_from_last_voiceactivity": 8},
            {"content": "Parece que se corto la llamada. Que tenga buen dia.", "seconds_from_last_voiceactivity": 18}
        ]
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.retellai.com/create-retell-llm",
        data=body,
        headers={"Authorization": f"Bearer {RETELL_API_KEY}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# ── Crear Agente ───────────────────────────────────────────────────────────────

def create_agent(llm_id):
    payload = {
        "response_engine": {"type": "retell-llm", "llm_id": llm_id},
        "agent_name": "Sofia Outbound - Copy Center 2000",
        "voice_id": "cartesia-Hailey-Spanish-latin-america",
        "voice_speed": 1.0,
        "voice_temperature": 0.6,
        "responsiveness": 1.0,
        "interruption_sensitivity": 0.7,
        "enable_backchannel": True,
        "backchannel_frequency": 0.5,
        "backchannel_words": ["claro", "entendido", "por supuesto"],
        "language": "es-419",
        "opt_out_sensitive_data_storage": False,
        "pronunciation_dictionary": [
            {"word": "B/N",     "alphabet": "ipa", "phoneme": "blanco y negro"},
            {"word": "PVC",     "alphabet": "ipa", "phoneme": "pe-ve-se"},
            {"word": "PDF",     "alphabet": "ipa", "phoneme": "pe-de-efe"},
        ],
        "post_call_analysis_data": [
            {"name": "resultado",         "type": "string", "description": "INTERESADO | SIN_INTERES | SIN_TIEMPO | VOLVER_LLAMAR | GANADO"},
            {"name": "necesidad_cliente", "type": "string", "description": "Resumen breve de lo que el cliente necesita o dijo."},
            {"name": "sector_confirmado", "type": "string", "description": "Sector del cliente confirmado en la conversacion."}
        ]
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.retellai.com/create-agent",
        data=body,
        headers={"Authorization": f"Bearer {RETELL_API_KEY}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"    ERROR {e.code}: {body}")
        raise

# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n Creando Sofia Outbound...\n")

    print("[1] Creando LLM...")
    llm = create_llm()
    llm_id = llm["llm_id"]
    print(f"    llm_id: {llm_id}")

    print("[2] Creando agente...")
    agent = create_agent(llm_id)
    agent_id = agent["agent_id"]
    print(f"    agent_id: {agent_id}")

    result = {"outbound_agent_id": agent_id, "outbound_llm_id": llm_id}
    with open("scripts/outbound_agent_ids.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"""
{'='*60}
  AGENTE OUTBOUND CREADO
  agent_id : {agent_id}
  llm_id   : {llm_id}
  Guardado en scripts/outbound_agent_ids.json
{'='*60}
""")
