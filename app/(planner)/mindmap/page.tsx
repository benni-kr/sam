import { ViewPlaceholder } from "@/components/planner/view-placeholder";

export default function Page() {
  return (
    <ViewPlaceholder
      eyebrow="Mind maps"
      title="Category mind maps are coming next"
      description="This view will group events by category, then branch into participants and other relationships so the shared semester can be explored visually."
      bullets={[
        "Events will be the first level in each map.",
        "Participants will become the second level.",
        "The view should stay synchronized with the calendar data.",
        "This route is intentionally a placeholder for now.",
      ]}
    />
  );
}