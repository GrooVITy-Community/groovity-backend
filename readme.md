# Groovity Backend Documentation

## Architecture Overview

**Frontend**: React + Vite + TypeScript  
**Backend**: Express + TypeScript  
**ORM**: Drizzle  
**Database**: Dual-database support (PostgreSQL for production, SQLite for local development)  
**Storage**: AWS S3 + CloudFront CDN  
**Deployment**: AWS EC2 (Ubuntu) using PM2

## Dual-Database Architecture

The backend supports both PostgreSQL and SQLite through a runtime database abstraction layer:

### Database Selection
- **PostgreSQL Mode**: When `DATABASE_URL` environment variable is set
  - Uses `drizzle-orm/neon-http` driver
  - Schema defined in `shared/schema.ts` with `pgTable`
  - Ideal for production deployment
  
- **SQLite Mode**: When `DATABASE_URL` is not set
  - Uses `drizzle-orm/better-sqlite3` driver
  - Schema defined in `shared/schema.sqlite.ts` with `sqliteTable`
  - Ideal for local development without PostgreSQL setup

### Implementation Details
- **Abstraction Layer**: `server/db/index.ts` conditionally imports the correct schema and driver
- **UUID Generation**: All IDs are generated in application code using `crypto.randomUUID()` for cross-database compatibility
- **No `.returning()` Usage**: Insert operations use explicit ID generation + follow-up query pattern to support SQLite
- **Type Safety**: Both schemas export identical TypeScript types, ensuring consumers work with either database

### Switching Databases
To switch between databases, simply set or unset the `DATABASE_URL` environment variable and restart the server:

```bash
# Use PostgreSQL
export DATABASE_URL="postgresql://..."
npm run dev

# Use SQLite (local development)
unset DATABASE_URL
npm run dev
```

## Project Structure

```
server/
├── db/
│   └── index.ts           # Database connection (PostgreSQL via Neon)
├── middleware/
│   ├── auth.ts            # Admin authentication middleware
│   └── upload.ts          # Multer file upload configuration
├── index.ts               # Express server entry point
├── routes.ts              # API route definitions
├── s3.ts                  # S3 upload utilities
├── storage.ts             # Database CRUD operations
└── vite.ts                # Vite dev server integration

shared/
└── schema.ts              # Drizzle database schemas

.env.example               # Environment variables template
```

## Database Schema

### Events Table
```typescript
{
  id: string (UUID)
  title: string
  description: string
  date: string
  venue: string
  imageUrl?: string
}
```

### Registrations Table
```typescript
{
  id: string (UUID)
  eventId: string (FK -> events.id)
  name: string
  email: string
  phone: string
  regNumber: string
  utr: string
  paymentSsUrl?: string
  createdAt: timestamp
}
```

### Beats Table
```typescript
{
  id: string (UUID)
  title: string
  description: string
  price: number
  previewUrl?: string
  fullUrl?: string
}
```

### Beat Orders Table
```typescript
{
  id: string (UUID)
  beatId: string (FK -> beats.id)
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  paymentSsUrl?: string
  status: string (default: "pending")
  createdAt: timestamp
}
```

## API Endpoints

### Public Endpoints

#### GET /api/events
Get all events.

**Response**: `Event[]`

**Example**:
```bash
curl http://localhost:5000/api/events
```

#### POST /api/registrations
Create a new event registration.

**Content-Type**: `multipart/form-data`

**Fields**:
- `eventId` (string, required)
- `name` (string, required)
- `email` (string, required)
- `phone` (string, required)
- `regNumber` (string, required)
- `utr` (string, required)
- `payment_ss` (file, optional) - Payment screenshot

**Response**: `Registration`

**Example**:
```bash
curl -X POST http://localhost:5000/api/registrations \
  -F "eventId=event-123" \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone=1234567890" \
  -F "regNumber=REG123" \
  -F "utr=UTR456" \
  -F "payment_ss=@screenshot.jpg"
```

#### GET /api/beats
Get all beats.

**Response**: `Beat[]`

**Example**:
```bash
curl http://localhost:5000/api/beats
```

#### POST /api/beats/:beatId/purchase
Purchase a beat.

**Content-Type**: `multipart/form-data`

**Fields**:
- `buyerName` (string, required)
- `buyerEmail` (string, required)
- `buyerPhone` (string, required)
- `status` (string, optional, default: "pending")
- `payment_ss` (file, optional) - Payment screenshot

**Response**: `BeatOrder`

**Example**:
```bash
curl -X POST http://localhost:5000/api/beats/beat-123/purchase \
  -F "buyerName=Jane Doe" \
  -F "buyerEmail=jane@example.com" \
  -F "buyerPhone=0987654321" \
  -F "payment_ss=@payment.jpg"
```

### Protected Endpoints

#### GET /api/admin/registrations
Get all registrations (admin only).

**Headers**:
- `x-admin-token`: Admin secret token

**Response**: `Registration[]`

**Example**:
```bash
curl http://localhost:5000/api/admin/registrations \
  -H "x-admin-token: your-secret-token"
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# AWS Configuration
AWS_REGION=ap-south-1
S3_BUCKET=groovity-media
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFRONT_DOMAIN=d123abcd.cloudfront.net

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Admin Authentication
ADMIN_SECRET=your_admin_secret
```

