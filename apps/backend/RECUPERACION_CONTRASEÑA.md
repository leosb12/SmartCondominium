# Configuración de Recuperación de Contraseña con Supabase

## Descripción
Se ha implementado un sistema completo de recuperación de contraseña que utiliza Supabase Auth. El sistema incluye dos endpoints:

1. `POST /forgot-password/` - Solicita el envío de correo de recuperación
2. `POST /reset-password/` - Confirma el cambio de contraseña usando tokens

## Endpoints Implementados

### 1. Solicitar Recuperación de Contraseña
**URL:** `POST https://smartcondominiumbackend.onrender.com/api/forgot-password/`
**URL Desarrollo:** `POST http://localhost:8001/api/forgot-password/`

**Body:**
```json
{
    "email": "usuario@ejemplo.com"
}
```

**Respuesta exitosa:**
```json
{
    "success": true,
    "message": "Si el correo existe en nuestro sistema, se ha enviado un enlace de recuperación."
}
```

### 2. Confirmar Cambio de Contraseña
**URL:** `POST https://smartcondominiumbackend.onrender.com/api/reset-password/`
**URL Desarrollo:** `POST http://localhost:8001/api/reset-password/`

**Body:**
```json
{
    "access_token": "token_de_acceso_del_enlace",
    "refresh_token": "token_de_refresh_del_enlace",
    "new_password": "nueva_contraseña_segura"
}
```

**Respuesta exitosa:**
```json
{
    "success": true,
    "message": "Contraseña actualizada exitosamente"
}
```

## Configuración Requerida en Supabase

### 1. Configuración de Authentication
En el dashboard de Supabase:
1. Ve a **Authentication > Settings**
2. Configura las siguientes opciones:

#### Site URL
```
https://smart-condominium-web.vercel.app
```

#### Redirect URLs
Añade las URLs permitidas para redirección:
```
https://smart-condominium-web.vercel.app/login
https://smart-condominium-web.vercel.app/reset-password
```

### 2. Email Templates
1. Ve a **Authentication > Email Templates**
2. Selecciona **Reset Password**
3. Personaliza el template si es necesario:

```html
<h2>Restablecer contraseña</h2>
<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
<p><a href="{{ .SiteURL }}/reset-password?access_token={{ .Token }}&refresh_token={{ .RefreshToken }}">Restablecer contraseña</a></p>
<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
```

### 3. Variables de Entorno
Asegúrate de que estas variables estén configuradas en tu archivo `.env`:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key
```

## Configuración del Frontend

### Página de Reset de Contraseña
Necesitas crear una página en tu frontend que:

1. **Capture los tokens de la URL:**
```javascript
// Ejemplo en React/JavaScript
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const refreshToken = urlParams.get('refresh_token');
```

2. **Presente un formulario para nueva contraseña:**
```javascript
const handleResetPassword = async (newPassword) => {
    const response = await fetch('/api/reset-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            new_password: newPassword
        })
    });
    
    const data = await response.json();
    // Manejar respuesta...
};
```

## Consideraciones de Seguridad

1. **Tokens únicos:** Los tokens de recuperación son únicos y tienen tiempo de expiración
2. **Validación de email:** Se valida el formato del email antes de procesar
3. **Respuestas consistentes:** Por seguridad, siempre se devuelve éxito en forgot-password
4. **Validación de contraseña:** Se requiere mínimo 6 caracteres para la nueva contraseña
5. **Manejo de errores:** Los errores internos no exponen información sensible

## URL de Redirección Personalizada

Configurado para **PRODUCCIÓN ÚNICAMENTE**:

**URLs configuradas:**
- **Register confirmation:** `https://smart-condominium-web.vercel.app/login`
- **Reset password:** `https://smart-condominium-web.vercel.app/reset-password`

**Nota:** Para desarrollo local, deberás cambiar temporalmente las URLs en `views.py` si es necesario.

## Flujo Completo

1. Usuario ingresa su email en el formulario de "¿Olvidaste tu contraseña?"
2. Frontend hace POST a `/api/forgot-password/`
3. Si el email existe, Supabase envía correo con enlace único
4. Usuario hace clic en el enlace del correo
5. Es redirigido a la página de reset con tokens en la URL
6. Usuario ingresa nueva contraseña
7. Frontend hace POST a `/api/reset-password/` con tokens y nueva contraseña
8. Contraseña se actualiza exitosamente

## Testing

Para probar localmente:
1. Asegúrate de que Supabase esté configurado para envío de emails
2. Usa un email real registrado en tu sistema
3. Verifica que llegue el correo de recuperación
4. Prueba el flujo completo