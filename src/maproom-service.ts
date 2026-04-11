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

// DEFAULT_SEARCH_TIMEOUT_MS is used by MaproomService (added in OBSDN-03.1002)
void DEFAULT_SEARCH_TIMEOUT_MS;
