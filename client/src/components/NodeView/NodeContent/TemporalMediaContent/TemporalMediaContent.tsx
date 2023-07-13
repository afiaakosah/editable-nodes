import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil'
import {
  selectedExtentState,
  currentNodeState,
  isLinkingState,
  linkedTimestamp,
  refreshState,
} from '../../../../global/Atoms'
import {
  ITemporalExtent,
  makeITemporalExtent,
} from '../../../../types'
import './TemporalMediaContent.scss'
import ReactPlayer from 'react-player'

/** The content of a temporal media node. */
export const TemporalMediaContent = () => {

  // recoil state management
  const currentNode = useRecoilValue(currentNodeState)
  const [selectedExtent, setSelectedExtent] = useRecoilState(selectedExtentState)
  const isLinking = useRecoilValue(isLinkingState)
  const [linkedToTimestamp, setLinkedTimestamp] = useRecoilState(linkedTimestamp)
  const [refresh, setRefresh] = useRecoilState(refreshState)

  // global state management
  const [playing, setPlaying] = useState<boolean>(true)

  //play media as the component loads
  useEffect (() => {
    setPlaying(true)
  }, [currentNode])

  // url of temporal media object
  const url = currentNode.content

  // global ref to the media player
  const playerRef = React.createRef<ReactPlayer>()

  // toggles whether the media is playing
  const togglePlaying = () => {
    setPlaying(!playing)
  }
  
  /*
   * A fuction called when the the media first begins to 
   * play. It checks if this node was linked to by another 
   * then seeks to that timestamp if it was. 
   */
  const handleSeek = () => {
    if(linkedToTimestamp && playerRef.current){
      playerRef.current.seekTo(linkedToTimestamp, 'seconds')
      setRefresh(!refresh)
      setLinkedTimestamp(null)
    }
  }

  /*
   * A fuction called while the media is playing.
   */
  const handleProgress = () => {
    // Pauses the media if the user starts a link.
    if (isLinking && playing) {
      togglePlaying()
    }
    // Updates the selected extent
    if (playerRef.current) {
      const currTimestamp = playerRef.current.getCurrentTime()
      const temporalExtent: ITemporalExtent = makeITemporalExtent(currTimestamp)
      setSelectedExtent(temporalExtent)
    }
  }

  return (
    <div className="playerWrapper">
      <div className="react-player">
        <ReactPlayer
          url={url}
          playing={playing}
          controls={true}         
          onProgress={handleProgress}
          onPlay={handleSeek}
          ref={playerRef}
        />
      </div>
    </div>
  )
}
