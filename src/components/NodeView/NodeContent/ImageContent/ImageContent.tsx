import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fa from 'react-icons/fa'
import { fetchLinks } from '..'
import { useHistory } from 'react-router-dom'
import './ImageContent.scss'
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'
import {
  selectedNodeState,
  selectedAnchorsState,
  selectedExtentState,
  currentNodeState,
  startAnchorState,
  refreshLinkListState,
} from '../../../../global/Atoms'
import { FrontendAnchorGateway } from '../../../../anchors'
import { FrontendNodeGateway } from '../../../../nodes'
import {
  Extent,
  failureServiceResponse,
  IAnchor,
  IImageExtent,
  INode,
  INodeProperty,
  isIImageExtent,
  makeINodeProperty,
  NodeFields,
} from '../../../../types'
import './ImageContent.scss'

/** The content of an image node, including any anchors */
export const ImageContent = () => {
  const startAnchor = useRecoilValue(startAnchorState)

  // recoil state management
  const currentNode = useRecoilValue(currentNodeState)
  const refreshLinkList = useRecoilValue(refreshLinkListState)
  const [selectedAnchors, setSelectedAnchors] = useRecoilState(selectedAnchorsState)
  const [selectedExtent, setSelectedExtent] = useRecoilState(selectedExtentState)

  const content = currentNode.content

  /* State variable to keep track of anchors rendered on image */
  const [imageAnchors, setImageAnchors] = useState<JSX.Element[]>([])
  const [startAnchorVisualization, setStartAnchorVisualization] = useState<JSX.Element>()

  let dragging: boolean = false // Indicates whether we are currently dragging the image

  let currentTop: number // To store the top of the currently selected region for onPointerMove
  let currentLeft: number // To store the left of the currently selected region for onPointerMove

  let xLast: number
  let yLast: number

  let initX: number // initial x location of the pointer
  let initY: number // initial y location of the pointer

  /**
   * useRef Here is an example of use ref to store a mutable html object
   * The selection ref is how we can access the selection that we render
   */
  const imageContainer = useRef<HTMLHeadingElement>(null)

  /* This is how we can access currently selected region for making links */
  const selection = useRef<HTMLHeadingElement>(null)

  // local states for editted height and width of images
  const [newHeight, setNewHeight] = useState<number>(currentNode.newHeight ?? currentNode.originalHeight ?? 0)
  const [newWidth, setNewWidth] = useState<number>(currentNode.newWidth ?? currentNode.originalWidth ?? 0)

  /**
   * State variable to keep track of the currently selected anchor IDs
   * Use: Compare with selectedAnchors to update previous state
   */
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<string[]>([])
  const history = useHistory()

  /**
   * Handle click on anchor that is displayed on image
   * Single click: Select the anchor
   * Double click: Navigate to the opposite node
   */
  const handleAnchorSelect = async (e: React.MouseEvent, anchor: IAnchor) => {
    e.stopPropagation()
    e.preventDefault()
    switch (e.detail) {
      // Left click to set selected anchors
      case 1:
        setSelectedAnchors && setSelectedAnchors([anchor])
        setSelectedExtent(anchor.extent)
        break
      // Double click to navigate to node
      case 2:
        const links = await fetchLinks(anchor.anchorId)
        if (links.length > 0) {
          if (links[0].anchor1Id !== anchor.anchorId) {
            history.push(`/${links[0].anchor1NodeId}/`)
            const anchor1 = await FrontendAnchorGateway.getAnchor(links[0].anchor1Id)
            if (anchor1.success && anchor1.payload) {
              setSelectedAnchors([anchor1.payload])
              setSelectedExtent(anchor1.payload.extent)
            }
          } else if (links[0].anchor2Id !== anchor.anchorId) {
            history.push(`/${links[0].anchor2NodeId}/`)
            const anchor2 = await FrontendAnchorGateway.getAnchor(links[0].anchor2Id)
            if (anchor2.success && anchor2.payload) {
              setSelectedAnchors([anchor2.payload])
              setSelectedExtent(anchor2.payload.extent)
            }
          }
        }
        break
    }
  }

  const displaySelectedAnchors = useCallback(() => {
    selectedAnchorIds.forEach((anchorId) => {
      const prevSelectedAnchor = document.getElementById(anchorId)
      if (prevSelectedAnchor) {
        prevSelectedAnchor.style.backgroundColor = ''
      }
    })
    if (imageContainer.current) {
      imageContainer.current.style.outline = ''
    }
    const newSelectedAnchorIds: string[] = []
    selectedAnchors &&
      selectedAnchors.forEach((anchor) => {
        if (anchor) {
          if (anchor.extent === null && imageContainer.current) {
            imageContainer.current.style.outline = 'solid 5px #d7ecff'
          }
          const anchorElement = document.getElementById(anchor.anchorId)
          if (anchorElement) {
            anchorElement.style.backgroundColor = '#d7ecff'
            anchorElement.style.opacity = '60%'
            newSelectedAnchorIds.push(anchorElement.id)
          }
        }
      })
    setSelectedAnchorIds(newSelectedAnchorIds)
  }, [selectedAnchorIds, selectedAnchors, startAnchor])

  /**
   * To trigger on load and when we setSelectedExtent
   */
  useEffect(() => {
    setSelectedExtent && setSelectedExtent(null)
    if (selection.current) {
      selection.current.style.left = '-50px'
      selection.current.style.top = '-50px'
      selection.current.style.width = '0px'
      selection.current.style.height = '0px'
    }
  }, [setSelectedExtent, refreshLinkList])

  useEffect(() => {
    displaySelectedAnchors()
  }, [selectedAnchors, refreshLinkList])

  useEffect(() => {
    displayImageAnchors()
  }, [selectedAnchors, currentNode, refreshLinkList, startAnchor])

  /**
   * onPointerDown initializes the selection
   * @param e
   */
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging = true
    // The y location of the image top in the browser
    const imageTop = imageContainer.current?.getBoundingClientRect().top
    // The x location of the image left in the browser
    const imageLeft = imageContainer.current?.getBoundingClientRect().left

    const x = e.clientX // The x location of the pointer in the browser
    const y = e.clientY // The y location of the poitner in the browser
    xLast = e.clientX
    yLast = e.clientY
    if (selection.current && imageLeft && imageTop) {
      selection.current.style.left = String(x - imageLeft) + 'px'
      selection.current.style.top = String(y - imageTop) + 'px'
      currentLeft = x - imageLeft
      currentTop = y - imageTop
      selection.current.style.width = '0px'
      selection.current.style.height = '0px'
    }
  }

  /**
   * onPointerMove resizes the selection
   * @param e
   */
  const onPointerMove = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragging) {
      const x = e.clientX // The x location of the pointer in the browser
      const y = e.clientY // The y location of the poitner in the browser
      const deltaX = x - xLast // The change in the x location
      const deltaY = y - yLast // The change in the y location
      xLast = e.clientX
      yLast = e.clientY
      if (selection.current) {
        const imageTop = imageContainer.current?.getBoundingClientRect().top
        const imageLeft = imageContainer.current?.getBoundingClientRect().left
        let left = parseFloat(selection.current.style.left)
        let top = parseFloat(selection.current.style.top)
        let width = parseFloat(selection.current.style.width)
        let height = parseFloat(selection.current.style.height)

        // You may need to change this depending on your screen resolution
        const divider = 1

        // Horizontal dragging
        // Case A: Dragging above start point
        if (imageLeft && x - imageLeft < currentLeft) {
          width -= deltaX / divider
          left += deltaX / divider
          selection.current.style.left = String(left) + 'px'
          // Case B: Dragging below start point
        } else {
          width += deltaX / divider
        }

        // Vertical dragging
        // Case A: Dragging to the left of start point
        if (imageTop && y - imageTop < currentTop) {
          height -= deltaY / divider
          top += deltaY / divider
          selection.current.style.top = String(top) + 'px'
          // Case B: Dragging to the right of start point
        } else {
          height += deltaY / divider
        }

        // Update height and width
        selection.current.style.width = String(width) + 'px'
        selection.current.style.height = String(height) + 'px'
      }
    }
  }

  /**
   * onPointerUp so we have completed making our selection,
   * therefore we should create a new IImageExtent and
   * update the currently selected extent
   * @param e
   */
  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging = false
    if (selection.current) {
      currentTop = 0
      currentLeft = 0
      const extent: IImageExtent = {
        type: 'image',
        height: parseFloat(selection.current.style.height),
        left: parseFloat(selection.current.style.left),
        top: parseFloat(selection.current.style.top),
        width: parseFloat(selection.current.style.width),
      }
      // Check if setSelectedExtent exists, if it does then update it
      if (setSelectedExtent) {
        setSelectedExtent(extent)
      }
    }
  }

  const onHandleClearSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (setSelectedExtent) {
      setSelectedExtent(null)
      if (selection.current) {
        // Note: This is a rather hacky solution to hide the selected region
        selection.current.style.left = '-50px'
        selection.current.style.top = '-50px'
        selection.current.style.width = '0px'
        selection.current.style.height = '0px'
      }
    }
  }

  useEffect(() => {
    // this code ensures that an extent selected on one node doesn't display on another node
    setSelectedExtent(null)
    if (selection.current) {
      // Note: This is a rather hacky solution to hide the selected region
      selection.current.style.left = '-50px'
      selection.current.style.top = '-50px'
      selection.current.style.width = '0px'
      selection.current.style.height = '0px'
    }
    // this code visualizes the start anchor
    if (
      startAnchor != null &&
      startAnchor != undefined &&
      startAnchor.nodeId == currentNode.nodeId &&
      startAnchor.extent?.type == 'image'
    ) {
      setStartAnchorVisualization(
        <div
          id={'startAnchor'}
          key={'image.startAnchor'}
          className="image-anchor"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          style={{
            height: startAnchor.extent?.height,
            left: startAnchor.extent.left,
            top: startAnchor.extent.top,
            width: startAnchor.extent.width,
          }}
        />
      )
    } else {
      setStartAnchorVisualization(<div></div>)
    }
  }, [currentNode, startAnchor])

  /* Changes the width and height state variables when the 
    container's dimentions change.*/
  useEffect(() => {
    const containerHeight = imageContainer.current?.style.height
    const containerWidth = imageContainer.current?.style.width
    if (containerWidth && containerHeight) {
      const h = parseFloat(containerHeight)
      const w = parseFloat(containerWidth)
      setNewHeight(h)
      setNewWidth(w)
    }
  }, [imageContainer.current?.style.width, imageContainer.current?.style.height])


  /**
   * Prepares for resizing when the user clicks down.
   *
   * @param e the mouse event
   */
  const imageResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging = true

    const x = e.clientX // The x location of the mouse
    const y = e.clientY // The y location of the mouse

    initX = x // update the initial x position on click
    initY = y // update the initial y position on click

    document.removeEventListener('pointermove', imageResizePointerMove)
    document.addEventListener('pointermove', imageResizePointerMove)
    document.removeEventListener('pointerup', imageResizePointerUp)
    document.addEventListener('pointerup', imageResizePointerUp)
  }

  /**
   * Resizes the images when the mouse is dragged
   * @param e the mouse event
   */
  const imageResizePointerMove = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (dragging) {
      const x = e.clientX // The x location of the pointer in the browser
      const y = e.clientY // The y location of the poitner in the browser
      const deltaX = x - initX // The change in the x location
      const deltaY = y - initY // The change in the y location
      initX = e.clientX // reset the start x
      initY = e.clientY // reset the start y 

      if (imageContainer.current) {
        const contianerHeight = imageContainer.current.style.height
        const height = parseFloat(contianerHeight)

        const containerWidth = imageContainer.current.style.width
        const width = parseFloat(containerWidth)

        const newWidth = width + deltaX
        const newHeight = height + deltaY

        if (
          newWidth < (currentNode.originalWidth ?? 1000) &&
          newHeight < (currentNode.originalHeight ?? 1000) &&
          newHeight > 1 &&
          newWidth > 1
        ) {
          imageContainer.current.style.width = newWidth.toString() + 'px'
          imageContainer.current.style.height = newHeight.toString() + 'px'
        }
      }
    }
  }

  /**
   * When the user has completed making their selection, creates an
   * IImageExtent and updates the currently selected extent.
   * @param e the mouse event
   */
  const imageResizePointerUp = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging = false

    if (imageContainer.current?.style.width && imageContainer.current?.style.height) {
      const width = parseFloat(imageContainer.current.style.width)
      const height = parseFloat(imageContainer.current.style.height)
      setNewHeight(height)
      setNewWidth(width)
    }
  }


  /**
   * Updates the image container's dimensions and the state variables,
   * newWidth and newHeight, every time the node changes.
   */
  useEffect(() => {
    if (imageContainer.current) {
      imageContainer.current.style.width = currentNode.newWidth?.toString() || currentNode.originalWidth?.toString() || "0"
      imageContainer.current.style.height = currentNode.newHeight?.toString() || currentNode.originalHeight?.toString() || "0"
      if(currentNode.newHeight && currentNode.newWidth ){
        setNewWidth(currentNode.newWidth)
        setNewHeight(currentNode.newHeight)
      } else if (currentNode.originalHeight && currentNode.originalWidth){
        setNewHeight(currentNode.originalHeight)
        setNewWidth(currentNode.originalWidth)
      }
    }
  }, [currentNode])

  /**
   * Helper to update the image's properties in the backend.
   *
   * @param fieldName the field that will be updated
   * @param newFieldAttribute the new value of the field
   */
  const handleUpdateImageDimension = async (
    fieldName: NodeFields,
    newFieldAttribute: number
  ) => {
    const nodeProperty: INodeProperty = makeINodeProperty(fieldName, newFieldAttribute)
    const sizeUpdateResp = await FrontendNodeGateway.updateNode(currentNode.nodeId, [
      nodeProperty,
    ])
    if (!sizeUpdateResp.success) {
      return failureServiceResponse('Could not update image field.')
    }  
  }

  /**
   * Updates the image's properties in the backend whenever
   * the image is cropped.
   */
  useEffect(() => {
    handleUpdateImageDimension("newWidth", newWidth)
    handleUpdateImageDimension("newHeight", newHeight)
  }, [
    newWidth, newHeight
  ])

  /**
   * This method displays the existing anchors. We are fetching them from
   * the data with a call to FrontendAnchorGateway.getAnchorsByNodeId
   * which returns a list of IAnchors that are on currentNode
   */
  const displayImageAnchors = async (): Promise<void> => {
    let imageAnchors: IAnchor[]
    const anchorsFromNode = await FrontendAnchorGateway.getAnchorsByNodeId(
      currentNode.nodeId
    )
    if (anchorsFromNode.success && anchorsFromNode.payload) {
      const anchorElementList: JSX.Element[] = []
      // List of anchor elements to return
      imageAnchors = anchorsFromNode.payload
      // IAnchor array from FrontendAnchorGateway call
      imageAnchors.forEach((anchor) => {
        // Checking that the extent is of type image to access IImageExtent
        if (anchor.extent?.type == 'image') {
          if (
            !(
              startAnchor &&
              startAnchor.extent?.type == 'image' &&
              startAnchor == anchor &&
              startAnchor.nodeId == currentNode.nodeId
            )
          ) {
            anchorElementList.push(
              <div
                id={anchor.anchorId}
                key={'image.' + anchor.anchorId}
                className="image-anchor"
                onClick={(e) => {
                  handleAnchorSelect(e, anchor)
                }}
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                style={{
                  height: anchor.extent.height,
                  left: anchor.extent.left,
                  top: anchor.extent.top,
                  width: anchor.extent.width,
                }}
              />
            )
          }
        }
      })
      if (
        startAnchor &&
        startAnchor.extent?.type == 'image' &&
        startAnchor.nodeId == currentNode.nodeId
      ) {
        anchorElementList.push(
          <div
            id={startAnchor.anchorId}
            key={'image.startAnchor' + startAnchor.anchorId}
            className="image-startAnchor"
            style={{
              height: startAnchor.extent.height,
              left: startAnchor.extent.left,
              top: startAnchor.extent.top,
              width: startAnchor.extent.width,
            }}
          />
        )
      }
      setImageAnchors(anchorElementList)
    }
  }


  return (
    <div className="imageWrapper">
      <button
        onClick={() => {
          setNewWidth(currentNode.originalWidth ?? 200)
          setNewHeight(currentNode.originalHeight ?? 200)
        }}
        className={'textEditorButton'}
      >
        Revert Crop
      </button>
      <div
        ref={imageContainer}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        style={{ width: newWidth, height: newHeight }}
        className="imageContent-wrapper"
      >
        <div
          className="imageResizer"
          onPointerDown={imageResizePointerDown}
          // onPointerUp={imageResizePointerUp}
          // onPointerMove={imageResizePointerMove}
        />

        {startAnchorVisualization}
        {imageAnchors}
        {
          <div className="selection" ref={selection}>
            <div
              onClick={onHandleClearSelectionClick}
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="selection-close"
            >
              <fa.FaTimes />
            </div>
          </div>
        }
        <img src={content} />
      </div>
    </div>
  )
  
}
