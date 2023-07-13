import React, { ReactElement, Ref } from 'react'
import { useRecoilValue } from 'recoil'
import { currentNodeState } from '../../../global/Atoms'
import { IFolderNode, INode } from '../../../types'
import { FolderContent } from './FolderContent'
import { ImageContent } from './ImageContent'
import { TextContent } from './TextContent'
import { TemporalMediaContent } from './TemporalMediaContent'
import ReactPlayer from 'react-player'

/** Props needed to render any node content */

export interface INodeContentProps {
  childNodes?: INode[]
  onCreateNodeButtonClick: () => void
  // playerRef: React.RefObject<ReactPlayer>
}

/**
 * This is the node content.
 *
 * @param props: INodeContentProps
 * @returns Content that any type of node renders
 */
export const NodeContent = (props: INodeContentProps) => {
  const { onCreateNodeButtonClick, childNodes} = props
  const currentNode = useRecoilValue(currentNodeState)
  switch (currentNode.type) {
    case 'image':
      return <ImageContent />
    case 'temporal':
      return <TemporalMediaContent/>
    case 'text':
      return <TextContent />
      break
    case 'folder':
      if (childNodes) {
        return (
          <FolderContent
            node={currentNode as IFolderNode}
            onCreateNodeButtonClick={onCreateNodeButtonClick}
            childNodes={childNodes}
          />
        )
      }
  }
  return null
}
