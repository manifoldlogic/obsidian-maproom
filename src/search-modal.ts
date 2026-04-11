import { App, Notice, SuggestModal } from "obsidian";
import { MaproomSearchError, type MaproomService, type SearchResult } from "./maproom-service";

export class SearchModal extends SuggestModal<SearchResult> {
	private service: MaproomService;

	constructor(app: App, service: MaproomService) {
		super(app);
		this.service = service;
	}

	async getSuggestions(query: string): Promise<SearchResult[]> {
		if (query.trim() === "") {
			return [];
		}
		try {
			return await this.service.search(query);
		} catch (error: unknown) {
			if (error instanceof MaproomSearchError) {
				if (error.code === "CANCELLED") {
					return [];
				}
				new Notice(`Maproom: ${error.message}`);
				return [];
			}
			console.error("[maproom] unexpected search failure", error);
			new Notice("Maproom: Search failed unexpectedly");
			return [];
		}
	}

	renderSuggestion(result: SearchResult, el: HTMLElement): void {
		const titleEl = el.createDiv({ cls: "maproom-result-title" });
		titleEl.setText(result.title);

		const pathEl = el.createDiv({ cls: "maproom-result-path" });
		pathEl.setText(result.filePath);

		if (result.snippet) {
			const snippetEl = el.createDiv({ cls: "maproom-result-snippet" });
			snippetEl.setText(result.snippet);
		}

		const scoreEl = el.createDiv({ cls: "maproom-result-score" });
		scoreEl.setText(String(Math.round(result.score * 100)));
	}

	onChooseSuggestion(item: SearchResult, _evt: MouseEvent | KeyboardEvent): void {
		void this.app.workspace.openLinkText(item.filePath, "");
	}
}
