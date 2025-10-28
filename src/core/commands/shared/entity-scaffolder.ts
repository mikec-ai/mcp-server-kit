/**
 * Entity Scaffolder
 *
 * Facade for entity scaffolding using the orchestration pattern.
 * Delegates to ScaffoldOrchestrator + EntityScaffoldStrategy to eliminate duplication.
 */

import { ScaffoldOrchestrator } from "./orchestration/index.js";
import { EntityScaffoldStrategy } from "./strategies/entity-scaffold-strategy.js";
import type { ScaffoldConfig } from "./schemas.js";

// Re-export ScaffoldConfig type for external use
export type { ScaffoldConfig };

/**
 * Result of scaffolding operation
 */
export interface ScaffoldResult {
	/** Whether scaffolding was successful */
	success: boolean;
	/** Files that were created */
	filesCreated: string[];
	/** Whether entity was registered */
	registered: boolean;
	/** Any warnings or messages */
	messages: string[];
}

/**
 * Service for scaffolding MCP entities
 *
 * Facade that delegates to ScaffoldOrchestrator + EntityScaffoldStrategy.
 * This maintains the same public API while using the refactored architecture.
 */
export class EntityScaffolder {
	private orchestrator: ScaffoldOrchestrator<ScaffoldConfig, ScaffoldResult>;
	private strategy: EntityScaffoldStrategy;

	constructor() {
		this.orchestrator = new ScaffoldOrchestrator();
		this.strategy = new EntityScaffoldStrategy();
	}

	/**
	 * Scaffold a new entity
	 *
	 * @param cwd Current working directory (project root)
	 * @param config Scaffolding configuration
	 * @returns Result with created files and registration status
	 */
	async scaffold(cwd: string, config: ScaffoldConfig): Promise<ScaffoldResult> {
		// Delegate to orchestrator + strategy
		return this.orchestrator.scaffold(cwd, config, this.strategy);
	}

	/**
	 * Get emoji for entity type (for console output)
	 */
	static getEntityEmoji(entityType: "tool" | "prompt" | "resource"): string {
		switch (entityType) {
			case "tool":
				return "🔧";
			case "prompt":
				return "📝";
			case "resource":
				return "📦";
		}
	}

	/**
	 * Get entity type display name
	 */
	static getEntityDisplayName(
		entityType: "tool" | "prompt" | "resource",
	): string {
		return entityType.charAt(0).toUpperCase() + entityType.slice(1);
	}
}
