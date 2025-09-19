"""
Script de verificación para el módulo finance_admin

Este script verifica que todos los componentes estén correctamente importables
y que la lógica básica funcione.
"""

import sys
import os

# Agregar el path del proyecto al sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_imports():
    """Prueba que todos los módulos se importen correctamente"""
    print("🔍 Probando imports...")
    
    try:
        # Test import del módulo principal
        from finance_admin import permissions, validators, services, serializers, views, urls
        print("✅ Imports principales exitosos")
        
        # Test import de funciones específicas
        from finance_admin.validators import validate_monto, validate_and_normalize_periodo
        from finance_admin.serializers import success_response, error_response
        from finance_admin.permissions import admin_required
        
        print("✅ Imports de funciones específicas exitosos")
        
        return True
        
    except ImportError as e:
        print(f"❌ Error en imports: {e}")
        return False

def test_validators():
    """Prueba las funciones de validación"""
    print("\n🔍 Probando validadores...")
    
    try:
        from finance_admin.validators import validate_monto, validate_and_normalize_periodo, validate_future_periodo
        from datetime import date
        
        # Test validación de monto
        is_valid, error, decimal_val = validate_monto("150.50")
        assert is_valid == True
        assert decimal_val == 150.50
        print("✅ Validación de monto positivo")
        
        is_valid, error, decimal_val = validate_monto("-10")
        assert is_valid == False
        print("✅ Validación de monto negativo (rechazado)")
        
        # Test validación de período
        is_valid, error, fecha = validate_and_normalize_periodo("2025-12")
        assert is_valid == True
        assert fecha.day == 1
        print("✅ Normalización de período")
        
        # Test período futuro
        fecha_futura = date(2025, 12, 1)  # Diciembre 2025
        is_valid, error = validate_future_periodo(fecha_futura)
        assert is_valid == True
        print("✅ Validación de período futuro")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en validadores: {e}")
        return False

def test_serializers():
    """Prueba los serializadores"""
    print("\n🔍 Probando serializadores...")
    
    try:
        from finance_admin.serializers import success_response, error_response, TarifaSerializer
        
        # Test respuesta exitosa
        response = success_response({"test": "data"}, "Test message")
        assert response["success"] == True
        assert response["message"] == "Test message"
        print("✅ Serializer de respuesta exitosa")
        
        # Test respuesta de error
        response = error_response("Test error", "Test detail")
        assert response["success"] == False
        assert response["error"] == "Test error"
        print("✅ Serializer de respuesta de error")
        
        # Test serializer de tarifa
        tarifa_data = {"id": 1, "monto": 150.50, "created_at": "2025-09-18T10:00:00Z"}
        serialized = TarifaSerializer.serialize(tarifa_data)
        assert serialized["id"] == 1
        assert serialized["monto"] == 150.50
        print("✅ Serializer de tarifa")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en serializadores: {e}")
        return False

def main():
    """Función principal de prueba"""
    print("🚀 Iniciando verificación del módulo finance_admin...")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_validators,
        test_serializers
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Error inesperado en {test.__name__}: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Resultados: {passed} pruebas exitosas, {failed} fallos")
    
    if failed == 0:
        print("🎉 ¡Todos los componentes están funcionando correctamente!")
        print("✅ El módulo está listo para el frontend")
    else:
        print("⚠️  Hay algunos problemas que necesitan resolución")
    
    return failed == 0

if __name__ == "__main__":
    main()