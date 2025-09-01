# Blue Carbon MRV Mobile App

A React Native mobile application for Blue Carbon Monitoring, Reporting, and Verification (MRV) system. This app enables NGO and Panchayat users to register projects, upload MRV data, and manage carbon credits with offline support.

## Features

### 🔐 Authentication
- Secure login for NGO and Panchayat users
- JWT token-based authentication
- Auto-login with stored credentials
- Demo account for testing

### 📋 Project Management
- Register new blue carbon projects
- Project details: name, location, area, type
- Document and image upload support
- Project status tracking

### 📊 MRV Data Upload
- Upload CO2 sequestration data
- Environmental measurements (temperature, humidity, salinity, pH)
- Multiple measurement methods support
- Photo and document attachments
- Offline data collection

### 💰 Carbon Credits
- View carbon credit balances
- Track project-specific credits
- Credit minting integration
- Blockchain transaction history

### 📱 Offline Support
- Offline data storage with AsyncStorage
- Automatic sync when connection restored
- Queue management for pending uploads
- Local data caching

### 🎨 Modern UI/UX
- Clean, intuitive interface
- Material Design principles
- Responsive layout
- Accessibility support

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Backend API server running

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **iOS Setup (macOS only)**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Configure environment**
   - Update `config.js` with your backend API URL
   - Ensure backend server is running

## Configuration

### API Configuration
Edit `config.js` to match your backend setup:

```javascript
API: {
  BASE_URL: __DEV__ 
    ? 'http://10.0.2.2:3000/api' // Android emulator
    : 'http://localhost:3000/api', // iOS simulator
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
}
```

### Backend Integration
Ensure your backend server is running and accessible at the configured URL. The app expects the following API endpoints:

- `POST /auth/login` - User authentication
- `POST /projects/register` - Project registration
- `POST /mrv/upload` - MRV data upload
- `POST /credits/mint` - Carbon credit minting

## Running the App

### Development Mode
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Production Build
```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## Project Structure

```
mobile/
├── App.js                 # Main app component
├── index.js              # App entry point
├── config.js             # App configuration
├── package.json          # Dependencies and scripts
├── screens/              # App screens
│   ├── LoginScreen.js
│   ├── ProjectRegistrationScreen.js
│   └── MRVUploadScreen.js
├── services/             # API and storage services
│   ├── apiService.js
│   └── storageService.js
└── README.md
```

## Key Components

### Screens

#### LoginScreen
- User authentication interface
- Email/password validation
- Demo account access
- Auto-login functionality

#### ProjectRegistrationScreen
- Project registration form
- Image/document upload
- Form validation
- Offline support

#### MRVUploadScreen
- MRV data upload interface
- Project selection
- Environmental data input
- File attachment support

### Services

#### apiService.js
- HTTP client with Axios
- Authentication handling
- Request/response interceptors
- Retry logic and error handling

#### storageService.js
- AsyncStorage wrapper
- Offline data management
- Cache management
- Sync queue handling

## Offline Functionality

The app provides comprehensive offline support:

1. **Data Storage**: All forms and data are cached locally
2. **Sync Queue**: Pending uploads are queued when offline
3. **Auto Sync**: Data syncs automatically when connection is restored
4. **Cache Management**: Intelligent cache cleanup and validation

## File Upload

The app supports various file types for uploads:

- **Images**: JPEG, PNG (max 10MB)
- **Documents**: PDF files
- **Camera**: Direct photo capture
- **Gallery**: Select from device gallery

## Security Features

- JWT token authentication
- Secure token storage
- Input validation and sanitization
- Network security (HTTPS)
- File type validation

## Testing

### Demo Account
Use the demo account for testing:
- Email: `demo@bluecarbon.org`
- Password: `demo123`

### Manual Testing
1. Test offline functionality by disabling network
2. Verify data sync when connection restored
3. Test file upload with various file types
4. Validate form inputs and error handling

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm start -- --reset-cache
   ```

2. **iOS build issues**
   ```bash
   cd ios
   pod deintegrate
   pod install
   ```

3. **Android build issues**
   ```bash
   cd android
   ./gradlew clean
   ```

4. **Network connectivity**
   - Verify backend server is running
   - Check API URL in config.js
   - Ensure proper network permissions

### Debug Mode
Enable debug mode for detailed logging:
```javascript
// In config.js
DEBUG: true
```

## Performance Optimization

- Image compression before upload
- Lazy loading for large lists
- Efficient cache management
- Background sync optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@bluecarbonmrv.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## Version History

- **v1.0.0** - Initial release with core functionality
  - User authentication
  - Project registration
  - MRV data upload
  - Offline support
  - Carbon credit integration

## Roadmap

- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Biometric authentication
- [ ] Advanced mapping features
- [ ] Real-time collaboration
- [ ] Advanced reporting tools
