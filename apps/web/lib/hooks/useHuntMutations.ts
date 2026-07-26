"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addHunt,
  takeHuntStoreSnapshot,
  restoreHuntStoreSnapshot,
  updateHuntStatus,
  getRegisteredWallets,
  getHuntById,
} from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";
import { queryKeys } from "@/lib/queryKeys";
import { getNotificationPreferences } from "@/lib/notifications/notificationPreferences";

export function useCreateHuntMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hunt: StoredHunt) => {
      addHunt(hunt);
      return hunt;
    },
    onMutate: async (hunt) => {
      const snapshot = takeHuntStoreSnapshot();
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() });
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) => [
        ...existing,
        hunt,
      ]);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() });
    },
  });
}

export function useActivateHuntMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (huntId: number) => {
      updateHuntStatus(huntId, "Active");
      return huntId;
    },
    onMutate: async (huntId) => {
      const snapshot = takeHuntStoreSnapshot();
      await queryClient.cancelQueries({ queryKey: queryKeys.hunts.active() });
      queryClient.setQueryData<StoredHunt[]>(queryKeys.hunts.active(), (existing = []) =>
        existing.map((hunt) => (hunt.id === huntId ? { ...hunt, status: "Active" } : hunt))
      );
      return { snapshot };
    },
    onSuccess: async (huntId) => {
      // Fire hunt_start push to all registered players if they opted in
      try {
        const prefs = getNotificationPreferences();
        if (!prefs.pushEnabled || !prefs.pushHuntStart) return;

        const wallets = getRegisteredWallets(huntId);
        if (wallets.length === 0) return;

        const hunt = getHuntById(huntId);

        await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "hunt_start",
            walletAddresses: wallets,
            context: {
              huntId,
              huntName: hunt?.title ?? `Hunt #${huntId}`,
            },
          }),
        });
      } catch {
        // Push failure is non-fatal — hunt activation already succeeded
      }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreHuntStoreSnapshot(context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hunts.active() });
    },
  });
}
 