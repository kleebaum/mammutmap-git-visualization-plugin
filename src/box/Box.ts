import * as util from '../util'
import * as dom from '../domAdapter'
import { Path } from '../Path'
import { BoxMapData } from './BoxMapData'
import { Rect } from '../Rect'
import { DragManager } from '../DragManager'
import { DirectoryBox } from './DirectoryBox'
import { BoxBorder } from './BoxBorder'

export abstract class Box {
  private readonly path: Path
  private readonly id: string
  private parent: DirectoryBox|null
  private mapData: BoxMapData = BoxMapData.buildDefault()
  private unsavedChanges: boolean = false
  private dragOffset: {x: number, y: number} = {x:0 , y:0} // TODO: move into DragManager and let DragManager return calculated position of box (instead of pointer)
  private draggingInProgress: boolean = false
  private readonly border: BoxBorder

  public constructor(path: Path, id: string, parent: DirectoryBox|null) {
    this.path = path
    this.id = id
    this.parent = parent
    this.border = new BoxBorder(this)
  }

  public getPath(): Path {
    return this.path
  }

  public getMapDataFilePath(): string {
    return this.getPath().getMapPath() + '.json'
  }

  public getId(): string {
    return this.id
  }

  public getHeaderId(): string {
    return this.getId() + 'header'
  }

  public getParent(): DirectoryBox|never {
    if (this.parent == null) {
      util.logError('Box.getParent() cannot be called on root.')
    }
    return this.parent
  }

  public async getClientRect(): Promise<Rect> {
    // TODO: cache rect for better responsivity?
    // TODO: but then more complex, needs to be updated on many changes, also when parent boxes change
    return await dom.getClientRectOf(this.getId())
  }

  public render(): void {
    this.loadAndProcessMapData()
    this.renderHeader()
    this.border.render()
    this.renderBody()
  }

  private async loadAndProcessMapData():Promise<void> {
    if (!this.getPath().isRoot()) {
      await util.readFile(this.getMapDataFilePath())
        .then(json => this.mapData = BoxMapData.buildFromJson(json))
        .catch(error => util.logWarning('failed to load ' + this.getMapDataFilePath() + ': ' + error))
    }
    await this.renderStyle()
  }

  private async saveMapData(): Promise<void> {
    const mapDataFilePath: string = this.getMapDataFilePath()
    await util.writeFile(mapDataFilePath, this.mapData.toJson())
      .then(() => util.logInfo('saved ' + mapDataFilePath))
      .catch(error => util.logWarning('failed to save ' + mapDataFilePath + ': ' + error))
  }

  protected renderStyle(): Promise<void> {
    let basicStyle: string = 'display:inline-block;position:absolute;overflow:' + this.getOverflow() + ';'
    let scaleStyle: string = 'width:' + this.mapData.width + '%;height:' + this.mapData.height + '%;'
    let positionStyle: string = 'left:' + this.mapData.x + '%;top:' + this.mapData.y + '%;'

    return dom.setStyleTo(this.getId(), basicStyle + scaleStyle + positionStyle + this.getPointerEventsStyle() + this.getAdditionalStyle())
  }

  private getPointerEventsStyle(): string {
    if (this.draggingInProgress) {
      return 'pointer-events: none;'
    } else {
      return 'pointer-events: auto;'
    }
  }

  protected abstract getOverflow(): 'hidden'|'visible'

  protected abstract getAdditionalStyle(): string|null

  private async renderHeader(): Promise<void> {
    let headerElement: string = '<div id="' + this.getHeaderId() + '" draggable="true" style="background-color:skyblue;">' + this.getPath().getSrcName() + '</div>'
    await dom.setContentTo(this.getId(), headerElement)

    DragManager.addDraggable(this) // TODO: move to other method
  }

  public getDraggableId(): string {
    return this.getHeaderId()
  }

  public async dragStart(clientX: number, clientY: number): Promise<void> {
    let clientRect: Rect = await this.getClientRect()
    this.dragOffset = {x: clientX - clientRect.x, y: clientY - clientRect.y}

    this.draggingInProgress = true
    this.renderStyle()
  }

  public async drag(clientX: number, clientY: number, dropTarget: DirectoryBox): Promise<void> {
    let parent: DirectoryBox = this.getParent() // TODO: cache
    let parentClientRect: Rect = await parent.getClientRect()

    if (parent != dropTarget) {
      const oldParent: DirectoryBox = parent
      const oldParentClientRect: Rect = parentClientRect
      parent = dropTarget
      this.parent = dropTarget
      parentClientRect = await parent.getClientRect()

      oldParent.removeBox(this)
      parent.addBox(this)

      this.mapData.width *= oldParentClientRect.width / parentClientRect.width
      this.mapData.height *= oldParentClientRect.height / parentClientRect.height
    }

    this.mapData.x = (clientX - parentClientRect.x - this.dragOffset.x) / parentClientRect.width * 100
    this.mapData.y = (clientY - parentClientRect.y - this.dragOffset.y) / parentClientRect.height * 100

    this.renderStyle()
  }

  public async dragCancel(): Promise<void> {
    this.dragEnd() // TODO: reset position instead
  }

  public async dragEnd(): Promise<void> {
    this.draggingInProgress = false
    this.renderStyle()
    this.saveMapData()
  }

  public async updateMeasures(measuresInPercentIfChanged: {x?: number, y?: number, width?: number, height?: number}): Promise<void> {
    if (measuresInPercentIfChanged.x != null) {
      this.mapData.x = measuresInPercentIfChanged.x
    }
    if (measuresInPercentIfChanged.y != null) {
      this.mapData.y = measuresInPercentIfChanged.y
    }
    if (measuresInPercentIfChanged.width != null) {
      this.mapData.width = measuresInPercentIfChanged.width
    }
    if (measuresInPercentIfChanged.height != null) {
      this.mapData.height = measuresInPercentIfChanged.height
    }

    this.renderStyle()
  }

  protected abstract renderBody(): void

  /*private renderBody(): void {
    util.addContentTo(this.getId(), this.formBody())
  }

  protected abstract formBody(): string*/

}