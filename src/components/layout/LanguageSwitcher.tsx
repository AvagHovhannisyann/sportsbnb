import { Check, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, LANGUAGE_NAMES } from "@/i18n/types";

/**
 * Language picker.
 *
 * Each language is listed in its own script — "Հայերեն", not "Armenian". A
 * picker that names languages in the language you cannot read is the one
 * control on the page that must not require understanding the current one.
 *
 * `lang` on each item tells the browser which script that text is in, so the
 * Armenian option is rendered with the Armenian font stack and read by a screen
 * reader in an Armenian voice even while the surrounding page is English.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          // Named for the action, not the state: "Language" alone leaves a
          // screen-reader user unsure whether it reports or changes it.
          aria-label={`${t("nav.language")}: ${LANGUAGE_NAMES[language]}`}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1.5 text-ui font-medium uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LANGUAGES.map((code) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onSelect={() => setLanguage(code)}
            className="justify-between gap-3"
          >
            {LANGUAGE_NAMES[code]}
            {code === language && <Check className="h-4 w-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
