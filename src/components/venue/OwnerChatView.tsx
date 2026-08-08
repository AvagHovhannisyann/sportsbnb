import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Ban, Building2, MessageSquare, MoreVertical, Plus, Trash2, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import {
  useBlockUser,
  useChatMessages,
  useReportMessage,
  useSendMessage,
  useUpdateLastRead,
} from "@/hooks/useChat";
import {
  useCreateReplyTemplate,
  useDeleteReplyTemplate,
  useOwnerReplyTemplates,
} from "@/hooks/useReplyTemplates";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";

interface OwnerChatViewProps {
  roomId: string;
  venueName: string;
  customerId: string;
}

export const OwnerChatView = ({ roomId, venueName, customerId }: OwnerChatViewProps) => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateMessage, setNewTemplateMessage] = useState("");

  const {
    data: messages,
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
    isFetching: messagesFetching,
  } = useChatMessages(roomId);
  const {
    data: templates = [],
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
    isFetching: templatesFetching,
  } = useOwnerReplyTemplates();
  const sendMessage = useSendMessage();
  const reportMessage = useReportMessage();
  const { mutate: updateLastRead } = useUpdateLastRead();
  const blockUser = useBlockUser();
  const createTemplate = useCreateReplyTemplate();
  const deleteTemplate = useDeleteReplyTemplate();

  useEffect(() => {
    if (roomId && user?.id && messages?.length) {
      updateLastRead(roomId);
      messagesEndRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [roomId, user?.id, messages?.length, prefersReducedMotion, updateLastRead]);

  const handleSend = (message: string) => {
    sendMessage.mutate(
      { roomId, message },
      { onError: () => toast.error("Failed to send message") },
    );
  };

  const handleReport = (messageId: string) => {
    reportMessage.mutate(
      { messageId, roomId },
      {
        onSuccess: () => toast.success("Message reported"),
        onError: () => toast.error("Failed to report message"),
      },
    );
  };

  const handleBlock = () => {
    blockUser.mutate(
      { roomId, blockedId: customerId, reason: "Owner initiated block" },
      {
        onSuccess: () => toast.success("User blocked"),
        onError: () => toast.error("Failed to block user"),
      },
    );
  };

  const handleCreateTemplate = () => {
    if (!newTemplateTitle.trim() || !newTemplateMessage.trim()) return;

    createTemplate.mutate(
      { title: newTemplateTitle, messageText: newTemplateMessage },
      {
        onSuccess: () => {
          toast.success("Template created");
          setNewTemplateTitle("");
          setNewTemplateMessage("");
          setShowTemplateDialog(false);
        },
        onError: () => toast.error("Failed to create template"),
      },
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate.mutate(templateId, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete template"),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <Badge variant="secondary" className="min-w-0 justify-self-start">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate">{venueName}</span>
        </Badge>

        <div className="flex items-center gap-1">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" aria-label="Manage quick reply templates">
                <Zap aria-hidden="true" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Quick reply templates</DialogTitle>
                <DialogDescription>
                  Send a saved reply immediately or create a reusable response.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {templatesLoading ? (
                  <div className="space-y-2" role="status" aria-label="Loading reply templates">
                    {[...Array(2)].map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : templatesError ? (
                  <ErrorPanel
                    what="your reply templates"
                    onRetry={() => refetchTemplates()}
                    isRetrying={templatesFetching}
                    className="py-8"
                  />
                ) : templates.length > 0 ? (
                  <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Saved replies">
                    {templates.map((template) => (
                      <li key={template.id} className="flex min-w-0 items-stretch gap-1 p-2">
                        <button
                          type="button"
                          className="focus-ring min-h-11 min-w-0 flex-1 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                          aria-label={`Send saved reply: ${template.title}`}
                          onClick={() => {
                            handleSend(template.message_text);
                            setShowTemplateDialog(false);
                          }}
                        >
                          <span className="block truncate text-sm font-medium text-foreground">
                            {template.title}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            {template.message_text}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive"
                          aria-label={`Delete template ${template.title}`}
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={deleteTemplate.isPending}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                    <p className="font-medium text-foreground">No templates yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Save a reply you use often to answer faster.
                    </p>
                  </div>
                )}

                <form
                  className="space-y-3 border-t border-border pt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleCreateTemplate();
                  }}
                >
                  <p className="text-sm font-semibold text-foreground">Create a template</p>
                  <div className="space-y-1.5">
                    <label htmlFor={titleId} className="text-sm font-medium text-foreground">
                      Template name
                    </label>
                    <Input
                      id={titleId}
                      placeholder="For example, Pricing"
                      value={newTemplateTitle}
                      onChange={(event) => setNewTemplateTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={messageId} className="text-sm font-medium text-foreground">
                      Message
                    </label>
                    <Input
                      id={messageId}
                      placeholder="Write the saved reply"
                      value={newTemplateMessage}
                      onChange={(event) => setNewTemplateMessage(event.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      !newTemplateTitle.trim() ||
                      !newTemplateMessage.trim() ||
                      createTemplate.isPending
                    }
                    className="w-full"
                  >
                    <Plus aria-hidden="true" />
                    {createTemplate.isPending ? "Creating…" : "Create template"}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Conversation actions">
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleBlock}
                disabled={!customerId || blockUser.isPending}
                className="text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                Block user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className="flex-1 space-y-3 overflow-y-auto bg-surface-1/45 p-4 sm:p-5"
        role="log"
        aria-label={`Conversation about ${venueName}`}
        aria-live="polite"
      >
        {messagesLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading conversation">
            {[...Array(4)].map((_, index) => (
              <div key={index} className={index % 2 ? "flex justify-end" : "flex gap-2"}>
                {index % 2 === 0 && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
                <Skeleton className="h-14 w-[min(70%,15rem)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : messagesError ? (
          <ErrorPanel
            what="these messages"
            onRetry={() => refetchMessages()}
            isRetrying={messagesFetching}
            className="flex min-h-full flex-col justify-center"
          />
        ) : messages?.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-foreground-soft">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-medium text-foreground">No messages yet</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Reply when you are ready to help this customer.
            </p>
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                onReport={message.is_reported ? undefined : handleReport}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {templates.length > 0 && !templatesError && (
        <div className="border-t border-border bg-background px-3 py-2 sm:px-4">
          <div className="flex gap-2 overflow-x-auto" aria-label="Saved quick replies">
            {templates.slice(0, 4).map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="ghost"
                className="shrink-0"
                aria-label={`Send saved reply: ${template.title}`}
                onClick={() => handleSend(template.message_text)}
                disabled={sendMessage.isPending}
              >
                <Zap aria-hidden="true" />
                {template.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  );
};
