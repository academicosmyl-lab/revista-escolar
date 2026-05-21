/**
 * BackNavigationUtil — maneja el botón Atrás del navegador en flujos multi-paso.
 *
 * PROBLEMA QUE RESUELVE:
 *   En una SPA Angular, el botón Atrás del browser navega a la ruta anterior
 *   aunque la página tenga pasos internos que no se reflejan en la URL.
 *   Resultado: el usuario pierde el formulario/flujo actual sin quererlo.
 *
 * SOLUCIÓN:
 *   Al entrar a cada paso interno se hace history.pushState con ese estado.
 *   Al presionar Atrás, el browser hace pop y dispara popstate — que esta clase
 *   intercepta para actualizar el estado interno del componente, sin navegar fuera.
 *
 * CÓMO USARLO EN UN COMPONENTE:
 * ─────────────────────────────
 *   // 1. Definir el tipo de pasos
 *   type Paso = '' | 'paso1' | 'paso2' | 'paso3';
 *
 *   // 2. Declarar campo (inicializar en ngOnInit)
 *   private backNav!: BackNavigationUtil<Paso>;
 *
 *   // 3. Crear en ngOnInit
 *   ngOnInit() {
 *     this.backNav = new BackNavigationUtil<Paso>('', (paso) => {
 *       this.miEstado.set(paso);   // actualizar señal del componente
 *       this.cdr.markForCheck();
 *     });
 *   }
 *
 *   // 4. Limpiar en ngOnDestroy
 *   ngOnDestroy() { this.backNav.destroy(); }
 *
 *   // 5. Registrar cada transición de paso
 *   irAPaso1() {
 *     this.miEstado.set('paso1');
 *     this.backNav.push('paso1');   // ← registrar en historial
 *   }
 *
 *   // 6. Para el botón "Volver" programático (usa history.back())
 *   volver() { this.backNav.goBack(); }
 */

const HISTORY_KEY = 'appNavStep';

export class BackNavigationUtil<T extends string> {

  /**
   * @param baseState  Estado base (el primero — cuando no hay pasos activos).
   * @param onPop      Callback que recibe el estado al que el usuario retrocedió.
   *                   Usa esta función para actualizar la señal de tu componente.
   */
  constructor(
    private readonly baseState: T,
    private readonly onPop: (state: T) => void,
  ) {
    // Reemplazar la entrada actual del historial con el estado base,
    // para que el primer popstate corresponda al estado correcto.
    history.replaceState(
      { [HISTORY_KEY]: baseState },
      '',
      window.location.href,
    );
    window.addEventListener('popstate', this.handler);
  }

  /** Manejador interno del evento popstate. Arrow function para mantener `this`. */
  private readonly handler = (e: PopStateEvent): void => {
    const state = (e.state ?? {}) as Record<string, string>;
    if (HISTORY_KEY in state) {
      this.onPop(state[HISTORY_KEY] as T);
    }
    // Si no hay HISTORY_KEY en el estado, es una navegación de Angular — se ignora.
  };

  /**
   * Registrar un nuevo paso en el historial del navegador.
   * Llamar inmediatamente después de cambiar el estado del componente.
   */
  push(step: T): void {
    history.pushState(
      { [HISTORY_KEY]: step },
      '',
      window.location.href,
    );
  }

  /**
   * Navegar un paso atrás vía history.back().
   * Útil para botones "← Volver" o "Cancelar" que quieren respetar el stack.
   * El callback onPop se ejecutará de forma asíncrona cuando dispare popstate.
   */
  goBack(): void {
    history.back();
  }

  /**
   * Limpiar el listener. SIEMPRE llamar en ngOnDestroy().
   * Si no se llama, el listener queda activo tras destruir el componente
   * y puede interferir con otras páginas.
   */
  destroy(): void {
    window.removeEventListener('popstate', this.handler);
  }
}
