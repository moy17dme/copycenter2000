"""
create_retell_agent.py
======================
Crea el agente de voz "Sofía" en Retell AI para Copy Center 2000.

PASOS:
  1. Sustituye las variables en la sección CONFIG.
  2. Ejecuta:  python scripts/create_retell_agent.py
  3. El script imprime el agent_id; guárdalo para la integración con Twilio.

NOTA: Este script NO conecta el agente a ningún número de teléfono.
      Eso se hace en un paso posterior con el agent_id obtenido aquí.
"""

import json
import urllib.request
import urllib.error

# ─────────────────────────────────────────────────────────────────────────────
#  CONFIG — Sustituye estos valores antes de ejecutar
# ─────────────────────────────────────────────────────────────────────────────

RETELL_API_KEY = "key_bb269acdc2478171822d5119a9f5"

# URLs de los endpoints desplegados en Modal (ap-xN85oNHs6EaF9LtFHmbwqB)
TOOL_URLS = {
    "search_services":      "https://alex-bomasplotan--quote-service.modal.run",
    "register_lead":        "https://alex-bomasplotan--create-or-update-lead.modal.run",
    "schedule_appointment": "https://alex-bomasplotan--schedule-appointment.modal.run",
    "update_lead_status":   "https://alex-bomasplotan--update-lead-status.modal.run",
}

# ─────────────────────────────────────────────────────────────────────────────
#  SYSTEM PROMPT — Personalidad e instrucciones de Sofía
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """
Eres Sofía, recepcionista y asistente de ventas senior de Copy Center 2000,
una imprenta en Pachuca, Hidalgo, México. Hablas en español mexicano natural,
cálido y profesional. Tu objetivo es ayudar a los clientes con sus necesidades
de impresión de forma eficiente y directa.

## TU ROL
- Recibir pedidos de impresión digital, copias, engargolados, ploteos de planos,
  escaneos, sublimación, tarjetas PVC, fotobotones y enmicados.
- Orientar al cliente sobre especificaciones técnicas y tiempos de entrega.
- Registrar los datos del cliente para dar seguimiento al pedido.
- Agendar citas para revisión de archivos pesados o recoger pedidos grandes.

## SALUDO DE INICIO
Saluda siempre con: "Buen día/tarde, habla con Copy Center 2000, le atiende Sofía.
¿En qué le puedo ayudar con sus impresiones o copias el día de hoy?"

## CONOCIMIENTO TÉCNICO
- **Impresión digital**: laser o inkjet, color o B/N, tamaños carta/oficio/doble carta.
  Papeles: Bond 75g, Opalina 115g, Couché mate/brillante.
- **Ploteo de planos**: rollos de 60, 90 o 120 cm. Ideal para constructoras y arquitectos.
- **Copias y engargolados**: engargolado de argolla metálica o plástica, pasta dura o blanda.
  Muy solicitado por escuelas, universidades y despachos.
- **Escaneos y digitalización**: hasta tamaño doble carta/A1, resolución 150–600 dpi,
  salida en PDF o JPG.
- **Menús para restaurantes**: impresión en papel couché con plastificado o enmicado.
- **Sublimación**: tazas, playeras, termos, plumas, etc.
- **Tarjetas PVC**: credenciales con o sin datos variables, porta-gafete incluido opcional.
- **Fotobotones y pines**: tamaños 3.8 cm, 5.8 cm, destapadores.

## CLIENTES PRIORITARIOS
- Constructoras (Edemtec, etc.): priorizar turno rápido para planos.
- Escuelas (primarias, secundarias, preparatorias, universidades): engargolados, copias masivas.
- Restaurantes: menús con acabado premium.
Para estos clientes, SIEMPRE verifica disponibilidad de turno rápido y ofrécela proactivamente.

## MANEJO DE OBJECIONES
- Si el cliente tiene prisa → verifica urgencia real, ofrece turno express si hay disponibilidad.
- Si el cliente no sabe el formato → guíalo con preguntas simples: "¿Es para impresión o para plottear?", "¿Lo necesita en color o en blanco y negro?".
- Si el cliente pregunta precio exacto → usa la herramienta search_services para dar cifras reales.

## USO DE HERRAMIENTAS
Invoca las herramientas en estos momentos exactos:

1. **search_services**: Cuando el cliente pregunte por precios, tipos de papel,
   tamaños disponibles o tiempos de entrega.
   Ejemplo: "¿cuánto cuesta imprimir 100 hojas a color?"

2. **register_lead**: En cuanto el cliente proporcione su nombre, teléfono o
   nombre de empresa. Registra inmediatamente para dar seguimiento.
   Ejemplo: cliente dice "soy Carlos de Constructora Edemtec, mi número es..."

3. **schedule_appointment**: Si el cliente necesita traer un archivo grande
   (más de 50 MB), requiere revisión técnica previa, o quiere coordinar la
   entrega de un pedido voluminoso.
   Ejemplo: "¿puedo pasar a dejar mis archivos para revisarlos?"

4. **update_lead_status**: Cuando durante la conversación quede claro el nivel
   de urgencia del pedido (urgente/normal) o cuando el cliente confirme que
   procederá con el pedido.
   Ejemplo: cliente confirma que lo necesita "para hoy antes de las 5"

## CIERRE DE LLAMADA
- Confirma el nombre del cliente y el pedido.
- Informa el tiempo estimado de entrega.
- Si se registró el pedido, menciona que recibirá seguimiento.
- Despídete con: "Muchas gracias por llamar a Copy Center 2000. ¡Que tenga buen día!"
""".strip()

