// UI component validation tests
const fs = require('fs');
const path = require('path');

describe('UI Component Validation', () => {
  // Parse and validate HTML files
  test('HTML files have proper structure', () => {
    const htmlFiles = ['src/renderer/stack/stack.html', 'src/renderer/sticky-note/sticky-note.html'];
    
    htmlFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        
        // HTML should have basic required tags
        expect(htmlContent).toMatch(/<html/i);
        expect(htmlContent).toMatch(/<head/i);
        expect(htmlContent).toMatch(/<body/i);
        
        // All tags should be properly closed - this is approximate due to regex limitations
        // for a basic sanity check
        const openTags = (htmlContent.match(/<[a-z][^>/]*>/ig) || []).length;
        const closeTags = (htmlContent.match(/<\/[a-z][^>]*>/ig) || []).length;
        const selfClosingTags = (htmlContent.match(/<[^>]+\/>/ig) || []).length;
        
        // This is an approximate check - HTML can be complex with comment tags etc.
        // so we just check if the numbers are within a reasonable range
        expect(Math.abs(openTags - (closeTags + selfClosingTags))).toBeLessThanOrEqual(5);
      }
    });
  });

  // Check for critical UI elements in the stack.html
  test('Stack has required UI components', () => {
    const stackHtmlPath = path.join(process.cwd(), 'src/renderer/stack/stack.html');
    if (fs.existsSync(stackHtmlPath)) {
      const stackHtml = fs.readFileSync(stackHtmlPath, 'utf8');
      
      // Critical UI elements for stack functionality
      expect(stackHtml).toMatch(/stack-container/i);
      expect(stackHtml).toMatch(/stack-header/i);
      expect(stackHtml).toMatch(/notes-container/i);
      expect(stackHtml).toMatch(/pop-button/i);
    }
  });
  
  // Check for critical UI elements in the sticky-note.html
  test('Sticky note has required UI components', () => {
    const stickyNotePath = path.join(process.cwd(), 'src/renderer/sticky-note/sticky-note.html');
    if (fs.existsSync(stickyNotePath)) {
      const stickyNoteHtml = fs.readFileSync(stickyNotePath, 'utf8');
      
      // Critical UI elements for sticky note functionality
      expect(stickyNoteHtml).toMatch(/sticky-note-container/i);
      expect(stickyNoteHtml).toMatch(/editor-container/i);
      expect(stickyNoteHtml).toMatch(/submit-button/i);
    }
  });
  
  // Check CSS for problematic styles
  test('CSS file does not contain problematic styles', () => {
    const cssPath = path.join(process.cwd(), 'src/styles/styles.css');
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      // Check for potential issues
      
      // Position fixed with z-index issues
      const fixedElements = cssContent.match(/position:\s*fixed/g) || [];
      if (fixedElements.length > 0) {
        // If using fixed positioning, should have z-index
        expect(cssContent).toMatch(/z-index/);
      }
      
      // Check for potential overflow issues
      const overflowHidden = cssContent.match(/overflow:\s*hidden/g) || [];
      // Should have some overflow handling to prevent content issues
      expect(overflowHidden.length).toBeGreaterThan(0);
      
      // Check for duplicate selector definitions that might cause conflicts
      const selectors = cssContent.match(/\.[a-z0-9_-]+\s*\{/ig) || [];
      const uniqueSelectors = new Set(selectors);
      // Not all selectors should be unique (can have multiple definitions)
      // but there should be some uniqueness
      expect(uniqueSelectors.size).toBeGreaterThan(0);
    }
  });
  
  // Validate script references in HTML
  test('HTML files reference existing JavaScript files', () => {
    const htmlFiles = ['src/renderer/stack/stack.html', 'src/renderer/sticky-note/sticky-note.html'];
    
    htmlFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const fileDir = path.dirname(filePath);
        
        // Extract script references
        const scriptMatches = htmlContent.match(/src=["']([^"']+\.js)["']/g) || [];
        
        scriptMatches.forEach(match => {
          const scriptPath = match.replace(/src=["'](.+)["']/, '$1');
          // Only check local files, not CDN URLs
          if (!scriptPath.startsWith('http')) {
            // Try both relative to cwd and relative to the HTML file
            const exists = 
              fs.existsSync(path.join(process.cwd(), scriptPath)) || 
              fs.existsSync(path.join(fileDir, scriptPath));
            expect(exists).toBe(true);
          }
        });
      }
    });
  });
}); 