import React, { useEffect, useState } from 'react'
import { INode, makeINodeProperty } from '../../../../../types'
import './CanvasView.scss'
import { FrontendNodeGateway } from '../../../../../nodes'
import { CanvasViewItem } from './CanvasViewItem'

export interface ICanvasViewProps {
  childNodes: INode[]
}

/** Full page view focused on a node's content, with annotations and links */
export const CanvasView = (props: ICanvasViewProps) => {
  const { childNodes } = props

  /*
   * Iterate through the child nodes to create each 
   * canvas view item. 
  */
  const canvasNodes = childNodes.map(
    (childNode: INode) =>
      childNode && <CanvasViewItem node={childNode} key={childNode.nodeId} />
  )

  return (
    <div
      className={'canvasView-wrapper'}
    >
      <div className="container"></div>
      <div
        className="canvas-Nodes"
      >
        {canvasNodes}
      </div>
    </div>
  )
}
