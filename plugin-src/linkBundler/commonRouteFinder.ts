/**
 * pluginFacade not used in imports because
 * some imports could not be resolved when importing from '../dist/pluginFacade' and cause:
 * "TypeError: Class extends value undefined is not a constructor or null"
 * TODO fix this!
 */
import { AbstractNodeWidget } from '../../dist/core/AbstractNodeWidget'
import { ClientRect } from '../../dist/core/ClientRect'
import { Box } from '../../dist/core/box/Box'
import { BoxWatcher } from '../../dist/core/box/BoxWatcher'
import { Link } from '../../dist/core/link/Link'
import { WayPointData } from '../../dist/core/mapData/WayPointData'
import { NodeWidget } from '../../dist/core/node/NodeWidget'
import { ClientPosition } from '../../dist/core/shape/ClientPosition'
import { Line } from '../../dist/core/shape/Line'
import { CommonRoute } from './CommonRoute'

export async function findLongestCommonRoute(link: Link): Promise<CommonRoute|undefined> {
	const {route, deepestBoxInFromPath, deepestBoxInToPath} = await findLongestCommonRouteWithWatchers(link)

	await Promise.all([
		deepestBoxInFromPath.unwatch(),
		deepestBoxInToPath.unwatch()
	])

	return route
}

export async function findLongestCommonRouteWithWatchers(link: Link): Promise<{
	route: CommonRoute|undefined
	deepestBoxInFromPath: BoxWatcher
	deepestBoxInToPath: BoxWatcher
}> {
	const commonRoutes: CommonRoute[] = []
	const deepestBoxInFromPath: BoxWatcher = (await findAndExtendCommonRoutes(link, 'from', commonRoutes)).deepestBoxInPath
	const deepestBoxInToPath: BoxWatcher = (await findAndExtendCommonRoutes(link, 'to', commonRoutes)).deepestBoxInPath

	let longestCommonRouteLength = 0
	for (const commonRoute of commonRoutes) {
		if (commonRoute.getLength() > longestCommonRouteLength) {
			longestCommonRouteLength = commonRoute.getLength()
		}
	}
	const longestCommonRoutes = commonRoutes.filter(route => route.getLength() >= longestCommonRouteLength)

	let longestCommonRoute = longestCommonRoutes[0]
	for (const commonRoute of longestCommonRoutes) {
		extendCommonRouteEndWithKnot(commonRoute, 'from')
		extendCommonRouteEndWithKnot(commonRoute, 'to')
		if (commonRoute.countEndKnots() > longestCommonRoute.countEndKnots() 
			//|| endKnotsCount equal && countEndLinkKnotsOfRoute(commonRoute) > countEndLinkKnotsOfRoute(longestCommonRoute) // TODO? would be optimization only
		) {
			longestCommonRoute = commonRoute
		}
	}

	return {
		route: longestCommonRoute,
		deepestBoxInFromPath,
		deepestBoxInToPath
	}
}

