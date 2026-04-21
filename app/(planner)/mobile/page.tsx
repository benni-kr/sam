import { ViewPlaceholder } from "@/components/planner/view-placeholder";

export default function Page() {
  return (
    <ViewPlaceholder
      eyebrow="Mobile list"
      title="A compact list view for smaller screens"
      description="The mobile view will present the same semester data as a chronological list, optimized for quick scanning and editing on small screens."
      bullets={[
        "The list will reuse the same event model.",
        "Ordering should stay chronological and semester-aware.",
        "This route will eventually support quick edits and filters.",
        "A separate view avoids forcing the canvas UI onto phones.",
      ]}
    />
  );
}