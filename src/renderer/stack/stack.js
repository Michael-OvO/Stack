const { ipcRenderer } = require("electron")

// Get DOM elements
const stackContainer = document.getElementById("stack-container")
const stackWrapper = document.getElementById("stack-wrapper")
const taskCountElement = document.getElementById("task-count")
const popButton = document.getElementById("pop-button")
const hiddenNotesInfo = document.getElementById("hidden-notes-info")
const statusWindow = document.getElementById("status-window")
const statusText = document.getElementById("status-text")

// Track stack state
let isExpanded = false // Start collapsed by default
let mouseInside = false // Track if mouse is inside the wrapper
let allNotes = [] // Keep track of all notes
let activeTask = null // Currently active task

// Clear any existing notes on startup
stackContainer.querySelectorAll('.note').forEach(note => note.remove())

// Create notes container if it doesn't exist
let notesContainer = stackContainer.querySelector('.notes-container')
if (!notesContainer) {
  notesContainer = document.createElement('div')
  notesContainer.className = 'notes-container'
  stackContainer.appendChild(notesContainer)
}

// Initialize the stack in a clean state
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded - initializing stack")
  
  // Immediately collapse the stack on startup to prevent any initial flashing
  stackWrapper.classList.remove("expanded")
  isExpanded = false
  stackWrapper.style.width = '44px'
  stackContainer.style.opacity = "0"
  
  // Initialize stack display after ensuring collapsed state
  updateStackDisplay()
})

// Debug logs for troubleshooting
console.log("Stack initialized", {
  stackContainer: stackContainer,
  stackWrapper: stackWrapper
})

// Listen for collapse command from main process
ipcRenderer.on("collapse-stack", () => {
  // Ensure it's immediately collapsed
  stackWrapper.classList.remove("expanded")
  isExpanded = false
  stackWrapper.style.width = '44px'
  stackContainer.style.opacity = "0"
})

// Listen for expand command from main process
ipcRenderer.on("expand-stack", () => {
  expandStack(true) // Force expanded state
})

// Add iOS-style haptic feedback simulation
function simulateHapticFeedback() {
  if ('vibrate' in navigator) {
    navigator.vibrate(8); // Very short vibration for subtle feedback
  }
}

// Add pop button functionality
popButton.addEventListener("click", () => {
  if (allNotes.length > 0) {
    simulateHapticFeedback()
    
    // Get the newest note (last in)
    const noteToRemove = allNotes[allNotes.length - 1]
    
    // Add removing animation
    noteToRemove.element.classList.add('removing')
    
    // Wait for animation to finish then remove
    setTimeout(() => {
      // If the note is currently displayed, remove it from DOM
      if (noteToRemove.element.parentNode) {
        noteToRemove.element.remove()
      }
      
      // Remove from our tracking array
      allNotes.pop() // Remove the last item (newest)
      
      // Set as active task
      setActiveTask(noteToRemove)
      
      // Update the stack display
      updateStackDisplay()
    }, 300) // Match animation duration
  } else if (activeTask !== null) {
    // Clear the active task if there are no notes left in the stack
    simulateHapticFeedback()
    
    // Add a clearing animation to the status window
    const statusIndicator = document.querySelector('.status-indicator')
    statusIndicator.classList.add('clearing')
    
    setTimeout(() => {
      // Clear the active task
      activeTask = null
      updateStatusContent(null)
      
      // Reset the animation class
      statusIndicator.classList.remove('clearing')
      
      // Update UI
      updateStackDisplay()
    }, 300)
  }
})

