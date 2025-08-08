import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect, Fragment as Fragment$1, useCallback, createContext } from "react";
import { cva } from "class-variance-authority";
import { c as cn, B as Button } from "./button-hAi0Fg-Q.js";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Slot } from "@radix-ui/react-slot";
import { XIcon, ChevronRight, Settings, LogOut, Menu, LayoutGrid, Dumbbell, Search, MessageCircle, AlertTriangle, Info, AlertCircle, CheckCircle, X, Smartphone, Download } from "lucide-react";
import { Link, router, usePage } from "@inertiajs/react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { d as DropdownMenuLabel, e as DropdownMenuSeparator, f as DropdownMenuGroup, c as DropdownMenuItem, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent } from "./dropdown-menu-BtKPamvc.js";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { s as settings } from "./index-BAFHCEvX.js";
import { a as logout, d as dashboard } from "./index-CrXrSpq1.js";
import { A as AppLogoIcon } from "./app-logo-icon-wMAVxvx3.js";
import { q as queryParams } from "./index-ID1znBf5.js";
import { toast } from "sonner";
const store = (args, options) => ({
  url: store.url(args, options),
  method: "post"
});
store.definition = {
  methods: ["post"],
  url: "/chat/{session}/message"
};
store.url = (args, options) => {
  if (typeof args === "string" || typeof args === "number") {
    args = { session: args };
  }
  if (typeof args === "object" && !Array.isArray(args) && "id" in args) {
    args = { session: args.id };
  }
  if (Array.isArray(args)) {
    args = {
      session: args[0]
    };
  }
  const parsedArgs = {
    session: typeof args.session === "object" ? args.session.id : args.session
  };
  return store.definition.url.replace("{session}", parsedArgs.session.toString()).replace(/\/+$/, "") + queryParams(options);
};
store.post = (args, options) => ({
  url: store.url(args, options),
  method: "post"
});
const message = {
  store
};
const index$1 = (options) => ({
  url: index$1.url(options),
  method: "get"
});
index$1.definition = {
  methods: ["get", "head"],
  url: "/chat"
};
index$1.url = (options) => {
  return index$1.definition.url + queryParams(options);
};
index$1.get = (options) => ({
  url: index$1.url(options),
  method: "get"
});
index$1.head = (options) => ({
  url: index$1.url(options),
  method: "head"
});
const newMethod = (options) => ({
  url: newMethod.url(options),
  method: "get"
});
newMethod.definition = {
  methods: ["get", "head"],
  url: "/chat/new"
};
newMethod.url = (options) => {
  return newMethod.definition.url + queryParams(options);
};
newMethod.get = (options) => ({
  url: newMethod.url(options),
  method: "get"
});
newMethod.head = (options) => ({
  url: newMethod.url(options),
  method: "head"
});
const show = (args, options) => ({
  url: show.url(args, options),
  method: "get"
});
show.definition = {
  methods: ["get", "head"],
  url: "/chat/{session}"
};
show.url = (args, options) => {
  if (typeof args === "string" || typeof args === "number") {
    args = { session: args };
  }
  if (typeof args === "object" && !Array.isArray(args) && "id" in args) {
    args = { session: args.id };
  }
  if (Array.isArray(args)) {
    args = {
      session: args[0]
    };
  }
  const parsedArgs = {
    session: typeof args.session === "object" ? args.session.id : args.session
  };
  return show.definition.url.replace("{session}", parsedArgs.session.toString()).replace(/\/+$/, "") + queryParams(options);
};
show.get = (args, options) => ({
  url: show.url(args, options),
  method: "get"
});
show.head = (args, options) => ({
  url: show.url(args, options),
  method: "head"
});
const stream = (args, options) => ({
  url: stream.url(args, options),
  method: "get"
});
stream.definition = {
  methods: ["get", "head"],
  url: "/chat/{session}/stream"
};
stream.url = (args, options) => {
  if (typeof args === "string" || typeof args === "number") {
    args = { session: args };
  }
  if (Array.isArray(args)) {
    args = {
      session: args[0]
    };
  }
  const parsedArgs = {
    session: args.session
  };
  return stream.definition.url.replace("{session}", parsedArgs.session.toString()).replace(/\/+$/, "") + queryParams(options);
};
stream.get = (args, options) => ({
  url: stream.url(args, options),
  method: "get"
});
stream.head = (args, options) => ({
  url: stream.url(args, options),
  method: "head"
});
const answer = (args, options) => ({
  url: answer.url(args, options),
  method: "get"
});
answer.definition = {
  methods: ["get", "head"],
  url: "/chat-message/{chatMessage}/answer"
};
answer.url = (args, options) => {
  if (typeof args === "string" || typeof args === "number") {
    args = { chatMessage: args };
  }
  if (typeof args === "object" && !Array.isArray(args) && "id" in args) {
    args = { chatMessage: args.id };
  }
  if (Array.isArray(args)) {
    args = {
      chatMessage: args[0]
    };
  }
  const parsedArgs = {
    chatMessage: typeof args.chatMessage === "object" ? args.chatMessage.id : args.chatMessage
  };
  return answer.definition.url.replace("{chatMessage}", parsedArgs.chatMessage.toString()).replace(/\/+$/, "") + queryParams(options);
};
answer.get = (args, options) => ({
  url: answer.url(args, options),
  method: "get"
});
answer.head = (args, options) => ({
  url: answer.url(args, options),
  method: "head"
});
const chat = {
  index: index$1,
  new: newMethod,
  show,
  stream,
  message,
  answer
};
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = useState();
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
function Sheet({ ...props }) {
  return /* @__PURE__ */ jsx(SheetPrimitive.Root, { "data-slot": "sheet", ...props });
}
function SheetTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(SheetPrimitive.Trigger, { "data-slot": "sheet-trigger", ...props });
}
function SheetPortal({
  ...props
}) {
  return /* @__PURE__ */ jsx(SheetPrimitive.Portal, { "data-slot": "sheet-portal", ...props });
}
function SheetOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    SheetPrimitive.Overlay,
    {
      "data-slot": "sheet-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80",
        className
      ),
      ...props
    }
  );
}
function SheetContent({
  className,
  children,
  side = "right",
  ...props
}) {
  return /* @__PURE__ */ jsxs(SheetPortal, { children: [
    /* @__PURE__ */ jsx(SheetOverlay, {}),
    /* @__PURE__ */ jsxs(
      SheetPrimitive.Content,
      {
        "data-slot": "sheet-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        ),
        ...props,
        children: [
          children,
          /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none", children: [
            /* @__PURE__ */ jsx(XIcon, { className: "size-4" }),
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function SheetHeader({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "sheet-header",
      className: cn("flex flex-col gap-1.5 p-4", className),
      ...props
    }
  );
}
function SheetTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    SheetPrimitive.Title,
    {
      "data-slot": "sheet-title",
      className: cn("text-foreground font-semibold", className),
      ...props
    }
  );
}
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsx(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props }) });
}
function TooltipTrigger({
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      sideOffset,
      className: cn(
        "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-w-sm rounded-md px-3 py-1.5 text-xs",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx(TooltipPrimitive.Arrow, { className: "bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })
      ]
    }
  ) });
}
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SidebarContext = React.createContext(null);
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
  }, [isMobile, setOpen, setOpenMobile]);
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);
  const state = open ? "expanded" : "collapsed";
  const contextValue = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );
  return /* @__PURE__ */ jsx(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx(
    "div",
    {
      "data-slot": "sidebar-wrapper",
      style: {
        "--sidebar-width": SIDEBAR_WIDTH,
        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
        ...style
      },
      className: cn(
        "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
        className
      ),
      ...props,
      children
    }
  ) }) });
}
function SidebarInset({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "main",
    {
      "data-slot": "sidebar-inset",
      className: cn(
        "bg-background relative flex max-w-full min-h-svh flex-1 flex-col",
        "peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-[calc(var(--sidebar-width)+0.5rem)] md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      ),
      ...props
    }
  );
}
cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function AppContent({ variant = "header", children, ...props }) {
  if (variant === "sidebar") {
    return /* @__PURE__ */ jsx(SidebarInset, { ...props, children });
  }
  return /* @__PURE__ */ jsx("main", { className: "mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl", ...props, children });
}
function Breadcrumb({ ...props }) {
  return /* @__PURE__ */ jsx("nav", { "aria-label": "breadcrumb", "data-slot": "breadcrumb", ...props });
}
function BreadcrumbList({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "ol",
    {
      "data-slot": "breadcrumb-list",
      className: cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className
      ),
      ...props
    }
  );
}
function BreadcrumbItem({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "li",
    {
      "data-slot": "breadcrumb-item",
      className: cn("inline-flex items-center gap-1.5", className),
      ...props
    }
  );
}
function BreadcrumbLink({
  asChild,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      "data-slot": "breadcrumb-link",
      className: cn("hover:text-foreground transition-colors", className),
      ...props
    }
  );
}
function BreadcrumbPage({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "span",
    {
      "data-slot": "breadcrumb-page",
      role: "link",
      "aria-disabled": "true",
      "aria-current": "page",
      className: cn("text-foreground font-normal", className),
      ...props
    }
  );
}
function BreadcrumbSeparator({
  children,
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "li",
    {
      "data-slot": "breadcrumb-separator",
      role: "presentation",
      "aria-hidden": "true",
      className: cn("[&>svg]:size-3.5", className),
      ...props,
      children: children ?? /* @__PURE__ */ jsx(ChevronRight, {})
    }
  );
}
function Breadcrumbs({ breadcrumbs }) {
  return /* @__PURE__ */ jsx(Fragment, { children: breadcrumbs.length > 0 && /* @__PURE__ */ jsx(Breadcrumb, { children: /* @__PURE__ */ jsx(BreadcrumbList, { children: breadcrumbs.map((item, index2) => {
    const isLast = index2 === breadcrumbs.length - 1;
    return /* @__PURE__ */ jsxs(Fragment$1, { children: [
      /* @__PURE__ */ jsx(BreadcrumbItem, { children: isLast ? /* @__PURE__ */ jsx(BreadcrumbPage, { children: item.title }) : /* @__PURE__ */ jsx(BreadcrumbLink, { asChild: true, children: /* @__PURE__ */ jsx(Link, { href: item.href, prefetch: true, children: item.title }) }) }),
      !isLast && /* @__PURE__ */ jsx(BreadcrumbSeparator, {})
    ] }, index2);
  }) }) }) });
}
function Icon({ iconNode: IconComponent, className, ...props }) {
  return /* @__PURE__ */ jsx(IconComponent, { className: cn("h-4 w-4", className), ...props });
}
function Avatar({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Root,
    {
      "data-slot": "avatar",
      className: cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      ),
      ...props
    }
  );
}
function AvatarImage({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Image,
    {
      "data-slot": "avatar-image",
      className: cn("aspect-square size-full", className),
      ...props
    }
  );
}
function AvatarFallback({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    AvatarPrimitive.Fallback,
    {
      "data-slot": "avatar-fallback",
      className: cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      ),
      ...props
    }
  );
}
function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}) {
  return /* @__PURE__ */ jsxs(
    NavigationMenuPrimitive.Root,
    {
      "data-slot": "navigation-menu",
      "data-viewport": viewport,
      className: cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      ),
      ...props,
      children: [
        children,
        viewport && /* @__PURE__ */ jsx(NavigationMenuViewport, {})
      ]
    }
  );
}
function NavigationMenuList({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    NavigationMenuPrimitive.List,
    {
      "data-slot": "navigation-menu-list",
      className: cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      ),
      ...props
    }
  );
}
function NavigationMenuItem({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    NavigationMenuPrimitive.Item,
    {
      "data-slot": "navigation-menu-item",
      className: cn("relative", className),
      ...props
    }
  );
}
const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-accent/50 data-[state=open]:bg-accent/50 data-[active=true]:text-accent-foreground ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1"
);
function NavigationMenuViewport({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "absolute top-full left-0 isolate z-50 flex justify-center"
      ),
      children: /* @__PURE__ */ jsx(
        NavigationMenuPrimitive.Viewport,
        {
          "data-slot": "navigation-menu-viewport",
          className: cn(
            "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow md:w-[var(--radix-navigation-menu-viewport-width)]",
            className
          ),
          ...props
        }
      )
    }
  );
}
function useInitials() {
  return useCallback((fullName) => {
    const names = fullName.trim().split(" ");
    if (names.length === 0) return "";
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    const firstInitial = names[0].charAt(0);
    const lastInitial = names[names.length - 1].charAt(0);
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, []);
}
function UserInfo({ user, showEmail = false }) {
  const getInitials = useInitials();
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 overflow-hidden rounded-full", children: [
      /* @__PURE__ */ jsx(AvatarImage, { src: user.avatar, alt: user.name }),
      /* @__PURE__ */ jsx(AvatarFallback, { className: "rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white", children: getInitials(user.name) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid flex-1 text-left text-sm leading-tight", children: [
      /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: user.name }),
      showEmail && /* @__PURE__ */ jsx("span", { className: "truncate text-xs text-muted-foreground", children: user.email })
    ] })
  ] });
}
function useMobileNavigation() {
  return useCallback(() => {
    document.body.style.removeProperty("pointer-events");
  }, []);
}
function UserMenuContent({ user }) {
  const cleanup = useMobileNavigation();
  const handleLogout = () => {
    cleanup();
    router.flushAll();
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "p-0 font-normal", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 px-1 py-1.5 text-left text-sm", children: /* @__PURE__ */ jsx(UserInfo, { user, showEmail: true }) }) }),
    /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
    /* @__PURE__ */ jsx(DropdownMenuGroup, { children: /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { className: "block w-full", href: settings.profile.edit.url(), as: "button", prefetch: true, onClick: cleanup, children: [
      /* @__PURE__ */ jsx(Settings, { className: "mr-2" }),
      "Settings"
    ] }) }) }),
    /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
    /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { className: "block w-full", method: "post", href: logout.url(), prefetch: true, as: "button", onClick: handleLogout, children: [
      /* @__PURE__ */ jsx(LogOut, { className: "mr-2" }),
      "Log out"
    ] }) })
  ] });
}
function AppLogo() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "size-9 text-[var(--primary-foreground)]" }) }),
    /* @__PURE__ */ jsx("div", { className: "ml-1 grid flex-1 text-left text-sm", children: /* @__PURE__ */ jsx("span", { className: "mb-0.5 truncate leading-tight font-semibold", children: "Laravel Starter Kit" }) })
  ] });
}
const index = (options) => ({
  url: index.url(options),
  method: "get"
});
index.definition = {
  methods: ["get", "head"],
  url: "/trainings"
};
index.url = (options) => {
  return index.definition.url + queryParams(options);
};
index.get = (options) => ({
  url: index.url(options),
  method: "get"
});
index.head = (options) => ({
  url: index.url(options),
  method: "head"
});
const trainings = {
  index
};
const mainNavItems = [
  {
    title: "Dashboard",
    href: dashboard.url(),
    icon: LayoutGrid
  },
  {
    title: "Trainings",
    href: trainings.index.url(),
    icon: Dumbbell
  }
];
const rightNavItems = [];
const activeItemStyles = "text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100";
function AppHeader({ breadcrumbs = [] }) {
  const page = usePage();
  const { auth } = page.props;
  const getInitials = useInitials();
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    const savedTheme = localStorage.getItem("appearance") || "system";
    setTheme(savedTheme);
  }, []);
  const toggleTheme = () => {
    let newTheme;
    if (theme === "light") {
      newTheme = "dark";
    } else if (theme === "dark") {
      newTheme = "system";
    } else {
      newTheme = "light";
    }
    setTheme(newTheme);
    setAppearance(newTheme);
  };
  const setAppearance = (appearance) => {
    const setDark = () => document.documentElement.classList.add("dark");
    const setLight = () => document.documentElement.classList.remove("dark");
    if (appearance === "system") {
      localStorage.removeItem("appearance");
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.matches ? setDark() : setLight();
    } else if (appearance === "dark") {
      localStorage.setItem("appearance", "dark");
      setDark();
    } else if (appearance === "light") {
      localStorage.setItem("appearance", "light");
      setLight();
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "border-b border-sidebar-border/80", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex h-16 items-center px-4 md:max-w-7xl", children: [
      /* @__PURE__ */ jsx("div", { className: "lg:hidden", children: /* @__PURE__ */ jsxs(Sheet, { children: [
        /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "mr-2 h-[34px] w-[34px]", children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" }) }) }),
        /* @__PURE__ */ jsxs(SheetContent, { side: "left", className: "flex h-full w-64 flex-col items-stretch justify-between bg-sidebar", children: [
          /* @__PURE__ */ jsx(SheetTitle, { className: "sr-only", children: "Navigation Menu" }),
          /* @__PURE__ */ jsx(SheetHeader, { className: "flex justify-start text-left", children: /* @__PURE__ */ jsx(AppLogoIcon, { className: "h-6 w-6 fill-current text-black dark:text-white" }) }),
          /* @__PURE__ */ jsx("div", { className: "flex h-full flex-1 flex-col space-y-4 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col justify-between text-sm", children: [
            /* @__PURE__ */ jsx("div", { className: "flex flex-col space-y-4", children: mainNavItems.map((item) => /* @__PURE__ */ jsxs(Link, { href: item.href, prefetch: true, className: "flex items-center space-x-2 font-medium", children: [
              item.icon && /* @__PURE__ */ jsx(Icon, { iconNode: item.icon, className: "h-5 w-5" }),
              /* @__PURE__ */ jsx("span", { children: item.title })
            ] }, item.title)) }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-col space-y-4", children: rightNavItems.map((item) => /* @__PURE__ */ jsxs(
              "a",
              {
                href: item.href,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "flex items-center space-x-2 font-medium",
                children: [
                  item.icon && /* @__PURE__ */ jsx(Icon, { iconNode: item.icon, className: "h-5 w-5" }),
                  /* @__PURE__ */ jsx("span", { children: item.title })
                ]
              },
              item.title
            )) })
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Link, { href: "/dashboard", prefetch: true, className: "flex items-center space-x-2", children: /* @__PURE__ */ jsx(AppLogo, {}) }),
      /* @__PURE__ */ jsx("div", { className: "ml-6 hidden h-full items-center space-x-6 lg:flex", children: /* @__PURE__ */ jsx(NavigationMenu, { className: "flex h-full items-stretch", children: /* @__PURE__ */ jsx(NavigationMenuList, { className: "flex h-full items-stretch space-x-2", children: mainNavItems.map((item, index2) => /* @__PURE__ */ jsxs(NavigationMenuItem, { className: "relative flex h-full items-center", children: [
        /* @__PURE__ */ jsxs(
          Link,
          {
            href: item.href,
            className: cn(
              navigationMenuTriggerStyle(),
              page.url === item.href && activeItemStyles,
              "h-9 cursor-pointer px-3"
            ),
            children: [
              item.icon && /* @__PURE__ */ jsx(Icon, { iconNode: item.icon, className: "mr-2 h-4 w-4" }),
              item.title
            ]
          }
        ),
        page.url === item.href && /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white" })
      ] }, index2)) }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative flex items-center space-x-1", children: [
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "group h-9 w-9 cursor-pointer", children: /* @__PURE__ */ jsx(Search, { className: "!size-5 opacity-80 group-hover:opacity-100" }) }),
          /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: toggleTheme,
                className: "group h-9 w-9 cursor-pointer",
                children: [
                  theme === "light" && /* @__PURE__ */ jsx("svg", { className: "!size-5 opacity-80 group-hover:opacity-100", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" }) }),
                  theme === "dark" && /* @__PURE__ */ jsx("svg", { className: "!size-5 opacity-80 group-hover:opacity-100", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" }) }),
                  theme === "system" && /* @__PURE__ */ jsx("svg", { className: "!size-5 opacity-80 group-hover:opacity-100", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }) })
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: theme === "light" ? "Light Mode" : theme === "dark" ? "Dark Mode" : "System Mode" }) })
          ] }) }),
          /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => {
                  router.visit(chat.index.url());
                },
                className: "group h-9 w-9 cursor-pointer relative",
                children: [
                  /* @__PURE__ */ jsx(MessageCircle, { className: "!size-5 opacity-80 group-hover:opacity-100" }),
                  /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: "Chat with AI Training Coach" }) })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "hidden lg:flex", children: rightNavItems.map((item) => /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { children: /* @__PURE__ */ jsxs(
              "a",
              {
                href: item.href,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "group ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "sr-only", children: item.title }),
                  item.icon && /* @__PURE__ */ jsx(Icon, { iconNode: item.icon, className: "size-5 opacity-80 group-hover:opacity-100" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: item.title }) })
          ] }) }, item.title)) })
        ] }),
        /* @__PURE__ */ jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", className: "size-10 rounded-full p-1", children: /* @__PURE__ */ jsxs(Avatar, { className: "size-8 overflow-hidden rounded-full", children: [
            /* @__PURE__ */ jsx(AvatarImage, { src: auth.user.avatar, alt: auth.user.name }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white", children: getInitials(auth.user.name) })
          ] }) }) }),
          /* @__PURE__ */ jsx(DropdownMenuContent, { className: "w-56", align: "end", children: /* @__PURE__ */ jsx(UserMenuContent, { user: auth.user }) })
        ] })
      ] })
    ] }) }),
    breadcrumbs.length > 1 && /* @__PURE__ */ jsx("div", { className: "flex w-full border-b border-sidebar-border/70", children: /* @__PURE__ */ jsx("div", { className: "mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl", children: /* @__PURE__ */ jsx(Breadcrumbs, { breadcrumbs }) }) })
  ] });
}
const ToastContext = createContext(void 0);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = (toast2) => {
    const id = Math.random().toString(36).substring(2);
    const newToast = { ...toast2, id };
    setToasts((prev) => [...prev, newToast]);
    const duration = toast2.duration || 5e3;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast2) => toast2.id !== id));
  };
  return /* @__PURE__ */ jsxs(ToastContext.Provider, { value: { addToast, removeToast }, children: [
    children,
    /* @__PURE__ */ jsx(ToastContainer, { toasts, onRemove: removeToast })
  ] });
}
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return /* @__PURE__ */ jsx("div", { className: "fixed top-4 right-4 z-50 space-y-2 max-w-md", children: toasts.map((toast2) => /* @__PURE__ */ jsx(ToastItem, { toast: toast2, onRemove }, toast2.id)) });
}
function ToastItem({ toast: toast2, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast2.id), 300);
  };
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
  };
  const colors = {
    success: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    info: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
  };
  const iconColors = {
    success: "text-green-500 dark:text-green-400",
    error: "text-red-500 dark:text-red-400",
    info: "text-blue-500 dark:text-blue-400",
    warning: "text-yellow-500 dark:text-yellow-400"
  };
  const Icon2 = icons[toast2.type];
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        "max-w-md w-full p-4 rounded-lg border shadow-lg",
        colors[toast2.type]
      ),
      children: /* @__PURE__ */ jsxs("div", { className: "flex items-start space-x-3", children: [
        /* @__PURE__ */ jsx(Icon2, { className: cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColors[toast2.type]) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: toast2.title }),
          toast2.description && /* @__PURE__ */ jsx("p", { className: "text-sm opacity-90 mt-1", children: toast2.description })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleRemove,
            className: "flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors",
            children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" })
          }
        )
      ] })
    }
  );
}
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isInWebAppiOS = window.navigator.standalone === true;
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => {
        setShowPrompt(true);
      }, 3e4);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error during app installation:", error);
    }
  };
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("installPromptDismissed", Date.now().toString());
  };
  useEffect(() => {
    const dismissedTime = localStorage.getItem("installPromptDismissed");
    if (dismissedTime) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
      if (parseInt(dismissedTime) > sevenDaysAgo) {
        setShowPrompt(false);
      }
    }
  }, []);
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }
  return /* @__PURE__ */ jsx("div", { className: "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50", children: /* @__PURE__ */ jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start space-x-3", children: [
    /* @__PURE__ */ jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsx(Smartphone, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: "Install Athletos" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: "Install our app for quick access and offline features" }),
      /* @__PURE__ */ jsxs("div", { className: "flex space-x-2 mt-3", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleInstall,
            className: "inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors",
            children: [
              /* @__PURE__ */ jsx(Download, { className: "w-3 h-3 mr-1" }),
              "Install"
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleDismiss,
            className: "inline-flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors",
            children: "Later"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: handleDismiss,
        className: "flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
        children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" })
      }
    )
  ] }) }) });
}
function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const handleServiceWorkerUpdate = (registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          handleServiceWorkerUpdate(registration);
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });
    }
  }, []);
  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      setUpdateAvailable(false);
    }
  };
  const handleDismiss = () => {
    setUpdateAvailable(false);
  };
  useEffect(() => {
    if (updateAvailable) {
      toast("App Update Available", {
        description: "A new version of Athletos is ready!",
        action: {
          label: "Update",
          onClick: handleUpdate
        },
        duration: 1e4,
        // 10 seconds
        onDismiss: handleDismiss
      });
    }
  }, [updateAvailable]);
  return null;
}
function AppFooter() {
  return /* @__PURE__ */ jsx("footer", { className: "w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 mt-auto", children: /* @__PURE__ */ jsxs("div", { className: "max-w-2xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center px-4 text-sm text-gray-500 dark:text-gray-400", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-2 sm:mb-0", children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " Athletos. All rights reserved."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-x-4", children: [
      /* @__PURE__ */ jsx(Link, { href: "/terms", prefetch: true, className: "hover:underline", children: "Terms of Service" }),
      /* @__PURE__ */ jsx(Link, { href: "/privacy", prefetch: true, className: "hover:underline", children: "Privacy Policy" }),
      /* @__PURE__ */ jsx(Link, { href: "/about", prefetch: true, className: "hover:underline", children: "About" })
    ] })
  ] }) });
}
function AppShell({ children, variant = "header" }) {
  const isOpen = usePage().props.sidebarOpen;
  const content = /* @__PURE__ */ jsx(ToastProvider, { children: /* @__PURE__ */ jsxs(TooltipProvider, { children: [
    /* @__PURE__ */ jsxs("div", { className: "min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1", children }),
      /* @__PURE__ */ jsx(AppFooter, {})
    ] }),
    /* @__PURE__ */ jsx(InstallPrompt, {}),
    /* @__PURE__ */ jsx(UpdateNotification, {})
  ] }) });
  if (variant === "header") {
    return content;
  }
  return /* @__PURE__ */ jsx(SidebarProvider, { defaultOpen: isOpen, children: content });
}
function AppHeaderLayout({ children, breadcrumbs }) {
  return /* @__PURE__ */ jsxs(AppShell, { children: [
    /* @__PURE__ */ jsx(AppHeader, { breadcrumbs }),
    /* @__PURE__ */ jsx(AppContent, { children })
  ] });
}
const AppLayout = ({ children, breadcrumbs, ...props }) => /* @__PURE__ */ jsx(AppHeaderLayout, { breadcrumbs, ...props, children });
export {
  AppLayout as A,
  chat as c,
  trainings as t
};
