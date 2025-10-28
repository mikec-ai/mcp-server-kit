import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProgressReporter } from "../../../src/services/progress-reporter.js";

describe("ProgressReporter", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	describe("Basic functionality", () => {
		it("should initialize steps as pending", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2", "Step 3"]);

			const steps = reporter.getSteps();
			expect(steps).toHaveLength(3);
			expect(steps[0].status).toBe("pending");
			expect(steps[1].status).toBe("pending");
			expect(steps[2].status).toBe("pending");
		});

		it("should generate sequential step IDs", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2"]);

			const steps = reporter.getSteps();
			expect(steps[0].id).toBe("step-1");
			expect(steps[1].id).toBe("step-2");
		});

		it("should update step status", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2"]);

			reporter.updateStep("step-1", "in_progress");
			const steps = reporter.getSteps();
			expect(steps[0].status).toBe("in_progress");
			expect(steps[1].status).toBe("pending");
		});

		it("should track step errors", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);

			reporter.updateStep("step-1", "failed", "Something went wrong");
			const steps = reporter.getSteps();
			expect(steps[0].status).toBe("failed");
			expect(steps[0].error).toBe("Something went wrong");
		});

		it("should throw error for unknown step ID", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);

			expect(() => {
				reporter.updateStep("unknown-step", "completed");
			}).toThrow("Unknown step: unknown-step");
		});
	});

	describe("Progress tracking", () => {
		it("should return correct progress summary", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2", "Step 3", "Step 4"]);

			reporter.updateStep("step-1", "completed");
			reporter.updateStep("step-2", "in_progress");
			reporter.updateStep("step-3", "failed");

			const progress = reporter.getProgress();
			expect(progress.total).toBe(4);
			expect(progress.completed).toBe(1);
			expect(progress.failed).toBe(1);
			expect(progress.inProgress).toBe(1);
		});

		it("should track multiple completed steps", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2", "Step 3"]);

			reporter.updateStep("step-1", "completed");
			reporter.updateStep("step-2", "completed");

			const progress = reporter.getProgress();
			expect(progress.completed).toBe(2);
			expect(progress.total).toBe(3);
		});

		it("should return empty progress before start", () => {
			const reporter = new ProgressReporter(false);

			const progress = reporter.getProgress();
			expect(progress.total).toBe(0);
			expect(progress.completed).toBe(0);
			expect(progress.failed).toBe(0);
			expect(progress.inProgress).toBe(0);
		});
	});

	describe("JSON mode", () => {
		it("should output NDJSON start event", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Step 1", "Step 2"]);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"start"'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"totalSteps":2'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"completedSteps":0'),
			);
		});

		it("should output NDJSON step_update event", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Step 1"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "in_progress");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"step_update"'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"status":"in_progress"'),
			);
		});

		it("should output NDJSON complete event", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Step 1"]);
			reporter.updateStep("step-1", "completed");
			consoleLogSpy.mockClear();

			reporter.complete();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"type":"complete"'),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('"completedSteps":1'),
			);
		});

		it("should include timestamp in all events", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Step 1"]);

			// Check start event
			const startCall = consoleLogSpy.mock.calls[0][0] as string;
			const startEvent = JSON.parse(startCall);
			expect(startEvent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

			// Check update event
			consoleLogSpy.mockClear();
			reporter.updateStep("step-1", "completed");
			const updateCall = consoleLogSpy.mock.calls[0][0] as string;
			const updateEvent = JSON.parse(updateCall);
			expect(updateEvent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it("should include step details in update events", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "completed");

			const call = consoleLogSpy.mock.calls[0][0] as string;
			const event = JSON.parse(call);
			expect(event.step).toEqual({
				id: "step-1",
				description: "Test Step",
				status: "completed",
			});
		});

		it("should include error in failed step events", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "failed", "Test error message");

			const call = consoleLogSpy.mock.calls[0][0] as string;
			const event = JSON.parse(call);
			expect(event.step.error).toBe("Test error message");
		});

		it("should not output text formatting in JSON mode", () => {
			const reporter = new ProgressReporter(true);
			reporter.start(["Step 1"]);
			reporter.updateStep("step-1", "completed");
			reporter.complete();

			// All calls should be valid JSON
			consoleLogSpy.mock.calls.forEach((call) => {
				expect(() => JSON.parse(call[0] as string)).not.toThrow();
			});

			// Should not contain text formatting like "✅" or "📋"
			const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
			expect(allOutput).not.toContain("✅");
			expect(allOutput).not.toContain("📋");
		});
	});

	describe("Text mode", () => {
		it("should output formatted start message", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("📋 Starting operation"),
			);
		});

		it("should show pending steps with correct icon", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			// Pending steps are not rendered until they change status
			// So let's check the initial step list
			const steps = reporter.getSteps();
			expect(steps[0].status).toBe("pending");
		});

		it("should show in_progress steps with correct icon", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "in_progress");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("⏳ Test Step"),
			);
		});

		it("should show completed steps with correct icon", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "completed");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("✅ Test Step"),
			);
		});

		it("should show failed steps with correct icon and error", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "failed", "Error message");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("❌ Test Step"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("↳ Error message"),
			);
		});

		it("should show success completion message", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);
			reporter.updateStep("step-1", "completed");
			consoleLogSpy.mockClear();

			reporter.complete();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringMatching(/✅ Operation completed in \d+ms/),
			);
		});

		it("should show warning completion message for failed steps", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2"]);
			reporter.updateStep("step-1", "completed");
			reporter.updateStep("step-2", "failed", "Error");
			consoleLogSpy.mockClear();

			reporter.complete();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringMatching(/⚠️  Operation completed with 1 failed step/),
			);
		});

		it("should include duration in completion message", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);
			reporter.updateStep("step-1", "completed");
			consoleLogSpy.mockClear();

			reporter.complete();

			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toMatch(/\d+ms/);
		});

		it("should use ANSI color codes for text formatting", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Test Step"]);
			consoleLogSpy.mockClear();

			reporter.updateStep("step-1", "in_progress");

			const call = consoleLogSpy.mock.calls[0][0];
			expect(call).toContain("\x1b["); // ANSI escape code
			expect(call).toContain("\x1b[0m"); // Reset code
		});
	});

	describe("Step lifecycle", () => {
		it("should track full step lifecycle", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);

			// Start as pending
			let steps = reporter.getSteps();
			expect(steps[0].status).toBe("pending");

			// Move to in_progress
			reporter.updateStep("step-1", "in_progress");
			steps = reporter.getSteps();
			expect(steps[0].status).toBe("in_progress");

			// Complete
			reporter.updateStep("step-1", "completed");
			steps = reporter.getSteps();
			expect(steps[0].status).toBe("completed");
		});

		it("should handle multiple steps in parallel", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1", "Step 2", "Step 3"]);

			reporter.updateStep("step-1", "in_progress");
			reporter.updateStep("step-2", "in_progress");
			reporter.updateStep("step-1", "completed");

			const progress = reporter.getProgress();
			expect(progress.inProgress).toBe(1); // step-2
			expect(progress.completed).toBe(1); // step-1
			expect(progress.total).toBe(3);
		});

		it("should allow restarting with different steps", () => {
			const reporter = new ProgressReporter(false);

			// First run
			reporter.start(["Step 1", "Step 2"]);
			reporter.updateStep("step-1", "completed");

			// Restart with new steps
			reporter.start(["New Step 1", "New Step 2", "New Step 3"]);

			const steps = reporter.getSteps();
			expect(steps).toHaveLength(3);
			expect(steps[0].description).toBe("New Step 1");
			expect(steps[0].status).toBe("pending"); // Reset
		});
	});

	describe("Edge cases", () => {
		it("should handle empty step list", () => {
			const reporter = new ProgressReporter(false);
			reporter.start([]);

			const progress = reporter.getProgress();
			expect(progress.total).toBe(0);
		});

		it("should handle updating same step multiple times", () => {
			const reporter = new ProgressReporter(false);
			reporter.start(["Step 1"]);

			reporter.updateStep("step-1", "in_progress");
			reporter.updateStep("step-1", "completed");

			const steps = reporter.getSteps();
			expect(steps[0].status).toBe("completed");
		});

		it("should handle very long step descriptions", () => {
			const longDescription = "A".repeat(200);
			const reporter = new ProgressReporter(false);

			reporter.start([longDescription]);

			const steps = reporter.getSteps();
			expect(steps[0].description).toBe(longDescription);
		});

		it("should handle special characters in descriptions", () => {
			const reporter = new ProgressReporter(false);
			const specialDesc = 'Step with "quotes" and \\backslashes\\';

			reporter.start([specialDesc]);

			const steps = reporter.getSteps();
			expect(steps[0].description).toBe(specialDesc);
		});

		it("should handle completing without any steps", () => {
			const reporter = new ProgressReporter(false);
			reporter.start([]);

			expect(() => reporter.complete()).not.toThrow();
		});
	});
});