ipcRenderer.on("add-to-stack", (event, data) => {
  console.log("Received add-to-stack event", data)
  
  // Ensure stack is expanded first
  expandStack(true) // Force expanded
  
  // Create the note element
  const note = document.createElement("div")
  note.className = "note"

  if (data.type === "text") {
    note.innerHTML = `<div class="note-content">${data.content}</div>`
  } else if (data.type === "rich-text") {
    // Handle rich text content with proper styling
    note.innerHTML = `<div class="note-content rich-text-content">${data.content}</div>`
    
    // Add styles for rich text content if not already present
    if (!document.getElementById('rich-text-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'rich-text-styles'
      styleEl.textContent = `
        .rich-text-content {
          font-family: "SF Pro", -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .rich-text-content h1 {
          font-size: 1.4em;
          margin: 0.4em 0;
        }
        .rich-text-content h2 {
          font-size: 1.2em;
          margin: 0.3em 0;
        }
        .rich-text-content p {
          margin: 0.2em 0;
        }
        .rich-text-content blockquote {
          border-left: 3px solid #ccc;
          margin: 0.5em 0;
          padding-left: 0.8em;
          color: #555;
        }
        .rich-text-content pre.ql-syntax {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 0.3em 0.5em;
          font-family: monospace;
          white-space: pre-wrap;
          overflow-x: auto;
          color: #333;
        }
        .rich-text-content .ql-code-block-container {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 0.3em 0.5em;
          font-family: monospace;
          white-space: pre-wrap;
          overflow-x: auto;
          color: #333;
        }
        .rich-text-content ul, .rich-text-content ol {
          padding-left: 1.5em;
          margin: 0.2em 0;
        }
      `
      document.head.appendChild(styleEl)
    }
  } else if (data.type === "media") {
    if (data.content.startsWith("data:image/")) {
      note.innerHTML = `<img src="${data.content}" alt="Image">`
    } else if (data.content.startsWith("data:video/")) {
      note.innerHTML = `<video src="${data.content}" controls></video>`
    } else if (data.content.startsWith("data:audio/")) {
      note.innerHTML = `<audio src="${data.content}" controls></audio>`
    }
  }

  // Add this note to our tracking array
  const noteObject = {
    element: note,
    content: data.content,
    type: data.type,
    timestamp: new Date()
  }
  
  // Add to end of array (will be displayed from bottom)
  allNotes.push(noteObject)
  
  // Update the stack display
  updateStackDisplay()
  
  // Provide subtle feedback
  simulateHapticFeedback()
  
  // Auto-collapse after a delay if not hovering
  scheduleAutoCollapse()
})

// Function to update the stack display
function updateStackDisplay() {
  console.log("Updating stack display", { noteCount: allNotes.length })
  
  // Update task count
  const count = allNotes.length
  taskCountElement.textContent = count
  
  // Enable/disable pop button and change text based on count and active task
  if (count === 0 && activeTask === null) {
    popButton.disabled = true
    popButton.textContent = "Pop"
    popButton.classList.remove('clear-button')
  } else if (count === 0 && activeTask !== null) {
    // If there's an active task but no more notes in stack
    popButton.disabled = false
    popButton.textContent = "Clear"
    popButton.classList.add('clear-button') // Add special class for Clear button
  } else if (count === 1) {
    popButton.disabled = false
    popButton.textContent = "Pop"
    popButton.classList.remove('clear-button')
  } else {
    popButton.disabled = false
    popButton.textContent = "Pop"
    popButton.classList.remove('clear-button')
  }
  
  // Get or create the notes container
  let notesContainer = document.querySelector('.notes-container')
  if (!notesContainer) {
    notesContainer = document.createElement('div')
    notesContainer.className = 'notes-container'
    stackContainer.appendChild(notesContainer)
  }
  
  // Force a proper repaint to prevent white flashes
  document.body.style.backgroundColor = 'transparent'
  stackWrapper.style.backgroundColor = 'rgba(250, 250, 250, 0.9)'
  
  // Clear existing notes that aren't being removed
  Array.from(notesContainer.children).forEach(child => {
    if (!child.classList.contains('removing') && !child.classList.contains('hidden-tasks-message')) {
      child.remove()
    }
  })
  
  // Remove any existing hidden tasks message
  const existingMessage = notesContainer.querySelector('.hidden-tasks-message')
  if (existingMessage) {
    existingMessage.remove()
  }
  
  // Show info about hidden notes at the top of the container
  if (count > 3) {
    const hiddenMessage = document.createElement('div')
    hiddenMessage.className = 'hidden-tasks-message'
    hiddenMessage.textContent = `+ ${count - 3} more tasks in stack`
    notesContainer.appendChild(hiddenMessage)
  }
  
  // Get the top 3 notes of the stack (most recent)
  // We're getting the last 3 items from the allNotes array which now maintains the order set by drag and drop
  const notesToShow = allNotes.slice(-3)
  
  // Log the notes we're about to show for debugging
  console.log('Notes to display:', notesToShow.map((n, i) => ({
    index: allNotes.indexOf(n),
    content: n.content.substring(0, 20)
  })))
  
  // Stack should grow downward, with newest at top
  // Iterate to display newest at top, oldest at bottom
  for (let i = notesToShow.length - 1; i >= 0; i--) {
    const noteObj = notesToShow[i]
    const absoluteIndex = allNotes.indexOf(noteObj) // Get the actual index in allNotes array
    
    // Create a fresh note element (don't clone) to ensure proper styling
    const noteElement = document.createElement('div')
    noteElement.className = 'note'
    
    // Set the z-index so newer notes appear on top visually
    noteElement.style.zIndex = notesToShow.length - i
    
    // Add a slight stacking effect
    if (i > 0) {
      noteElement.style.marginBottom = '-5px'
    }
    
    // Store the absolute index in the allNotes array for drag-and-drop
    // This is crucial for the drag-and-drop to work with the current order
    noteElement.dataset.noteIndex = absoluteIndex
    
    // Set draggable attribute and add drag event listeners
    noteElement.draggable = true
    noteElement.addEventListener('dragstart', handleDragStart)
    noteElement.addEventListener('dragover', handleDragOver)
    noteElement.addEventListener('dragenter', handleDragEnter)
    noteElement.addEventListener('dragleave', handleDragLeave)
    noteElement.addEventListener('drop', handleDrop)
    noteElement.addEventListener('dragend', handleDragEnd)
    
    // Add a drag handle visual indicator
    const dragHandle = document.createElement('div')
    dragHandle.className = 'drag-handle'
    dragHandle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M3,15H21V13H3V15M3,19H21V17H3V19M3,11H21V9H3V11M3,5V7H21V5H3Z" /></svg>'
    noteElement.appendChild(dragHandle)
    
    // Add content based on type
    if (noteObj.type === 'text') {
      // Truncate long text content
      const fullContent = noteObj.content
      
      // Create the content element
      const contentEl = document.createElement('div')
      contentEl.className = 'note-content'
      
      // Get the first 100 characters or up to the first newline
      let displayText = fullContent
      if (fullContent.length > 100) {
        const newlineIndex = fullContent.indexOf('\n')
        if (newlineIndex > 0 && newlineIndex < 100) {
          displayText = fullContent.substring(0, newlineIndex) + '...'
        } else {
          displayText = fullContent.substring(0, 100) + '...'
        }
      }
      
      contentEl.textContent = displayText
      noteElement.appendChild(contentEl)
    } else if (noteObj.type === 'rich-text') {
      // Handle rich text content with proper styling and truncation
      const contentEl = document.createElement('div')
      contentEl.className = 'note-content rich-text-content'
      
      // Create a temporary element to parse the HTML content
      const tempEl = document.createElement('div')
      tempEl.innerHTML = noteObj.content
      
      // Extract and truncate the text content for display
      let displayText = tempEl.textContent || ""
      if (displayText.length > 100) {
        displayText = displayText.substring(0, 100) + '...'
      }
      
      // Show simplified preview with basic formatting preserved
      // For complex formatting, we'll use a preview that shows format indicators
      const hasFormatting = tempEl.querySelector('strong, em, u, s, blockquote, pre, h1, h2, ol, ul, li')
      
      if (hasFormatting) {
        contentEl.innerHTML = `<div class="formatted-preview">${noteObj.content}</div>`
        
        // Add a class to limit the display height in CSS
        contentEl.classList.add('truncated-rich-text')
      } else {
        contentEl.textContent = displayText
      }
      
      noteElement.appendChild(contentEl)
    } else if (noteObj.type === 'media') {
      // For media content, directly set the inner HTML
      if (noteObj.content.startsWith("data:image/")) {
        noteElement.innerHTML = `<img src="${noteObj.content}" alt="Image">`
      } else if (noteObj.content.startsWith("data:video/")) {
        noteElement.innerHTML = `<video src="${noteObj.content}" controls></video>`
      } else if (noteObj.content.startsWith("data:audio/")) {
        noteElement.innerHTML = `<audio src="${noteObj.content}" controls></audio>`
      }
    }
    
    notesContainer.appendChild(noteElement)
  }
}

// Function to display a popped task in the status window
function setActiveTask(task) {
  // Update content immediately
  updateStatusContent(task)
}

// Update status window content
function updateStatusContent(task) {
  activeTask = task
  
  const statusIndicator = document.querySelector('.status-indicator')
  
  if (task) {
    let content = ''
    if (task.type === 'text') {
      // Keep full text but add proper wrapping
      content = task.content
    } else if (task.type === 'rich-text') {
      // For rich text, strip excessive HTML but preserve basic formatting
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = task.content
      
      // Remove any large images or complex elements that might cause layout issues
      const images = tempDiv.querySelectorAll('img')
      if (images.length > 0) {
        images.forEach(img => {
          const imgPlaceholder = document.createElement('span')
          imgPlaceholder.className = 'media-placeholder'
          imgPlaceholder.textContent = '[Image]'
          img.parentNode.replaceChild(imgPlaceholder, img)
        })
      }
      
      // Remove any deeply nested elements or complex structures
      const deepElements = tempDiv.querySelectorAll('iframe, video, audio, canvas, object, embed')
      deepElements.forEach(el => {
        const placeholder = document.createElement('span')
        placeholder.className = 'media-placeholder'
        placeholder.textContent = `[${el.tagName.toLowerCase()}]`
        el.parentNode.replaceChild(placeholder, el)
      })
      
      content = tempDiv.innerHTML
    } else {
      content = 'Media attachment'
    }
    
    statusText.innerHTML = `<div>${content}</div>`
    // Show the status indicator as active
    statusIndicator.classList.add('active')
  } else {
    statusText.innerHTML = `<div class="empty-status">No active task</div>`
    // Show the status indicator as inactive
    statusIndicator.classList.remove('active')
  }
}

// Initialize status window on startup
updateStatusContent(null)

// Schedule auto-collapse
function scheduleAutoCollapse() {
  clearTimeout(window.collapseTimer)
  window.collapseTimer = setTimeout(() => {
    if (!mouseInside) {
      collapseStack()
    }
  }, 1000) // Reduced to 750ms second for faster responsiveness
}

// Expand the stack
function expandStack(forceExpand = false) {
  if (forceExpand || !isExpanded) {
    console.log("Expanding stack")
    stackWrapper.classList.add("expanded")
    isExpanded = true
    
    // Force-set the width to match CSS
    stackWrapper.style.width = 'min(300px, 90vw)'
    
    // Ensure container is visible
    if (stackContainer) {
      stackContainer.style.opacity = "1"
      // Force a reflow to ensure transitions work
      stackContainer.offsetHeight
    } else {
      console.error("Stack container not found when expanding")
    }
  }
}

// Collapse the stack
function collapseStack() {
  if (isExpanded && !mouseInside) {
    console.log("Collapsing stack")
    stackWrapper.classList.remove("expanded")
    isExpanded = false
    
    // Force-set the width to match collapsed state
    stackWrapper.style.width = '44px'
    
    // Fade out container content
    if (stackContainer) {
      stackContainer.style.opacity = "0"
    } else {
      console.error("Stack container not found when collapsing")
    }
  }
}

// Handle click on the icon to toggle stack
stackWrapper.addEventListener('click', (e) => {
  const rect = stackWrapper.getBoundingClientRect()
  // Only toggle if clicking in the icon area (left 50px)
  if (e.clientX < rect.left + 50) {
    simulateHapticFeedback()
    
    if (isExpanded) {
      collapseStack()
    } else {
      expandStack(true)
    }
  }
})

// Add mouse enter event to expand stack and track state
stackWrapper.addEventListener("mouseenter", () => {
  mouseInside = true
  expandStack()
})

// Add mouse leave event to collapse stack and track state
stackWrapper.addEventListener("mouseleave", () => {
  mouseInside = false
  // Add a small delay to prevent accidental collapse
  setTimeout(() => {
    if (!mouseInside) {
      collapseStack()
    }
  }, 200)
})

// Prevent click events on notes from collapsing the stack
stackContainer.addEventListener('click', (e) => {
  e.stopPropagation()
})

// Listen for window resize to adjust stack width
window.addEventListener('resize', () => {
  if (isExpanded) {
    const screenWidth = window.innerWidth
    const targetWidth = Math.min(300, screenWidth * 0.9)
    stackWrapper.style.width = `${targetWidth}px`
  }
});

// Add drag-and-drop functionality
let draggedElement = null;
let dragSourceIndex = -1;
let dragTargetIndex = -1;
let dropIndicators = [];

// Function to create drop indicators between notes
function createDropIndicators() {
  // First clear any existing indicators
  dropIndicators.forEach(indicator => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  });
  dropIndicators = [];

  // Get the notes container
  const notesContainer = document.querySelector('.notes-container');
  const notes = notesContainer.querySelectorAll('.note');

  // Create a drop indicator at the top (for dropping as first item)
  const topIndicator = document.createElement('div');
  topIndicator.className = 'drop-indicator';
  topIndicator.dataset.position = 'top';
  notesContainer.insertBefore(topIndicator, notesContainer.firstChild);
  dropIndicators.push(topIndicator);

  // Create indicators between notes
  notes.forEach((note, i) => {
    if (i < notes.length - 1) {
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      indicator.dataset.position = i.toString();
      
      // Insert after the current note
      if (note.nextSibling) {
        notesContainer.insertBefore(indicator, note.nextSibling);
      } else {
        notesContainer.appendChild(indicator);
      }
      
      dropIndicators.push(indicator);
    }
  });

  // Create a drop indicator at the bottom (for dropping as last item)
  const bottomIndicator = document.createElement('div');
  bottomIndicator.className = 'drop-indicator';
  bottomIndicator.dataset.position = 'bottom';
  notesContainer.appendChild(bottomIndicator);
  dropIndicators.push(bottomIndicator);

  // Add event listeners to drop indicators
  dropIndicators.forEach(indicator => {
    indicator.addEventListener('dragover', handleDropIndicatorDragOver);
    indicator.addEventListener('dragleave', handleDropIndicatorDragLeave);
    indicator.addEventListener('drop', handleDropIndicatorDrop);
  });
}

