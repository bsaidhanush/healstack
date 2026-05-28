# Publishing HealStack to pub.dev

This guide details how to publish the `healstack_flutter` package to the official Dart/Flutter package repository, pub.dev.

---

## Prerequisites

1. **Clean Git State:** Ensure all modifications in the package directory are committed or stashed.
2. **Valid Metadata:** We have already filled in and validated `pubspec.yaml`, `LICENSE` (MIT), and `CHANGELOG.md` with version `1.0.0`.
3. **Dry-Run Check:** We successfully executed `flutter pub publish --dry-run` and verified that the package meets all packaging guidelines.

---

## Method 1: Manual Interactive Publishing

To publish directly from your developer workstation:

1. **Open your terminal** and navigate to the package directory:
   ```bash
   cd healstack_flutter
   ```

2. **Execute the publishing command:**
   ```bash
   flutter pub publish
   ```

3. **Authenticate:**
   - The CLI will print a unique Google login URL to the terminal and ask you to open it in your browser.
   - Sign in using your Google/developer credentials.
   - Upon successful authorization, the CLI will automatically fetch the publish token and upload the package to pub.dev in seconds.

---

## Method 2: Automated CI/CD Publishing (Recommended)

To publish automatically whenever a new version tag is pushed to your GitHub repository:

1. **Acquire a Pub Token:**
   - Run `flutter pub publish` once locally to generate credentials.
   - Copy the publish token/credentials from your local Dart cache directory:
     - Windows: `%APPDATA%\dart\pub-credentials.json`
     - Linux/macOS: `~/.config/dart/pub-credentials.json`

2. **Add Secret to GitHub Repository:**
   - Navigate to your GitHub repository Settings -> Secrets and variables -> Actions.
   - Add a new secret named `PUB_CREDENTIALS_JSON` and paste the contents of your `pub-credentials.json` file.

3. **Add Workflow Configuration:**
   Create a file `.github/workflows/publish.yml` with the following contents:
   ```yaml
   name: Publish to pub.dev

   on:
     push:
       tags:
         - 'v*' # Trigger on tag push, e.g. v1.0.0

   jobs:
     publish:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout Code
           uses: actions/checkout@v3

         - name: Install Flutter
           uses: subosito/flutter-action@v2
           with:
             channel: 'stable'

         - name: Configure Pub Credentials
           run: |
             mkdir -p ~/.config/dart
             echo '${{ secrets.PUB_CREDENTIALS_JSON }}' > ~/.config/dart/pub-credentials.json

         - name: Publish Package
           run: flutter pub publish --force
   ```

Now, simply tag your commit and push it to main:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions will securely build, validate, and publish the package automatically!
