# Supabase Database Setup

Please run the following SQL commands in your Supabase project's **SQL Editor** to create the necessary tables.

## 1. Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned BOOLEAN DEFAULT false,
  login_count INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 2. Products Table
```sql
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  discount_price DECIMAL,
  category TEXT NOT NULL,
  sub_type TEXT DEFAULT 'New',
  image TEXT,
  images TEXT[], -- Array of image URLs
  stock INTEGER DEFAULT 0,
  sku TEXT,
  rating DECIMAL DEFAULT 4.0,
  sales INTEGER DEFAULT 0,
  condition TEXT DEFAULT 'New',
  vehicle TEXT[], -- Array of compatible vehicles
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 3. Branches Table
```sql
CREATE TABLE branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours TEXT DEFAULT '9 AM - 6 PM',
  map_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 4. Settings Table
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT DEFAULT 'ZainTyres',
  tagline TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  hero_heading TEXT,
  hero_highlight TEXT,
  hero_subtext TEXT,
  footer_text TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 5. Orders Table
```sql
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  items JSONB NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('Card', 'UPI', 'COD')),
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Paid')),
  order_status TEXT DEFAULT 'Order Placed',
  tracking_number TEXT,
  subtotal DECIMAL NOT NULL,
  tax DECIMAL NOT NULL,
  shipping DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  timeline JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```
## 6. Cart Items Table
```sql
CREATE TABLE cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
```
## 7. Addresses Table
```sql
CREATE TABLE addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
## 8. Search History Table
```sql
CREATE TABLE search_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