// Handle drag start
function handleDragStart(e) {
  // Prevent drag if there's only one note
  if (allNotes.length <= 1) {
    e.preventDefault();
    return false;
  }

  // Provide haptic feedback when starting drag
  simulateHapticFeedback();
  
  // Store the dragged element and its original index
  draggedElement = this;
  dragSourceIndex = parseInt(this.dataset.noteIndex);
  
  // Set data transfer properties
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSourceIndex.toString());
  
  // Add a dragging class for visual feedback
  this.classList.add('dragging');
  
  // Make the element semi-transparent while dragging
  setTimeout(() => {
    this.style.opacity = '0.65';
  }, 0);
  
  // Create drop indicators
  createDropIndicators();
  
  return true;
}

// Handle drag over another element
function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary to allow dropping
  }
  
  if (draggedElement !== this) {
    this.classList.add('drag-over');
  }
  
  e.dataTransfer.dropEffect = 'move';
  return false;
}

// Handle drag over a drop indicator
function handleDropIndicatorDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  
  this.classList.add('active');
  e.dataTransfer.dropEffect = 'move';
  return false;
}

// Handle drag leave from drop indicator
function handleDropIndicatorDragLeave(e) {
  this.classList.remove('active');
}

// Handle drag enter event
function handleDragEnter(e) {
  if (draggedElement !== this) {
    this.classList.add('drag-over');
  }
}

