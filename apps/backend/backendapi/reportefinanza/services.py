from datetime import datetime, timezone
from collections import defaultdict
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
import re

from core.supabase_client import supabase_admin as sb

ESTADO_PAGADO_ID = 2  # estado_pagos.id = 2 → "pagado"


def _dec(x) -> Decimal:
    try:
        return Decimal(str(x or "0"))
    except Exception:
        return Decimal("0")


def _in_range(fecha_iso: str, dfrom: Optional[str], dto: Optional[str]) -> bool:
    if not fecha_iso:
        return False

    try:
        # Normalizar el formato de fecha
        fecha_str = str(fecha_iso)

        # Si no tiene información de timezone, agregar +00:00
        if not any(tz in fecha_str for tz in ['+', '-', 'Z']):
            fecha_str += "+00:00"

        # Limpiar milisegundos y manejar Z
        fecha_str = re.sub(r'\.\d+', '', fecha_str)  # Remover milisegundos
        fecha_str = fecha_str.replace("Z", "+00:00")

        f = datetime.fromisoformat(fecha_str)

        if dfrom:
            dfrom_clean = dfrom.replace("Z", "+00:00")
            if f < datetime.fromisoformat(dfrom_clean):
                return False
        if dto:
            dto_clean = dto.replace("Z", "+00:00")
            if f > datetime.fromisoformat(dto_clean):
                return False
        return True
    except Exception as e:
        # En caso de error, no incluir el registro (comportamiento conservador)
        print(f"Error parsing date {fecha_iso}: {e}")
        return False


def _fetch_expensas(dfrom: Optional[str], dto: Optional[str], propiedad_id: Optional[int]) -> List[Dict[str, Any]]:
    q = sb.table("expensas").select("id,propiedad_id,fecha,total,fecha_vencimiento")
    if propiedad_id:
        q = q.eq("propiedad_id", int(propiedad_id))
    res = q.execute().data or []
    # Filtro por rango en Python (fecha es date, dto/dfrom pueden traer tz)
    out = []
    for r in res:
        if _in_range(str(r.get("fecha")) + "T00:00:00+00:00", dfrom, dto):
            out.append(r)
    return out


def _fetch_multas(dfrom: Optional[str], dto: Optional[str], propiedad_id: Optional[int]) -> List[Dict[str, Any]]:
    q = sb.table("multas").select("id,propiedad_id,fecha,total")
    if propiedad_id:
        q = q.eq("propiedad_id", int(propiedad_id))
    res = q.execute().data or []
    out = []
    for r in res:
        if _in_range(str(r.get("fecha")) + "T00:00:00+00:00", dfrom, dto):
            out.append(r)
    return out


def _fetch_pagos_pagados(dfrom: Optional[str], dto: Optional[str]) -> List[Dict[str, Any]]:
    # Solo pagos con estado "pagado"
    q = sb.table("pagos").select("id,fecha,monto_total,estado_pago_id,tipo_pago_id").eq("estado_pago_id",
                                                                                        ESTADO_PAGADO_ID)
    res = q.execute().data or []
    # filtro por rango sobre 'fecha' (timestamptz)
    out = []
    for r in res:
        if _in_range(str(r.get("fecha")), dfrom, dto):
            out.append(r)
    return out


def _fetch_cargos_for_pago_ids(pago_ids: List[int]) -> List[Dict[str, Any]]:
    if not pago_ids:
        return []
    # Nota: supabase limita 'in' a 1000; suficiente para nuestros rangos normales
    return sb.table("cargos").select("id,pago_id,monto,ts").in_("pago_id", pago_ids).execute().data or []


def _fetch_links_for_cargo_ids(cargo_ids: List[int]) -> Tuple[Dict[int, List[int]], Dict[int, List[int]]]:
    """
    Devuelve mapas:
      - expensas_por_cargo[cargo_id] = [expensa_id, ...]
      - multas_por_cargo[cargo_id]   = [multa_id, ...]
    """
    if not cargo_ids:
        return {}, {}
    exp_links = sb.table("cargo_expensa").select("cargo_id,expensa_id").in_("cargo_id", cargo_ids).execute().data or []
    mul_links = sb.table("cargo_multa").select("cargo_id,multa_id").in_("cargo_id", cargo_ids).execute().data or []

    exp_map: Dict[int, List[int]] = defaultdict(list)
    mul_map: Dict[int, List[int]] = defaultdict(list)
    for r in exp_links:
        exp_map[int(r["cargo_id"])].append(int(r["expensa_id"]))
    for r in mul_links:
        mul_map[int(r["cargo_id"])].append(int(r["multa_id"]))
    return exp_map, mul_map


