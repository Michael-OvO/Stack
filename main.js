const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require("electron")
const path = require("path")
const os = require("os")

let stickyNote
let stackWindow
let statusWindow

// iOS system colors
const colors = {
  primary: "#007AFF", // iOS blue
  success: "#34C759", // iOS green
  background: "rgba(250, 250, 250, 0.9)",
  text: "#000000",
}

function createStickyNote() {
  stickyNote = new BrowserWindow({
    width: 320,
    height: 280,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000", // Fully transparent
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    center: true,
    vibrancy: "light",
    visualEffectState: "active",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      offscreen: false,
    },
    // Enhanced rounded corners settings
    roundedCorners: true,
    cornerRadius: 20,
    hasShadow: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights by positioning off-screen
    movable: true, // Ensure window is movable
    show: false, // Start hidden initially
  })
  
  // Initialize the saving in progress flag
  stickyNote.savingInProgress = false;

  // Load the HTML file
  stickyNote.loadFile("sticky-note.html")
  
  // Ensure window is properly hidden at startup
  stickyNote.hide()
  
  // On Windows, ensure the sticky is movable by adding appropriate CSS
  if (process.platform === "win32") {
    stickyNote.webContents.once("did-finish-load", () => {
      stickyNote.webContents.insertCSS(`
      .window-handle {
        -webkit-app-region: drag;
        cursor: grab;
      }
      .drag-area {
        -webkit-app-region: drag;
        cursor: grab;
      }
      body {
        -webkit-app-region: no-drag;
      }
    `)
    })
  }

  // Apply full transparency to the window background
  stickyNote.setBackgroundColor("#00000000")

  // Ensure the window is fully transparent
  stickyNote.setOpacity(1)

  // Explicitly allow the window to be moved by the user
  stickyNote.setMovable(true)

  // Configure platform-specific settings
  if (process.platform === "darwin") {
    // macOS: Use native vibrancy with proper rounded corners
    stickyNote.setVibrancy("sheet")
    stickyNote.setWindowButtonVisibility(false)

    // On macOS, we can use native rounded corners
    if (Number.parseInt(process.versions.electron) >= 12) {
      try {
        stickyNote.setWindowButtonVisibility(false)
        // Additional check to ensure the window has proper rounded corners
        stickyNote.setBackgroundMaterial("sheet")
      } catch (e) {
        console.log("Enhanced window material not supported")
      }
    }
  } else if (process.platform === "win32") {
    // Windows: Enhanced handling for rounded corners
    try {
      // For Windows 11, we use DWM API to set corner preferences
      const isWin11 =
        Number.parseInt(os.release().split(".")[0]) >= 10 && Number.parseInt(os.release().split(".")[2]) >= 22000

      // Apply rounded corners via native module if available
      const { setRoundedCorners, applyAcrylicEffect } = require("./native-utils")
      if (typeof setRoundedCorners === "function") {
        setRoundedCorners(stickyNote.getNativeWindowHandle(), 20)
      }

      // Apply acrylic/mica effect on Windows 11
      if (isWin11 && typeof applyAcrylicEffect === "function") {
        applyAcrylicEffect(stickyNote.getNativeWindowHandle())
      }
    } catch (e) {
      console.log("Native window effects not supported, using CSS fallback", e)

      // Fallback: Use CSS for rounding corners with transparent background
      stickyNote.webContents.once("did-finish-load", () => {
        stickyNote.webContents.insertCSS(`
          html, body {
            border-radius: 20px;
            overflow: hidden;
          }
          body {
            border-radius: 20px;
          }
        `)
      })
    }
  }

  // Apply mask to ensure proper corner clipping if needed
  stickyNote.once("ready-to-show", () => {
    // Try to apply a proper window mask for corners
    try {
      const bounds = stickyNote.getBounds()
      const { width, height } = bounds

      // Create a path with rounded corners
      const roundedPath = `
        M${width},${height}
        H0
        V0
        H${width}
        V${height}
        Z
      `

      // Apply the path as a mask if supported
      if (typeof stickyNote.setShape === "function") {
        stickyNote.setShape([{ x: 0, y: 0, width, height, cornerRadius: 20 }])
      }

      // Ensure sticky remains hidden
      stickyNote.hide()
    } catch (e) {
      console.log("Window shape mask not supported", e)
      // Ensure sticky remains hidden
      stickyNote.hide()
    }
  })

  // Add iOS-style show animation
  stickyNote.on("show", () => {
    // Force a repaint to ensure transparency is applied
    stickyNote.setAlwaysOnTop(true)
    
    // Start with zero opacity and smoothly transition
    stickyNote.setOpacity(0)
    
    // Send a message to the renderer
    if (stickyNote.webContents) {
      stickyNote.webContents.send("ensure-visible");
    }

    // Use a smoother animation with consistent timing
    let opacity = 0
    const fadeIn = setInterval(() => {
      opacity += 0.08
      if (opacity >= 1) {
        clearInterval(fadeIn)
        stickyNote.setOpacity(1)
      } else {
        stickyNote.setOpacity(opacity)
      }
    }, 8) // Faster interval for smoother animation
  })
}

function createStackWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // Fixed dimensions for stack
  const stackWidth = 300 // Default expanded width
  const stackHeight = 400 // Fixed height

  stackWindow = new BrowserWindow({
    width: stackWidth,
    height: stackHeight,
    x: width - 44, // Position with only the icon showing initially
    y: Math.floor(height / 2 - stackHeight / 2), // Center vertically
    frame: false,
    transparent: true,
    backgroundColor: "#00000000", // Fully transparent background
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false, // Disable shadow to prevent white frame issues
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // Prevent throttling for smoother animations
      devTools: false, // Disable DevTools to prevent white frame issues
    },
    show: false, // Don't show until ready
  })

  stackWindow.loadFile("stack.html")

  // Make it clickable but not focusable
  stackWindow.setFocusable(false)

  // Prevent users from moving the window
  stackWindow.setMovable(false)

  // Apply CSS for proper transparency and ensure stack is collapsed initially
  stackWindow.webContents.once("did-finish-load", () => {
    // Hide the window first to prevent any flash
    stackWindow.setOpacity(0)
    
    // Wait for the DOM to be ready before showing
    setTimeout(() => {
      // Ensure stack is initially collapsed
      stackWindow.webContents.send("collapse-stack")
      
      // Now show the window with fade-in effect
      stackWindow.show()
      
      // Gradually increase opacity for smooth appearance
      let opacity = 0
      const fadeIn = setInterval(() => {
        opacity += 0.1
        stackWindow.setOpacity(opacity)
        
        if (opacity >= 1) {
          clearInterval(fadeIn)
          stackWindow.setOpacity(1)
        }
      }, 20)
    }, 100)
  })

  // Set the stack window to be always on right side of screen
  positionStackOnRightEdge(true) // Pass true to indicate collapsed state

  // Listen for display changes to reposition the stack
  screen.on("display-added", () => positionStackOnRightEdge(isCollapsed()))
  screen.on("display-removed", () => positionStackOnRightEdge(isCollapsed()))
  screen.on("display-metrics-changed", () => positionStackOnRightEdge(isCollapsed()))

  // More responsive repositioning when main screen changes
  stackWindow.on("show", () => positionStackOnRightEdge(isCollapsed()))
}

// Helper to check if stack is collapsed
function isCollapsed() {
  return !stackWindow.webContents.executeJavaScript('(function() { return document.getElementById("stack-wrapper").classList.contains("expanded"); })()');
}

// Update positioning function to handle collapsed state
function positionStackOnRightEdge(collapsed = false) {
  if (!stackWindow) return

  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // Fixed dimensions for stack
  const stackWidth = collapsed ? 44 : 300 // Icon width when collapsed
  const stackHeight = 400 // Fixed height

  stackWindow.setBounds({
    x: width - stackWidth,
    y: Math.floor(height / 2 - stackHeight / 2), // Center vertically
    width: 300, // Keep the window width fixed at maximum
    height: stackHeight,
  })

  // Make sure it's always on top and properly focusable
  stackWindow.setAlwaysOnTop(true)
}

