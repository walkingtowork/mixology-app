# Hello World Django + React TypeScript Setup

A foundational "Hello World" application demonstrating a Django REST API backend integrated with a React TypeScript frontend. This project serves as a template and foundation for future development work, establishing the basic architecture, development workflow, and integration patterns between Django and React.

The application demonstrates end-to-end communication by fetching a "Hello World" message from the Django API endpoint and displaying it in the React application.

## Project Structure

```
mixology-app/
├── backend/          # Django project
│   ├── api/         # Django app for API endpoints
│   ├── backend/     # Django project settings
│   ├── venv/        # Python virtual environment (not in git)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React TypeScript project
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── .env.example
├── tasks/           # Project documentation
└── README.md
```

## Requirements

- **Python**: 3.12+ (latest stable version)
- **Node.js**: 20 LTS (latest stable LTS version)
- **npm**: Comes with Node.js

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
```

### 3. Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and set your `DJANGO_SECRET_KEY`:

```
DJANGO_SECRET_KEY=your-secret-key-here
API_BASE_URL=http://localhost:8000
```

**Note**: For development, you can use the default secret key, but for production, generate a secure key.

### 6. Run Database Migrations

```bash
python manage.py migrate
```

This will create the necessary database tables, including the custom User model.

### 7. Create Superuser (Optional)

To access the Django admin interface, create a superuser account:

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin account. For development/testing, you can use:
- **Username**: `admin`
- **Email**: `admin@example.com` (or leave blank)
- **Password**: `admin` (or any password you prefer)

**Note**: Using simple credentials like "admin"/"admin" is acceptable for development but should never be used in production.

### 8. Verify Django Setup

```bash
python manage.py check
```

You should see: `System check identified no issues (0 silenced).`

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

The `.env` file should contain:

```
VITE_API_BASE_URL=http://localhost:8000
```

**Note**: If you're using Create React App instead of Vite, use `REACT_APP_API_BASE_URL` instead of `VITE_API_BASE_URL`.

## Running the Application

### Start Django Backend Server

In the `backend/` directory (with virtual environment activated):

```bash
python manage.py runserver
```

The Django server will start on `http://localhost:8000`

### Start React Frontend Server

In a **new terminal**, navigate to the `frontend/` directory:

```bash
cd frontend
npm run dev
```

The React development server will start on `http://localhost:3000` (or the next available port).

### Access the Application

Open your browser and navigate to `http://localhost:3000`. You should see the "Hello World" message fetched from the Django API.

### Access Django Admin

To access the Django admin interface for user management:

1. Navigate to `http://localhost:8000/admin/` in your browser
2. Log in with your superuser credentials (e.g., username: `admin`, password: `admin`)
3. You can view, create, and edit users from the admin interface

## API Endpoint

The Django backend exposes a simple API endpoint:

- **URL**: `http://localhost:8000/api/hello/`
- **Method**: GET
- **Response**: 
  ```json
  {
    "message": "Hello World"
  }
  ```

## Troubleshooting

### Port Conflicts

**Problem**: Port 8000 or 3000 is already in use.

**Solution**: 
- For Django: Use a different port with `python manage.py runserver 8001`
- For React: Vite will automatically use the next available port, or specify with `npm run dev -- --port 3001`
- Update environment variables if you change ports

### CORS Errors

**Problem**: Browser console shows CORS errors when React tries to fetch from Django.

**Solution**:
1. Verify `django-cors-headers` is installed: `pip list | grep django-cors-headers`
2. Check that `corsheaders` is in `INSTALLED_APPS` in `backend/backend/settings.py`
3. Verify `CorsMiddleware` is in `MIDDLEWARE` (should be before `CommonMiddleware`)
4. Confirm `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000` in `backend/backend/settings.py`
5. Restart the Django server after making changes

### Dependency Installation Issues

**Problem**: `pip install` or `npm install` fails.

**Solution**:
- **Python**: Ensure you're using Python 3.12+. Check with `python3 --version`
- **Node.js**: Ensure you're using Node.js 20 LTS. Check with `node --version`
- **Virtual Environment**: Make sure the virtual environment is activated before installing Python packages
- **Clear Cache**: Try `pip install --upgrade pip` or `npm cache clean --force`
- **Delete and Reinstall**: Remove `node_modules/` and `package-lock.json`, then run `npm install` again

### Virtual Environment Activation Problems

**Problem**: `source venv/bin/activate` doesn't work or `python` command not found.

**Solution**:
- Ensure you're in the `backend/` directory
- Verify the virtual environment exists: `ls venv/bin/activate`
- On Windows, use `venv\Scripts\activate` instead
- If activation fails, recreate the venv: `rm -rf venv && python3 -m venv venv`

### Environment Variable Configuration

**Problem**: API calls fail or use wrong URL.

**Solution**:
- **Django**: Ensure `.env` file exists in `backend/` directory and `python-dotenv` is installed
- **React**: Ensure `.env` file exists in `frontend/` directory
- **Vite**: Environment variables must be prefixed with `VITE_` to be accessible in the app
- **Restart Servers**: Environment variables are loaded at startup, so restart both servers after changing `.env` files
- Check the variable name: Use `VITE_API_BASE_URL` for Vite, `REACT_APP_API_BASE_URL` for Create React App

### TypeScript Compilation Errors

**Problem**: TypeScript errors when building or running the app.

**Solution**:
- Run `npx tsc --noEmit` to check for TypeScript errors
- Ensure all imports are correct and types are properly defined
- Check `tsconfig.json` configuration
- Verify Node.js version is 20 LTS

### Django Server Won't Start

**Problem**: `python manage.py runserver` fails.

**Solution**:
- Ensure virtual environment is activated
- Run `python manage.py check` to see specific errors
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check for database migration issues (though not needed for this Hello World setup)
- Ensure no other process is using port 8000

### React Server Won't Start

**Problem**: `npm run dev` fails.

**Solution**:
- Ensure Node.js 20 LTS is installed: `node --version`
- Delete `node_modules/` and `package-lock.json`, then run `npm install` again
- Check for port conflicts (try a different port)
- Verify `package.json` is valid JSON

## Verification Checklist

After setup, verify everything works:

- [ ] Django server starts without errors on `http://localhost:8000`
- [ ] React development server starts without errors on `http://localhost:3000`
- [ ] Visiting `http://localhost:3000` displays "Hello World" message
- [ ] Browser console shows no CORS errors
- [ ] API endpoint `http://localhost:8000/api/hello/` returns `{"message":"Hello World"}`
- [ ] TypeScript compiles without errors (`npx tsc --noEmit` in frontend directory)

## Next Steps

This Hello World setup provides a foundation for building more complex features. You can:

- Add more API endpoints in `backend/api/views.py`
- Create additional React components in `frontend/src/components/`
- Add routing with React Router
- Implement state management (Redux, Zustand, etc.)
- Add database models and migrations
- Implement authentication and authorization
- Add styling frameworks or design systems

## Technologies Used

- **Backend**: Django 4.2, Django REST Framework, django-cors-headers
- **Frontend**: React 18, TypeScript, Vite
- **Language**: Python 3.12+, JavaScript/TypeScript

## License

This is a template project for educational and development purposes.
