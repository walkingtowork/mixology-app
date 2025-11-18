# Task List: Hello World Django + React TypeScript Setup

## Relevant Files

- `backend/manage.py` - Django project management script
- `backend/backend/settings.py` - Django settings including DRF and CORS configuration
- `backend/backend/urls.py` - Main URL configuration for Django project
- `backend/api/views.py` - DRF API view for Hello World endpoint
- `backend/api/urls.py` - URL routing for API endpoints
- `backend/api/apps.py` - Django app configuration
- `backend/requirements.txt` - Python dependencies and version requirements
- `backend/.env.example` - Example environment variables file for Django
- `frontend/package.json` - Node.js dependencies and scripts
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/src/App.tsx` - Main React application component
- `frontend/src/types/api.ts` - TypeScript type definitions for API responses
- `frontend/src/services/api.ts` - API service functions for making HTTP requests
- `frontend/src/components/HelloWorld.tsx` - React component to display Hello World message
- `frontend/.env.example` - Example environment variables file for React
- `.gitignore` - Git ignore rules for Python and Node.js projects
- `README.md` - Project documentation with setup instructions and troubleshooting

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/hello-world-django-react-typescript`)

- [x] 1.0 Set up project structure and configuration files
  - [x] 1.1 Create `backend/` and `frontend/` directories in the project root
  - [x] 1.2 Create `.gitignore` file in project root with exclusions for Python virtual environments, `__pycache__/`, `node_modules/`, `.env` files, IDE files, OS files, and build artifacts
  - [x] 1.3 Create placeholder `README.md` in project root (will be completed in task 5.0)

- [x] 2.0 Set up Django backend with DRF, CORS, and API endpoint
  - [x] 2.1 Create Python virtual environment in `backend/` directory (e.g., `python3 -m venv venv`)
  - [x] 2.2 Activate virtual environment and install Django, Django REST Framework, django-cors-headers, and python-dotenv using latest compatible versions
  - [x] 2.3 Create Django project structure using `django-admin startproject` (project name: `backend`)
  - [x] 2.4 Create Django app for API using `python manage.py startapp api`
  - [x] 2.5 Configure Django settings (`backend/settings.py`): Add `rest_framework`, `corsheaders`, and `api` to INSTALLED_APPS; configure CORS middleware and allowed origins; set up environment variable loading with python-dotenv
  - [x] 2.6 Create DRF API view in `api/views.py` that returns JSON response `{"message": "Hello World"}` for GET requests
  - [x] 2.7 Configure URL routing: Create `api/urls.py` with route for the hello endpoint, and include it in main `backend/urls.py` under `/api/`
  - [x] 2.8 Create `requirements.txt` in `backend/` with all dependencies and specify Python 3.12+ requirement
  - [x] 2.9 Create `backend/.env.example` file with example environment variables (e.g., `DJANGO_SECRET_KEY`, `API_BASE_URL`)

- [x] 3.0 Set up React frontend with TypeScript
  - [x] 3.1 Create React application with TypeScript in `frontend/` directory using `create-react-app` with TypeScript template or Vite with TypeScript
  - [x] 3.2 Configure environment variables: Create `frontend/.env.example` with `REACT_APP_API_BASE_URL` (or `VITE_API_BASE_URL` if using Vite) pointing to `http://localhost:8000`
  - [x] 3.3 Create TypeScript type definitions in `frontend/src/types/api.ts` for the API response (e.g., `HelloWorldResponse` interface with `message: string`)
  - [x] 3.4 Verify TypeScript configuration in `tsconfig.json` is properly set up

- [x] 4.0 Integrate React frontend with Django API
  - [x] 4.1 Create API service function in `frontend/src/services/api.ts` using `fetch` API to call the Django `/api/hello/` endpoint, using environment variable for base URL
  - [x] 4.2 Create `HelloWorld` component in `frontend/src/components/HelloWorld.tsx` that fetches and displays the message from the API
  - [x] 4.3 Add loading state (show loading indicator while fetching) and error handling (display error message if API call fails) to the HelloWorld component
  - [x] 4.4 Integrate HelloWorld component into main `App.tsx` with basic styling (centered message, clean layout)
  - [x] 4.5 Test the integration: Start Django server, start React dev server, verify message displays correctly and no CORS errors appear in browser console

- [x] 5.0 Create documentation and finalize setup
  - [x] 5.1 Write comprehensive `README.md` with project overview, Python 3.12+ and Node.js 20 LTS version requirements
  - [x] 5.2 Add setup instructions: Backend setup (virtual environment, dependencies, environment variables), Frontend setup (dependencies, environment variables)
  - [x] 5.3 Add instructions for starting both development servers (Django on port 8000, React on port 3000)
  - [x] 5.4 Add troubleshooting section covering: port conflicts, CORS errors, dependency installation issues, virtual environment activation problems, environment variable configuration
  - [x] 5.5 Verify all functional requirements from PRD are met: Django API endpoint works, CORS is configured, React fetches and displays message, both servers run simultaneously
  - [x] 5.6 Test complete setup from scratch: Follow README instructions, verify both servers start, verify Hello World message displays correctly

