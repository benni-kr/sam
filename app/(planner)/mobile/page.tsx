import { MobileView } from "@/components/planner/mobile-view";

export default function Page({
  searchParams,
}: {
  searchParams?: { semester?: string };
}) {
  return <MobileView semesterId={searchParams?.semester} />;
}
