import { CrosstablesView } from "@/features/planner/components/crosstables-view";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function Page() {
  return (
    <ErrorBoundary name="Matrix View">
      <CrosstablesView />
    </ErrorBoundary>
  );
}
