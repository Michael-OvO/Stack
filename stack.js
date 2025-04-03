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
  const notesToShow = allNotes.slice(-3)
  
  // Stack should grow downward, with newest at top
  // Iterate to display newest at top, oldest at bottom
  for (let i = notesToShow.length - 1; i >= 0; i--) {
    const noteObj = notesToShow[i]
    
    // Create a fresh note element (don't clone) to ensure proper styling
    const noteElement = document.createElement('div')
    noteElement.className = 'note'
    
    // Set the z-index so newer notes appear on top visually
    noteElement.style.zIndex = notesToShow.length - i
    
    // Add a slight stacking effect
    if (i > 0) {
      noteElement.style.marginBottom = '-5px'
    }
    
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
      // Truncate long text for better display
      content = task.content.length > 120 
        ? task.content.substring(0, 120) + '...' 
        : task.content
    } else if (task.type === 'rich-text') {
      // For rich text in status, preserve the HTML formatting
      content = task.content
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