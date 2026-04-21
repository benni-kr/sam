import { MindMapView } from "@/components/planner/mindmap-view";

export default function Page({
  searchParams,
}: {
  searchParams?: { semester?: string };
}) {
  return <MindMapView semesterId={searchParams?.semester} />;
}
