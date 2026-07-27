# Product metrics

Events:

- `visited`: product loaded
- `listing_created`: a public call was created
- `message_copied`: an application message was copied
- `contact_opened`: an allowed external contact link was opened
- `returned`: the same browser returned after at least 20 hours

The event schema accepts exactly one `event` field. Listing text, station, schedule, contact URL, applicant choices, and copied messages are never included.

## Early signal

- At least 5 distinct publishers create a listing.
- At least 5 distinct browsers open an external contact route.

These are interaction signals, not proof of an application or appointment.
