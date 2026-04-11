import { App, PluginSettingTab, Setting } from "obsidian";
import type MaproomPlugin from "./main";

export interface MaproomSettings {
	maproomBinaryPath: string;
	embeddingProvider: "ollama" | "openai" | "google" | "none";
	ollamaUrl: string;
	openaiApiKey: string;
	googleProjectId: string;
}

export const DEFAULT_SETTINGS: MaproomSettings = {
	maproomBinaryPath: "maproom",
	embeddingProvider: "ollama",
	ollamaUrl: "http://localhost:11434",
	openaiApiKey: "",
	googleProjectId: "",
};

export class MaproomSettingTab extends PluginSettingTab {
	plugin: MaproomPlugin;

	private ollamaSection!: HTMLElement;
	private openaiSection!: HTMLElement;
	private googleSection!: HTMLElement;

	constructor(app: App, plugin: MaproomPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Maproom binary path")
			.setDesc(
				"Path to the maproom binary. Defaults to `maproom` (resolved from `PATH`). Use an absolute path if maproom is not on `PATH`.",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.maproomBinaryPath)
					.onChange(async (value) => {
						this.plugin.settings.maproomBinaryPath = value;
						await this.plugin.saveSettings();
					}),
			);

		/* eslint-disable obsidianmd/ui/sentence-case -- provider names are proper nouns */
		new Setting(containerEl)
			.setName("Embedding provider")
			.setDesc(
				"Select the embedding backend for semantic search. Choose `None` to use full-text search only.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("ollama", "Ollama")
					.addOption("openai", "OpenAI")
					.addOption("google", "Google Vertex AI")
					.addOption("none", "None")
					.setValue(this.plugin.settings.embeddingProvider)
					.onChange(async (value) => {
						this.plugin.settings.embeddingProvider =
							value as MaproomSettings["embeddingProvider"];
						await this.plugin.saveSettings();
						this.updateProviderVisibility();
					}),
			);
		/* eslint-enable obsidianmd/ui/sentence-case */

		const ollamaSetting = new Setting(containerEl)
			.setName("Ollama URL")
			.setDesc(
				"Base URL of the Ollama server. Default: `http://localhost:11434`",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.ollamaUrl)
					.onChange(async (value) => {
						this.plugin.settings.ollamaUrl = value;
						await this.plugin.saveSettings();
					}),
			);
		this.ollamaSection = ollamaSetting.settingEl;

		/* eslint-disable obsidianmd/ui/sentence-case -- OpenAI is a proper noun */
		const openaiSetting = new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc(
				"Your OpenAI API key. Stored in `data.json` \u2014 do not commit your vault's config directory to a public repository.",
			)
			.addText((text) => {
				text.inputEl.type = "password";
				text.setValue(this.plugin.settings.openaiApiKey).onChange(
					async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					},
				);
			});
		/* eslint-enable obsidianmd/ui/sentence-case */
		this.openaiSection = openaiSetting.settingEl;

		/* eslint-disable obsidianmd/ui/sentence-case -- Google Cloud and Vertex AI are proper nouns */
		const googleSetting = new Setting(containerEl)
			.setName("Google project ID")
			.setDesc(
				"Your Google Cloud project ID for Vertex AI embeddings.",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.googleProjectId)
					.onChange(async (value) => {
						this.plugin.settings.googleProjectId = value;
						await this.plugin.saveSettings();
					}),
			);
		/* eslint-enable obsidianmd/ui/sentence-case */
		this.googleSection = googleSetting.settingEl;

		this.updateProviderVisibility();
	}

	private updateProviderVisibility(): void {
		const provider = this.plugin.settings.embeddingProvider;

		this.ollamaSection.style.display =
			provider === "ollama" ? "" : "none";
		this.openaiSection.style.display =
			provider === "openai" ? "" : "none";
		this.googleSection.style.display =
			provider === "google" ? "" : "none";
	}
}