// Handle drag leave event
function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

// Handle drop on a drop indicator
function handleDropIndicatorDrop(e) {
  e.stopPropagation();
  
  // Get position from the indicator's data attribute
  const position = this.dataset.position;
  
  if (!draggedElement || dragSourceIndex === -1) {
    return false;
  }
  
  // Get the note that needs to be moved
  const noteToMove = allNotes[dragSourceIndex];
  
  // Calculate insert position based on indicator position
  let insertPosition;
  
  if (position === 'top') {
    insertPosition = 0;
  } else if (position === 'bottom') {
    insertPosition = allNotes.length - 1;
  } else {
    insertPosition = parseInt(position) + 1; // +1 because we want to insert after this note
  }
  
  // Safety check
  if (insertPosition < 0) insertPosition = 0;
  if (insertPosition >= allNotes.length) insertPosition = allNotes.length - 1;
  
  // Don't do anything if source and target are the same
  if (insertPosition === dragSourceIndex) {
    resetDragState();
    return false;
  }
  
  // Remove the note from its original position
  allNotes.splice(dragSourceIndex, 1);
  
  // Adjust insert position if it's after the source index
  if (dragSourceIndex < insertPosition) {
    insertPosition--;
  }
  
  // Insert the note at the new position
  allNotes.splice(insertPosition, 0, noteToMove);
  
  // Provide haptic feedback
  simulateHapticFeedback();
  
  // Log the new order for debugging
  console.log('New note order:', allNotes.map(n => n.content.substring(0, 20)));
  
  // Update the display
  updateStackDisplay();
  
  // Send the updated order to main
  ipcRenderer.send('update-notes-order', allNotes.map(note => ({
    content: note.content,
    type: note.type,
    timestamp: note.timestamp
  })));
  
  resetDragState();
  return false;
}