async function findAndExtendCommonRoutes(
	link: Link,
	end: 'from'|'to',
	commonRoutes: CommonRoute[]
): Promise<{deepestBoxInPath: BoxWatcher}> {
	// TODO: refactor this method
	const managingBox: Box = link.getManagingBox()
	const linkLine: {from: ClientPosition, to: ClientPosition} = await link.getLineInClientCoords()
	let path: WayPointData[] = link.getData()[end].path
	if (path[0].boxId === managingBox.getId()) {
		path = path.slice(1)
	}
	let waypoint: {node: Box|NodeWidget, watcher: BoxWatcher} = {node: managingBox, watcher: await BoxWatcher.newAndWatch(managingBox)}
	for (const waypointData of path) {
		if (!(waypoint.node instanceof Box)) {
			console.warn(`linkBundler.findAndExtendCommonRoutes(link: ${link.describe()}): waypoint.node is not instanceof Box, this should never happen`)
			break
		}
		const newWaypoint: {node: Box|NodeWidget, watcher: BoxWatcher} | undefined = await waypoint.node.findChildByIdAndRenderIfNecessary(waypointData.boxId)
		if (!newWaypoint) {
			console.warn(`linkBundler.findAndExtendCommonRoutes(link: ${link.describe()}): nodeWidget not found for waypointData with name '${waypointData.boxName}'`)
			break
		}
		waypoint.watcher.unwatch()
		waypoint = newWaypoint
		const waypointRect: ClientRect = await waypoint.node.getClientShape()
		const borderingLinks: Link[] = end === 'from'
			? waypoint.node.borderingLinks.getOutgoing()
			: waypoint.node.borderingLinks.getIngoing()
		for (const borderingLink of borderingLinks) {
			if (borderingLink === link) {
				continue
			}
			if (!canLinksBeBundled(linkLine, await borderingLink.getLineInClientCoords(), waypointRect)) {
				continue
			}
			const routeToExtend: {commonRoute: CommonRoute, connectingKnot?: NodeWidget} | undefined = findCommonRouteToExtend(commonRoutes, end, borderingLink, waypoint.node)
			const newCommonRoute = routeToExtend?.commonRoute
				? CommonRoute.newFromCopy(routeToExtend.commonRoute)
				: new CommonRoute([borderingLink], [], waypoint.node, waypoint.node, -1) // TODO: should this really start with -1?
			if (newCommonRoute.getEndLink(end) === borderingLink) {
				if (routeToExtend?.connectingKnot) {
					console.warn(`linkBundler.findAndExtendCommonRoutes(link: ${link.describe()}): connectingKnot although there is no new link`)
				}
				newCommonRoute.elongateWithWaypoint(end, waypoint.node)
			} else {
				if (!routeToExtend?.connectingKnot) {
					console.warn(`linkBundler.findAndExtendCommonRoutes(link: ${link.describe()}): connectingKnot is undefined although there is a new link`)
				}
				newCommonRoute.elongateWithLink(end, routeToExtend?.connectingKnot!, borderingLink, waypoint.node)
			}
			commonRoutes.unshift(newCommonRoute)
		}
	}
	return {deepestBoxInPath: waypoint.watcher}
}

/** TODO: do this with LocalPositions because ClientPositions may not work well when zoomed far away */
function canLinksBeBundled(
	linkLine: {from: ClientPosition, to: ClientPosition},
	otherLinkLine: {from: ClientPosition, to: ClientPosition},
	intersectionRect: ClientRect
): boolean {
	const elongationEpsilon: number = Math.sqrt(intersectionRect.width*intersectionRect.width + intersectionRect.height*intersectionRect.height) / 100
	linkLine = new Line(linkLine.from, linkLine.to).elongate(elongationEpsilon)
	otherLinkLine = new Line(otherLinkLine.from, otherLinkLine.to).elongate(elongationEpsilon)
	
	const intersections: ClientPosition[] = intersectionRect.calculateIntersectionsWithLine(linkLine)
	if (intersections.length === 0) {
		console.warn(`commonRouteFinder.canLinksBeBundled(.., linkLine: ${JSON.stringify(linkLine)}, intersectionRect: ${JSON.stringify(intersectionRect)}) intersections.length === 0, returning false`)
		return false
	}
	if (intersections.length !== 1) {
		console.warn(`commonRouteFinder.canLinksBeBundled(.., linkLine: ${JSON.stringify(linkLine)}, intersectionRect: ${JSON.stringify(intersectionRect)}) expected exactly one intersection with linkLine, but are ${intersections.length}`)
	}
	const otherIntersections: ClientPosition[] = intersectionRect.calculateIntersectionsWithLine(otherLinkLine)
	if (otherIntersections.length === 0) {
		console.warn(`commonRouteFinder.canLinksBeBundled(.., otherLinkLine: ${JSON.stringify(otherLinkLine)}, intersectionRect: ${JSON.stringify(intersectionRect)}) otherIntersections.length === 0, returning false`)
		return false
	}
	if (otherIntersections.length !== 1) {
		console.warn(`commonRouteFinder.canLinksBeBundled(.., otherLinkLine: ${JSON.stringify(otherLinkLine)}, intersectionRect: ${JSON.stringify(intersectionRect)}) expected exactly one intersection with otherLinkLine, but are ${otherIntersections.length}`)
	}
	const intersection: ClientPosition = intersections[0]
	const otherIntersection: ClientPosition = otherIntersections[0]
	const horizontalEpsilon: number = intersectionRect.width/100
	const verticalEpsilon: number = intersectionRect.height/100
	if (areNearlyEqual([intersectionRect.x, intersection.x, otherIntersection.x], horizontalEpsilon)) {
		return true
	}
	if (areNearlyEqual([intersectionRect.getRightX(), intersection.x, otherIntersection.x], horizontalEpsilon)) {
		return true
	}
	if (areNearlyEqual([intersectionRect.y, intersection.y, otherIntersection.y], verticalEpsilon)) {
		return true
	}
	if (areNearlyEqual([intersectionRect.getBottomY(), intersection.y, otherIntersection.y], verticalEpsilon)) {
		return true
	}
	return false
}

