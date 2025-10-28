/**
 * Orchestration Pattern Exports
 *
 * Strategy Pattern + Template Method implementation for scaffolding operations.
 * Eliminates ~600 lines of duplicated orchestration code across scaffolders.
 */

export { ScaffoldOrchestrator } from "./scaffold-orchestrator.js";
export type {
	ScaffoldStrategy,
	ScaffoldContext,
	ScaffoldOptions,
} from "./types.js";
