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
    saveNote();
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
      saveNote();
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

