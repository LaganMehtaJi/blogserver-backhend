#!/bin/bash
# Setup Nginx and SSL for api.ayuranature.com

# 1. Update and install Nginx
sudo apt update
sudo apt install nginx -y

# 2. Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 3. Create Nginx Configuration for the API
cat << 'EOF' | sudo tee /etc/nginx/sites-available/api
server {
    listen 80;
    server_name api.ayuranature.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 4. Enable Site
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/

# 5. Test and Restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# 6. Install Certbot and configure SSL
sudo apt install certbot python3-certbot-nginx -y

# Note: certbot might require interactive input if email is not configured, 
# so you might need to run this manually or ensure your pipeline can handle it.
sudo certbot --nginx -d api.ayuranature.com --redirect --non-interactive --agree-tos -m admin@ayuranature.com

# 7. (Optional) Configure UFW Firewall if enabled
if sudo ufw status | grep -q "Status: active"; then
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw reload
fi

# 8. PM2 Verify
pm2 list
pm2 restart all
pm2 save

echo "Nginx setup and SSL configuration completed!"
