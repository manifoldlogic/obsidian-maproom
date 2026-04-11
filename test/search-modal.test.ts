import { vi, describe, it, expect, beforeEach } from "vitest";
import type { App } from "obsidian";

vi.mock("obsidian", () => ({
	SuggestModal: class {
		app: unknown;
		constructor(app: unknown) {
			this.app = app;
		}
	},
	Notice: vi.fn(),
}));

import { Notice } from "obsidian";
import { MaproomSearchError, type MaproomService, type SearchResult } from "../src/maproom-service";
import { SearchModal } from "../src/search-modal";

function makeService(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		search: vi.fn(),
		isAvailable: vi.fn().mockReturnValue(true),
		destroy: vi.fn(),
		...overrides,
	} as unknown as MaproomService;
}

function makeApp() {
	return {
		workspace: { openLinkText: vi.fn() },
	} as unknown as App;
}

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
	return {
		filePath: "notes/test.md",
		score: 0.95,
		title: "Test Note",
		...overrides,
	};
}

function makeEl() {
	const children: Array<{ cls: string; text: string; setText: ReturnType<typeof vi.fn> }> = [];
	return {
		createDiv: vi.fn((opts: { cls: string }) => {
			const child = {
				cls: opts.cls,
				text: "",
				setText: vi.fn((t: string) => {
					child.text = t;
				}),
			};
			children.push(child);
			return child;
		}),
		children,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("SearchModal", () => {
	describe("getSuggestions()", () => {
		it("returns [] for empty query without calling search", async () => {
			const service = makeService();
			const modal = new SearchModal(makeApp(), service);

			const results = await modal.getSuggestions("");
			expect(results).toEqual([]);
			expect(service.search).not.toHaveBeenCalled();
		});

		it("returns [] for whitespace-only query without calling search", async () => {
			const service = makeService();
			const modal = new SearchModal(makeApp(), service);

			const results = await modal.getSuggestions("   ");
			expect(results).toEqual([]);
			expect(service.search).not.toHaveBeenCalled();
		});

		it("returns results from service.search for non-empty query", async () => {
			const expected = [makeResult(), makeResult({ filePath: "other.md", title: "Other" })];
			const service = makeService({
				search: vi.fn().mockResolvedValue(expected),
			});
			const modal = new SearchModal(makeApp(), service);

			const results = await modal.getSuggestions("test query");
			expect(results).toEqual(expected);
			expect(service.search).toHaveBeenCalledWith("test query");
		});

		it("returns [] and swallows CANCELLED error silently", async () => {
			const service = makeService({
				search: vi.fn().mockRejectedValue(
					new MaproomSearchError("CANCELLED", "Search was cancelled"),
				),
			});
			const modal = new SearchModal(makeApp(), service);

			const results = await modal.getSuggestions("test");
			expect(results).toEqual([]);
			expect(Notice).not.toHaveBeenCalled();
		});

		it.each(["BINARY_NOT_FOUND", "NON_ZERO_EXIT", "PARSE_ERROR", "TIMEOUT"] as const)(
			"returns [] and shows Notice for %s error",
			async (code) => {
				const service = makeService({
					search: vi.fn().mockRejectedValue(
						new MaproomSearchError(code, `Error: ${code}`),
					),
				});
				const modal = new SearchModal(makeApp(), service);

				const results = await modal.getSuggestions("test");
				expect(results).toEqual([]);
				expect(Notice).toHaveBeenCalledWith(expect.stringContaining("Maproom: "));
			},
		);
	});

	describe("renderSuggestion()", () => {
		it("renders title, path, and score", () => {
			const modal = new SearchModal(makeApp(), makeService());
			const el = makeEl();
			const result = makeResult({ score: 0.876 });

			modal.renderSuggestion(result, el as unknown as HTMLElement);

			expect(el.createDiv).toHaveBeenCalledWith({ cls: "maproom-result-title" });
			expect(el.createDiv).toHaveBeenCalledWith({ cls: "maproom-result-path" });
			expect(el.createDiv).toHaveBeenCalledWith({ cls: "maproom-result-score" });

			const titleDiv = el.children.find((c) => c.cls === "maproom-result-title");
			expect(titleDiv?.text).toBe("Test Note");

			const pathDiv = el.children.find((c) => c.cls === "maproom-result-path");
			expect(pathDiv?.text).toBe("notes/test.md");

			const scoreDiv = el.children.find((c) => c.cls === "maproom-result-score");
			expect(scoreDiv?.text).toBe("88");
		});

		it("renders snippet when present", () => {
			const modal = new SearchModal(makeApp(), makeService());
			const el = makeEl();
			const result = makeResult({ snippet: "a matching snippet" });

			modal.renderSuggestion(result, el as unknown as HTMLElement);

			const snippetDiv = el.children.find((c) => c.cls === "maproom-result-snippet");
			expect(snippetDiv).toBeDefined();
			expect(snippetDiv?.text).toBe("a matching snippet");
		});

		it("omits snippet when not present", () => {
			const modal = new SearchModal(makeApp(), makeService());
			const el = makeEl();
			const result = makeResult(); // no snippet

			modal.renderSuggestion(result, el as unknown as HTMLElement);

			const snippetDiv = el.children.find((c) => c.cls === "maproom-result-snippet");
			expect(snippetDiv).toBeUndefined();
		});
	});

	describe("onChooseSuggestion()", () => {
		it("opens the file via workspace.openLinkText", () => {
			const app = makeApp();
			const modal = new SearchModal(app, makeService());
			const result = makeResult({ filePath: "folder/note.md" });

			modal.onChooseSuggestion(result, {} as MouseEvent | KeyboardEvent);

			expect(app.workspace.openLinkText).toHaveBeenCalledWith("folder/note.md", "");
		});
	});
});
