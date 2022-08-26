import { style } from '../styleAdapter'
import { renderManager } from '../RenderManager'
import { MenuItemFile } from './MenuItemFile'
import { MenuItemWidget } from './MenuItemWidget'

export class MenuItemFileWidget extends MenuItemWidget<MenuItemFile> {

    protected formHtml(): string {
        return this.menuItem.label
    }

    protected async afterRender(): Promise<void> {
        await Promise.all([
            renderManager.addClassTo(this.getId(), style.getApplicationMenuItemClass('File')),
            renderManager.addEventListenerTo(this.getId(), 'click', () => this.menuItem.click())
        ])
    }

    protected beforeUnrender(): Promise<void> {
        return renderManager.removeEventListenerFrom(this.getId(), 'click')
    }

}