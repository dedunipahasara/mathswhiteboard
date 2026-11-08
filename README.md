# MathsMate Smart Maths Board

A keyboard-first mathematics whiteboard designed for laptop users who prefer typing equations instead of handwriting with a mouse or touchpad.

## Features
- Clickable mathematics symbol/function library grouped by category.
- Editable MathLive equations placed directly on the board.
- Type and edit formulas using the laptop keyboard.
- Add editable Sinhala/text explanations and notes.
- Add basic geometry shapes.
- Drag equations/notes to reposition them.
- Undo/redo, browser autosave, save button, print/save as PDF.
- Responsive light-blue and white design.

## Deploy on Netlify
Static site; no build step required:
- Base directory: leave blank
- Build command: leave blank
- Publish directory: `.`
- Functions directory: leave blank/default

Upload the extracted folder or connect the GitHub repository.

## Important
The MathLive equation editor is loaded from a CDN and needs an internet connection. Saved work is stored in localStorage in the current browser/device only. It is not cloud-synced. The Download button opens the browser print dialog; choose Save as PDF. A dedicated PNG export for editable MathLive formula rendering is not included in this version.


## Updated board behavior
- Large scrollable work surface (3000 x 2200 px) for writing across a broad area.
- Formula palette inserts actual LaTeX into editable MathLive fields, not literal text such as `//pi`.
- Select an existing equation, then click a symbol/function to insert it at the current cursor position.
- Drag an equation/note/shape by its outer area to move it around the board; click inside a formula to edit it.


## Direct typing on the board
Click any blank area of the whiteboard and a math input appears at that exact location. Start typing immediately with the laptop keyboard. Click inside an existing formula to edit it. Use the Note button for ordinary Sinhala explanations.

## Multi-line writing
- In an equation field, press Enter to create a new editable equation line directly underneath.
- Note text boxes expand vertically as you type. Press Enter to continue on the next line, like a document editor.
