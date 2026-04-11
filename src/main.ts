import { FileSystemAdapter, Platform, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MaproomSettingTab, type MaproomSettings } from "./settings";
import { detectVaultContext, showPrerequisiteNotices, type VaultContext } from "./vault-context";

export default class MaproomPlugin extends Plugin {
	settings: MaproomSettings = DEFAULT_SETTINGS;
	vaultContext: VaultContext | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MaproomSettingTab(this.app, this));

		if (!Platform.isDesktopApp) return;
		const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
		this.vaultContext = await detectVaultContext(vaultPath, this.settings.maproomBinaryPath);
		showPrerequisiteNotices(this.vaultContext);
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
