# MERN Stack - Student CRUD App

A full-stack MERN (MongoDB, Express, React, Node.js) application for managing students with full CRUD operations.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally on port 27017

## Setup

### 1. Install server dependencies

```bash
cd server
npm install
```

### 2. Install client dependencies

```bash
cd client
npm install
```

## Running the App

### Start the server (port 5000)

```bash
cd server
npm run dev
```

### Start the client (port 3000)

```bash
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| GET    | /api/students       | List all students |
| GET    | /api/students/:id   | Get one student    |
| POST   | /api/students       | Create a student   |
| PUT    | /api/students/:id   | Update a student   |
| DELETE | /api/students/:id   | Delete a student   |

## Student Fields

- **name** - Student name (required)
- **email** - Email address (required, unique)
- **age** - Age (required)
- **course** - Enrolled course (required)
