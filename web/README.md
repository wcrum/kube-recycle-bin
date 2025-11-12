# Kube Recycle Bin Web UI

React-based frontend for managing Kubernetes recycle items.

## Development

### Prerequisites

- Node.js 18+ and npm

### Setup

```bash
cd web
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default port).

### Build for Production

```bash
npm run build
```

This creates a `dist` folder with the production build that gets copied into the Docker image.

## Features

- **Material Design UI** with natural color palette
- **Dark mode support** with theme persistence
- **YAML syntax highlighting** for viewing recycled resources
- **Responsive design** for mobile and desktop
- **Component-based architecture** using React
