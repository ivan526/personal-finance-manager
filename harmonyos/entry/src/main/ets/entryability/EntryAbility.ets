import { UIAbility, AbilityConstant, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { storage } from '../utils/storage'

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    // 初始化存储管理器
    storage.init(this.context)
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Main window is created, set main page for this ability
    windowStage.loadContent('pages/Dashboard', (err, data) => {
      if (err.code) {
        return;
      }
    });
  }
}
