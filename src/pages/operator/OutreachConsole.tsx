import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Plus,
  Search,
  SearchCheck,
  SearchX,
  Trash2,
} from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import { OperationsLayout } from "@/components/admin/OperationsLayout";
import { PasteImportDialog } from "@/components/operator/outreach/PasteImportDialog";
import { TargetDrawer } from "@/components/operator/outreach/TargetDrawer";
import {
  OUTREACH_STATUS_OPTIONS,
  outreachStatusDescriptor,
  type OutreachStatus,
} from "@/components/operator/outreach/status";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useDeleteTarget,
  useOutreachTargets,
  usePrepareTarget,
  type OutreachTarget,
} from "@/hooks/useOutreach";
import { TONE_CHIP } from "@/lib/chips";
import { cn } from "@/lib/utils";

type StatusFilter = OutreachStatus | "all";

const PREPARABLE_STATUSES: OutreachStatus[] = [
  "new",
  "enriched",
  "researched",
  "unreachable",
];

const EMPTY_TARGETS: OutreachTarget[] = [];

export default function OutreachConsole() {
  const targetsQuery = useOutreachTargets();
  const targets = targetsQuery.data ?? EMPTY_TARGETS;
  const prepare = usePrepareTarget();
  const del = useDeleteTarget();
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<OutreachTarget | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return targets.filter((target) => {
      if (statusFilter !== "all" && target.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      return [target.name, target.city, target.country, target.contact_email]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [targets, query, statusFilter]);

  const stats = useMemo(() => {
    const summary = {
      total: targets.length,
      reached: 0,
      replied: 0,
      onboarded: 0,
      unreachable: 0,
      followupsDue: 0,
    };
    const now = Date.now();

    targets.forEach((target) => {
      if (["contacted", "replied", "onboarded"].includes(target.status)) summary.reached++;
      if (target.status === "replied") summary.replied++;
      if (target.status === "onboarded") summary.onboarded++;
      if (target.status === "unreachable") summary.unreachable++;
      if (target.followup_at && new Date(target.followup_at).getTime() <= now) {
        summary.followupsDue++;
      }
    });

    return summary;
  }, [targets]);

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selected?.id) ?? selected,
    [targets, selected],
  );

  const preparableCount = targets.filter((target) =>
    PREPARABLE_STATUSES.includes(target.status),
  ).length;

  const prepareAllNew = async () => {
    const preparable = targets.filter((target) =>
      PREPARABLE_STATUSES.includes(target.status),
    );

    for (const target of preparable) {
      try {
        await prepare.mutateAsync(target.id);
      } catch {
        // Each failure is reported by the mutation; continue with the remaining targets.
      }
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  return (
    <>
      <SEOHead title="Venue Outreach · Sportsbnb" description="Admin outreach workspace" />
      <OperationsLayout
        title="Venue outreach"
        subtitle="Research public venue contacts, prepare drafts, and track follow-ups."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 lg:min-h-10"
              onClick={prepareAllNew}
              disabled={
                prepare.isPending ||
                preparableCount === 0 ||
                targetsQuery.isLoading ||
                targetsQuery.isError
              }
            >
              <SearchCheck aria-hidden="true" />
              {prepare.isPending ? "Preparing…" : `Prepare new${preparableCount ? ` (${preparableCount})` : ""}`}
            </Button>
            <Button size="sm" className="min-h-11 lg:min-h-10" onClick={() => setImportOpen(true)}>
              <Plus aria-hidden="true" />
              Import venues
            </Button>
          </>
        }
      >
        <div className="space-y-5 sm:space-y-6">
          <section aria-labelledby="outreach-summary-heading">
            <div className="mb-3">
              <h2
                id="outreach-summary-heading"
                className="font-display text-xl font-semibold tracking-extra-tight text-foreground"
              >
                Pipeline summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current contact coverage and follow-up pressure.
              </p>
            </div>

            {targetsQuery.isLoading ? (
              <div
                className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6"
                role="status"
                aria-label="Loading outreach summary"
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="bg-card p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-2 h-7 w-12" />
                  </div>
                ))}
              </div>
            ) : targetsQuery.isError ? null : (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
                <PipelineMetric
                  label="Total targets"
                  value={stats.total}
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                />
                <PipelineMetric label="Reached" value={stats.reached} />
                <PipelineMetric
                  label="Replied"
                  value={stats.replied}
                  active={statusFilter === "replied"}
                  onClick={() => setStatusFilter("replied")}
                />
                <PipelineMetric
                  label="Onboarded"
                  value={stats.onboarded}
                  active={statusFilter === "onboarded"}
                  onClick={() => setStatusFilter("onboarded")}
                />
                <PipelineMetric
                  label="Unreachable"
                  value={stats.unreachable}
                  active={statusFilter === "unreachable"}
                  onClick={() => setStatusFilter("unreachable")}
                />
                <PipelineMetric
                  label="Follow-ups due"
                  value={stats.followupsDue}
                  tone={stats.followupsDue > 0 ? "warning" : "neutral"}
                />
              </div>
            )}
          </section>

          <Card>
            <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <CardTitle as="h2" className="text-lg">
                    Venue pipeline
                  </CardTitle>
                  <CardDescription className="mt-1" aria-live="polite">
                    {targetsQuery.isLoading
                      ? "Loading targets…"
                      : targetsQuery.isError
                        ? "Target count unavailable."
                        : `${filtered.length} of ${targets.length} target${targets.length === 1 ? "" : "s"} shown.`}
                  </CardDescription>
                </div>

                {!targetsQuery.isError && targets.length > 0 && (
                  <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] lg:w-auto lg:grid-cols-[20rem_12rem]">
                    <div className="space-y-1.5">
                      <Label htmlFor="outreach-search" className="sr-only">
                        Search venue targets
                      </Label>
                      <div className="relative">
                        <Search
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          id="outreach-search"
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search venue, city, or email"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="outreach-status" className="sr-only">
                        Filter by status
                      </Label>
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                      >
                        <SelectTrigger id="outreach-status" aria-label="Filter targets by status">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {OUTREACH_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {targetsQuery.isLoading ? (
                <TargetsLoading />
              ) : targetsQuery.isError ? (
                <ErrorPanel
                  what="outreach targets"
                  description="No target or pipeline state has been inferred from the failed request."
                  onRetry={() => targetsQuery.refetch()}
                  isRetrying={targetsQuery.isFetching}
                  className="py-12"
                />
              ) : targets.length === 0 ? (
                <StatusPanel
                  icon={Building2}
                  title="No venue targets yet"
                  description="Import a plain-text venue list to start a reviewable outreach pipeline."
                  className="py-12"
                >
                  <Button onClick={() => setImportOpen(true)}>
                    <Plus aria-hidden="true" />
                    Import first list
                  </Button>
                </StatusPanel>
              ) : filtered.length === 0 ? (
                <StatusPanel
                  icon={SearchX}
                  title="No targets match these filters"
                  description="Try another search term or return to all statuses."
                  className="py-12"
                >
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </StatusPanel>
              ) : (
                <TargetsResults
                  targets={filtered}
                  onOpen={setSelected}
                  onDelete={(id) => del.mutate(id)}
                  deletePending={del.isPending}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <PasteImportDialog open={importOpen} onOpenChange={setImportOpen} />
        <TargetDrawer target={selectedTarget} onClose={() => setSelected(null)} />
      </OperationsLayout>
    </>
  );
}

function PipelineMetric({
  label,
  value,
  onClick,
  active = false,
  tone = "neutral",
}: {
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
  tone?: "neutral" | "warning";
}) {
  const content = (
    <>
      <span className="block text-xs font-medium leading-4 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "stat-numeral mt-1 block text-2xl font-semibold leading-7 text-foreground",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </span>
    </>
  );

  if (!onClick) {
    return <div className="bg-card p-4">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-20 bg-card p-4 text-left outline-none transition-colors duration-150 hover:bg-accent/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none",
        active && "bg-primary-soft",
      )}
    >
      {content}
    </button>
  );
}

