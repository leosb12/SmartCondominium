"""
Servicios de negocio para el módulo de administración de finanzas

Contiene todas las operaciones de base de datos usando SQL crudo
para gestionar tarifas, extraordinarias y generación de expensas.
"""

from django.db import connection
from decimal import Decimal
from datetime import date
from typing import Dict, List, Any, Optional, Tuple


class FinanceService:
    """Servicio para operaciones financieras usando SQL crudo"""
    
    @staticmethod
    def insert_tarifa(monto: Decimal) -> Dict[str, Any]:
        """
        Inserta una nueva tarifa en tarifa_m2.
        
        Args:
            monto: Monto de la tarifa por m²
            
        Returns:
            Dict con id, monto, created_at de la tarifa insertada
            
        Raises:
            Exception: Si hay error en la base de datos
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tarifa_m2(monto) 
                VALUES (%s)
                RETURNING id, monto, created_at
            """, [monto])
            
            row = cursor.fetchone()
            if not row:
                raise Exception("Error insertando tarifa")
            
            return {
                'id': row[0],
                'monto': float(row[1]),
                'created_at': row[2].isoformat() if row[2] else None
            }
    
    @staticmethod
    def get_tarifa_vigente() -> Optional[Dict[str, Any]]:
        """
        Obtiene la tarifa vigente (última insertada).
        
        Returns:
            Dict con id, monto, created_at o None si no hay tarifas
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, monto, created_at 
                FROM tarifa_m2 
                ORDER BY created_at DESC, id DESC 
                LIMIT 1
            """)
            
            row = cursor.fetchone()
            if not row:
                return None
            
            return {
                'id': row[0],
                'monto': float(row[1]),
                'created_at': row[2].isoformat() if row[2] else None
            }
    
    @staticmethod
    def upsert_extraordinaria(periodo: date, total_monto: Decimal, descripcion: str = "") -> Dict[str, Any]:
        """
        Crea o actualiza una extraordinaria para un período específico.
        
        Args:
            periodo: Fecha del primer día del mes
            total_monto: Monto total de la extraordinaria
            descripcion: Descripción opcional
            
        Returns:
            Dict con periodo, total_monto, descripcion
            
        Raises:
            Exception: Si hay error en la base de datos
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO extraordinaria_mes(periodo, total_monto, descripcion)
                VALUES (%s, %s, %s)
                ON CONFLICT (periodo) DO UPDATE
                SET total_monto = EXCLUDED.total_monto,
                    descripcion = EXCLUDED.descripcion
                RETURNING periodo, total_monto, descripcion
            """, [periodo, total_monto, descripcion])
            
            row = cursor.fetchone()
            if not row:
                raise Exception("Error insertando/actualizando extraordinaria")
            
            return {
                'periodo': row[0].isoformat() if row[0] else None,
                'total_monto': float(row[1]),
                'descripcion': row[2] or ""
            }
    
    @staticmethod
    def get_extraordinaria(periodo: date) -> Optional[Dict[str, Any]]:
        """
        Obtiene la extraordinaria configurada para un período específico.
        
        Args:
            periodo: Fecha del primer día del mes
            
        Returns:
            Dict con periodo, total_monto, descripcion o None si no existe
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT periodo, total_monto, descripcion
                FROM extraordinaria_mes
                WHERE periodo = %s
            """, [periodo])
            
            row = cursor.fetchone()
            if not row:
                return None
            
            return {
                'periodo': row[0].isoformat() if row[0] else None,
                'total_monto': float(row[1]),
                'descripcion': row[2] or ""
            }
    
    @staticmethod
    def generar_expensas_hoy() -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Ejecuta la generación de expensas para el día actual.
        
        La función generar_expensas_hoy() en Supabase:
        - Solo inserta para propiedades cuyo billing_day coincide con hoy
        - Los triggers automáticamente calculan tarifa_id y total
        - ON CONFLICT DO NOTHING evita duplicados por mes
        
        Returns:
            Tupla (success: bool, expensas_generadas: List[Dict])
        """
        with connection.cursor() as cursor:
            print("🟡 Ejecutando función SQL generar_expensas_hoy()...")
            
            # La función generar_expensas_hoy() en Supabase retorna void, no necesita SELECT
            cursor.execute("SELECT generar_expensas_hoy()")
            print("🟢 Función SQL ejecutada exitosamente")
            
            # Obtener las expensas del mes actual (no solo hoy, porque pueden haberse generado antes)
            print("🟡 Consultando expensas del mes actual...")
            cursor.execute("""
                SELECT e.id, e.propiedad_id, e.fecha, e.tarifa_id, e.total,
                       p.nro_casa, p.m2, p.billing_day
                FROM expensas e
                JOIN propiedad p ON p.id = e.propiedad_id
                WHERE date_trunc('month', e.fecha) = date_trunc('month', CURRENT_DATE)
                ORDER BY e.fecha DESC, e.propiedad_id
            """)
            
            expensas = []
            rows = cursor.fetchall()
            print(f"🟢 Encontradas {len(rows)} expensas del mes actual")
            
            for row in rows:
                expensas.append({
                    'id': row[0],
                    'propiedad_id': row[1],
                    'fecha': row[2].isoformat() if row[2] else None,
                    'tarifa_id': row[3],
                    'total': float(row[4]) if row[4] else 0,
                    'nro_casa': row[5],
                    'm2': float(row[6]) if row[6] else 0,
                    'billing_day': row[7]
                })
            
            return True, expensas
    
    @staticmethod
    def get_expensas_by_date(fecha: date) -> List[Dict[str, Any]]:
        """
        Obtiene todas las expensas generadas en una fecha específica.
        
        Args:
            fecha: Fecha a consultar
            
        Returns:
            Lista de expensas con detalles de propiedad
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.propiedad_id, e.fecha, e.tarifa_id, e.total,
                       p.nro_casa, p.m2, p.billing_day
                FROM expensas e
                JOIN propiedad p ON p.id = e.propiedad_id
                WHERE e.fecha = %s
                ORDER BY e.propiedad_id
            """, [fecha])
            
            expensas = []
            for row in cursor.fetchall():
                expensas.append({
                    'id': row[0],
                    'propiedad_id': row[1],
                    'fecha': row[2].isoformat() if row[2] else None,
                    'tarifa_id': row[3],
                    'total': float(row[4]) if row[4] else 0,
                    'nro_casa': row[5],
                    'm2': float(row[6]) if row[6] else 0,
                    'billing_day': row[7]
                })
            
            return expensas
    
    @staticmethod
    def test_database_connection() -> Dict[str, Any]:
        """
        Prueba la conectividad con la base de datos.
        
        Returns:
            Dict con información de conexión y pruebas básicas
        """
        with connection.cursor() as cursor:
            # Test básico de conexión
            cursor.execute("SELECT CURRENT_DATE, CURRENT_TIMESTAMP")
            row = cursor.fetchone()
            
            # Contar registros en tablas principales
            cursor.execute("SELECT COUNT(*) FROM propiedad")
            count_propiedades = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tarifa_m2")
            count_tarifas = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM extraordinaria_mes")
            count_extraordinarias = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM expensas")
            count_expensas = cursor.fetchone()[0]
            
            return {
                'success': True,
                'current_date': row[0].isoformat() if row[0] else None,
                'current_timestamp': row[1].isoformat() if row[1] else None,
                'tables': {
                    'propiedades': count_propiedades,
                    'tarifas': count_tarifas,
                    'extraordinarias': count_extraordinarias,
                    'expensas': count_expensas
                }
            }


# Funciones de conveniencia para importar directamente
def insert_tarifa(monto: Decimal) -> Dict[str, Any]:
    """Función de conveniencia para insertar tarifa"""
    return FinanceService.insert_tarifa(monto)


def get_tarifa_vigente() -> Optional[Dict[str, Any]]:
    """Función de conveniencia para obtener tarifa vigente"""
    return FinanceService.get_tarifa_vigente()


def upsert_extraordinaria(periodo: date, total_monto: Decimal, descripcion: str = "") -> Dict[str, Any]:
    """Función de conveniencia para upsert extraordinaria"""
    return FinanceService.upsert_extraordinaria(periodo, total_monto, descripcion)


def get_extraordinaria(periodo: date) -> Optional[Dict[str, Any]]:
    """Función de conveniencia para obtener extraordinaria"""
    return FinanceService.get_extraordinaria(periodo)


def generar_expensas_hoy() -> Tuple[bool, List[Dict[str, Any]]]:
    """Función de conveniencia para generar expensas hoy"""
    return FinanceService.generar_expensas_hoy()


def test_database_connection() -> Dict[str, Any]:
    """Función de conveniencia para test de BD"""
    return FinanceService.test_database_connection()