/**
 * Test Specification Types
 *
 * Defines the declarative YAML/JSON test format for MCP integration tests.
 *
 * Design: Fully portable, no project-specific dependencies
 */

/**
 * Assertion type definitions
 */
export type Assertion =
	| SuccessAssertion
	| ErrorAssertion
	| ContainsTextAssertion
	| NotContainsTextAssertion
	| ResponseTimeAssertion
	| JsonPathAssertion
	| RegexMatchAssertion
	| SnapshotAssertion
	| JsonSchemaAssertion;

export interface SuccessAssertion {
	type: "success";
}

export interface ErrorAssertion {
	type: "error";
	/** Optional text that error message should contain */
	messageContains?: string;
}

export interface ContainsTextAssertion {
	type: "contains_text";
	text: string;
	/** Case insensitive matching (default: false) */
	caseInsensitive?: boolean;
}

export interface NotContainsTextAssertion {
	type: "not_contains_text";
	text: string;
	/** Case insensitive matching (default: false) */
	caseInsensitive?: boolean;
}

export interface ResponseTimeAssertion {
	type: "response_time_ms";
	/** Maximum response time in milliseconds */
	max: number;
}

export interface JsonPathAssertion {
	type: "json_path";
	/** JSON path expression (e.g., "$.apis[0].name") */
	path: string;
	/** Expected value at path (optional - if omitted, just checks path exists) */
	expected?: any;
}

export interface RegexMatchAssertion {
	type: "regex_match";
	/** Regex pattern to match against response text */
	pattern: string;
	/** Regex flags (e.g., "i" for case-insensitive) */
	flags?: string;
}

export interface SnapshotAssertion {
	type: "snapshot";
	/** Snapshot file name (relative to snapshotDir) */
	file: string;
	/** Fields to ignore in comparison (e.g., ["timestamp", "requestId"]) */
	ignoreFields?: string[];
}

export interface JsonSchemaAssertion {
	type: "json_schema";
	/** JSON Schema file path (relative to contractDir) */
	schema: string;
}

/**
 * Test specification format
 *
 * This is the structure agents will write in YAML/JSON format.
 */
export interface TestSpec {
	/** Test name (human-readable) */
	name: string;

	/** Test description (optional, for documentation) */
	description?: string;

	/** MCP tool name to test */
	tool: string;

	/** Arguments to pass to the tool */
	arguments: Record<string, any>;

	/** Assertions to verify the response */
	assertions: Assertion[];

	/** Test-specific timeout override (milliseconds) */
	timeout?: number;

	/** Skip this test */
	skip?: boolean;

	/** Only run this test (exclusive) */
	only?: boolean;
}

/**
 * Test suite specification
 *
 * Groups multiple test specs together.
 */
export interface TestSuiteSpec {
	/** Suite name */
	name: string;

	/** Suite description */
	description?: string;

	/** List of test spec file paths or inline test specs */
	tests: (string | TestSpec)[];

	/** Setup steps before suite runs */
	setup?: {
		/** Server URL override */
		serverUrl?: string;
	};
}
