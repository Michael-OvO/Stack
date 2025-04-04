const { app, BrowserWindow, ipcMain, globalShortcut, screen, Menu, MenuItem, webContents } = require("electron")
const path = require("path")
const os = require("os")

let stickyNote = null
let stackWindow = null
let statusWindow

// iOS system colors
const colors = {
  primary: "#007AFF", // iOS blue
  success: "#34C759", // iOS green
  background: "rgba(250, 250, 250, 0.9)",
  text: "#000000",
}

// Capture mouse position when showing the note
let lastMousePosition = { x: 0, y: 0 }

// Track mouse position globally
function trackMousePosition() {
  screen.on('mouse-move', (_, mousePosition) => {
    lastMousePosition = mousePosition
  })
}

function createStickyNote() {
  stickyNote = new BrowserWindow({
    width: 320,
    height: 280,
    frame: false,
    transparent: false, // Changed to false to make it non-transparent
    opacity: 1.0,
    backgroundColor: "#F0F0F0", // Changed to light gray for contrast
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    center: true,
    // Remove properties that might create frames/borders
    hasShadow: true, // Add shadow for visual distinction
    titleBarStyle: 'hidden',
    roundedCorners: true, // Re-enable rounded corners for sticky note
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      offscreen: false,
      devTools: true
    },
    show: false, // Start hidden and show when ready
  })
  
  // Add a debug message
  console.log("Creating sticky note with non-transparent settings");
  
  // Initialize the saving in progress flag
  stickyNote.savingInProgress = false;
  
  // Load the HTML file
  stickyNote.loadFile("src/renderer/sticky-note/sticky-note.html")
  
  // Comment out automatic DevTools opening
  // stickyNote.webContents.openDevTools({ mode: 'detach' })
  
  // Ensure window is properly hidden at startup
  stickyNote.hide()
  
  // On Windows, ensure the sticky is movable by adding appropriate CSS
  if (process.platform === "win32") {
    stickyNote.webContents.once("did-finish-load", () => {
      // Add CSS for a non-transparent sticky note with rounded corners
      stickyNote.webContents.insertCSS(`
      * {
        box-sizing: border-box;
      }
      
      body, html {
        background: #F0F0F0 !important;
        border-radius: 16px;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      .sticky-note-container {
        background-color: #F0F0F0 !important;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin: 0;
      }
      
      /* Make the editor stand out with a white background */
      #editor-container {
        background-color: #FFFFFF !important;
        border-radius: 12px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }
      
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
    
      // Log to confirm CSS insertion
      console.log("Inserted CSS for non-transparent sticky note");
    })
  }

  // Apply full transparency to the window background
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
    transparent: true, // Enable transparency for stack window
    backgroundColor: "#00000000", // Fully transparent background
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false, // Disable shadow for better transparency
    thickFrame: false, // Disable thick frame to help with transparency
    roundedCorners: false, // Disable default rounded corners
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      devTools: true
    },
    show: false, // Don't show until ready
  })

  stackWindow.loadFile("src/renderer/stack/stack.html")
  
  // Comment out automatic DevTools opening
  // stackWindow.webContents.openDevTools({ mode: 'detach' })

  // Make it clickable but not focusable
  stackWindow.setFocusable(false)

  // Prevent users from moving the window
  stackWindow.setMovable(false)
  
  // Set shadow to false after creation as well to be extra sure
  stackWindow.setHasShadow(false);
  
  // Ensure transparency is properly set
  stackWindow.setBackgroundColor('#00000000')

  // Apply CSS for proper transparency and ensure stack is collapsed initially
  stackWindow.webContents.once("did-finish-load", () => {
    // Hide the window first to prevent any flash
    stackWindow.setOpacity(0)
    
    // Apply simplified CSS - only make the window background transparent
    stackWindow.webContents.insertCSS(`
      /* Make window background transparent */
      html, body {
        background: transparent !important;
      }
      
      /* Make all actual content elements solid white */
      .stack-wrapper {
        background: transparent;
      }
      
      .stack-icon {
        background-color: rgba(250, 250, 250, 0.9);
      }
      
      .stack-container {
        background-color: rgba(250, 250, 250, 0.9);
      }
    `)
    
    console.log("Applied simplified transparency CSS to stack window");
    
    // Wait for the DOM to be ready before showing
    setTimeout(() => {
      // Ensure stack is initially collapsed
      stackWindow.webContents.send("collapse-stack")
      
      // Now show the window
      stackWindow.show()
      stackWindow.setOpacity(1)
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

function setupDevTools() {
  // Create a default context menu with inspect element
  const inspectMenu = Menu.buildFromTemplate([
    {
      label: 'Inspect Element',
      click: (menuItem, browserWindow, event) => {
        if (browserWindow) {
          const { x, y } = event;
          browserWindow.webContents.inspectElement(x, y);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Toggle DevTools',
      accelerator: 'F12',
      click: (menuItem, browserWindow) => {
        if (browserWindow) {
          browserWindow.webContents.toggleDevTools();
        }
      }
    }
  ]);

  // Apply to all browser windows
  app.on('browser-window-created', (event, win) => {
    win.webContents.on('context-menu', (e, params) => {
      inspectMenu.popup({
        window: win,
        x: params.x,
        y: params.y
      });
    });
  });
}

app.whenReady().then(() => {
  // Setup DevTools before creating windows
  setupDevTools();
  
  // Create the windows but don't show them immediately
  createStackWindow()
  createStickyNote()
  
  // Hide the sticky note explicitly to ensure it doesn't flash
  if (stickyNote) {
    stickyNote.hide()
  }

  // Start tracking mouse position
  trackMousePosition()

  // Register global shortcut for showing sticky note with debug logging
  try {
    const shortcutRegistered = globalShortcut.register("CommandOrControl+Enter", () => {
      console.log("CommandOrControl+Enter shortcut triggered");
      // Check if the note is visible - if yes, hide it
      if (stickyNote && stickyNote.isVisible()) {
        hideStickyNote()
      } else {
        // Show the note at the current mouse position
        showStickyNote()
      }
    });
    
    console.log("CommandOrControl+Enter registration success:", shortcutRegistered);
    
    // Register an alternative shortcut in case the primary one conflicts
    const altShortcutRegistered = globalShortcut.register("CommandOrControl+Shift+N", () => {
      console.log("Alternative shortcut triggered");
      if (stickyNote && stickyNote.isVisible()) {
        hideStickyNote()
      } else {
        showStickyNote()
      }
    });
    
    console.log("Alternative shortcut registration success:", altShortcutRegistered);
  } catch (error) {
    console.error("Error registering shortcuts:", error);
  }

  // Add DevTools shortcut (F12)
  globalShortcut.register("F12", () => {
    // Get focused window or stack window if nothing is focused
    const focusedWindow = BrowserWindow.getFocusedWindow() || stackWindow;
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
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

// Handle ready event from renderer
ipcMain.on("hide-sticky-note", () => {
  hideStickyNote();
});

// Legacy event handler for compatibility
ipcMain.on("hide-note", () => {
  hideStickyNote();
});

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

// Handle showing the sticky note with mouse position
function showStickyNote() {
  // If the sticky note doesn't exist, create it
  if (!stickyNote) {
    createStickyNote();
  }

  // Get current mouse position from the screen
  const cursorPosition = screen.getCursorScreenPoint();
  
  // Get display where the cursor is
  const displayForCursor = screen.getDisplayNearestPoint(cursorPosition);
  const displayBounds = displayForCursor.workArea;
  
  // Use actual cursor position from screen API
  const mousePosition = {
    x: cursorPosition.x,
    y: cursorPosition.y
  };
  
  // Window dimensions
  const windowWidth = 320;
  const windowHeight = 280;
  
  // Calculate initial position (centered on mouse)
  let x = mousePosition.x - (windowWidth / 2);
  let y = mousePosition.y - 50;
  
  // Boundary check to keep window fully visible on current display
  x = Math.max(displayBounds.x, Math.min(x, displayBounds.x + displayBounds.width - windowWidth));
  y = Math.max(displayBounds.y, Math.min(y, displayBounds.y + displayBounds.height - windowHeight));
  
  // Create the window at the adjusted position
  stickyNote.setBounds({
    x: x,
    y: y,
    width: windowWidth,
    height: windowHeight
  });
  
  // Show the window and ensure it's on top
  stickyNote.show();
  stickyNote.setAlwaysOnTop(true, 'pop-up-menu');
  
  // Pass the mouse position to the renderer for fine adjustments if needed
  stickyNote.webContents.send("show-note", { 
    mousePosition,
    adjustedPosition: { x, y },
    displayBounds
  });
  
  console.log("Opening sticky note at:", { 
    original: mousePosition,
    adjusted: { x, y },
    displayBounds
  });
}

// Handle hiding the sticky note
function hideStickyNote() {
  stickyNote.hide();
}

// Handle setting the sticky note position based on mouse coordinates
ipcMain.on("set-note-position", (event, position) => {
  if (stickyNote) {
    const bounds = stickyNote.getBounds();
    stickyNote.setBounds({
      x: position.x,
      y: position.y,
      width: bounds.width,
      height: bounds.height
    });
  }
});

// Listen for request to show sticky note from the renderer
ipcMain.on("show-sticky-note", () => {
  console.log("Received show-sticky-note request from renderer");
  showStickyNote();
});

