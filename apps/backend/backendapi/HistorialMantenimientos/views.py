from __future__ import annotations

import json
from datetime import date
from typing import Any, Dict, List, Optional

from django.db import connection
from django.utils.dateparse import parse_date

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status


def _dictfetchall(cursor) -> List[Dict[str, Any]]:
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _parse_costos_field(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    for r in rows:
        c = r.get("costos")
        if isinstance(c, str):
            try:
                r["costos"] = json.loads(c)
            except Exception:
                r["costos"] = []
        elif c is None:
            r["costos"] = []
    return rows


def _to_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    try:
        return int(value)
    except ValueError:
        return None


BASE_SELECT = """
SELECT
  ot.id,
  ot.descripcion,
  ot.costo,
  ot.fecha_programada,
  ot.tipo,

  -- IDs originales por si se necesitan
  ot.catalogo_id,
  ot.creado_por_id,
  ot.ordenado_a_id,
  ot.estado_trabajo_id,
  ot.hora_id,

  -- Valores resueltos por FK (sin user_metadata; usar raw_user_meta_data o email)
  c.nombre AS catalogo_nombre,
  COALESCE(u1.raw_user_meta_data ->> 'full_name', u1.raw_user_meta_data ->> 'name', u1.email) AS creado_por,
  COALESCE(u2.raw_user_meta_data ->> 'full_name', u2.raw_user_meta_data ->> 'name', u2.email) AS ordenado_a,
  et.nombre AS estado_trabajo,
  h.valor AS hora_valor,

  -- Costos asociados como arreglo JSON
  COALESCE(
    json_agg(
      jsonb_build_object(
        'id', ct.id,
        'material', ct.material,
        'preciomaterial', ct.preciomaterial,
        'preciomanoobra', ct.preciomanoobra,
        'horas_trabajadas', ct.horas_trabajadas,
        'costo_total', ct.costo_total
      )
      ORDER BY ct.id
    ) FILTER (WHERE ct.id IS NOT NULL),
    '[]'::json
  ) AS costos
FROM public.orden_trabajo ot
LEFT JOIN public.catalogo c ON c.id = ot.catalogo_id
LEFT JOIN auth.users u1 ON u1.id = ot.creado_por_id
LEFT JOIN auth.users u2 ON u2.id = ot.ordenado_a_id
LEFT JOIN public.estado_trabajo et ON et.id = ot.estado_trabajo_id
LEFT JOIN public.hora h ON h.id = ot.hora_id
LEFT JOIN public.costotrabajo ct ON ct.id_orden_trabajo = ot.id
"""


class HistorialMantenimientoList(APIView):
    # Público: sin autenticación
    permission_classes = [AllowAny]

    def get(self, request):
        estado_id = _to_int(request.query_params.get("estado_id"))
        catalogo_id = _to_int(request.query_params.get("catalogo_id"))
        fecha_desde_str: Optional[str] = request.query_params.get("fecha_desde")
        fecha_hasta_str: Optional[str] = request.query_params.get("fecha_hasta")
        search: Optional[str] = (request.query_params.get("search") or "").strip() or None

        fecha_desde: Optional[date] = parse_date(fecha_desde_str) if fecha_desde_str else None
        fecha_hasta: Optional[date] = parse_date(fecha_hasta_str) if fecha_hasta_str else None

        sql = [BASE_SELECT, "WHERE 1=1"]
        params: List[Any] = []

        if estado_id is not None:
            sql.append("AND ot.estado_trabajo_id = %s")
            params.append(estado_id)
        if catalogo_id is not None:
            sql.append("AND ot.catalogo_id = %s")
            params.append(catalogo_id)
        if fecha_desde is not None:
            sql.append("AND ot.fecha_programada >= %s")
            params.append(fecha_desde)
        if fecha_hasta is not None:
            sql.append("AND ot.fecha_programada <= %s")
            params.append(fecha_hasta)
        if search:
            like = f"%{search}%"
            sql.append("""AND (
                ot.descripcion ILIKE %s
                OR c.nombre ILIKE %s
                OR COALESCE(u1.raw_user_meta_data ->> 'full_name', u1.raw_user_meta_data ->> 'name', u1.email) ILIKE %s
                OR COALESCE(u2.raw_user_meta_data ->> 'full_name', u2.raw_user_meta_data ->> 'name', u2.email) ILIKE %s
            )""")
            params.extend([like, like, like, like])

        sql.append("""
        GROUP BY
          ot.id, c.nombre, u1.id, u2.id, et.nombre, h.valor
        ORDER BY
          ot.fecha_programada DESC NULLS LAST, ot.id DESC
        """)

        query = "\n".join(sql)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = _dictfetchall(cursor)

        rows = _parse_costos_field(rows)
        return Response(rows, status=status.HTTP_200_OK)


class HistorialMantenimientoDetail(APIView):
    # Público: sin autenticación
    permission_classes = [AllowAny]

    def get(self, request, orden_id: int):
        query = f"""
        {BASE_SELECT}
        WHERE ot.id = %s
        GROUP BY
          ot.id, c.nombre, u1.id, u2.id, et.nombre, h.valor
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [orden_id])
            row = cursor.fetchone()
            if not row:
                return Response({"detail": "Orden de trabajo no encontrada"}, status=status.HTTP_404_NOT_FOUND)
            cols = [col[0] for col in cursor.description]
            data = dict(zip(cols, row))

        data = _parse_costos_field([data])[0]
        return Response(data, status=status.HTTP_200_OK)