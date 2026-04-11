# Automotive Billing System / Garage CRM

A modern, comprehensive **Next.js-based** billing and management system for automotive workshops, service centers, and garages.

## 🚀 Features

### Core Features
- ✅ **Role-Based Access Control** (SUPER_ADMIN, MANAGER, EMPLOYEE, CASHIER)
- ✅ **Multi-Branch Support** - Manage multiple garage locations
- ✅ **Customer Management** - Complete customer profiles and history
- ✅ **Vehicle Management** - Track vehicle details and service history
- ✅ **Job Card System** - Create and manage work orders
- ✅ **Billing & Invoicing** - Auto-generate invoices with tax calculation
- ✅ **Payment Processing** - Multiple payment methods (Cash, Card, UPI, Cheque)
- ✅ **Inventory Management** - Track spare parts and stock levels
- ✅ **Employee Management** - Manage technicians and staff
- ✅ **Reports & Analytics** - Comprehensive business analytics
- ✅ **Cloud Image Storage** - Cloudinary integration for work documentation

### Technical Features
- 🛡️ **JWT Authentication** - Secure user authentication
- 📱 **Responsive Design** - Mobile-friendly UI with Tailwind CSS
- 🗄️ **MongoDB Integration** - Using Prisma ORM
- 🌐 **RESTful API** - Clean API architecture
- 🔒 **Role-Based Permissions** - Granular access control
- 📊 **Real-time Dashboard** - Business insights at a glance

## 📋 Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Prisma ORM
- **Authentication**: JWT (jsonwebtoken), bcryptjs
- **Image Storage**: Cloudinary
- **State Management**: React Hooks
- **Notifications**: React Hot Toast
- **Language**: JavaScript (no TypeScript)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- MongoDB Atlas account (free tier available)
- Cloudinary account (free tier available)

### Step 1: Clone/Extract the Project
```bash
cd automotive-billing-system
npm install
```

### Step 2: Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/automotive-billing

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Node Environment
NODE_ENV=development
```

### Step 3: Setup Database with Prisma
```bash
# Generate Prisma Client
npm run prisma:generate

# Create database and tables
npm run prisma:migrate

# Seed the database with Super Admin
npm run seed
```

**Seed Default Credentials:**
- **Email**: admin@autobilling.com
- **Password**: Admin@123

### Step 4: Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and navigate to `/login`

## 📱 User Roles & Permissions

### SUPER_ADMIN
- Full system control
- Create and manage branches
- Manage all users
- View global reports
- System settings

### MANAGER
- Branch operational control
- Manage customers and vehicles
- Create and assign jobs
- Monitor employees
- Approve discounts
- View branch reports

### EMPLOYEE (Technician)
- View assigned jobs
- Update job status
- Add service notes
- Request spare parts
- Upload work images

### CASHIER
- Generate invoices
- Process payments
- View transactions
- Print/email invoices
- Apply discounts (if permitted)

## 📁 Project Structure

```
automotive-billing-system/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Main dashboard page
│   │   ├── customers/        # Customer management
│   │   ├── vehicles/         # Vehicle management
│   │   ├── jobs/             # Job card management
│   │   ├── invoices/         # Invoice management
│   │   ├── inventory/        # Inventory management
│   │   ├── branches/         # Branch management
│   │   ├── users/            # User management
│   │   ├── reports/          # Analytics & reports
│   │   └── layout.js         # Dashboard layout
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication routes
│   │   ├── customers/        # Customer API
│   │   ├── vehicles/         # Vehicle API
│   │   ├── jobs/             # Job API
│   │   ├── invoices/         # Invoice API
│   │   ├── payments/         # Payment API
│   │   └── inventory/        # Inventory API
│   ├── login/                # Login page
│   ├── layout.js             # Root layout
│   ├── page.js               # Home page redirect
│   └── globals.css           # Global styles
├── components/
│   ├── Sidebar.js            # Navigation sidebar
│   └── Navbar.js             # Top navigation bar
├── lib/
│   ├── auth.js               # Auth utilities
│   ├── prisma.js             # Prisma client
│   ├── cloudinary.js         # Cloudinary utilities
│   └── api-utils.js          # API helper functions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.js               # Database seeder
├── public/                   # Static assets
├── .env.local                # Environment variables
├── .env.example              # Environment template
├── package.json              # Dependencies
├── next.config.js            # Next.js config
├── tailwind.config.js        # Tailwind config
└── README.md                 # This file
```

## 🗄️ Database Schema

### Key Models
- **User** - Users with different roles
- **Branch** - Garage locations
- **Customer** - Vehicle owners
- **Vehicle** - Customer vehicles
- **Job** - Service/work orders
- **Service** - Services provided
- **Invoice** - Billing documents
- **Payment** - Payment records
- **InventoryItem** - Spare parts inventory
- **AuditLog** - System activity log

## 🔐 Authentication Flow

1. User enters credentials on `/login`
2. Login API validates and returns JWT token
3. Token stored in secure HTTP-only cookie
4. Protected routes verify token validity
5. Role-based middleware controls access

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Add new vehicle

### Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/[id]` - Get job details
- `PUT /api/jobs/[id]` - Update job

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Generate invoice

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Process payment

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Add item

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)

