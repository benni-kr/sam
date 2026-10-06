import type { Metadata } from "next";
import { WeekView } from "@/features/weekly-schedule/components/week-view";
import {
  fetchEventForOg,
  formatOgDescription,
  getRequestOrigin,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
} from "@/features/planner/lib/event-og-helper";

type PageProps = {
  searchParams: Promise<{ event?: string; semester?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const params = await searchParams;
  const eventId = typeof params?.event === "string" ? params.event : null;

  if (!eventId) {
    return {
      metadataBase: new URL(origin),
    };
  }

  const event = await fetchEventForOg(eventId);
  if (!event) {
    return {
      metadataBase: new URL(origin),
    };
  }

  const title = `${event.title} | SAM`;
  const description = formatOgDescription(event);
  const absoluteImageUrl = `${origin}${OG_IMAGE_PATH}`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "SAM",
      type: "website",
      images: [
        {
          url: absoluteImageUrl,
          secureUrl: absoluteImageUrl.startsWith("https://") ? absoluteImageUrl : undefined,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          type: "image/png",
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [absoluteImageUrl],
    },
  };
}

export default function Page() {
  return <WeekView />;
}
