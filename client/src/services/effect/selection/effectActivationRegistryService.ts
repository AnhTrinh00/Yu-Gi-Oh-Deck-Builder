import type {
  EffectActivationDefinition,
} from "../../../models/effect/EffectActivation";

export class EffectActivationRegistry {
  private definitions = new Map<
    string,
    EffectActivationDefinition
  >();

  register(
    definition: EffectActivationDefinition
  ): void {
    if (!definition.effectId.trim()) {
      throw new Error(
        "Activation effect ID is required."
      );
    }

    if (this.definitions.has(definition.effectId)) {
      throw new Error(
        `Activation definition already registered: ${definition.effectId}`
      );
    }

    this.definitions.set(
      definition.effectId,
      structuredClone(definition)
    );
  }

  get(
    effectId: string
  ): EffectActivationDefinition | undefined {
    const definition = this.definitions.get(effectId);

    return definition
      ? structuredClone(definition)
      : undefined;
  }

  has(effectId: string): boolean {
    return this.definitions.has(effectId);
  }

  remove(effectId: string): boolean {
    return this.definitions.delete(effectId);
  }

  clear(): void {
    this.definitions.clear();
  }

  getAll(): EffectActivationDefinition[] {
    return [...this.definitions.values()].map(
      (definition) => structuredClone(definition)
    );
  }
}