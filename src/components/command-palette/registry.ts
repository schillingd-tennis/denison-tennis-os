import {
  normalizeCommand,
  type CommandDefinition,
  type CommandProvider,
} from "./types";

type ProviderCache = {
  commands: CommandDefinition[];
  fetchedAt: number;
  inflight?: Promise<CommandDefinition[]>;
};

const DEFAULT_TTL_MS = 60_000;

/**
 * Global command registry — modules call `registerCommand` /
 * `registerProvider` so universal search stays open to future surfaces
 * without hard-coding their entries in the UI.
 *
 * Providers are cached in memory so reopening the palette stays fast.
 */
class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private providers = new Map<string, CommandProvider>();
  private providerCache = new Map<string, ProviderCache>();

  registerCommand(command: CommandDefinition): () => void {
    const normalized = normalizeCommand(command);
    this.commands.set(normalized.id, normalized);
    return () => {
      this.commands.delete(normalized.id);
    };
  }

  registerCommands(commands: CommandDefinition[]): () => void {
    const unsubscribers = commands.map((command) => this.registerCommand(command));
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }

  registerProvider(provider: CommandProvider): () => void {
    this.providers.set(provider.id, provider);
    this.providerCache.delete(provider.id);
    return () => {
      this.providers.delete(provider.id);
      this.providerCache.delete(provider.id);
    };
  }

  /** Drop provider caches (e.g. after a local DB reset). */
  invalidateProviderCache(providerId?: string): void {
    if (providerId) {
      this.providerCache.delete(providerId);
      return;
    }
    this.providerCache.clear();
  }

  listStatic(): CommandDefinition[] {
    return [...this.commands.values()].filter((command) => command.enabled?.() !== false);
  }

  private async loadProvider(provider: CommandProvider): Promise<CommandDefinition[]> {
    const ttl = provider.cacheTtlMs ?? DEFAULT_TTL_MS;
    const cached = this.providerCache.get(provider.id);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < ttl) {
      return cached.commands;
    }
    if (cached?.inflight) {
      return cached.inflight;
    }

    const inflight = Promise.resolve(provider.getCommands())
      .then((commands) => commands.map(normalizeCommand))
      .then((commands) => {
        this.providerCache.set(provider.id, {
          commands,
          fetchedAt: Date.now(),
        });
        return commands;
      })
      .catch((error) => {
        this.providerCache.delete(provider.id);
        throw error;
      });

    this.providerCache.set(provider.id, {
      commands: cached?.commands ?? [],
      fetchedAt: cached?.fetchedAt ?? 0,
      inflight,
    });

    return inflight;
  }

  /**
   * Resolve static + provider commands. Uses warm cache when available so
   * palette open stays near-instant after the first load.
   */
  async resolveAll(): Promise<CommandDefinition[]> {
    const dynamic = await Promise.all(
      [...this.providers.values()].map(async (provider) => {
        try {
          return await this.loadProvider(provider);
        } catch {
          return this.providerCache.get(provider.id)?.commands ?? [];
        }
      }),
    );

    const merged = new Map<string, CommandDefinition>();
    for (const command of this.listStatic()) {
      merged.set(command.id, command);
    }
    for (const batch of dynamic) {
      for (const command of batch) {
        if (command.enabled?.() === false) continue;
        merged.set(command.id, command);
      }
    }
    return [...merged.values()];
  }

  /**
   * Instant snapshot: static commands + any still-fresh provider cache.
   * Used to paint the palette under ~100ms while a background refresh runs.
   */
  peekResolved(): CommandDefinition[] {
    const merged = new Map<string, CommandDefinition>();
    for (const command of this.listStatic()) {
      merged.set(command.id, command);
    }
    const now = Date.now();
    for (const provider of this.providers.values()) {
      const cached = this.providerCache.get(provider.id);
      const ttl = provider.cacheTtlMs ?? DEFAULT_TTL_MS;
      if (!cached || now - cached.fetchedAt >= ttl) continue;
      for (const command of cached.commands) {
        if (command.enabled?.() === false) continue;
        merged.set(command.id, command);
      }
    }
    return [...merged.values()];
  }

  /** Prefetch provider indexes in the background (idle warm). */
  warm(): void {
    void this.resolveAll();
  }
}

export const commandRegistry = new CommandRegistry();
