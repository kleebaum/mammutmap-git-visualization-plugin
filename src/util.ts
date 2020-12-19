import * as dom from './domAdapter'
import * as fs from 'fs'
import { Dirent, promises as fsPromises } from 'fs'

export function logInfo(message: string): void {
    log('Info: ' + message, 'grey')
}

export function logWarning(message: string): void {
    log('WARNING: ' + message, 'orange')
}

export function logError(message: string): never {
    log('ERROR: ' + message, 'red')
    throw new Error(message)
}

async function log(message: string, color: string): Promise<void> {
  console.log(message)
  let division: string = '<div style="color:' + color + '">' + escapeForHtml(message) + '</div>'
  await dom.addContentTo('log', division)
  dom.scrollToBottom('log')
}

export function stringify(object: any): string {
  var stringifiedObject: string = object + ': '
  for (var key in object) {
    //if(typeof rect[key] !== 'function') {
      stringifiedObject += key + '=' + object[key] + '; '
    //}
  }
  return stringifiedObject
}

export function readdirSync(path: string): Dirent[] {
  return fs.readdirSync(path, { withFileTypes: true })
}

export function readFile(path: string): Promise<string> {
  return fsPromises.readFile(path, 'utf-8')
}

export function readFileAndConvertToHtml(path: string, callback: (dataConvertedToHtml: string) => void): void|never {
  fs.readFile(path, 'utf-8', (err: NodeJS.ErrnoException | null, data: string) => {
    if(err) {
      logError('util::readFile, ' + path + ', ' + err.message)
    } else {
      callback(escapeForHtml(data))
    }
  })
}

export function escapeForHtml(text: string): string {
  var content: string = '';
  for (let i = 0; i < text.length; i++) {
    // TODO this is maybe very inefficient
    content += escapeCharForHtml(text[i])
  }
  return content
}

function escapeCharForHtml(c: string): string {
  switch (c) {
    case '\\':
      return '&#92;'
    case '\n':
      return '<br/>'
    case '\'':
      return '&#39;'
    case '"':
      return '&quot;'
    case '<':
      return '&lt;'
    case '>':
      return '&gt;'
    case '&':
      return '&amp'
    default:
      return c
  }
}

export async function writeFile(path: string, data: string): Promise<void> {
  let directory = ''
  const fileEntries: string[] = path.split('/')
  for (let i = 0; i < fileEntries.length - 1; i++) {
    directory += fileEntries[i] + '/'
  }

  await fsPromises.mkdir(directory, {recursive: true})
  return fsPromises.writeFile(path, data)
}