# Document Studio Android 2.0

Permanent server: https://abmgroup.tech/. Deploy the server API before using the APK. No customer data, credential or API key is bundled.

One website header, a loading screen and swipe-down reload at the top of the page. Reload waits for draft writes. The hash route and username-scoped IndexedDB restore the current page and unfinished form, including images. Clear removes the local draft. Uninstall or clearing site data removes drafts.

ML Kit provides capture, edge adjustment and confirmation. First use needs Google Play Services and internet. Existing scanner, PDF preview and download features remain.

Build using JDK 17, Android SDK 35, Gradle 8.11.1, or build-local.ps1 with the existing toolchain. Version code 3 / version name 2.0. The APK is debug-signed with the existing private key for sideloading; not a Play Store release. Keep the key for compatible updates. Build and lint pass; check camera, swipe and downloads on a physical phone.
