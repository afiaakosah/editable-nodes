import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { pathToString, nodeTypeIcon } from '../../../../../../global'
import { selectedNodeState } from '../../../../../../global/Atoms'
import { FrontendNodeGateway } from '../../../../../../nodes'
import { INode, makeINodeProperty } from '../../../../../../types'
import { NodePreviewContent } from '../../NodePreview/NodePreviewContent'
import './CanvasViewItem.scss'

export interface CanvasViewItemProps {
  node: INode
}

/** 
 * Items (child nodes) of folder nodes that will be displayed
 * in canvas view of a folder node. 
*/
export const CanvasViewItem = (props: CanvasViewItemProps) => {
  const { node } = props
  const { type, title, content } = node

  //Recoil state management
  const setSelectedNode = useSetRecoilState(selectedNodeState)

  //State management of the node's position on the canvas
  const [nodeXYPosition, setNodeXYPosition] = useState<
    { x: number; y: number }
  >(node.canvasXYPos ?? {x: 0, y: 0})
  
  //State variable to track whether a node is being dragged
  const [isDragging, setIsDragging] = useState(false)

  //State variables for the mouse click's start position
  const [startX, setStartX] = useState<number>(0)
  const [startY, setStartY] = useState<number>(0)

  //Set the position of the node on load. 
  useEffect(() => {
    if (node.canvasXYPos) {
      setNodeXYPosition(node.canvasXYPos)
    }
  }, [])

  /**
   * Handle click on the node, sets dragging to true and retrieves info 
   * about the mouse position. 
   * 
   * @param e the mouse event
   */
  function handleMouseDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()

    setIsDragging(true)

    //Set the start position of the mouse
    setStartX(e.clientX)
    setStartY(e.clientY)

    console.log("startx,y", startX, startY)
    console.log('is dragging?', isDragging)

  }

  /**
   * Handles the movement of the node while dragging. Sets the node's 
   * new position to it's current position plus the delta of the mouse 
   * movement if the new position is within the bounds of the canvas. 
   * @param e the mouse event
   */
  function handleMouseMove(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isDragging) {
      console.log('in handle move')
      //The current mouse position
      const currX = e.clientX
      const currY = e.clientY

      //Variables to keep track of the detla of mouse movement
      let diffX = currX - startX
      let diffY = currY - startY
      setStartX(currX)
      setStartY(currY)
            
      //Set the node position
      if(nodeXYPosition){
        let newX = nodeXYPosition.x + diffX
        let newY = nodeXYPosition.y + diffY
        if(newX >= 0 && newY >= 0 && newX < 1500 && newY < 1500){
          setNodeXYPosition({ x: nodeXYPosition?.x + diffX , y: nodeXYPosition?.y + diffY})
        }
      }
    }
  }

  /**
   * Handles the lifting of the pointer; sets dragging to false,
   * updates the node's CanvasXYPos in the database.
   *
   * @param e the mouse event
   */
  async function handleMouseUp(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()

    setIsDragging(false)
    await updateNodePosDB()

    console.log('mouse up')
    console.log('dragging should be false', isDragging)

  }

  /**
   * Updates the XY-Position property of the node in the backend.
   */
  async function updateNodePosDB() {
    const nodeProperty = makeINodeProperty('canvasXYPos', nodeXYPosition)
    await FrontendNodeGateway.updateNode(node.nodeId, [nodeProperty])
  }

  return (
    <div
      className="node-Preview"
      style={{ left: nodeXYPosition?.x, top: nodeXYPosition?.y }}
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
    >
      <div className="content-preview">
        <NodePreviewContent type={type} content={content} />
      </div>
      <Link to={`/${pathToString(node.filePath)}`}>
        <div
          className="node-info"
          onClick={() => {
            setSelectedNode(node)
          }}
        >
          <div className="info-container">
            <div className="main-info">
              {nodeTypeIcon(node.type)}
              <div className="title">{title}</div>
            </div>
            <div className="sub-info">
              {node.dateCreated && (
                <div className="dateCreated">
                  {'Created on ' + new Date(node.dateCreated).toLocaleDateString('en-US')}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
