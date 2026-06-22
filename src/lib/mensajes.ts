import { formatCurrency } from './utils'

/**
 * Bancos de mensajes en tono Gen Z peruano DISCRETO.
 * El tono es importante: quedarse sin plata es sensible — nada de burla
 * pesada. Mantener cercanía sin condescender.
 *
 * Banco A: bloqueo duro por saldo insuficiente al intentar registrar un
 *          gasto o contribuir a una meta. (title + subtitle)
 * Banco B: el saldo llega exactamente a 0 tras un gasto válido. (1 línea)
 * Banco C: el saldo cruza el umbral configurable (umbral_saldo_bajo) por
 *          debajo, antes de llegar a 0. (1 línea)
 *
 * Los disparadores de Banco B y C los cablea Fase 3 (LukaNotification
 * inferior estilo iPhone). Banco A ya se dispara en Fase 2 desde
 * AddExpensePage y GoalsPage por toast inline.
 */

export type BancoAMensaje = { title: string; subtitle: string }

export const BANCO_A_GASTO_BLOQUEADO: readonly BancoAMensaje[] = [
  {
    title: '¿Espera... tienes S/ 30 y quieres gastar S/ 50? ¿Negocio escondido? 👀',
    subtitle: 'Actualiza tu saldo para registrar este gasto.',
  },
  {
    title: 'Las matemáticas no dan, crack.',
    subtitle: 'Ese gasto supera tu saldo. Actualízalo primero para continuar.',
  },
  {
    title: 'Plata que no tienes, gasto que no entra.',
    subtitle: 'Actualiza tu saldo disponible para registrar este movimiento.',
  },
  {
    title: 'Whoa, ahí no alcanza 💸',
    subtitle: 'Tu saldo es menor al gasto. Actualízalo para poder guardarlo.',
  },
  {
    title: 'Ese gasto no cabe en tu bolsillo (todavía).',
    subtitle: 'Actualiza tu saldo y lo registramos al toque.',
  },
  {
    title: 'Cuentas claras: te falta saldo para esto.',
    subtitle: 'Actualiza tu saldo disponible antes de registrar el gasto.',
  },
  {
    title: 'Frena ahí, billetera de cristal 🔮',
    subtitle: 'El gasto excede tu saldo. Actualízalo primero.',
  },
  {
    title: '¿Seguro? Tu saldo dice que no 😅',
    subtitle: 'Actualiza tu saldo para poder ingresar este gasto.',
  },
] as const

export const BANCO_B_SALDO_CERO: readonly string[] = [
  '¡Oh no, te quedaste agüja! 🪡',
  'Saldo en cero. Modo supervivencia activado 🫡',
  'Llegaste a S/ 0,00. Hora de recargar energías (y saldo).',
  'Tu billetera está haciendo eco 📢',
  'Cero lucas. Pero cero deudas también, eso cuenta 😌',
  'Se acabó la magia por hoy ✨ Saldo en S/ 0.',
  'Oficialmente en las últimas 🥲 Actualiza tu saldo cuando caiga algo.',
  'S/ 0,00. Respira, ya vendrá la quincena 🙏',
] as const

export const BANCO_C_SALDO_BAJO: readonly string[] = [
  'Ojo, tu saldo está bajando 👀',
  'Te queda poquito. Gasta con cabeza.',
  'Modo ahorro recomendado: tu saldo está en rojo 🚥',
  'Quedan pocas lucas, maneja con cuidado 🚗💨',
] as const

// ─── Utilidades ───────────────────────────────────────────────────────────────

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Variante dinámica del mensaje 1 del Banco A con los montos reales del
 * intento (saldo actual vs monto del gasto/contribución).
 *
 * Comportamiento: 35 % de las veces devuelve la variante dinámica con
 * cifras formateadas; el resto del tiempo elige uno aleatorio del banco
 * para mantener variedad. Si quieres siempre cifras reales, llama a la
 * función helper `mensajeBloqueoDinamicoSiempre` (no la uso por defecto
 * para que el copy se sienta variado).
 */
export function mensajeBloqueoDinamico(
  saldoActual: number,
  montoIntentado: number,
): BancoAMensaje {
  if (Math.random() < 0.35) {
    return {
      title: `¿Espera... tienes ${formatCurrency(saldoActual)} y quieres gastar ${formatCurrency(montoIntentado)}? ¿Negocio escondido? 👀`,
      subtitle: 'Actualiza tu saldo para registrar este movimiento.',
    }
  }
  return pickRandom(BANCO_A_GASTO_BLOQUEADO)
}
