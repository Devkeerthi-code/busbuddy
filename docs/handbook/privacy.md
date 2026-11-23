# Privacy

**Students' locations are never collected.** The rider app only reads the bus position.

**Drivers' locations are collected only during a trip they started**, and stop when the trip ends (at the last stop, by holding End trip, or after 30 minutes without a fix). The Android notification is visible the whole time.

| Data | Who can see it | Kept |
| --- | --- | --- |
| Live bus position | Members of the same college | Until the trip ends |
| Breadcrumbs | Transport admins of the college | 7 days |
| Name and role | Transport admins of the college | While a member |
| Email | Only the user (Supabase Auth) | While the account exists |
| Push token | Server only, to send the one alert | Until replaced or the user leaves |
| Usage counts | Transport admins, platform admins | Counts only, no personal data |

Leaving a college (Me → Leave this college), or being removed by the transport office, deletes the membership and the saved stop and alert setting for that college (migration `…0800_leave_college_cleanup.sql`), so no more alerts are sent. Push tokens belong to the device and are replaced on the next sign-in; deleting the account removes everything.
