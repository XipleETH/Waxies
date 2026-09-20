# Cuentas y futura liga con tokens

## Acceso y recuperación

POST /api/account emite un reto de firma personal con dominio, URI, red Ronin 2020,
nonce aleatorio y caducidad de 5 minutos. Se vincula a una cookie HttpOnly y a la
sesión que lo pidió. La firma se verifica con viem publicClient.verifyMessage
(EOA y cuentas de contrato); el nonce se consume atómicamente en el ledger.

La primera vinculación conserva la cuenta invitada online. Una billetera existente
recupera su cuenta; no combina saldos ni crea otra bonificación. Dos direcciones
distintas son dos cuentas, aunque una venga de Ronin y otra de Sky Mavis.
Las sesiones firmadas duran 30 días (hasta 10 dispositivos). Cerrar sesión revoca
el dispositivo actual. Las sesiones invitadas antiguas se revocan al vincular.

Sky Mavis usa el proveedor Waypoint existente y necesita
NEXT_PUBLIC_WAYPOINT_CLIENT_ID y el origen autorizado en su consola.
RONIN_RPC_URL es opcional para usar un proveedor RPC propio en el servidor.
No hay claves privadas ni frases semilla en el servidor.

## Guardado

El guardado de historia, Chispas cosméticas, compras del Bazar, Axie elegido y
diseño del refugio queda en Player.cloud. El saldo competitivo, cofre, recompensas
verificadas y ataques permanecen en el ledger de la misma cuenta.

Los dos saldos de Chispas siguen separados. El perfil local importado es una
copia de juego validada estructuralmente, NO prueba económica: jamás acredita
available/chest ni tokens. Antes de dar valor económico a las Chispas cosméticas
hay que migrar sus premios/compras a comandos verificados por servidor.

Guardados con revisión obsoleta se rechazan (409); no se suman monedas entre
dispositivos. Al recargar se recupera la nube y la versión desplazada queda bajo
waxies.profile-backup.<cuenta> en localStorage. Si se pierde conexión, se conserva
el guardado local pendiente para reintentar en la siguiente apertura.
El cambio a otra cuenta nunca fusiona las copias.
El acceso con una cuenta sin Axies también funciona.

## SLP / AXS / RON (preparación, no depósitos activos)

token-valuation.ts calcula valores en microdólares con BigInt y cantidades nativas
en cadenas de enteros. Acepta cofres de uno o varios de los tres activos, exige
cotizaciones de servidor de menos de 60 segundos y conserva una copia de las
cotizaciones y unidades al reservar. Rango inicial: 90–110% del valor del atacante.
Los decimales deben obtenerse del registro validado de contratos; no del cliente.

TOKEN_LEAGUE.enabled permanece false. Falta integrar:
- Contrato de custodia, retiros y distribución de botín revisado.
- Registro de direcciones de contratos, red y decimales.
- Indexador de depósitos con confirmaciones, deduplicación tx/log y reorganizaciones.
- Cotizaciones fiables, controles de desviación y límites de exposición.
- Reserva atómica en el ledger y liquidación en unidades del activo depositado.
- Pruebas en testnet antes de habilitar dinero real.

No existen endpoints que acepten depósitos declarados por el navegador.
La liga actual continúa usando Chispas y su matchmaking existente.