// Handle drop event
function handleDrop(e) {
  e.stopPropagation(); // Stop browser from redirecting
  
  // Only process if we're not dropping on the same element
  if (draggedElement === this) {
    return false;
  }
  
  // Get the target index from the full allNotes array
  dragTargetIndex = parseInt(this.dataset.noteIndex);
  
  // Debug the operation
  console.log('Reordering note:', { 
    sourceIndex: dragSourceIndex, 
    targetIndex: dragTargetIndex,
    allNotesLength: allNotes.length
  });
  
  // Store the note that needs to be moved
  const noteToMove = allNotes[dragSourceIndex];
  
  // Safety check to ensure we have valid indices
  if (!noteToMove || dragSourceIndex < 0 || dragTargetIndex < 0 || 
      dragSourceIndex >= allNotes.length || dragTargetIndex >= allNotes.length) {
    console.error('Invalid drag indices:', { dragSourceIndex, dragTargetIndex, allNotesLength: allNotes.length });
    resetDragState();
    return false;
  }
  
  // Remove from original position
  allNotes.splice(dragSourceIndex, 1);
  
  // Insert directly at target position (handles both up and down cases)
  allNotes.splice(dragTargetIndex, 0, noteToMove);
  
  // Provide haptic feedback for successful drop
  simulateHapticFeedback();
  
  // Update the stack display to reflect the new order
  updateStackDisplay();
  
  // Send updated note order to main process to persist if needed
  ipcRenderer.send('update-notes-order', allNotes.map(note => ({
    content: note.content,
    type: note.type,
    timestamp: note.timestamp
  })));
  
  resetDragState();
  return false;
}

// Handle drag end event
function handleDragEnd(e) {
  resetDragState();
}

// Clean up drag state
function resetDragState() {
  // Remove the dragging visual effects from the dragged element
  if (draggedElement) {
    draggedElement.style.opacity = '1';
    draggedElement.classList.remove('dragging');
  }
  
  // Remove drag-over class from all notes
  document.querySelectorAll('.note').forEach(note => {
    note.classList.remove('drag-over');
  });
  
  // Remove drop indicators
  dropIndicators.forEach(indicator => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  });
  dropIndicators = [];
  
  // Reset the drag state variables
  draggedElement = null;
  dragSourceIndex = -1;
  dragTargetIndex = -1;
} 