# ─────────────────────────────────────────────────────────────────────────────
#  DEFINICIÓN DE HERRAMIENTAS (Tool Calls → Modal)
# ─────────────────────────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "custom",
        "name": "search_services",
        "description": (
            "Busca precios, especificaciones y disponibilidad de servicios de impresión. "
            "Llama cuando el cliente pregunte por precios, tipos de papel, tamaños o "
            "tiempos de entrega de cualquier servicio."
        ),
        "url": TOOL_URLS["search_services"],
        "speak_during_execution": True,
        "speak_after_execution": False,
        "execution_message_description": "Déjame revisar eso en el sistema...",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Consulta del cliente sobre servicios o precios, en lenguaje natural."
                },
                "service_type": {
                    "type": "string",
                    "description": (
                        "Tipo de servicio consultado. Valores posibles: "
                        "impresion, copias, engargolado, ploteo, escaneo, "
                        "sublimacion, pvc, fotobotones, enmicado, general"
                    )
                }
            },
            "required": ["query"]
        }
    },
    {
        "type": "custom",
        "name": "register_lead",
        "description": (
            "Registra los datos del cliente o empresa para dar seguimiento al pedido. "
            "Llama en cuanto el cliente proporcione su nombre, teléfono o empresa."
        ),
        "url": TOOL_URLS["register_lead"],
        "speak_during_execution": True,
        "speak_after_execution": False,
        "execution_message_description": "Un momento, le registro en el sistema...",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Nombre completo del cliente o contacto."
                },
                "phone": {
                    "type": "string",
                    "description": "Número de teléfono del cliente (10 dígitos)."
                },
                "company": {
                    "type": "string",
                    "description": "Nombre de la empresa u organización (opcional)."
                },
                "service_interest": {
                    "type": "string",
                    "description": "Servicio o producto que el cliente necesita."
                },
                "notes": {
                    "type": "string",
                    "description": "Notas adicionales del cliente o del pedido."
                }
            },
            "required": ["name", "phone"]
        }
    },
    {
        "type": "custom",
        "name": "schedule_appointment",
        "description": (
            "Agenda una cita para revisión técnica de archivos pesados o recoger un pedido grande. "
            "Llama cuando el cliente quiera venir a dejar archivos, revisar prueba de color o "
            "coordinar entrega de pedido voluminoso."
        ),
        "url": TOOL_URLS["schedule_appointment"],
        "speak_during_execution": True,
        "speak_after_execution": False,
        "execution_message_description": "Voy a revisar nuestra disponibilidad en agenda...",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {
                    "type": "string",
                    "description": "ID del lead registrado (obtenido de register_lead)."
                },
                "preferred_date": {
                    "type": "string",
                    "description": "Fecha preferida del cliente en formato YYYY-MM-DD."
                },
                "preferred_time": {
                    "type": "string",
                    "description": "Hora preferida en formato HH:MM (24h)."
                },
                "reason": {
                    "type": "string",
                    "description": "Motivo de la cita: revisión de archivos, entrega de pedido, cotización presencial, etc."
                },
                "phone": {
                    "type": "string",
                    "description": "Teléfono de contacto para confirmación de la cita."
                }
            },
            "required": ["reason", "phone"]
        }
    },
    {
        "type": "custom",
        "name": "update_lead_status",
        "description": (
            "Actualiza el estado y nivel de urgencia del pedido o lead durante la llamada. "
            "Llama cuando el cliente confirme que procede con el pedido, indique urgencia, "
            "o cambie sus requerimientos."
        ),
        "url": TOOL_URLS["update_lead_status"],
        "speak_during_execution": False,
        "speak_after_execution": False,
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {
                    "type": "string",
                    "description": "ID del lead a actualizar."
                },
                "status": {
                    "type": "string",
                    "description": (
                        "Nuevo estado del lead: "
                        "new, contacted, interested, urgent, quote_sent, won, lost"
                    )
                },
                "urgency": {
                    "type": "string",
                    "description": "Nivel de urgencia: low, normal, high, express"
                },
                "notes": {
                    "type": "string",
                    "description": "Observaciones adicionales sobre el cambio de estado."
                }
            },
            "required": ["lead_id", "status"]
        }
    }
]

# ─────────────────────────────────────────────────────────────────────────────
#  PASO 1 — Crear el LLM de Retell (genera llm_id)
# ─────────────────────────────────────────────────────────────────────────────

