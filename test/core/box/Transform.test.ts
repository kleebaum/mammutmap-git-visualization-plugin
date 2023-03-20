import { mock } from 'jest-mock-extended'
import { Transform } from '../../../src/core/box/Transform'
import { ClientPosition } from '../../../src/core/shape/ClientPosition'
import { LocalPosition } from '../../../src/core/shape/LocalPosition'
import { BoxData } from '../../../src/core/mapData/BoxData'
import { FolderBox } from '../../../src/core/box/FolderBox'
import { ClientRect } from '../../../src/core/ClientRect'

test('localToClientPosition', async () => {
  const result: ClientPosition = await setupScenario().transform.localToClientPosition(new LocalPosition(50, 50))
  expect(result.x).toBe(700)
  expect(result.y).toBe(400)
})

test('getNearestGridPositionOfOtherTransform', async () => {
  const scenario = setupScenario()
  const result: LocalPosition = await setupScenario().transform.getNearestGridPositionOfOtherTransform(new ClientPosition(609, 354), scenario.otherTransform)
  expect(result.percentX).toBeCloseTo(26.5, 10)
  expect(result.percentY).toBeCloseTo(27, 10)
})

test('getNearestGridPositionOf rounds to multiple of 4', () => {
  const result: LocalPosition = setupScenario().transform.getNearestGridPositionOf(new LocalPosition(3, 78.1))
  expect(result.percentX).toBe(4)
  expect(result.percentY).toBe(80)
})

function setupScenario(): {transform: Transform, otherTransform: Transform} {
  const box: FolderBox = new FolderBox('src/box', null, mock<BoxData>(), false)
  box.getClientRect = () => Promise.resolve(new ClientRect(500, 300, 400, 200))
  const otherBox: FolderBox = new FolderBox('src/box/other', null, mock<BoxData>(), false)
  otherBox.getClientRect = () => Promise.resolve(new ClientRect(550, 350, 200, 100))

  return {transform: box.transform, otherTransform: otherBox.transform}
}