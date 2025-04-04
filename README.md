# Stack - Sticky Note Application

A modern, sleek sticky note application built with Electron that provides a seamless way to create, manage, and organize notes with a beautiful iOS-inspired design. Perfect for quick reminders, task tracking, and capturing ideas without interrupting your workflow.

## 🚀 Installation

### Prerequisites

- **Node.js**: v14 or higher (v16+ recommended)
- **npm** (v7+) or **yarn** (v1.22+)
- **Electron**: v35.1.3 or compatible version

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/stack.git
   cd stack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Clean up build artifacts**
   ```bash
   npm run clean
   ```

## 📝 Usage Guide

### Getting Started

1. **Launch the application** - After installation, run the app using `npm start` or open the installed application.

2. **Accessing the Sticky Note**:
   - Press **Ctrl+Enter** (Windows/Linux) or **Cmd+Enter** (macOS) from anywhere on your system
   - Alternative shortcut: **Ctrl+Shift+N** (Windows/Linux) or **Cmd+Shift+N** (macOS)
   - The note will appear with a smooth animation in the center of your screen

3. **Creating Your First Note**:
   - Click into the editor and start typing
   - Use the formatting toolbar at the top to style your text
   - Press Enter to save the note to your stack, or Esc to close without saving

### Working with Notes

#### Text Formatting

- Use the rich text toolbar for formatting options:
  - Bold, italic, underline, and strikethrough
  - Block quotes and code blocks
  - Headers (H1, H2)
  - Ordered and unordered lists

#### Adding Media

1. Click the "Add Media" button
2. Select an image, video, or audio file from your computer (up to 5MB)
3. The media will be displayed in the note preview

#### Managing Your Note Stack

- **Save to Stack**: Press Enter or click the "Save to Stack" button
- **View Stack**: Hover over the stack icon on the right side of the screen
- **Pop Items**: Click the "Pop" button to remove the newest note from the stack
- **Active Task**: The most recently popped item becomes your active task

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Show/Hide Note | Ctrl+Enter or Ctrl+Shift+N | Cmd+Enter or Cmd+Shift+N |
| Save to Stack | Enter | Enter |
| New Line | Shift+Enter | Shift+Enter |
| Close without Saving | Esc | Esc |
| Toggle DevTools | F12 | F12 |

## 🔧 Troubleshooting

### Common Issues

1. **Note doesn't appear when using shortcut**
   - Ensure the application is running in the background
   - Check if another application is using the same shortcut
   - Try the alternative shortcut: Ctrl+Shift+N (or Cmd+Shift+N on macOS)

2. **Rich text editor doesn't load properly**
   - Check your internet connection (the editor loads resources from CDN)
   - Try restarting the application

3. **Images not displaying**
   - Verify the file is under 5MB
   - Ensure the image format is supported (PNG, JPG, GIF, etc.)

4. **Stack doesn't expand properly**
   - Move your cursor to the stack icon on the right edge of the screen
   - Click the hamburger icon to toggle expansion manually

## 🛠️ Development

The application is built with Electron and consists of these main components:

- **Main Process**:
  - Controls app lifecycle, window creation, and IPC communication

- **Renderer Processes**:
  - Sticky note interface for creating notes
  - Stack interface for managing saved notes

- **Styling**:
  - Modern iOS-inspired design with blur effects and animations

### Project Structure

```
stack/
├── src/
│   ├── main/             # Main process files
│   │   ├── main.js       # Main application entry point
│   │   └── native-utils.js  # Native functionality utilities
│   ├── renderer/         # Renderer process files
│   │   ├── stack/        # Stack UI component
│   │   │   ├── stack.html  # Stack view HTML
│   │   │   └── stack.js  # Stack functionality
│   │   └── sticky-note/  # Sticky note UI component
│   │       ├── sticky-note.html  # Sticky note HTML
│   │       └── sticky-note.js  # Note functionality
│   ├── styles/           # CSS styling
│   │   └── styles.css    # Global application styles
│   └── index.html        # Main application HTML
├── tests/                # Test files
│   ├── app.test.js       # Application structure tests
│   ├── ui.test.js        # UI component tests
│   └── ipc.test.js       # IPC communication tests
├── index.js              # Entry point redirector
├── jest.config.js        # Jest test configuration
├── package.json          # Project metadata and dependencies
├── .gitignore            # Git ignore file
└── README.md             # Project documentation
```

### Running Tests

The project includes a comprehensive test suite with Jest:

```bash
npm test
```

Tests cover:
- Application structure and file integrity
- UI component validation
- IPC communication patterns
- Code quality checks

### Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure everything works (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Electron](https://www.electronjs.org/) - For making cross-platform desktop apps possible
- [Quill](https://quilljs.com/) - Rich text editor used in the application
- [Jest](https://jestjs.io/) - Testing framework

---

Made with ❤️ by the Stack Development Team
