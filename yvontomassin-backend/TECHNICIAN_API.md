# Technician API Documentation

## Base URL

`/api/v1/technician`

## Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Public Endpoints

### 1. Register Technician

**POST** `/technician/register`

Register a new technician account.

**Request Body:**

```json
{
  "name": "Md. Kamrul Hasan",
  "email": "kamrul.hasan@gmail.com",
  "password": "password123",
  "phoneNumber": "+8801812345678",
  "serviceCategory": "Car Repair",
  "yearsOfExperience": 6,
  "address": {
    "streetAddress": "House 22, Wireless Gate Area",
    "city": "Dhaka",
    "state": "Dhaka",
    "zipCode": "1212"
  },
  "bio": "Experienced car repair technician with 6 years of expertise"
}
```

**With Profile Image (Multipart Form Data):**

- `profileImage`: Image file
- `data`: JSON stringified body (same as above)

**Service Category Options:**

- Car Repair
- Electrical
- AC & Fridge
- Electronics
- Plumbing

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Technician registered successfully. Please check your email for the verification code.",
  "data": {
    "email": "kamrul.hasan@gmail.com",
    "name": "Md. Kamrul Hasan",
    "id": "507f1f77bcf86cd799439011",
    "role": "technician",
    "serviceCategory": "Car Repair"
  }
}
```

---

### 2. Verify Email

**POST** `/technician/verify-email`

Verify technician email with the code sent during registration.

**Request Body:**

```json
{
  "email": "kamrul.hasan@gmail.com",
  "code": "123456"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "message": "Email verified successfully"
  }
}
```

---

### 3. Resend Verification Code

**POST** `/technician/resend-verification-code`

Request a new verification code.

**Request Body:**

```json
{
  "email": "kamrul.hasan@gmail.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "message": "Verification code sent successfully"
  }
}
```

---

### 4. Login Technician

**POST** `/technician/login`

Login to technician account.

**Request Body:**

```json
{
  "email": "kamrul.hasan@gmail.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Technician logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "technician": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Md. Kamrul Hasan",
      "email": "kamrul.hasan@gmail.com",
      "phoneNumber": "+8801812345678",
      "serviceCategory": "Car Repair",
      "yearsOfExperience": 6,
      "address": {
        "streetAddress": "House 22, Wireless Gate Area",
        "city": "Dhaka",
        "state": "Dhaka",
        "zipCode": "1212"
      },
      "bio": "Experienced car repair technician",
      "profileImage": "https://files.example.com/...",
      "rating": 4.7,
      "totalRatings": 120,
      "status": "active",
      "completedJobs": 189,
      "role": "technician",
      "isVerified": true,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-28T10:00:00.000Z"
    }
  }
}
```

---

### 5. Forget Password

**POST** `/technician/forget-password`

Request a password reset code.

**Request Body:**

```json
{
  "email": "kamrul.hasan@gmail.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Reset code sent to your email",
  "data": {
    "message": "Reset code sent to your email"
  }
}
```

---

### 6. Reset Password

**POST** `/technician/reset-password`

Reset password using the code sent to email.

**Request Body:**

```json
{
  "email": "kamrul.hasan@gmail.com",
  "code": "123456",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

### 7. Get All Technicians

**GET** `/technician`

Get list of all technicians with filtering and search.

**Query Parameters:**

- `search`: Search by name, email, phone, service category, city, state
- `serviceCategory`: Filter by service category
- `status`: Filter by status (active, inactive, blocked)
- `city`: Filter by city
- `state`: Filter by state
- `minRating`: Minimum rating filter
- `minExperience`: Minimum years of experience
- `sortBy`: Field to sort by (e.g., rating, createdAt)
- `sortOrder`: Sort order (asc, desc)

**Example Request:**

```
GET /technician?serviceCategory=Car Repair&city=Dhaka&sortBy=rating&sortOrder=desc
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Technicians retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Md. Kamrul Hasan",
      "email": "kamrul.hasan@gmail.com",
      "phoneNumber": "+8801812345678",
      "serviceCategory": "Car Repair",
      "yearsOfExperience": 6,
      "address": {
        "streetAddress": "House 22, Wireless Gate Area",
        "city": "Dhaka",
        "state": "Dhaka",
        "zipCode": "1212"
      },
      "profileImage": "https://files.example.com/...",
      "rating": 4.7,
      "completedJobs": 189,
      "status": "active"
    }
  ]
}
```

---

### 8. Get Single Technician

**GET** `/technician/:id`

Get details of a specific technician.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Technician retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Md. Kamrul Hasan",
    "email": "kamrul.hasan@gmail.com",
    "phoneNumber": "+8801812345678",
    "serviceCategory": "Car Repair",
    "yearsOfExperience": 6,
    "address": {
      "streetAddress": "House 22, Wireless Gate Area",
      "city": "Dhaka",
      "state": "Dhaka",
      "zipCode": "1212"
    },
    "bio": "Experienced car repair technician",
    "profileImage": "https://files.example.com/...",
    "rating": 4.7,
    "totalRatings": 120,
    "status": "active",
    "completedJobs": 189,
    "role": "technician",
    "isVerified": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-28T10:00:00.000Z"
  }
}
```

---

## Protected Endpoints (Require Authentication)

### 9. Get Technician Profile

**GET** `/technician/profile/me`

**Headers:**

```
Authorization: Bearer <access_token>
```

Get authenticated technician's profile.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Technician profile retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Md. Kamrul Hasan",
    "email": "kamrul.hasan@gmail.com",
    "phoneNumber": "+8801812345678",
    "serviceCategory": "Car Repair",
    "yearsOfExperience": 6,
    "address": {
      "streetAddress": "House 22, Wireless Gate Area",
      "city": "Dhaka",
      "state": "Dhaka",
      "zipCode": "1212"
    },
    "bio": "Experienced car repair technician",
    "profileImage": "https://files.example.com/...",
    "rating": 4.7,
    "totalRatings": 120,
    "status": "active",
    "completedJobs": 189,
    "role": "technician",
    "isVerified": true
  }
}
```

