const { ipcRenderer } = require("electron")

// Initialize Quill editor with the required formatting options
let quill = null;
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Quill with toolbar options for rich text editing
  quill = new Quill('#editor', {
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],  // toggled buttons
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],         // headers
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['clean']                                    // remove formatting
      ]
    },
    placeholder: 'Enter your note... (Press Enter to save)',
    theme: 'snow'
  });
  
  // Tell main process we're ready
  ipcRenderer.send("sticky-note-ready");
});

const mediaInput = document.getElementById("media-input")
const mediaPreview = document.getElementById("media-preview")
const closeButton = document.getElementById("close-button")
const submitButton = document.getElementById("submit-button")
const body = document.body
const editorContainer = document.getElementById("editor-container")

let mediaData = null

// Function to determine the target x position based on screen width
function calculateTargetX() {
  const screenWidth = window.screen.width
  document.documentElement.style.setProperty("--target-x", `${screenWidth}px`)
}

// Calculate initially
calculateTargetX()

// And recalculate if window size changes
window.addEventListener("resize", calculateTargetX)

// Focus the editor when explicitly told to by main process
ipcRenderer.on("focus-editor", () => {
  if (quill) {
    // Set a small timeout to ensure the DOM is ready
    setTimeout(() => {
      quill.focus();
    }, 10);
  }
});

// Make sure the drag area doesn't interfere with editor focus
document.querySelector(".drag-area").addEventListener("mousedown", (e) => {
  // Prevent the mousedown from reaching the editor
  e.preventDefault()
})

// Add close button functionality
if (closeButton) {
  closeButton.addEventListener("click", () => {
    // Add a subtle scale animation before closing
    closeButton.style.transform = "scale(0.9)"

    setTimeout(() => {
      // iOS-style fade out animation
      const fadeOut = () => {
        let opacity = 1
        const interval = setInterval(() => {
          opacity -= 0.1
          if (opacity <= 0) {
            clearInterval(interval)
            ipcRenderer.send("hide-sticky-note")
          } else {
            body.style.opacity = opacity
          }
        }, 16)
      }

      fadeOut()
    }, 100)
  })
}

// Make sure clicking anywhere else in the note focuses the editor
document.querySelector(".sticky-note-container").addEventListener("click", (e) => {
  // Don't focus if clicking on a button, input, or toolbar
  if (!e.target.closest(".file-label") && 
      !e.target.closest("#media-input") && 
      !e.target.closest("#submit-button") && 
      !e.target.closest(".ql-toolbar")) {
    if (quill) {
      quill.focus()
    }
  }
})

// Add click handler for the submit button
if (submitButton) {
  submitButton.addEventListener("click", (e) => {
    console.log("Submit button clicked");
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  });
}

// Handle keyboard events globally to ensure they're captured
document.addEventListener("keydown", function(event) {
  // Only proceed if quill is initialized
  if (!quill) return;
  
  console.log(`Key pressed: ${event.key}, activeElement:`, document.activeElement);
  
  // Check if the key is Enter (without shift) and not inside a list or code block
  if (event.key === "Enter" && !event.shiftKey) {
    // Check if we're in the editor and not in a list or formatting block
    const selection = quill.getSelection();
    if (selection) {
      const format = quill.getFormat(selection);
      // Don't save if in a list, blockquote, or code-block (allow normal enter behavior)
      if (format.list || format.blockquote || format['code-block']) {
        return;
      }
      
      console.log("Enter key pressed - saving note");
      event.preventDefault();
      event.stopPropagation();
      handleSubmit();
      return false;
    }
  } 
  // Handle Escape key
  else if (event.key === "Escape") {
    console.log("Escape key pressed - hiding note");
    event.preventDefault();
    event.stopPropagation();
    ipcRenderer.send("hide-sticky-note");
    return false;
  }
}, true);