app.whenReady().then(() => {
  // Create the windows but don't show them immediately
  createStackWindow()
  createStickyNote()
  
  // Hide the sticky note explicitly to ensure it doesn't flash
  if (stickyNote) {
    stickyNote.hide()
  }

  // Register global shortcut for showing sticky note
  globalShortcut.register("CommandOrControl+Enter", () => {
    // Don't toggle visibility during save animation
    if (stickyNote.savingInProgress) {
      console.log("Save in progress, ignoring shortcut");
      return;
    }
    
    if (stickyNote.isVisible()) {
      stickyNote.hide()
    } else {
      // Center the sticky note on the screen
      const { width, height } = screen.getPrimaryDisplay().workAreaSize
      const [stickyWidth, stickyHeight] = stickyNote.getSize()
      stickyNote.setPosition(Math.floor(width / 2 - stickyWidth / 2), Math.floor(height / 2 - stickyHeight / 2))

      // Show the note - CSS animation will handle the transition
      stickyNote.setOpacity(1)
      stickyNote.show()
      stickyNote.focus()
      
      // Tell the sticky note to focus the editor after it's shown
      setTimeout(() => {
        stickyNote.webContents.send("focus-editor");
      }, 50);
    }
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createStackWindow()
      createStickyNote()
      
      // Also hide the sticky note when recreating
      if (stickyNote) {
        stickyNote.hide()
      }
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

// Create a transparent, frameless window that handles all input events
ipcMain.on("add-to-stack", (event, data) => {
  console.log("Main process received add-to-stack", data)

  // Mark that saving is in progress to prevent window reopening
  stickyNote.savingInProgress = true;

  // Ensure stack window is visible
  if (!stackWindow.isVisible()) {
    stackWindow.show()
  }

  // Make sure the window is the right size before sending data
  const { width } = screen.getPrimaryDisplay().workAreaSize
  stackWindow.setBounds({
    x: width - 300,
    width: 300,
    ...stackWindow.getBounds(),
  })

  // Send data to the stack first
  stackWindow.webContents.send("add-to-stack", data)

  // Temporarily expand the stack to show the new note
  stackWindow.webContents.send("expand-stack")

  // Hide the sticky note immediately to prevent flashing
  stickyNote.hide()
  
  // Wait for the animation to complete before cleanup
  setTimeout(() => {
    // Clear the note and reset animation state
    stickyNote.webContents.send("clear-note")
    stickyNote.webContents.send("reset-animation")
    
    // Clear the saving flag after a safe delay
    setTimeout(() => {
      stickyNote.savingInProgress = false;
    }, 300);
  }, 350) // Reduced from 600ms for faster completion
})

ipcMain.on("hide-sticky-note", () => {
  stickyNote.hide()
})

// New handler to ensure sticky note stays hidden during save animation
ipcMain.on("prepare-to-hide-sticky", () => {
  // Set a flag to prevent reopening during the animation sequence
  stickyNote.savingInProgress = true;
  
  // Do NOT hide the window here - animation will be playing
  // The window will be hidden in the add-to-stack handler
})

// New handler to reset animation state
ipcMain.on("reset-animation", () => {
  if (stickyNote && stickyNote.webContents) {
    stickyNote.webContents.send("reset-animation");
  }
})

ipcMain.on("toggle-stack", () => {
  if (stackWindow.isVisible()) {
    stackWindow.hide()
  } else {
    stackWindow.show()
    positionStackOnRightEdge() // Ensure proper positioning
  }
})

// Listen for prep-stack-for-note event to make the stack ready
ipcMain.on("prep-stack-for-note", (event, data) => {
  // Ensure stack window is visible
  if (!stackWindow.isVisible()) {
    stackWindow.show()
  }

  // Make sure the window is expanded to receive the note
  const { width } = screen.getPrimaryDisplay().workAreaSize
  stackWindow.setBounds({
    x: width - 300,
    width: 300,
    ...stackWindow.getBounds(),
  })

  // Expand the stack
  stackWindow.webContents.send("expand-stack")

  // Get the current position of the stack window
  const stackPosition = stackWindow.getPosition()

  // Calculate a target point near the top of the stack
  const stackBounds = stackWindow.getBounds()
  const targetPoint = {
    x: stackBounds.x + stackBounds.width - 50, // Near the right edge
    y: stackBounds.y + 100, // About 100px from the top
  }

  // Send the position back to the renderer so it can animate
  event.sender.send("stack-position", targetPoint)
})

// Handle the ready event from the sticky note
ipcMain.on("sticky-note-ready", () => {
  console.log("Sticky note ready, ensuring it's hidden");
  if (stickyNote) {
    stickyNote.hide();
  }
});

