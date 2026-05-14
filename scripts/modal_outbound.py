"""
modal_outbound.py — Cron de llamadas salientes para Copy Center 2000

DESPLEGAR:
    modal deploy scripts/modal_outbound.py

TRIGGER MANUAL (corre en la nube, usa los secrets de Modal):
    modal run scripts/modal_outbound.py

TRIGGER DEMO (fuerza la ejecución ignorando horario):
    modal run scripts/modal_outbound.py -- --force
"""
import modal
import json
import urllib.request
import urllib.error

image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]", "anthropic", "tzdata")
)
app = modal.App("copycenter2000-outbound", image=image)

retell_secret  = modal.Secret.from_name("retell-copycenter")
notion_secret  = modal.Secret.from_name("notion-copycenter")
anthropic_secret = modal.Secret.from_name("anthropic-copycenter")

OUTBOUND_AGENT_ID = "agent_9fee2ae148343e671f85135072"
NOTION_PROSPECTS_DB = "35b9c196-0038-81d6-b3bd-dfc88d7285c7"
FROM_PHONE = "+527713531668"   # número Twilio conectado a Retell


# ── Helpers ────────────────────────────────────────────────────────────────────

def notion_request(path, method="GET", body=None, token=""):
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    url = f"https://api.notion.com/v1/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def retell_request(path, method="POST", body=None, api_key=""):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"https://api.retellai.com{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def is_business_hours():
    """Lunes-Viernes 8:00-19:30, Sábados 9:00-15:00, hora Ciudad de México."""
    from zoneinfo import ZoneInfo
    from datetime import datetime
    now = datetime.now(ZoneInfo("America/Mexico_City"))
    wd = now.weekday()   # 0=lunes … 6=domingo
    t = now.hour * 60 + now.minute

    if wd <= 4:   # L-V
        return 8 * 60 <= t <= 19 * 60 + 30
    elif wd == 5:  # Sábado
        return 9 * 60 <= t <= 15 * 60
    return False


def get_pending_prospects(token):
    """Trae hasta 20 prospectos con Estatus = 'Pendiente de llamar'."""
    body = {
        "filter": {
            "property": "Estatus",
            "select": {"equals": "Pendiente de llamar"},
        },
        "page_size": 20,
    }
    result = notion_request(
        f"databases/{NOTION_PROSPECTS_DB}/query",
        method="POST", body=body, token=token
    )
    return result.get("results", [])


def parse_prospect(page):
    props = page.get("properties", {})

    def title(p):
        items = props.get(p, {}).get("title", [])
        return items[0]["plain_text"] if items else ""

    def rich(p):
        items = props.get(p, {}).get("rich_text", [])
        return items[0]["plain_text"] if items else ""

    def select(p):
        s = props.get(p, {}).get("select")
        return s["name"] if s else ""

    def phone(p):
        return props.get(p, {}).get("phone_number") or ""

    return {
        "page_id":       page["id"],
        "nombre":        title("Nombre"),
        "empresa":       rich("Empresa"),
        "telefono":      phone("Telefono"),
        "sector":        select("Sector"),
        "ultimo_pedido": rich("Ultimo pedido"),
    }


def update_prospect_status(page_id, estatus, notes="", call_id="", token=""):
    from datetime import datetime, timezone
    props = {
        "Estatus": {"select": {"name": estatus}},
    }
    if notes:
        props["Notas"] = {"rich_text": [{"text": {"content": notes[:2000]}}]}
    if call_id:
        props["call_id"] = {"rich_text": [{"text": {"content": call_id}}]}
    if estatus == "Contactado":
        props["Fecha llamada"] = {"date": {"start": datetime.now(timezone.utc).strftime("%Y-%m-%d")}}

    notion_request(
        f"pages/{page_id}",
        method="PATCH",
        body={"properties": props},
        token=token,
    )


