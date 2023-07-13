import { Link } from '@tiptap/extension-link'
import { Editor, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { linkSync } from 'fs'
import React, { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { markAsUntransferable } from 'worker_threads'
import { FrontendAnchorGateway } from '../../../../anchors'
import {
  alertMessageState,
  alertOpenState,
  alertTitleState,
  currentNodeState,
  refreshAnchorState,
  refreshLinkListState,
  refreshState,
  selectedAnchorsState,
  selectedExtentState,
  startAnchorState,
} from '../../../../global/Atoms'
import { FrontendLinkGateway } from '../../../../links'
import { FrontendNodeGateway } from '../../../../nodes'
import {
  Extent,
  failureServiceResponse,
  IAnchor,
  ILink,
  INodeProperty,
  IServiceResponse,
  ITextExtent,
  makeINodeProperty,
  successfulServiceResponse,
} from '../../../../types'
import './TextContent.scss'
import { TextMenu } from './TextMenu'

interface ITextContentProps {}

/** The content of an text node, including all its anchors */
export const TextContent = (props: ITextContentProps) => {
  const currentNode = useRecoilValue(currentNodeState)
  const [refresh, setRefresh] = useRecoilState(refreshState)
  const [anchorRefresh, setAnchorRefresh] = useRecoilState(refreshAnchorState)
  const [linkMenuRefresh, setLinkMenuRefresh] = useRecoilState(refreshLinkListState)
  const [selectedExtent, setSelectedExtent] = useRecoilState(selectedExtentState)

  const setAlertIsOpen = useSetRecoilState(alertOpenState)
  const setAlertTitle = useSetRecoilState(alertTitleState)
  const setAlertMessage = useSetRecoilState(alertMessageState)

  /* 
  * Tiptap text editor.
  */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, autolink: false, linkOnPaste: false }),
    ],
    content: currentNode.content,
  })

  /* 
  * Updates the anchors on the text node in the 
  * case that the text content is editted. 
  */
  const updateAnchors = async () => {
    if (!editor) {
      return failureServiceResponse('editor is null')
    }

    // Gets all anchors for current node
    const anchorsResponse = await FrontendAnchorGateway.getAnchorsByNodeId(
      currentNode.nodeId
    )
    if (!anchorsResponse.success) {
      return failureServiceResponse('Unable to get anchors for current node.')
    }

    // The current node's anchors
    const currentNodeAnchors = anchorsResponse.payload
    if (!currentNodeAnchors) {
      // there are no anchors
      return successfulServiceResponse('No anchors to edit or delete.')
    }

    const promiseArray: any[] = []

    editor.state.doc.descendants(function(node, pos) {
      // get all of the marks on the node, then filter to get just links
      const linkMarks = node.marks.filter((mark) => mark.type.name == 'link')

      if (linkMarks.length > 0) {
        const linkMark = linkMarks[0]
        const anchorId = linkMark.attrs.target
        if (anchorId.includes('anchor')) {
          let anchorResponse

          currentNodeAnchors.forEach((dbAnchor: IAnchor, index: number) => {
            // if this anchor is on the page, do not delete it from database
            if (dbAnchor.anchorId == anchorId) {
              currentNodeAnchors.splice(index, 1)
              anchorResponse = dbAnchor
            }
          })

          const length = node.text?.length ?? 0
          const newExtent: Extent = {
            type: 'text',
            startCharacter: pos - 1,
            endCharacter: pos + length - 1,
            text: node.text ?? '',
          }

          // Update anchorExtent if anchor does exist
          if (anchorResponse) {
            promiseArray.push(FrontendAnchorGateway.updateExtent(anchorId, newExtent))
          }
        }
      }
    })

    await Promise.all(promiseArray)

    // Delete anchors fron database that are no longer on the page
    await deleteAnchors(currentNodeAnchors)
    return successfulServiceResponse('Updated Anchors.')
  }

  /* 
  * Deletes anchors and links no longer relevant on the node.
  *
  */
  const deleteAnchors = async (anchorsInDb: IAnchor[]) => {
    for (let i = 0; i < anchorsInDb.length; i++) {
      const anchor = anchorsInDb[i]
      const linkResponse = await FrontendLinkGateway.getLinksByAnchorId(anchor.anchorId)

      if (!linkResponse.success || !linkResponse.payload) {
        return failureServiceResponse('Unable to retrieve anchors links.')
      }

      // Delete anchor that has been deleted from the page
      const deleteResponse = await FrontendAnchorGateway.deleteAnchor(anchor.anchorId)
      if (!deleteResponse.success) {
        return failureServiceResponse('Failed to delete anchor.')
      }

      // Delete links and orphan anchors from database
      linkResponse.payload.forEach(async (link: ILink) => {
        // Get the corresponding anchor
        let anchor2 = link.anchor1Id
        if (link.anchor1Id == anchor.anchorId) {
          anchor2 = link.anchor2Id
        }

        // Get links attached to corresponding anchor
        const linkResponse2 = await FrontendLinkGateway.getLinksByAnchorId(anchor2)
        if (!linkResponse2.success || !linkResponse2.payload) {
          return failureServiceResponse('[getLinksbyAnchorId] unable to access backend')
        }

        // If opposite anchor only has one link, it will become an orphan anchor and should be deleted
        if (linkResponse2.payload.length <= 1) {
          await FrontendAnchorGateway.deleteAnchor(anchor2)
        }

        // Delete this link
        await FrontendLinkGateway.deleteLink(link.linkId)
      })
    }
  }

  // This function adds anchor marks for anchors in the database to the text editor
  const addAnchorMarks = async (): Promise<IServiceResponse<any>> => {
    if (!editor) {
      return failureServiceResponse('no editor')
    }
    const anchorMarks: ITextExtent[] = []
    const anchorResponse = await FrontendAnchorGateway.getAnchorsByNodeId(
      currentNode.nodeId
    )
    if (!anchorResponse || !anchorResponse.success) {
      return failureServiceResponse('failed to get anchors')
    }
    if (!anchorResponse.payload) {
      return successfulServiceResponse('no anchors to add')
    }
    for (let i = 0; i < anchorResponse.payload?.length; i++) {
      const anchor = anchorResponse.payload[i]
      const linkResponse = await FrontendLinkGateway.getLinksByAnchorId(anchor.anchorId)
      if (!linkResponse.success || !linkResponse.payload) {
        return failureServiceResponse('failed to get link')
      }
      const link = linkResponse.payload[0]
      let node = link.anchor1NodeId
      if (node == currentNode.nodeId) {
        node = link.anchor2NodeId
      }
      if (anchor.extent && anchor.extent.type == 'text') {
        editor.commands.setTextSelection({
          from: anchor.extent.startCharacter + 1,
          to: anchor.extent.endCharacter + 1,
        })
        editor.commands.setLink({
          href: 'http://localhost:3000/' + node + '/',
          target: anchor.anchorId,
        })
        
      }
    }
    return successfulServiceResponse('added anchors')
  }

  /* Method to update the text content after editting.*/
  const handleUpdateContent = async () => {
    if (!editor) {
      return failureServiceResponse('No editor.')
    }

    // get the current html from the editor
    const edittedHTML = editor.getHTML()
    const nodeProperty: INodeProperty = makeINodeProperty('content', edittedHTML)
    updateAnchors()
    // try to update the node content
    const contentUpdateResp = await FrontendNodeGateway.updateNode(currentNode.nodeId, [
      nodeProperty,
    ])

    if (!contentUpdateResp.success) {
      setAlertIsOpen(true)
      setAlertTitle('Content update failed')
      setAlertMessage(contentUpdateResp.message)
    }

    setRefresh(!refresh)
    setLinkMenuRefresh(!linkMenuRefresh)
    setAnchorRefresh(!anchorRefresh)
  }

  // Set the editor content and add anchor marks when this component loads
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(currentNode.content)
      addAnchorMarks()
    }
  }, [currentNode, editor])

  // Set the selected extent to null when this component loads
  useEffect(() => {
    setSelectedExtent(null)
  }, [currentNode])

  // Handle setting the selected extent
  const onPointerUp = (e: React.PointerEvent) => {
    if (!editor) {
      return
    }
    const from = editor.state.selection.from
    const to = editor.state.selection.to
    const text = editor.state.doc.textBetween(from, to)
    if (from !== to) {
      const selectedExtent: Extent = {
        type: 'text',
        startCharacter: from - 1,
        endCharacter: to - 1,
        text: text,
      }
      setSelectedExtent(selectedExtent)
    } else {
      setSelectedExtent(null)
    }
  }

  if (!editor) {
    return <div>{currentNode.content}</div>
  }

  return (
    <div>
      <TextMenu editor={editor} />
      <EditorContent editor={editor} onPointerUp={onPointerUp} />
      <button onClick={() => handleUpdateContent()} className={'textEditorButton'}>
        Save Changes
      </button>
    </div>
  )
}
