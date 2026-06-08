# CutSmart API Contract

This document describes the backend API routes that the frontend should call.

## Base URL

Local backend URL:

```text
http://127.0.0.1:5000
```

Example full routes:

```text
http://127.0.0.1:5000/api/register
http://127.0.0.1:5000/api/login
```

## Register

Route:

```text
POST /api/register
```

### Request

Frontend should send JSON with these exact key names:

```json
{
  "username": "wj",
  "email": "wj@example.com",
  "password": "123456"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Registered successfully"
}
```

### For Error Responses

Missing field:

```json
{
  "success": false,
  "message": "Username, email, and password are required"
}
```

Duplicate email:

```json
{
  "success": false,
  "message": "Email already registered"
}
```

## Login

Route:

```text
POST /api/login
```

### Request

Frontend should send JSON with these exact key names:

```json
{
  "email": "wj@example.com",
  "password": "123456"
}
```

### For Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "wj",
    "email": "wj@example.com"
  }
}
```

### For Error Responses

Missing field:

```json
{
  "success": false,
  "message": "Email and password are required"
}
```

Wrong email or password:

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

## Some otes For Frontend

- Register and login must use `POST` to get users data.
- Send request data as JSON.
- Use the exact key names shown in this document.
- `id` is not needed from frontend. The backend creates and returns it.
- The backend wont return the password or password hash.
