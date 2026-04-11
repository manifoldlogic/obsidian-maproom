import { FileSystemAdapter, Platform, Plugin } from "obsidian";
import { MaproomService } from "./maproom-service";
import { SearchModal } from "./search-modal";
import { DEFAULT_SETTINGS, MaproomSettingTab, type MaproomSettings } from "./settings";
import { detectVaultContext, getStatusBarText, showPrerequisiteNotices, type VaultContext } from "./vault-context";

export default class MaproomPlugin extends Plugin {
	settings: MaproomSettings = DEFAULT_SETTINGS;
	vaultContext: VaultContext | null = null;
	service: MaproomService | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MaproomSettingTab(this.app, this));

		if (!Platform.isDesktopApp) return;
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) return;
		const vaultPath = adapter.getBasePath();
		this.vaultContext = await detectVaultContext(vaultPath, this.settings.maproomBinaryPath);
		showPrerequisiteNotices(this.vaultContext);

		const statusBarEl = this.addStatusBarItem();
		statusBarEl.setText(getStatusBarText(this.vaultContext));

		if (this.vaultContext) {
			this.service = new MaproomService(
				{ maproomBinaryPath: this.settings.maproomBinaryPath },
				this.vaultContext,
			);
		}

		this.addCommand({
			id: "search-vault",
			name: "Search vault",
			checkCallback: (checking: boolean) => {
				if (!this.service || !this.service.isAvailable()) {
					return false;
				}
				if (!checking) {
					new SearchModal(this.app, this.service).open();
				}
				return true;
			},
		});
	}

	onunload() {
		if (this.service) {
			this.service.destroy();
			this.service = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MaproomSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
