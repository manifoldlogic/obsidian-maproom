import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MaproomSettingTab, type MaproomSettings } from "./settings";

export default class MaproomPlugin extends Plugin {
	settings: MaproomSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MaproomSettingTab(this.app, this));
	}

	onunload() {
		// cleanup
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MaproomSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