// Handle media input
mediaInput.addEventListener("change", (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Check file size - limit to 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert("File is too large! Please select a file under 5MB.")
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    mediaData = e.target.result

    if (file.type.startsWith("image/")) {
      mediaPreview.innerHTML = `<img src="${mediaData}" alt="Image">`
      // Resize the editor to make room for the preview
      editorContainer.style.height = "120px"
      editorContainer.style.minHeight = "80px"

      // Create a new image to check dimensions
      const img = new Image()
      img.onload = () => {
        if (img.width > 300 || img.height > 200) {
          // Add a note about large image
          const sizeNote = document.createElement("div")
          sizeNote.className = "size-note"
          sizeNote.textContent = "Large image resized to fit"
          sizeNote.style.fontSize = "11px"
          sizeNote.style.color = "#999"
          sizeNote.style.textAlign = "center"
          sizeNote.style.marginTop = "2px"
          mediaPreview.appendChild(sizeNote)
        }
      }
      img.src = mediaData
    } else if (file.type.startsWith("video/")) {
      mediaPreview.innerHTML = `<video src="${mediaData}" controls></video>`
      // Resize the editor to make room for the preview
      editorContainer.style.height = "120px"
      editorContainer.style.minHeight = "80px"
    } else if (file.type.startsWith("audio/")) {
      mediaPreview.innerHTML = `<audio src="${mediaData}" controls></audio>`
      // Resize the editor to make room for the preview
      editorContainer.style.height = "150px"
      editorContainer.style.minHeight = "120px"
    }
  }
  reader.readAsDataURL(file)
})

// Auto-resize function for the editor
function autoResizeEditor() {
  if (!quill) return;
  
  // Get the content height
  const editorEl = document.querySelector('.ql-editor');
  if (!editorEl) return;
  
  // Reset height to calculate proper scroll height
  editorEl.style.height = "auto";
  
  // Get the content height
  const contentHeight = editorEl.scrollHeight;
  
  // Calculate max allowed height based on window size
  const maxHeight = 150;
  
  // Set the new height (with limits)
  editorEl.style.height = Math.min(contentHeight, maxHeight) + "px";
  
  // Show scrollbar if content exceeds max height
  editorEl.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
}

// Apply auto-resize when content changes
document.addEventListener("DOMContentLoaded", () => {
  // Initial editor sizing
  setTimeout(autoResizeEditor, 100);
  
  // Set up observer for content changes
  const editorEl = document.querySelector('.ql-editor');
  if (editorEl) {
    const observer = new MutationObserver(autoResizeEditor);
    observer.observe(editorEl, { 
      childList: true, 
      subtree: true,
      characterData: true,
      attributes: false
    });
  }
});

// Make sure the handle works for dragging the window
document.addEventListener("DOMContentLoaded", () => {
  // Ensure the window is draggable from the handle and header area
  const windowHandle = document.querySelector(".window-handle")

  // Prevent default behaviors on the handle to ensure dragging works
  windowHandle.addEventListener("mousedown", (e) => {
    e.preventDefault() // Prevent text selection during drag
  })
})

