import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __setup_filename = fileURLToPath(import.meta.url);
const __setup_dirname = path.dirname(__setup_filename);

const DOMAIN = "api.ayuranature.com";
const BACKEND_PORT = 3000;
const EMAIL = "admin@ayuranature.com";
const LOG_FILE = path.join(__setup_dirname, "setup-log.txt");

// ========== Logging ==========
const log = (message) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(message);
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
};

// ========== Run Command (async, non-blocking, with timeout) ==========
const runCmd = (cmd, timeoutMs = 120000) => {
  return new Promise((resolve, reject) => {
    log(`⏳ Running: ${cmd}`);
    exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        log(`❌ FAILED: ${cmd}`);
        log(`   Error: ${error.message}`);
        if (stderr) log(`   Stderr: ${stderr.substring(0, 500)}`);
        reject(error);
      } else {
        log(`✅ OK: ${cmd}`);
        if (stdout && stdout.trim()) log(`   Output: ${stdout.trim().substring(0, 500)}`);
        resolve(stdout);
      }
    });
  });
};

// ========== Check if command exists ==========
const commandExists = async (cmd) => {
  try {
    await runCmd(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
};

// ========== Detect Package Manager ==========
const detectPackageManager = async () => {
  if (await commandExists("dnf")) return "dnf";
  if (await commandExists("yum")) return "yum";
  if (await commandExists("apt")) return "apt";
  return null;
};

// ========== Main Setup Function ==========
const setupNginxAndSSL = async () => {
  // Only run on Linux (AWS EC2), skip on Windows (local dev)
  if (os.platform() !== "linux") {
    console.log("⏭️  Skipping Nginx/SSL setup (not on Linux server)");
    return;
  }

  // Clear old log
  try { fs.writeFileSync(LOG_FILE, ""); } catch {}

  log("========================================");
  log("🚀 STARTING NGINX + SSL AUTO-SETUP");
  log("========================================");
  log(`Platform: ${os.platform()}`);
  log(`User: ${os.userInfo().username}`);
  log(`Domain: ${DOMAIN}`);
  log(`Backend Port: ${BACKEND_PORT}`);

  try {
    // Check who we are running as
    try {
      const whoami = await runCmd("whoami");
      log(`Running as: ${whoami.trim()}`);
    } catch {}

    // Check if sudo works
    try {
      await runCmd("sudo -n echo 'sudo works'");
      log("✅ Sudo access: YES (passwordless)");
    } catch {
      log("❌ Sudo access: NO (password required)");
      log("⚠️  Cannot install Nginx without sudo. Setup aborted.");
      return;
    }

    // Check if SSL certificate already exists
    try {
      await runCmd(`test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem`);
      log("✅ SSL certificate already exists! Setup already done.");
      try { await runCmd("sudo systemctl start nginx"); } catch {}
      return;
    } catch {
      log("No existing SSL certificate found. Proceeding with full setup...");
    }

    // ========== Detect Package Manager ==========
    const pkgManager = await detectPackageManager();
    log(`Package Manager detected: ${pkgManager}`);

    if (!pkgManager) {
      log("❌ No package manager found (apt/yum/dnf). Cannot proceed.");
      return;
    }

    // ========== STEP 1: Install Nginx ==========
    log("--- STEP 1: Install Nginx ---");
    if (await commandExists("nginx")) {
      log("✅ Nginx is already installed");
    } else {
      log("Installing Nginx...");
      if (pkgManager === "dnf") {
        await runCmd("sudo dnf install nginx -y", 180000);
      } else if (pkgManager === "yum") {
        // Amazon Linux 2 - try amazon-linux-extras first
        try {
          await runCmd("sudo amazon-linux-extras install nginx1 -y", 180000);
        } catch {
          await runCmd("sudo yum install nginx -y", 180000);
        }
      } else {
        await runCmd("sudo apt update -y", 180000);
        await runCmd("sudo apt install nginx -y", 180000);
      }
      log("✅ Nginx installed");
    }

    // ========== STEP 2: Start Nginx ==========
    log("--- STEP 2: Start Nginx ---");
    await runCmd("sudo systemctl enable nginx");
    await runCmd("sudo systemctl start nginx");
    log("✅ Nginx started");

    // ========== STEP 3: Create Nginx Config ==========
    log("--- STEP 3: Create Nginx Config ---");
    const nginxConfig = `server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 50M;

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

    const tempConfigPath = path.join(os.tmpdir(), "nginx-api-config");
    fs.writeFileSync(tempConfigPath, nginxConfig);

    // Check nginx config directory structure
    // Amazon Linux uses /etc/nginx/conf.d/ instead of sites-available/sites-enabled
    let useConfD = false;
    try {
      await runCmd("test -d /etc/nginx/conf.d");
      useConfD = true;
      log("Using /etc/nginx/conf.d/ (Amazon Linux style)");
    } catch {
      log("Using /etc/nginx/sites-available/ (Debian/Ubuntu style)");
    }

    if (useConfD) {
      // Amazon Linux style
      await runCmd(`sudo cp ${tempConfigPath} /etc/nginx/conf.d/api.conf`);
    } else {
      // Debian/Ubuntu style
      await runCmd(`sudo cp ${tempConfigPath} /etc/nginx/sites-available/api`);
      await runCmd("sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/");
      try { await runCmd("sudo rm -f /etc/nginx/sites-enabled/default"); } catch {}
    }
    log("✅ Nginx config created");

    // ========== STEP 4: Test & Restart Nginx ==========
    log("--- STEP 4: Test & Restart Nginx ---");
    await runCmd("sudo nginx -t");
    await runCmd("sudo systemctl restart nginx");
    log("✅ Nginx restarted");

    // ========== STEP 5: Install Certbot ==========
    log("--- STEP 5: Install Certbot ---");
    if (await commandExists("certbot")) {
      log("✅ Certbot is already installed");
    } else {
      log("Installing Certbot...");
      if (pkgManager === "dnf") {
        // Amazon Linux 2023
        try {
          await runCmd("sudo dnf install certbot python3-certbot-nginx -y", 180000);
        } catch {
          log("dnf certbot install failed, trying pip...");
          await runCmd("sudo pip3 install certbot certbot-nginx", 180000);
        }
      } else if (pkgManager === "yum") {
        // Amazon Linux 2
        try {
          await runCmd("sudo amazon-linux-extras install epel -y", 180000);
        } catch {
          try {
            await runCmd("sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm", 180000);
          } catch {}
        }
        try {
          await runCmd("sudo yum install certbot python2-certbot-nginx -y", 180000);
        } catch {
          try {
            await runCmd("sudo yum install certbot python3-certbot-nginx -y", 180000);
          } catch {
            log("yum certbot install failed, trying pip...");
            await runCmd("sudo pip3 install certbot certbot-nginx", 180000);
          }
        }
      } else {
        // Ubuntu/Debian
        await runCmd("sudo apt install certbot python3-certbot-nginx -y", 180000);
      }
      log("✅ Certbot installed");
    }

    // ========== STEP 6: Get SSL Certificate ==========
    log("--- STEP 6: Get SSL Certificate ---");
    await runCmd(
      `sudo certbot --nginx -d ${DOMAIN} --redirect --non-interactive --agree-tos -m ${EMAIL}`,
      180000
    );
    log("✅ SSL certificate obtained");

    // ========== STEP 7: Final Restart ==========
    log("--- STEP 7: Final Restart ---");
    await runCmd("sudo systemctl restart nginx");

    // ========== STEP 8: Firewall ==========
    log("--- STEP 8: Firewall ---");
    try {
      const ufwStatus = await runCmd("sudo ufw status");
      if (ufwStatus.includes("Status: active")) {
        await runCmd("sudo ufw allow 80");
        await runCmd("sudo ufw allow 443");
        await runCmd("sudo ufw reload");
        log("✅ Firewall configured");
      } else {
        log("ℹ️  UFW is not active, skipping");
      }
    } catch {
      log("ℹ️  UFW not available (Amazon Linux uses Security Groups), skipping");
    }

    log("========================================");
    log("🎉 SETUP COMPLETE!");
    log(`✅ https://${DOMAIN}/api/posts should now work!`);
    log("========================================");

  } catch (error) {
    log("========================================");
    log("❌ SETUP FAILED!");
    log(`Error: ${error.message}`);
    log(`Server continues running on port ${BACKEND_PORT}`);
    log("========================================");
  }
};

// ========== Get Setup Log (for API endpoint) ==========
export const getSetupLog = () => {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return fs.readFileSync(LOG_FILE, "utf8");
    }
    return "Setup has not run yet (not on Linux server or server just started)";
  } catch {
    return "Could not read setup log";
  }
};

export default setupNginxAndSSL;
