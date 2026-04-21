import { CalendarView } from "@/components/planner/calendar-view";

export default function Page({
  searchParams,
}: {
  searchParams?: { semester?: string };
}) {
  return <CalendarView semesterId={searchParams?.semester} />;
}
