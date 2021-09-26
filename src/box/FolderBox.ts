import { dom } from '../domAdapter'
import { renderManager } from '../RenderManager'
import { style } from '../styleAdapter'
import * as contextMenu from '../contextMenu'
import { Box } from './Box'
import { BoxMapData } from './BoxMapData'
import { FolderBoxHeader } from './FolderBoxHeader'
import { FolderBoxBody } from './FolderBoxBody'

export class FolderBox extends Box {
  private readonly body: FolderBoxBody

  public constructor(name: string, parent: FolderBox|null, mapData: BoxMapData, mapDataFileExists: boolean) {
    super(name, parent, mapData, mapDataFileExists)
    this.body = new FolderBoxBody(this)
  }

  protected createHeader(): FolderBoxHeader {
    return new FolderBoxHeader(this)
  }

  public isFolder(): boolean {
    return true
  }

  public isFile(): boolean {
    return false
  }

  protected getOverflow(): 'visible' {
    return 'visible'
  }

  protected async renderAdditional(): Promise<void> {
    if (this.isRendered()) {
      return
    }

    renderManager.addClassTo(super.getId(), style.getFolderBoxClass())
    dom.addEventListenerTo(this.getId(), 'contextmenu', (clientX: number, clientY: number) => contextMenu.openForFolderBox(this, clientX, clientY))
  }

  protected async unrenderAdditional(): Promise<void> {
    if (!this.isRendered()) {
      return
    }

    dom.removeEventListenerFrom(this.getId(), 'contextmenu')
  }

  protected async renderBody(): Promise<void> {
    await this.body.render()
  }

  protected async unrenderBody(): Promise<void> {
    await this.body.unrender()
  }

  public isBodyRendered(): boolean {
    return this.body.isRendered()
  }

  public getBox(id: string): Box {
    return this.body.getBox(id)
  }

  public getBoxes(): Box[] {
    return this.body.getBoxes()
  }

  public containsBox(box: Box): boolean {
    return this.body.containsBox(box)
  }

  public async addBox(box: Box): Promise<void> {
    return this.body.addBox(box)
  }

  public removeBox(box: Box): void {
    return this.body.removeBox(box)
  }

}
