import { ICalendar } from "datebook";
import type { IControlloData } from "~helpers/interfaces";

export function exportToCalendarFile(controlloData: IControlloData[]) {
  const firstDatum = controlloData[0];
  if (!firstDatum) {
    console.warn("Tried to export to .ics, but subscriptions list is empty");
    return;
  }
  const mainCalendar = subscriptionToICalendar(firstDatum);
  for (let i = 1; i < controlloData.length; i++) {
    mainCalendar.addEvent(subscriptionToICalendar(controlloData[i]));
  }

  const outputStr = mainCalendar.render()
  console.debug(outputStr);

  {
  const anchor = document.createElement("a");
  anchor.setAttribute("download", "subscriptions.ics");
  anchor.setAttribute(
    "href",
    // https://datebook.dev/api/icalendar.html#example-for-downloading-an-ics-file
    URL.createObjectURL(new Blob([outputStr], { type: "text/calendar" })),
  );
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  }
}

function subscriptionToICalendar(
  subscription: IControlloData
): ICalendar {
  // https://datebook.dev/config/recurrence.html#frequency
  const frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" =
    subscription.frecuency === "monthly"
      ? "MONTHLY"
      : subscription.frecuency === "yearly"
      ? "YEARLY"
      : null

  const iCalendar = new ICalendar({
    title: subscription.service + ' subscription', // TODO i18n
    description: subscription.serviceLink,
    start: new Date(subscription.date),
    recurrence: {
      // TODO fix: this does not work well 31st day of month,
      // it will skip months that have < 31 days...
      // Looks like we'll have to handle this manually:
      // https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10
      // > Recurrence rules may generate recurrence instances with an invalid
      // > date (e.g., February 30)
      // > Such recurrence instances MUST be ignored and MUST NOT be
      // > counted as part of the recurrence set.
      frequency,
      interval: 1,
    },
  });
  iCalendar.addProperty("CATEGORIES", "SUBSCRIPTIONS-CONTROLLO")

  return iCalendar;

  // TODO utilize IDs so that exporting multiple times
  // will not duplicate events
  //
  // TODO also support the removal of events:
  // https://github.com/jshor/datebook/issues/180
  // We'll need to store deleted entries though.
  //
  // But perhaps users could remove all Controllo events by category for now?
  // Some apps support this.
}