## File Upload System

The backend uses **multer** for handling multipart/form-data uploads and **AWS S3** for storage.

### Upload Flow:
1. Client sends file as `payment_ss` field in form data
2. Multer stores file in memory buffer
3. Backend uploads buffer to S3 bucket
4. S3 returns object key
5. CloudFront URL is generated: `https://{CLOUDFRONT_DOMAIN}/{key}`
6. URL is stored in database

### File Restrictions:
- **Max size**: 5 MB
- **Allowed types**: JPEG, PNG, WebP
- **Bucket**: Private (access via CloudFront only)

## Installation & Setup

### Install Dependencies
```bash
npm install
```

### Database Setup

#### Option 1: PostgreSQL (Recommended)
```bash
# Replit: Database is auto-provisioned
# Local: Set DATABASE_URL in .env
export DATABASE_URL=postgresql://user:password@localhost:5432/groovity

# Push schema to database
npm run db:push
```

#### Option 2: SQLite (Local Development Only)
To use SQLite instead of PostgreSQL:

1. Update `shared/schema.ts`:
   - Replace `pgTable` with `sqliteTable`
   - Replace `varchar` with `text`
   - Replace `timestamp` with `integer` with mode: 'timestamp'
   - Replace `sql\`gen_random_uuid()\`` with `$defaultFn(() => crypto.randomUUID())`

2. Update `server/db/index.ts`:
   ```typescript
   import { drizzle } from 'drizzle-orm/better-sqlite3';
   import Database from 'better-sqlite3';
   
   const sqlite = new Database('server/db/dev.sqlite');
   export const db = drizzle(sqlite, { schema });
   ```

3. Update `drizzle.config.ts` dialect to `"sqlite"`

### Run Development Server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

## Deployment

### Frontend → Vercel
1. Connect GitHub repository to Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variables: Copy from `.env`

### Backend → AWS EC2

#### 1. EC2 Setup (Ubuntu)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone your-repo-url
cd your-project

# Install dependencies
npm install

# Build backend
npm run build
```

#### 2. Environment Variables
```bash
# Edit environment file
sudo nano /etc/environment

# Add variables:
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
CLOUDFRONT_DOMAIN=...
ADMIN_SECRET=...
NODE_ENV=production
```

#### 3. PM2 Configuration
```bash
# Start with PM2
pm2 start dist/index.js --name groovity-api

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### 4. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database → Amazon RDS
1. Create PostgreSQL instance in RDS
2. Configure security group (allow EC2 IP)
3. Update `DATABASE_URL` in EC2 environment
4. Run migrations: `npm run db:push`

### Storage → AWS S3 + CloudFront

#### S3 Bucket Setup
1. Create private S3 bucket
2. Enable versioning
3. Configure CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

#### CloudFront Setup
1. Create CloudFront distribution
2. Origin: S3 bucket
3. Origin Access Control (OAC): Enable
4. Update bucket policy to allow CloudFront
5. Copy CloudFront domain to `CLOUDFRONT_DOMAIN`

## Error Handling

All endpoints return errors in this format:
```json
{
  "message": "Error description"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid admin token)
- `404` - Not Found
- `500` - Internal Server Error

## Frontend Integration

### Example: Fetch Events
```typescript
import { useQuery } from '@tanstack/react-query';

function EventsList() {
  const { data: events } = useQuery({
    queryKey: ['/api/events'],
  });

  return (
    <div>
      {events?.map(event => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  );
}
```

### Example: Submit Registration
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

function RegistrationForm() {
  const queryClient = useQueryClient();
  
  const registerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Registration failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    registerMutation.mutate(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Testing

### Test Endpoints with curl

```bash
# Get all events
curl http://localhost:5000/api/events

# Create registration
curl -X POST http://localhost:5000/api/registrations \
  -F "eventId=evt_123" \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "phone=1234567890" \
  -F "regNumber=REG001" \
  -F "utr=UTR12345"

# Get beats
curl http://localhost:5000/api/beats

# Purchase beat
curl -X POST http://localhost:5000/api/beats/beat_123/purchase \
  -F "buyerName=Test Buyer" \
  -F "buyerEmail=buyer@example.com" \
  -F "buyerPhone=9876543210"

# Admin: Get all registrations
curl http://localhost:5000/api/admin/registrations \
  -H "x-admin-token: your_secret"
```

## Security Notes

1. **Admin Secret**: Keep `ADMIN_SECRET` secure and never commit to git
2. **AWS Credentials**: Use IAM roles in production, never hardcode
3. **S3 Bucket**: Keep bucket private, serve only via CloudFront
4. **CORS**: Configure appropriately for your frontend domain
5. **File Uploads**: Size limits enforced to prevent abuse
6. **Input Validation**: All inputs validated with Zod schemas

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set
- Check database server is running
- Ensure firewall allows connection

### S3 Upload Failures
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists and region matches

### File Upload Errors
- Check file size (<5MB)
- Verify file type is allowed
- Ensure multer middleware is applied

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
