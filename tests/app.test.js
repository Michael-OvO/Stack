// Basic tests to verify the app structure
const fs = require('fs');
const path = require('path');

describe('Application structure', () => {
  // Test that essential files exist
  test('Main application files exist', () => {
    const requiredFiles = [
      'src/main/main.js',
      'src/renderer/stack/stack.js',
      'src/renderer/sticky-note/sticky-note.js',
      'package.json'
    ];
    
    requiredFiles.forEach(file => {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    });
  });

  // Test that the package.json has the required scripts
  test('Package.json has required scripts', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    
    expect(packageJson).toHaveProperty('scripts.start');
    expect(packageJson).toHaveProperty('scripts.test');
  });

  // Test that the app uses Electron
  test('App uses Electron', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    
    expect(packageJson.devDependencies).toHaveProperty('electron');
  });
});

describe('Code quality checks', () => {
  // Check for potential syntax errors in main process files
  test('Main process files should be valid JavaScript', () => {
    const mainProcessFiles = ['src/main/main.js', 'src/main/native-utils.js'];
    
    mainProcessFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // This will throw if there's a syntax error
      expect(() => {
        new Function(fileContent);
      }).not.toThrow();
    });
  });
  
  // Check for potential syntax errors in renderer process files
  test('Renderer process files should be valid JavaScript', () => {
    const rendererFiles = ['src/renderer/stack/stack.js', 'src/renderer/sticky-note/sticky-note.js'];
    
    rendererFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // This will throw if there's a syntax error
      expect(() => {
        new Function(fileContent);
      }).not.toThrow();
    });
  });
  
  // Check for required IPC handlers in main.js
  test('Main process has required IPC handlers', () => {
    const mainJsContent = fs.readFileSync(path.join(process.cwd(), 'src/main/main.js'), 'utf8');
    
    // Look for any IPC handler patterns
    const hasIpcHandlers = 
      mainJsContent.includes('ipcMain.on') || 
      mainJsContent.includes('ipc.on');
    
    // Ensure the application has some form of IPC communication
    expect(hasIpcHandlers).toBe(true);
  });
  
  // Check for required IPC senders in renderer files
  test('Renderer processes have corresponding IPC senders', () => {
    const rendererContents = {
      'stack.js': fs.readFileSync(path.join(process.cwd(), 'src/renderer/stack/stack.js'), 'utf8'),
      'sticky-note.js': fs.readFileSync(path.join(process.cwd(), 'src/renderer/sticky-note/sticky-note.js'), 'utf8')
    };
    
    // Check if either renderer has at least one IPC sender
    const stackHasIpcSender = rendererContents['stack.js'] && (
      rendererContents['stack.js'].includes('ipcRenderer.send') ||
      rendererContents['stack.js'].includes('ipc.send')
    );
    
    const stickyHasIpcSender = rendererContents['sticky-note.js'] && (
      rendererContents['sticky-note.js'].includes('ipcRenderer.send') ||
      rendererContents['sticky-note.js'].includes('ipc.send')
    );
    
    // At least one renderer should have an IPC sender
    expect(stackHasIpcSender || stickyHasIpcSender).toBe(true);
  });
  
  // Test for event handler memory leaks (unsubscribed event listeners)
  test('Event listeners should have corresponding removers or be used in limited scope', () => {
    const jsContents = {
      'main.js': fs.readFileSync(path.join(process.cwd(), 'src/main/main.js'), 'utf8'),
      'stack.js': fs.readFileSync(path.join(process.cwd(), 'src/renderer/stack/stack.js'), 'utf8'),
      'sticky-note.js': fs.readFileSync(path.join(process.cwd(), 'src/renderer/sticky-note/sticky-note.js'), 'utf8')
    };
    
    // Check that we have a will-quit handler that unregisters global shortcuts
    expect(jsContents['main.js']).toMatch(/app\.on\(['"]will-quit['"].*globalShortcut\.unregisterAll/s);
    
    // Check that we clean up IPC listeners if needed
    const hasIpcListenerRemoval = 
      jsContents['main.js'].includes('ipcMain.removeListener') || 
      jsContents['main.js'].includes('ipcMain.removeAllListeners');
      
    // If we don't explicitly remove listeners, we should at least have proper window cleanup
    if (!hasIpcListenerRemoval) {
      expect(jsContents['main.js']).toMatch(/window-all-closed/);
    }
  });
  
  // Test that CSS files are properly named and referenced
  test('CSS references should point to existing files', () => {
    const htmlFiles = ['src/renderer/stack/stack.html', 'src/renderer/sticky-note/sticky-note.html'];
    
    htmlFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const fileDir = path.dirname(filePath);
        
        // Extract CSS references
        const cssMatches = htmlContent.match(/href=["']([^"']+\.css)["']/g) || [];
        
        cssMatches.forEach(match => {
          const cssPath = match.replace(/href=["'](.+)["']/, '$1');
          // Only check local files, not CDN URLs
          if (!cssPath.startsWith('http')) {
            // Try both relative to cwd and relative to the HTML file
            const exists = 
              fs.existsSync(path.join(process.cwd(), cssPath)) || 
              fs.existsSync(path.join(fileDir, cssPath));
            expect(exists).toBe(true);
          }
        });
      }
    });
  });
  
  // Test for proper error handling
  test('Code includes error handling for critical operations', () => {
    const mainJsContent = fs.readFileSync(path.join(process.cwd(), 'src/main/main.js'), 'utf8');
    
    // Check for try/catch blocks or error handlers
    const hasTryCatch = mainJsContent.includes('try {');
    const hasErrorHandler = 
      mainJsContent.includes('.catch(') || 
      mainJsContent.includes('on(\'error\'') ||
      mainJsContent.includes('.on("error"');
    
    // Should have at least one form of error handling
    expect(hasTryCatch || hasErrorHandler).toBe(true);
  });
  
  // Test for proper window management
  test('Application handles window lifecycle correctly', () => {
    const mainJsContent = fs.readFileSync(path.join(process.cwd(), 'src/main/main.js'), 'utf8');
    
    // App should respond to activation events (macOS)
    expect(mainJsContent).toMatch(/app\.on\(['"]activate["']/);
    
    // App should handle window closing
    expect(mainJsContent).toMatch(/app\.on\(['"]window-all-closed["']/);
    
    // Windows should be properly created 
    expect(mainJsContent).toMatch(/new BrowserWindow\(/);
  });
}); 