### Branches
- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch (admin only)

## 🎯 Getting Started Checklist

- [ ] Extract project files
- [ ] Run `npm install`
- [ ] Create `.env.local` with credentials
- [ ] Setup MongoDB Atlas database
- [ ] Setup Cloudinary account
- [ ] Run `npm run prisma:generate`
- [ ] Run `npm run prisma:migrate`
- [ ] Run `npm run seed`
- [ ] Start dev server: `npm run dev`
- [ ] Login with admin@autobilling.com / Admin@123
- [ ] Change default password
- [ ] Create branch
- [ ] Create manager user
- [ ] Start managing your garage!

## 📝 Usage Examples

### Creating a Customer
1. Navigate to Customers page
2. Click "Add Customer"
3. Fill in customer details
4. Click "Create Customer"

### Creating a Job
1. Go to Jobs page
2. Click "Create Job"
3. Select vehicle
4. Assign to technician (optional)
5. Set priority and estimated cost
6. Create job card

### Generating Invoice
1. Navigate to Invoices
2. Click "Generate Invoice"
3. Select completed job
4. Enter service costs
5. Apply tax and discount
6. Generate invoice
7. Process payment

## 🔧 Customization

### Branding
Edit `components/Sidebar.js` and `app/login/page.js` to customize logo and branding.

### Colors
Modify `tailwind.config.js` to change color scheme.

### Tax Calculation
Update invoice logic in `/api/invoices/route.js` for your tax rules.

### Payment Methods
Edit `app/(dashboard)/invoices/page.js` to add/remove payment options.

## 🐛 Troubleshooting

### Database Connection Error
- Verify MongoDB connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database name matches

### Cloudinary Issues
- Verify API credentials
- Check file upload permissions
- Ensure cloud storage has space

### Login Issues
- Clear browser cookies
- Run seed script again
- Check JWT_SECRET in .env.local

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect GitHub to Vercel
3. Add environment variables
4. Deploy

### Other Platforms
Ensure Node.js 16+, MongoDB Atlas, and environment variables are configured.

## 📞 Support

For issues or questions:
1. Check project README
2. Review API documentation
3. Check database schema
4. Verify environment setup

## 📄 License

This project is provided as-is for garage and automotive workshop management.

## 🎉 Features Roadmap

- [ ] Mobile app (React Native)
- [ ] WhatsApp integration
- [ ] SMS notifications
- [ ] Service reminders
- [ ] Customer portal
- [ ] AI service recommendations
- [ ] IoT vehicle diagnostics
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] Accounting integration

---

**Happy Billing! 🚗💰**