// Save note to stack
function saveNote() {
  // Check if Quill is initialized
  if (!quill) return;
  
  // Get content from Quill as HTML - includes rich text formatting
  const content = quill.root.innerHTML.trim();
  
  // Check if content is empty (only whitespace, newlines, empty paragraphs)
  if (isContentEmpty(content) && !mediaData) {
    console.log("Content is empty, closing without saving");
    ipcRenderer.send("hide-sticky-note");
    return;
  }
  
  if (content || mediaData) {
    console.log("Attempting to save note");
    
    // First remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners("stack-position");
    
    // Setup the event listener first
    ipcRenderer.once("stack-position", (event, stackPosition) => {
      console.log("Received stack position:", stackPosition);
      
      // Calculate animation path to the stack
      const screenWidth = window.screen.availWidth;
      const stackX = stackPosition.x;
      const stackY = stackPosition.y;

      // Calculate the target coordinates relative to current window position
      // This will make the sticky note animate toward the stack's position
      const targetX = stackX - window.screenX;
      const targetY = stackY - window.screenY;

      // Set CSS variables for the animation
      document.documentElement.style.setProperty("--target-x", `${targetX}px`);
      document.documentElement.style.setProperty("--target-y", `${targetY}px`);

      // Make background fully transparent immediately
      document.body.style.backgroundColor = "transparent";
      document.body.style.backdropFilter = "none";
      document.body.style["-webkit-backdrop-filter"] = "none";
      document.body.style.boxShadow = "none";
      document.body.style.border = "none";

      // Start the genie effect animation
      body.classList.add("sliding");

      // Immediately tell main process to prepare for closing the window
      // This sets the savingInProgress flag to prevent reopening
      ipcRenderer.send("prepare-to-hide-sticky");

      // Wait for animation to complete before sending to stack
      setTimeout(() => {
        console.log("Animation complete, sending to stack");
        
        // Send the data to the stack - but don't hide here, we'll let main process handle it
        if (mediaData) {
          ipcRenderer.send("add-to-stack", {
            type: "media",
            content: mediaData,
          });
        } else {
          ipcRenderer.send("add-to-stack", {
            type: "rich-text", // Changed from "text" to "rich-text"
            content: content,
          });
        }

        // Reset form but don't remove animation class yet - wait for main process to hide window
        quill.setText(''); // Clear the editor
        mediaPreview.innerHTML = "";
        mediaData = null;
      }, 300); // Reduced from 550ms for faster task adding
    });
    
    // Now send the event to prepare the stack window
    console.log("Sending prep-stack-for-note");
    ipcRenderer.send("prep-stack-for-note");
  } else {
    ipcRenderer.send("hide-sticky-note");
  }
}

// Clear note when requested
ipcRenderer.on("clear-note", () => {
  if (quill) {
    quill.setText(''); // Clear the editor
  }
  mediaPreview.innerHTML = ""
  mediaData = null
})

// Reset animation state
ipcRenderer.on("reset-animation", () => {
  body.classList.remove("sliding")
});

// Handler to ensure the sticky note is visible when shown
ipcRenderer.on("ensure-visible", () => {
  console.log("Ensuring sticky note is visible");
  
  // If the editor is initialized, reset its state
  if (quill) {
    quill.setText('');
  }
});

// Listen for show-note event from the main process
ipcRenderer.on("show-note", (event, data) => {
  console.log("Show note event received", data);
  
  // Main process has already positioned the window, but we might need to make fine adjustments
  // based on actual rendered content size, which the main process doesn't know about
  
  // The mousePosition and adjustedPosition are provided in the data
  // If needed, we can use them to send back further adjustments
  if (data && (data.mousePosition || data.adjustedPosition)) {
    // If we're already at an adjusted position from main process,
    // we might not need to position again, but we can fine-tune if needed
    const needsFurtherAdjustment = checkIfNeedsFurtherAdjustment(data);
    
    if (needsFurtherAdjustment) {
      positionStickyNoteAtMouse(data.mousePosition, data.adjustedPosition, data.displayBounds);
    }
  } else {
    console.warn("No position data in show-note event");
  }
  
  // Show the container
  const container = document.querySelector(".sticky-note-container");
  container.style.opacity = "1";
  
  // Focus on the editor after a short delay to ensure the DOM is ready
  setTimeout(() => {
    if (quill) {
      quill.focus();
    }
  }, 10);
});

// Check if the window needs further adjustment based on content size
function checkIfNeedsFurtherAdjustment(data) {
  // For now, we'll trust the main process positioning
  // This function could be expanded if there are specific cases
  // where content size affects positioning needs
  return false;
}

