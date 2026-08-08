import { Gift, Copy, Share2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReferrals } from "@/hooks/useReferrals";

const ReferralCard = () => {
  const { referralCode, totalCredits, isLoading, generateCode, copyCode, shareLink } = useReferrals();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center" role="status" aria-label="Loading your referrals">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle as="h3" className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
              Invite a friend
            </CardTitle>
            {/* No credit is promised here any more. referral_credits has no
                writer anywhere — not in app code, not in an edge function, not
                in a migration trigger — so the ֏2,000 this used to advertise
                could never be granted. Offering money the platform cannot pay
                is worse than the unevidenced stats already removed elsewhere,
                because a user can act on it by sharing the code widely. The
                badge above still appears the moment real credits exist. */}
            <CardDescription>
              Share your code so friends can find their court faster.
            </CardDescription>
          </div>
          {totalCredits > 0 && (
            <Badge variant="default" className="text-sm">
              ֏{totalCredits.toLocaleString()} credit
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {referralCode ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 p-3">
              <code className="flex-1 font-mono text-lg font-bold tracking-wider text-foreground">
                {referralCode.code}
              </code>
              <Button variant="ghost" size="icon" onClick={copyCode} aria-label="Copy referral code">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={copyCode}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy code
              </Button>
              <Button variant="default" className="flex-1 gap-2" onClick={shareLink}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share link
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {referralCode.uses_count} {referralCode.uses_count === 1 ? "friend" : "friends"} referred
            </div>
          </>
        ) : (
          <Button onClick={generateCode} className="w-full gap-2">
            <Gift className="h-4 w-4" aria-hidden="true" />
            Generate referral code
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
