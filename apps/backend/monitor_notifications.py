#!/usr/bin/env python
"""
Monitor de notificaciones pendientes - Procesa cada 5 segundos
"""
import requests
import time
from datetime import datetime

ENDPOINT = "http://127.0.0.1:8001/api/notificaciones/process-pending?limit=50"
INTERVAL = 5  # segundos

def process_pending():
    try:
        response = requests.post(ENDPOINT, timeout=10)
        data = response.json()
        
        count = data.get("count", 0)
        items = data.get("items", [])
        
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"\n[{timestamp}] ✅ Procesadas {count} notificaciones")
        
        # Mostrar detalle de cada una
        for item in items:
            notif_id = item.get("id")
            ok = item.get("ok", False)
            error = item.get("error", "")
            status = "✅" if ok else "❌"
            
            if ok:
                print(f"  {status} Notificación #{notif_id}: OK")
            else:
                error_msg = error if error else "Error desconocido"
                print(f"  {status} Notificación #{notif_id}: {error_msg}")
        
        return count > 0
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error: {e}")
        return False

def main():
    print(f"🚀 Iniciando monitor de notificaciones (cada {INTERVAL}s)...")
    print(f"📍 Endpoint: {ENDPOINT}")
    print("Presiona Ctrl+C para detener\n")
    
    try:
        while True:
            process_pending()
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print("\n\n⛔ Monitor detenido por el usuario")

if __name__ == "__main__":
    main()
