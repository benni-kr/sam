import type { Friend } from "@/features/friends/lib/friend";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getOrdinalSuffix(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

function formatBirthdayDateLabel(dateStr: string) {
  const parts = parseDateParts(dateStr);

  if (!parts) {
    return dateStr;
  }

  const monthName = MONTH_NAMES[parts.month - 1] ?? `${parts.month}`;

  return `${monthName} ${parts.day}${getOrdinalSuffix(parts.day)}`;
}

function parseDateParts(dateStr: string) {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return { year, month, day };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getBirthdayMonthDay(birthday: string, targetYear: number) {
  const parts = parseDateParts(birthday);

  if (!parts) {
    return null;
  }

  if (parts.month === 2 && parts.day === 29 && !isLeapYear(targetYear)) {
    return "03-01";
  }

  return `${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getTargetDateParts(targetDate: Date | string) {
  const date =
    typeof targetDate === "string"
      ? new Date(`${targetDate}T12:00:00`)
      : targetDate;

  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

/**
 * Calculates the age a person turns on the provided target date.
 *
 * Leap-year birthdays (February 29) celebrate on March 1st during
 * non-leap years.
 */
export function calculateAge(
  birthday: string,
  targetDate: Date | string,
): number {
  const birthdayParts = parseDateParts(birthday);

  if (!birthdayParts) {
    return 0;
  }

  const target = getTargetDateParts(targetDate);
  const anniversaryMonthDay = getBirthdayMonthDay(birthday, target.year);

  if (!anniversaryMonthDay) {
    return 0;
  }

  const targetMonthDay = `${target.month}-${target.day}`;

  let age = target.year - birthdayParts.year;

  if (targetMonthDay < anniversaryMonthDay) {
    age -= 1;
  }

  return age;
}

/**
 * Returns the friends whose birthday matches the provided calendar date.
 *
 * Timezones do not matter; comparison is done via the calendar MM-DD portion.
 */
export function getBirthdaysForDate(dateStr: string, friends: Friend[]) {
  const target = parseDateParts(dateStr);

  if (!target) {
    return [] as Friend[];
  }

  const targetMonthDay = `${String(target.month).padStart(2, "0")}-${String(target.day).padStart(2, "0")}`;

  return friends
    .filter((friend) => {
      if (!friend.birthday) {
        return false;
      }

      return (
        getBirthdayMonthDay(friend.birthday, target.year) === targetMonthDay
      );
    })
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Builds a friendly birthday message for tooltips and banners.
 */
export function formatBirthdayMessage(
  dateStr: string,
  birthdays: Friend[],
): string {
  if (birthdays.length === 0) {
    return "";
  }

  const dateLabel = formatBirthdayDateLabel(dateStr);
  const people = birthdays.map((friend) => ({
    name: friend.name,
    age: calculateAge(friend.birthday ?? "", dateStr),
  }));

  if (people.length === 1) {
    const onlyPerson = people[0];

    return `On ${dateLabel}, ${onlyPerson.name} is turning ${onlyPerson.age}!`;
  }

  const head = people
    .slice(0, -1)
    .map((person) => `${person.name} is turning ${person.age}`)
    .join(", ");
  const tail = people[people.length - 1];

  return `On ${dateLabel}, ${head} and ${tail.name} is turning ${tail.age}!`;
}

/**
 * Builds a fun birthday message for the month card banner.
 * Format: "Hey, it's [Name] [age]th and [Name] [age]th birthday! 🎉"
 */
export function formatBirthdayBannerMessage(
  dateStr: string,
  birthdays: Friend[],
): string {
  if (birthdays.length === 0) {
    return "";
  }

  const people = birthdays.map((friend) => ({
    name: friend.name,
    age: calculateAge(friend.birthday ?? "", dateStr),
  }));

  if (people.length === 1) {
    const person = people[0];
    return `Hey, it's ${person.name}'s ${person.age}${getOrdinalSuffix(person.age)} birthday!`;
  }

  const names = people
    .map(
      (person) =>
        `${person.name}'s ${person.age}${getOrdinalSuffix(person.age)}`,
    )
    .join(" and ");

  return `Hey, it's ${names} birthdays!`;
}
