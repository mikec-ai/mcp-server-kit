/**
 * Progress reporter for long-running CLI operations
 *
 * Provides real-time progress feedback in both JSON (NDJSON) and text modes.
 * Designed for AI agent consumption with structured, parseable output.
 */

export interface ProgressStep {
	id: string;
	description: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	error?: string;
}

export interface ProgressEvent {
	type: "start" | "step_update" | "complete";
	timestamp: string;
	step?: ProgressStep;
	totalSteps?: number;
	completedSteps?: number;
}

/**
 * Progress reporter for CLI operations
 *
 * JSON mode: Outputs NDJSON (newline-delimited JSON) events
 * Text mode: Outputs formatted progress with visual indicators
 */
export class ProgressReporter {
	private steps: Map<string, ProgressStep> = new Map();
	private startTime: number = 0;

	constructor(private jsonMode: boolean = false) {}

	/**
	 * Start progress tracking with a list of steps
	 */
	start(stepDescriptions: string[]): void {
		this.startTime = Date.now();
		this.steps.clear();

		// Initialize all steps as pending
		stepDescriptions.forEach((description, index) => {
			const id = `step-${index + 1}`;
			this.steps.set(id, {
				id,
				description,
				status: "pending",
			});
		});

		this.emitEvent({
			type: "start",
			timestamp: new Date().toISOString(),
			totalSteps: this.steps.size,
			completedSteps: 0,
		});

		if (!this.jsonMode) {
			console.log("\n📋 Starting operation...\n");
		}
	}

	/**
	 * Update the status of a specific step
	 */
	updateStep(
		stepId: string,
		status: ProgressStep["status"],
		error?: string,
	): void {
		const step = this.steps.get(stepId);
		if (!step) {
			throw new Error(`Unknown step: ${stepId}`);
		}

		step.status = status;
		if (error) {
			step.error = error;
		}

		this.emitEvent({
			type: "step_update",
			timestamp: new Date().toISOString(),
			step: { ...step },
			totalSteps: this.steps.size,
			completedSteps: this.getCompletedCount(),
		});

		if (!this.jsonMode) {
			this.renderTextStep(step);
		}
	}

	/**
	 * Mark operation as complete
	 */
	complete(): void {
		const duration = Date.now() - this.startTime;

		this.emitEvent({
			type: "complete",
			timestamp: new Date().toISOString(),
			totalSteps: this.steps.size,
			completedSteps: this.getCompletedCount(),
		});

		if (!this.jsonMode) {
			const failed = Array.from(this.steps.values()).filter(
				(s) => s.status === "failed",
			);
			if (failed.length === 0) {
				console.log(`\n✅ Operation completed in ${duration}ms\n`);
			} else {
				console.log(
					`\n⚠️  Operation completed with ${failed.length} failed step(s) in ${duration}ms\n`,
				);
			}
		}
	}

	/**
	 * Get current progress summary
	 */
	getProgress(): {
		total: number;
		completed: number;
		failed: number;
		inProgress: number;
	} {
		const steps = Array.from(this.steps.values());
		return {
			total: steps.length,
			completed: steps.filter((s) => s.status === "completed").length,
			failed: steps.filter((s) => s.status === "failed").length,
			inProgress: steps.filter((s) => s.status === "in_progress").length,
		};
	}

	/**
	 * Get all steps
	 */
	getSteps(): ProgressStep[] {
		return Array.from(this.steps.values());
	}

	/**
	 * Emit a progress event (NDJSON in JSON mode)
	 */
	private emitEvent(event: ProgressEvent): void {
		if (this.jsonMode) {
			console.log(JSON.stringify(event));
		}
	}

	/**
	 * Render a step in text mode
	 */
	private renderTextStep(step: ProgressStep): void {
		let icon: string;
		let color: string;

		switch (step.status) {
			case "pending":
				icon = "⏸️";
				color = "\x1b[90m"; // Gray
				break;
			case "in_progress":
				icon = "⏳";
				color = "\x1b[36m"; // Cyan
				break;
			case "completed":
				icon = "✅";
				color = "\x1b[32m"; // Green
				break;
			case "failed":
				icon = "❌";
				color = "\x1b[31m"; // Red
				break;
		}

		const reset = "\x1b[0m";
		console.log(`${color}${icon} ${step.description}${reset}`);

		if (step.error) {
			console.log(`   ${color}↳ ${step.error}${reset}`);
		}
	}

	/**
	 * Get count of completed steps
	 */
	private getCompletedCount(): number {
		return Array.from(this.steps.values()).filter(
			(s) => s.status === "completed",
		).length;
	}
}
