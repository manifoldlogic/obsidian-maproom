import { execFile, type ChildProcess } from "child_process";
import type { VaultContext } from "./vault-context";

export interface SearchResult {
	filePath: string;
	score: number;
	title: string;
	snippet?: string;
}

/** Timeout for the Maproom CLI search process. Not user-configurable in v0.1.0. */
const DEFAULT_SEARCH_TIMEOUT_MS = 10_000;

export interface MaproomServiceConfig {
	maproomBinaryPath: string;
}

export type MaproomSearchErrorCode =
	| "BINARY_NOT_FOUND"
	| "NON_ZERO_EXIT"
	| "PARSE_ERROR"
	| "TIMEOUT"
	| "CANCELLED";

export class MaproomSearchError extends Error {
	readonly code: MaproomSearchErrorCode;
	readonly stderr?: string;

	constructor(code: MaproomSearchErrorCode, message: string, stderr?: string) {
		super(message);
		this.name = "MaproomSearchError";
		this.code = code;
		this.stderr = stderr;
	}
}

function parseCliOutput(stdout: string): SearchResult[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		throw new MaproomSearchError("PARSE_ERROR", `Failed to parse Maproom CLI output as JSON: ${stdout.slice(0, 200)}`);
	}
	if (!Array.isArray(parsed)) {
		throw new MaproomSearchError("PARSE_ERROR", `Expected JSON array from Maproom CLI, got: ${typeof parsed}`);
	}
	return parsed.map((item: unknown, index: number) => {
		if (typeof item !== "object" || item === null) {
			throw new MaproomSearchError("PARSE_ERROR", `Result at index ${index} is not an object`);
		}
		const r = item as Record<string, unknown>;
		if (typeof r.filePath !== "string" || typeof r.score !== "number" || typeof r.title !== "string") {
			throw new MaproomSearchError("PARSE_ERROR", `Result at index ${index} missing required fields`);
		}
		return {
			filePath: r.filePath,
			score: r.score,
			title: r.title,
			snippet: typeof r.snippet === "string" ? r.snippet : undefined,
		};
	});
}

export class MaproomService {
	private readonly config: MaproomServiceConfig;
	private readonly vaultContext: VaultContext;
	private activeProcess: ChildProcess | null = null;
	private searchWasCancelled = false;

	constructor(config: MaproomServiceConfig, vaultContext: VaultContext) {
		this.config = config;
		this.vaultContext = vaultContext;
	}

	isAvailable(): boolean {
		return this.vaultContext.maproomAvailable && this.vaultContext.isGitRepo && this.vaultContext.databaseExists;
	}

	async search(query: string): Promise<SearchResult[]> {
		// Kill any in-flight search (supersession)
		if (this.activeProcess) {
			this.searchWasCancelled = true;
			try { this.activeProcess.kill(); } catch { /* already exited */ }
		}

		// Reset flag for new spawn
		this.searchWasCancelled = false;

		return new Promise<SearchResult[]>((resolve, reject) => {
			const proc = execFile(
				this.config.maproomBinaryPath,
				["search", "--json", query],
				{
					cwd: this.vaultContext.gitRoot!,
					timeout: DEFAULT_SEARCH_TIMEOUT_MS,
					maxBuffer: 5 * 1024 * 1024,
				},
				(error, stdout) => {
					this.activeProcess = null;

					if (error) {
						// Order matters — check cancellation first
						if (this.searchWasCancelled) {
							reject(new MaproomSearchError("CANCELLED", "Search was cancelled"));
							return;
						}
						if ((error as { code?: string }).code === "ENOENT") {
							reject(new MaproomSearchError("BINARY_NOT_FOUND", `Maproom binary not found at: ${this.config.maproomBinaryPath}`));
							return;
						}
						if (error.killed) {
							reject(new MaproomSearchError("TIMEOUT", `Maproom search timed out after ${DEFAULT_SEARCH_TIMEOUT_MS}ms`));
							return;
						}
						if (error.code !== null) {
							reject(new MaproomSearchError("NON_ZERO_EXIT", `Maproom exited with code ${error.code}: ${error.message}`, error.message));
							return;
						}
						reject(new MaproomSearchError("PARSE_ERROR", `Unexpected error: ${error.message}`));
						return;
					}

					try {
						resolve(parseCliOutput(stdout));
					} catch (e: unknown) {
						reject(e instanceof Error ? e : new MaproomSearchError("PARSE_ERROR", String(e)));
					}
				},
			);
			this.activeProcess = proc;
		});
	}

	destroy(): void {
		if (this.activeProcess) {
			this.searchWasCancelled = true;
			try { this.activeProcess.kill(); } catch { /* already exited */ }
			this.activeProcess = null;
		}
	}
}
