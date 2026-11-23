# Alerts are not arriving

**When:** A student turned on alerts but got nothing.

1. Alerts work in the Android app only, not in the browser.
2. Check the student allowed notifications for BusBuddy in Android settings.
3. The alert fires once per trip, when the ETA first drops to 5 minutes or less. If they turned it on later, it will come on the next trip.
4. Check the Firebase setup: `google-services.json` provided to EAS and the FCM V1 key uploaded with `eas credentials` (README → Push notifications), then rebuild.
5. Edge Function logs show the Expo push API response for each send.
