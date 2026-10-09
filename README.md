# 💰 EZSaldo • Financial Web App

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

[![Live Demo](EZSALDO)](https://ezsaldo.vercel.app)
![Tests](https://github.com/kiellzz/financial-tracker/actions/workflows/tests.yml/badge.svg)

**EZSaldo** is a financial management web application built with a strong focus on **clarity, organization, and user experience**.

The system allows users to manage income and expenses, track balance in real time, review period results, and visualize financial evolution through a modern and interactive dashboard.

---

## 🎯 Project Goal

This project was built to:

- Simulate a real-world financial system
- Practice fullstack development (frontend + backend)
- Apply UX/UI concepts in a functional product

---

## 📸 Preview

### 🔐 Login Screen
![Login](./media/login.png)

### 📊 Financial Dashboard
![Dashboard](./media/dashboard.png)

### 👤 Profile Editing
![Edit User](./media/edituser.png)

### ✂️ Avatar Cropping
![Crop](./media/crop.png)

---

## 🛠 Tech Stack

### 🔹 Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Modular frontend scripts under `frontend/scripts`
- Responsive interface
- Visual feedback (loaders, states, modals)

### 🔹 Backend
- Node.js
- Express
- MongoDB (Atlas)
- Mongoose
- JWT (authentication)
- bcrypt (password hashing)

### 🔹 Testing
- Jest
- Supertest
- MongoDB Memory Server (in-memory database for isolated tests)

### 🔹 Deploy
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

## 🚀 Features

- 🔐 **Secure Authentication**
  - Register and login with hashed passwords
  - JWT-based authentication

- 💰 **Transaction Management**
  - Add income and expenses
  - Edit and delete records

- 📊 **Dynamic Dashboard**
  - Real-time balance updates
  - Visual differentiation (income vs expenses)
  - Balance evolution chart
  - Period result summary showing profit, loss, or neutral balance

- 📅 **Date Filters**
  - View data by time range (today, 7 days, 30 days)
  - Filter the chart from the user's account creation date

- 🎨 **User Experience**
  - Confirmation modals (delete/logout)
  - Visual feedback for actions
  - Loading states with wait-time notice during requests
  - Clean and modern interface

---

## 🧩 Highlights

- Interface inspired by real fintech applications
- Strong focus on **usability and visual feedback**
- Clean architecture (separated frontend & backend)
- Dashboard logic organized into smaller script files
- Built as a **product**, not just a CRUD

---

## 🖥️ Project Structure

```text
CrudFinanceiro/
├─ .github/
│  └─ workflows/
│     └─ tests.yml
│
├─ backend/
│  ├─ src/
│  │  ├─ __tests__/
│  │  │  ├─ auth.test.js
│  │  │  └─ transactions.test.js
│  │  ├─ middleware/
│  │  │  └─ authMiddleware.js
│  │  ├─ models/
│  │  │  ├─ Transaction.js
│  │  │  └─ User.js
│  │  ├─ routes/
│  │  │  ├─ authRoutes.js
│  │  │  └─ transactionRoutes.js
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ .env.example
│  ├─ package-lock.json
│  └─ package.json
│
├─ frontend/
│  ├─ assets/
│  ├─ dashboard.css
│  ├─ dashboard.html
│  ├─ editUser.css
│  ├─ editUser.html
│  ├─ index.html
│  ├─ login.html
│  ├─ register.html
│  ├─ scripts/
│  │  ├─ auth.js
│  │  ├─ balanceChart.js
│  │  ├─ chartData.js
│  │  ├─ config.js
│  │  ├─ cropImage.js
│  │  ├─ dashboard.js
│  │  ├─ dashboardApi.js
│  │  ├─ dashboardDom.js
│  │  ├─ dateUtils.js
│  │  ├─ editUser.js
│  │  └─ formatters.js
│  └─ style.css
│
├─ media/
│  ├─ login.png
│  ├─ dashboard.png
│  ├─ edituser.png
│  └─ crop.png
│
└─ README.md
```

---

## ⚙️ Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/kiellzz/financial-tracker.git
cd financial-tracker
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Start the server:

```bash
node src/server.js
```

> 📍 Backend running at: http://localhost:5000

### 3. Run tests

```bash
cd backend
npm test
```

### 4. Run Frontend

- Open `login.html` in your browser
or
- Use **Live Server** in VS Code

---

## 📌 Future Improvements

- 📊 Peer-to-peer transaction transfers between registered users

---

## 👨‍💻 Author

Developed by **Ezequiel Borges**

- GitHub: https://github.com/kiellzz
- LinkedIn: https://www.linkedin.com/in/ezequielborgesdev

---

## ⭐ Final Notes

This project represents my growth as a developer, focusing on building applications that deliver not only functionality, but also **clarity, usability, and user experience**.
