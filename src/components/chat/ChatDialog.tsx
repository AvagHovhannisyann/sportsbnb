import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatRoom } from "./ChatRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatRoom, useGetOrCreateChatRoom, useAddChatMember } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "game" | "booking" | "venue";
  referenceId: string;
  title: string;
  userRole?: "host" | "player" | "owner" | "customer";
}

export const ChatDialog = ({
  open,
  onOpenChange,
  type,
  referenceId,
  title,
  userRole = "player",
}: ChatDialogProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const { data: existingRoom, isLoading: isLoadingRoom } = useChatRoom(type, referenceId);
  const getOrCreateRoom = useGetOrCreateChatRoom();
  const addMember = useAddChatMember();

  // Initialize or join chat room when dialog opens
  useEffect(() => {
    if (!open || !user?.id || isInitializing) return;

    const initChat = async () => {
      setIsInitializing(true);
      try {
        if (existingRoom) {
          setRoomId(existingRoom.id);
          // Ensure user is a member
          await addMember.mutateAsync({
            roomId: existingRoom.id,
            userId: user.id,
            role: userRole,
          });
        } else {
          // Create room and add user as member
          const newRoomId = await getOrCreateRoom.mutateAsync({
            type,
            referenceId,
          });
          setRoomId(newRoomId);
          await addMember.mutateAsync({
            roomId: newRoomId,
            userId: user.id,
            role: userRole,
          });
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (!isLoadingRoom) {
      initChat();
    }
  }, [open, user?.id, existingRoom, isLoadingRoom, type, referenceId, userRole]);

  const content = (
    <>
      {isInitializing || isLoadingRoom || !roomId ? (
        <div className="flex items-center justify-center h-[400px]" role="status" aria-label="Loading messages">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="h-[60vh] md:h-[500px]">
          <ChatRoom roomId={roomId} />
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
