import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Flag, 
  Ban, 
  MoreVertical,
  Plus,
  Trash2,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatMessages,
  useSendMessage,
  useReportMessage,
  useUpdateLastRead,
  useBlockUser,
} from "@/hooks/useChat";
import {
  useOwnerReplyTemplates,
  useCreateReplyTemplate,
  useDeleteReplyTemplate,
} from "@/hooks/useReplyTemplates";
import { ChatInput } from "@/components/chat/ChatInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OwnerChatViewProps {
  roomId: string;
  venueName: string;
  customerId: string;
}

export const OwnerChatView = ({ roomId, venueName, customerId }: OwnerChatViewProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateMessage, setNewTemplateMessage] = useState("");

  const { data: messages, isLoading } = useChatMessages(roomId);
  const { data: templates = [] } = useOwnerReplyTemplates();
  const sendMessage = useSendMessage();
  const reportMessage = useReportMessage();
  const updateLastRead = useUpdateLastRead();
  const blockUser = useBlockUser();
  const createTemplate = useCreateReplyTemplate();
  const deleteTemplate = useDeleteReplyTemplate();

  // Update last read and scroll to bottom
  useEffect(() => {
    if (roomId && user?.id && messages?.length) {
      updateLastRead.mutate(roomId);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [roomId, user?.id, messages?.length]);

  const handleSend = (message: string) => {
    sendMessage.mutate(
      { roomId, message },
      {
        onError: () => toast.error("Failed to send message"),
      }
    );
  };

  const handleQuickReply = (message: string) => {
    handleSend(message);
  };

  const handleReport = (messageId: string) => {
    reportMessage.mutate(
      { messageId, roomId },
      {
        onSuccess: () => toast.success("Message reported"),
        onError: () => toast.error("Failed to report message"),
      }
    );
  };

  const handleBlock = () => {
    blockUser.mutate(
      { roomId, blockedId: customerId, reason: "Owner initiated block" },
      {
        onSuccess: () => toast.success("User blocked"),
        onError: () => toast.error("Failed to block user"),
      }
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
      }
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate.mutate(templateId, {
      onSuccess: () => toast.success("Template deleted"),
      onError: () => toast.error("Failed to delete template"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "justify-end"}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            🏟️ {venueName}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Reply Templates */}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Zap className="h-4 w-4" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Reply Templates</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Existing templates */}
                {templates.length > 0 ? (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div 
                        key={template.id} 
                        className="flex items-start justify-between p-3 rounded-lg border bg-muted/50"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            handleQuickReply(template.message_text);
                            setShowTemplateDialog(false);
                          }}
                        >
                          <p className="font-medium text-sm">{template.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.message_text}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No templates yet. Create your first one!
                  </p>
                )}

                {/* Create new template */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium">Create new template</p>
                  <Input
                    placeholder="Template name (e.g., 'Pricing')"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Template message..."
                    value={newTemplateMessage}
                    onChange={(e) => setNewTemplateMessage(e.target.value)}
                  />
                  <Button 
                    onClick={handleCreateTemplate} 
                    disabled={!newTemplateTitle.trim() || !newTemplateMessage.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                <Ban className="h-4 w-4 mr-2" />
                Block user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.sender_id === user?.id ? "justify-end" : "justify-start"
                )}
              >
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {message.sender?.full_name?.[0] || "C"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    message.sender_id === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.message_type === "system" && "bg-transparent text-muted-foreground text-center text-xs italic w-full max-w-full"
                  )}
                >
                  {message.message_type !== "system" && message.sender_id !== user?.id && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.sender?.full_name || "Customer"}
                    </p>
                  )}
                  <p className="break-words">{message.message_text}</p>
                  
                  {message.sender_id !== user?.id && message.message_type !== "system" && !message.is_reported && (
                    <button
                      onClick={() => handleReport(message.id)}
                      className="mt-1 text-xs opacity-50 hover:opacity-100 flex items-center gap-1"
                    >
                      <Flag className="h-3 w-3" />
                      Report
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Reply Buttons */}
      {templates.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {templates.slice(0, 4).map((template) => (
              <Button
                key={template.id}
                variant="ghost"
                size="sm"
                className="gap-1 text-xs shrink-0 h-7"
                onClick={() => handleQuickReply(template.message_text)}
              >
                <Zap className="h-3 w-3" />
                {template.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  );
};
