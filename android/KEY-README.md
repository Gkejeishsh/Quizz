# Release signing

`android/quizz-release.jks` is the signing key for Quizz.

- **Alias:** `quizz`
- **Password:** `quizz-personal-key` (override with the `QUIZZ_KEYSTORE_PASSWORD` / `QUIZZ_KEY_PASSWORD` env vars)
- **Validity:** 10,000 days

Why it is committed: Android only lets an update replace an installed app when both
APKs are signed with the **same key**. Committing the key keeps your installed app —
and everything saved in it — updatable. It is a personal-use key for an offline app
with no payments or accounts.

**If you ever publish on Google Play**, generate a fresh key, keep it out of the
repository, and use Play App Signing instead.

Regenerate (only if you accept that existing installs must be uninstalled first):

```bash
keytool -genkeypair -v -keystore android/quizz-release.jks -alias quizz \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass quizz-personal-key -keypass quizz-personal-key \
  -dname "CN=Quizz, OU=Personal, O=Quizz, L=Bannu, S=KPK, C=PK"
```
