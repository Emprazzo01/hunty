import { toast } from "sonner";
import type { LeaderboardRankNotification } from "./types";
import { shouldNotifyForRankChange, getNotificationPreferences } from "./notificationPreferences";

import { saveNotifications } from "./rankTracker";

export function handleRankNotifications(
  notifications: LeaderboardRankNotification[],
  /** Wallet address of the current user — required to send push for overtake events */
  currentWalletAddress?: string
): void {
  if (notifications.length === 0) return;

  const filtered = notifications.filter((n) => {
    const changeMagnitude = Math.abs(n.previousRank - n.currentRank);
    return shouldNotifyForRankChange(n.type, changeMagnitude);
  });

  for (const notification of filtered) {
    showRankToast(notification);
  }

  saveNotifications(notifications);

  // Fire a Web Push for overtake events if the user opted in
  const prefs = getNotificationPreferences();
  if (prefs.pushEnabled && prefs.pushOvertake && currentWalletAddress) {
    const overtakes = filtered.filter((n) => n.type === "overtaken");
    if (overtakes.length > 0) {
      // Use the first overtake for context (the player cares about the most recent)
      const n = overtakes[0];
      sendOvertakePush(currentWalletAddress, n).catch(() => {
        // Non-fatal — toast already shown
      });
    }
  }
}

async function sendOvertakePush(
  walletAddress: string,
  notification: LeaderboardRankNotification
): Promise<void> {
  await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "leaderboard_overtake",
      walletAddresses: [walletAddress],
      context: {
        huntId: notification.huntId,
        huntName: notification.huntTitle,
        overtakerName: notification.overtakenBy ?? "another player",
      },
    }),
  });
}

function showRankToast(notification: LeaderboardRankNotification): void {
  const huntLabel = notification.huntTitle || `Hunt #${notification.huntId}`;

  switch (notification.type) {
    case "rank_improved":
      toast.success(
        `Rank improved in "${huntLabel}"! You moved from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
    case "rank_dropped":
      toast.error(
        `Rank dropped in "${huntLabel}" from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
    case "overtaken":
      toast.warning(
        `You were overtaken by ${notification.overtakenBy || "another player"} in "${huntLabel}"! You are now #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
  }
}
 