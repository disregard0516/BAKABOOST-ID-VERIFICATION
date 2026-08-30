import {
  ReviewWorkspace,
} from "@/components/admin/review-workspace";

interface ReviewPageProps {
  params: Promise<{
    requestId: string;
  }>;
}

export default async function ReviewPage({
  params,
}: ReviewPageProps) {
  const {
    requestId,
  } = await params;

  return (
    <ReviewWorkspace
      requestId={requestId}
    />
  );
}