"""
modal_app.py — Backend de voz para Copy Center 2000
Desplegar: modal deploy scripts/modal_app.py
"""
import modal
import json
import urllib.request
import urllib.error

image = modal.Image.debian_slim().pip_install("fastapi[standard]")
app = modal.App("copycenter2000-voice-agent", image=image)

SUPABASE_URL = "https://zdebbsyuoqsttqfwvxlg.supabase.co"
SUPABASE_KEY = "sb_publishable_zWpiQf_AvzeA3fpq8V0OBw_l8X7l6v7"
NOTION_DB_ID = "8b234fe5-9737-493a-ac33-d334209de170"

notion_secret = modal.Secret.from_name("notion-copycenter")


# ── Helpers ────────────────────────────────────────────────────────────────────

def supabase_request(path, method="GET", body=None):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()}"




def parse_notion_page(page):
    """Extrae los campos relevantes de un resultado de Notion."""
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

    def date(p):
        d = props.get(p, {}).get("date")
        return d["start"] if d else ""

    def number(p):
        return props.get(p, {}).get("number")

    return {
        "nombre":         title("Nombre"),
        "telefono":       phone("Teléfono"),
        "estado":         select("Estado"),
        "servicios":      rich("Servicios"),
        "fecha_entrega":  date("Fecha"),
        "total":          number("Total estimado"),
        "metodo_pago":    select("Método de pago"),
        "notas":          rich("Notas"),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.function()
@modal.fastapi_endpoint(method="GET")
def health():
    return {"status": "ok", "service": "copycenter2000-voice-agent"}


@app.function(secrets=[notion_secret])
@modal.fastapi_endpoint(method="POST")
def check_order_status(data: dict):
    """
    Consulta el estado de pedidos en Notion buscando por nombre del cliente.
    Ignora acentos y mayúsculas para mayor tolerancia con speech-to-text.
    """
    import os, unicodedata
    token = os.environ["NOTION_TOKEN"]

    print(f"[check_order_status] data recibida: {data}")

    # Retell manda los parámetros dentro de 'args'; curl directo los manda en raíz
    args = data.get("args") or data
    nombre = (args.get("nombre") or "").strip()

    if not nombre:
        print("[check_order_status] ERROR: nombre vacío")
        return {
            "encontrado": False,
            "mensaje": "Necesito el nombre del cliente para buscar el pedido.",
        }

    def normalizar(texto):
        return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower()

    busqueda = normalizar(nombre)
    print(f"[check_order_status] buscando: '{busqueda}'")

    # Traer todos los pedidos y filtrar en Python (tolerante a acentos)
    body = json.dumps({"page_size": 100}).encode()
    req = urllib.request.Request(
        f"https://api.notion.com/v1/databases/{NOTION_DB_ID}/query",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            all_pages = json.loads(resp.read()).get("results", [])
        print(f"[check_order_status] total páginas obtenidas: {len(all_pages)}")
    except urllib.error.HTTPError as e:
        print(f"[check_order_status] HTTPError: {e.code} {e.read().decode()}")
        return {"encontrado": False, "mensaje": f"Error al consultar Notion: {e.code}"}
    except Exception as e:
        print(f"[check_order_status] Exception: {type(e).__name__}: {e}")
        return {"encontrado": False, "mensaje": f"Error de conexion: {type(e).__name__}"}

    nombres_en_db = []
    for p in all_pages:
        titulo = (p["properties"].get("Nombre", {}).get("title") or [{}])
        nombre_pag = titulo[0].get("plain_text", "") if titulo else ""
        nombres_en_db.append(nombre_pag)

    print(f"[check_order_status] nombres en DB: {nombres_en_db}")

    coincidencias = [
        p for p in all_pages
        if busqueda in normalizar(
            (p["properties"].get("Nombre", {}).get("title") or [{}])[0].get("plain_text", "")
            if (p["properties"].get("Nombre", {}).get("title") or [{}]) else ""
        )
    ]

    print(f"[check_order_status] coincidencias: {len(coincidencias)}")

    if not coincidencias:
        return {
            "encontrado": False,
            "mensaje": "No encontre ningun pedido con ese nombre.",
        }

    pedidos = [parse_notion_page(p) for p in coincidencias[:3]]
    return {
        "encontrado": True,
        "total": len(coincidencias),
        "pedidos": pedidos,
    }


@app.function()
@modal.fastapi_endpoint(method="POST")
def quote_service(data: dict):
    """Busca precios y disponibilidad de servicios (fallback para servicios sin precio fijo)."""
    args = data.get("args") or data
    query        = args.get("query", "")
    service_type = args.get("service_type", "general")

    # Precios especiales sin tabla fija
    PRICES = {
        "sublimacion": {
            "taza":           "de 120 a 180 pesos dependiendo el modelo",
            "playera":        "de 180 a 280 pesos dependiendo la talla",
            "termo":          "de 200 a 320 pesos dependiendo el modelo",
            "pluma":          "de 60 a 90 pesos",
            "mouse pad":      "de 120 a 160 pesos",
        },
        "pvc": {
            "credencial":     "de 25 a 45 pesos por pieza segun cantidad y lados",
        },
        "fotobotones": {
            "pin 3.8cm":      "de 18 a 25 pesos por pieza",
            "pin 5.8cm":      "de 22 a 32 pesos por pieza",
            "destapador":     "de 30 a 45 pesos por pieza",
        },
        "enmicado": {
            "carta":          "de 8 a 12 pesos por pieza",
            "oficio":         "de 10 a 15 pesos por pieza",
            "doble carta":    "de 15 a 22 pesos por pieza",
        },
    }

    q = query.lower()
    for category, items in PRICES.items():
        if category in q or category in service_type:
            for keyword, price in items.items():
                if keyword in q:
                    return {"servicio": keyword, "precio": price, "nota": "precio aproximado, confirmar en sucursal"}
            # Devuelve toda la categoría si no hay keyword específico
            return {"categoria": category, "precios": items}

    return {
        "mensaje": "Para ese servicio te recomendamos cotizar directamente al WhatsApp 77 13 53 16 68.",
        "whatsapp": "7713531668",
    }


@app.function()
@modal.fastapi_endpoint(method="POST")
def create_or_update_lead(data: dict):
    """Registra o actualiza los datos del cliente en Supabase."""
    args = data.get("args") or data
    name             = args.get("name", "")
    phone            = args.get("phone", "")
    company          = args.get("company", "")
    service_interest = args.get("service_interest", "")
    notes            = args.get("notes", "")

    if not name or not phone:
        return {"ok": False, "error": "name y phone son requeridos"}

    # Buscar si ya existe
    search, _ = supabase_request(f"leads?phone=eq.{phone}&select=id,name,phone")
    existing = search[0] if search else None

    payload = {
        "name":             name,
        "phone":            phone,
        "company":          company,
        "service_interest": service_interest,
        "notes":            notes,
        "status":           "new",
    }

    if existing:
        lead_id = existing["id"]
        result, err = supabase_request(f"leads?id=eq.{lead_id}", method="PATCH", body=payload)
        if err:
            return {"ok": False, "error": err}
        return {"ok": True, "lead_id": lead_id, "action": "updated"}
    else:
        result, err = supabase_request("leads", method="POST", body=payload)
        if err:
            return {"ok": False, "error": err}
        lead_id = result[0]["id"] if result else None
        return {"ok": True, "lead_id": lead_id, "action": "created"}


@app.function()
@modal.fastapi_endpoint(method="POST")
def schedule_appointment(data: dict):
    """Agenda una cita en Supabase."""
    args = data.get("args") or data
    lead_id        = args.get("lead_id", "")
    preferred_date = args.get("preferred_date", "")
    preferred_time = args.get("preferred_time", "")
    reason         = args.get("reason", "")
    phone          = args.get("phone", "")

    payload = {
        "lead_id":        lead_id or None,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "reason":         reason,
        "phone":          phone,
        "status":         "pending",
    }

    result, err = supabase_request("appointments", method="POST", body=payload)
    if err:
        return {"ok": False, "error": err}

    appt_id = result[0]["id"] if result else None
    return {
        "ok": True,
        "appointment_id": appt_id,
        "message": f"Cita agendada para el {preferred_date} a las {preferred_time}.",
    }


@app.function()
@modal.fastapi_endpoint(method="POST")
def update_lead_status(data: dict):
    """Actualiza el estado y urgencia de un lead en Supabase."""
    args = data.get("args") or data
    lead_id = args.get("lead_id", "")
    status  = args.get("status", "")
    urgency = args.get("urgency", "normal")
    notes   = args.get("notes", "")

    if not lead_id or not status:
        return {"ok": False, "error": "lead_id y status son requeridos"}

    payload = {"status": status, "urgency": urgency}
    if notes:
        payload["notes"] = notes

    result, err = supabase_request(f"leads?id=eq.{lead_id}", method="PATCH", body=payload)
    if err:
        return {"ok": False, "error": err}

    return {"ok": True, "lead_id": lead_id, "status": status, "urgency": urgency}