def make_outbound_call(prospect, api_key):
    """Lanza la llamada outbound via Retell."""
    telefono = prospect["telefono"].replace(" ", "").replace("-", "")
    if not telefono.startswith("+"):
        telefono = "+52" + telefono.lstrip("0")

    body = {
        "from_number": FROM_PHONE,
        "to_number":   telefono,
        "agent_id":    OUTBOUND_AGENT_ID,
        "retell_llm_dynamic_variables": {
            "nombre_cliente": prospect["nombre"],
            "empresa":        prospect["empresa"] or "su empresa",
            "sector":         prospect["sector"] or "General",
            "ultimo_pedido":  prospect["ultimo_pedido"] or "impresiones",
        },
    }
    return retell_request("/v2/create-phone-call", body=body, api_key=api_key)


def analyze_call_with_claude(call_data, anthropic_key):
    """Usa Claude para resumir el resultado de la llamada."""
    import anthropic

    transcript = call_data.get("transcript", "Sin transcripción.")
    analysis   = call_data.get("call_analysis", {}) or {}
    result_tag = analysis.get("resultado", "")

    prompt = f"""Eres asistente de Copy Center 2000. Analiza esta llamada de seguimiento comercial.

RESULTADO REPORTADO POR SOFIA: {result_tag or 'No especificado'}

TRANSCRIPCIÓN:
{transcript[:3000]}

Responde en JSON con exactamente estas claves:
{{
  "resultado": "INTERESADO|SIN_INTERES|SIN_TIEMPO|VOLVER_LLAMAR|GANADO",
  "resumen": "2-3 oraciones de lo que pasó y qué necesita el cliente",
  "siguiente_accion": "qué debe hacer el equipo de ventas"
}}"""

    client = anthropic.Anthropic(api_key=anthropic_key)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # Extraer JSON del texto
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    return {"resultado": result_tag or "SIN_INTERES", "resumen": text, "siguiente_accion": "Revisar manualmente"}


def get_call_details(call_id, api_key):
    """Consulta los detalles de una llamada en Retell."""
    return retell_request(f"/v2/get-call/{call_id}", method="GET", api_key=api_key)


RESULTADO_TO_ESTATUS = {
    "INTERESADO":    "Contactado",
    "GANADO":        "Ganado",
    "SIN_INTERES":   "Sin interes",
    "SIN_TIEMPO":    "Pendiente de llamar",   # reagendar
    "VOLVER_LLAMAR": "Pendiente de llamar",
}


# ── Función principal ──────────────────────────────────────────────────────────

def run_outbound_cycle(retell_key, notion_token, anthropic_key, dry_run=False, force=False):
    import time

    if not force and not is_business_hours():
        print("[outbound] Fuera de horario de negocio. Abortando.")
        return {"llamadas": 0, "motivo": "fuera de horario"}

    print("[outbound] Buscando prospectos pendientes...")
    prospects = get_pending_prospects(notion_token)
    print(f"[outbound] {len(prospects)} prospecto(s) encontrado(s).")

    resultados = []
    for raw in prospects:
        p = parse_prospect(raw)

        if not p["telefono"]:
            print(f"[outbound] {p['nombre']}: sin teléfono, saltando.")
            continue

        print(f"[outbound] Llamando a {p['nombre']} ({p['telefono']})...")

        if dry_run:
            print(f"  DRY RUN — no se realizó la llamada")
            resultados.append({"nombre": p["nombre"], "accion": "dry_run"})
            continue

        # 1. Marcar como "en curso" antes de llamar
        update_prospect_status(p["page_id"], "Llamada en curso", token=notion_token)

        # 2. Lanzar llamada
        try:
            call = make_outbound_call(p, retell_key)
            call_id = call.get("call_id", "")
            print(f"  call_id: {call_id}")
            update_prospect_status(p["page_id"], "Llamada en curso", call_id=call_id, token=notion_token)
        except Exception as e:
            print(f"  ERROR al llamar: {e}")
            update_prospect_status(p["page_id"], "Pendiente de llamar",
                                   notes=f"Error al marcar llamada: {e}", token=notion_token)
            resultados.append({"nombre": p["nombre"], "error": str(e)})
            continue

        # 3. Esperar a que termine la llamada (poll hasta 3 min)
        call_data = {}
        for _ in range(18):          # 18 × 10 s = 3 min
            time.sleep(10)
            try:
                call_data = get_call_details(call_id, retell_key)
                if call_data.get("call_status") in ("ended", "error"):
                    break
            except Exception:
                pass

        # 4. Analizar con Claude
        try:
            analysis = analyze_call_with_claude(call_data, anthropic_key)
        except Exception as e:
            print(f"  ERROR en análisis Claude: {e}")
            analysis = {"resultado": "SIN_INTERES", "resumen": "Error de análisis", "siguiente_accion": "Revisar"}

        # 5. Actualizar Notion
        nuevo_estatus = RESULTADO_TO_ESTATUS.get(analysis["resultado"], "Contactado")
        notas = f"{analysis['resumen']}\nSiguiente acción: {analysis['siguiente_accion']}"
        update_prospect_status(p["page_id"], nuevo_estatus, notes=notas, call_id=call_id, token=notion_token)

        print(f"  Resultado: {analysis['resultado']} → Estatus: {nuevo_estatus}")
        resultados.append({"nombre": p["nombre"], "resultado": analysis["resultado"], "call_id": call_id})

    return {"llamadas": len(resultados), "detalle": resultados}


