"""
Validadores para el módulo de administración de finanzas

Contiene funciones para validar y normalizar datos de entrada
como períodos, montos y otros parámetros financieros.
"""

import re
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Tuple, Optional


def validate_and_normalize_periodo(periodo_str: str) -> Tuple[bool, str, Optional[date]]:
    """
    Valida y normaliza un período al primer día del mes.
    
    Args:
        periodo_str: String en formato "YYYY-MM" o "YYYY-MM-DD"
        
    Returns:
        Tupla (is_valid: bool, error_message: str, normalized_date: date|None)
    """
    if not periodo_str:
        return False, "El período es requerido", None
    
    # Normalizar formato: aceptar YYYY-MM o YYYY-MM-DD
    periodo_str = periodo_str.strip()
    
    # Si viene como YYYY-MM, agregar -01
    if re.match(r'^\d{4}-\d{2}$', periodo_str):
        periodo_str += '-01'
    
    # Validar formato YYYY-MM-DD
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', periodo_str):
        return False, "Formato de período inválido. Use YYYY-MM o YYYY-MM-DD", None
    
    try:
        # Parsear fecha
        fecha_periodo = datetime.strptime(periodo_str, '%Y-%m-%d').date()
        
        # Normalizar al primer día del mes
        fecha_normalizada = fecha_periodo.replace(day=1)
        
        return True, "", fecha_normalizada
        
    except ValueError:
        return False, "Fecha de período inválida", None


def validate_future_periodo(periodo_date: date) -> Tuple[bool, str]:
    """
    Valida que el período sea del próximo mes en adelante.
    
    Args:
        periodo_date: Fecha ya normalizada al primer día del mes
        
    Returns:
        Tupla (is_valid: bool, error_message: str)
    """
    if not periodo_date:
        return False, "Período requerido"
    
    # Obtener primer día del próximo mes
    hoy = date.today()
    if hoy.month == 12:
        primer_dia_proximo_mes = date(hoy.year + 1, 1, 1)
    else:
        primer_dia_proximo_mes = date(hoy.year, hoy.month + 1, 1)
    
    if periodo_date < primer_dia_proximo_mes:
        return False, f"El período debe ser del próximo mes en adelante (>= {primer_dia_proximo_mes.strftime('%Y-%m-%d')})"
    
    return True, ""


def validate_monto(monto_str: str, field_name: str = "monto") -> Tuple[bool, str, Optional[Decimal]]:
    """
    Valida que un monto sea un número positivo.
    
    Args:
        monto_str: String con el monto a validar
        field_name: Nombre del campo para mensajes de error
        
    Returns:
        Tupla (is_valid: bool, error_message: str, decimal_value: Decimal|None)
    """
    if not monto_str and monto_str != 0:
        return False, f"El {field_name} es requerido", None
    
    try:
        # Convertir a Decimal para precisión financiera
        monto_decimal = Decimal(str(monto_str))
        
        if monto_decimal <= 0:
            return False, f"El {field_name} debe ser mayor a 0", None
        
        return True, "", monto_decimal
        
    except (InvalidOperation, ValueError, TypeError):
        return False, f"El {field_name} debe ser un número válido", None


def validate_json_required_fields(data: dict, required_fields: list) -> Tuple[bool, str]:
    """
    Valida que los campos requeridos estén presentes en el JSON.
    
    Args:
        data: Diccionario con los datos del request
        required_fields: Lista de campos requeridos
        
    Returns:
        Tupla (is_valid: bool, error_message: str)
    """
    if not data:
        return False, "Body JSON requerido"
    
    missing_fields = []
    for field in required_fields:
        if field not in data:
            missing_fields.append(field)
    
    if missing_fields:
        return False, f"Campos requeridos faltantes: {', '.join(missing_fields)}"
    
    return True, ""


def validate_query_periodo(periodo_query: str) -> Tuple[bool, str, Optional[date]]:
    """
    Valida período para queries GET (menos restrictivo, no requiere futuro).
    
    Args:
        periodo_query: String del query parameter
        
    Returns:
        Tupla (is_valid: bool, error_message: str, normalized_date: date|None)
    """
    if not periodo_query:
        return False, "Parámetro periodo requerido", None
    
    return validate_and_normalize_periodo(periodo_query)


class ValidationError(Exception):
    """Excepción personalizada para errores de validación"""
    
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)