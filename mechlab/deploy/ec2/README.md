# MechLab EC2 Deploy (Nginx + Static Vite Build)

This deploy path serves `mechlab/dist` as a static site from Nginx on EC2.

## 1) EC2 prerequisites

- Instance type: any small Linux instance is fine.
- Security Group:
  - allow `22` from your IP
  - allow `80` from anywhere
  - allow `443` from anywhere (for HTTPS)
- Optional but recommended:
  - Elastic IP
  - Domain name pointing to the instance (`A` record)

## 2) SSH into EC2

```bash
ssh -i /path/to/key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

For Ubuntu AMIs, user is usually `ubuntu`.

## 3) Bootstrap server packages

Amazon Linux 2023:

```bash
cd ~
curl -fsSL https://raw.githubusercontent.com/EvanZ/mechlab/main/mechlab/deploy/ec2/bootstrap-amazon-linux.sh -o bootstrap-amazon-linux.sh
chmod +x bootstrap-amazon-linux.sh
./bootstrap-amazon-linux.sh
```

If you are on Ubuntu, install equivalents manually:
- Node.js 20+
- nginx
- git
- rsync

## 4) Clone repo and deploy

```bash
cd ~
git clone https://github.com/EvanZ/mechlab.git
cd mechlab/mechlab
chmod +x deploy/ec2/deploy-static.sh
./deploy/ec2/deploy-static.sh
```

This script:
- installs deps with `npm ci`
- runs `npm run build`
- syncs `dist/` to `/var/www/mechlab`

## 5) Install nginx config

```bash
sudo cp deploy/ec2/nginx-mechlab.conf /etc/nginx/conf.d/mechlab.conf
sudo nginx -t
sudo systemctl reload nginx
```

Now open:

```text
http://YOUR_EC2_PUBLIC_IP
```

## 6) Enable HTTPS (recommended)

After your domain points to EC2:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7) Future updates

```bash
cd ~/mechlab
git pull origin main
cd mechlab
./deploy/ec2/deploy-static.sh
```

## Notes

- This app is SPA-style, and Nginx `try_files` routes unknown paths to `index.html`.
- If you host under a subpath (not root `/`), set Vite `base` in `vite.config.ts`.
