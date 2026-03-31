import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type MaproomSettings } from "./settings";

export default class MaproomPlugin extends Plugin {
	settings: MaproomSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
	}

	onunload() {
		// cleanup
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