function areNearlyEqual(values: number[], epsilon: number): boolean {
	const value: number = values[0]
	for (let i = 1; i < values.length; i++) {
		if (Math.abs(value - values[i]) > epsilon) {
			return false
		}
	}
	return true
}

function findCommonRouteToExtend(commonRoutes: CommonRoute[], end: 'from'|'to', borderingLink: Link, waypoint: AbstractNodeWidget): {
	commonRoute: CommonRoute,
	connectingKnot?: NodeWidget
} | undefined {
	for (const route of commonRoutes) {
		const waypointInBorderingLink: boolean = borderingLink.from.isBoxInPath(waypoint) || borderingLink.to.isBoxInPath(waypoint)
		if (!waypointInBorderingLink) { // TODO: remove this as there is no change anymore of happening
			console.warn(`findCommonRouteToExtend(...) waypoint is not in borderingLink`)
			continue
		}
		const commonRouteEndLink: Link = route.getEndLink(end)
		const commonLinkContinues: boolean = commonRouteEndLink === borderingLink
		if (commonLinkContinues) {
			return {commonRoute: route}
		}
		const commonRouteEndNode: AbstractNodeWidget = route[end] // TODO: use getter
		if (commonRouteEndNode instanceof Box) {
			const knot = getKnotBetweenLinks(commonRouteEndLink, borderingLink, commonRouteEndNode)
			if (knot) {
				return {commonRoute: route, connectingKnot: knot} // TODO: there could be more than one result, return {commonRoute: route, connectingKnot: knot}[]?
			}
		} else {
			// TODO?
		}
	}
	return undefined
}

function getKnotBetweenLinks(link: Link, otherLink: Link, knotParent: Box): NodeWidget|undefined {
	return getKnotBetweenLinksDirected(link, otherLink, knotParent)
		|| getKnotBetweenLinksDirected(otherLink, link, knotParent)
}

function getKnotBetweenLinksDirected(link: Link, followUpLink: Link, knotParent: Box): NodeWidget|undefined {
	const linkToEndNodeId: string|undefined = link.getData().to.path.at(-1)?.boxId
	if (!linkToEndNodeId) {
		console.warn(`linkBundler.isKnotBetweenLinksDirected(link: ${link.describe()}, ..): link.getData().to.path is empty`)
		return undefined
	}
	const folloUpLinkFromEndNodeId: string|undefined = followUpLink.getData().from.path.at(-1)?.boxId
	if (!folloUpLinkFromEndNodeId) {
		console.warn(`linkBundler.isKnotBetweenLinksDirected(.., followUpLink: ${followUpLink.describe()}, ..): followUpLink.getData().from.path is empty`)
		return undefined
	}
	if (linkToEndNodeId !== folloUpLinkFromEndNodeId) {
		return undefined
	}
	return knotParent.nodes.getNodeById(linkToEndNodeId)
}

function extendCommonRouteEndWithKnot(route: CommonRoute, end: 'from'|'to'): void {
	const endNode: AbstractNodeWidget = route[end]
	if (!(endNode instanceof Box)) {
		return
	}
	const endLink: Link = route.getEndLink(end)
	const endKnot: NodeWidget|undefined = getKnotIfLinkEndConnected(endLink, end, endNode)
	if (endKnot) {
		route.elongateWithWaypoint(end, endKnot, {noLengthIncrement: true})
	}
}

export function getKnotIfLinkEndConnected(link: Link, end: 'from'|'to', knotParent: Box): NodeWidget|undefined {
	const targetWaypoint: WayPointData|undefined = link.getData()[end].path.at(-1)
	if (!targetWaypoint) {
		console.warn(`linkBundler.getKnotIfLinkEndConnected(link: ${link.describe()}, ..) link.getData().${end}.path is empty`)
		return undefined
	}
	return knotParent.nodes.getNodeById(targetWaypoint.boxId)
}
