# Deploy Haaste to GitHub Pages at haaste.co.uk

This guide assumes you have never deployed a website before.

## What You Need

- A GitHub account.
- Git installed on your computer.
- Node.js installed.
- Your Supabase project URL and publishable key.
- Access to the DNS settings for `haaste.co.uk`.

## 1. Create a GitHub Repository

1. Go to https://github.com.
2. Sign in.
3. Press the green **New** button.
4. Repository name: `Haaste`.
5. Choose **Private** or **Public**.
6. Do not tick "Add a README".
7. Press **Create repository**.

## 2. Install Git If Required

Open Terminal and run:

```bash
git --version
```

If you see a version number, Git is installed. If macOS asks you to install command line tools, accept it and wait for it to finish.

## 3. Prepare The Project Locally

In Terminal, go to the project folder:

```bash
cd /Users/princehalfcut/Documents/Haaste
```

Install packages:

```bash
npm install
```

Check the site builds:

```bash
npm run build
```

## 4. Initialise Git Locally

If this project is not already a Git repository, run:

```bash
git init
```

Set the main branch name:

```bash
git branch -M main
```

## 5. Commit The Code

Add all project files:

```bash
git add .
```

Create a save point:

```bash
git commit -m "Prepare Haaste React app for deployment"
```

## 6. Connect To GitHub

Copy the repository URL from GitHub. It looks like:

```bash
https://github.com/YOUR_USERNAME/Haaste.git
```

Connect your local folder to GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Haaste.git
```

If Git says `remote origin already exists`, use:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/Haaste.git
```

Push the code:

```bash
git push -u origin main
```

## 7. Add Supabase Secrets In GitHub

1. Open your GitHub repository.
2. Go to **Settings**.
3. Go to **Secrets and variables**.
4. Click **Actions**.
5. Click **New repository secret**.
6. Add this secret:

```text
Name: VITE_SUPABASE_URL
Value: your Supabase project URL
```

7. Click **New repository secret** again.
8. Add this secret:

```text
Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: your Supabase publishable key
```

These values are safe to use in the browser because Supabase protects data with Row Level Security policies.

## 8. Turn On GitHub Pages With haaste.co.uk

1. In GitHub, open the repository.
2. Go to **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Under **Custom domain**, type:

```text
haaste.co.uk
```

6. Press **Save**.
7. GitHub may show a DNS warning until the domain records are added. That is normal.

The file `public/CNAME` is already included in this project and contains:

```text
haaste.co.uk
```

That tells GitHub Pages to keep using the custom domain after every deploy.

## 9. Point haaste.co.uk To GitHub Pages

Open the website where you manage the domain `haaste.co.uk`. This might be GoDaddy, Namecheap, Cloudflare, Squarespace Domains, IONOS, or another domain provider.

Find the **DNS** settings.

For the root domain `haaste.co.uk`, add these four **A records**:

```text
Type: A
Name: @
Value: 185.199.108.153
```

```text
Type: A
Name: @
Value: 185.199.109.153
```

```text
Type: A
Name: @
Value: 185.199.110.153
```

```text
Type: A
Name: @
Value: 185.199.111.153
```

For `www.haaste.co.uk`, add this **CNAME record**:

```text
Type: CNAME
Name: www
Value: YOUR_USERNAME.github.io
```

Replace `YOUR_USERNAME` with your GitHub username.

DNS can take a few minutes, and sometimes a few hours, to start working.

## 10. Deploy

The file `.github/workflows/deploy.yml` deploys automatically whenever you push to `main`.

To trigger it manually:

1. Go to the **Actions** tab.
2. Click **Deploy to GitHub Pages**.
3. Click **Run workflow**.
4. Wait until both jobs have green ticks.

## 11. Open The Website

Open:

```text
https://haaste.co.uk
```

Open that URL in Chrome, Safari, Edge, and your phone browser.

Check:

- The Haaste favicon appears in the browser tab.
- Refreshing `https://haaste.co.uk/login`, `https://haaste.co.uk/register`, `https://haaste.co.uk/search`, `https://haaste.co.uk/landlord`, and `https://haaste.co.uk/tenant` works.
- Images load.
- Registration and login connect to Supabase.

## 12. Turn On HTTPS

1. In GitHub, open the repository.
2. Go to **Settings**.
3. Go to **Pages**.
4. Wait until GitHub says the domain is configured correctly.
5. Tick **Enforce HTTPS**.

After that, always use:

```text
https://haaste.co.uk
```

## Supabase SQL

Run migrations in Supabase SQL Editor in this order:

1. `supabase/migrations/202606040001_haaste_core.sql`
2. `supabase/migrations/202606040002_profile_signup_trigger.sql`
3. `supabase/migrations/202606040003_split_profile_names.sql`

If the first two were already run, only run:

```text
supabase/migrations/202606040003_split_profile_names.sql
```

## Common Problems

If the page is blank:

- Check GitHub Actions finished successfully.
- Check repository secrets are named exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Open the browser developer console and check for red errors.
- Make sure the workflow builds with `VITE_BASE_PATH: /`. This is already configured for `haaste.co.uk`.

If refresh gives a 404:

- Make sure `public/404.html` exists in the repository.
- Make sure GitHub Pages source is set to **GitHub Actions**.
- Make sure the custom domain in GitHub Pages is exactly `haaste.co.uk`.

If `haaste.co.uk` does not open:

- Check the four A records are added exactly.
- Check `www` has a CNAME pointing to `YOUR_USERNAME.github.io`.
- Wait longer for DNS to update.
- In GitHub Pages settings, check whether GitHub is still verifying the domain.

If login or registration fails:

- Check the Supabase URL and publishable key secrets.
- Check Supabase Authentication is enabled.
- Check the SQL migrations have been run.
- Check Supabase Row Level Security policies are installed from the migration.

If the favicon does not update:

- Hard refresh the browser.
- Chrome/Edge: press `Cmd + Shift + R`.
- Safari: enable Develop menu, then use **Empty Caches**.
