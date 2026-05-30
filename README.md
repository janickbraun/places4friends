# places4friends

Discover the best spots, curated by the friends you trust.

places4friends is a social discovery platform designed to help you share and explore local highlights with your closest friends. No generic reviews or fake ratings—just genuine recommendations from the people whose taste you actually trust.

---

## Key Features & Functionality

### 1. Interactive Shared Map
* **Mapbox GL Integration**: A high-performance Mapbox canvas displaying all recommendations from you and your accepted friends.
* **Map Style Layer Selector**: Dynamically change map layers (Outdoors, Streets, Satellite, Dark, Light, etc.) to match your view preference.
* **Live Geolocation Finder**: Locate your current position in real-time and center the map view with a specialized green locator marker.
* **Map Markers and Detailed Popups**: Clickable pins on the map that display key details, including the place name, date of recommendation, creator profile links, wishlist actions, and comments.
* **Auto-Scrolling Filters**: Category-based quick-filtering directly integrated above the map for seamless navigation.

### 2. Social & Friends System
* **Real-time Friends Search**: Fast user lookup using an instant, 400ms debounced input search bar to avoid redundant API queries.
* **Friendship Invitation Pipeline**: Send, accept, or reject incoming friend requests.
* **Pending Request Badge**: Navigation indicator (green badge) highlighting incoming invitations.
* **Public Profile Views**: Check out other users' public profile dashboards to see their total friend count, personal recommendations, and wishlist.

### 3. Recommendation Engine
* **POI & Location Search**: Integrated Mapbox Search Box API to lookup specific businesses, restaurants, or cities in the recommendation creation tab.
* **Must See Badges**: Highlight key spots with a premium amber "Must See" status, making them stand out in feeds.
* **Media Upload & Management**: Upload photos of recommended places directly to Supabase Storage with local blob optimistic previews.
* **Category Tagging**: Tag places with custom categories (e.g. Restaurants, Cafes, Bars, Sightseeing) for structured indexing.

### 4. Feed & Discovery
* **Consolidated Activity Feed**: Chronological list of recommendations posted by your friends.
* **Modular Activity Cards**: Reusable visual components displaying place information, categories, images, and quick wishlist toggle actions.
* **Social Comments**: Real-time discussion thread per activity to discuss places, ask questions, or plan visits.
* **Wishlist ("Merkliste")**: Bookmark recommendations on your personal wishlist and view them in your profile.

### 5. Profile & Settings Control
* **Personalized Profiles**: View personal contributions, update display names, and edit usernames.
* **Avatar Upload & Cache Busting**: Custom profile image uploads with automatic cache-busting logic to ensure immediate visual updates.
* **Notification Toggles**: Choose whether to receive email notifications for new friend requests.
* **Account Deletion**: Fully compliant, interactive account deletion process with built-in verification prompts to permanently wipe personal data.

### 6. Branding & SEO Excellence
* **Unified Green Brand Theme**: Consistent design styling using the `#226622` primary brand green and transparent opacity variations.
* **Search Engine Optimization**: Custom metadata settings with structured fallback parameters (keywords, robots tags, dynamic metadataBase).
* **Social Graph Previews**: Embedded OpenGraph and Twitter card metadata mapping to `socialbanner.jpg` for links shared on social networks.
* **Automated XML Sitemap**: Next.js App Router dynamic sitemap generator (`/sitemap.xml`) to dynamically index static routes, user profiles, and activities.

---

## Technical Architecture

### Frontend Stack
* **Next.js (App Router)**: Utilizing server components, routing conventions, metadata generation, and page-rendering optimizers.
* **React**: Core UI library.
* **Tailwind CSS**: Utility-first styling with a consolidated design system built inside `globals.css` mapping the primary color `#226622`.
* **React Map GL (Mapbox GL JS)**: Wrap Mapbox functionalities into React state-friendly components.
* **Lucide React**: Clean, modern vector SVG icons.

### Backend & Database (Supabase)
* **Authentication**: Email/Password authentication with callback redirects.
* **PostgreSQL Database**: Relational database with Row Level Security (RLS) policies to protect personal data.
* **Supabase Storage**: Buckets for media uploads (activities and profile avatars) with public URL generators.
* **Supabase SSR (@supabase/ssr)**: Server-side cookies mapping for session validation.

### Database Schema

#### profiles
* `id` (uuid, primary key) - References auth.users
* `username` (text, unique) - Handle identifier
* `full_name` (text, nullable) - Display name
* `avatar_url` (text, nullable) - Path to Supabase Storage avatar file
* `notifications_friend_requests` (boolean) - Notification setting
* `created_at` (timestamptz) - Creation timestamp

#### friendships
* `id` (uuid, primary key)
* `sender_id` (uuid) - Sender user profile ID
* `receiver_id` (uuid) - Receiver user profile ID
* `status` (text) - Can be 'pending' or 'accepted'
* `created_at` (timestamptz)

#### activities
* `id` (uuid, primary key)
* `user_id` (uuid) - Creator profile ID
* `place_id` (text) - Unique geocoding ID from Mapbox
* `place_name` (text) - Name of the location
* `place_address` (text, nullable) - Address string
* `latitude` (double precision) - Geographic latitude
* `longitude` (double precision) - Geographic longitude
* `is_superlike` (boolean) - Highlighting flag ("Must See")
* `description` (text, nullable) - Comment/review
* `categories` (array of text)
* `image_urls` (array of text, nullable) - Paths to storage upload photos
* `created_at` (timestamptz)

#### activity_comments
* `id` (uuid, primary key)
* `activity_id` (uuid) - References activities
* `user_id` (uuid) - References profiles
* `content` (text) - Comment body content (1-1000 characters)
* `created_at` (timestamptz)

#### wishlist
* `id` (uuid, primary key)
* `user_id` (uuid) - References profiles
* `activity_id` (uuid) - References activities
* `created_at` (timestamptz)

---

## Development & Deployment Guidelines

### Key Rules
* **No Emojis**: Do not use emojis in the codebase, the user interface, or any documentation.
* **German Umlauts**: Use correct German umlauts (ä, ö, ü, Ä, Ö, Ü) in all user-facing German copy. Do not use ae, oe, ue substitutions.
* **Modular Code**: Build reusable visual components in `src/components/` and separate business logic from pure presentation.

### Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
GOOGLE_PLACES_API_KEY=your_google_places_api_key
NEXT_PUBLIC_SITE_URL=places4friends.com
```

### Installation & Execution

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build the application for production:
   ```bash
   npm run build
   ```
