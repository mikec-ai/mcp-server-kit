/**
 * LRU Cache with TTL for OpenAPI specs and metadata
 */

interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

export class LRUCache<T> {
	private cache: Map<string, CacheEntry<T>>;
	private readonly maxSize: number;
	private readonly ttlMs: number;

	constructor(maxSize: number = 50, ttlMinutes: number = 60) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.ttlMs = ttlMinutes * 60 * 1000;
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return null;
		}

		// Move to end (most recently used)
		this.cache.delete(key);
		this.cache.set(key, entry);

		return entry.value;
	}

	set(key: string, value: T): void {
		// Remove if exists (to update position)
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		// If at max size, remove least recently used (first item)
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		// Add new entry
		this.cache.set(key, {
			value,
			timestamp: Date.now(),
		});
	}

	has(key: string): boolean {
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > this.ttlMs) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}

	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	// Clean up expired entries
	cleanup(): number {
		const now = Date.now();
		let cleaned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.ttlMs) {
				this.cache.delete(key);
				cleaned++;
			}
		}

		return cleaned;
	}
}

// Singleton cache instances
export const metadataCache = new LRUCache<any>(50, 60); // 50 items, 1 hour TTL
export const openApiCache = new LRUCache<any>(50, 60); // 50 specs, 1 hour TTL
export const promptCache = new LRUCache<any>(50, 60); // 50 prompts, 1 hour TTL
export const resourceCache = new LRUCache<any>(100, 30); // 100 resources, 30 min TTL
