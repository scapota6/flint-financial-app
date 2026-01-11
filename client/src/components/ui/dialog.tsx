"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

// Portal selectors for Radix UI components that should not trigger dialog dismissal
const RADIX_PORTAL_SELECTORS = [
  '[data-radix-select-content]',
  '[data-radix-dropdown-menu-content]',
  '[data-radix-popover-content]',
  '[data-radix-combobox-content]',
  '[data-radix-date-picker-content]',
  '[data-radix-tooltip-content]',
  '[data-dialog-interactive]', // Custom attribute for non-Radix interactive elements
] as const

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onInteractOutside, onPointerDownOutside, ...props }, ref) => {
  const handleInteractOutside = (event: CustomEvent) => {
    // Get the actual target from the original event, not the CustomEvent target
    const originalTarget = event.detail?.originalEvent?.target;
    
    // Type guard - ensure originalTarget is an Element
    if (!originalTarget || !(originalTarget instanceof Element)) {
      onInteractOutside?.(event as any);
      return;
    }
    
    // Check if click is within a Radix portal (Select, Dropdown, Popover, etc.)
    const isInPortal = RADIX_PORTAL_SELECTORS.some(selector => 
      originalTarget.closest(selector)
    );
    
    // Prevent closing if clicking within a portal or interactive element
    if (isInPortal) {
      event.preventDefault();
      return;
    }
    
    // Call consumer's handler if provided
    onInteractOutside?.(event as any);
  };

  const handlePointerDownOutside = (event: CustomEvent) => {
    // Get the actual target from the original event
    const originalTarget = event.detail?.originalEvent?.target;
    
    // Type guard - ensure originalTarget is an Element
    if (!originalTarget || !(originalTarget instanceof Element)) {
      onPointerDownOutside?.(event as any);
      return;
    }
    
    // Same portal check for pointer down events
    const isInPortal = RADIX_PORTAL_SELECTORS.some(selector => 
      originalTarget.closest(selector)
    );
    
    if (isInPortal) {
      event.preventDefault();
      return;
    }
    
    // Call consumer's handler if provided
    onPointerDownOutside?.(event as any);
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200 bg-white border border-gray-200 rounded-xl shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handlePointerDownOutside}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          data-testid="dialog-close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
