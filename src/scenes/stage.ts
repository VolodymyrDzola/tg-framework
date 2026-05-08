// src/scenes/stage.ts
import { Composer, Middleware } from '../core/composer';
import { SceneContext, WizardScene } from './wizard';
import { SceneManager } from './scene-manager';

export class Stage<C extends SceneContext> extends Composer<C> {
  private scenes: Map<string, WizardScene<C>> = new Map();

  constructor(scenes: WizardScene<C>[] = []) {
    super();
    scenes.forEach(scene => this.register(scene));
  }

  public register(scene: WizardScene<C>): void {
    this.scenes.set(scene.name, scene);
  }

  public middleware(): Middleware<C> {
    const globalHandler = super.middleware();

    return async (ctx, next) => {
      // 1. Гідратуємо контекст менеджером сцен
      ctx.scene = new SceneManager(ctx);

      const activeSceneName = ctx.scene.session.name;

      // 2. Якщо користувач НЕ у сцені, передаємо подію глобальним обробникам бота
      if (!activeSceneName) {
        return globalHandler(ctx, next);
      }

      // 3. Якщо сцена активна, знаходимо її
      const scene = this.scenes.get(activeSceneName);

      if (!scene) {
        // Захист від битих сесій: якщо сцена видалена з коду, виходимо
        ctx.scene.leave();
        return globalHandler(ctx, next);
      }

      // 4. Передаємо керування активній сцені
      await scene.middleware()(ctx, next);
    };
  }
}