function TargetsLoading() {
  return (
    <div className="space-y-3 border-t border-border p-4 sm:p-5" role="status" aria-label="Loading outreach targets">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}

function TargetsResults({
  targets,
  onOpen,
  onDelete,
  deletePending,
}: {
  targets: OutreachTarget[];
  onOpen: (target: OutreachTarget) => void;
  onDelete: (id: string) => void;
  deletePending: boolean;
}) {
  return (
    <>
      <ul className="space-y-3 border-t border-border p-4 lg:hidden" aria-label="Outreach targets">
        {targets.map((target) => {
          const status = outreachStatusDescriptor(target.status);
          const overdue = isFollowupOverdue(target.followup_at);

          return (
            <li key={target.id} className="rounded-lg border border-border bg-surface-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold leading-5 text-foreground">{target.name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-words">
                      {[target.city, target.country].filter(Boolean).join(", ") || "Location not provided"}
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0", status.className)}>
                  {status.label}
                </Badge>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Contact</dt>
                  <dd className="mt-0.5 break-all text-foreground">
                    {target.contact_email || "Not found"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last contacted</dt>
                  <dd className="mt-0.5 text-foreground">
                    {lastContactedLabel(target.last_contacted_at)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Follow-up</dt>
                  <dd className="mt-0.5">
                    <FollowupValue value={target.followup_at} overdue={overdue} />
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <Button className="min-h-11 flex-1" size="sm" variant="outline" onClick={() => onOpen(target)}>
                  Review target
                </Button>
                <DeleteTargetDialog
                  target={target}
                  onDelete={() => onDelete(target.id)}
                  pending={deletePending}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden border-t border-border lg:block">
        <Table>
          <caption className="sr-only">
            Outreach targets with contact, status, contact history, follow-up, and available actions.
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Venue</TableHead>
              <TableHead className="hidden 2xl:table-cell">Location</TableHead>
              <TableHead className="min-w-52">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden 2xl:table-cell">Last contacted</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target) => {
              const status = outreachStatusDescriptor(target.status);
              const overdue = isFollowupOverdue(target.followup_at);
              const hasWebsite = Boolean((target.enriched as { website?: string })?.website);

              return (
                <TableRow key={target.id}>
                  <TableCell className="max-w-64">
                    <button
                      type="button"
                      onClick={() => onOpen(target)}
                      className="group flex min-h-11 max-w-full flex-col justify-center rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground group-hover:text-primary">
                        <span className="break-words">{target.name}</span>
                        {hasWebsite && (
                          <Globe2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </span>
                      {hasWebsite && <span className="sr-only">Website found</span>}
                      <span className="mt-1 flex items-start gap-1.5 text-xs font-normal text-muted-foreground 2xl:hidden">
                        <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">
                          {[target.city, target.country].filter(Boolean).join(", ") || "Location not provided"}
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="hidden max-w-48 text-sm text-muted-foreground 2xl:table-cell">
                    <span className="break-words">
                      {[target.city, target.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-52 max-w-64 text-sm">
                    {target.contact_email ? (
                      <span className="flex min-w-0 items-start gap-1.5">
                        <Mail aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate" title={target.contact_email}>
                          {target.contact_email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not found</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground 2xl:table-cell">
                    {lastContactedLabel(target.last_contacted_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <FollowupValue value={target.followup_at} overdue={overdue} />
                    <span className="mt-1.5 block whitespace-nowrap text-muted-foreground 2xl:hidden">
                      Last contacted: {lastContactedLabel(target.last_contacted_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onOpen(target)}>
                        Review
                      </Button>
                      <DeleteTargetDialog
                        target={target}
                        onDelete={() => onDelete(target.id)}
                        pending={deletePending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function FollowupValue({ value, overdue }: { value: string | null; overdue: boolean }) {
  if (!value) return <span className="text-muted-foreground">Not scheduled</span>;

  const date = format(new Date(value), "MMM d, HH:mm");

  if (!overdue) return <span className="text-muted-foreground">{date}</span>;

  return (
    <Badge variant="outline" className={cn("gap-1", TONE_CHIP.warning)}>
      <Clock3 aria-hidden="true" className="h-3 w-3" />
      Due · {date}
    </Badge>
  );
}

function DeleteTargetDialog({
  target,
  onDelete,
  pending,
}: {
  target: OutreachTarget;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete outreach target ${target.name}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete outreach target</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            Delete &ldquo;{target.name}&rdquo;? Its contact history and follow-up will be removed,
            and this action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep target</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={pending}
            className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
          >
            {pending ? "Deleting…" : "Delete target"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function isFollowupOverdue(value: string | null) {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

function lastContactedLabel(value: string | null) {
  return value
    ? formatDistanceToNow(new Date(value), { addSuffix: true })
    : "Never";
}
