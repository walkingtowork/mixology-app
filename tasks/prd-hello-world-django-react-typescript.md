# Product Requirements Document: Hello World Django + React TypeScript Setup

## Introduction/Overview

This PRD outlines the requirements for setting up a foundational "Hello World" application that demonstrates a Django backend API integrated with a React frontend using TypeScript. This setup will serve as a template and foundation for future development work, establishing the basic architecture, development workflow, and integration patterns between the Django REST API and React TypeScript frontend.

The application will demonstrate end-to-end communication between the frontend and backend by fetching a "Hello World" message from a Django API endpoint and displaying it in the React application.

## Goals

1. Establish a working Django backend with REST API capabilities
2. Set up a React application with TypeScript configuration
3. Enable CORS to allow cross-origin requests between Django and React development servers
4. Demonstrate successful API communication by fetching and displaying data from Django in React
5. Create a project structure that follows best practices and can serve as a foundation for future features
6. Provide a development environment that allows both servers to run simultaneously

## User Stories

1. **As a developer**, I want to run the Django backend server so that I can access API endpoints during development.

2. **As a developer**, I want to run the React development server so that I can see my frontend changes in real-time.

3. **As a developer**, I want the React frontend to successfully fetch data from the Django API so that I can verify the integration is working correctly.

4. **As a developer**, I want to see a "Hello World" message displayed in the React app that was fetched from the Django backend so that I can confirm the full stack is functioning.

5. **As a developer**, I want a clear project structure so that I can easily understand where to add new features in the future.

## Functional Requirements

1. The system must include a Django project with a REST API endpoint that returns a "Hello World" message.

2. The Django backend must be configured to allow CORS requests from the React development server (typically running on `http://localhost:3000` or similar).

3. The Django API must expose at least one endpoint (e.g., `/api/hello/`) that returns a JSON response containing a "Hello World" message.

4. The system must include a React application configured with TypeScript.

5. The React application must be able to make HTTP requests to the Django API backend.

6. The React application must fetch the "Hello World" message from the Django API endpoint and display it in the user interface.

7. The React application must handle the API response appropriately (display success state, handle errors if any).

8. Both Django and React servers must be able to run simultaneously during development without conflicts.

9. The project structure must clearly separate backend (Django) and frontend (React) code.

10. The Django project must include proper Python virtual environment setup instructions or configuration.

11. The React project must include proper Node.js dependency management (package.json, node_modules).

12. The project must include documentation (README or setup instructions) explaining how to start both servers.

13. The project must include a `.gitignore` file to exclude unnecessary files from version control.

14. The project must use environment variables for configuring API base URLs in both Django and React applications.

## Non-Goals (Out of Scope)

1. **Authentication/Authorization**: User login, registration, or session management is not included in this initial setup.

2. **Database Integration**: No database models, migrations, or database connections are required for this Hello World setup.

3. **Production Deployment**: This setup is focused on development environment only. Production deployment configuration (Docker, deployment scripts, etc.) is out of scope.

4. **Advanced React Features**: State management libraries (Redux, Zustand, etc.), routing, or complex component architecture are not required.

5. **Advanced Django Features**: Admin panel configuration, middleware beyond CORS, or advanced Django features are not included.

6. **Testing**: Unit tests, integration tests, or test setup are not part of this initial foundation.

7. **Styling Framework**: Advanced CSS frameworks, styling libraries, or design systems are not required (basic styling is acceptable).

8. **Build Optimization**: Production build optimization, code splitting, or bundling optimization is out of scope.

## Design Considerations

1. **UI Simplicity**: The Hello World display should be simple and clear - a centered message or basic component that shows the fetched text.

2. **Error Handling**: The UI should gracefully handle cases where the API is unavailable (e.g., show an error message or loading state).

3. **Loading States**: Consider showing a loading indicator while fetching data from the API.

4. **Minimal Styling**: Basic, clean styling is sufficient. The focus is on functionality, not visual design.

## Technical Considerations

1. **Django REST Framework**: The project must use Django REST Framework (DRF) for API development to provide a consistent, well-structured API interface.

2. **CORS Configuration**: Use `django-cors-headers` package or configure CORS settings in Django to allow requests from the React development server.

3. **API Response Format**: The API should return JSON data. Example: `{"message": "Hello World"}` or similar.

4. **HTTP Client in React**: Use `fetch` API or a library like `axios` for making HTTP requests from React.

5. **TypeScript Types**: Define TypeScript interfaces/types for the API response to ensure type safety.

6. **Development Ports**: 
   - Django typically runs on `http://localhost:8000`
   - React development server typically runs on `http://localhost:3000`
   - Ensure these don't conflict and are properly configured

7. **Project Structure**: Recommended structure:
   ```
   project-root/
   ├── backend/          # Django project
   │   ├── manage.py
   │   └── ...
   ├── frontend/         # React project
   │   ├── src/
   │   ├── package.json
   │   └── ...
   └── README.md
   ```

8. **Environment Variables**: The project must use environment variables for API base URLs to make configuration flexible across different environments. Both Django and React should support environment variable configuration.

9. **Python Version**: The project must support Python 3.12+ (latest stable version). This should be specified in requirements or documentation.

10. **Node.js Version**: The project must support Node.js 20 LTS (latest stable LTS version). This should be specified in package.json or documentation.

11. **.gitignore File**: The project must include a `.gitignore` file that excludes:
    - Python virtual environment directories (`venv/`, `env/`, `.venv/`)
    - Python cache files (`__pycache__/`, `*.pyc`, `*.pyo`)
    - Node.js dependencies (`node_modules/`)
    - Environment variable files (`.env`, `.env.local`)
    - IDE/editor files (`.vscode/`, `.idea/`, `*.swp`)
    - OS files (`.DS_Store`, `Thumbs.db`)
    - Build artifacts (`dist/`, `build/`, `*.egg-info/`)

12. **Package Versions**: Dependencies should use the latest compatible versions unless there's a specific reason to pin an older version (e.g., known compatibility issues). This applies to both `requirements.txt` (Python) and `package.json` (Node.js).

13. **Documentation**: The README must include:
    - Setup instructions for both backend and frontend
    - Instructions for starting both development servers
    - Environment variable configuration guide
    - Common troubleshooting steps for typical setup issues (e.g., port conflicts, CORS errors, dependency installation issues, virtual environment activation)

## Success Metrics

1. **Functional Success**: 
   - Django server starts without errors
   - React development server starts without errors
   - React app successfully fetches and displays "Hello World" message from Django API
   - No CORS errors in browser console

2. **Setup Success**:
   - A developer can follow the setup instructions and get both servers running within 15 minutes
   - All dependencies install without conflicts

3. **Code Quality**:
   - TypeScript compiles without errors
   - No console errors in browser when accessing the React app
   - Django server logs show successful API requests

## Resolved Decisions

1. **Django REST Framework**: The project will use Django REST Framework (DRF) for API development.

2. **Version Requirements**: 
   - Python 3.12+ (latest stable version)
   - Node.js 20 LTS (latest stable LTS version)

3. **.gitignore File**: A comprehensive `.gitignore` file will be included for both Django and React.

4. **Package Versions**: Latest compatible versions will be used unless there's a specific reason to pin an older version.

5. **Documentation**: The README will include troubleshooting steps for common setup issues.

6. **Environment Variables**: Environment variables will be used for API base URLs in both Django and React.

