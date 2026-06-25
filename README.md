# SmartOps Backend API

The SmartOps Backend is a RESTful API built to power the SmartOps platform, providing secure and scalable services for project management, task tracking, user administration, client requests, notifications, and AI-powered project analysis.

This backend serves both the web application and mobile application through a centralized API layer, ensuring consistent business logic, security, and data management across the entire platform.

## Core Features

### Authentication & Authorization

* JWT Authentication
* Role-Based Access Control (RBAC)
* Protected Routes
* Password Recovery via Email OTP

### User Management

* User Registration & Login
* User Profile Management
* Role Assignment and Access Control

### Project Management

* Create and Manage Projects
* Project Status Tracking
* Project Templates
* Client Project Requests

### Task Management

* Task Creation and Assignment
* Task Status Updates
* Task Priority Management
* Progress Tracking

### Notification System

* Real-Time Notifications
* Read / Unread Management
* Notification History

### AI Project Health Analysis

* Project Health Score Calculation
* Risk Assessment
* Delay Prediction
* Automated Recommendations

## Technology Stack

| Category                | Technology |
| ----------------------- | ---------- |
| Runtime                 | Node.js    |
| Framework               | Express.js |
| Database                | MySQL      |
| Authentication          | JWT        |
| Validation              | Zod        |
| Real-Time Communication | Socket.IO  |
| Deployment              | Railway    |

## Architecture

The backend follows a layered architecture to improve maintainability, scalability, and code organization.

```text
Routes
   ↓
Controllers
   ↓
Services
   ↓
Repositories
   ↓
MySQL Database
```

## Security

SmartOps implements multiple security mechanisms:

* JWT-based Authentication
* Role-Based Authorization (RBAC)
* Input Validation using Zod
* Protected API Endpoints
* Secure Password Hashing

## AI Analysis Module

The AI analysis module evaluates project performance using project and task data such as:

* Completion Percentage
* Delayed Tasks
* Task Priorities
* Project Timeline
* Workload Distribution

Based on these metrics, the system generates:

* Health Score
* Risk Level
* Delay Predictions
* Management Recommendations

## Deployment

The backend is deployed on Railway and connected to a MySQL database, allowing secure access from both the web and mobile applications.

## Authors

Mahmood Asmar
yousef hanna

Graduation Project – Computer Engineering