---

### 10. Update Technician Profile

**PATCH** `/technician/profile/me`

**Headers:**

```
Authorization: Bearer <access_token>
```

Update authenticated technician's profile.

**Request Body (JSON):**

```json
{
  "name": "Md. Kamrul Hasan",
  "phoneNumber": "+8801812345678",
  "serviceCategory": "Electrical",
  "yearsOfExperience": 7,
  "address": {
    "streetAddress": "House 23, New Area",
    "city": "Dhaka",
    "state": "Dhaka",
    "zipCode": "1213"
  },
  "bio": "Updated bio text"
}
```

**With Profile Image (Multipart Form Data):**

- `profileImage`: Image file
- `data`: JSON stringified body (same as above)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Technician profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Md. Kamrul Hasan",
    "email": "kamrul.hasan@gmail.com",
    "phoneNumber": "+8801812345678",
    "serviceCategory": "Electrical",
    "yearsOfExperience": 7,
    "address": {
      "streetAddress": "House 23, New Area",
      "city": "Dhaka",
      "state": "Dhaka",
      "zipCode": "1213"
    },
    "bio": "Updated bio text",
    "profileImage": "https://files.example.com/...",
    "rating": 4.7,
    "status": "active",
    "completedJobs": 189
  }
}
```

---

### 11. Change Password

**POST** `/technician/change-password`

**Headers:**

```
Authorization: Bearer <access_token>
```

Change technician password.

**Request Body:**

```json
{
  "oldPassword": "password123",
  "newPassword": "newPassword456"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid verification code",
  "errorMessages": []
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "You are not authorized!",
  "errorMessages": []
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "errorMessages": []
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Technician not found",
  "errorMessages": []
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "Email already registered",
  "errorMessages": []
}
```

### 422 Validation Error

```json
{
  "success": false,
  "message": "Validation Error",
  "errorMessages": [
    {
      "path": "body.name",
      "message": "Name must be at least 3 characters"
    },
    {
      "path": "body.email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Notes

1. **Email Verification**: After registration, technicians must verify their email before they can log in.

2. **Profile Image Upload**: When uploading images, use multipart/form-data with:
   - `profileImage`: The image file
   - `data`: JSON stringified request body

3. **Authentication**: After successful login:
   - Store the `accessToken` from the response
   - Include it in all protected route requests as: `Authorization: Bearer <accessToken>`
   - A `refreshToken` is also set as an HTTP-only cookie

4. **Service Categories**: Only these exact values are accepted:
   - Car Repair
   - Electrical
   - AC & Fridge
   - Electronics
   - Plumbing

5. **Status Values**:
   - `active`: Technician is active and can accept jobs
   - `inactive`: Technician is temporarily inactive
   - `blocked`: Technician account is blocked by admin

6. **Ratings**: The `rating` field is a computed average (0-5 scale) and cannot be directly updated through the profile API. It's calculated from customer reviews.

7. **Completed Jobs**: This counter is automatically incremented when jobs are marked as complete.
