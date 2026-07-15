import { CitizenHome, type CitizenHomeMode } from "@/components/citizen/CitizenHome";
import { LANGUAGES, type Language } from "@/lib/types";

export default async function CitizenPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; view?: string }>;
}) {
  const query = await searchParams;
  const requestedLanguage = query.lang as Language | undefined;
  const initialLanguage = requestedLanguage && LANGUAGES.includes(requestedLanguage)
    ? requestedLanguage
    : "en";
  const initialMode: CitizenHomeMode = query.view === "track" ? "track" : "new";

  return <CitizenHome initialLanguage={initialLanguage} initialMode={initialMode} />;
}
