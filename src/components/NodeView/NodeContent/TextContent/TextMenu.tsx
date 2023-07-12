import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { alertOpenState, alertTitleState, alertMessageState, currentNodeState, refreshState, refreshLinkListState } from '../../../../global/Atoms'
import { FrontendNodeGateway } from '../../../../nodes'
import { INodeProperty, makeINodeProperty } from '../../../../types'

interface IEditorProps {
  editor: Editor | null
}

export const TextMenu = (props: IEditorProps) => {
  
  const { editor } = props
  if (!editor) {
    return null
  }

  return <div id="textMenu">

    <button
      onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
      disabled={!editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
      className={
     editor.isActive('heading') ? 'active-textEditorButton' : 'textEditorButton'
    }>
     Heading
    </button>

    <button
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
      disabled={!editor.can().chain().focus().toggleBlockquote().run()}
      className={editor.isActive('blockquote') ? 'active-textEditorButton' : 'textEditorButton'
    }>
     Blockquote
    </button>

    <button
      onClick={() => editor.chain().focus().toggleBold().run()}
      disabled={!editor.can().chain().focus().toggleBold().run()}
      className={editor.isActive('bold') ? 'active-textEditorButton' : 'textEditorButton'}>
     Bold
    </button>

    <button
      onClick={() => editor.chain().focus().toggleItalic().run()}
      disabled={!editor.can().chain().focus().toggleItalic().run()}
      className={
    editor.isActive('italic') ? 'active-textEditorButton' : 'textEditorButton'
    }>
     Italic
    </button>

    <button
      onClick={() => editor.chain().focus().toggleStrike().run()}
      disabled={!editor.can().chain().focus().toggleStrike().run()}
      className={
    editor.isActive('strike') ? 'active-textEditorButton' : 'textEditorButton'
    }>
     Strike
    </button>

  </div>
}
