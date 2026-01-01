"use client";

import { useState, useRef, useEffect } from "react";
import { NodeProps } from "@xyflow/react";

const MAX_NOTE_LENGTH = 280;

export default function NoteNode({ data, selected }: NodeProps) {
  const text = String(data?.text || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-enter edit mode if note is empty and selected
  useEffect(() => {
    if (selected && !text && !isEditing) {
      setIsEditing(true);
    }
  }, [selected, text, isEditing]);

  const handleSave = () => {
    // Update the node data
    if (data) {
      data.text = editText.trim();
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
    // Don't save on Enter for multi-line notes
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_NOTE_LENGTH) {
      setEditText(newText);
    }
  };

  const charCount = editText.length;
  const isNearLimit = charCount >= 260;

  return (
    <div
      className={`relative w-52 min-h-24 rounded-lg border-2 p-3 shadow-md ${
        selected
          ? "border-yellow-400 bg-yellow-50"
          : "border-yellow-300 bg-yellow-100"
      }`}
      onDoubleClick={() => !isEditing && setIsEditing(true)}
    >
      {isEditing ? (
        <div className="space-y-1">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full resize-none rounded border border-yellow-400 bg-white p-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none"
            rows={4}
            placeholder="Add a note..."
          />
          <div
            className={`text-xs ${
              isNearLimit ? "text-red-600" : "text-gray-500"
            }`}
          >
            {charCount}/{MAX_NOTE_LENGTH}
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer whitespace-pre-wrap text-sm text-gray-800"
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          {text || "Click to add note..."}
        </div>
      )}
    </div>
  );
}
