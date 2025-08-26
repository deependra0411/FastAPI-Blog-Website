# Modern Blog Application

A professional blog application built with FastAPI backend and vanilla JavaScript frontend.

## Features

- **Modern Architecture**: FastAPI backend with JavaScript frontend
- **Authentication**: JWT-based authentication with secure password hashing
- **Post Management**: Create, read, update, and delete blog posts
- **User Management**: User registration and profile management
- **Contact System**: Contact form with message management
- **Responsive Design**: Mobile-first responsive design
- **Admin Features**: Admin dashboard and user management
- **API Documentation**: Automatic API documentation with Swagger/OpenAPI

## Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation and settings management
- **JWT**: Secure authentication
- **MySQL**: Database (can be easily changed)
- **Uvicorn**: ASGI server

### Frontend
- **Vanilla JavaScript**: Modern ES6+ JavaScript
- **Bootstrap 5**: Responsive CSS framework
- **Font Awesome**: Icons
- **Fetch API**: HTTP client

## Project Structure

```
blog_project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # Authentication utilities
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py          # Authentication routes
│   │       ├── posts.py         # Posts routes
│   │       └── contact.py       # Contact routes
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── config.js            # Configuration
│   │   ├── api.js               # API client
│   │   ├── auth.js              # Authentication management
│   │   ├── posts.js             # Posts management
│   │   └── app.js               # Main application logic
│   └── images/                  # Static images
└── README.md
```

## Installation and Setup

### Prerequisites
- Python 3.8+
- MySQL (or any other supported database)
- Node.js (for optional frontend tooling)

### Backend Setup

1. **Clone the repository and navigate to backend**:
   ```bash
   cd blog_project/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # On Windows
   venv\\Scripts\\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

5. **Set up database**:
   - Create a MySQL database
   - Update the `DATABASE_URL` in your `.env` file
   - The tables will be created automatically when you run the application

6. **Run the backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   API documentation will be available at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd blog_project/frontend
   ```

2. **Serve the frontend**:
   
   **Option 1**: Using Python's built-in server:
   ```bash
   python -m http.server 3000
   ```
   
   **Option 2**: Using Node.js (if you have it installed):
   ```bash
   npx serve -s . -l 3000
   ```
   
   **Option 3**: Use any static file server of your choice

3. **Access the application**:
   Open your browser and go to `http://localhost:3000`

### Configuration

#### Backend Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `mysql://root:password@localhost/blog` |
| `SECRET_KEY` | Secret key for JWT tokens | Required |
| `ADMIN_EMAIL` | Admin user email | `admin@pythoncoders.com` |
| `CORS_ORIGINS` | Allowed origins for CORS | `http://localhost:3000` |

#### Frontend Configuration (js/config.js)

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Backend API URL | `http://localhost:8000/api/v1` |
| `POSTS_PER_PAGE` | Number of posts per page | `3` |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user info

### Posts
- `GET /api/v1/posts/` - Get paginated posts
- `GET /api/v1/posts/{slug}` - Get post by slug
- `POST /api/v1/posts/` - Create new post (authenticated)
- `PUT /api/v1/posts/{id}` - Update post (authenticated)
- `DELETE /api/v1/posts/{id}` - Delete post (authenticated)
- `GET /api/v1/posts/user/my-posts` - Get current user's posts

### Contact
- `POST /api/v1/contact/` - Send contact message
- `GET /api/v1/contact/` - Get contact messages (admin only)

## Features in Detail

### Authentication System
- JWT-based authentication
- Secure password hashing with bcrypt
- Token-based session management
- Role-based access control (admin/user)

### Post Management
- Rich text content support
- SEO-friendly slugs
- Image support
- Draft/published status
- Pagination
- Author attribution

### User Interface
- Responsive design for all devices
- Modern, clean interface
- Toast notifications
- Loading states
- Error handling
- Modal dialogs

### Admin Features
- Admin users can view all posts
- Contact message management
- User management capabilities

## Development

### Running in Development Mode

Backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend: Serve static files on port 3000

### Testing

Run backend tests:
```bash
pytest
```

### Code Quality

Format code:
```bash
black app/
```

Lint code:
```bash
flake8 app/
```

## Deployment

### Backend Deployment

1. **Set production environment variables**
2. **Use a production ASGI server**:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

### Frontend Deployment

Deploy the frontend directory to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any web server

### Database Migration

For production, consider using Alembic for database migrations:
```bash
pip install alembic
alembic init migrations
```

## Security Considerations

- Use strong secret keys in production
- Enable HTTPS in production
- Configure CORS properly
- Use environment variables for sensitive data
- Implement rate limiting
- Regular security updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.

---

## Migration from Flask

This application replaces the original Flask-based blog with a modern architecture:

### Key Improvements
- **Better Performance**: FastAPI is significantly faster than Flask
- **Modern Frontend**: Single-page application with dynamic content loading
- **Better Security**: JWT tokens, improved password hashing, CORS support
- **API-First**: RESTful API design with automatic documentation
- **Better Structure**: Organized code structure with separation of concerns
- **Modern UI**: Responsive design with modern UI components
- **Developer Experience**: Better error handling, validation, and debugging tools

### Migration Notes
- Database schema has been improved but remains compatible
- API endpoints follow RESTful conventions
- Frontend is completely rewritten for better user experience
- Configuration management improved with Pydantic
- Better error handling and validation throughout the application