# ── Cron (cada hora) ───────────────────────────────────────────────────────────

@app.function(
    schedule=modal.Period(hours=1),
    secrets=[retell_secret, notion_secret, anthropic_secret],
)
def cron_outbound():
    import os
    retell_key    = os.environ["RETELL_API_KEY"]
    notion_token  = os.environ["NOTION_TOKEN"]
    anthropic_key = os.environ["ANTHROPIC_API_KEY"]

    result = run_outbound_cycle(retell_key, notion_token, anthropic_key)
    print(f"[cron] Ciclo completado: {result}")


# ── Trigger manual ─────────────────────────────────────────────────────────────

@app.function(secrets=[retell_secret, notion_secret, anthropic_secret])
@modal.fastapi_endpoint(method="POST")
def trigger_outbound(data: dict = {}):
    import os
    retell_key    = os.environ["RETELL_API_KEY"]
    notion_token  = os.environ["NOTION_TOKEN"]
    anthropic_key = os.environ["ANTHROPIC_API_KEY"]

    dry_run = data.get("dry_run", False)
    force   = data.get("force", False)
    result  = run_outbound_cycle(retell_key, notion_token, anthropic_key, dry_run=dry_run, force=force)
    return result


# ── Función remota para trigger manual ────────────────────────────────────────

@app.function(secrets=[retell_secret, notion_secret, anthropic_secret])
def run_remote(force: bool = False, dry_run: bool = False):
    """Corre el ciclo outbound en la nube (con acceso a secrets de Modal)."""
    import os
    retell_key    = os.environ["RETELL_API_KEY"]
    notion_token  = os.environ["NOTION_TOKEN"]
    anthropic_key = os.environ["ANTHROPIC_API_KEY"]
    return run_outbound_cycle(retell_key, notion_token, anthropic_key, dry_run=dry_run, force=force)


# ── Entrypoint local (modal run) ───────────────────────────────────────────────

@app.local_entrypoint()
def main(force: bool = False, dry_run: bool = False):
    """
    Dispara el worker en la nube usando los secrets de Modal.

    Uso normal   : modal run scripts/modal_outbound.py
    Demo (forzar): modal run scripts/modal_outbound.py -- --force
    Dry run      : modal run scripts/modal_outbound.py -- --dry-run
    """
    print("\n=== DISPARO MANUAL OUTBOUND — Copy Center 2000 ===")
    if force:
        print("  Modo FORCE activado: se ignora el horario de negocio")
    if dry_run:
        print("  Modo DRY-RUN: no se realizarán llamadas reales")
    print()

    result = run_remote.remote(force=force, dry_run=dry_run)
    print(json.dumps(result, indent=2, ensure_ascii=False))
