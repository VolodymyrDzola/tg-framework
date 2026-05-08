// src/scenes/scene-manager.ts

export interface SceneSessionData {
  name?: string; // Назва активної сцени
  step?: number; // Поточний крок (індекс)
  state?: Record<string, any>; // Тимчасові дані, які існують лише всередині сцени
}

export class SceneManager {
  constructor(private ctx: any) { }

  /**
   * Захищений доступ до системного об'єкта сесії сцени.
   */
  public get session(): SceneSessionData {
    this.ctx.session ??= {};
    this.ctx.session.__scene ??= {};
    return this.ctx.session.__scene;
  }

  /**
   * Сховище для тимчасових даних конкретної сцени.
   * Очищається при виході зі сцени.
   */
  public get state(): Record<string, any> {
    this.session.state ??= {};
    return this.session.state;
  }

  public set state(value: Record<string, any>) {
    this.session.state = value;
  }

  /**
   * Увійти в нову сцену
   * @param name Назва сцени
   * @param initialState Початковий стан (опціонально)
   */
  public enter(name: string, initialState: Record<string, any> = {}): void {
    this.ctx.session ??= {};
    this.ctx.session.__scene = {
      name,
      step: 0,
      state: initialState,
    };
  }

  /**
   * Вийти з поточної сцени (скидає FSM)
   */
  public leave(): void {
    if (this.ctx.session && this.ctx.session.__scene) {
      delete this.ctx.session.__scene;
    }
  }

  /**
   * Перейти на наступний крок у Wizard-сцені
   */
  public next(): void {
    if (this.session.step !== undefined) {
      this.session.step++;
    }
  }

  /**
   * Перейти на конкретний крок за його індексом
   */
  public selectStep(index: number): void {
    this.session.step = index;
  }
}