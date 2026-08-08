import { useEffect, useId, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  ExternalLink,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  SearchCheck,
  Send,
  Star,
} from "lucide-react";
import { outreachStatusDescriptor } from "@/components/operator/outreach/status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type OutreachTarget,
  useOutreachMessages,
  usePrepareTarget,
  useSendTarget,
  useUpdateTarget,
} from "@/hooks/useOutreach";
import { TONE_CHIP } from "@/lib/chips";
import { cn } from "@/lib/utils";

interface Props {
  target: OutreachTarget | null;
  onClose: () => void;
}

export function TargetDrawer({ target, onClose }: Props) {
  const contactNameId = useId();
  const contactEmailId = useId();
  const languageId = useId();
  const followupId = useId();
  const notesId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [language, setLanguage] = useState<"en" | "hy">("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [followup, setFollowup] = useState("");
  const [activeTab, setActiveTab] = useState("contact");

  const prepare = usePrepareTarget();
  const send = useSendTarget();
  const update = useUpdateTarget();
  const messagesQuery = useOutreachMessages(target?.id ?? null);
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (!target) return;
    setContactEmail(target.contact_email ?? "");
    setContactName(target.contact_name ?? "");
    setLanguage((target.language as "en" | "hy") ?? "en");
    setSubject(target.ai_subject ?? "");
    setBody(target.ai_body ?? "");
    setNotes(target.notes ?? "");
    setFollowup(target.followup_at ? target.followup_at.slice(0, 16) : "");
    setActiveTab(target.ai_subject || target.ai_body ? "email" : "contact");
  }, [target]);

  if (!target) return null;

  const enriched = (target.enriched ?? {}) as Record<string, unknown>;
  const research = (target.research ?? {}) as Record<string, unknown>;
  const website = enriched?.website as string | undefined;
  const mapsUrl = enriched?.maps_url as string | undefined;
  const phone = enriched?.phone as string | undefined;
  const address = enriched?.address as string | undefined;
  const rating = enriched?.rating as number | undefined;
  const hours = (enriched?.hours as string[] | undefined) ?? [];
  const status = outreachStatusDescriptor(target.status);
  const isSending = update.isPending || send.isPending;

  const saveBeforeSend = async () => {
    await update.mutateAsync({
      id: target.id,
      patch: {
        contact_email: contactEmail || null,
        contact_name: contactName || null,
        language,
        ai_subject: subject,
        ai_body: body,
        notes: notes || null,
        followup_at: followup ? new Date(followup).toISOString() : null,
      },
    });
  };

  const handleSend = async () => {
    if (!contactEmail) {
      toast.error("No contact email found", {
        description: "Prepare this target first. Sending cannot continue until a public email is available.",
      });
      return;
    }

    if (!subject || !body) {
      toast.error("Subject and body required");
      return;
    }

    try {
      await saveBeforeSend();
      await send.mutateAsync({ target_id: target.id, to: contactEmail, subject, body });
    } catch {
      // Both mutations report their failure through the shared toast system.
    }
  };

  const handlePrepare = async () => {
    try {
      const result = await prepare.mutateAsync(target.id);
      setContactEmail(result?.contact_email ?? "");
      setContactName(result?.contact_name ?? "");
      setSubject(result?.subject ?? "");
      setBody(result?.body ?? "");
      setActiveTab("email");
    } catch {
      // The mutation reports the failure and the drawer keeps the current draft intact.
    }
  };

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border px-4 pb-4 pr-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-5 sm:pr-16">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="break-words font-display text-xl tracking-extra-tight">
                {target.name}
              </SheetTitle>
              <SheetDescription className="mt-1 break-words">
                {[target.city, target.country].filter(Boolean).join(" · ") || "Location not provided"}
              </SheetDescription>
            </div>
            <Badge variant="outline" className={cn("mt-0.5 shrink-0", status.className)}>
              {status.label}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5">
            <section aria-labelledby={`prepare-${target.id}`} className="rounded-lg border border-border bg-surface-1 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 id={`prepare-${target.id}`} className="font-semibold text-foreground">
                    Prepare the next step
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Searches public venue sources, refreshes contact data, and creates an editable email draft.
                  </p>
                </div>
                <Button
                  onClick={handlePrepare}
                  disabled={prepare.isPending}
                  className="shrink-0 sm:self-start"
                >
                  <SearchCheck aria-hidden="true" />
                  {prepare.isPending ? "Preparing…" : "Prepare outreach"}
                </Button>
              </div>
              {prepare.isError && prepare.variables === target.id && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle aria-hidden="true" className="h-4 w-4" />
                  <AlertDescription>
                    Preparation did not complete. The existing contact data and draft are still shown below.
                  </AlertDescription>
                </Alert>
              )}
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList aria-label="Outreach target details" className="w-full">
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="data">Research</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="log">Activity ({messages.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="mt-4 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={contactNameId}>Public contact name</Label>
                    <Input
                      id={contactNameId}
                      value={contactName}
                      placeholder="Not found yet"
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={languageId}>Email language</Label>
                    <Select
                      value={language}
                      onValueChange={(value) => setLanguage(value as "en" | "hy")}
                      disabled
                    >
                      <SelectTrigger id={languageId} aria-label="Detected email language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hy">Armenian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={contactEmailId}>Public contact email</Label>
                  <Input
                    id={contactEmailId}
                    type="email"
                    value={contactEmail}
                    placeholder="Not found yet"
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <AlternativeChannels
                  enriched={enriched}
                  research={research}
                  hasEmail={Boolean(contactEmail)}
                  status={target.status}
                />

                <div className="space-y-1.5">
                  <Label htmlFor={followupId} className="flex items-center gap-1.5">
                    <Calendar aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    Manual follow-up reminder
                  </Label>
                  <Input
                    id={followupId}
                    type="datetime-local"
                    value={followup}
                    onChange={(event) => setFollowup(event.target.value)}
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    This is a reminder only. Nothing sends automatically.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={notesId}>Internal notes</Label>
                  <Textarea
                    id={notesId}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="resize-y"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Reminder and note changes are saved with the draft when an email is sent.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="data" className="mt-4 space-y-4 text-sm">
                <div className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
                  {address && (
                    <DataRow icon={<MapPin aria-hidden="true" />} label="Address" value={address} />
                  )}
                  {phone && (
                    <DataRow
                      icon={<Phone aria-hidden="true" />}
                      label="Phone"
                      value={
                        <a href={`tel:${phone}`} className="break-all font-medium text-primary hover:underline">
                          {phone}
                        </a>
                      }
                    />
                  )}
                  {website && (
                    <DataRow
                      icon={<Globe aria-hidden="true" />}
                      label="Website"
                      value={
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-start gap-1 font-medium text-primary hover:underline"
                        >
                          <span className="break-all">{website}</span>
                          <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        </a>
                      }
                    />
                  )}
                  {mapsUrl && (
                    <DataRow
                      icon={<MapPin aria-hidden="true" />}
                      label="Map listing"
                      value={
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Open map listing
                          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                        </a>
                      }
                    />
                  )}
                  {typeof rating === "number" && (
                    <DataRow
                      icon={<Star aria-hidden="true" />}
                      label="Public rating"
                      value={`${rating} (${enriched?.review_count ?? 0} reviews)`}
                    />
                  )}
                  {hours.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground">Public hours</p>
                      <ul className="mt-1.5 space-y-1 text-sm leading-5 text-foreground">
                        {hours.map((hour, index) => (
                          <li key={`${hour}-${index}`} className="break-words">{hour}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!address && !phone && !website && !mapsUrl && typeof rating !== "number" && hours.length === 0 && (
                    <CompactEmptyState
                      title="No public venue data yet"
                      description="Prepare outreach to search available venue sources."
                    />
                  )}
                </div>

                {Object.keys(research).length > 0 && (
                  <section aria-labelledby={`research-${target.id}`} className="space-y-3">
                    <Separator />
                    <h3 id={`research-${target.id}`} className="font-semibold text-foreground">
                      Research notes
                    </h3>
                    {research.summary != null && (
                      <p className="leading-6 text-foreground">{String(research.summary)}</p>
                    )}
                    {research.unique_angle != null && (
                      <blockquote className="border-l-2 border-primary pl-3 leading-6 text-muted-foreground">
                        {String(research.unique_angle)}
                      </blockquote>
                    )}
                    {Array.isArray(research.sports) && research.sports.length > 0 && (
                      <div className="flex flex-wrap gap-1.5" aria-label="Venue sports">
                        {(research.sports as string[]).map((sport) => (
                          <Badge key={sport} variant="secondary" className="break-words">
                            {sport}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </TabsContent>

              <TabsContent value="email" className="mt-4 space-y-4">
                {!contactEmail ? (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" className="h-4 w-4" />
                    <p className="mb-1 font-semibold leading-5 text-foreground">Email unavailable</p>
                    <AlertDescription>
                      Sending is blocked until preparation finds a public contact email.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Info aria-hidden="true" className="h-4 w-4" />
                    <p className="mb-1 font-semibold leading-5 text-foreground">Recipient</p>
                    <AlertDescription className="break-all text-foreground">
                      {contactEmail}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor={subjectId}>Subject</Label>
                  <Input
                    id={subjectId}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={bodyId}>Email body</Label>
                  <Textarea
                    id={bodyId}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={14}
                    className="resize-y text-sm leading-6"
                  />
                </div>

                {((send.isError && send.variables?.target_id === target.id) ||
                  (update.isError && update.variables?.id === target.id)) && (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" className="h-4 w-4" />
                    <AlertDescription>
                      The email was not confirmed as sent. Review the draft and try again.
                    </AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleSend} disabled={isSending} className="w-full">
                  <Send aria-hidden="true" />
                  {isSending ? "Sending…" : "Send email"}
                </Button>
                <p className="break-words text-xs leading-5 text-muted-foreground">
                  From Avag at Sportsbnb. Replies are directed to the Sportsbnb support address.
                </p>
              </TabsContent>

              <TabsContent value="log" className="mt-4">
                {messagesQuery.isLoading ? (
                  <div className="space-y-3" role="status" aria-label="Loading outreach activity">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-28" />
                    ))}
                  </div>
                ) : messagesQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" className="h-4 w-4" />
                    <p className="mb-1 font-semibold leading-5 text-foreground">Activity unavailable</p>
                    <AlertDescription>
                      Message history could not be loaded. No delivery state has been inferred.
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => messagesQuery.refetch()}
                        disabled={messagesQuery.isFetching}
                      >
                        {messagesQuery.isFetching ? "Retrying…" : "Try again"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : messages.length === 0 ? (
                  <CompactEmptyState
                    title="No outreach activity yet"
                    description="Sent and received messages will appear here in chronological order."
                  />
                ) : (
                  <ol className="space-y-3" aria-label="Outreach message history">
                    {messages.map((message) => (
                      <li key={message.id} className="rounded-lg border border-border bg-surface-1 p-4 text-sm">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <span className="flex min-w-0 items-start gap-1.5">
                            <Mail aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span className="break-all">
                              {message.direction === "outbound"
                                ? `To ${message.to_email || "unknown recipient"}`
                                : `From ${message.from_email || "unknown sender"}`}
                            </span>
                          </span>
                          <time dateTime={message.sent_at} className="shrink-0">
                            {format(new Date(message.sent_at), "MMM d, HH:mm")}
                          </time>
                        </div>
                        {message.subject && (
                          <p className="mt-2 break-words font-semibold text-foreground">{message.subject}</p>
                        )}
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                          {message.body}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm leading-5 text-foreground">{value}</div>
      </div>
    </div>
  );
}

function CompactEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

function AlternativeChannels({
  enriched,
  research,
  hasEmail,
  status,
}: {
  enriched: Record<string, unknown>;
  research: Record<string, unknown>;
  hasEmail: boolean;
  status: string;
}) {
  const phones = new Set<string>();
  if (enriched?.phone) phones.add(String(enriched.phone));
  (research?.candidate_phones as string[] | undefined)?.forEach((phone) => phones.add(phone));
  const socials = (research?.socials as Record<string, string> | undefined) ?? {};
  const contactFormUrl = research?.contact_form_url as string | undefined;
  const hasAny = phones.size > 0 || Object.keys(socials).length > 0 || Boolean(contactFormUrl);

  if (hasEmail && !hasAny) return null;

  return (
    <section aria-labelledby="alternative-channels-heading" className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="alternative-channels-heading" className="font-semibold text-foreground">
          Other public channels
        </h3>
        {status === "unreachable" && (
          <Badge variant="outline" className={TONE_CHIP.danger}>Unreachable</Badge>
        )}
      </div>

      {!hasAny ? (
        <p className="text-sm leading-6 text-muted-foreground">
          No public phone, social profile, or contact form was found. This target remains available for manual review.
        </p>
      ) : (
        <div className="space-y-1 text-sm">
          {[...phones].map((phone) => (
            <a
              key={phone}
              href={`tel:${phone}`}
              className="flex min-h-11 items-center gap-2 rounded-md px-2 font-medium text-primary hover:bg-accent hover:underline"
            >
              <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="break-all">{phone}</span>
            </a>
          ))}
          {Object.entries(socials).map(([key, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-md px-2 font-medium text-primary hover:bg-accent hover:underline"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="break-words">{SOCIAL_LABELS[key] ?? key}</span>
            </a>
          ))}
          {contactFormUrl && (
            <a
              href={contactFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-md px-2 font-medium text-primary hover:bg-accent hover:underline"
            >
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
              Public contact form
            </a>
          )}
        </div>
      )}
    </section>
  );
}
