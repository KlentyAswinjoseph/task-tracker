# Task Tracker - Modern Full-Stack Application

A modern, full-stack task tracking application built with React + TypeScript frontend and Node.js + Express + TypeScript backend. This project provides comprehensive analytics for Git branch management, user productivity tracking, and task lifecycle metrics.

## 🏗️ Architecture

```
task-tracker/
├── client/                # React app (CRA with TypeScript)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main page components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global CSS styles
│   └── public/            # Static assets
├── server/                # Node.js + Express backend
│   ├── src/
│   │   ├── models/        # Mongoose data models
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Backend utilities
│   └── dist/              # Compiled TypeScript output
├── shared/                # Shared TypeScript types
└── README.md
```

## ✨ Features

### 📊 Branch Dashboard
- **Real-time Analytics**: Track total users, branches, commits, and waiting times
- **User Performance**: Monitor individual developer productivity
- **Status Tracking**: Active, merged, and deployed branch status
- **Time Metrics**: Average waiting times and development cycles

### 📋 Task Analytics
- **Task Lifecycle**: Complete task progression from creation to completion
- **Work Time Tracking**: Detailed work time analysis per task
- **Assignee Analytics**: Task distribution and performance by assignee
- **Repository Insights**: Task distribution across different repositories

### 🎯 Key Capabilities
- **TypeScript Everywhere**: Strict type safety across frontend and backend
- **Real-time Data**: Live updates and interactive filtering
- **Responsive Design**: Mobile-friendly, modern UI
- **Error Handling**: Comprehensive error handling and loading states
- **API Integration**: RESTful API with proper error responses

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (recommended: 18+)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone and install dependencies:**
```bash
cd task-tracker
npm run install:all
```

2. **Configure environment variables:**

Create `server/.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/task-tracker

# GitHub API Configuration (optional)
PAT_TOKEN=your_github_personal_access_token_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000
```

3. **Start the development servers:**
```bash
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend App**: http://localhost:3000

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies (root, client, server)
npm run install:all

# Start both client and server in development mode
npm run dev

# Start only the backend server
npm run dev:server

# Start only the frontend client
npm run dev:client

# Build for production
npm run build

# Start production server (after build)
npm start

# Run tests
npm test

# Clean build artifacts
npm run clean
```

### Backend API Endpoints

```
GET    /api/health                      # Health check
GET    /api/dashboard/summary           # Dashboard analytics
GET    /api/users                       # User list with filtering
GET    /api/tasks                       # Task list with filtering
GET    /api/tasks/analytics/dashboard   # Task dashboard analytics
GET    /api/tasks/:taskId               # Specific task details
GET    /api/tasks/:taskId/analytics     # Task-specific analytics
```

### Frontend Routes

```
/           # Branch Dashboard
/tasks      # Task Analytics Dashboard
/chatbot    # AI Chatbot (coming soon)
/users      # Specific Users (coming soon)
```

## 📱 Technology Stack

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Axios** for API calls
- **Chart.js** for data visualization
- **CSS Modules** for styling
- **Create React App** for tooling

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **Mongoose** for MongoDB integration
- **Moment.js** for date handling
- **CORS** for cross-origin requests
- **Dotenv** for configuration

### Database
- **MongoDB** for data persistence
- **Mongoose ODM** for schema validation

## 🎨 UI/UX Features

### Design System
- **Modern Interface**: Clean, professional dashboard design
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Interactive Elements**: Hover effects, loading states, error handling
- **Typography**: Apple system fonts for optimal readability
- **Color Scheme**: Professional blue/green color palette

### User Experience
- **Fast Loading**: Optimized API calls and component rendering
- **Error Handling**: Graceful error messages with auto-hide
- **Loading States**: Smooth loading indicators
- **Filtering**: Real-time data filtering by date, status, assignee
- **Navigation**: Intuitive navigation with active state indicators

## 🔧 Configuration

### Environment Variables

#### Backend (`server/.env`)
```env
PORT=3001                               # Server port
NODE_ENV=development                    # Environment mode
MONGO_URI=mongodb://localhost:27017/task-tracker  # MongoDB connection
PAT_TOKEN=ghp_xxxxxxxxxxxxxx           # GitHub API token (optional)
ALLOWED_ORIGINS=http://localhost:3000   # CORS origins
```

#### Frontend (`client/.env`)
```env
REACT_APP_API_URL=http://localhost:3001/api  # Backend API URL
```

## 🚢 Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Setup
1. Set `NODE_ENV=production` in server environment
2. Configure MongoDB production connection
3. Set proper CORS origins for your domain
4. Configure reverse proxy (nginx recommended)

### Docker Support (Optional)
```dockerfile
# Example Dockerfile structure
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### Frontend Testing
```bash
cd client
npm test                    # Run React tests
npm run test:coverage       # Run with coverage
```

### Backend Testing
```bash
cd server
npm test                    # Run server tests
```

## 📈 Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **API Optimization**: Efficient database queries with aggregation
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression for API responses
- **TypeScript**: Compile-time optimizations

## 🔒 Security Features

- **Input Validation**: Server-side validation for all API inputs
- **Error Handling**: Sanitized error messages
- **CORS Protection**: Configured cross-origin resource sharing
- **Environment Variables**: Sensitive data in environment variables
- **TypeScript**: Type safety preventing common vulnerabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with proper TypeScript types
4. Test your changes
5. Commit with clear messages: `git commit -m "Add feature description"`
6. Push and create a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in environment variables
2. **MongoDB connection failed**: Ensure MongoDB is running
3. **API calls failing**: Check CORS configuration
4. **Build errors**: Ensure all TypeScript types are properly defined

### Getting Help

- Check the browser console for frontend errors
- Check server logs for backend errors  
- Ensure all environment variables are set correctly
- Verify MongoDB connection and data structure

---

**Built with ❤️ using modern web technologies and best practices** 