// Function to position the sticky note at mouse position
function positionStickyNoteAtMouse(mousePosition, existingAdjustedPosition, displayBounds) {
  if (!mousePosition) {
    console.error("No mouse position data provided");
    return;
  }
  
  console.log("Fine-tuning position:", { mousePosition, existingAdjustedPosition, displayBounds });
  
  // If we already have an adjusted position from the main process, use that as a base
  if (existingAdjustedPosition) {
    // Apply any necessary fine-tuning here
    // For example, adjusting based on actual rendered content height
    
    // For now, we'll just use the position provided by the main process
    // We don't need to send another set-note-position message
    return;
  }
  
  // If we don't have an adjusted position, calculate it ourselves
  // This is a fallback in case the main process didn't provide an adjusted position
  
  // Get the window dimensions
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Get screen dimensions using screen API for more accurate bounds checking
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  
  // Calculate initial position (centered at mouse)
  let x = mousePosition.x - (windowWidth / 2);
  let y = mousePosition.y - 40; // Offset from cursor to prevent immediate overlap
  
  // If we have display bounds from the main process, use those for boundary checking
  let minX = 0;
  let minY = 0;
  let maxX = screenWidth - windowWidth;
  let maxY = screenHeight - windowHeight;
  
  if (displayBounds) {
    minX = displayBounds.x;
    minY = displayBounds.y;
    maxX = displayBounds.x + displayBounds.width - windowWidth;
    maxY = displayBounds.y + displayBounds.height - windowHeight;
  }
  
  // Adjust position to ensure the note stays within screen boundaries
  const adjustedX = Math.max(minX, Math.min(x, maxX));
  const adjustedY = Math.max(minY, Math.min(y, maxY));
  
  console.log("Calculated adjusted position:", { 
    original: { x, y }, 
    adjusted: { x: adjustedX, y: adjustedY },
    bounds: { minX, minY, maxX, maxY }
  });
  
  // Send position to main process using absolute screen coordinates
  ipcRenderer.send("set-note-position", { 
    x: adjustedX,
    y: adjustedY
  });
}

// Function to check if content is empty (only whitespace/newlines)
function isContentEmpty(content) {
  if (!content) return true;
  
  // For plain text, check if it's just whitespace
  if (typeof content === 'string') {
    // Check for HTML content that's just empty paragraphs
    if (content.includes('<p>')) {
      // Create temp div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Get text content without HTML
      const textOnly = tempDiv.textContent || tempDiv.innerText;
      return !textOnly || textOnly.trim() === '';
    }
    
    return content.trim() === '';
  }
  
  // For rich text editor
  if (quill) {
    // Get text content without HTML
    const textOnly = quill.getText().trim();
    if (textOnly === '') return true;
    
    // Check if there's only default blank line content
    const delta = quill.getContents();
    if (delta.ops.length === 1 && delta.ops[0].insert === '\n') {
      return true;
    }
    
    // Check for empty paragraph structure
    const html = quill.root.innerHTML;
    if (html === '<p><br></p>' || html === '<p></p>') {
      return true;
    }
  }
  
  return false;
}

// Unified submit handler
function handleSubmit() {
  let content = '';
  let type = 'text';
  
  // Check what type of content we have
  if (quill) {
    type = 'rich-text';
    content = document.querySelector(".ql-editor").innerHTML;
  } else if (document.querySelector("textarea")) {
    type = 'text';
    content = document.querySelector("textarea").value;
  } else if (mediaPreview.innerHTML !== '') {
    type = 'media';
    content = mediaPreview.querySelector('img, video, audio').src;
  }
  
  // Validate content is not empty
  if (isContentEmpty(content) && !mediaData) {
    console.log("Content is empty, closing without saving");
    // Just hide the note without saving empty content
    ipcRenderer.send("hide-sticky-note");
    
    // Reset the editor/textarea content
    if (quill) {
      quill.setContents([]);
    } else if (document.querySelector("textarea")) {
      document.querySelector("textarea").value = '';
    }
    
    return;
  }
  
  // Content is not empty, proceed with saving
  console.log("Content validated, saving note");
  saveNote();
}

