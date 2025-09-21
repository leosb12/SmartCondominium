from functools import lru_cache
from decimal import Decimal
from typing import Dict, Optional

from .models import AreaSocial

CHURRASQUERA_ID = 1
PISCINA_ID = 2

ID_TO_DEFAULT_NAME = {
    CHURRASQUERA_ID: "Churrasquera",
    PISCINA_ID: "Piscina",
}


@lru_cache(maxsize=1)
def get_areas_map() -> Dict[int, AreaSocial]:
    return {a.id: a for a in AreaSocial.objects.all()}


def get_area_type_name(area_id: int) -> str:
    area = get_areas_map().get(area_id)
    if area is not None and area.nombre:
        return area.nombre
    return ID_TO_DEFAULT_NAME.get(area_id, f"Área {area_id}")


def get_hourly_price(area_id: int) -> Optional[Decimal]:
    area = get_areas_map().get(area_id)
    return area.precioxhora if area is not None else None


def get_known_types_with_prices():
    return [
        {
            "id": CHURRASQUERA_ID,
            "nombre": get_area_type_name(CHURRASQUERA_ID),
            "precioxhora": get_hourly_price(CHURRASQUERA_ID),
        },
        {
            "id": PISCINA_ID,
            "nombre": get_area_type_name(PISCINA_ID),
            "precioxhora": get_hourly_price(PISCINA_ID),
        },
    ]