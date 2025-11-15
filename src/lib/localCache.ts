// Système de cache localStorage avec expiration automatique

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

const CACHE_PREFIX = 'moissonneurs_cache_';

export class LocalCache {
  /**
   * Sauvegarde des données dans le cache avec durée d'expiration
   * @param key - Clé unique du cache
   * @param data - Données à mettre en cache
   * @param expiresInMinutes - Durée de validité en minutes (défaut: 5)
   */
  static set<T>(key: string, data: T, expiresInMinutes: number = 5): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: expiresInMinutes * 60 * 1000,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Récupère des données du cache si elles sont encore valides
   * @param key - Clé du cache
   * @returns Les données ou null si expirées/inexistantes
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      // Vérifier si le cache est expiré
      if (now - entry.timestamp > entry.expiresIn) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove cache:', error);
    }
  }

  /**
   * Vide tout le cache de l'application
   */
  static clear(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Nettoie les entrées expirées du cache
   */
  static cleanup(): void {
    try {
      Object.keys(localStorage).forEach((fullKey) => {
        if (fullKey.startsWith(CACHE_PREFIX)) {
          const key = fullKey.replace(CACHE_PREFIX, '');
          // get() supprime automatiquement si expiré
          this.get(key);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup cache:', error);
    }
  }

  /**
   * Vérifie si une clé existe dans le cache et est valide
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Récupère avec fallback: essaie le cache puis appelle la fonction
   * @param key - Clé du cache
   * @param fetchFn - Fonction async pour récupérer les données
   * @param expiresInMinutes - Durée de validité
   */
  static async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    expiresInMinutes: number = 5
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, expiresInMinutes);
    return data;
  }
}

// Nettoyage automatique au démarrage
if (typeof window !== 'undefined') {
  LocalCache.cleanup();
}
