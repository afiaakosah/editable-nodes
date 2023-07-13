import { numberLiteralTypeAnnotation } from '@babel/types'
import { INodePath, makeINodePath } from './INodePath'

// nodeTypes returns a string array of the types available
export const nodeTypes: string[] = ['text', 'image', 'folder', 'temporal']

// Supported nodeTypes for file browser
export type NodeType = 'text' | 'image' | 'folder' | 'pdf' | 'temporal'

// INode with node metadata
export interface INode {
  type: NodeType // type of node that is created
  content: any // the content of the node
  filePath: INodePath // unique randomly generated ID which contains the type as a prefix
  nodeId: string // unique randomly generated ID which contains the type as a prefix
  title: string // user create node title
  dateCreated?: Date // date that the node was created
  originalHeight?: number // the orginal height of the image
  originalWidth?: number // the orginal width of the image
  newHeight?: number // the new (editted) height of the image
  newWidth?: number // the new (editted) width of the image
  canvasXYPos?: {x: number, y: number} | undefined // x co-ordinate for the freeform canvas view
}

/**
 * [Editable]: Since we want to store new metadata for images we should add
 * new metadata fields to our INode object. There are different ways you can do this.
 *
 * 1. One would be creating a new interface that extends INode.
 * You can have a look at IFolderNode to see how it is done.
 * 2. Another would be to add optional metadata to the INode object itself.
 *
 * Note: Do not forget to update the NodeFields type
 */

export type FolderContentType = 'list' | 'grid' | 'canvas'

export interface IFolderNode extends INode {
  viewType: FolderContentType
}

export type NodeFields = keyof INode | keyof IFolderNode

// Type declaration for map from nodeId --> INode
export type NodeIdsToNodesMap = { [nodeId: string]: INode }

/**
 * Function that creates an INode given relevant inputs
 * @param nodeId
 * @param path
 * @param children
 * @param type
 * @param title
 * @param content
 * @param canvasXYPos
 * @returns INode object
 */
export function makeINode(
  nodeId: string,
  path: string[],
  children: string[] = [],
  type: NodeType = 'text',
  title: string | null = null,
  content: any = null,
  canvasXYPos: {x: number, y: number},
): INode {
  return {
    nodeId: nodeId,
    title: title ?? 'node' + nodeId,
    type: type,
    content: content ?? 'content' + nodeId,
    filePath: makeINodePath(path, children),
    canvasXYPos: canvasXYPos ?? undefined,
  }
}

export function makeIFolderNode(
  nodeId: any,
  path: any,
  children?: any,
  type?: any,
  title?: any,
  content?: any,
  viewType?: any,
  canvasXYPos?: any,
): IFolderNode {
  return {
    content: content ?? 'content' + nodeId,
    filePath: makeINodePath(path, children),
    nodeId: nodeId,
    title: title ?? 'node' + nodeId,
    type: type ?? 'text',
    viewType: viewType ?? 'grid',
    canvasXYPos: canvasXYPos ?? undefined,
  }
}
