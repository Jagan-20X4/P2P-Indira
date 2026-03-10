# P2P Admin Elite - Deployment Runbook

This document provides the standard operating procedures for setting up, building, and deploying the P2P Admin Elite dashboard to an AWS EC2 environment.

---

## 1. Local Development Environment

### Prerequisites
- **Node.js**: v18.x or higher
- **Package Manager**: npm or yarn
- **API Key**: Ensure you have a valid Gemini API Key for `@google/genai` features.

### Installation
```bash
# Clone the repository
git clone <your-repository-url>
cd p2p-admin-elite

# Install dependencies
npm install
```

### Running Locally
```bash
# Start the development server (transpiles TSX on the fly)
npm run dev
```
The application should be accessible at `http://localhost:3000`.

---

## 2. Build for Production

Since the application uses modern ES Modules (`importmap`), the build process focuses on bundling and minifying assets for optimized delivery.

### Generate Build
```bash
# Production build
npm run build
```
This will generate a `dist/` or `build/` folder containing:
- `index.html` (with updated paths)
- `index.js` (transpiled and minified bundle)
- Any static assets (CSS, Images)

---

## 3. EC2 Infrastructure Setup

### Security Group Configuration
Ensure your EC2 instance's Security Group allows traffic on the following ports:
- **Port 80 (HTTP)**: For standard web access.
- **Port 443 (HTTPS)**: For secure access (highly recommended).
- **Port 22 (SSH)**: For administrative access.

### Server Preparation (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 4. Deployment Process

### Step A: Transfer Files to EC2
Use `scp` to transfer the build artifacts from your local machine to the server.

```bash
# Replace 'your-key.pem' and 'ec2-user@ip' with your actual credentials
scp -i your-key.pem -r ./dist/* ubuntu@your-ec2-ip:/var/www/html/
```

### Step B: Configure Nginx
Create a configuration to serve the Single Page Application (SPA) correctly, ensuring that routes are handled by `index.html`.

```bash
sudo nano /etc/nginx/sites-available/p2p-admin
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Cache control for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Step C: Activate Configuration
```bash
sudo ln -s /etc/nginx/sites-available/p2p-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Environment Variables & API Security

The `API_KEY` for the Gemini API is required at runtime.

- **Option 1 (Client-side Inject)**: If your build tool supports it, define `process.env.API_KEY` during the build step.
- **Option 2 (Nginx Subsitution)**: For advanced setups, use `sub_filter` in Nginx to inject keys into a config file at delivery time (less secure).
- **Recommended**: Use a backend proxy or AWS Secrets Manager if the key must remain strictly hidden from the client source code.

---

## 6. Troubleshooting

- **404 on Refresh**: Ensure the `try_files` directive is correctly set in Nginx. This is crucial for React routers.
- **Permission Denied**: Check that `/var/www/html` has the correct permissions:
  `sudo chown -R www-data:www-data /var/www/html`
- **White Screen**: Check the browser console for script loading errors. Verify that the `importmap` in `index.html` is accessible.

---

## 7. Maintenance

To update the application:
1. Re-build locally: `npm run build`
2. Sync files: `rsync -avz -e "ssh -i key.pem" ./dist/ ubuntu@ip:/var/www/html/`
3. The changes take effect immediately on next browser refresh.