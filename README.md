# News Portal with Authentication

A modern news portal application with user authentication system built using Node.js, Express, and MongoDB.

## Features

### Authentication System
- User registration with email and password
- Secure login system with token-based authentication
- Remember me functionality
- Password visibility toggle
- Logout functionality
- Session management via localStorage

### News Portal
- Modern responsive design
- News categories:
  - Sports (Cricket, Football, Basketball)
  - Technology (AI, Gadgets, Software)
  - Health (Fitness, Nutrition)
  - Finance (Stocks, Cryptocurrency, Banking)
  - Education (Higher Education, School Education, EdTech)
- Search functionality
- User profile management
- Responsive navigation

## Project Structure

```
project_root/
├── login/
│   └── server/
│       ├── public/
│       │   ├── login.html  - Main login page
│       │   ├── signup.html - Signup page
│       │   └── style.css   - Authentication styling
│       ├── app.js          - Main Express server
│       └── signup.js       - Signup route handling
└── Minor Project/
    └── Main/
        ├── index.html      - News portal main page
        ├── style.css       - News portal styling
        ├── script.js       - News portal functionality
        └── assets/         - Images and icons
```

## API Endpoints Documentation

### Authentication Endpoints

#### 1. Login Page
- **Endpoint**: `/`
- **Method**: `GET`
- **Description**: Serves the main login page
- **Response**: Returns login.html page
- **Status Codes**:
  - `200`: Success
  - `404`: Page not found

#### 2. Login Submit
- **Endpoint**: `/submit`
- **Method**: `POST`
- **Description**: Handles user login authentication
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Login successful! Welcome to News App!",
    "redirect": "/Main/index.html",
    "token": "base64encodedtoken",
    "user": {
      "email": "user@example.com"
    }
  }
  ```
- **Status Codes**:
  - `200`: Login successful
  - `400`: Invalid credentials or missing fields
  - `500`: Server error

#### 3. Signup Page
- **Endpoint**: `/signup`
- **Method**: `GET`
- **Description**: Serves the signup page
- **Response**: Returns signup.html page
- **Status Codes**:
  - `200`: Success
  - `404`: Page not found

#### 4. Signup Submit
- **Endpoint**: `/signup`
- **Method**: `POST`
- **Description**: Registers a new user
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**: "Signup successful! Redirecting to login."
- **Error Response**: 
  ```json
  {
    "error": "User already exists. Please log in."
  }
  ```
- **Status Codes**:
  - `201`: User created successfully
  - `400`: User already exists or invalid input
  - `500`: Server error

### Static File Endpoints

#### 1. Main News Portal
- **Endpoint**: `/Main/*`
- **Method**: `GET`
- **Description**: Serves static files from the Main directory
- **Examples**:
  - `/Main/index.html`: Main news portal page
  - `/Main/style.css`: Stylesheet
  - `/Main/script.js`: JavaScript file
- **Status Codes**:
  - `200`: File served successfully
  - `404`: File not found

#### 2. Public Assets
- **Endpoint**: `/public/*`
- **Method**: `GET`
- **Description**: Serves static files from the public directory
- **Examples**:
  - `/public/style.css`: Login/Signup styles
  - `/public/eye-open.png`: UI assets
  - `/public/eye-close.png`: UI assets
- **Status Codes**:
  - `200`: File served successfully
  - `404`: File not found

### Authentication Flow

1. User accesses `/` (login page)
2. User submits credentials to `/submit`
3. Server validates credentials and returns a token
4. Client stores token in localStorage
5. On successful login, redirected to `/Main/index.html`
6. If token is missing, user is redirected back to login
7. On logout, token is removed and user is redirected to login

## Token-Based Authentication

The application uses a simple token-based authentication system:

1. When a user logs in, the server generates a token based on the user's email and timestamp
2. This token is sent back to the client and stored in localStorage
3. The news portal checks for this token on every page load
4. If the token is missing, the user is redirected to the login page
5. On logout, the token is cleared from localStorage

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install express mongoose body-parser
   ```

2. Start MongoDB server:
   ```bash
   mongod
   ```

3. Start the application:
   ```bash
   node login/server/app.js
   ```

4. Access the application at:
   ```
   http://localhost:5002
   ```

## Security Considerations

- The current implementation uses a simple token mechanism. For production:
  - Implement proper JWT tokens with expiration
  - Add HTTPS
  - Store passwords securely with bcrypt
  - Implement CSRF protection

## Troubleshooting

### Common Issues

1. **Cannot GET /Main/login.html error**:  
   This happens if redirect paths are inconsistent. The fix has been applied to ensure all redirects point to proper paths.

2. **Token issues**:  
   If experiencing authentication problems, clear localStorage and try again.
   ```javascript
   localStorage.clear();
   ```

3. **MongoDB connection errors**:  
   Ensure MongoDB is running locally at the default port.

## Future Enhancements

- Password hashing with bcrypt
- Email verification
- Password reset functionality
- OAuth integration
- Enhanced session management
- News API integration with proper API key management
- User preferences

### Error Handling

All endpoints include error handling with appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input or missing fields
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side errors

### Response Headers

Common response headers for all endpoints:
```http
Content-Type: application/json
X-Powered-By: Express
Access-Control-Allow-Origin: *
```

### Request Rate Limiting

- Maximum 100 requests per IP per 15 minutes
- Applies to all endpoints except static file serving

### Registration Flow

1. User accesses `/signup`