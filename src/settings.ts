export interface MaproomSettings {
	embeddingProvider: "ollama" | "openai" | "google" | "none";
	ollamaUrl: string;
	openaiApiKey: string;
	googleProjectId: string;
}

export const DEFAULT_SETTINGS: MaproomSettings = {
	embeddingProvider: "ollama",
	ollamaUrl: "http://localhost:11434",
	openaiApiKey: "",
	googleProjectId: "",
};