def _group_by_month(iso_str: str) -> str:
    try:
        # Normalizar fecha antes de procesar
        fecha_str = str(iso_str)
        fecha_str = re.sub(r'\.\d+', '', fecha_str)  # Remover milisegundos
        fecha_str = fecha_str.replace("Z", "+00:00")

        dt = datetime.fromisoformat(fecha_str)
        return dt.strftime("%Y-%m")
    except Exception as e:
        print(f"Error grouping by month for {iso_str}: {e}")
        return "unknown"


def build_financial_report(
        dfrom: Optional[str],
        dto: Optional[str],
        propiedad_id: Optional[int]
) -> Dict[str, Any]:
    """
    dfrom / dto en ISO 8601 (ej: '2025-09-01T00:00:00+00:00').
    propiedad_id opcional.
    """
    # 1) Base: generados (expensas y multas)
    expensas = _fetch_expensas(dfrom, dto, propiedad_id)
    multas = _fetch_multas(dfrom, dto, propiedad_id)

    total_expensas_generadas = sum(_dec(x.get("total")) for x in expensas)
    total_multas_generadas = sum(_dec(x.get("total")) for x in multas)
    total_generado = total_expensas_generadas + total_multas_generadas

    # 2) Cobrado: pagos pagados + cargos y enlaces
    pagos = _fetch_pagos_pagados(dfrom, dto)
    pago_ids = [int(p["id"]) for p in pagos]
    cargos = _fetch_cargos_for_pago_ids(pago_ids)
    cargo_ids = [int(c["id"]) for c in cargos]
    exp_links, mul_links = _fetch_links_for_cargo_ids(cargo_ids)

    # 3) Sumas por expensa y multa (solo cargos de pagos pagados)
    cobrado_por_expensa: Dict[int, Decimal] = defaultdict(Decimal)
    cobrado_por_multa: Dict[int, Decimal] = defaultdict(Decimal)

    for c in cargos:
        cid = int(c["id"])
        monto = _dec(c.get("monto"))
        # Un cargo puede enlazar a 1 (o varios) expensas/multas: repartimos proporcionalmente si hubiera varios (caso raro)
        exps = exp_links.get(cid, [])
        muls = mul_links.get(cid, [])
        n = len(exps) + len(muls)
        if n <= 0:
            continue
        parte = (monto / n) if n > 0 else Decimal("0")
        for e_id in exps:
            cobrado_por_expensa[e_id] += parte
        for m_id in muls:
            cobrado_por_multa[m_id] += parte

    # 4) Deuda / vencido
    now_iso = datetime.now(timezone.utc).isoformat()
    deuda_expensas = Decimal("0")
    vencido_expensas = Decimal("0")
    deuda_multas = Decimal("0")

    by_prop_deuda: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"propiedad_id": None, "deuda": Decimal("0"), "vencido": Decimal("0")})

    for e in expensas:
        eid = int(e["id"])
        prop = str(e["propiedad_id"])
        total_e = _dec(e.get("total"))
        pagado_e = cobrado_por_expensa.get(eid, Decimal("0"))
        pendiente_e = max(Decimal("0"), total_e - pagado_e)
        deuda_expensas += pendiente_e

        # vencido si tiene fecha_vencimiento y ya pasó
        fv = e.get("fecha_vencimiento")
        is_vencido = False
        if fv and pendiente_e > 0:
            # Comparar fecha_vencimiento con fecha actual
            try:
                fv_str = str(fv) + "T23:59:59+00:00"  # Final del día de vencimiento
                if _in_range(fv_str, None, now_iso):
                    is_vencido = True
                    vencido_expensas += pendiente_e
            except Exception as e:
                print(f"Error checking vencimiento for expensa {eid}: {e}")

        by_prop_deuda[prop]["propiedad_id"] = int(prop)
        by_prop_deuda[prop]["deuda"] += pendiente_e
        if is_vencido:
            by_prop_deuda[prop]["vencido"] += pendiente_e

    for m in multas:
        mid = int(m["id"])
        prop = str(m["propiedad_id"])
        total_m = _dec(m.get("total"))
        pagado_m = cobrado_por_multa.get(mid, Decimal("0"))
        pendiente_m = max(Decimal("0"), total_m - pagado_m)
        deuda_multas += pendiente_m

        by_prop_deuda[prop]["propiedad_id"] = int(prop)
        by_prop_deuda[prop]["deuda"] += pendiente_m
        # (si quisieras "vencido" para multas, añade columna y lógica similar)

    total_cobrado = sum(_dec(p.get("monto_total")) for p in pagos)  # total pago global
    total_deuda = deuda_expensas + deuda_multas

    # 5) Serie temporal (por mes) de: generados vs cobrados
    series: Dict[str, Dict[str, Decimal]] = defaultdict(lambda: {"generado": Decimal("0"), "cobrado": Decimal("0")})
    # generados (expensas, multas) → usamos 'fecha'
    for e in expensas:
        key = _group_by_month(str(e["fecha"]) + "T00:00:00+00:00")
        if key != "unknown":
            series[key]["generado"] += _dec(e["total"])
    for m in multas:
        key = _group_by_month(str(m["fecha"]) + "T00:00:00+00:00")
        if key != "unknown":
            series[key]["generado"] += _dec(m["total"])
    # cobrado → usamos pagos.fecha
    for p in pagos:
        key = _group_by_month(str(p["fecha"]))
        if key != "unknown":
            series[key]["cobrado"] += _dec(p["monto_total"])

    # 6) Top deudores (propiedades)
    top_deudores = sorted(
        [{"propiedad_id": v["propiedad_id"], "deuda": str(v["deuda"]), "vencido": str(v["vencido"])} for v in
         by_prop_deuda.values()],
        key=lambda x: (Decimal(x["deuda"]), Decimal(x["vencido"])),
        reverse=True
    )

    # 7) Resumen final
    resumen = {
        "filtros": {
            "desde": dfrom,
            "hasta": dto,
            "propiedad_id": propiedad_id,
        },
        "totales": {
            "generado": str(total_generado),
            "generado_expensas": str(total_expensas_generadas),
            "generado_multas": str(total_multas_generadas),
            "cobrado": str(total_cobrado),
            "deuda": str(total_deuda),
            "deuda_expensas": str(deuda_expensas),
            "deuda_multas": str(deuda_multas),
            "vencido_expensas": str(vencido_expensas),
        },
        "series_mensuales": [
            {"mes": k, "generado": str(v["generado"]), "cobrado": str(v["cobrado"])}
            for k, v in sorted(series.items())
        ],
        "top_deudores": top_deudores[:10],
        "detalle": {
            "expensas": [{
                "id": int(e["id"]),
                "propiedad_id": int(e["propiedad_id"]),
                "fecha": str(e["fecha"]),
                "total": str(_dec(e["total"])),
                "pagado": str(cobrado_por_expensa.get(int(e["id"]), Decimal("0"))),
                "pendiente": str(
                    max(Decimal("0"), _dec(e["total"]) - cobrado_por_expensa.get(int(e["id"]), Decimal("0")))),
                "fecha_vencimiento": e.get("fecha_vencimiento"),
            } for e in expensas],
            "multas": [{
                "id": int(m["id"]),
                "propiedad_id": int(m["propiedad_id"]),
                "fecha": str(m["fecha"]),
                "total": str(_dec(m["total"])),
                "pagado": str(cobrado_por_multa.get(int(m["id"]), Decimal("0"))),
                "pendiente": str(
                    max(Decimal("0"), _dec(m["total"]) - cobrado_por_multa.get(int(m["id"]), Decimal("0")))),
            } for m in multas],
            "pagos": [{
                "id": int(p["id"]),
                "fecha": str(p["fecha"]),
                "monto_total": str(_dec(p["monto_total"])),
                "estado_pago_id": int(p["estado_pago_id"]),
                "tipo_pago_id": int(p["tipo_pago_id"]) if p.get("tipo_pago_id") is not None else None,
            } for p in pagos],
        }
    }
    return resumen