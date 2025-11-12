// Returns a Date object set to midnight UTC for the given UTC date string (YYYY-MM-DD or ISO string)
export function getUTCDate(dateInput) {
  const date = new Date(dateInput);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth()
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export function convertDateToDayString(date) {
  const options = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const utcDate = getUTCDate(date)
  const localAdjustedDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
  return localAdjustedDate.toLocaleDateString("en-US", options);
}