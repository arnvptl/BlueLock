# Blue Carbon MRV Admin Dashboard

A modern, responsive Next.js admin dashboard for managing Blue Carbon MRV (Monitoring, Reporting, Verification) data and carbon credit tokenization. Built with TypeScript, Tailwind CSS, and Recharts for data visualization.

## Features

### 🔐 Authentication
- Secure login system for NCCR administrators
- JWT-based authentication with persistent sessions
- Protected routes with automatic redirects
- Role-based access control

### 📊 Dashboard Analytics
- Real-time statistics cards showing key metrics
- Interactive charts for CO₂ sequestration trends
- Carbon credit token issuance visualization
- Project type distribution pie charts
- Recent activity feed

### 🏗️ Project Management
- Comprehensive project listing with search and filters
- Project verification workflow (verify/reject)
- Detailed project information modal
- Export functionality (CSV/Excel)
- Status tracking and management

### 📈 Data Visualization
- Area charts for CO₂ sequestration trends
- Bar charts for carbon credit issuance
- Pie charts for project type distribution
- Responsive design for all screen sizes
- Interactive tooltips and legends

### 🎨 Modern UI/UX
- Clean, professional design with Tailwind CSS
- Responsive layout for desktop and mobile
- Smooth animations and transitions
- Accessible components and keyboard navigation
- Dark mode ready (can be easily implemented)

### 🔧 Technical Features
- TypeScript for type safety
- React Query for efficient data fetching
- Zustand for state management
- React Hook Form for form handling
- Toast notifications for user feedback
- Error handling and loading states

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Recharts for data visualization
- **State Management**: Zustand with persistence
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form with validation
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios with interceptors

## Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Backend API running (see backend documentation)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd admin-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=Blue Carbon MRV Admin
   NEXTAUTH_SECRET=your-secret-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
admin-dashboard/
├── components/          # Reusable UI components
│   └── Layout/         # Layout components (Sidebar, Header, etc.)
├── lib/                # Utility libraries and API client
├── pages/              # Next.js pages
│   ├── _app.tsx        # App wrapper with providers
│   ├── login.tsx       # Login page
│   ├── dashboard/      # Dashboard pages
│   └── projects/       # Project management pages
├── store/              # Zustand state management
├── styles/             # Global styles and Tailwind config
├── types/              # TypeScript type definitions
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Blue Carbon MRV Admin` |
| `NEXTAUTH_SECRET` | JWT secret key | Required |
| `NODE_ENV` | Environment | `development` |

### Tailwind Configuration

The project uses a custom Tailwind configuration with:
- Custom color palette for Blue Carbon theme
- Custom animations and transitions
- Responsive design utilities
- Form and component styles

## API Integration

The dashboard integrates with the Blue Carbon MRV backend API:

### Authentication Endpoints
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `POST /auth/logout` - User logout

### Dashboard Endpoints
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/co2-chart` - Get CO₂ chart data
- `GET /dashboard/tokens-chart` - Get tokens chart data

### Project Endpoints
- `GET /projects` - List projects with filters
- `GET /projects/:id` - Get project details
- `POST /projects/:id/verify` - Verify project
- `POST /projects/:id/reject` - Reject project
- `GET /export/projects` - Export projects

### MRV Data Endpoints
- `GET /mrv` - List MRV data
- `GET /mrv/:id` - Get MRV details
- `POST /mrv/:id/verify` - Verify MRV data
- `POST /mrv/:id/reject` - Reject MRV data

## Usage

### Login
1. Navigate to the login page
2. Use demo credentials:
   - Email: `admin@nccr.gov.in`
   - Password: `admin123`
3. Click "Sign In" to access the dashboard

### Dashboard
- View real-time statistics and charts
- Monitor CO₂ sequestration trends
- Track carbon credit issuance
- See recent activity

### Project Management
- Browse all registered projects
- Use filters to find specific projects
- View detailed project information
- Verify or reject pending projects
- Export project data

## Customization

### Adding New Pages
1. Create a new file in `pages/` directory
2. Use the `DashboardLayout` component for consistent styling
3. Add navigation item in `components/Layout/Sidebar.tsx`

### Adding New Charts
1. Import required components from Recharts
2. Create chart component with responsive container
3. Add to dashboard or create dedicated analytics page

### Styling
- Use Tailwind CSS classes for styling
- Custom components are available in `styles/globals.css`
- Follow the design system for consistency

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
1. Build the project: `npm run build`
2. Start production server: `npm run start`
3. Configure environment variables
4. Set up reverse proxy if needed

## Security Considerations

- JWT tokens are stored securely in localStorage
- API requests include authentication headers
- Protected routes prevent unauthorized access
- Environment variables are properly configured
- HTTPS is enforced in production

## Performance Optimization

- React Query for efficient data caching
- Image optimization with Next.js
- Code splitting and lazy loading
- Optimized bundle size
- Responsive images and assets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

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
- Documentation: [Link to documentation]
- Issues: [GitHub issues page]

## Roadmap

- [ ] Dark mode support
- [ ] Advanced analytics and reporting
- [ ] Real-time notifications
- [ ] Mobile app companion
- [ ] Multi-language support
- [ ] Advanced export options
- [ ] Audit trail and logging
- [ ] Integration with external APIs

## Changelog

### v1.0.0 (2024-01-20)
- Initial release
- Dashboard with analytics
- Project management
- Authentication system
- Responsive design
