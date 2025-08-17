# Invalidator Portal

A React-based web application for managing AWS CloudFront invalidations with a Node.js backend.

## 🚀 Features

- **User Authentication**: Secure login system with role-based access control
- **Invalidation Management**: Create and schedule CloudFront invalidations
- **Real-time Logging**: Monitor invalidation status and logs
- **Responsive Dashboard**: Modern, mobile-friendly interface
- **Time-based Access Control**: Restrict operations based on time windows

## 🏗️ Project Structure

```
Invalidator-Portal-1/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── Dashboard.js   # Main dashboard component
│   │   ├── Login.js       # Authentication component
│   │   ├── InvalidationForm.js # Invalidation creation form
│   │   └── ...            # Other components
│   └── package.json       # Frontend dependencies
├── server/                 # Node.js backend
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── middlewares/       # Authentication & validation
│   └── package.json       # Backend dependencies
└── README.md              # This file
```

## 🛠️ Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **AWS Account** with CloudFront access
- **Git**

## 📦 Installation

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd Invalidator-Portal-1
```

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Install frontend dependencies
```bash
cd ../client
npm install
```

### 4. Environment Setup

Create a `.env` file in the `server/` directory:
```env
PORT=5000
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
JWT_SECRET=your_jwt_secret
```

## 🚀 Running the Application

### Start the backend server
```bash
cd server
npm start
```

The server will run on `http://localhost:5000`

### Start the frontend (in a new terminal)
```bash
cd client
npm start
```

The React app will open in your browser at `http://localhost:3000`

## 🔧 Development

### Available Scripts

**Backend (server/)**
- `npm start` - Start the server
- `npm run dev` - Start with nodemon (if configured)
- `npm test` - Run tests

**Frontend (client/)**
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 📱 Usage

1. **Login**: Use your credentials to access the dashboard
2. **Create Invalidation**: Fill out the form with paths to invalidate
3. **Monitor Status**: Check the dashboard for invalidation progress
4. **View Logs**: Access detailed logs in the server directory

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Time-based operation restrictions
- Secure AWS credential handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Deployment

### Frontend Deployment
```bash
cd client
npm run build
```
Upload the `build/` folder to your hosting service.

### Backend Deployment
Deploy the `server/` folder to your Node.js hosting service (Heroku, AWS, etc.).

---

**Happy Coding! 🎉**
