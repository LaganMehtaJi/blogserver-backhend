import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const DOMAIN = "api.ayuranature.com";
const BACKEND_PORT = 3000;
const EMAIL = "admin@ayuranature.com";

const runCommand = (cmd, label) => {
  try {
    console.log(`⏳ ${label}...`);
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    console.log(`✅ ${label} - Done`);
    return output;
  } catch (error) {
    console.error(`❌ ${label} - Failed:`, error.message);
    throw error;
  }
};

const isInstalled = (cmd) => {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

const fileExists = (filePath) => {
  try {
    execSync(`test -f ${filePath}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

const setupNginxAndSSL = async () => {
  // Only run on Linux (AWS EC2 server), skip on Windows (local dev)
  if (os.platform() !== "linux") {
    console.log("⏭️  Skipping Nginx/SSL setup (not on Linux server)");
    return;
  }

  // Check if setup is already done (SSL cert exists)
  if (fileExists(`/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`)) {
    console.log("✅ SSL certificate already exists. Nginx/SSL setup already done!");
    
    // Just make sure Nginx is running
    try {
      execSync("sudo systemctl start nginx", { stdio: "pipe" });
    } catch {}
    return;
  }

  console.log("🚀 Starting Nginx + SSL auto-setup...");
  console.log("=".repeat(50));

  try {
    // Step 1: Install Nginx if not installed
    if (!isInstalled("nginx")) {
      runCommand("sudo apt update -y", "Updating apt packages");
      runCommand("sudo apt install nginx -y", "Installing Nginx");
    } else {
      console.log("✅ Nginx is already installed");
    }

    // Step 2: Enable and start Nginx
    runCommand("sudo systemctl enable nginx", "Enabling Nginx");
    runCommand("sudo systemctl start nginx", "Starting Nginx");

    // Step 3: Create Nginx reverse proxy config
    const nginxConfig = `server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

    // Write config to a temp file, then sudo copy it
    const tempConfigPath = path.join(os.tmpdir(), "nginx-api-config");
    fs.writeFileSync(tempConfigPath, nginxConfig);
    runCommand(`sudo cp ${tempConfigPath} /etc/nginx/sites-available/api`, "Creating Nginx config");

    // Step 4: Enable the site
    runCommand("sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/", "Enabling site");

    // Step 5: Remove default site if exists (to avoid conflicts)
    try {
      execSync("sudo rm -f /etc/nginx/sites-enabled/default", { stdio: "pipe" });
    } catch {}

    // Step 6: Test and restart Nginx
    runCommand("sudo nginx -t", "Testing Nginx config");
    runCommand("sudo systemctl restart nginx", "Restarting Nginx");

    // Step 7: Install Certbot if not installed
    if (!isInstalled("certbot")) {
      runCommand("sudo apt install certbot python3-certbot-nginx -y", "Installing Certbot");
    } else {
      console.log("✅ Certbot is already installed");
    }

    // Step 8: Get SSL certificate
    runCommand(
      `sudo certbot --nginx -d ${DOMAIN} --redirect --non-interactive --agree-tos -m ${EMAIL}`,
      "Getting SSL certificate"
    );

    // Step 9: Restart Nginx after SSL
    runCommand("sudo systemctl restart nginx", "Final Nginx restart");

    // Step 10: Configure UFW firewall if active
    try {
      const ufwStatus = execSync("sudo ufw status", { encoding: "utf8", stdio: "pipe" });
      if (ufwStatus.includes("Status: active")) {
        execSync("sudo ufw allow 80", { stdio: "pipe" });
        execSync("sudo ufw allow 443", { stdio: "pipe" });
        execSync("sudo ufw reload", { stdio: "pipe" });
        console.log("✅ Firewall configured (ports 80, 443 allowed)");
      }
    } catch {
      console.log("ℹ️  UFW not available, skipping firewall config");
    }

    console.log("=".repeat(50));
    console.log(`🎉 SETUP COMPLETE!`);
    console.log(`✅ https://${DOMAIN}/api/posts should now work!`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("=".repeat(50));
    console.error("❌ Setup failed:", error.message);
    console.error("The server will continue running on port " + BACKEND_PORT);
    console.error("=".repeat(50));
  }
};

export default setupNginxAndSSL;
