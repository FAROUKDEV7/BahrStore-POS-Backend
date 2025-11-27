# BahrStore POS – Backend (Django REST)

This repository contains the backend API for the BahrStore POS System.  
It is built using Django and Django REST Framework, providing all core functionalities required for a Point-of-Sale system, including products management, sales processing, and authentication.

---

## 🚀 Features

- Built with Django & Django REST Framework  
- Full CRUD for products  
- Sales API with discounts, totals, time tracking, and invoice creation  
- Automatic stock updates when a sale is completed  
- Secure login system  
- SQLite database for offline usage  
- Clean, modular, and scalable project structure  
- Ready for Docker deployment or local development  

---

## 📁 Project Structure

/bahrstore_backend
/bahrstore_backend → Django project settings
/products → Products app (models, views, serializers, urls)
/sales → Sales app (models, views, serializers, urls)
/auth_app → Login & authentication
/static → Static files 
manage.py → Main Django entry point


---

## 🛠 Tech Stack

- Python  
- Django  
- Django REST Framework  
- SQLite (offline mode)  
- Docker (optional)  

---

## 📡 Main Endpoints

### **Products**
- `GET /api/products/`
- `POST /api/products/`
- `PUT /api/products/<id>/`
- `DELETE /api/products/<id>/`

### **Sales**
- `GET /api/sales/`
- `POST /api/sales/`  
  → Calculates total, discount, timestamp  
  → Updates product stock

### **Auth**
- `POST /api/login/`  



## 💻 Installation

### Local Setup

```bash
# Clone the repo
git clone https://github.com/your-username/BahrStore-POS-Backend.git
cd BahrStore-POS-Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Run server
python manage.py runserver


### Using Docker

To run the project using Docker:

# Build and start the containers
docker-compose up --build

