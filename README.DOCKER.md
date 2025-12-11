# Docker Deployment Guide

## API URL Configuration: Build-time vs Runtime

### Current Implementation: **BUILD-TIME**

The API URL (`NEXT_PUBLIC_API_URL`) is currently a **build-time argument** because:

1. Next.js embeds all `NEXT_PUBLIC_*` environment variables into the JavaScript bundle during the build process
2. These variables become part of the static files and cannot be changed at runtime
3. To change the API URL, you must rebuild the Docker image

### Building the Image

```bash
# Build with default API URL (http://localhost:8000)
docker build -t tbspartner .

# Build with custom API URL
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t tbspartner .

# Using docker-compose
docker-compose build
```

### Running the Container

```bash
# Run the container
docker run -p 3000:3000 tbspartner

# Or with docker-compose
docker-compose up
```

### Making API URL Runtime-Configurable (Optional)

If you need to change the API URL without rebuilding, you have a few options:

#### Option 1: Use a Custom Server (Recommended for runtime config)

1. Create `server.js` in the root:
```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
```

2. Update `package.json`:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

3. Update `src/lib/api.ts` to read from a runtime config endpoint or use a different approach.

#### Option 2: Use Environment-Specific Builds

Build separate images for different environments:
- `tbspartner:dev` (API URL: http://localhost:8000)
- `tbspartner:staging` (API URL: https://staging-api.example.com)
- `tbspartner:prod` (API URL: https://api.example.com)

#### Option 3: Use Next.js API Routes as Proxy

Create API routes that proxy requests to a configurable backend URL stored in server-side environment variables.

### Current Recommendation

For most use cases, **build-time configuration is sufficient** because:
- It's simpler and more secure (no runtime configuration needed)
- Different environments can have different Docker images
- It follows Next.js best practices for public environment variables

Use runtime configuration only if you need to:
- Deploy the same image to multiple environments with different API URLs
- Change the API URL without rebuilding
- Support dynamic backend discovery


