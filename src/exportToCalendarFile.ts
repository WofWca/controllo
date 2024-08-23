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

  // Careful: we might mutate the date below.
  const date = new Date(subscription.date);

  // By default recurrence does not work well e.g. for the 31st day of month,
  // it will skip months that have < 31 days.
  // https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10
  // > Recurrence rules may generate recurrence instances with an invalid
  // > date (e.g., February 30)
  // > Such recurrence instances MUST be ignored and MUST NOT be
  // > counted as part of the recurrence set.
  //
  // We need to handle this manually.
  const manuallySetRecurrence: string | null = (function () {
    if (frequency === "YEARLY") {
      // Please tell me this is the only leap day out there.
      if (
        date.getMonth() == 1 && // February
        date.getDate() == 29
      ) {
        // Last day of the month
        // Apparently this doesn't work for some calendar apps...
        // return `FREQ=${frequency};BYMONTH=${date.getMonth() + 1}BYMONTHDAY=-1;INTERVAL=1`

        date.setDate(28);
        return null;
      }
      return null;
    } else if (frequency === "MONTHLY") {
      const monthDay = date.getDate();
      if (monthDay <= 28) {
        return null;
      }

      // https://stackoverflow.com/questions/38446725/get-number-of-days-in-the-current-month-using-javascript/38446764#38446764
      // `date.getMonth() + 1` gives next month,
      // and day "0" will "carry over" to previous month
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#parameters
      const lastDayOfCurrMonth =
        (new Date(date.getFullYear(), date.getMonth() + 1, 0)).getDate()
      const daysBeforeEndOfMonth = lastDayOfCurrMonth - monthDay;
      // `BYMONTHDAY=-1` gives last day of month, -2 gives second last,
      // so we need to subtract 1 from the diff.
      return `FREQ=${frequency};BYMONTHDAY=${-1 * (daysBeforeEndOfMonth + 1)};INTERVAL=1`;
    }
    throw new Error(`Unhandled recurrence frequency: "${frequency}"`);
  })();

  const title = subscription.service + ' subscription'; // TODO i18n
  const iCalendar = new ICalendar({
    title: title,
    description: subscription.serviceLink,
    start: date,
    recurrence: manuallySetRecurrence
      ? undefined
      : {
          frequency,
          interval: 1
        }
  });
  if (manuallySetRecurrence) {
    // TODO add to description that we changed the date?
    // Or is it good enough? We're only making it off by a day,
    // plus who knows how the subscription service actually handles
    // the dates itself.
    iCalendar.setMeta("RRULE", manuallySetRecurrence);
  }

  iCalendar.addProperty("CATEGORIES", "SUBSCRIPTIONS-CONTROLLO")

  iCalendar.addAlarm({
    action: "DISPLAY",
    description: title,
    trigger: {
      days: 2,
    },
  });

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
