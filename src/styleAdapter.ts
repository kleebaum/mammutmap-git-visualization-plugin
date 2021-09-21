
interface Style {
  getHighlightBoxClass(): string
  getFileBoxClass(): string
  getFolderBoxClass(): string
  getBoxBorderLineClass(mapDataFileExisting: boolean): string
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

  public getBoxBorderLineClass(mapDataFileExisting: boolean): string {
    if (mapDataFileExisting) {
      return 'boxBorderLine'
    } else {
      return 'boxBorderLineNoMapData'
    }
  }

  public getHighlightClass(): string {
    return 'highlight'
  }

  public getLinkColor(): string {
    return '#2060c0'
  }

}

export const style: Style = new DarkTheme()
