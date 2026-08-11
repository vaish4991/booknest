# BookNest — Full-Stack E-Commerce Bookstore

BookNest is a complete, modern, fully functional Online Book Store application featuring a decoupled architectural flow.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3, Vanilla JavaScript, Responsive CSS Grid / Flexbox, Fetch API, FontAwesome Icons.
* **Backend**: Node.js, Express.js (REST API, MVC pattern, custom middlewares).
* **Database**: MongoDB, Mongoose ODM.
* **Authentication**: JSON Web Tokens (JWT) & bcryptjs password hashing.
* **Payment**: Built-in Credit Card Payment Gateway Simulator featuring Luhn validation checks.

---

## 🚀 Website Features

1. **Home Page**: Interactive hero banner, responsive catalog categories grid, dynamic featured arrivals & bestseller listings direct from MongoDB, newsletter subscriptions, and responsive footer links.
2. **Books Catalog**: Live catalog search (title, author, publisher, ISBN), category radio selection filters, min/max price range sliders, minimum rating stars, stock level statuses, and sorting filters (Price Low/High, Rating, Bestselling, Newest). Includes "Load More" pagination.
3. **Book Details**: Itemized product views (descriptions, reviews list, publishers, ISBNs), quantity adjustments (validated against live DB stock levels), and review forms allowing customers to post comments and 1-5 star ratings (which recalculate average book ratings).
4. **Authentication**: JWT-based login/registration, password matches, email/mobile checks, and a simulation-based password reset token flow.
5. **Shopping Cart**: Real-time cart synchronization, increment/decrement buttons with stock-check boundary checks, subtotal calculations, GST (5% tax), and shipping logic (free above ₹500, flat ₹50 otherwise).
6. **Checkout**: Prefilled shipping address forms, COD vs. Online Card payment toggles, simulated card input validations, database-backed stock updates, and checkout success confirmations.
7. **Order Tracking**: Customer order history lists detailing itemized receipts, transaction status badges, and interactive visual shipment timelines.
8. **Admin Panel**: Separate protected route (`role === admin`) providing total analytics statistics, popular rankings, sales graphs (rendered with Chart.js), Book CRUD forms (add/edit/delete covers, prices, stock), User Roles & Access blocks, and Order shipment status updates.

---

## 💳 Credit Card Payment Gateway Simulator

The online payment system is fully functional for testing. It simulates a merchant bank processor:
1. **Luhn Validation**: The backend validates card numbers using the standard Luhn Algorithm. Invalid card numbers are immediately declined.
2. **Date & CVV Checks**: Card expiries must be in the future (MM/YY) and CVV must be exactly 3 digits.
3. **Decline Simulators**: To test payment failures, use these card prefixes:
   * Starts with `5555` or ends with `9999` ➔ **Payment Declined: Insufficient funds**
   * Starts with `4444` or ends with `0000` ➔ **Payment Declined: Incorrect CVV code**
   * Ends with `1111` ➔ **Payment Declined: Transaction declined by card issuer**
4. **Success Cases**: Any other valid card number (like `4242424242424242` or standard test Visa cards) will succeed!
5. **Security**: **No card numbers or CVV values are stored in the database.** Only payment status (`Paid`) and simulated transaction IDs (`TXN_XXXXXX`) are recorded.

---

## 🔑 Development & Test Credentials

Use these credentials to explore the platform:

### 👤 Customer User
* **Email**: `customer@booknest.com`
* **Password**: `customer123`

### 🔐 Administrator User
* **Email**: `admin@booknest.com`
* **Password**: `admin123`

---

## 📁 Directory Structure

```
├── package.json
├── server.js
├── seed.js
├── .env
├── .gitignore
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Book.js
│   │   ├── Cart.js
│   │   ├── Order.js
│   │   └── Review.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── reviewController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── adminRoutes.js
│   └── middleware/
│       └── authMiddleware.js
│
└── frontend/
    ├── index.html
    ├── books.html
    ├── book-details.html
    ├── cart.html
    ├── checkout.html
    ├── login.html
    ├── register.html
    ├── orders.html
    ├── profile.html
    ├── admin/
    │   ├── dashboard.html
    │   ├── books.html
    │   ├── users.html
    │   └── orders.html
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js
        ├── auth.js
        ├── cart.js
        ├── books.js
        ├── book-details.js
        ├── orders.js
        ├── profile.js
        ├── admin.js
        └── utils.js
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) and **MongoDB** installed on your system.

### 2. Install Dependencies
Run the following command in the project root:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/booknest
JWT_SECRET=supersecretjwtkeyforbooknestapplicationdevelopmenttesting123!
```

### 4. Start MongoDB Server
On macOS (Homebrew):
```bash
brew services start mongodb-community
```
Or run directly:
```bash
mongod --dbpath ./db --port 27017
```

### 5. Seed the Database
Populate the database with the dummy products, users, orders, and reviews:
```bash
npm run seed
```

### 6. Run the Application
Start the development server:
```bash
npm start
```

### 7. Access in Browser
Open [http://localhost:5001](http://localhost:5001) in your browser.
