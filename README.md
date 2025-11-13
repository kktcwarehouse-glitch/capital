# FundLink - Connect Startups with Investors

A mobile application built with Expo and React Native that connects startups seeking funding with potential investors.

## 🚀 Features

- **Dual User Roles:** Separate experiences for startups and investors
- **Profile Management:** Comprehensive profiles with media uploads
- **Discovery Feed:** Browse and discover startups by sector, stage, and location
- **Messaging System:** Direct communication between startups and investors
- **Media Management:** Upload pitch decks, videos, and supporting documents
- **Dark Mode:** Full support for light and dark themes

## 📱 Tech Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Authentication:** Supabase Auth
- **UI:** React Native with Lucide Icons

## 🛠️ Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp env.example .env
   ```

4. Add your Supabase credentials to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-project-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Run database migrations (see `DATABASE_SETUP.md`)

### Running the App

```bash
# Start development server
npm run dev

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Build for production
npm run build:web
```

## 📚 Documentation

- [Database Setup Guide](./DATABASE_SETUP.md)
- [App Configuration Guide](./APP_CONFIG.md)
- [Error Handling Guide](./ERROR_HANDLING.md)
- [Publication Readiness Report](./PUBLICATION_READINESS_REPORT.md)
- [Quick Action Items](./QUICK_ACTION_ITEMS.md)

## 🏗️ Project Structure

```
/app
├── app/                    # App screens and routes
│   ├── (tabs)/            # Main tab navigation
│   ├── auth/              # Authentication flows
│   ├── chat/              # Messaging screens
│   ├── settings/          # Settings screens
│   └── startup/           # Startup detail screens
├── assets/                # Images and static files
├── components/            # Reusable React components
├── constants/             # App constants and themes
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and utilities
│   ├── auth-context.tsx   # Authentication context
│   ├── error-handler.ts   # Error handling utilities
│   └── supabase.ts        # Supabase client
├── supabase/              # Database migrations
├── types/                 # TypeScript type definitions
└── app.json              # Expo configuration
```

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## 📦 Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

### Submit to App Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
```

## 🚧 Current Status

**Version:** 1.0.0  
**Status:** 75% Ready for Publication

See [PUBLICATION_READINESS_REPORT.md](./PUBLICATION_READINESS_REPORT.md) for detailed status.

### Remaining Tasks:
- [ ] Create custom app icons
- [ ] Write privacy policy
- [ ] Create app store screenshots
- [ ] Set up developer accounts
- [ ] Final testing on physical devices

## 📄 License

Private - All rights reserved

## 👥 Team

FundLink Team

## 🆘 Support

For issues or questions:
- Check documentation in the `/docs` folder
- Open an issue in the repository
- Contact support team

---

**Built with ❤️ using Expo and Supabase**
"# LINK" 
