# Stack - Sticky Note Application

A modern, sleek sticky note application built with Electron that provides a seamless way to create, manage, and organize notes with a beautiful iOS-inspired design. Perfect for quick reminders, task tracking, and capturing ideas without interrupting your workflow.

## 🚀 Installation

### Prerequisites

- **Node.js**: v14 or higher (v16+ recommended)
- **npm** (v7+) or **yarn** (v1.22+)
- **Electron**: v25.0.0

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

4. **Build for distribution**
   ```bash
   npm run build
   ```
   This will create executable files for your platform in the build output directory.

## 📝 Usage Guide

### Getting Started

1. **Launch the application** - After installation, run the app using `npm start` or open the installed application.

2. **Accessing the Sticky Note**:
   - Press **Ctrl+Enter** (Windows/Linux) or **Cmd+Enter** (macOS) from anywhere on your system
   - The note will appear with a smooth animation in the center of your screen

3. **Creating Your First Note**:
   - Click into the editor and start typing
   - Use the formatting toolbar at the top to style your text
   - Your note is automatically saved as you type

### Working with Notes

#### Text Formatting

- Select text to reveal the formatting popup menu
- Use keyboard shortcuts for common formatting:
  - **Ctrl/Cmd+B**: Bold
  - **Ctrl/Cmd+I**: Italic
  - **Ctrl/Cmd+U**: Underline
  - **Ctrl/Cmd+1-6**: Heading levels
  - **Ctrl/Cmd+Shift+C**: Code formatting

#### Adding Media

1. Click the media button in the toolbar
2. Select the type of media you want to add
3. Choose a file from your computer or paste a URL
4. Resize images by dragging the corners

#### Managing Your Note Stack

- **Save to Stack**: Press Enter or click the Save button
- **View Stack**: Click the stack icon on the right side of the screen
- **Filter Notes**: Use the search bar in the stack view
- **Organize**: Drag and drop notes to reorder them
- **Delete**: Hover over a note and click the delete icon

### Customization

Access the settings through the application menu:

- **Appearance**: Change theme, font size, and colors
- **Behavior**: Adjust animation speed, auto-save interval
- **Shortcuts**: Customize keyboard shortcuts
- **Startup**: Configure startup behavior (launch on system start, etc.)

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Show/Hide Note | Ctrl+Enter | Cmd+Enter |
| Save to Stack | Enter | Enter |
| New Line | Shift+Enter | Shift+Enter |
| Close without Saving | Esc | Esc |
| Bold Text | Ctrl+B | Cmd+B |
| Italic Text | Ctrl+I | Cmd+I |
| Underline | Ctrl+U | Cmd+U |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Shift+Z | Cmd+Shift+Z |
| Find in Note | Ctrl+F | Cmd+F |

## 🔧 Troubleshooting

### Common Issues

1. **Note doesn't appear when using shortcut**
   - Ensure the application is running in the background
   - Check if another application is using the same shortcut
   - Try restarting the application

2. **Formatting toolbar doesn't show**
   - Select some text to make the toolbar appear
   - Check if you're in read-only mode

3. **Images not displaying**
   - Verify the image path is correct
   - Check your internet connection for remote images
   - Ensure the image format is supported (PNG, JPG, GIF, etc.)

4. **Application crashes**
   - Check the application logs
   - Make sure you're using a compatible version of Node.js and Electron

### Getting Help

If you encounter problems, open an issue in the GitHub repository with:
- A clear description of the problem
- Steps to reproduce the issue
- System information (OS, Node.js version, etc.)
- Any relevant error messages

## 🛠️ Development

The application is built with Electron and consists of these main components:

- **Main Process**:
  - `main.js`: Controls app lifecycle, window creation, and IPC

- **Renderer Processes**:
  - `sticky-note.js`: Interface for the floating sticky note
  - `stack.js`: Manages the note stack interface

- **Styling**:
  - `styles.css`: Global styles for the application

### Project Structure

```
stack/
├── main.js           # Main process entry point
├── sticky-note.js    # Sticky note renderer logic
├── stack.js          # Stack view renderer logic
├── styles.css        # Application styles
├── sticky-note.html  # Sticky note HTML template
├── stack.html        # Stack view HTML template
├── index.html        # Main application HTML
├── native-utils.js   # Native functionality utilities
├── package.json      # Project metadata and dependencies
└── node_modules/     # Node.js dependencies
```

### Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Electron](https://www.electronjs.org/) - For making cross-platform desktop apps possible
- [Quill](https://quilljs.com/) - Rich text editor used in the application

---

Made with ❤️ by the Stack Development Team 
