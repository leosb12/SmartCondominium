"""
Serializers para el módulo de administración de finanzas

Proporciona clases y funciones para el formateo consistente 
de respuestas JSON en todos los endpoints.
"""

from typing import Dict, List, Any, Optional
from datetime import date, datetime
from decimal import Decimal


class ResponseFormatter:
    """Formateador de respuestas para endpoints financieros"""
    
    @staticmethod
    def success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
        """
        Formato estándar para respuestas exitosas.
        
        Args:
            data: Datos a incluir en la respuesta
            message: Mensaje opcional
            
        Returns:
            Dict con formato estándar de respuesta exitosa
        """
        response = {
            "success": True
        }
        
        if message:
            response["message"] = message
            
        if data is not None:
            response["data"] = data
            
        return response
    
    @staticmethod
    def error_response(error: str, detail: str = None, status_code: int = 400) -> Dict[str, Any]:
        """
        Formato estándar para respuestas de error.
        
        Args:
            error: Mensaje de error principal
            detail: Detalle opcional del error
            status_code: Código de estado HTTP (para referencia)
            
        Returns:
            Dict con formato estándar de respuesta de error
        """
        response = {
            "success": False,
            "error": error
        }
        
        if detail:
            response["detail"] = detail
            
        return response
    
    @staticmethod
    def validation_error_response(validation_errors: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Formato estándar para errores de validación.
        
        Args:
            validation_errors: Dict con campo -> lista de errores
            
        Returns:
            Dict con formato estándar de errores de validación
        """
        return {
            "success": False,
            "error": "Errores de validación",
            "validation_errors": validation_errors
        }


class TarifaSerializer:
    """Serializer para datos de tarifa"""
    
    @staticmethod
    def serialize(tarifa_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serializa los datos de una tarifa.
        
        Args:
            tarifa_data: Datos raw de la tarifa desde BD
            
        Returns:
            Dict con datos serializados de la tarifa
        """
        return {
            "id": tarifa_data.get("id"),
            "monto": float(tarifa_data.get("monto", 0)),
            "created_at": tarifa_data.get("created_at")
        }
    
    @staticmethod
    def serialize_response(tarifa_data: Dict[str, Any], message: str = None) -> Dict[str, Any]:
        """
        Serializa respuesta completa de tarifa.
        
        Args:
            tarifa_data: Datos de la tarifa
            message: Mensaje opcional
            
        Returns:
            Respuesta formateada con tarifa
        """
        serialized_tarifa = TarifaSerializer.serialize(tarifa_data)
        return ResponseFormatter.success_response(
            data={"tarifa": serialized_tarifa},
            message=message
        )


class ExtraordinariaSerializer:
    """Serializer para datos de extraordinaria"""
    
    @staticmethod
    def serialize(extraordinaria_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serializa los datos de una extraordinaria.
        
        Args:
            extraordinaria_data: Datos raw de la extraordinaria desde BD
            
        Returns:
            Dict con datos serializados de la extraordinaria
        """
        return {
            "periodo": extraordinaria_data.get("periodo"),
            "total_monto": float(extraordinaria_data.get("total_monto", 0)),
            "descripcion": extraordinaria_data.get("descripcion", "")
        }
    
    @staticmethod
    def serialize_response(extraordinaria_data: Dict[str, Any], message: str = None) -> Dict[str, Any]:
        """
        Serializa respuesta completa de extraordinaria.
        
        Args:
            extraordinaria_data: Datos de la extraordinaria
            message: Mensaje opcional
            
        Returns:
            Respuesta formateada con extraordinaria
        """
        serialized_extraordinaria = ExtraordinariaSerializer.serialize(extraordinaria_data)
        return ResponseFormatter.success_response(
            data={"extraordinaria": serialized_extraordinaria},
            message=message
        )
    
    @staticmethod
    def serialize_not_found_response(periodo: str) -> Dict[str, Any]:
        """
        Respuesta cuando no se encuentra extraordinaria para un período.
        
        Args:
            periodo: Período consultado
            
        Returns:
            Respuesta indicando que no se encontró extraordinaria
        """
        return ResponseFormatter.success_response(
            data={
                "extraordinaria": None,
                "periodo_consultado": periodo
            },
            message=f"No se encontró extraordinaria configurada para el período {periodo}"
        )


class ExpensaSerializer:
    """Serializer para datos de expensas"""
    
    @staticmethod
    def serialize(expensa_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serializa los datos de una expensa.
        
        Args:
            expensa_data: Datos raw de la expensa desde BD
            
        Returns:
            Dict con datos serializados de la expensa
        """
        return {
            "id": expensa_data.get("id"),
            "propiedad_id": expensa_data.get("propiedad_id"),
            "fecha": expensa_data.get("fecha"),
            "tarifa_id": expensa_data.get("tarifa_id"),
            "total": float(expensa_data.get("total", 0)),
            "propiedad": {
                "nro_casa": expensa_data.get("nro_casa"),
                "m2": float(expensa_data.get("m2", 0))
            }
        }
    
    @staticmethod
    def serialize_list(expensas_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Serializa una lista de expensas.
        
        Args:
            expensas_data: Lista de datos raw de expensas
            
        Returns:
            Lista con expensas serializadas
        """
        return [ExpensaSerializer.serialize(expensa) for expensa in expensas_data]
    
    @staticmethod
    def serialize_generation_response(success: bool, expensas_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Serializa respuesta de generación de expensas.
        
        Args:
            success: Si la generación fue exitosa
            expensas_data: Lista de expensas generadas
            
        Returns:
            Respuesta formateada con expensas generadas
        """
        serialized_expensas = ExpensaSerializer.serialize_list(expensas_data)
        
        message = f"Se generaron {len(expensas_data)} expensas para el día de hoy"
        if len(expensas_data) == 0:
            message = "No se generaron expensas nuevas (ya fueron procesadas o no hay propiedades con billing_day hoy)"
        
        return ResponseFormatter.success_response(
            data={
                "expensas_generadas": serialized_expensas,
                "total_generadas": len(expensas_data),
                "fecha_generacion": datetime.now().date().isoformat()
            },
            message=message
        )


class DatabaseTestSerializer:
    """Serializer para respuestas de test de base de datos"""
    
    @staticmethod
    def serialize_test_response(test_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serializa respuesta de test de base de datos.
        
        Args:
            test_data: Datos del test de BD
            
        Returns:
            Respuesta formateada con información de test
        """
        return ResponseFormatter.success_response(
            data={
                "database_test": test_data
            },
            message="Test de base de datos exitoso"
        )


# Funciones de conveniencia para uso directo
def success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
    """Función de conveniencia para respuesta exitosa"""
    return ResponseFormatter.success_response(data, message)


def error_response(error: str, detail: str = None) -> Dict[str, Any]:
    """Función de conveniencia para respuesta de error"""
    return ResponseFormatter.error_response(error, detail)


def validation_error_response(validation_errors: Dict[str, List[str]]) -> Dict[str, Any]:
    """Función de conveniencia para errores de validación"""
    return ResponseFormatter.validation_error_response(validation_errors)