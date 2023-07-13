import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ILink, INode, IAnchor } from '../../../types'
import './VisualisationModal.scss'
import ReactFlow, { Edge } from 'react-flow-renderer'
import { Node } from 'react-flow-renderer'
import { FrontendAnchorGateway } from '../../../anchors'
import { FrontendLinkGateway } from '../../../links'
import { FrontendNodeGateway } from '../../../nodes'


/**
 * Props needed to render the visualisation modal. 
 */
export interface IVisualisationModalProps{
  isOpen: boolean
  currentNode: INode
  onClose: () => void
}

/**
 * Modal for visualising the current node and the nodes it has 
 * links to/from. Links are represented as edges between the nodes.
 */
export const VisualisationModal = (props: IVisualisationModalProps) => {
  const {isOpen, currentNode, onClose} = props

  //State Variables
  const [error, setError] = useState<string>('')
  const [nodes, setNodes] = useState(Array<Node>);
  const [edges, setEdges] = useState(Array<Edge>);
  //The nodes to be rendered
  const flowNodes: Array<Node> = []


  /**
   * A function that sets up the flow visualisation by centering the initial node
   * and setting up the other nodes and edges. 
   */
  const setUpFlow = async () => {
    //pushes the current node to the middle of the modal/flow diagram
    const middlePos = { x: 250, y: 25 }
    generateUniqueCoords()
    const initNode = createFlowNode(currentNode, middlePos)
    flowNodes.push(initNode)
    setUpEdges()
    setNodes(flowNodes)
  }


  /**
   * A helper function to turn a object of type ILink into a flow 
   * edge that can be understood as a link to React-Flow. 
   * 
   * @param link the link to the made into an edge. 
   */
  const createFlowEdge = async (link: ILink) => {
    const sourceAnchorResp = await FrontendAnchorGateway.getAnchor(link.anchor1Id)
    const targetAnchorResp = await FrontendAnchorGateway.getAnchor(link.anchor2Id)

    if(sourceAnchorResp.success && sourceAnchorResp.payload
      && targetAnchorResp.success && targetAnchorResp.payload){
      const sourceNodeId = sourceAnchorResp.payload.nodeId
      const targetNodeId = targetAnchorResp.payload.nodeId

      const flowEdge: Edge = {
      id: link.linkId,
      source: sourceNodeId,
      target: targetNodeId
      }
     return flowEdge
    }
  }


  /**
   * Sets up the edges for the visaualisation by getting the anchors on the node,
   * then getting the links from these anchors, turning  and then finally populating the 
   * array of flow edges to be rendered. 
   * 
   * It also gets each node from the link and adds it to the array of nodes to be rendered 
   * using a helper function. 
   */
  const setUpEdges = async () => {
    //gets the anchors on the current node
    const anchorsFromNodePromise = await FrontendAnchorGateway.getAnchorsByNodeId(
      currentNode.nodeId
    )

    let anchors: IAnchor[] = []

    if (anchorsFromNodePromise.success && anchorsFromNodePromise.payload) {
      anchors = anchorsFromNodePromise.payload
    }

    //gets each link promise (and puts them in an array) from the array of anchors
    const linkPromises = []
    for (let i = 0; i < anchors.length; i++) {
      linkPromises.push(FrontendLinkGateway.getLinksByAnchorId(anchors[i].anchorId))
    }
    const linkValues = await Promise.all(linkPromises)

    //an array for the edges (links)
    const flowEdges: Array<Edge> = []

    for (let i = 0; i < linkValues.length; i++) {
      const currAnchorLinks = linkValues[i].payload
      if (currAnchorLinks !== null) {
        for (let j = 0; j < currAnchorLinks.length; j++) {
          const currLink = currAnchorLinks[j]
          const flowEdgeResp = await createFlowEdge(currLink)

          if(flowEdgeResp){
            flowEdges.push(flowEdgeResp)
            addNodesFromLink(currLink)
          }
        }
      }
    }
    setEdges(flowEdges)
    setNodes(flowNodes)
  }


  /**
   * Turns the nodes from the inputted link into a flow node 
   * and checks if they are already part of the array before adding them
   * to the array of flow nodes to be rendered. 
   * 
   * @param link the link from which the nodes will be retrieved
   */
  const addNodesFromLink = async (link: ILink) => {
    //using this variable to make a unique position for each node
    let num = flowNodes.length

    const node1Resp = await FrontendNodeGateway.getNode(link.anchor1NodeId)
    if(node1Resp.success && node1Resp.payload){
      let node = node1Resp.payload
      //XYpositions for node
      let position = randCoords[num]
      let flowNode = createFlowNode(node, position)
      //add the node if it is not already in the array
      if(!flowNodes.includes(flowNode) && flowNode.id !== currentNode.nodeId){
        flowNodes.push(flowNode)
      }
    }

  const node2Resp =  await FrontendNodeGateway.getNode(link.anchor2NodeId)
    if(node2Resp.success && node2Resp.payload){
      let node = node2Resp.payload
      //XYposition for node to be added
      let position = randCoords[num]            
      let flowNode = createFlowNode(node, position)
      //add the node if it is not already in the array
      if(!flowNodes.includes(flowNode) && flowNode.id !== currentNode.nodeId){
        flowNodes.push(flowNode)
      }
    }

  }

  /**
   * Turns the inputted INode into a flow node by adding a position
   * to the node (using the inputted values), and a label. 
   * 
   * @param INode node to be transformed 
   * @param pos the position where the node will be rendered
   */
  const createFlowNode = (node: INode, pos: {x: number, y: number}) => {
    const flowNode: Node = {
      id: node.nodeId,
      data: {label: <div>{node.title}</div>},
      position: pos
    }
    return flowNode
  }

  //Random coordinates to be used to position the nodes
  const randCoords: Array<{ x: number; y: number }> = []
  //Number of coordinates to be generated
  const numberOfCoords: number = 10

  /**
   * Function to generate unique coordinates. It generates a unique number
   * between a certain range and of a particular multiple then populates 
   * the array of random coordinates. 
   */
  const generateUniqueCoords = () => {
    const xCoords: Array<number> = []
    const yCoords: Array<number> = []
    const maxXCoord: number = 700
    const maxYCoord: number = 600
    const minCoord: number = 10
    //using multiples to make sure nodes do not overlap
    const xMultiple: number = 50
    const yMultiple: number = 30

    const generateUniqueNumber = (maxNum: number, multiple: number, minNum: number) => {
      const random = Math.floor(Math.random() * (maxNum - minNum)) + minNum
      return Math.floor(random / multiple) * multiple
    }

    //populate the array for x coords
    while (xCoords.length < numberOfCoords) {
      const randX = generateUniqueNumber(maxXCoord, xMultiple, minCoord)
      if (!xCoords.includes(randX)) {
        xCoords.push(randX)
      }

      //populate the array for y coords
      while (yCoords.length < numberOfCoords) {
        const randY = generateUniqueNumber(maxYCoord, yMultiple, minCoord)
        if (!yCoords.includes(randY)) {
          yCoords.push(randY)
        }
      }
    }

    for (let i = 0; i < numberOfCoords; i++) {
      const xCoord = xCoords[i]
      const yCoord = yCoords[i]
      const xyCoord: { x: number; y: number } = { x: xCoord, y: yCoord }
      randCoords.push(xyCoord)
    }
  }


  /**
   * Resets the flow when the current node changes,
   */
  useEffect( () => {
    setUpFlow()
  }, [currentNode])


  /**
   * Closes the modal.
   */
  const handleClose = () => {
    onClose()
    setError('')
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size = 'xl'>
      <div className="modal-font">
        <ModalOverlay width={2500} height={750}/>
        <ModalContent width={2000} height={650}>
          <ModalHeader>Flow Visualisation:</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <span className="modal-title">
              <div className="modal-title-header">
               {`${currentNode.title}`}
              </div>
            </span>
          </ModalBody>
          <ReactFlow nodes={nodes} edges={edges} fitView />
          <ModalFooter>
            {error.length > 0 && <div className="modal-error">{error}</div>}
          </ModalFooter>
        </ModalContent>
      </div>
    </Modal>
  )

}