def create_retell_llm() -> str:
    """Crea el LLM con el system prompt y las herramientas. Devuelve llm_id."""
    payload = {
        "model": "claude-4.5-haiku",            # baja latencia, buen razonamiento
        "model_temperature": 0.3,             # respuestas consistentes y técnicas
        "general_prompt": SYSTEM_PROMPT,
        "general_tools": TOOLS,
        "begin_message": (
            "Buen día, habla con Copy Center 2000, le atiende Sofía. "
            "¿En qué le puedo ayudar con sus impresiones o copias el día de hoy?"
        ),
        "inactivity_messages": [
            {
                "content": "¿Me puede escuchar? ¿En qué le puedo ayudar?",
                "seconds_from_last_voiceactivity": 8
            },
            {
                "content": "Parece que perdimos la comunicación. Le dejamos la línea abierta. ¡Que tenga buen día!",
                "seconds_from_last_voiceactivity": 18
            }
        ]
    }

    url = "https://api.retellai.com/create-retell-llm"
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {RETELL_API_KEY}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            llm_id = data["llm_id"]
            print(f"  ✅  LLM creado → llm_id: {llm_id}")
            return llm_id
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        raise RuntimeError(f"Error creando LLM (HTTP {e.code}): {err}")

# ─────────────────────────────────────────────────────────────────────────────
#  PASO 2 — Crear el Agente vinculando el LLM y la voz
# ─────────────────────────────────────────────────────────────────────────────

def create_agent(llm_id: str) -> dict:
    """Crea el agente Sofía con la voz española y el llm_id dado. Devuelve el objeto agente."""
    payload = {
        "response_engine": {"type": "retell-llm", "llm_id": llm_id},
        "agent_name": "Sofia - Copy Center 2000",
        "voice_id": "cartesia-Hailey-Spanish-latin-america",   # Voz femenina español latinoamericano
        "fallback_voice_ids": ["qwen3-Sonrisa"],   # qwen3 provider (diferente a cartesia)
        "voice_speed": 1.0,
        "voice_temperature": 0.7,
        "responsiveness": 1.0,                     # máxima rapidez de respuesta
        "interruption_sensitivity": 0.8,
        "enable_backchannel": True,                # "ajá", "claro", confirmaciones naturales
        "backchannel_frequency": 0.7,
        "backchannel_words": ["ajá", "claro", "entendido", "por supuesto"],
        "language": "es-419",           # Spanish Latin America (más cercano a MX)
        "opt_out_sensitive_data_storage": False,
        "pronunciation_dictionary": [
            {"word": "B/N",        "alphabet": "ipa", "phoneme": "blanco y negro"},
            {"word": "PVC",        "alphabet": "ipa", "phoneme": "pé-vé-sé"},
            {"word": "PDF",        "alphabet": "ipa", "phoneme": "pé-dé-efe"},
            {"word": "DPI",        "alphabet": "ipa", "phoneme": "dé-pé-i"},
            {"word": "Edemtec",    "alphabet": "ipa", "phoneme": "e-dem-tec"},
        ],
        "post_call_analysis_data": [
            {
                "name": "servicio_solicitado",
                "type": "string",
                "description": "Servicio de impresión que el cliente solicitó."
            },
            {
                "name": "lead_registrado",
                "type": "boolean",
                "description": "¿Se registraron los datos del cliente en el sistema?"
            },
            {
                "name": "nivel_urgencia",
                "type": "string",
                "description": "Urgencia del pedido: low, normal, high, express."
            },
            {
                "name": "cita_agendada",
                "type": "boolean",
                "description": "¿Se agendó una cita durante esta llamada?"
            }
        ]
    }

    url = "https://api.retellai.com/create-agent"
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {RETELL_API_KEY}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return data
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        raise RuntimeError(f"Error creando agente (HTTP {e.code}): {err}")

# ─────────────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Validación básica antes de llamar a la API
    print("\n🎙️  Creando agente Sofía para Copy Center 2000...\n")

    # 1 — LLM
    print("[ PASO 1 ] Registrando LLM con system prompt y tools...")
    llm_id = create_retell_llm()

    # 2 — Agente
    print("\n[ PASO 2 ] Creando agente con voz es-MX-DaliaNeural...")
    agent = create_agent(llm_id)
    agent_id = agent["agent_id"]

    print("\n" + "═" * 60)
    print(f"  ✅  AGENTE CREADO EXITOSAMENTE")
    print(f"  agent_id : {agent_id}")
    print(f"  llm_id   : {llm_id}")
    print(f"  voz      : {agent.get('voice_id', 'es-MX-DaliaNeural')}")
    print("═" * 60)
    print(f"\n  → Usa este agent_id para vincular el número Twilio 7713531668")
    print(f"  → Guárdalo en tu .env como RETELL_AGENT_ID={agent_id}\n")

    # Guardar resultado en archivo local
    output = {
        "agent_id": agent_id,
        "llm_id": llm_id,
        "agent_name": "Sofía — Copy Center 2000",
        "voice": "es-MX-DaliaNeural",
        "modal_base": MODAL_BASE,
        "twilio_number_pending": "7713531668"
    }
    with open("scripts/retell_agent_ids.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("  📄  IDs guardados en scripts/retell_agent_ids.json")
