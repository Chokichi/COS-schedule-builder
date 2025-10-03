# Student Schedule Builder

A modern React-based web application for building and managing student course schedules. This tool allows students to import course data, filter by subjects, and create their personalized class schedules.

## Features

### 📋 Two-Step Import Process
- **Step 1**: Import schedule data from clipboard (no more slow text boxes!)
- **Step 2**: Select subjects to include in your schedule
- Automatic validation ensures at least one subject is selected

### 🎯 Smart Filtering
- **Subject-based filtering**: Choose which academic subjects to include
- **Course number filtering**: Filter by specific course numbers
- **Instructor filtering**: Find courses by specific instructors
- **Campus filtering**: Filter by campus location
- **Online course support**: Toggle online courses on/off
- **Class capacity options**: Show/hide full classes and waitlist courses

### 📅 Interactive Schedule View
- **Visual schedule grid**: See all courses in a weekly calendar view
- **Overlapping course handling**: Click to cycle through courses in the same time slot
- **Tooltip information**: Hover to see detailed course information
- **Color-coded courses**: Each course has a unique color for easy identification
- **Opacity controls**: Adjust course card opacity for better visibility

### 💾 Data Persistence
- **Local storage**: Automatically saves your schedule and preferences
- **Restore functionality**: Prompt to restore saved data when reopening
- **Cross-session persistence**: Your work is saved between browser sessions

### 🖨️ Print Support
- **Print-friendly schedule**: Generate a clean, printable version of your schedule
- **Dynamic time ranges**: Print view automatically adjusts to your class times
- **Course details table**: Includes comprehensive course information

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **Custom CSS** for advanced styling and animations
- **Local Storage API** for data persistence
- **Clipboard API** for easy data import

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd student-schedule-builder-react
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Usage

### Importing Course Data

1. **Get the data**: Visit your school's schedule website
2. **Copy the table**: Right-click → View Page Source, find and copy the `<table class="dataentrytable">` element
3. **Import**: Click "Import Schedule" → "Import from Clipboard"
4. **Select subjects**: Choose which subjects to include in your schedule
5. **Complete**: Click "Complete Import" to finish

### Building Your Schedule

1. **Filter courses**: Use the filter panel to narrow down available courses
2. **Add courses**: Click the "Add" button on course cards to add them to your schedule
3. **Remove courses**: Click the "Remove" button on courses in "My Schedule"
4. **Handle conflicts**: Use the tooltip to cycle through overlapping courses
5. **Print schedule**: Use the print button to generate a printable version

### Managing Overlapping Courses

When courses overlap in time:
- **Hover** over a course card to see all overlapping courses
- **Click** on a course in the tooltip to bring it to the top
- **All courses with the same CRN** will be brought to the top together

## Project Structure

```
src/
├── components/
│   ├── FilterPanel.tsx      # Course filtering interface
│   ├── ImportModal.tsx      # Two-step import process
│   ├── OnlineCoursesList.tsx # Online course management
│   └── ScheduleGrid.tsx     # Main schedule display
├── utils/
│   └── parser.ts            # HTML table parsing logic
├── types.ts                 # TypeScript type definitions
├── App.tsx                  # Main application component
└── index.tsx               # Application entry point
```

## Key Features Explained

### Two-Step Import Process
The import process is designed to solve the "chicken and egg" problem where you need subjects to select, but subjects only become available after parsing the data. The two-step process ensures a smooth user experience.

### Smart Time Detection
The schedule automatically adjusts its time range based on your selected courses, with intelligent defaults and filtering support.

### Local Storage Integration
Your schedule, filter preferences, and selected courses are automatically saved and restored between sessions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React and Material-UI
- Designed for educational use
- Optimized for student workflow and usability