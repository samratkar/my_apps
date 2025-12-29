# Professional To-Do Manager

A modern, web-based task management application with YML file support for GitHub Pages.

## Features

- **YML File Support**: Load and export tasks from/to YML files
- **Project Organization**: Group tasks by projects
- **Task Management**: 
  - Task titles and descriptions
  - Priority levels (High, Medium, Low)
  - Status tracking (Pending, In Progress, Completed)
  - Due dates
- **Real-time Statistics**: View task counts by status
- **Export Functionality**: Export updated YML files with changes
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations

## Usage

1. **Load YML File**: Click "Load YML File" to upload your todos.yml file
2. **Load Sample Data**: Click "Load Sample Data" to see example tasks
3. **Update Status**: Use the dropdown menus to change task status
4. **Export Changes**: Click "Export YML" to download updated tasks

## YML File Format

```yaml
projects:
  - name: Project Name
    description: Project description
    todos:
      - id: 1
        title: Task title
        description: Task description
        status: pending # pending, in-progress, or completed
        priority: high # high, medium, or low
        dueDate: 2025-01-15
```

## Technologies

- HTML5
- CSS3 (with modern gradients and animations)
- JavaScript (ES6+)
- js-yaml library for YML parsing

## Demo

Visit the app at: [https://samratkar.github.io/my_apps/todo/](https://samratkar.github.io/my_apps/todo/)

## Sample Data

The app includes `todos.yml` with sample projects:
- Work tasks
- Personal tasks
- Learning goals

## License

Free to use and modify.
