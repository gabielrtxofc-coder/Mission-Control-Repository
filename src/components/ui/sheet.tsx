"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Painel lateral (slide-over) — usado no detalhe da tarefa e menus móveis. */
export function SheetContent({
  className,
  children,
  title,
  side = "right",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  side?: "right" | "left";
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full max-w-xl flex-col bg-surface shadow-pop focus:outline-none",
          side === "right"
            ? "right-0 border-l border-border-strong animate-slide-in-right"
            : "left-0 border-r border-border-strong",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        <button
          type="button"
          onClick={() => {
            const closeEvent = new KeyboardEvent("keydown", { key: "Escape" });
            document.dispatchEvent(closeEvent);
          }}
          className="sr-only"
        >
          Fechar
        </button>
        <DialogPrimitive.Close
          className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
        <div className="flex h-full flex-col overflow-hidden">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
