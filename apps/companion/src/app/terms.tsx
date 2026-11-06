import { LegalPage } from "@/components/LegalPage";
import { terms } from "@/content/legal";

export default function Page() {
  return <LegalPage doc={terms} />;
}
