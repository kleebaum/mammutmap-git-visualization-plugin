
interface Style {
  getHighlightBoxClass(): string
  getFileBoxClass(): string
  getFolderBoxClass(): string
  getFileBoxHeaderClass(): string
  getFolderBoxHeaderClass(): string
  getBoxBorderLineClass(mapDataFileExisting: boolean): string
  getHorizontalResizeClass(): string
  getVerticalResizeClass(): string
  getDiagonalResizeClass(): string
  getHighlightClass(): string
  getLinkColor(): string
}

class DarkTheme implements Style {

  public getHighlightBoxClass(): string {
    return 'highlightBox'
  }

  public getFileBoxClass(): string {
    return 'fileBox'
  }

  public getFolderBoxClass(): string {
    return 'folderBox'
  }

  public getFileBoxHeaderClass(): string {
    return 'fileBoxHeader'
  }

  public getFolderBoxHeaderClass(): string {
    return 'folderBoxHeader'
  }

  public getBoxBorderLineClass(mapDataFileExisting: boolean): string {
    if (mapDataFileExisting) {
      return 'boxBorderLine'
    } else {
      return 'boxBorderLineNoMapData'
    }
  }

  public getHorizontalResizeClass(): string {
    return 'ewResize'
  }
  public getVerticalResizeClass(): string {
    return 'nsResize'
  }
  public getDiagonalResizeClass(): string {
    return 'nwseResize'
  }

  public getHighlightClass(): string {
    return 'highlight'
  }

  public getLinkColor(): string {
    return '#2060c0'
  }

}

export let style: Style = new DarkTheme()
